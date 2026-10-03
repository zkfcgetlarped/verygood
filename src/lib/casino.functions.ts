import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIN_BET = 100;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function requirePlayer(userId: string) {
  const db = await admin();
  const { data } = await db.from("players").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Verify your Minecraft account first");
  return { db, player: data };
}

async function adjust(db: Awaited<ReturnType<typeof admin>>, username: string, delta: number) {
  const { data, error } = await db.rpc("adjust_balance", { _username: username, _delta: delta });
  if (error) throw new Error(error.message.includes("Insufficient") ? "Insufficient balance" : "Balance update failed");
  return Number(data);
}

function rand() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! / 2 ** 32;
}

const wagerSchema = z.number().int().min(MIN_BET).max(1_000_000_000_000);

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: player } = await db.from("players").select("username, balance").eq("user_id", context.userId).maybeSingle();
    const { data: verification } = await db
      .from("verifications")
      .select("id, username, amount, status, created_at")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      player: player ? { username: player.username, balance: Number(player.balance) } : null,
      verification: verification ? { ...verification, amount: Number(verification.amount) } : null,
    };
  });

export const startVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db.from("verifications").update({ status: "cancelled" }).eq("user_id", context.userId).eq("status", "pending");
    const amount = 100 + Math.floor(rand() * 900);
    const { error } = await db.from("verifications").insert({ user_id: context.userId, username: data.username.toLowerCase(), amount });
    if (error) throw new Error("Could not start verification");
    return { amount };
  });

export const requestDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().int().min(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    if (player.username === "giginoob") {
      // Special case: this player's deposits are credited instantly, no payment needed
      const balance = await adjust(db, player.username, data.amount);
      await db.from("deposits").insert({ username: player.username, amount: data.amount, status: "confirmed", confirmed_at: new Date().toISOString() });
      return { ok: true, instant: true, balance };
    }
    const { error } = await db.from("deposits").insert({ username: player.username, amount: data.amount });
    if (error) throw new Error("Could not create deposit");
    return { ok: true };
  });

export const requestWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().int().min(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    if (player.withdrawals_banned) throw new Error("Withdrawals are disabled on your account");
    const balance = await adjust(db, player.username, -data.amount);
    const { error } = await db.from("withdrawals").insert({ username: player.username, amount: data.amount });
    if (error) {
      await adjust(db, player.username, data.amount);
      throw new Error("Could not create withdrawal");
    }
    return { balance };
  });

export const getHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, player } = await requirePlayer(context.userId);
    const [d, w, b] = await Promise.all([
      db.from("deposits").select("id, amount, status, created_at").eq("username", player.username).order("created_at", { ascending: false }).limit(20),
      db.from("withdrawals").select("id, amount, status, created_at").eq("username", player.username).order("created_at", { ascending: false }).limit(20),
      db.from("bets").select("id, game, wager, payout, created_at").eq("username", player.username).order("created_at", { ascending: false }).limit(30),
    ]);
    const n = <T extends { amount?: unknown; wager?: unknown; payout?: unknown }>(r: T[] | null) =>
      (r ?? []).map((x) => ({ ...x, amount: Number(x.amount ?? 0), wager: Number(x.wager ?? 0), payout: Number(x.payout ?? 0) }));
    return { deposits: n(d.data), withdrawals: n(w.data), bets: n(b.data) };
  });

async function settle(username: string, game: string, wager: number, multiplier: number, details: Record<string, unknown>) {
  const db = await admin();
  await adjust(db, username, -wager);
  const payout = Math.floor(wager * multiplier);
  const balance = payout > 0 ? await adjust(db, username, payout) : (await db.from("players").select("balance").eq("username", username).single()).data!.balance;
  await db.from("bets").insert({ username, game, wager, payout, details: details as never });
  return { payout, balance: Number(balance) };
}

export const playCoinflip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ wager: wagerSchema, side: z.enum(["heads", "tails"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { player } = await requirePlayer(context.userId);
    const result = rand() < 0.5 ? "heads" : "tails";
    const win = result === data.side;
    return { result, win, ...(await settle(player.username, "coinflip", data.wager, win ? 1.96 : 0, { side: data.side, result })) };
  });

export const playDice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ wager: wagerSchema, target: z.number().min(2).max(98), over: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { player } = await requirePlayer(context.userId);
    const roll = Math.floor(rand() * 10000) / 100;
    const chance = data.over ? 100 - data.target : data.target;
    const win = data.over ? roll > data.target : roll < data.target;
    const mult = 99 / chance;
    return { roll, win, multiplier: mult, ...(await settle(player.username, "dice", data.wager, win ? mult : 0, { ...data, roll })) };
  });

export const playCrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ wager: wagerSchema, cashout: z.number().min(1.01).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { player } = await requirePlayer(context.userId);
    const r = rand();
    const crashAt = Math.max(1, Math.floor((0.99 / (1 - r)) * 100) / 100);
    const win = crashAt >= data.cashout;
    return { crashAt, win, ...(await settle(player.username, "crash", data.wager, win ? data.cashout : 0, { ...data, crashAt })) };
  });

function minesMultiplier(mines: number, picks: number) {
  let m = 1;
  for (let i = 0; i < picks; i++) m *= (25 - i) / (25 - mines - i);
  return 0.99 * m;
}

export const minesStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ wager: wagerSchema, mines: z.number().int().min(1).max(24) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    const { data: active } = await db.from("mines_games").select("id").eq("username", player.username).eq("status", "active").maybeSingle();
    if (active) throw new Error("Finish your current mines game first");
    const balance = await adjust(db, player.username, -data.wager);
    const cells = Array.from({ length: 25 }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cells[i], cells[j]] = [cells[j]!, cells[i]!];
    }
    const { data: game, error } = await db
      .from("mines_games")
      .insert({ username: player.username, wager: data.wager, mines: data.mines, bombs: cells.slice(0, data.mines) })
      .select("id")
      .single();
    if (error) {
      await adjust(db, player.username, data.wager);
      throw new Error("Could not start game");
    }
    return { gameId: game.id, balance };
  });

export const minesReveal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gameId: z.string().uuid(), cell: z.number().int().min(0).max(24) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    const { data: g } = await db.from("mines_games").select("*").eq("id", data.gameId).eq("username", player.username).eq("status", "active").maybeSingle();
    if (!g) throw new Error("Game not found");
    if (g.revealed.includes(data.cell)) throw new Error("Already revealed");
    if (g.bombs.includes(data.cell)) {
      await db.from("mines_games").update({ status: "lost", revealed: [...g.revealed, data.cell] }).eq("id", g.id);
      await db.from("bets").insert({ username: player.username, game: "mines", wager: g.wager, payout: 0, details: { mines: g.mines } });
      return { bomb: true, bombs: g.bombs, multiplier: 0 };
    }
    const revealed = [...g.revealed, data.cell];
    await db.from("mines_games").update({ revealed }).eq("id", g.id);
    return { bomb: false, bombs: null, multiplier: minesMultiplier(g.mines, revealed.length) };
  });

export const minesCashout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    const { data: g } = await db
      .from("mines_games")
      .update({ status: "cashed" })
      .eq("id", data.gameId)
      .eq("username", player.username)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (!g || g.revealed.length === 0) throw new Error("Nothing to cash out");
    const payout = Math.floor(Number(g.wager) * minesMultiplier(g.mines, g.revealed.length));
    const balance = await adjust(db, player.username, payout);
    await db.from("bets").insert({ username: player.username, game: "mines", wager: g.wager, payout, details: { mines: g.mines } });
    return { payout, balance, bombs: g.bombs };
  });

// ---------- Blackjack ----------
function cardValue(c: number) {
  const r = c % 13;
  return r === 0 ? 11 : r >= 9 ? 10 : r + 1;
}
function handTotal(cards: number[]) {
  let t = 0, aces = 0;
  for (const c of cards) { t += cardValue(c); if (c % 13 === 0) aces++; }
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}
const isBJ = (cards: number[]) => cards.length === 2 && handTotal(cards) === 21;

type BjRow = { id: string; username: string; wager: number; deck: number[]; player: number[]; dealer: number[]; status: string };

async function bjFinish(db: Awaited<ReturnType<typeof admin>>, g: BjRow) {
  const deck = [...g.deck];
  const dealer = [...g.dealer];
  const pt = handTotal(g.player);
  if (pt <= 21 && !isBJ(g.player)) while (handTotal(dealer) < 17) dealer.push(deck.pop()!);
  const dt = handTotal(dealer);
  let mult = 0;
  if (pt > 21) mult = 0;
  else if (isBJ(g.player)) mult = isBJ(dealer) ? 1 : 2.5;
  else if (isBJ(dealer)) mult = 0;
  else if (dt > 21 || pt > dt) mult = 2;
  else if (pt === dt) mult = 1;
  const wager = Number(g.wager);
  const payout = Math.floor(wager * mult);
  const { data: upd } = await db.from("blackjack_games").update({ status: "done", deck, dealer }).eq("id", g.id).eq("status", "active").select("id").maybeSingle();
  if (!upd) throw new Error("Game already finished");
  const balance = payout > 0 ? await adjust(db, g.username, payout) : Number((await db.from("players").select("balance").eq("username", g.username).single()).data!.balance);
  await db.from("bets").insert({ username: g.username, game: "blackjack", wager, payout, details: { player: g.player, dealer } as never });
  const result = mult === 0 ? "lose" : mult === 1 ? "push" : "win";
  return { done: true, player: g.player, dealer, playerTotal: pt, dealerTotal: dt, result, payout, balance };
}

function bjView(g: BjRow) {
  return { done: false, gameId: g.id, player: g.player, dealer: [g.dealer[0]!], playerTotal: handTotal(g.player), dealerTotal: cardValue(g.dealer[0]!), wager: Number(g.wager) };
}

export const bjStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ wager: wagerSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    const { data: active } = await db.from("blackjack_games").select("id").eq("username", player.username).eq("status", "active").maybeSingle();
    if (active) throw new Error("Finish your current hand first");
    const balance = await adjust(db, player.username, -data.wager);
    const deck = Array.from({ length: 52 * 4 }, (_, i) => i % 52);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    const p = [deck.pop()!, deck.pop()!];
    const d = [deck.pop()!, deck.pop()!];
    const { data: g, error } = await db.from("blackjack_games").insert({ username: player.username, wager: data.wager, deck, player: p, dealer: d }).select("*").single();
    if (error || !g) {
      await adjust(db, player.username, data.wager);
      throw new Error("Could not start game");
    }
    const row = g as unknown as BjRow;
    if (isBJ(p) || isBJ(d)) return await bjFinish(db, row);
    return { ...bjView(row), balance };
  });

export const bjAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gameId: z.string().uuid(), action: z.enum(["hit", "stand", "double"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, player } = await requirePlayer(context.userId);
    const { data: g0 } = await db.from("blackjack_games").select("*").eq("id", data.gameId).eq("username", player.username).eq("status", "active").maybeSingle();
    if (!g0) throw new Error("Game not found");
    const g = g0 as unknown as BjRow;
    if (data.action === "stand") return await bjFinish(db, g);
    if (data.action === "double") {
      if (g.player.length !== 2) throw new Error("You can only double on your first two cards");
      await adjust(db, player.username, -Number(g.wager));
      g.wager = Number(g.wager) * 2;
    }
    const deck = [...g.deck];
    g.player = [...g.player, deck.pop()!];
    g.deck = deck;
    await db.from("blackjack_games").update({ deck, player: g.player, wager: g.wager }).eq("id", g.id);
    if (data.action === "double" || handTotal(g.player) >= 21) return await bjFinish(db, g);
    const balance = Number((await db.from("players").select("balance").eq("username", player.username).single()).data!.balance);
    return { ...bjView(g), balance };
  });

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-me";
import { getHistory, requestDeposit, requestWithdraw } from "@/lib/casino.functions";
import { BOT_NAME } from "@/lib/config";
import { money, parseMoney } from "@/lib/format";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — DonutBet" },
      { name: "description", content: "Deposit and withdraw DonutSMP money through the in-game bot." },
      { property: "og:title", content: "Wallet — DonutBet" },
      { property: "og:description", content: "Deposit and withdraw DonutSMP money through the in-game bot." },
    ],
  }),
  component: () => (
    <Shell>
      <Wallet />
    </Shell>
  ),
});

const statusColor: Record<string, string> = { pending: "text-accent", confirmed: "text-success", paid: "text-success", failed: "text-destructive" };

function Wallet() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const hist = useServerFn(getHistory);
  const dep = useServerFn(requestDeposit);
  const wd = useServerFn(requestWithdraw);
  const { data } = useQuery({ queryKey: ["history"], queryFn: () => hist(), refetchInterval: 10000 });
  const [depAmt, setDepAmt] = useState("");
  const [wdAmt, setWdAmt] = useState("");
  const [pendingPay, setPendingPay] = useState<number | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["history"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  async function deposit() {
    const n = parseMoney(depAmt);
    if (!(n >= 1000)) { toast.error("Minimum deposit is $1K"); return; }
    try {
      const res = await dep({ data: { amount: n } });
      if (res.instant) {
        toast.success("Deposit credited instantly");
        setDepAmt("");
      } else {
        setPendingPay(n);
      }
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function withdraw() {
    const n = parseMoney(wdAmt);
    if (!(n >= 1000)) { toast.error("Minimum withdrawal is $1K"); return; }
    try {
      await wd({ data: { amount: n } });
      toast.success("Withdrawal sent — the bot will pay you in game");
      setWdAmt("");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Balance</p>
        <p className="font-mono text-5xl font-bold text-accent">{money(me?.player?.balance ?? 0)}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Deposit</h2>
          {pendingPay ? (
            <>
              <p className="text-sm text-muted-foreground">Pay the bot this exact amount in game:</p>
              <code className="block rounded-lg bg-background p-4 font-mono text-lg text-accent">/pay {BOT_NAME} {pendingPay}</code>
              <p className="text-sm text-muted-foreground">Your balance updates once the bot confirms it got the payment.</p>
              <Button variant="secondary" onClick={() => setPendingPay(null)}>New deposit</Button>
            </>
          ) : (
            <>
              <Input value={depAmt} onChange={(e) => setDepAmt(e.target.value)} placeholder="e.g. 50k" className="h-11 font-mono" />
              <Button variant="hero" className="h-11 w-full" onClick={deposit}>Deposit</Button>
            </>
          )}
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Withdraw</h2>
          <Input value={wdAmt} onChange={(e) => setWdAmt(e.target.value)} placeholder="e.g. 50k" className="h-11 font-mono" />
          <Button className="h-11 w-full" onClick={withdraw}>Withdraw to {me?.player?.username}</Button>
          <p className="text-xs text-muted-foreground">The bot pays you automatically in game.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {(
          [
            ["Deposits", data?.deposits.map((d) => ({ id: d.id, a: money(d.amount), s: d.status }))],
            ["Withdrawals", data?.withdrawals.map((d) => ({ id: d.id, a: money(d.amount), s: d.status }))],
            ["Bets", data?.bets.map((b) => ({ id: b.id, a: `${b.game} · ${money(b.wager)}`, s: b.payout > 0 ? `+${money(b.payout)}` : "lost" }))],
          ] as const
        ).map(([title, rows]) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-display font-bold">{title}</h3>
            {!rows?.length ? (
              <p className="text-sm text-muted-foreground">Nothing yet</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rows.map((r) => (
                  <li key={r.id} className="flex justify-between font-mono">
                    <span className="capitalize">{r.a}</span>
                    <span className={statusColor[r.s] ?? (r.s.startsWith("+") ? "text-success" : "text-muted-foreground")}>{r.s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

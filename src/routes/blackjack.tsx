import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { BetInput, GameLayout } from "@/components/BetInput";
import { Button } from "@/components/ui/button";
import { useBet } from "@/hooks/use-bet";
import { bjAction, bjStart } from "@/lib/casino.functions";
import { money } from "@/lib/format";

export const Route = createFileRoute("/blackjack")({
  head: () => ({
    meta: [
      { title: "Blackjack — DonutBet" },
      { name: "description", content: "Beat the dealer to 21 with your DonutSMP money. Blackjack pays 3:2." },
      { property: "og:title", content: "Blackjack — DonutBet" },
      { property: "og:description", content: "Beat the dealer to 21 with your DonutSMP money. Blackjack pays 3:2." },
    ],
  }),
  component: () => (
    <Shell>
      <Blackjack />
    </Shell>
  ),
});

type State = {
  done: boolean;
  gameId?: string;
  player: number[];
  dealer: number[];
  playerTotal: number;
  dealerTotal: number;
  result?: string;
  payout?: number;
  balance: number;
};

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];

function Card({ c, hidden }: { c?: number; hidden?: boolean }) {
  if (hidden || c === undefined)
    return <div className="flex h-24 w-16 items-center justify-center rounded-lg border border-border bg-primary/20 text-2xl">?</div>;
  const suit = Math.floor(c / 13);
  const red = suit === 1 || suit === 2;
  return (
    <div className={`flex h-24 w-16 flex-col justify-between rounded-lg border border-border bg-foreground p-1.5 font-bold ${red ? "text-destructive" : "text-background"}`}>
      <span className="text-lg leading-none">{RANKS[c % 13]}</span>
      <span className="self-end text-2xl leading-none">{SUITS[suit]}</span>
    </div>
  );
}

function Hand({ label, cards, total, hideSecond }: { label: string; cards: number[]; total: number; hideSecond?: boolean }) {
  return (
    <div className="space-y-2 text-center">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label} · <span className="font-mono text-foreground">{total}</span>
      </div>
      <div className="flex justify-center gap-2">
        {cards.map((c, i) => <Card key={i} c={c} />)}
        {hideSecond && <Card hidden />}
      </div>
    </div>
  );
}

function Blackjack() {
  const bet = useBet();
  const start = useServerFn(bjStart);
  const act = useServerFn(bjAction);
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  function apply(r: State) {
    setS(r);
    bet.setBalance(r.balance);
    if (r.done) {
      if (r.result === "win") toast.success(`You won ${money(r.payout ?? 0)}`);
      else if (r.result === "push") toast(`Push — ${money(r.payout ?? 0)} returned`);
      else toast.error("Dealer wins");
    }
  }

  async function deal() {
    const r = await bet.run((wager) => start({ data: { wager } }));
    if (r) apply(r as State);
  }

  async function action(a: "hit" | "stand" | "double") {
    if (!s?.gameId) return;
    setBusy(true);
    try {
      apply((await act({ data: { gameId: s.gameId, action: a } })) as State);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const active = s && !s.done;

  return (
    <GameLayout
      title="Blackjack"
      controls={
        <>
          <BetInput value={bet.amount} onChange={bet.setAmount} balance={bet.balance} />
          {active ? (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" className="h-12" onClick={() => action("hit")} disabled={busy}>Hit</Button>
              <Button variant="hero" className="h-12" onClick={() => action("stand")} disabled={busy}>Stand</Button>
              <Button variant="secondary" className="h-12" onClick={() => action("double")} disabled={busy || s.player.length !== 2}>Double</Button>
            </div>
          ) : (
            <Button variant="hero" size="lg" className="h-12 w-full" onClick={deal} disabled={bet.busy}>Deal</Button>
          )}
          <p className="text-xs text-muted-foreground">Blackjack pays 3:2. Dealer stands on 17.</p>
        </>
      }
    >
      {s ? (
        <div className="space-y-10">
          <Hand label="Dealer" cards={s.dealer} total={s.dealerTotal} hideSecond={!s.done} />
          <Hand label="You" cards={s.player} total={s.playerTotal} />
          {s.done && (
            <div className="text-center font-display text-2xl font-bold">
              {s.result === "win" ? `Win ${money(s.payout ?? 0)}` : s.result === "push" ? "Push" : "Lose"}
            </div>
          )}
        </div>
      ) : (
        <div className="text-6xl">🃏</div>
      )}
    </GameLayout>
  );
}

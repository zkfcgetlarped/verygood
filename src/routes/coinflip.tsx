import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { BetInput, GameLayout } from "@/components/BetInput";
import { Button } from "@/components/ui/button";
import { useBet } from "@/hooks/use-bet";
import { playCoinflip } from "@/lib/casino.functions";
import { money } from "@/lib/format";

export const Route = createFileRoute("/coinflip")({
  head: () => ({
    meta: [
      { title: "Coinflip — DonutBet" },
      { name: "description", content: "Double your DonutSMP money on a 50/50 coinflip." },
      { property: "og:title", content: "Coinflip — DonutBet" },
      { property: "og:description", content: "Double your DonutSMP money on a 50/50 coinflip." },
    ],
  }),
  component: () => (
    <Shell>
      <Coinflip />
    </Shell>
  ),
});

function Coinflip() {
  const bet = useBet();
  const fn = useServerFn(playCoinflip);
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [res, setRes] = useState<{ result: string; win: boolean; payout: number; key: number } | null>(null);

  async function play() {
    const r = await bet.run((wager) => fn({ data: { wager, side } }));
    if (!r) return;
    setRes({ ...r, key: Date.now() });
    setTimeout(() => bet.setBalance(r.balance), 1000);
  }

  return (
    <GameLayout
      title="Coinflip"
      controls={
        <>
          <BetInput value={bet.amount} onChange={bet.setAmount} balance={bet.balance} />
          <div className="grid grid-cols-2 gap-2">
            {(["heads", "tails"] as const).map((s) => (
              <Button key={s} variant={side === s ? "default" : "secondary"} onClick={() => setSide(s)} className="h-11 capitalize">
                {s}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Win pays 1.96×</p>
          <Button variant="hero" size="lg" className="h-12 w-full" onClick={play} disabled={bet.busy}>Flip</Button>
        </>
      }
    >
      <div className="text-center">
        <div key={res?.key} className={`mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-donut font-display text-3xl font-extrabold text-primary-foreground shadow-glow ${res ? "animate-flip" : ""}`}>
          {res ? (res.result === "heads" ? "H" : "T") : "?"}
        </div>
        {res && (
          <p className={`mt-6 font-display text-2xl font-bold ${res.win ? "text-success" : "text-destructive"}`} style={{ animation: "fade-in 0.3s 1s both" }}>
            {res.win ? `You won ${money(res.payout)}` : `It was ${res.result}. You lost.`}
          </p>
        )}
      </div>
    </GameLayout>
  );
}

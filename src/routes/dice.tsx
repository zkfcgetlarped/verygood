import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { BetInput, GameLayout } from "@/components/BetInput";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useBet } from "@/hooks/use-bet";
import { playDice } from "@/lib/casino.functions";
import { money } from "@/lib/format";

export const Route = createFileRoute("/dice")({
  head: () => ({
    meta: [
      { title: "Dice — DonutBet" },
      { name: "description", content: "Roll over or under and pick your own odds with DonutSMP money." },
      { property: "og:title", content: "Dice — DonutBet" },
      { property: "og:description", content: "Roll over or under and pick your own odds with DonutSMP money." },
    ],
  }),
  component: () => (
    <Shell>
      <Dice />
    </Shell>
  ),
});

function Dice() {
  const bet = useBet();
  const fn = useServerFn(playDice);
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [res, setRes] = useState<{ roll: number; win: boolean; payout: number } | null>(null);
  const chance = over ? 100 - target : target;

  async function play() {
    const r = await bet.run((wager) => fn({ data: { wager, target, over } }));
    if (!r) return;
    setRes(r);
    bet.setBalance(r.balance);
  }

  return (
    <GameLayout
      title="Dice"
      controls={
        <>
          <BetInput value={bet.amount} onChange={bet.setAmount} balance={bet.balance} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant={!over ? "default" : "secondary"} onClick={() => setOver(false)}>Roll under</Button>
            <Button variant={over ? "default" : "secondary"} onClick={() => setOver(true)}>Roll over</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-background p-3"><div className="text-muted-foreground">Win chance</div><div className="font-mono font-bold">{chance}%</div></div>
            <div className="rounded-lg bg-background p-3"><div className="text-muted-foreground">Payout</div><div className="font-mono font-bold">{(99 / chance).toFixed(2)}×</div></div>
          </div>
          <Button variant="hero" size="lg" className="h-12 w-full" onClick={play} disabled={bet.busy}>Roll</Button>
        </>
      }
    >
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center font-mono text-7xl font-bold">
          <span className={res ? (res.win ? "text-success" : "text-destructive") : "text-muted-foreground"}>{res ? res.roll.toFixed(2) : "00.00"}</span>
        </div>
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, var(--${over ? "destructive" : "success"}) ${target}%, var(--${over ? "success" : "destructive"}) ${target}%)` }} />
          <Slider value={[target]} min={2} max={98} step={1} onValueChange={(v) => setTarget(v[0]!)} />
          {res && <div className="absolute -top-7 -translate-x-1/2 font-mono text-xs" style={{ left: `${res.roll}%` }}>▼</div>}
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-muted-foreground"><span>0</span><span>{over ? ">" : "<"} {target}</span><span>100</span></div>
        {res && <p className={`mt-8 text-center font-display text-2xl font-bold ${res.win ? "text-success" : "text-destructive"}`}>{res.win ? `Won ${money(res.payout)}` : "Lost"}</p>}
      </div>
    </GameLayout>
  );
}

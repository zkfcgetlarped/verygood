import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { BetInput, GameLayout } from "@/components/BetInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBet } from "@/hooks/use-bet";
import { playCrash } from "@/lib/casino.functions";
import { money } from "@/lib/format";

export const Route = createFileRoute("/crash")({
  head: () => ({
    meta: [
      { title: "Crash — DonutBet" },
      { name: "description", content: "Set your cash-out and ride the multiplier before it crashes." },
      { property: "og:title", content: "Crash — DonutBet" },
      { property: "og:description", content: "Set your cash-out and ride the multiplier before it crashes." },
    ],
  }),
  component: () => (
    <Shell>
      <Crash />
    </Shell>
  ),
});

function Crash() {
  const bet = useBet();
  const fn = useServerFn(playCrash);
  const [cashout, setCashout] = useState("2");
  const [mult, setMult] = useState(1);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [res, setRes] = useState<{ crashAt: number; win: boolean; payout: number; balance: number } | null>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  async function play() {
    const c = parseFloat(cashout);
    if (!(c >= 1.01)) return;
    const r = await bet.run((wager) => fn({ data: { wager, cashout: c } }));
    if (!r) return;
    setRes(r);
    setPhase("running");
    const end = Math.min(r.crashAt, r.win ? c : r.crashAt);
    const t0 = performance.now();
    const tick = (t: number) => {
      const m = Math.pow(Math.E, 0.00012 * (t - t0) * 3);
      if (m >= end) {
        setMult(end);
        setPhase("done");
        bet.setBalance(r.balance);
        return;
      }
      setMult(m);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  const crashed = phase === "done" && res && !res.win;
  const cashed = phase === "done" && res?.win;

  return (
    <GameLayout
      title="Crash"
      controls={
        <>
          <BetInput value={bet.amount} onChange={bet.setAmount} balance={bet.balance} />
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Auto cash-out at</div>
            <Input value={cashout} onChange={(e) => setCashout(e.target.value)} className="h-11 font-mono" />
          </div>
          <Button variant="hero" size="lg" className="h-12 w-full" onClick={play} disabled={bet.busy || phase === "running"}>
            {phase === "running" ? "Flying…" : "Launch"}
          </Button>
        </>
      }
    >
      <div className="text-center">
        <div className={`font-mono text-8xl font-bold tabular-nums ${crashed ? "text-destructive" : cashed ? "text-success" : "text-foreground"}`}>
          {mult.toFixed(2)}×
        </div>
        {crashed && <p className="mt-4 font-display text-2xl font-bold text-destructive">Crashed at {res!.crashAt.toFixed(2)}×</p>}
        {cashed && <p className="mt-4 font-display text-2xl font-bold text-success">Cashed out {money(res!.payout)} · crashed at {res!.crashAt.toFixed(2)}×</p>}
      </div>
    </GameLayout>
  );
}

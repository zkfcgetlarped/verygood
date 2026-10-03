import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { BetInput, GameLayout } from "@/components/BetInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBet } from "@/hooks/use-bet";
import { minesCashout, minesReveal, minesStart } from "@/lib/casino.functions";
import { money, parseMoney } from "@/lib/format";

export const Route = createFileRoute("/mines")({
  head: () => ({
    meta: [
      { title: "Mines — DonutBet" },
      { name: "description", content: "Pick gems, dodge the bombs and cash out your DonutSMP winnings." },
      { property: "og:title", content: "Mines — DonutBet" },
      { property: "og:description", content: "Pick gems, dodge the bombs and cash out your DonutSMP winnings." },
    ],
  }),
  component: () => (
    <Shell>
      <Mines />
    </Shell>
  ),
});

function Mines() {
  const bet = useBet();
  const start = useServerFn(minesStart);
  const reveal = useServerFn(minesReveal);
  const cash = useServerFn(minesCashout);
  const [mines, setMines] = useState("3");
  const [game, setGame] = useState<{ id: string; wager: number } | null>(null);
  const [gems, setGems] = useState<number[]>([]);
  const [bombs, setBombs] = useState<number[] | null>(null);
  const [mult, setMult] = useState(1);
  const [busy, setBusy] = useState(false);

  async function begin() {
    const m = parseInt(mines);
    if (!(m >= 1 && m <= 24)) { toast.error("Pick 1–24 mines"); return; }
    const r = await bet.run((wager) => start({ data: { wager, mines: m } }));
    if (!r) return;
    setGame({ id: r.gameId, wager: parseMoney(bet.amount) });
    setGems([]);
    setBombs(null);
    setMult(1);
    bet.setBalance(r.balance);
  }

  async function pick(i: number) {
    if (!game || busy || gems.includes(i)) return;
    setBusy(true);
    try {
      const r = await reveal({ data: { gameId: game.id, cell: i } });
      if (r.bomb) {
        setBombs(r.bombs);
        setGems((g) => g);
        setGame(null);
        toast.error("Boom! You hit a bomb.");
      } else {
        setGems((g) => [...g, i]);
        setMult(r.multiplier);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cashout() {
    if (!game) return;
    setBusy(true);
    try {
      const r = await cash({ data: { gameId: game.id } });
      setBombs(r.bombs);
      setGame(null);
      bet.setBalance(r.balance);
      toast.success(`Cashed out ${money(r.payout)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameLayout
      title="Mines"
      controls={
        <>
          <BetInput value={bet.amount} onChange={bet.setAmount} balance={bet.balance} />
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Mines (1–24)</div>
            <Input value={mines} onChange={(e) => setMines(e.target.value)} disabled={!!game} className="h-11 font-mono" />
          </div>
          {game ? (
            <Button variant="hero" size="lg" className="h-12 w-full" onClick={cashout} disabled={busy || gems.length === 0}>
              Cash out {money(Math.floor(game.wager * mult))} ({mult.toFixed(2)}×)
            </Button>
          ) : (
            <Button variant="hero" size="lg" className="h-12 w-full" onClick={begin} disabled={bet.busy}>Start game</Button>
          )}
        </>
      }
    >
      <div className="grid w-full max-w-md grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, i) => {
          const gem = gems.includes(i);
          const bomb = bombs?.includes(i);
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={!game}
              className={`aspect-square rounded-lg text-2xl transition-all ${
                gem ? "bg-success/20 ring-2 ring-success" : bomb ? "bg-destructive/25 ring-2 ring-destructive" : bombs ? "bg-secondary/50" : "bg-secondary hover:-translate-y-0.5 hover:bg-muted"
              }`}
            >
              {gem ? "💎" : bomb ? "💣" : ""}
            </button>
          );
        })}
      </div>
    </GameLayout>
  );
}

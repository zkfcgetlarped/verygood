import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRefreshMe } from "@/hooks/use-me";
import { startVerification } from "@/lib/casino.functions";
import { BOT_NAME } from "@/lib/config";

type Pending = { username: string; amount: number } | null;

export function Verify({ pending }: { pending: Pending }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const start = useServerFn(startVerification);
  const refresh = useRefreshMe();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { toast.error("That's not a valid Minecraft username"); return; }
    setBusy(true);
    try {
      await start({ data: { username: name } });
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-10 md:grid-cols-2">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">DonutSMP casino</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] md:text-6xl">
          Bet your <span className="text-donut">DonutSMP</span> money.
        </h1>
        <p className="mt-5 text-muted-foreground">
          Coinflip, Dice, Crash and Mines. Deposit by paying our bot in game, withdraw and the bot pays you back.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-glow">
        {!pending ? (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="font-display text-xl font-bold">Log in with your Minecraft name</h2>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your username" className="h-12 font-mono text-lg" />
            <Button variant="hero" size="lg" className="h-12 w-full" disabled={busy}>
              Continue
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={`https://mc-heads.net/avatar/${pending.username}/40`} alt="" className="h-10 w-10 rounded" />
              <h2 className="font-display text-xl font-bold">Prove it's you, {pending.username}</h2>
            </div>
            <p className="text-sm text-muted-foreground">Join DonutSMP and type this exact command:</p>
            <code className="block rounded-lg bg-background p-4 font-mono text-lg text-accent">
              /pay {BOT_NAME} {pending.amount}
            </code>
            <p className="text-sm text-muted-foreground">
              Once the bot sees the payment from your name with this exact amount, you're logged in automatically. The money is added to your balance.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Waiting for the bot…
            </div>
            <Button variant="ghost" size="sm" onClick={async () => { await start({ data: { username: pending.username } }); await refresh(); }}>
              Get a new amount
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

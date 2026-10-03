import { Input } from "@/components/ui/input";
import { money, parseMoney } from "@/lib/format";

export function BetInput({ value, onChange, balance }: { value: string; onChange: (v: string) => void; balance: number }) {
  const n = parseMoney(value);
  const set = (v: number) => onChange(String(Math.max(100, Math.floor(v))));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>Bet amount</span>
        <span>{Number.isFinite(n) ? money(n) : "—"}</span>
      </div>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. 10k" className="h-11 font-mono" />
        <button type="button" onClick={() => Number.isFinite(n) && set(n / 2)} className="rounded-md bg-secondary px-3 text-sm">½</button>
        <button type="button" onClick={() => Number.isFinite(n) && set(n * 2)} className="rounded-md bg-secondary px-3 text-sm">2×</button>
        <button type="button" onClick={() => set(balance)} className="rounded-md bg-secondary px-3 text-sm">Max</button>
      </div>
    </div>
  );
}

export function GameLayout({ title, controls, children }: { title: string; controls: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-6 font-display text-4xl font-extrabold">{title}</h1>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">{controls}</div>
        <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border bg-card p-6">{children}</div>
      </div>
    </div>
  );
}

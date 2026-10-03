import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DonutBet — DonutSMP Casino" },
      { name: "description", content: "Gamble your DonutSMP money on Coinflip, Dice, Crash and Mines. Deposit and withdraw through the in-game bot." },
      { property: "og:title", content: "DonutBet — DonutSMP Casino" },
      { property: "og:description", content: "Gamble your DonutSMP money on Coinflip, Dice, Crash and Mines." },
    ],
  }),
  component: () => (
    <Shell>
      <Lobby />
    </Shell>
  ),
});

const games = [
  { to: "/coinflip", name: "Coinflip", tag: "1.96×", icon: "🪙" },
  { to: "/dice", name: "Dice", tag: "Pick your odds", icon: "🎲" },
  { to: "/crash", name: "Crash", tag: "Up to 1000×", icon: "🚀" },
  { to: "/mines", name: "Mines", tag: "Dodge the bombs", icon: "💣" },
  { to: "/blackjack", name: "Blackjack", tag: "Pays 3:2", icon: "🃏" },
] as const;

function Lobby() {
  return (
    <div>
      <h1 className="font-display text-5xl font-extrabold">Pick a game</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((g) => (
          <Link key={g.to} to={g.to} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-glow">
            <div className="text-6xl transition group-hover:scale-110">{g.icon}</div>
            <div className="mt-8 font-display text-2xl font-bold">{g.name}</div>
            <div className="font-mono text-sm text-primary">{g.tag}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

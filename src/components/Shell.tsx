import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMe } from "@/hooks/use-me";
import { money } from "@/lib/format";
import { Verify } from "./Verify";

const nav = [
  { to: "/", label: "Lobby" },
  { to: "/coinflip", label: "Coinflip" },
  { to: "/dice", label: "Dice" },
  { to: "/crash", label: "Crash" },
  { to: "/mines", label: "Mines" },
  { to: "/blackjack", label: "Blackjack" },
  { to: "/wallet", label: "Wallet" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { data, isLoading, ready } = useMe();
  const player = data?.player;

  return (
    <div className="min-h-screen font-sans">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-donut">Donut</span>Bet
          </Link>
          {player && (
            <nav className="hidden gap-1 md:flex">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                  activeOptions={{ exact: true }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
          {player && (
            <Link to="/wallet" className="ml-auto flex items-center gap-3 rounded-full border border-border bg-card py-1 pl-1 pr-4">
              <img src={`https://mc-heads.net/avatar/${player.username}/28`} alt="" className="h-7 w-7 rounded-full" />
              <span className="font-mono text-sm font-semibold text-accent">{money(player.balance)}</span>
            </Link>
          )}
        </div>
        {player && (
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="shrink-0 rounded-md px-3 py-1 text-sm text-muted-foreground" activeProps={{ className: "bg-secondary text-foreground" }} activeOptions={{ exact: true }}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {!ready || isLoading ? (
          <div className="py-24 text-center text-muted-foreground">Loading…</div>
        ) : player ? (
          children
        ) : (
          <Verify pending={data?.verification ?? null} />
        )}
      </main>
    </div>
  );
}

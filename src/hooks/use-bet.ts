import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useMe } from "./use-me";
import { parseMoney } from "@/lib/format";

export function useBet() {
  const { data } = useMe();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("1k");
  const [busy, setBusy] = useState(false);
  const balance = data?.player?.balance ?? 0;

  function setBalance(b: number) {
    qc.setQueryData(["me"], (old: typeof data) => (old?.player ? { ...old, player: { ...old.player, balance: b } } : old));
  }

  async function run<T>(fn: (wager: number) => Promise<T>): Promise<T | null> {
    const wager = parseMoney(amount);
    if (!Number.isFinite(wager) || wager < 100) {
      toast.error("Minimum bet is $100");
      return null;
    }
    if (wager > balance) {
      toast.error("Not enough balance — deposit in the Wallet");
      return null;
    }
    setBusy(true);
    try {
      return await fn(wager);
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { amount, setAmount, busy, balance, setBalance, run };
}

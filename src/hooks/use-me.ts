import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/casino.functions";

// Ensures the browser has a (guest) session, then loads the linked Minecraft player.
export function useSession() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.signInAnonymously();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

export function useMe() {
  const ready = useSession();
  const fn = useServerFn(getMe);
  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => fn(),
    enabled: ready,
    refetchInterval: (query) => (query.state.data?.player ? false : 5000),
  });
  return { ...q, ready };
}

export function useRefreshMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me"] });
}

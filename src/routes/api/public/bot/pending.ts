import { createFileRoute } from "@tanstack/react-router";
import { botAuthorized, json } from "@/lib/bot-auth.server";

// GET: everything the in-game bot needs to act on.
export const Route = createFileRoute("/api/public/bot/pending")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!botAuthorized(request)) return json({ error: "unauthorized" }, 401);
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const [v, d, w] = await Promise.all([
          db.from("verifications").select("id, username, amount, created_at").eq("status", "pending"),
          db.from("deposits").select("id, username, amount, created_at").eq("status", "pending"),
          db.from("withdrawals").select("id, username, amount, created_at").eq("status", "pending"),
        ]);
        return json({ verifications: v.data ?? [], deposits: d.data ?? [], withdrawals: w.data ?? [] });
      },
    },
  },
});

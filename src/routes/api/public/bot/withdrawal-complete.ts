import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botAuthorized, json } from "@/lib/bot-auth.server";

// POST { id, success }: the bot reports whether it paid the player in game.
// On failure the money is returned to the player's site balance.
export const Route = createFileRoute("/api/public/bot/withdrawal-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!botAuthorized(request)) return json({ error: "unauthorized" }, 401);
        const parsed = z.object({ id: z.string().uuid(), success: z.boolean() }).safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "invalid body" }, 400);
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: w } = await db
          .from("withdrawals")
          .update({ status: parsed.data.success ? "paid" : "failed", completed_at: new Date().toISOString() })
          .eq("id", parsed.data.id)
          .eq("status", "pending")
          .select("username, amount")
          .maybeSingle();
        if (!w) return json({ error: "not found or already handled" }, 404);
        if (!parsed.data.success) await db.rpc("adjust_balance", { _username: w.username, _delta: w.amount });
        return json({ ok: true });
      },
    },
  },
});

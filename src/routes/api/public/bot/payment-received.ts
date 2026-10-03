import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { botAuthorized, json } from "@/lib/bot-auth.server";

// POST { username, amount }: the bot calls this when a player /pays it in game.
// Matches a pending verification first, then a pending deposit (same name + exact amount).
export const Route = createFileRoute("/api/public/bot/payment-received")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!botAuthorized(request)) return json({ error: "unauthorized" }, 401);
        const parsed = z
          .object({ username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/), amount: z.number().int().positive() })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "invalid body" }, 400);
        const username = parsed.data.username.toLowerCase();
        const amount = parsed.data.amount;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

        const { data: ver } = await db
          .from("verifications")
          .update({ status: "verified", verified_at: new Date().toISOString() })
          .eq("username", username)
          .eq("amount", amount)
          .eq("status", "pending")
          .select("user_id")
          .limit(1)
          .maybeSingle();
        if (ver) {
          // Detach this login from any other name, and move this name to the new login.
          await db.from("players").update({ user_id: null }).eq("user_id", ver.user_id);
          await db.from("players").upsert({ username, user_id: ver.user_id }, { onConflict: "username" });
          // Verification payment counts toward balance.
          await db.rpc("adjust_balance", { _username: username, _delta: amount });
          return json({ matched: "verification" });
        }

        const { data: dep } = await db
          .from("deposits")
          .select("id")
          .eq("username", username)
          .eq("amount", amount)
          .eq("status", "pending")
          .order("created_at")
          .limit(1)
          .maybeSingle();
        if (dep) {
          const { data: claimed } = await db
            .from("deposits")
            .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
            .eq("id", dep.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (claimed) {
            await db.rpc("adjust_balance", { _username: username, _delta: amount });
            return json({ matched: "deposit", id: dep.id });
          }
        }
        // No request on the site, but this name is a verified account: treat it as a direct deposit.
        const { data: player } = await db
          .from("players")
          .select("username, user_id")
          .eq("username", username)
          .not("user_id", "is", null)
          .maybeSingle();
        if (player) {
          const { data: direct } = await db
            .from("deposits")
            .insert({ username, amount, status: "confirmed", confirmed_at: new Date().toISOString() })
            .select("id")
            .single();
          await db.rpc("adjust_balance", { _username: username, _delta: amount });
          return json({ matched: "direct-deposit", id: direct?.id });
        }
        return json({ matched: null, note: "no matching request — refund the player in game" });
      },
    },
  },
});

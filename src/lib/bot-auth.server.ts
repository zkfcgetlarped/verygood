import { timingSafeEqual } from "crypto";

// Ignore stray spaces/quotes (e.g. Windows `set X="abc"` keeps the quotes).
const clean = (v: string) => v.trim().replace(/^["']+|["']+$/g, "").trim();

export function botAuthorized(request: Request) {
  const secret = clean(process.env["BOT_API_SECRET"] ?? "");
  const token = clean((request.headers.get("authorization") ?? "").replace(/^\s*Bearer\s+/i, ""));
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

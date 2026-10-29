// POST /api/directory-request -> stores a "please add my website" request as PENDING. Never auto-published; an admin reviews it.
// Spam defense: honeypot field, basic URL check, same-origin, SQL rate limit (3/day per salted device+IP hash).
import { json, configured, notConfigured, sb, sameOrigin, hashId, fail } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured();
  if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const b = await request.json().catch(() => ({}));
  if (b.website2) return json({ ok: true }); // honeypot filled -> bot; pretend success
  let u; try { u = new URL(String(b.url || "")); } catch { return json({ error: "bad_url" }, 400); }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return json({ error: "bad_url" }, 400);
  const s = (x, n) => String(x || "").trim().slice(0, n);
  if (s(b.name, 120).length < 2 || s(b.description, 500).length < 10 || !s(b.category, 80) || b.consent !== true) return json({ error: "bad_input" }, 400);
  try {
    const id = await sb(env, "rpc/request_directory_listing", { method: "POST", body: { p_name: s(b.name, 120), p_url: u.href.slice(0, 300), p_category: s(b.category, 80), p_location: s(b.location, 120),
      p_description: s(b.description, 500), p_email: s(b.email, 200), p_consent: true, p_rate_key: await hashId(request, env, "dirreq") } });
    return json({ ok: true, id, status: "pending" });
  } catch (e) { return fail(e); }
}

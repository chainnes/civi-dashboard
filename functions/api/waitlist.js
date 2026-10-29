// POST /api/waitlist {features[]} -> premium interest (login required; stored against the user's id, RLS).
import { json, configured, notConfigured, sb, currentUser, sameOrigin, fail } from "../_lib.js";
const OK = ["alerts", "exports", "sims", "analytics"];
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured(); if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  const f = ((await request.json().catch(() => ({}))).features || []).filter(x => OK.includes(x));
  try { await sb(env, "premium_waitlist?on_conflict=user_id", { method: "POST", body: { user_id: me.user.id, features: f }, token: me.token, prefer: "resolution=merge-duplicates" }); return json({ ok: true }); }
  catch (e) { return fail(e); }
}

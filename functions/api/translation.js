// POST /api/translation {lang, key, page, current, suggestion, note} -> stores a community translation suggestion (login required, rate-limited in SQL).
import { json, configured, notConfigured, sb, currentUser, sameOrigin, fail } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured();
  if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  const b = await request.json().catch(() => ({}));
  if (!/^[a-z]{2,3}$/.test(b.lang || "") || !b.key || !b.suggestion || String(b.suggestion).length > 500) return json({ error: "bad_input" }, 400);
  try { return json({ id: await sb(env, "rpc/suggest_translation", { method: "POST", token: me.token,
    body: { p_lang: b.lang, p_key: String(b.key).slice(0, 60), p_page: String(b.page || "").slice(0, 40), p_current: String(b.current || "").slice(0, 500), p_suggestion: String(b.suggestion).slice(0, 500), p_note: String(b.note || "").slice(0, 300) } }) }); }
  catch (e) { return fail(e); }
}

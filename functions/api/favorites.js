// /api/favorites  GET -> your saved items; POST {action:"add"|"remove", type, item_id, title, url}. Login required; RLS limits rows to the owner.
import { json, configured, notConfigured, sb, currentUser, sameOrigin, fail } from "../_lib.js";
const TYPES = ["directory", "academy", "howto", "news", "petition", "scholarship", "topic", "official", "company"];
export async function onRequestGet({ request, env }) {
  if (!configured(env)) return notConfigured();
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  try { return json({ items: await sb(env, "favorites?select=type,item_id,title,url,created_at&order=created_at.desc&limit=500", { token: me.token }) }); } catch (e) { return fail(e); }
}
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured();
  if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  const b = await request.json().catch(() => ({}));
  if (!TYPES.includes(b.type) || !b.item_id || String(b.item_id).length > 200) return json({ error: "bad_input" }, 400);
  const url = /^https?:\/\//.test(b.url || "") || /^#\//.test(b.url || "") ? String(b.url).slice(0, 500) : null;
  try {
    if (b.action === "remove") { await sb(env, `favorites?type=eq.${encodeURIComponent(b.type)}&item_id=eq.${encodeURIComponent(b.item_id)}`, { method: "DELETE", token: me.token }); return json({ ok: true }); }
    await sb(env, "rpc/add_favorite", { method: "POST", token: me.token, body: { p_type: b.type, p_item_id: String(b.item_id), p_title: String(b.title || "").slice(0, 200), p_url: url } });
    return json({ ok: true });
  } catch (e) { return fail(e); }
}

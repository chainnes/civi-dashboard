// GET /api/lounge -> topics (seeded + users) ranked, with replies. POST {action: topic|reply|vote|report} (login required).
import { json, configured, notConfigured, sb, currentUser, sameOrigin, fail } from "../_lib.js";
const CATS = ["Government", "Laws & Policy", "Economy & Jobs", "Disaster & Weather", "Environment", "Health", "Education", "Security", "Transport & Infrastructure", "Sports", "Entertainment", "Other"];
export async function onRequestGet({ request, env }) {
  if (!configured(env)) return notConfigured();
  try {
    const me = await currentUser(request, env);
    const [topics, replies, mine] = await Promise.all([sb(env, "lounge_topics_ranked?select=*&limit=200"), sb(env, "lounge_replies_public?select=*&order=created_at.asc&limit=2000"),
      me ? sb(env, `lounge_votes?select=topic_id&user_id=eq.${me.user.id}`, { token: me.token }) : []]);
    const voted = new Set(mine.map(v => v.topic_id));
    return json({ items: topics.map(t => ({ id: t.id, title: t.title, cat: t.cat, starter: t.body, sources: t.sources || [], by: t.is_seed ? "Civi starter" : t.handle, votes: t.votes, voted: voted.has(t.id),
      replies: replies.filter(r => r.topic_id === t.id).map(r => ({ by: r.handle, body: r.body, time: r.created_at })) })) });
  } catch (e) { return fail(e); }
}
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured();
  if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  const b = await request.json().catch(() => ({})); const tok = { token: me.token };
  try {
    if (b.action === "topic") { if (!b.title || b.title.length > 160 || !CATS.includes(b.cat)) return json({ error: "bad_input" }, 400);
      return json({ id: await sb(env, "rpc/lounge_post_topic", { method: "POST", body: { p_title: b.title, p_cat: b.cat, p_body: (b.starter || "").slice(0, 1500) }, ...tok }) }); }
    if (b.action === "reply") { if (!b.body || b.body.length > 1000) return json({ error: "bad_input" }, 400);
      return json({ id: await sb(env, "rpc/lounge_post_reply", { method: "POST", body: { p_topic: b.topic_id, p_body: b.body }, ...tok }) }); }
    if (b.action === "vote") return json({ ok: await sb(env, "rpc/lounge_vote", { method: "POST", body: { p_topic: b.topic_id }, ...tok }) });
    if (b.action === "report") return json({ ok: await sb(env, "rpc/lounge_report", { method: "POST", body: { p_topic: b.topic_id, p_reason: (b.reason || "").slice(0, 200) }, ...tok }) });
    return json({ error: "bad_action" }, 400);
  } catch (e) { return fail(e); }
}

// Civi Daily Briefing API.
// GET  /api/briefing            -> {prefs, items} for the logged-in user (RLS: own rows only)
// POST /api/briefing {action:"prefs", ...}      save preferences (email/push need explicit consent flags; see sql/006)
// POST /api/briefing {action:"read", id}         mark an item read
// POST /api/briefing {action:"push_sub", sub}    store a Web Push subscription (only if push_on with consent)
// POST /api/briefing {action:"push_unsub", endpoint}
// Civi never emails from here: digests are sent by the n8n workflow to opt-in subscribers only.
import { json, configured, notConfigured, sb, currentUser, sameOrigin, fail } from "../_lib.js";
const CONSENT_VERSION = "briefing-2026-10-29";
export async function onRequestGet({ request, env }) {
  if (!configured(env)) return notConfigured();
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  try {
    const [prefs] = await sb(env, `briefing_prefs?select=*&user_id=eq.${me.user.id}`, { token: me.token });
    const items = await sb(env, "briefing_items?select=*&order=day.desc,rank.desc&limit=60", { token: me.token });
    return json({ prefs: prefs || null, items, vapid_public_key: env.VAPID_PUBLIC_KEY || null });
  } catch (e) { return fail(e); }
}
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured(); if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  const b = await request.json().catch(() => ({})); const tok = { token: me.token };
  try {
    if (b.action === "prefs") {
      const p = { topics: (b.topics || []).map(String).slice(0, 11), place_psgc: /^\d{9,10}$/.test(b.place_psgc || "") ? b.place_psgc : "", place_name: String(b.place_name || "").slice(0, 80),
        areas: (b.areas || []).map(x => String(x).toLowerCase().slice(0, 40)).slice(0, 6), in_app: b.in_app !== false, email_on: !!b.email_on, email_consent: !!b.email_consent,
        email_freq: b.email_freq === "weekly" ? "weekly" : "daily", email_hour: Math.min(23, Math.max(0, b.email_hour | 0)), email_dow: Math.min(6, Math.max(0, b.email_dow | 0)),
        push_on: !!b.push_on, push_consent: !!b.push_consent, consent_version: CONSENT_VERSION };
      return json({ prefs: await sb(env, "rpc/briefing_save_prefs", { method: "POST", body: { p }, ...tok }) });
    }
    if (b.action === "read") { await sb(env, `briefing_items?id=eq.${+b.id}`, { method: "PATCH", body: { read_at: new Date().toISOString() }, ...tok }); return json({ ok: true }); }
    if (b.action === "push_sub") {
      const s = b.sub || {}; if (!/^https:\/\//.test(s.endpoint || "") || !s.keys?.p256dh || !s.keys?.auth) return json({ error: "bad_subscription" }, 400);
      const [pr] = await sb(env, `briefing_prefs?select=push_on&user_id=eq.${me.user.id}`, tok); if (!pr?.push_on) return json({ error: "push_consent_required" }, 400);
      await sb(env, "push_subscriptions?on_conflict=endpoint", { method: "POST", prefer: "resolution=merge-duplicates", ...tok,
        body: { user_id: me.user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, ua: (request.headers.get("user-agent") || "").slice(0, 200) } });
      return json({ ok: true });
    }
    if (b.action === "push_unsub") { await sb(env, `push_subscriptions?endpoint=eq.${encodeURIComponent(String(b.endpoint || ""))}`, { method: "DELETE", ...tok }); return json({ ok: true }); }
    return json({ error: "bad_action" }, 400);
  } catch (e) { return fail(e); }
}

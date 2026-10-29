// Empower hub API. GET /api/empower?kind=petitions|reports|project_updates|events|impact|foi
// POST {action, ...} (login required, same-origin; all writes go through RLS / security-definer RPCs in sql/005_empower.sql).
// Civi NEVER sends letters, FOI requests or emails: it only stores drafts/status the user owns.
import { json, configured, notConfigured, sb, currentUser, sameOrigin, fail } from "../_lib.js";
const VIEWS = { petitions: "petitions_public?select=*&order=created_at.desc&limit=200", reports: "reports_public?select=*&order=created_at.desc&limit=500",
  project_updates: "project_updates_public?select=*&order=created_at.desc&limit=500", events: "user_events_public?select=*&order=starts_at.asc&limit=300",
  impact: "impact_public?select=*&order=created_at.desc&limit=100" };
const https = a => (Array.isArray(a) ? a : []).map(String).filter(u => /^https:\/\/[^\s]+$/.test(u)).slice(0, 8);
const s = (v, n) => String(v ?? "").trim().slice(0, n);
const num = v => (v === null || v === "" || v === undefined || isNaN(+v)) ? null : +v;
export async function onRequestGet({ request, env }) {
  if (!configured(env)) return notConfigured();
  const kind = new URL(request.url).searchParams.get("kind");
  try {
    if (kind === "foi") { const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
      return json({ items: await sb(env, "foi_requests?select=*&order=created_at.desc", { token: me.token }) }); }
    if (!VIEWS[kind]) return json({ error: "bad_kind" }, 400);
    const items = await sb(env, VIEWS[kind]); let mine = [];
    const me = await currentUser(request, env);
    if (me && kind === "petitions") mine = (await sb(env, `petition_signatures?select=petition_id&user_id=eq.${me.user.id}`, { token: me.token })).map(r => r.petition_id);
    if (me && kind === "reports") mine = (await sb(env, `report_metoo?select=report_id&user_id=eq.${me.user.id}`, { token: me.token })).map(r => r.report_id);
    return json({ items, mine, storage: env.SUPABASE_URL + "/storage/v1/object/public/sumbong-photos/" });
  } catch (e) { return fail(e); }
}
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured(); if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  const b = await request.json().catch(() => ({})); const tok = { token: me.token }; const rpc = (f, body) => sb(env, "rpc/" + f, { method: "POST", body, ...tok });
  try {
    switch (b.action) {
      case "petition_create": return json({ id: await rpc("petition_create", { p_title: s(b.title, 140), p_ask: s(b.ask, 1500), p_target: s(b.target, 160), p_cat: s(b.cat, 40) || "Government", p_sources: https(b.sources), p_goal: Math.max(10, Math.min(1e6, b.goal | 0)) }) });
      case "petition_sign": return json({ ok: await rpc("petition_sign", { p_id: b.id, p_show_name: !!b.show_name }) });
      case "petition_unsign": return json({ ok: await rpc("petition_unsign", { p_id: b.id }) });
      case "petition_update": return json({ id: await rpc("petition_update", { p_id: b.id, p_body: s(b.body, 1500) }) });
      case "petition_report": return json({ ok: await rpc("petition_report", { p_id: b.id, p_reason: s(b.reason, 200) }) });
      case "report_create": {
        let photo = null;
        if (b.photo_b64) { // client already re-encoded to JPEG (EXIF/GPS stripped); verify JPEG magic + size, upload under the user's folder
          const bin = Uint8Array.from(atob(String(b.photo_b64)), c => c.charCodeAt(0));
          if (bin.length > 3145728 || bin[0] !== 0xFF || bin[1] !== 0xD8) return json({ error: "bad_photo" }, 400);
          if (bin[2] === 0xFF && bin[3] === 0xE1) return json({ error: "photo_has_exif" }, 400); // APP1/EXIF must be gone
          photo = `${me.user.id}/${crypto.randomUUID()}.jpg`;
          const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sumbong-photos/${photo}`, { method: "POST", body: bin, headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${me.token}`, "content-type": "image/jpeg" } });
          if (!r.ok) return json({ error: "upload_failed" }, 502);
        }
        return json({ id: await rpc("report_create", { p_title: s(b.title, 140), p_body: s(b.body, 2000), p_cat: s(b.cat, 40), p_place: s(b.place, 120) || null, p_lat: num(b.lat), p_lng: num(b.lng), p_evidence: https(b.evidence), p_photo: photo, p_project: s(b.project_id, 40) || null, p_ack: b.rules_ack === true }) });
      }
      case "report_metoo": return json({ on: await rpc("report_metoo_toggle", { p_id: b.id }) });
      case "report_status": return json({ ok: await rpc("report_set_status", { p_id: b.id, p_status: s(b.status, 30) }) });
      case "report_flag": return json({ ok: await rpc("report_flag", { p_id: b.id, p_reason: s(b.reason, 200) }) });
      case "project_update": return json({ id: await rpc("project_update_add", { p_project: s(b.project_id, 40), p_body: s(b.body, 1000), p_report: b.report_id || null }) });
      case "event_create": return json({ id: await rpc("event_create", { p_title: s(b.title, 140), p_kind: s(b.kind, 40), p_starts: b.starts_at, p_place: s(b.place, 120), p_lat: num(b.lat), p_lng: num(b.lng), p_url: https([b.url])[0] || "" }) });
      case "foi_save": { const row = { agency: s(b.agency, 160), data_requested: s(b.data_requested, 2000), purpose: s(b.purpose, 600), format: s(b.format, 60), tracking_no: s(b.tracking_no, 60) || null, status: s(b.status, 30) || "Draft", filed_on: b.filed_on || null, updated_at: new Date().toISOString() };
        if (b.id) return json({ ok: await sb(env, `foi_requests?id=eq.${encodeURIComponent(b.id)}`, { method: "PATCH", body: row, ...tok }) });
        return json({ ok: await sb(env, "foi_requests", { method: "POST", body: { ...row, user_id: me.user.id }, ...tok, prefer: "return=minimal" }) }); }
      case "foi_delete": return json({ ok: await sb(env, `foi_requests?id=eq.${encodeURIComponent(b.id)}`, { method: "DELETE", ...tok }) });
      default: return json({ error: "bad_action" }, 400);
    }
  } catch (e) { return fail(e); }
}

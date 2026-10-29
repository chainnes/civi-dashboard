// GET /api/map?kind=shared -> visible user-submitted links (public read via RLS, auto-hidden ones excluded by the view).
import { json, configured, notConfigured, sb, fail } from "../_lib.js";
export async function onRequestGet({ env }) {
  if (!configured(env)) return notConfigured();
  try { const rows = await sb(env, "shared_links_public?select=*&order=created_at.desc&limit=300");
    return json({ items: rows.map(r => ({ kind: "user", title: r.title, url: r.url, source: r.host, stype: "User-submitted", cat: r.cat, time: r.created_at, place: r.place, ll: r.lat != null ? [r.lat, r.lon] : null, geo: r.lat != null ? "psgc-match" : "national", summary: r.summary, by: r.handle })) });
  } catch (e) { return fail(e); }
}

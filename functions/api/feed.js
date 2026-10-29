// GET /api/feed?name=news|directory|law_refs|kpis -> latest rows from Supabase (read-only, RLS "public read").
import { json, configured, sb, fail } from "../_lib.js";
const Q = { news: "news_items?select=source,title,link,published_at,summary,topics,regions,sentiment&order=published_at.desc&limit=150",
  directory: "directory?select=type,name,location,city,tags,roles,source,url,starts_at&or=(starts_at.is.null,starts_at.gte.now())&limit=200",
  law_refs: "law_refs?select=source,kind,number,title,enacted,url&order=id.desc&limit=500",
  kpis: "kpis?select=day,name,value,unit,method,source&order=day.desc&limit=50" };
export async function onRequestGet({ request, env }) {
  const name = new URL(request.url).searchParams.get("name");
  if (!Q[name]) return json({ error: "unknown feed" }, 400);
  if (!configured(env)) return json({ error: "supabase_not_configured" }, 503);
  try { return json({ source: "supabase", items: await sb(env, Q[name].replace("now()", new Date().toISOString())) }); } catch (e) { return fail(e); }
}

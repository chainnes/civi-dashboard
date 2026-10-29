// Shared helpers for Pages Functions. Supabase is called ONLY here (server side).
// Env vars (Cloudflare Pages > Settings > Environment variables): SUPABASE_URL, SUPABASE_ANON_KEY, VOTER_SALT, optional DONATE_URL.
// The anon key never reaches the browser. User sessions are HttpOnly cookies holding the Supabase access/refresh token,
// so every write runs as that user and Postgres RLS (auth.uid()) decides what is allowed.
export const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
export const configured = env => !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.VOTER_SALT);
export const notConfigured = () => json({ error: "supabase_not_configured", demo: true }, 503);
export async function sb(env, path, { method = "GET", body, token, prefer } = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { method, body: body && JSON.stringify(body),
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) } });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) throw Object.assign(new Error(d?.message || t), { status: r.status });
  return d;
}
export async function authApi(env, path, body, token) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/${path}`, { method: body ? "POST" : "GET", body: body && JSON.stringify(body),
    headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  const d = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, d };
}
export const cookies = req => Object.fromEntries((req.headers.get("cookie") || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
export const setSession = (s) => [
  `civi_at=${encodeURIComponent(s.access_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${s.expires_in || 3600}`,
  `civi_rt=${encodeURIComponent(s.refresh_token)}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`];
export const clearSession = () => ["civi_at=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0", "civi_rt=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0"];
export function withCookies(res, list) { const h = new Headers(res.headers); list.forEach(c => h.append("set-cookie", c)); return new Response(res.body, { status: res.status, headers: h }); }
// Returns {token, user} or null. Verifies the token with Supabase on every call (no local JWT trust).
export async function currentUser(request, env) {
  const at = cookies(request).civi_at; if (!at) return null;
  const r = await authApi(env, "user", null, at); return r.ok ? { token: at, user: r.d } : null;
}
// Same-origin check for state-changing requests (CSRF defense on top of SameSite=Lax).
export const sameOrigin = req => { const o = req.headers.get("origin"); return !o || o === new URL(req.url).origin; };
export async function hashId(request, env, extra = "") {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.VOTER_SALT}|${ip}|${extra}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const fail = e => { console.error(e.message); const s = e.status && e.status < 500 ? e.status : 502; return json({ error: s === 429 || /rate/i.test(e.message) ? "rate_limited" : "request_failed" }, s); };

// ---- Categorizer (mirrors scripts/taxonomy.py) + PSGC geotag
export const RULES = [
 ["Disaster & Weather", /typhoon|storm|flood|quake|earthquake|volcan|landslide|pagasa|phivolcs|bagyo|ndrrmc|evacuat|tsunami|el ni[nñ]o|la ni[nñ]a|habagat|amihan/],
 ["Laws & Policy", /\blaw\b|\bbill\b|republic act|ordinance|executive order|memorandum|circular|supreme court|ruling|impeach|senate|congress|veto/],
 ["Security", /west philippine sea|\bwps\b|coast guard|military|\bafp\b|police|\bpnp\b|crime|drug|terror|\bnbi\b|scam|arrest/],
 ["Health", /health|\bdoh\b|hospital|dengue|vaccin|disease|philhealth|outbreak/],
 ["Economy & Jobs", /peso|inflation|economy|\bgdp\b|jobs|employment|price|tariff|business|invest|\bbsp\b|stock|wage|\bdole\b|ofw|remittance/],
 ["Environment", /climate|environment|denr|forest|reef|pollution|mining|wildlife|plastic|mangrove/],
 ["Transport & Infrastructure", /\bmrt\b|\blrt\b|jeepney|transport|ltfrb|\blto\b|road|bridge|airport|railway|dpwh|flood control|brownout|meralco/],
 ["Education", /school|student|deped|ched|tesda|education|teacher|universit|scholar/],
 ["Sports", /\bpba\b|\buaap\b|\bncaa\b|basketball|volleyball|boxing|olympic|gilas|football|athlete|fiba/],
 ["Entertainment", /actor|actress|celebrity|concert|movie|film|showbiz|kapamilya|kapuso|music|album|teleserye/],
 ["Government", /marcos|duterte|president|ombudsman|comelec|corruption|government|budget|\blgu\b|mayor|governor|cabinet|election/],
 ["Community Events", /festival|fiesta|meetup|workshop|community|volunteer|fun run|event/]];
export const categorize = txt => (RULES.find(([, r]) => r.test(txt.toLowerCase())) || ["Other"])[0];
let GAZ;
export async function geotag(env, request, text) {
  if (!GAZ) { const r = await (env.ASSETS ? env.ASSETS.fetch(new URL("/data/gazetteer.json", request.url)) : fetch(new URL("/data/gazetteer.json", request.url))); GAZ = await r.json(); }
  const t = " " + text.toLowerCase().replace(/[^a-zñ ]/g, " ") + " ";
  const k = Object.keys(GAZ).sort((a, b) => b.length - a.length).find(k => t.includes(" " + k + " "));
  return k ? GAZ[k] : null;
}

// /api/auth/* : signup, login, magic, google, session, me, logout, refresh. Keys stay server-side.
import { json, configured, notConfigured, authApi, setSession, clearSession, withCookies, cookies, currentUser, sameOrigin, sb } from "../../_lib.js";
const HANDLE = /^[a-z0-9_]{3,20}$/;
export async function onRequest({ request, env, params }) {
  const p = (params.path || []).join("/"); const url = new URL(request.url);
  if (!configured(env)) return notConfigured();
  if (request.method === "POST" && !sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  if (p === "me") { const u = await currentUser(request, env); if (!u) return json({ user: null });
    const prof = await sb(env, `profiles?select=handle,display_name&id=eq.${u.user.id}`, { token: u.token }).catch(() => []);
    return json({ user: { id: u.user.id, handle: prof[0]?.handle || "new_user", email: u.user.email } }); }
  if (p === "signup") {
    if (!body.consent) return json({ error: "consent_required" }, 400);
    if (!HANDLE.test(body.handle || "")) return json({ error: "bad_handle" }, 400);
    const r = await authApi(env, "signup", { email: body.email, password: body.password, data: { handle: body.handle, ref_source: String(body.ref_source || "").slice(0, 40) || null, ref_campaign: String(body.ref_campaign || "").slice(0, 60) || null, consent_at: new Date().toISOString(), consent_version: "beta-2026-10-29" } });
    if (!r.ok) return json({ error: r.d.msg || r.d.error_description || "signup_failed" }, 400);
    if (!r.d.access_token) return json({ check_email: true });
    return withCookies(json({ ok: true }), setSession(r.d)); }
  if (p === "login") { const r = await authApi(env, "token?grant_type=password", { email: body.email, password: body.password });
    return r.ok ? withCookies(json({ ok: true }), setSession(r.d)) : json({ error: "invalid_login" }, 401); }
  if (p === "magic") { await authApi(env, "otp", { email: body.email, create_user: true, options: { email_redirect_to: `${url.origin}/auth-callback.html` } });
    return json({ ok: true }); } // same answer either way: don't reveal which emails exist
  if (p === "google") return Response.redirect(`${env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(url.origin + "/auth-callback.html")}`, 302);
  if (p === "session") { // called by /auth-callback.html with tokens from the URL fragment; verify before trusting
    const r = await authApi(env, "user", null, body.access_token); if (!r.ok) return json({ error: "invalid_token" }, 401);
    return withCookies(json({ ok: true }), setSession(body)); }
  if (p === "refresh") { const rt = cookies(request).civi_rt; if (!rt) return json({ error: "no_session" }, 401);
    const r = await authApi(env, "token?grant_type=refresh_token", { refresh_token: rt });
    return r.ok ? withCookies(json({ ok: true }), setSession(r.d)) : withCookies(json({ error: "expired" }, 401), clearSession()); }
  if (p === "referral") { const u = await currentUser(request, env); if (!u) return json({ error: "login_required" }, 401);
    await sb(env, "rpc/set_my_referral", { method: "POST", token: u.token, body: { p_source: String(body.ref_source || "").slice(0, 40), p_campaign: String(body.ref_campaign || "").slice(0, 60) } }).catch(() => null);
    return json({ ok: true }); }
  if (p === "logout") { const at = cookies(request).civi_at; if (at) await authApi(env, "logout", {}, at); return withCookies(json({ ok: true }), clearSession()); }
  return json({ error: "not_found" }, 404);
}

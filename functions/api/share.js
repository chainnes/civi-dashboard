// POST /api/share {url} (login required). Reads public metadata only: TikTok/YouTube via official oEmbed, other sites via
// <title>/og: tags (first 256 KB). Auto-categorizes + PSGC geotags, stores in shared_links as the user (RLS).
import { json, configured, notConfigured, currentUser, sameOrigin, sb, categorize, geotag, fail } from "../_lib.js";
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1|\[?f[cd])/i;
const meta = (h, k) => (h.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']{1,500})`, "i")) || [])[1];
const unent = s => s && s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export async function readMeta(u) {
  const host = u.hostname.replace(/^www\./, ""); let title, summary, thumb, author;
  const oembed = /(^|\.)tiktok\.com$/.test(host) ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`
    : /(^|\.)(youtube\.com|youtu\.be)$/.test(host) ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}` : null;
  if (oembed) { const r = await fetch(oembed, { signal: AbortSignal.timeout(8000) }); if (r.ok) { const d = await r.json(); title = d.title; author = d.author_name; thumb = d.thumbnail_url; } }
  if (!title && /tiktok/.test(host)) { const h = (u.pathname.match(/@([\w.]+)/) || [])[1]; title = h ? `TikTok video by @${h}` : "TikTok video"; author ||= h; summary = "Caption not provided by TikTok oEmbed for this video."; }
  else {
    const r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "CiviLinkPreview/1.0 (+civi beta)", accept: "text/html" } });
    if (!(r.headers.get("content-type") || "").includes("html")) throw Object.assign(new Error("not_html"), { status: 400 });
    const reader = r.body.getReader(); let html = "", n = 0; while (n < 262144) { const { done, value } = await reader.read(); if (done) break; n += value.length; html += new TextDecoder().decode(value); } reader.cancel();
    title = meta(html, "og:title") || (html.match(/<title[^>]*>([^<]{1,300})/i) || [])[1]; summary = meta(html, "og:description") || meta(html, "description"); thumb = meta(html, "og:image");
  }
  return { title: unent(title?.trim()) || `Link from ${host}`, summary: unent(summary)?.slice(0, 300) || "", thumb, author, host };
}
export async function onRequestPost({ request, env }) {
  if (!configured(env)) return notConfigured();
  if (!sameOrigin(request)) return json({ error: "bad_origin" }, 403);
  const me = await currentUser(request, env); if (!me) return json({ error: "login_required" }, 401);
  let u; try { u = new URL((await request.json()).url); } catch { return json({ error: "bad_url" }, 400); }
  if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname) || u.port && !["80", "443"].includes(u.port)) return json({ error: "bad_url" }, 400);
  try {
    const m = await readMeta(u); const txt = `${m.title} ${m.summary}`; const g = await geotag(env, request, txt);
    const row = { url: u.toString(), title: m.title.slice(0, 300), summary: m.summary, thumb_url: m.thumb, author: m.author, host: m.host, cat: categorize(txt),
      place: g?.n || "Philippines (national)", lat: g?.ll[0] ?? null, lon: g?.ll[1] ?? null, psgc: g?.psgc || null };
    const out = await sb(env, "rpc/share_link", { method: "POST", body: { p: row }, token: me.token }); // RPC enforces rate limit + user_id = auth.uid()
    return json({ item: { kind: "user", title: row.title, url: row.url, source: row.host, stype: "User-submitted", cat: row.cat, time: new Date().toISOString(), place: row.place, ll: g?.ll || null, geo: g ? "psgc-match" : "national", summary: row.summary, id: out } });
  } catch (e) { return fail(e); }
}

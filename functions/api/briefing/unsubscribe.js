// One-click email unsubscribe (no login needed). Linked in every briefing email footer and in the List-Unsubscribe header (RFC 8058).
// GET shows a confirm page (link scanners must not unsubscribe people); POST performs it. Only turns OFF email; in-app stays.
import { configured, sb } from "../../_lib.js";
const page = (msg) => new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Civi · Unsubscribe</title>
<body style="font-family:system-ui,sans-serif;background:#05080f;color:#e6f1ff;display:grid;place-items:center;min-height:100vh;margin:0"><div style="max-width:420px;padding:24px;text-align:center">
<h2>◉ Civi Daily Briefing</h2>${msg}<p style="font-size:12px;color:#8ea3bf">Manage all settings anytime at <a style="color:#38e1ff" href="/#/briefing/settings">Briefing settings</a>. Privacy: <a style="color:#38e1ff" href="mailto:privacy@chainnes.com">privacy@chainnes.com</a></p></div></body>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const tok = req => (new URL(req.url).searchParams.get("t") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
export const onRequestGet = ({ request }) => { const t = tok(request);
  return page(`<p>Stop receiving the Civi briefing by email?</p><form method="post" action="?t=${t}"><button style="background:#38e1ff;border:0;border-radius:10px;padding:10px 18px;font-weight:700">Unsubscribe</button></form>`); };
export async function onRequestPost({ request, env }) {
  const t = tok(request); if (!configured(env) || t.length < 32) return page("<p>That link is not valid. Turn email off in Briefing settings instead.</p>");
  try { const ok = await sb(env, "rpc/briefing_unsubscribe", { method: "POST", body: { p_token: t } });
    return page(ok ? "<p>✅ Done. You won't get briefing emails anymore. Your in-app briefing is unchanged.</p>" : "<p>That link has expired or is invalid. Turn email off in Briefing settings.</p>");
  } catch { return page("<p>Something went wrong. Please try again or turn email off in Briefing settings.</p>"); }
}

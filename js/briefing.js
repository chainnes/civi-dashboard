/* Civi Daily Briefing: personalized updates from EXISTING sourced Civi items only (news, laws, map pins, events, scholarships, petitions you signed).
   Channels: in-app (default), email digest (opt-in, daily/weekly, PHT hour), Web Push (opt-in). Loaded after hub.js + empower.js.
   Demo mode: built in this browser from /data/*.json; prefs saved in localStorage only. */
const BTOPICS = [["governance", "🏛️", "Government", ["Government"]], ["disaster", "🌀", "Disaster & weather", ["Disaster & Weather"]], ["economy", "💹", "Economy & jobs", ["Economy & Jobs"]],
  ["health", "🩺", "Health", ["Health"]], ["education", "📚", "Education", ["Education"]], ["environment", "🌿", "Environment", ["Environment"]], ["security", "🛡️", "Security & WPS", ["Security"]],
  ["events", "📅", "Community events", ["Community Events"]], ["laws", "⚖️", "New laws", ["Laws & Policy"]], ["scholarships", "🎓", "Scholarships", []], ["petitions", "✊", "Petitions & Sumbong you follow", []]];
const ISLAND = r => /NCR|Ilocos|Cagayan Valley|Central Luzon|CALABARZON|MIMAROPA|Bicol|CAR/i.test(r) ? "luzon" : /Visayas/i.test(r) ? "visayas" : r ? "mindanao" : "";
const BDEF = { topics: ["governance", "disaster", "laws"], place_psgc: "", place_name: "", areas: [], in_app: true, email_on: false, email_freq: "daily", email_hour: 7, email_dow: 1, push_on: false };
const bLocal = { get: () => ({ ...BDEF, ...JSON.parse(localStorage.getItem("civi.briefing.prefs") || "{}") }), set: p => localStorage.setItem("civi.briefing.prefs", JSON.stringify(p)) };
const srcColor = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 70% 45%)`; };
const srcBadge = s => `<span class="src-logo" style="background:${srcColor(s)}" aria-hidden="true">${esc(String(s).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "◉")}</span>`;
const phtDate = (d = new Date()) => d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

async function bState() {
  if (state.demo || !state.user) return { demo: true, prefs: bLocal.get(), items: null };
  const r = await api("briefing"); if (r.demo || r.error) return { demo: true, prefs: bLocal.get(), items: null };
  return { demo: false, prefs: { ...BDEF, ...(r.prefs || {}) }, items: r.items, vapid: r.vapid_public_key };
}
// Demo/offline builder: same rules as briefing_build in supabase/migrations/20261029105518_briefing.sql, from bundled JSON. No invented text: titles, summaries and links are copied from the source item.
async function buildDemoBriefing(p) {
  const [m, laws, sch] = await Promise.all([data("map_items"), data("law_refs").catch(() => ({ items: [] })), data("scholarships").catch(() => ({ items: [] }))]);
  const local = it => p.areas.some(a => a && (it.title + " " + (it.place || "") + " " + (it.summary || "")).toLowerCase().includes(a));
  const ts = it => +new Date(it.time) || 0, out = [];
  for (const [k, , , cats] of BTOPICS) {
    if (!p.topics.includes(k) || !cats.length) continue;
    m.items.filter(i => cats.includes(i.cat) && /^https:\/\//.test(i.url || "")).map(i => ({ i, s: (local(i) ? 3 : 0) + (i.kind === "news" ? 1 : 0) + ts(i) / 1e13 }))
      .sort((a, b) => b.s - a.s).slice(0, k === "disaster" ? 2 : 3)
      .forEach(({ i, s }) => out.push({ kind: i.kind === "event" ? "event" : "news", topic: k, title: deEnt(i.title), source: i.source, url: i.url, summary: deEnt(i.summary || ""), summary_is_ai: false, local: local(i), rank: s }));
  }
  if (p.topics.includes("laws")) laws.items.filter(l => /^https:\/\//.test(l.url || "")).slice(0, 2).forEach(l => out.push({ kind: "law", topic: "laws", title: `${l.number ? l.number + ": " : ""}${l.title}`, source: l.source, url: l.url, summary: l.date ? "Approved " + l.date : "", rank: 1.1 }));
  if (p.topics.includes("scholarships")) sch.items.filter(s => (p.areas.length ? s.scope === "Local" : true)).slice(0, 2).forEach(s => out.push({ kind: "scholarship", topic: "scholarships", title: s.name, source: s.provider, url: s.url, summary: `Deadline: ${s.deadline}`, rank: 1 }));
  if (p.topics.includes("petitions")) { const mine = new Set(demoStore.get("emp_mine_petitions")); demoStore.get("emp_petitions").filter(x => mine.has(x.id)).slice(0, 2)
    .forEach(x => out.push({ kind: "petition_update", topic: "petitions", title: "You signed: " + x.title, source: "Civi Petitions (demo)", url: location.origin + "/#/petitions", summary: `${(x.signers || []).length} signatures so far`, rank: 2 })); }
  const seen = new Set(); return out.filter(i => !seen.has(i.url) && seen.add(i.url)).sort((a, b) => b.rank - a.rank).slice(0, 10);
}
const ENT = { "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&#8217;": "’", "&#8216;": "‘", "&#8220;": "“", "&#8221;": "”", "&hellip;": "…", "&nbsp;": " ", "&ndash;": "–", "&mdash;": "—" };
const deEnt = s => String(s ?? "").replace(/&(?:[a-z]+|#\d+);/g, m => ENT[m] ?? m);  // source feeds sometimes ship HTML entities; decode, then escape on output
const tLabel = k => (BTOPICS.find(x => x[0] === k) || [k, "•", k])[2];
const itemHTML = (it, n) => `<li class="bi glass"><span class="bn">${n}</span><div style="flex:1;min-width:0">
  <div class="row" style="gap:6px">${srcBadge(it.source)}<b class="bsrc">${esc(it.source)}</b><span class="chip">${esc(tLabel(it.topic))}</span>${it.local ? `<span class="chip ok">📍 near you</span>` : ""}</div>
  <a class="bt" href="${esc(it.url)}" target="_blank" rel="noopener" onclick="briefingRead(${it.id || 0})">${esc(it.title)}</a>
  ${it.summary ? `<p class="bsum">${esc(it.summary)}${it.summary_is_ai ? ` <span class="chip warn">🤖 machine-generated summary</span>` : ""}</p>` : ""}
  <a class="bsrc-l" href="${esc(it.url)}" target="_blank" rel="noopener">Read at source ↗</a></div></li>`;
function briefingRead(id) { if (id && !state.demo) api("briefing", { method: "POST", body: { action: "read", id } }); }

async function viewBriefing() {
  const S = await bState(), p = S.prefs; let items = S.items;
  if (!items || !items.length) items = await buildDemoBriefing(p);
  const scope = p.place_name ? `${p.place_name} + national` : "Philippines (national)";
  page(`<div class="row spread"><h1 style="margin:0">📰 Your Civi Briefing</h1><a class="btn ghost sm" href="#/briefing/settings">⚙️ Settings</a></div>
   <p class="sub">${phtDate()} · ${esc(scope)} · ${p.topics.map(tLabel).map(esc).join(", ")}</p>
   ${S.demo ? `<div class="disc">Demo: built in this browser from Civi's bundled public data. ${state.user ? "" : "Log in to save settings to your account and get email or push updates."}</div>` : ""}
   <div class="disc">ⓘ Every story links to its original source. Civi ranks items by your topics and location; it doesn't write news. AI summaries, if any, are labeled machine-generated.</div>
   <h3 style="margin:14px 0 6px">Top stories</h3><ol class="blist">${items.map((it, i) => itemHTML(it, i + 1)).join("") || `<p>${t("empty")} Try adding topics in Settings.</p>`}</ol>
   <div class="row" style="margin-top:12px"><a class="btn" href="#/briefing/settings">Get this by email or push</a><a class="btn ghost" href="#/briefing/email">👁 Email preview</a></div>`);
}

async function viewBriefingSettings() {
  const S = await bState(), p = S.prefs, gz = await data("gazetteer");
  const places = Object.entries(gz).filter(([, v]) => v.psgc).sort((a, b) => (a[1].region + a[1].n).localeCompare(b[1].region + b[1].n));
  const loggedOut = !state.user;
  page(`<a href="#/briefing">← Briefing</a><h1>⚙️ Briefing settings</h1><p class="sub">Choose what you want to hear about and how. Change or turn off anytime.</p>
   ${S.demo ? `<div class="disc">Demo: settings are saved only in this browser. Email and push need the live Civi backend and a logged-in account.</div>` : ""}
   <form id="bf" class="card glass" style="display:block">
    <h4>1 · Topics</h4><div class="filters" id="btop">${BTOPICS.map(([k, ic, l]) => `<label class="tpick"><input type="checkbox" name="topics" value="${k}" ${p.topics.includes(k) ? "checked" : ""}> ${ic} ${esc(l)}</label>`).join("")}</div>
    <h4>2 · Location (PSGC)</h4><select name="place" style="width:100%"><option value="">Whole Philippines (national only)</option>
     ${places.map(([k, v]) => `<option value="${k}" ${v.psgc === p.place_psgc ? "selected" : ""}>${esc(v.n)} · ${esc(v.region)} (${v.lvl})</option>`).join("")}</select>
     <p style="font-size:11px;color:var(--mute)">Province/city from PSA's PSGC list. Stories mentioning your place or region are ranked first. Location is optional and stays private.</p>
    <h4>3 · How to get it</h4>
     <label class="row"><input type="checkbox" name="in_app" checked disabled style="width:auto"> 📰 In-app briefing (always on, default)</label>
     <label class="row"><input type="checkbox" name="email_on" ${p.email_on ? "checked" : ""} style="width:auto"> ✉️ Email digest</label>
     <div id="emailOpts" class="${p.email_on ? "" : "hidden"}" style="padding-left:22px">
      <div class="row"><select name="email_freq"><option value="daily" ${p.email_freq === "daily" ? "selected" : ""}>Daily</option><option value="weekly" ${p.email_freq === "weekly" ? "selected" : ""}>Weekly</option></select>
      <select name="email_dow" class="${p.email_freq === "weekly" ? "" : "hidden"}">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => `<option value="${i}" ${+p.email_dow === i ? "selected" : ""}>${d}</option>`).join("")}</select>
      <select name="email_hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${+p.email_hour === h ? "selected" : ""}>${String(h).padStart(2, "0")}:00 PHT</option>`).join("")}</select></div>
      <label class="row consent"><input type="checkbox" name="email_consent" ${p.email_on ? "checked" : ""} style="width:auto"> <span>I agree to receive the Civi Briefing at my account email. Civi uses only my email and these settings to send it, through its email provider. Every email has a one-click unsubscribe. <a href="#/privacy">Privacy</a></span></label></div>
     <label class="row"><input type="checkbox" name="push_on" ${p.push_on ? "checked" : ""} style="width:auto"> 🔔 Push notifications (this device)</label>
     <div id="pushOpts" class="${p.push_on ? "" : "hidden"}" style="padding-left:22px"><label class="row consent"><input type="checkbox" name="push_consent" ${p.push_on ? "checked" : ""} style="width:auto"> <span>I agree to push notifications on this device. Civi stores this device's push address (not your location or contacts) and deletes it when I turn push off.</span></label></div>
    <div class="disc" style="margin-top:10px">🔒 <b>Data privacy (RA 10173):</b> Email and push are off unless you turn them on and tick consent. We store your topics, chosen place, channels, schedule and consent time, only to build your briefing. We never sell or share it. Turn anything off here anytime, or email <a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a> to access or delete your data. In-app items are kept 30 days.</div>
    <div class="row" style="margin-top:10px"><button class="btn">Save settings</button><a class="btn ghost" href="#/briefing/email">👁 Preview email</a></div>
   </form>`);
  const f = $("#bf");
  f.email_on.onchange = () => $("#emailOpts").classList.toggle("hidden", !f.email_on.checked);
  f.push_on.onchange = () => $("#pushOpts").classList.toggle("hidden", !f.push_on.checked);
  f.email_freq.onchange = () => f.email_dow.classList.toggle("hidden", f.email_freq.value !== "weekly");
  f.onsubmit = async e => { e.preventDefault();
    const g = gz[f.place.value], topics = $$("input[name=topics]:checked", f).map(x => x.value);
    if (!topics.length) return toast("Pick at least one topic");
    if (f.email_on.checked && !f.email_consent.checked) return toast("Tick the email consent box to turn on email");
    if (f.push_on.checked && !f.push_consent.checked) return toast("Tick the push consent box to turn on push");
    if ((f.email_on.checked || f.push_on.checked) && (loggedOut || S.demo)) { toast(loggedOut ? "Log in first to turn on email or push" : "Email and push need the live backend (demo saves in-app only)"); f.email_on.checked = f.push_on.checked = false; }
    const np = { topics, place_psgc: g ? g.psgc : "", place_name: g ? g.n : "", areas: g ? [...new Set([f.place.value, g.n.toLowerCase().replace(/^city of /, ""), g.region.toLowerCase(), ISLAND(g.region)])].filter(Boolean) : [],
      in_app: true, email_on: f.email_on.checked, email_consent: f.email_consent.checked, email_freq: f.email_freq.value, email_hour: +f.email_hour.value, email_dow: +f.email_dow.value,
      push_on: f.push_on.checked, push_consent: f.push_consent.checked };
    if (S.demo) { bLocal.set(np); toast("Saved on this device"); return (location.hash = "#/briefing"); }
    const r = await api("briefing", { method: "POST", body: { action: "prefs", ...np } }); if (r.error) return toast("Could not save: " + r.error);
    if (np.push_on) await subscribePush(S.vapid); else unsubscribePush();
    toast("Saved"); location.hash = "#/briefing";
  };
}
const b64u = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function subscribePush(vapid) {
  if (!("PushManager" in window) || !vapid) return toast("Push isn't available on this browser/server yet");
  if (await Notification.requestPermission() !== "granted") return toast("Push permission was not granted");
  const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(vapid) });
  await api("briefing", { method: "POST", body: { action: "push_sub", sub: sub.toJSON() } });
}
async function unsubscribePush() { try { const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription(); if (s) { await api("briefing", { method: "POST", body: { action: "push_unsub", endpoint: s.endpoint } }); await s.unsubscribe(); } } catch {} }

// Same renderer is pasted into the n8n "Render email" node. Escapes everything; links must be https.
function briefingEmailHTML(tpl, items, o) {
  const D = { "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&#8217;": "’", "&hellip;": "…", "&nbsp;": " " };
  const e = s => String(s ?? "").replace(/&(?:[a-z]+|#\d+);/g, m => D[m] ?? m).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const col = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h},70%,40%)`; };
  const rows = items.filter(i => /^https:\/\//.test(i.url)).map((i, n) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3e9f1"><tr>
    <td valign="top" style="width:28px;padding:14px 0;font-size:18px;font-weight:bold;color:#0b6fa4">${n + 1}</td><td style="padding:14px 0">
    <span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:9px;background:${col(i.source)};color:#fff;font-size:9px;font-weight:bold;text-align:center;vertical-align:middle">${e(String(i.source).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase())}</span>
    <span style="font-size:12px;color:#51627a;vertical-align:middle">&nbsp;${e(i.source)}</span>
    <div style="margin-top:6px"><a href="${e(i.url)}" style="color:#0b1626;font-size:16px;font-weight:bold;text-decoration:none;line-height:1.35">${e(i.title)}</a></div>
    ${i.summary ? `<div style="font-size:13px;color:#51627a;margin-top:4px;line-height:1.45">${e(i.summary).slice(0, 260)}${i.summary_is_ai ? ' <i style="color:#a05a00">(machine-generated summary)</i>' : ""}</div>` : ""}
    <div style="margin-top:6px"><a href="${e(i.url)}" style="font-size:12px;color:#0b6fa4">Read at source &rarr;</a></div></td></tr></table>`).join("");
  const map = { PREHEADER: `${items.length} stories for ${o.scope}`, DATE: o.date, SCOPE: o.scope, ITEMS: rows, SITE: o.site, UNSUB_URL: o.unsub, SETTINGS_URL: o.site + "/#/briefing/settings" };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => k === "ITEMS" ? map.ITEMS : e(map[k] ?? ""));
}
async function viewBriefingEmail() {
  const S = await bState(), p = S.prefs, items = (S.items && S.items.length ? S.items : await buildDemoBriefing(p)).slice(0, 8);
  const tpl = await fetch("/email/briefing.html").then(r => r.text());
  const html = briefingEmailHTML(tpl, items, { date: phtDate(), scope: p.place_name ? `${p.place_name} + national` : "Philippines", site: location.origin, unsub: location.origin + "/api/briefing/unsubscribe?t=PREVIEW-TOKEN-NOT-REAL-000000000000" });
  page(`<a href="#/briefing/settings">← Settings</a><h1>👁 Email preview</h1><p class="sub">What the ${esc(p.email_freq)} email looks like with your current settings. This is a preview: nothing is sent.</p>
   <iframe id="bprev" title="Email preview" sandbox="" style="width:100%;height:1500px;border:0;border-radius:12px;background:#eef2f7"></iframe>`);
  $("#bprev").srcdoc = html;
}
Object.assign(ROUTES, { briefing: viewBriefing, "briefing/settings": viewBriefingSettings, "briefing/email": viewBriefingEmail });
{ const _r = route; route = function () { _r(); if ((location.hash.replace("#/", "") || "").startsWith("briefing")) $$("#dock a").forEach(a => a.classList.remove("on")); $("#briefBtn")?.classList.toggle("on", location.hash.startsWith("#/briefing")); }; }

/* Civi Empower hub (Kapangyarihan ng Bayan): Petitions, Sumbungan ng Bayan, Project Watch, FOI Helper, Know Your Rights, Action Map layer, Impact board.
   Loaded AFTER hub.js (uses its helpers). Civi NEVER sends letters, FOI requests or emails: users send them from their own apps.
   Demo mode keeps everything in this browser's localStorage (labeled). */
const SUMBONG_CATS = ["Flood control", "Roads & bridges", "Land & IP rights", "Utilities (water/power)", "Environment", "Public services", "Other public project"];
const SCOL = { "Flood control": "#38e1ff", "Roads & bridges": "#ffc24b", "Land & IP rights": "#9dff6a", "Utilities (water/power)": "#b48cff", "Environment": "#36f1b8", "Public services": "#ff8fb1", "Other public project": "#9aa8bb" };
const RSTAT = ["Reported", "Escalated", "Agency responded", "Resolved"];
const qs = () => new URLSearchParams(location.hash.split("?")[1] || "");
const httpsList = s => String(s || "").split(/[\s,]+/).map(x => x.trim()).filter(x => /^https:\/\/\S+$/.test(x)).slice(0, 8);
const LINK_NOTE = "Official links checked Oct 29, 2026. Some agency sites block automated checks, so open them in your browser.";
const ESCALATE = [
  ["Office of the Ombudsman", "https://www.ombudsman.gov.ph/", "Graft, corruption, abuse by public officials or employees (complaints vs. officials go here, not on Civi)."],
  ["Commission on Audit (COA)", "https://www.coa.gov.ph/", "Misuse of public funds; audit reports of agencies and LGUs."],
  ["8888 Citizens' Complaint Center", "https://8888.gov.ph/", "Red tape, slow or poor government service; hotline 8888."],
  ["Commission on Human Rights (CHR)", "https://chr.gov.ph/", "Human rights violations, including during assemblies, demolitions, or by state forces."],
  ["NCIP (Indigenous Peoples)", "https://ncip.gov.ph/", "Ancestral domain, FPIC and IP rights (e.g., Aeta communities) under IPRA, RA 8371."],
  ["DENR", "https://www.denr.gov.ph/", "Illegal logging, mining, quarrying, reclamation, pollution, protected areas."],
  ["DPWH", "https://www.dpwh.gov.ph/", "National roads, bridges and flood control projects: status, defects, delays."],
  ["Your LGU (city/municipal hall, barangay)", "https://www.dilg.gov.ph/", "Local roads, drainage, garbage, permits. Find your LGU via DILG."],
  ["Public Attorney's Office (PAO)", "https://pao.gov.ph/", "Free legal help for qualified indigent clients."]];
const RIGHTS = [
  { k: "assembly", ic: "📣", h: "Peaceful assembly", law: [["1987 Constitution, Art. III Sec. 4", "https://lawphil.net/consti/cons1987.html"], ["BP 880 (Public Assembly Act of 1985)", "https://lawphil.net/statutes/bataspam/bp1985/bp_880_1985.html"]],
    pts: ["You have the right to peaceably assemble and petition the government for redress of grievances.", "Under BP 880, rallies in public places generally need a permit from the mayor; freedom parks and private property (with owner consent) and campuses (with school approval) do not.", "The mayor must act on a permit application within two working days or it is deemed granted.", "Police must keep a distance, wear name tags, and use maximum tolerance."] },
  { k: "ipra", ic: "🌾", h: "Indigenous peoples, land and FPIC", law: [["RA 8371 (Indigenous Peoples' Rights Act, IPRA)", "https://lawphil.net/statutes/repacts/ra1997/ra_8371_1997.html"]],
    pts: ["IPRA recognizes indigenous cultural communities' rights to their ancestral domains and lands.", "Projects in ancestral domains need the community's Free and Prior Informed Consent (FPIC), certified through NCIP.", "Complaints about ancestral domain or FPIC go to NCIP. Human rights concerns can also go to CHR."] },
  { k: "consumer", ic: "🛒", h: "Consumer rights", law: [["RA 7394 (Consumer Act of the Philippines)", "https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html"]],
    pts: ["You are protected against hazardous products and deceptive, unfair or unconscionable sales acts.", "Products must carry correct labels and prices.", "Complaints: DTI for most goods, FDA for food and drugs, ERC for power, and other agencies depending on the product."] },
  { k: "labor", ic: "🛠️", h: "Work and labor basics", law: [["PD 442 (Labor Code of the Philippines)", "https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html"]],
    pts: ["Workers are entitled to at least the regional minimum wage, set by regional wage boards.", "Normal hours are 8 a day; overtime, holiday and night-shift work carry premium pay.", "You can only be dismissed for just or authorized causes and with due process.", "You can bring disputes to DOLE (SEnA, its mediation desk) or the NLRC."] },
  { k: "privacy", ic: "🔒", h: "Data privacy", law: [["RA 10173 (Data Privacy Act of 2012)", "https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html"], ["National Privacy Commission", "https://privacy.gov.ph/data-privacy-act/"]],
    pts: ["You have the right to be informed, to access, correct, object to processing, and request erasure of your personal data.", "Organizations need a lawful basis, often consent, to process your data.", "Complaints go to the National Privacy Commission (NPC)."] },
  { k: "foi", ic: "📂", h: "Freedom of Information (Executive Order No. 2, s. 2016)", law: [["EO No. 2, s. 2016 (FOI in the Executive Branch)", "https://lawphil.net/executive/execord/eo2016/eo_2_2016.html"], ["1987 Constitution, Art. III Sec. 7", "https://lawphil.net/consti/cons1987.html"], ["eFOI portal", "https://www.foi.gov.ph/"]],
    pts: ["You can request information from executive-branch agencies, subject to listed exceptions.", "Agencies must respond within 15 working days, which can be extended in some cases.", "Requests are free, though copying costs may be charged. Use the FOI Helper to draft one."] },
  { k: "cyber", ic: "⚠️", h: "Posting online: cyberlibel", law: [["RA 10175 (Cybercrime Prevention Act of 2012)", "https://lawphil.net/statutes/repacts/ra2012/ra_10175_2012.html"]],
    pts: ["Libel committed online is punishable under RA 10175, with a heavier penalty than ordinary libel.", "Stick to verifiable facts, cite your sources, report issues rather than accuse people, and leave accusations against officials to the proper bodies (e.g., Ombudsman)."] }];
const notLegal = `<div class="disc">⚖️ <b>${t("not_legal")}</b> ${t("rights_disc")}</div>`;
const shareBtn = (title, path) => `<button class="btn ghost sm" onclick="empShare(${esc(JSON.stringify(title))},'${path}')">🔗 ${t("share")}</button>`;
function empShare(title, path) { const url = location.origin + "/" + path; if (navigator.share) navigator.share({ title, url }).catch(() => {}); else navigator.clipboard.writeText(url).then(() => toast(t("copied"))); }
const demoBadge = () => state.demo ? `<span class="chip warn">DEMO · saved on this device only</span>` : "";

/* ---------- data access (server or demo) ---------- */
const SAMPLE_PETITION = { id: "sample-1", sample: true, title: "SAMPLE: Publish flood control project data in an open, downloadable format", target: "Department of Public Works and Highways (DPWH)", cat: "Government",
  ask: "We ask DPWH to publish, as a downloadable spreadsheet, every flood control project with its location, approved budget, contractor, start and completion dates and status, updated monthly.",
  sources: ["https://www.dpwh.gov.ph/dpwh/gis/project_monitoring", "https://lawphil.net/executive/execord/eo2016/eo_2_2016.html"], goal: 100, handle: "civi_sample", created_at: "2026-10-29T01:00:00Z", signatures: 0, updates: [] };
async function empGet(kind) {
  const r = await api("empower?kind=" + kind);
  if (!r.demo && !r.error) return r;
  const items = demoStore.get("emp_" + kind), mine = demoStore.get("emp_mine_" + kind);
  if (kind === "petitions") { items.forEach(p => p.signatures = (p.signers || []).length); return { items: [...items, SAMPLE_PETITION], mine }; }
  if (kind === "reports") { items.forEach(p => p.metoo = (p.metoo_by || []).length); return { items, mine }; }
  if (kind === "impact") { const p = (await empGet("petitions")).items.filter(x => !x.sample && x.signatures >= x.goal).map(x => ({ kind: "petition", id: x.id, title: x.title, n: x.signatures, created_at: x.created_at }));
    const rr = (await empGet("reports")).items.filter(x => x.status === "Resolved").map(x => ({ kind: "report", id: x.id, title: x.title, n: x.metoo, created_at: x.created_at })); return { items: [...p, ...rr] }; }
  return { items, mine };
}
async function empPost(body) {
  if (needLogin()) return { error: "login" };
  if (!state.demo) { const r = await api("empower", { method: "POST", body }); if (r.error) toast(r.error === "rate_limited" ? t("rate_limited") : "Failed: " + r.error); return r; }
  const L = k => demoStore.get("emp_" + k), S = (k, v) => demoStore.set("emp_" + k, v), me = state.user.handle, now = new Date().toISOString();
  const tog = (k, id) => { const m = new Set(demoStore.get("emp_mine_" + k)); m.has(id) ? m.delete(id) : m.add(id); demoStore.set("emp_mine_" + k, [...m]); return m.has(id); };
  switch (body.action) {
    case "petition_create": { const id = "d" + Date.now(); S("petitions", [{ id, title: body.title, ask: body.ask, target: body.target, cat: body.cat, sources: body.sources, goal: body.goal, handle: me, created_at: now, signers: [], updates: [], mineOwner: true }, ...L("petitions")]); return { id }; }
    case "petition_sign": case "petition_unsign": { const a = L("petitions"); const p = a.find(x => x.id === body.id); if (!p) return { error: "sample" }; const on = tog("petitions", body.id); p.signers = on ? [...new Set([...(p.signers || []), me])] : (p.signers || []).filter(x => x !== me); S("petitions", a); return { ok: true }; }
    case "petition_update": { const a = L("petitions"); const p = a.find(x => x.id === body.id); p.updates = [{ body: body.body, at: now }, ...(p.updates || [])]; S("petitions", a); return { ok: true }; }
    case "report_create": { const id = "r" + Date.now(); S("reports", [{ id, title: body.title, body: body.body, cat: body.cat, place: body.place, lat: body.lat, lng: body.lng, evidence: body.evidence, photo_data: body.photo_b64 ? "data:image/jpeg;base64," + body.photo_b64 : null, project_id: body.project_id, status: "Reported", handle: me, created_at: now, metoo_by: [], owner: me }, ...L("reports")]); return { id }; }
    case "report_metoo": { const a = L("reports"); const p = a.find(x => x.id === body.id); const on = tog("reports", body.id); p.metoo_by = on ? [...(p.metoo_by || []), me] : (p.metoo_by || []).filter(x => x !== me); S("reports", a); return { on }; }
    case "report_status": { const a = L("reports"); const p = a.find(x => x.id === body.id); if (p.owner !== me) return { error: "not owner" }; p.status = body.status; S("reports", a); return { ok: true }; }
    case "report_flag": case "petition_report": { const k = body.action === "report_flag" ? "reports" : "petitions"; const a = L(k); const p = a.find(x => x.id === body.id); if (p) { p.flags = (p.flags || 0) + 1; if (p.flags >= 3) p.hidden = true; S(k, a); } return { ok: true }; }
    case "project_update": { S("project_updates", [{ id: Date.now(), project_id: body.project_id, body: body.body, report_id: body.report_id, handle: me, created_at: now }, ...L("project_updates")]); return { ok: true }; }
    case "event_create": { S("events", [{ id: "e" + Date.now(), ...body, handle: me }, ...L("events")]); return { ok: true }; }
    case "foi_save": { const a = L("foi"); if (body.id) { const i = a.findIndex(x => x.id === body.id); a[i] = { ...a[i], ...body }; } else a.unshift({ ...body, id: "f" + Date.now(), created_at: now }); S("foi", a); return { ok: true }; }
    case "foi_delete": S("foi", L("foi").filter(x => x.id !== body.id)); return { ok: true };
  }
}

/* ---------- Hub ---------- */
async function viewEmpower() {
  const [P, R, I] = await Promise.all([empGet("petitions"), empGet("reports"), empGet("impact")]);
  const tile = (h, ic, title, sub, n) => `<a class="card glass emp-tile" href="#/${h}"><div class="emp-ic">${ic}</div><h4>${title}</h4><p>${sub}</p>${n != null ? `<span class="chip">${n}</span>` : ""}</a>`;
  page(`<span class="chip ok">Beta</span> ${demoBadge()}<h1 style="margin:6px 0">✊ ${t("emp_title")}</h1><p class="sub">${t("emp_sub")}</p>
  <div class="emp-grid">
   ${tile("petitions", "📝", t("petitions"), t("petitions_sub"), `${P.items.filter(p => !p.sample && !p.hidden).length} live`)}
   ${tile("sumbong", "📢", t("sumbong"), t("sumbong_sub"), `${R.items.filter(r => !r.hidden).length} reports`)}
   ${tile("projects", "🏗️", t("projects"), t("projects_sub"), null)}
   ${tile("foi", "📂", t("foi"), t("foi_sub"), null)}
   ${tile("rights", "⚖️", t("rights"), t("rights_sub"), null)}
   ${tile("map?layer=action", "🗺️", t("action_map"), t("action_map_sub"), null)}
   ${tile("impact", "🏆", t("impact"), t("impact_sub"), `${I.items.length} wins`)}
  </div>
  <h2>🧭 ${t("escalate")}</h2>${escalateList()}
  <div class="disc">🤝 ${t("emp_neutral")} ${t("emp_never_send")}</div>`);
}
const escalateList = () => `<div class="grid">${ESCALATE.map(([n, u, d]) => `<div class="card glass"><h4><a href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a></h4><p>${esc(d)}</p></div>`).join("")}</div><p style="font-size:11px;color:var(--mute)">${LINK_NOTE}</p>`;

/* ---------- Petitions ---------- */
const bar = (n, g) => `<div class="pbar"><i style="width:${Math.min(100, (n / g) * 100).toFixed(1)}%"></i></div><div class="row spread" style="font-size:12px"><b>${n.toLocaleString()} ${t("signed")}</b><span>${t("goal")}: ${g.toLocaleString()}</span></div>`;
async function viewPetitions() {
  const id = qs().get("id"); const P = await empGet("petitions"); const list = P.items.filter(p => !p.hidden);
  if (id) return viewPetition(list.find(p => p.id === id), P.mine);
  page(`<a href="#/empower">← ${t("emp_title")}</a><div class="row spread"><h1>📝 ${t("petitions")}</h1><button class="btn" id="newPet">＋ ${t("start_petition")}</button></div>${demoBadge()}
   <p class="sub">${t("petitions_sub")}</p><div class="disc">🔒 ${t("pet_privacy")}</div>
   <div class="grid">${list.map(p => `<a class="card glass" href="#/petitions?id=${esc(p.id)}" style="text-decoration:none;color:inherit">${favBtn("petition", p.id, p.title, "#/petitions?id=" + p.id)}${p.sample ? `<span class="chip warn">SAMPLE · not a real petition</span>` : `<span class="chip">${esc(p.cat)}</span>`}
     <h4>${esc(p.title)}</h4><p>🎯 ${esc(p.target)}</p>${bar(p.signatures, p.goal)}</a>`).join("") || `<p>${t("empty")}</p>`}</div>`);
  $("#newPet").onclick = petitionForm;
}
function petitionForm() {
  if (needLogin()) return;
  openModal(`<h2>${t("start_petition")}</h2><form id="pf" class="stack">
   <label>${t("pf_title")}<input name="title" required minlength="10" maxlength="140" placeholder="e.g. Publish the full list of flood control projects in our province"></label>
   <label>${t("pf_ask")}<textarea name="ask" required minlength="20" maxlength="1500" placeholder="What exactly should be done, by whom, by when?"></textarea></label>
   <label>${t("pf_target")}<input name="target" required maxlength="160" placeholder="e.g. DPWH Regional Office III / City Mayor's Office"></label>
   <label>${t("category")}<select name="cat">${Object.keys(CAT).map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
   <label>${t("pf_sources")}<textarea name="sources" required placeholder="https://lawphil.net/...  https://news-site/..."></textarea></label>
   <label>${t("goal")}<input name="goal" type="number" min="10" max="1000000" value="500"></label>
   <div class="disc">${t("rules_short")}</div><label class="row" style="font-size:12px"><input type="checkbox" name="ack" required style="width:auto"> ${t("rules_ack")}</label>
   <div class="row"><button class="btn">${t("publish")}</button><button type="button" class="btn ghost" data-close>${t("cancel")}</button></div></form>`);
  $("#pf").onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const sources = httpsList(f.sources);
    if (!sources.length) return toast(t("need_source"));
    const r = await empPost({ action: "petition_create", title: f.title, ask: f.ask, target: f.target, cat: f.cat, sources, goal: +f.goal || 500 });
    if (r && !r.error) { closeModal(); location.hash = "#/petitions?id=" + r.id; } };
}
function viewPetition(p, mine = []) {
  if (!p) return page(`<a href="#/petitions">← ${t("petitions")}</a><p>${t("empty")}</p>`);
  const signed = mine.includes(p.id), reached = p.signatures >= p.goal, own = p.mineOwner || (state.user && p.handle === state.user.handle);
  page(`<a href="#/petitions">← ${t("petitions")}</a>${p.sample ? `<div class="disc">🧪 <b>SAMPLE.</b> ${t("sample_note")}</div>` : ""}
   <div class="pet-wrap"><section class="card glass"><span class="chip">${esc(p.cat)}</span> ${demoBadge()}<h1 style="margin:8px 0">${esc(p.title)}</h1>
   <p><b>🎯 ${t("pf_target")}:</b> ${esc(p.target)}</p><h3>${t("pf_ask")}</h3><p style="white-space:pre-wrap">${esc(p.ask)}</p>
   <h3>${t("pf_sources")}</h3><ul>${(p.sources || []).map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(u)}</a></li>`).join("")}</ul>
   <p style="font-size:11px;color:var(--mute)">${t("by")} @${esc(p.handle)} · ${ago(p.created_at)}</p>
   <h3>${t("updates")}</h3>${(p.updates || []).map(u => `<div class="upd"><small>${ago(u.at)}</small><p>${esc(u.body)}</p></div>`).join("") || `<p class="sub">—</p>`}
   ${own && !p.sample ? `<form id="upf" class="row"><input name="body" maxlength="1500" placeholder="${t("post_update")}" required style="flex:1"><button class="btn sm">${t("post")}</button></form>` : ""}</section>
   <aside class="card glass">${bar(p.signatures, p.goal)}
    ${p.sample ? `<button class="btn" disabled style="width:100%;opacity:.5">${t("sign")}</button>` : `<button class="btn" id="sign" style="width:100%">${signed ? "✓ " + t("signed_you") : "✍️ " + t("sign")}</button>
     <label class="row" style="font-size:11.5px;margin-top:6px"><input type="checkbox" id="showName" style="width:auto"> ${t("show_name")}</label>`}
    <p style="font-size:11px;color:var(--mute)">🔒 ${t("pet_privacy")}</p>
    <div class="row">${shareBtn(p.title, "#/petitions?id=" + p.id)}${p.sample ? "" : `<button class="btn ghost sm" id="repP">🚩 ${t("report")}</button>`}</div>
    <h3>📨 ${t("letter")}</h3><p style="font-size:12px;color:var(--mute)">${reached ? t("letter_ready") : t("letter_locked")}</p>
    <button class="btn ghost sm" id="letter">${t("letter_btn")}</button> <button class="btn ghost sm" id="foiFrom">📂 ${t("foi_draft_btn")}</button></aside></div>`);
  const sg = $("#sign"); if (sg) sg.onclick = async () => { const r = await empPost({ action: signed ? "petition_unsign" : "petition_sign", id: p.id, show_name: $("#showName").checked }); if (r && !r.error) route(); };
  const rp = $("#repP"); if (rp) rp.onclick = async () => { const reason = prompt(t("report_reason")); if (reason == null) return; const r = await empPost({ action: "petition_report", id: p.id, reason }); if (r && !r.error) toast(t("reported")); };
  const uf = $("#upf"); if (uf) uf.onsubmit = async e => { e.preventDefault(); const r = await empPost({ action: "petition_update", id: p.id, body: e.target.body.value }); if (r && !r.error) route(); };
  $("#letter").onclick = () => letterModal(p, reached);
  $("#foiFrom").onclick = () => { sessionStorage.setItem("civi.foi.prefill", JSON.stringify({ agency: p.target, data_requested: "Records related to: " + p.ask })); location.hash = "#/foi"; };
}
function letterModal(p, reached) {
  const today = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const body = `${today}\n\n${p.target}\n\nSubject: Petition: ${p.title}\n\nDear Sir/Madam,\n\nWe, ${p.signatures.toLocaleString()} citizens who signed this petition on Civi (a community platform), respectfully request the following:\n\n${p.ask}\n\nReferences:\n${(p.sources || []).map(u => "- " + u).join("\n")}\n\nPetition page: ${location.origin}/#/petitions?id=${p.id}\n(Signer names are kept private on Civi. The signature count is shown on the page.)\n\nWe would appreciate a written response.\n\nRespectfully,\n[Your full name]\n[Contact details]`;
  openModal(`<h2>📨 ${t("letter")}</h2>${reached ? "" : `<div class="disc">${t("letter_locked")}</div>`}<div class="disc">${t("emp_never_send")} ${t("find_email")}</div>
   <textarea id="ltxt" style="min-height:300px;font-family:inherit">${esc(body)}</textarea>
   <div class="row"><button class="btn" id="lcopy">📋 ${t("copy")}</button><a class="btn ghost" id="lmail" href="mailto:?subject=${encodeURIComponent("Petition: " + p.title)}&body=${encodeURIComponent(body)}">✉️ ${t("open_email")}</a><button class="btn ghost" data-close>${t("close")}</button></div>`);
  $("#lcopy").onclick = () => navigator.clipboard.writeText($("#ltxt").value).then(() => toast(t("copied")));
  $("#ltxt").oninput = e => $("#lmail").href = `mailto:?subject=${encodeURIComponent("Petition: " + p.title)}&body=${encodeURIComponent(e.target.value)}`;
}

/* ---------- Sumbungan ng Bayan ---------- */
let emap;
function killEmap() { if (emap) { emap.remove(); emap = null; } }
async function viewSumbong() {
  const [R, PJ] = await Promise.all([empGet("reports"), data("projects")]); const list = R.items.filter(r => !r.hidden);
  const fcat = qs().get("cat") || "";
  page(`<a href="#/empower">← ${t("emp_title")}</a><div class="row spread"><h1>📢 ${t("sumbong")}</h1><button class="btn" id="newRep">＋ ${t("new_report")}</button></div>${demoBadge()}
   <p class="sub">${t("sumbong_sub")}</p>
   <div class="disc">⚠️ <b>${t("rules_title")}</b><ul style="margin:4px 0 0 16px;padding:0">${["rule1", "rule2", "rule3", "rule4", "rule5"].map(k => `<li>${t(k)}</li>`).join("")}</ul></div>
   <div class="filters" id="sCats"><button class="${!fcat ? "on" : ""}" data-c="">All</button>${SUMBONG_CATS.map(c => `<button style="--c:${SCOL[c]}" class="${fcat === c ? "on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
   <div id="smap" class="smap"></div>
   <div class="grid" id="repList"></div>
   <h2>🧭 ${t("escalate")}</h2>${escalateList()}`);
  $$("#sCats button").forEach(b => b.onclick = () => location.hash = "#/sumbong" + (b.dataset.c ? "?cat=" + encodeURIComponent(b.dataset.c) : ""));
  const shown = list.filter(r => !fcat || r.cat === fcat);
  killEmap(); emap = L.map("smap", { minZoom: 5, maxBounds: [[2, 110], [23, 132]] }).setView([12.3, 122.4], 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { className: "osm-dark", attribution: "© OpenStreetMap contributors", maxZoom: 18 }).addTo(emap);
  shown.filter(r => r.lat != null).forEach(r => L.marker([r.lat, r.lng], { icon: L.divIcon({ className: "", html: `<div class="pin" style="--c:${SCOL[r.cat]}"></div>`, iconSize: [14, 14] }) }).bindPopup(`<b>${esc(r.title)}</b><br>${esc(r.cat)} · ${esc(r.status)} · 🙋 ${r.metoo}`).addTo(emap));
  $("#repList").innerHTML = shown.map(r => repCard(r, R)).join("") || `<div class="card glass"><p>${t("empty_reports")}</p></div>`;
  $$("[data-metoo]").forEach(b => b.onclick = async () => { const r = await empPost({ action: "report_metoo", id: b.dataset.metoo }); if (r && !r.error) route(); });
  $$("[data-flag]").forEach(b => b.onclick = async () => { const reason = prompt(t("report_reason")); if (reason == null) return; const r = await empPost({ action: "report_flag", id: b.dataset.flag, reason }); if (r && !r.error) { toast(t("reported")); route(); } });
  $$("[data-status]").forEach(s => s.onchange = async () => { const r = await empPost({ action: "report_status", id: s.dataset.status, status: s.value }); if (r && !r.error) route(); });
  $("#newRep").onclick = () => reportForm(PJ, qs().get("project"));
  if (qs().get("new")) reportForm(PJ, qs().get("project"));
}
function repCard(r, R) {
  const photo = r.photo_data || (r.photo_path && R.storage ? R.storage + r.photo_path : null), own = (state.user && (r.owner === state.user.handle || r.handle === state.user.handle));
  return `<div class="card glass"><div class="row"><span class="chip" style="border-color:${SCOL[r.cat]};color:${SCOL[r.cat]}">● ${esc(r.cat)}</span><span class="chip ${r.status === "Resolved" ? "ok" : ""}">${esc(r.status)}</span><span class="chip warn">${t("d_user")}</span></div>
   <h4>${esc(r.title)}</h4>${photo ? `<img src="${esc(photo)}" alt="" class="rep-photo">` : ""}<p style="white-space:pre-wrap">${esc(r.body)}</p>
   <p style="font-size:11.5px">📍 ${esc(r.place || "—")}${r.project_id ? ` · 🏗️ <a href="#/projects?id=${esc(r.project_id)}">${t("linked_project")}</a>` : ""}</p>
   <div style="font-size:11.5px">${t("evidence")}: ${(r.evidence || []).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">[${i + 1}]</a>`).join(" ")}</div>
   <div class="row spread" style="margin-top:8px"><button class="btn sm ${(R.mine || []).includes(r.id) ? "" : "ghost"}" data-metoo="${esc(r.id)}">🙋 ${t("metoo")} · ${r.metoo}</button><button class="btn ghost sm" data-flag="${esc(r.id)}">🚩</button></div>
   ${own ? `<label style="font-size:11px">${t("update_status")}<select data-status="${esc(r.id)}">${RSTAT.map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>` : ""}
   <small style="color:var(--mute)">@${esc(r.handle)} · ${ago(r.created_at)}</small></div>`;
}
async function stripExif(file) { // re-encode through a canvas: output JPEG has NO EXIF/GPS metadata; downscale to max 1600px
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", .82); return url.split(",")[1];
}
function reportForm(PJ, projectId) {
  if (needLogin()) return;
  const pj = PJ.items.find(p => p.id === projectId);
  openModal(`<h2>📢 ${t("new_report")}</h2><div class="disc">⚠️ ${t("rule2")} ${t("rule4")}</div><form id="rf" class="stack">
   <label>${t("category")}<select name="cat">${SUMBONG_CATS.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
   <label>${t("rf_title")}<input name="title" required minlength="10" maxlength="140" placeholder="e.g. Unfinished drainage canal along the national road"></label>
   <label>${t("rf_body")}<textarea name="body" required minlength="20" maxlength="2000" placeholder="${t("rf_body_ph")}"></textarea></label>
   <label>${t("rf_place")}<input name="place" maxlength="120" value="${esc(pj?.location || "")}" placeholder="Barangay, City/Municipality, Province"></label>
   <div class="row"><button type="button" class="btn ghost sm" id="pickLoc">📍 ${t("rf_pick")}</button><span id="locOut" style="font-size:11px;color:var(--mute)">${pj?.ll ? pj.ll.join(", ") : ""}</span></div>
   <div id="pickMap" class="smap" style="height:220px;display:none"></div>
   <label>${t("evidence")} (https links, required)<textarea name="evidence" required placeholder="https://..."></textarea></label>
   <label>${t("rf_photo")}<input type="file" name="photo" accept="image/*"></label><p style="font-size:11px;color:var(--mute)">🔒 ${t("rf_photo_note")}</p>
   <input type="hidden" name="project_id" value="${esc(projectId || "")}">${pj ? `<p style="font-size:12px">🏗️ ${t("linked_project")}: ${esc(pj.title)}</p>` : ""}
   <label class="row" style="font-size:12px"><input type="checkbox" name="ack" required style="width:auto"> ${t("rules_ack")}</label>
   <div class="row"><button class="btn">${t("publish")}</button><button type="button" class="btn ghost" data-close>${t("cancel")}</button></div></form>`);
  let ll = pj?.ll || null, pm;
  $("#pickLoc").onclick = () => { const el = $("#pickMap"); el.style.display = "block"; if (pm) return; pm = L.map(el).setView(ll || [12.3, 122.4], ll ? 11 : 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(pm); let mk;
    pm.on("click", e => { ll = [+e.latlng.lat.toFixed(3), +e.latlng.lng.toFixed(3)]; $("#locOut").textContent = ll.join(", ") + " (rounded ~100 m)"; mk ? mk.setLatLng(e.latlng) : mk = L.marker(e.latlng).addTo(pm); }); };
  $("#rf").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const evidence = httpsList(f.get("evidence")); if (!evidence.length) return toast(t("need_source"));
    let photo_b64 = null; const file = f.get("photo"); if (file && file.size) { if (file.size > 15e6) return toast("Photo too large"); photo_b64 = await stripExif(file); }
    const r = await empPost({ action: "report_create", cat: f.get("cat"), title: f.get("title"), body: f.get("body"), place: f.get("place"), lat: ll?.[0] ?? null, lng: ll?.[1] ?? null, evidence, photo_b64, project_id: f.get("project_id") || null, rules_ack: true });
    if (r && !r.error) { closeModal(); toast(t("posted")); location.hash = "#/sumbong"; route(); } };
}

/* ---------- Project Watch ---------- */
async function viewProjects() {
  const [PJ, U, R] = await Promise.all([data("projects"), empGet("project_updates"), empGet("reports")]); const id = qs().get("id");
  const peso = n => n == null ? "—" : "₱" + n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
  const upd = pid => [...U.items.filter(u => u.project_id === pid).map(u => ({ ...u, k: "u" })), ...R.items.filter(r => r.project_id === pid && !r.hidden).map(r => ({ ...r, k: "r" }))];
  const head = `<a href="#/empower">← ${t("emp_title")}</a><h1>🏗️ ${t("projects")}</h1><p class="sub">${t("projects_sub")}</p>
   <div class="disc">📊 ${t("source")}: <a href="${esc(PJ.source_url)}" target="_blank" rel="noopener">${esc(PJ.source)}</a> · fetched ${new Date(PJ.fetched_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (PHT). ${PJ.sample ? "<b>SAMPLE DATA.</b> " : "<b>Real public data.</b> "}${esc(PJ.note)}<br>${PJ.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>`).join(" · ")}</div>`;
  if (id) { const p = PJ.items.find(x => x.id === id); if (!p) return page(head + `<p>${t("empty")}</p>`);
    page(head + `<div class="card glass"><span class="chip">${esc(p.classification)}</span> <span class="chip">${esc(p.category)}</span><h2>${esc(p.title)}</h2>
     <table class="ptable"><tr><th>${t("budget")}</th><td>${peso(p.budget_php)} (Approved Budget for the Contract)</td></tr><tr><th>${t("entity")}</th><td>${esc(p.entity)}</td></tr>
     <tr><th>${t("contractor")}</th><td>${esc(p.contractor || p.contractor_note)}</td></tr><tr><th>${esc(p.deadline_kind)}</th><td>${esc(p.deadline)}</td></tr><tr><th>${t("location")}</th><td>${esc(p.location || "—")}</td></tr>
     <tr><th>${t("mode")}</th><td>${esc(p.mode)}</td></tr><tr><th>Published</th><td>${esc(p.published)}</td></tr></table>
     <a href="${esc(p.url)}" target="_blank" rel="noopener">${t("open_official")} ↗</a></div>
     <h2>👀 ${t("ground_updates")}</h2><div class="row"><a class="btn sm" href="#/sumbong?new=1&project=${esc(p.id)}">📢 ${t("report_this")}</a></div>
     <form id="guf" class="row" style="margin:8px 0"><input name="body" required minlength="10" maxlength="1000" placeholder="${t("ground_ph")}" style="flex:1"><button class="btn sm">${t("post")}</button></form>
     <div>${upd(p.id).map(u => `<div class="upd">${u.k === "r" ? `📢 <a href="#/sumbong">${esc(u.title)}</a> <span class="chip">${esc(u.status)}</span>` : esc(u.body)}<br><small>@${esc(u.handle)} · ${ago(u.created_at)}</small></div>`).join("") || `<p class="sub">${t("no_updates")}</p>`}</div>`);
    $("#guf").onsubmit = async e => { e.preventDefault(); const r = await empPost({ action: "project_update", project_id: p.id, body: e.target.body.value }); if (r && !r.error) route(); }; return; }
  page(head + `<div id="pmap" class="smap"></div><div style="overflow:auto"><table class="ptable wide"><thead><tr><th>${t("project")}</th><th>${t("budget")}</th><th>${t("entity")}</th><th>${t("contractor")}</th><th>Deadline</th><th>${t("location")}</th><th>👀</th></tr></thead><tbody>
   ${PJ.items.map(p => `<tr><td><a href="#/projects?id=${esc(p.id)}">${esc(p.title.slice(0, 90))}</a></td><td>${peso(p.budget_php)}</td><td>${esc(p.entity.slice(0, 60))}</td><td><small>${esc(p.contractor || "Not yet awarded")}</small></td><td><small>${esc(p.deadline_kind)}: ${esc(p.deadline)}</small></td><td>${esc(p.location || "—")}</td><td>${upd(p.id).length}</td></tr>`).join("")}</tbody></table></div>`);
  killEmap(); emap = L.map("pmap", { minZoom: 5 }).setView([12.3, 122.4], 5); L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { className: "osm-dark", attribution: "© OpenStreetMap contributors" }).addTo(emap);
  PJ.items.filter(p => p.ll).forEach(p => L.marker([p.ll[0] + (Math.random() - .5) * .1, p.ll[1] + (Math.random() - .5) * .1], { icon: L.divIcon({ className: "", html: `<div class="pin" style="--c:#ffc24b"></div>`, iconSize: [14, 14] }) }).bindPopup(`<b>${esc(p.title)}</b><br>${peso(p.budget_php)} · ${esc(p.location)}<br><a href="#/projects?id=${esc(p.id)}">Details</a>`).addTo(emap));
}

/* ---------- FOI Helper ---------- */
const FOI_STAT = ["Draft", "Filed", "Acknowledged", "Extended", "Granted", "Partially granted", "Denied", "Appealed"];
async function viewFoi() {
  const pre = JSON.parse(sessionStorage.getItem("civi.foi.prefill") || "null"); sessionStorage.removeItem("civi.foi.prefill");
  let mine = []; if (state.user) { const r = state.demo ? { items: demoStore.get("emp_foi") } : await api("empower?kind=foi"); mine = r.items || []; }
  page(`<a href="#/empower">← ${t("emp_title")}</a><h1>📂 ${t("foi")}</h1><p class="sub">${t("foi_sub")}</p>${demoBadge()}
   <div class="disc">${t("foi_how")} <a href="https://www.foi.gov.ph/" target="_blank" rel="noopener">foi.gov.ph ↗</a> · ${t("emp_never_send")}</div>
   <div class="sim-grid" style="grid-template-columns:1fr 1fr"><section class="card glass"><h2 style="margin-top:0">1 · ${t("foi_build")}</h2><form id="ff" class="stack">
    <label>${t("agency")}<input name="agency" required maxlength="160" value="${esc(pre?.agency || "")}" placeholder="e.g. Department of Public Works and Highways"></label>
    <label>${t("data_req")}<textarea name="data_requested" required maxlength="2000" placeholder="Be specific: what records, which period, which place">${esc(pre?.data_requested || "")}</textarea></label>
    <label>${t("purpose")}<input name="purpose" maxlength="600" placeholder="e.g. Research / community monitoring"></label>
    <label>${t("format")}<select name="format"><option>Spreadsheet (CSV/XLSX)</option><option>PDF</option><option>Photocopy</option><option>Any</option></select></label>
    <div class="row"><button type="button" class="btn ghost sm" id="fprev">👁️ ${t("preview")}</button><button class="btn sm">💾 ${t("save_track")}</button></div></form>
    <textarea id="fout" style="min-height:220px;margin-top:8px"></textarea><div class="row"><button class="btn ghost sm" id="fcopy">📋 ${t("copy")}</button><a class="btn ghost sm" href="https://www.foi.gov.ph/" target="_blank" rel="noopener">${t("open_efoi")} ↗</a></div></section>
   <section class="card glass"><h2 style="margin-top:0">2 · ${t("foi_track")}</h2>${state.user ? "" : `<p>${t("need_login")}</p>`}<p style="font-size:11px;color:var(--mute)">🔒 ${t("foi_private")}</p>
    ${mine.map(m => `<div class="upd"><b>${esc(m.agency)}</b><p style="font-size:12px">${esc(m.data_requested.slice(0, 160))}</p><div class="row"><select data-fs="${esc(m.id)}">${FOI_STAT.map(s => `<option ${s === m.status ? "selected" : ""}>${s}</option>`).join("")}</select>
      <input data-ft="${esc(m.id)}" value="${esc(m.tracking_no || "")}" placeholder="Tracking no." style="width:120px"><input type="date" data-fd="${esc(m.id)}" value="${esc(m.filed_on || "")}" style="width:140px"><button class="btn ghost sm" data-fdel="${esc(m.id)}">🗑️</button></div>
      ${m.filed_on ? `<small>${t("foi_due")}: ${addWorkdays(m.filed_on, 15)}</small>` : ""}</div>`).join("") || `<p class="sub">—</p>`}</section></div>`);
  const letter = () => { const f = Object.fromEntries(new FormData($("#ff"))); return `To: FOI Receiving Officer, ${f.agency}\n\nRequest for Information under Executive Order No. 2, s. 2016\n\nI respectfully request the following information:\n${f.data_requested}\n\nPurpose: ${f.purpose || "[state your purpose]"}\nPreferred format: ${f.format}\n\nI understand the agency should respond within fifteen (15) working days, subject to the exceptions and extensions under EO No. 2.\n\nName: [Your full name]\nContact: [Email / mobile]\nValid ID: [attach as required by the agency or eFOI]\n`; };
  $("#fprev").onclick = () => $("#fout").value = letter(); $("#fcopy").onclick = () => navigator.clipboard.writeText($("#fout").value || letter()).then(() => toast(t("copied")));
  $("#ff").onsubmit = async e => { e.preventDefault(); $("#fout").value = letter(); const f = Object.fromEntries(new FormData(e.target)); const r = await empPost({ action: "foi_save", ...f, status: "Draft" }); if (r && !r.error) { toast(t("saved")); route(); } };
  const save = async (id, patch) => { const m = mine.find(x => x.id === id); await empPost({ action: "foi_save", ...m, ...patch, id }); route(); };
  $$("[data-fs]").forEach(s => s.onchange = () => save(s.dataset.fs, { status: s.value })); $$("[data-ft]").forEach(s => s.onchange = () => save(s.dataset.ft, { tracking_no: s.value }));
  $$("[data-fd]").forEach(s => s.onchange = () => save(s.dataset.fd, { filed_on: s.value, status: "Filed" })); $$("[data-fdel]").forEach(b => b.onclick = async () => { await empPost({ action: "foi_delete", id: b.dataset.fdel }); route(); });
}
function addWorkdays(d, n) { const x = new Date(d + "T00:00:00"); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) n--; } return x.toLocaleDateString("en-PH") + " (approx., excludes weekends, not holidays)"; }

/* ---------- Know Your Rights ---------- */
function viewRights() {
  page(`<a href="#/empower">← ${t("emp_title")}</a><h1>⚖️ ${t("rights")}</h1><p class="sub">${t("rights_sub")}</p>${notLegal}
   <div class="grid">${RIGHTS.map(r => `<details class="card glass rights" ${qs().get("k") === r.k ? "open" : ""}><summary><b>${r.ic} ${esc(r.h)}</b></summary><ul>${r.pts.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
    <p style="font-size:12px">📜 ${r.law.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join(" · ")}</p></details>`).join("")}</div>
   <p style="font-size:11px;color:var(--mute)">Law texts: LawPhil Project (Arellano Law Foundation) mirrors of official texts; the Official Gazette is the official publication. ${LINK_NOTE}</p>
   <h2>🆘 ${t("free_legal")}</h2><p>PAO (<a href="https://pao.gov.ph/" target="_blank" rel="noopener">pao.gov.ph</a>), IBP legal aid, CHR (<a href="https://chr.gov.ph/" target="_blank" rel="noopener">chr.gov.ph</a>). More in the <a href="#/directory">Directory</a>.</p>`);
}

/* ---------- Impact board ---------- */
async function viewImpact() {
  const I = await empGet("impact");
  page(`<a href="#/empower">← ${t("emp_title")}</a><h1>🏆 ${t("impact")}</h1><p class="sub">${t("impact_sub")}</p>
   ${I.items.length ? `<div class="grid">${I.items.map(w => `<a class="card glass" href="#/${w.kind === "petition" ? "petitions?id=" + w.id : "sumbong"}"><span class="chip ok">${w.kind === "petition" ? "📝 Petition reached goal" : "✅ Report resolved"}</span><h4>${esc(w.title)}</h4><p>${w.n} ${w.kind === "petition" ? t("signed") : t("metoo")}</p></a>`).join("")}</div>`
     : `<div class="card glass" style="text-align:center;padding:30px"><div style="font-size:40px">🌱</div><h3>${t("impact_empty")}</h3><p>${t("impact_empty_sub")}</p><div class="row" style="justify-content:center"><a class="btn" href="#/petitions">${t("start_petition")}</a><a class="btn ghost" href="#/sumbong">${t("new_report")}</a></div></div>`}
   <div class="disc">${t("impact_rule")}</div>`);
}

/* ---------- Action Map layer (on the home map) ---------- */
const AKIND = { "Community event": "#9dff6a", "Volunteer activity": "#36f1b8", "Public hearing": "#5aa9ff", "Peaceful assembly": "#ff8a3d", "Community meeting": "#ffe36e", "Other": "#9aa8bb", "Sumbong report": "#ff5d7a" };
let actionLayer;
async function addActionToggle() {
  if (!map || $("#actBtn")) return;
  const btn = document.createElement("button"); btn.id = "actBtn"; btn.className = "btn sm action-toggle glass"; btn.textContent = "✊ " + t("action_map"); ($(".map-tools") || $("#view")).appendChild(btn);
  btn.onclick = () => toggleAction(!actionLayer); if (qs().get("layer") === "action" || sessionStorage.getItem("civi.action") === "1") toggleAction(true);
}
async function toggleAction(on) {
  sessionStorage.setItem("civi.action", on ? "1" : "0"); $("#actBtn")?.classList.toggle("on", on);
  if (actionLayer) { map.removeLayer(actionLayer); actionLayer = null; $("#actPanel")?.remove(); } if (!on) return;
  const [dir, gaz, hub, ev, R] = await Promise.all([data("directory"), data("gazetteer"), data("directory_hub"), empGet("events"), empGet("reports")]);
  const loc = s => { s = String(s || "").toLowerCase(); for (const k in gaz) if (s.includes(k)) return gaz[k].ll; return s.includes("ncr") || s.includes("manila") ? [14.5995, 120.9842] : null; };
  const pts = [];
  dir.items.filter(i => i.type === "event").forEach(i => { const ll = loc(i.city + " " + i.location); if (ll) pts.push({ ll, k: "Community event", title: i.name, sub: `${i.city} · ${new Date(i.starts_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} PHT`, url: i.url, label: "Source: Luma (public event)" }); });
  ev.items.filter(e => e.lat != null).forEach(e => pts.push({ ll: [e.lat, e.lng], k: e.kind, title: e.title, sub: `${e.place} · ${new Date(e.starts_at).toLocaleString("en-PH")}`, url: e.url, label: "User-submitted, unverified" }));
  R.items.filter(r => r.lat != null && !r.hidden).forEach(r => pts.push({ ll: [r.lat, r.lng], k: "Sumbong report", title: r.title, sub: r.status, url: "#/sumbong", label: "User-submitted, unverified" }));
  actionLayer = L.layerGroup(pts.map(p => L.marker(p.ll, { icon: L.divIcon({ className: "", html: `<div class="pin act" style="--c:${AKIND[p.k] || "#9aa8bb"}">✊</div>`, iconSize: [20, 20] }) })
    .bindPopup(`<div class="pc"><span class="chip" style="color:${AKIND[p.k]}">${esc(p.k)}</span> <span class="chip warn">${esc(p.label)}</span><h4>${esc(p.title)}</h4><p>${esc(p.sub)}</p>${p.url ? `<a href="${esc(p.url)}" ${p.url.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>Open ↗</a>` : ""}</div>`))).addTo(map);
  const vol = hub.items.filter(i => i.cat === "Volunteer & NGOs");
  $("#view").insertAdjacentHTML("beforeend", `<div class="act-panel glass" id="actPanel" role="region" aria-label="${esc(t("action_map"))}"><div class="row spread"><b>✊ ${t("action_map")}</b><span class="chip">${pts.length} on map</span></div><ul class="act-legend">${Object.entries(AKIND).map(([k, c]) => `<li><span class="legend-dot" style="--c:${c}"></span>${k}</li>`).join("")}</ul>
   <div class="sub" style="font-size:11px">${vol.length} nationwide volunteer groups have no single location: <a href="#/directory">Directory</a>. Event sources are shown in each point's details.</div>
   <button class="btn ghost sm" id="addEv" style="margin-top:6px">＋ ${t("add_event")}</button></div>`);
  const fp = $("#fpanel"); if (fp && innerWidth >= 900) fp.prepend($("#actPanel")); $("#addEv").onclick = eventForm;
}
function eventForm() {
  if (needLogin()) return;
  openModal(`<h2>＋ ${t("add_event")}</h2><div class="disc">${t("event_rule")}</div><form id="evf" class="stack"><label>Title<input name="title" required minlength="5" maxlength="140"></label>
   <label>Type<select name="kind">${["Public hearing", "Peaceful assembly", "Volunteer activity", "Community meeting", "Other"].map(k => `<option>${k}</option>`).join("")}</select></label>
   <label>Date & time<input type="datetime-local" name="starts_at" required></label><label>Place (province or city)<input name="place" required maxlength="120" placeholder="e.g. Quezon City"></label>
   <label>Official/organizer link (https)<input name="url" placeholder="https://"></label><div class="row"><button class="btn">${t("publish")}</button><button type="button" class="btn ghost" data-close>${t("cancel")}</button></div></form>`);
  $("#evf").onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const gaz = await data("gazetteer"); let ll = null; const s = f.place.toLowerCase(); for (const k in gaz) if (s.includes(k)) { ll = gaz[k].ll; break; }
    if (!ll) return toast("Place not found. Use a province or city name."); const r = await empPost({ action: "event_create", ...f, starts_at: new Date(f.starts_at).toISOString(), lat: ll[0], lng: ll[1] }); if (r && !r.error) { closeModal(); toggleAction(true); } };
}

/* ---------- wire into router ---------- */
Object.assign(ROUTES, { empower: viewEmpower, petitions: viewPetitions, sumbong: viewSumbong, projects: viewProjects, foi: viewFoi, rights: viewRights, impact: viewImpact });
const _viewMap = ROUTES.map; ROUTES.map = async () => { actionLayer = null; await _viewMap(); addActionToggle(); };
const _route = route; route = function () { killEmap(); closeModal(); actionLayer = null; _route(); const r = (location.hash.replace("#/", "") || "map").split("?")[0];
  if (r === "scholarships") $$("#dock a").forEach(a => a.classList.toggle("on", a.dataset.r === "directory"));
  if (["petitions", "sumbong", "projects", "foi", "rights", "impact"].includes(r)) $$("#dock a").forEach(a => a.classList.toggle("on", a.dataset.r === "empower")); };

/* ---------- Scholarships (Directory > Scholarships, Local / Abroad) ---------- */
async function viewScholarships() {
  const d = await data("scholarships"); let scope = qs().get("tab") === "abroad" ? "Abroad" : "Local", lv = "", ct = "", q = "";
  page(`<a href="#/directory">← Directory</a><h1>🎓 ${t("scholarships")}</h1><p class="sub">Scholarships for Filipinos, in the Philippines and abroad. Official pages only, each link checked ${new Date(d.checked_at).toLocaleDateString("en-PH")}.</p>
   <div class="disc">⚠️ ${esc(d.note)} Deadline windows are typical, not guaranteed. Civi is not affiliated with any provider. Never pay anyone to "process" a scholarship.</div>
   <div class="sch-tabs filters" id="stabs"></div><div class="row"><select id="slv"><option value="">All levels</option>${["UG", "Masters", "PhD", "Short"].map(x => `<option>${x}</option>`).join("")}</select>
   <select id="sct"></select><input type="search" id="sq" placeholder="Field or keyword (e.g. engineering)" style="flex:1;min-width:160px"></div><div class="grid" id="sgrid" style="margin-top:10px"></div>`);
  const draw = () => {
    $("#stabs").innerHTML = ["Local", "Abroad"].map(s => `<button class="${s === scope ? "on" : ""}" data-s="${s}">${s === "Local" ? "🇵🇭 " + t("sch_local") : "✈️ " + t("sch_abroad")} (${d.items.filter(i => i.scope === s).length})</button>`).join("");
    $$("#stabs button").forEach(b => b.onclick = () => { scope = b.dataset.s; ct = ""; draw(); });
    const countries = [...new Set(d.items.filter(i => i.scope === scope).map(i => i.country))].sort();
    $("#sct").innerHTML = `<option value="">All countries</option>` + countries.map(c => `<option ${c === ct ? "selected" : ""}>${esc(c)}</option>`).join("");
    $("#sgrid").innerHTML = d.items.filter(i => i.scope === scope && (!lv || i.levels.includes(lv)) && (!ct || i.country === ct) && (i.name + i.fields + i.provider + i.eligibility).toLowerCase().includes(q))
      .map(i => `<div class="card glass">${favBtn("scholarship", i.name, i.name, i.url)}<div class="row" style="padding-right:34px">${i.levels.map(l => `<span class="chip">${l}</span>`).join("")}<span class="chip">${esc(i.country)}</span></div><h4>${esc(i.name)}</h4><p>${esc(i.provider)}</p>
       <p><b>Fields:</b> ${esc(i.fields)}<br><b>Coverage:</b> ${esc(i.coverage)}<br><b>Deadline:</b> ${esc(i.deadline)}<br><b>Eligibility:</b> ${esc(i.eligibility)}</p>
       <a href="${esc(i.url)}" target="_blank" rel="noopener">Official site ↗</a></div>`).join("") || `<p>${t("empty")}</p>`;
  };
  $("#slv").onchange = e => { lv = e.target.value; draw(); }; $("#sct").onchange = e => { ct = e.target.value; draw(); }; $("#sq").oninput = e => { q = e.target.value.toLowerCase(); draw(); }; draw();
}
ROUTES.scholarships = viewScholarships;

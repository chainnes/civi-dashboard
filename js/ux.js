/* Civi UX layer: favorites (My Saved), Directory + Academy carousels, smart "What help do you need?", How-To guides,
   onboarding tour, Help/FAQ + help chatbot, accessibility toggles. Loaded after hub.js; overrides ROUTES entries. */

/* ---------- favorites ---------- */
const FAV = { key: "civi.favs", all: () => JSON.parse(localStorage.getItem("civi.favs") || "[]"), save: v => localStorage.setItem("civi.favs", JSON.stringify(v)) };
const favId = (type, id) => type + "|" + id;
const isFav = (type, id) => FAV.all().some(f => favId(f.type, f.item_id) === favId(type, id));
function favBtn(type, id, title, url) { const on = isFav(type, id);
  return `<button class="fav ${on ? "on" : ""}" data-fav="${esc(JSON.stringify({ type, item_id: String(id), title, url }))}" aria-pressed="${on}" aria-label="${esc(on ? t("unsave") : t("save"))}: ${esc(title)}" title="${esc(on ? t("unsave") : t("save"))}">${on ? "★" : "☆"}</button>`; }
async function syncFavsFromServer() { if (!state.user || state.demo) return; const r = await api("favorites"); if (r.items) FAV.save(r.items); }
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-fav]"); if (!b) return; e.preventDefault(); e.stopPropagation();
  const f = JSON.parse(b.dataset.fav), list = FAV.all(), i = list.findIndex(x => favId(x.type, x.item_id) === favId(f.type, f.item_id)), adding = i < 0;
  if (adding) list.unshift({ ...f, created_at: new Date().toISOString() }); else list.splice(i, 1); FAV.save(list);
  b.classList.toggle("on", adding); b.textContent = adding ? "★" : "☆"; b.setAttribute("aria-pressed", adding);
  toast(adding ? (state.user ? t("saved_ok") : t("saved_local")) : t("removed"));
  if (state.user && !state.demo) api("favorites", { method: "POST", body: { action: adding ? "add" : "remove", ...f } });
  if (location.hash.startsWith("#/saved")) viewSaved();
});
async function viewSaved() {
  const list = FAV.all(), types = [...new Set(list.map(f => f.type))];
  page(`<h1>★ ${t("my_saved")}</h1><p class="sub">${state.user && !state.demo ? t("saved_sub_acct") : t("saved_sub_local")}</p>
  ${list.length ? types.map(ty => `<h2>${esc(t("ft_" + ty))}</h2><div class="grid">${list.filter(f => f.type === ty).map(f => `<div class="card glass">${favBtn(f.type, f.item_id, f.title, f.url)}<h4 style="padding-right:34px">${esc(f.title)}</h4>${f.url ? `<a href="${esc(f.url)}" ${f.url.startsWith("#") ? "" : 'target="_blank" rel="noopener"'}>${t("open")} ↗</a>` : ""}<p style="font-size:11px">${t("saved_on")} ${new Date(f.created_at || Date.now()).toLocaleDateString("en-PH")}</p></div>`).join("")}</div>`).join("")
   : `<div class="card glass"><p>${t("saved_empty")}</p><a class="btn" href="#/directory">📇 ${t("nav_directory")}</a> <a class="btn ghost" href="#/academy">🎓 ${t("nav_academy")}</a></div>`}`);
}

/* ---------- carousels ---------- */
const rowc = (id, title, cards, extra = "", moreHref = "") => `<section class="rowc" aria-labelledby="h-${id}"><div class="rowc-h"><h2 id="h-${id}">${title} <span class="chip">${cards.length}</span></h2>
  <div class="cbtns">${extra}<button class="btn ghost sm" data-scroll="${id}" data-d="-1" aria-label="${esc(t("prev"))}">‹</button><button class="btn ghost sm" data-scroll="${id}" data-d="1" aria-label="${esc(t("next"))}">›</button>${moreHref ? `<a class="btn ghost sm" href="${moreHref}" data-savescroll>${t("see_more")} ›</a>` : `<button class="btn ghost sm" data-more="${id}" aria-expanded="false">${t("see_more")}</button>`}</div></div>
  <div class="carousel" id="c-${id}" tabindex="0" aria-label="${esc(title)}">${cards.join("")}</div></section>`;
function wireCarousels(root = document) {
  $$("[data-scroll]", root).forEach(b => b.onclick = () => { const c = $("#c-" + b.dataset.scroll); c.scrollBy({ left: c.clientWidth * .9 * b.dataset.d, behavior: "smooth" }); });
  $$("[data-more]", root).forEach(b => b.onclick = () => { const c = $("#c-" + b.dataset.more), on = c.classList.toggle("grid"); c.classList.toggle("carousel", !on); b.textContent = on ? t("see_less") : t("see_more"); b.setAttribute("aria-expanded", on); });
}

/* ---------- Directory with smart search ---------- */
const SYN = { career: "career roles job family jobs", karera: "career roles jobs", industriya: "industries industry", industry: "industries", ipon: "savings budget mp2 pag-ibig frugal", savings: "savings budget mp2 frugal", budget: "budget frugal savings", kalusugan: "health wellness doh philhealth", nutrisyon: "nutrition fnri pinggang health wellness", nutrition: "nutrition fnri health wellness", diet: "nutrition fnri healthy diet wellness", healthy: "health wellness nutrition", ehersisyo: "physical activity fitness wellness", exercise: "physical activity fitness wellness", tulog: "sleep health", mental: "mental health ncmh 1553", lungkot: "mental health ncmh 1553 hopeline", yakap: "philhealth yakap", recycle: "recycle drop-off trash cash e-waste", basura: "recycle drop-off trash", "e-waste": "recycle e-waste globe cyberzone", sachet: "recycle sachets eco-ikot", tipid: "promos discount srp budget pag-ibig", farming: "learn farming ati agriculture", pagsasaka: "learn farming ati agriculture", hydroponics: "learn farming ati", permaculture: "permaculture learn farming", taniman: "learn farming", embahada: "embassies embassy visa", embassy: "embassies embassy visa", visa: "embassies visa dfa", kumon: "learning centers tutorial", tutorial: "learning centers tutorial", korean: "language courses korean", nihongo: "language courses japanese japan foundation", japanese: "language courses japan foundation", wika: "language courses", kurso: "courses free online tesda coursera", sine: "now showing cinema movieworld", pelikula: "now showing cinema mtrcb fdcp", movie: "now showing cinema", "watch-to-earn": "swagbucks watch earn", app: "must-have apps", apps: "must-have apps", "i-download": "apps", download: "apps", promo: "promos sale discount", sale: "promos sale discount", discount: "promos discount sale", deal: "promos deals sale", deals: "promos deals", seatsale: "seat sales airline promos", voucher: "promos voucher", mura: "promos sale discount srp", tipid: "promos discount srp", "11.11": "promos sale shopee lazada", "12.12": "promos sale shopee lazada", payday: "promos sale", events: "events festival concert tickets meetup", event: "events festival concert tickets", gimik: "events concert tickets mall", lakad: "events pasyalan activities", pasyal: "events pasyalan activities", bazaar: "market bazaar mercato events", tiangge: "market bazaar mercato", popup: "market bazaar mercato events", "pop-up": "market bazaar mercato events", mall: "mall events ayala sm robinsons", concert: "tickets concert ticketnet smtickets", festival: "festivals events philippines.travel", fiesta: "festivals events", meetup: "meetups community luma gdg", conference: "conferences summit expo picc smx", summit: "conferences summit", expo: "expo smx world trade", convention: "convention picc smx", networking: "meetups conferences", seminar: "conferences meetups", webinar: "meetups online events", kita: "earn freelance survey sell gigs", kumita: "earn freelance survey sell gigs", raket: "earn gigs freelance sideline", sideline: "earn gigs freelance sell", extra: "earn gigs survey", income: "earn freelance survey gigs", onlinejob: "earn freelance remote", survey: "survey surveys micro-tasks earn", freelance: "freelance earn upwork remote", freelancer: "freelance earn", diskarte: "earn sell gigs sideline", benta: "sell online seller shop", magbenta: "sell online seller shop", scam: "scam iwas cicc sec report", loan: "pag-ibig sss gsis utang loan", utang: "loan pag-ibig sss", trabaho: "jobs dole peso tesda work employment", job: "jobs dole tesda employment", tax: "bir tin buwis", buwis: "bir tax",
  passport: "dfa passport consular", pasaporte: "dfa passport", id: "philsys psa national id lto sss", sakit: "health doh philhealth hospital", health: "doh philhealth hospital medical", hospital: "doh philhealth pcso medical",
  bagyo: "pagasa ocd ndrrmc disaster typhoon", typhoon: "pagasa ocd disaster", lindol: "phivolcs earthquake", earthquake: "phivolcs", baha: "flood dpwh mmda ocd disaster", flood: "dpwh mmda ocd disaster",
  abuso: "chr pnp legal aid rights violence", abuse: "chr pnp legal aid rights violence women children", complaint: "8888 ombudsman dti consumer complaint", reklamo: "8888 ombudsman dti consumer complaint",
  corruption: "ombudsman coa 8888", kurapsyon: "ombudsman coa 8888", ofw: "dmw owwa migrant overseas", abroad: "dmw owwa dfa scholarship", scholarship: "ched dost tesda scholarship", iskolar: "ched dost scholarship",
  business: "dti sec bir business permit", negosyo: "dti sec bir business permit", privacy: "npc privacy data", data: "npc psa open data", vote: "comelec voter election", botante: "comelec voter",
  bahay: "pag-ibig nha dhsud housing", house: "pag-ibig nha dhsud housing", license: "lto driver license", lisensya: "lto driver license", police: "pnp nbi clearance police", pulis: "pnp police",
  mental: "mental health hotline ncmh", lungkot: "mental health hotline", volunteer: "volunteer ngo", tulong: "dswd aid assistance volunteer ngo", aid: "dswd aid assistance", stocks: "pse company listed", barko: "ferry ppa marina coast pcg water 2go", ferry: "ferry ppa marina coast water", eroplano: "airport flight airline naia caap", flight: "airport flight airline naia caap", lipad: "flight airline airport", tren: "lrt mrt pnr rail train", train: "lrt mrt pnr rail", bus: "bus ltfrb dotr victory ceres genesis pitx", jeep: "ltfrb sakay route", biyahe: "transport land air water schedule sakay", byahe: "transport land air water schedule sakay", schedule: "schedule transport flight ferry", iskedyul: "schedule transport", commute: "sakay lrt mrt bus route", civictech: "community-built volunteer bettergov", opensource: "community-built github bettergov", transparency: "bettergov transparency bantay",  invest: "pse sec bsp company", sports: "sports fitness pba uaap volleyball football", isports: "sports", palaro: "sports", takbo: "running race marathon run", run: "running race marathon", fun: "running race", marathon: "running race marathon", hiking: "hiking mountain pinoymountaineer", akyat: "hiking mountain", bundok: "hiking mountain", basketball: "pba gilas sbp", scholarship: "scholarships scholarship ched dost", iskolar: "scholarships scholarship", hotline: "life safety emergency hotline", shopping: "shopping e-commerce mall", online: "shopping e-commerce", sine: "cinema entertainment tickets", movie: "cinema entertainment", concert: "tickets concert", kuryente: "meralco electricity utilities", tubig: "water maynilad manila utilities", internet: "telecom globe smart dito converge", load: "telecom globe smart dito", padala: "courier phlpost lbc parcel", parcel: "courier phlpost lbc parcel tracking", hayop: "animal pets welfare", aso: "pets animal welfare", pusa: "pets animal welfare", zoo: "zoos parks pasyalan", pasyalan: "zoos parks pasyalan museum", museum: "museum culture", kalikasan: "nature wildlife environment", news: "media news", balita: "media news", simbahan: "faith church community", senior: "senior citizens ncsc", pwd: "pwd disability ncda", babae: "women pcw vawc", bata: "children cwc bantay", negosyo: "business sec dti bnrs find", kumpanya: "business sec company find", kooperatiba: "cooperative cda", esports: "gaming esports", libro: "books libraries", lgbt: "lgbtq support", katutubo: "indigenous ncip" };
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function score(item, words) { const hay = norm([item.name, item.abbr, item.desc, item.cat, item.industry, item.role, item.ticker].join(" ")); let s = 0;
  words.forEach(w => { if (w.length < 2) return; if (new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "")).test(hay)) s += 3; else if (hay.includes(w)) s += 1; }); return s; }
const STOP = new Set("ng sa ang na mga ko ako ka mo si ni kay at ay para po the a an of for to my i me in on is and or how what ano paano saan".split(" "));
const expand = q => { const ws = norm(q).split(/[^a-z0-9-]+/).filter(w => w && !STOP.has(w)); return [...new Set(ws.flatMap(w => [w, ...(SYN[w] || Object.entries(SYN).find(([k]) => k.length > 3 && w.startsWith(k))?.[1] || "").split(" ").filter(Boolean)]))]; };
const dirCard = i => `<div class="card glass">${favBtn(i._type || "directory", i.abbr || i.name, i.name, i.url)}<span class="chip">${esc(i.industry || i.cat || i.role)}</span>${i.ticker ? ` <span class="chip ok">PSE: ${esc(i.ticker)}</span>` : ""}${i.link === "bot-protected" ? ` <span class="chip" title="${esc(t("botprot"))}">✓ ${t("site_up")}</span>` : i.link === "live" ? ` <span class="chip ok">✓ ${t("link_ok")}</span>` : i.link ? ` <span class="chip warn">${t("link_check")}</span>` : ""}
  <h4 style="padding-right:34px">${esc(i.role ? i.role + ": " + i.name : i.name)}${i.abbr && i.abbr !== i.name ? ` <small style="color:var(--mute)">(${esc(i.abbr)})</small>` : ""}</h4>
  ${i.phone ? `<div class="v" style="font-size:20px;color:var(--lime)">☎ <a href="tel:${esc(i.phone)}" style="color:inherit">${esc(i.phone)}</a></div>` : ""}<p>${esc(i.desc || i.note || "")}</p>${i.src ? `<p style="font-size:10.5px;color:var(--mute)">${t("source")}: ${esc(i.src)}</p>` : ""}<a href="${esc(i.url)}" target="_blank" rel="noopener">${t("official_site")} ↗</a></div>`;
async function viewDirectory2() {
  const [hub, gov, off, co, ct, dm] = await Promise.all([data("directory_hub"), data("gov_directory"), data("officials"), data("companies"), data("civic_transport").catch(() => ({ items: [] })), data("directory_more").catch(() => ({ items: [] }))]);
  const all = [...hub.items.map(i => ({ ...i, _type: "directory" })), ...gov.items.map(i => ({ ...i, _type: "directory" })), ...(ct.items || []).map(i => ({ ...i, _type: "directory" })), ...(dm.items || []).map(i => ({ ...i, _type: "directory" })), ...off.items.map(i => ({ ...i, cat: "Public officials", _type: "official" })), ...co.items.map(i => ({ ...i, cat: "Companies (PSE-listed)", desc: `${i.industry} · ${co.source}`, _type: "company" }))];
  const order = ["Emergency & hotlines", "Must-have apps in PH", "Executive departments", "Agencies & GOCCs", "Constitutional bodies & courts", "Legislature", "Public officials", "Civic tech & community-built", "Transport: Land", "Transport: Air", "Transport: Water", "Government services", "Legal aid & rights", "Health", "Health & wellness apps/sites", "Mental health", "OFW services", "Jobs & livelihood", "Earn: Iwas scam", "Earn: Small gigs", "Earn: Freelance", "Earn: Surveys & micro-tasks", "Earn: Sell online", "Earn: Content creation", "Earn: Rider & delivery", "Earn: Teach & tutor", "Learning & scholarships", "Learning centers & tutorials", "Free language & online courses", "Learn farming: Free", "Learn farming: Paid / audit-free", "Recycle & drop-off programs", "Embassies", "Consumer complaints", "Volunteer & NGOs", "Scholarships", "Life & safety", "Sports & fitness", "Money & finance", "Find any business", "Telecom & utilities", "Post & couriers", "Companies (PSE-listed)", "Data, laws & documents", "Events & activities", "Events & things to do", "Promos, sales & discounts", "Meetups & conferences", "Places & travel"];
  const cats = [...new Set([...order.filter(c => all.some(i => i.cat === c)), ...all.map(i => i.cat)])];
  const sub = decodeURIComponent(location.hash.split("?")[0].split("/")[2] || "");
  if (sub) { const c = cats.find(x => x === sub) || cats.find(x => norm(x) === norm(sub)), list = all.filter(i => i.cat === c);
    page(`<p><button class="btn ghost sm" id="dirBack">‹ ${t("back")}</button></p><h1>📇 ${esc(t(c || sub))} <span class="chip">${list.length}</span></h1>
     ${list.length ? `<div class="grid">${list.map(dirCard).join("")}</div>` : `<p>${t("no_match")}</p>`}`);
    $("#dirBack").onclick = () => { if (sessionStorage.getItem("civi.dirFrom") === "1") history.back(); else location.hash = "#/directory"; }; return; }
  page(`<h1>📇 ${t("dir_title")}</h1><p class="sub">${t("directory_sub")}</p>
   <div class="smart glass" role="search"><span style="font-size:22px" aria-hidden="true">🤝</span><input type="search" id="needQ" placeholder="${esc(t("need_ph"))}" aria-label="${esc(t("need_q"))}"><button class="btn" id="needAI" title="${esc(t("ai_hint"))}">✨ ${t("ask")}</button></div>
   <div id="needRes" class="smart-res" aria-live="polite"></div>
   <div class="disc">${t("d_emerg")} ${t("dir_disc")} ${t("off_asof")} ${esc(off.as_of)}. ${t("ct_disc")} ${t("asof")} ${esc(ct.as_of || "")}. ${t("d_third")} ${t("dm_note")}</div>
   <div class="row" style="flex-wrap:wrap;margin-bottom:8px"><a class="btn sm" href="#/scholarships">🎓 ${t("scholarships")}</a><button class="btn ghost sm" id="reqAdd">➕ ${t("req_btn")}</button></div>
   <div id="rows">${cats.map((c, n) => rowc("d" + n, esc(t(c)), all.filter(i => i.cat === c).map(dirCard), "", "#/directory/" + encodeURIComponent(c))).join("")}</div>
   <p class="sub" style="font-size:11px">${esc(gov.note)} ${esc(co.note)} <a href="${esc(co.url)}" target="_blank" rel="noopener">PSE EDGE ↗</a></p>`);
  wireCarousels(); $$("[data-savescroll]").forEach(a => a.onclick = () => { sessionStorage.setItem("civi.dirScroll", scrollY); sessionStorage.setItem("civi.dirFrom", "1"); });
  { const y = +sessionStorage.getItem("civi.dirScroll"); if (y && sessionStorage.getItem("civi.dirFrom") === "1") { sessionStorage.removeItem("civi.dirFrom"); requestAnimationFrame(() => scrollTo(0, y)); } }
  $("#reqAdd").onclick = () => requestListing(cats); if (new URLSearchParams(location.hash.split("?")[1] || "").get("add")) requestListing(cats);
  const show = (words, label) => { if (!words.length) { $("#needRes").innerHTML = ""; $("#rows").hidden = false; return; }
    const hits = all.map(i => [i, score(i, words)]).filter(x => x[1] >= 3).sort((a, b) => b[1] - a[1]).slice(0, 24).map(x => x[0]);
    $("#rows").hidden = !!hits.length; $("#needRes").innerHTML = `<h2>${t("best_matches")} <span class="chip">${hits.length}</span>${label ? ` <span class="chip ok">${esc(label)}</span>` : ""} <button class="btn ghost sm" id="needClr">${t("clear_all")}</button></h2>${hits.length ? `<div class="grid">${hits.map(dirCard).join("")}</div>` : `<p>${t("no_match")}</p>`}`;
    $("#needClr").onclick = () => { $("#needQ").value = ""; show([]); }; };
  let tmr; $("#needQ").oninput = e => { clearTimeout(tmr); tmr = setTimeout(() => show(expand(e.target.value)), 120); }; { const q0 = new URLSearchParams(location.hash.split("?")[1] || "").get("q"); if (q0) { $("#needQ").value = q0; show(expand(q0)); } }
  $("#needAI").onclick = async () => { const q = $("#needQ").value.trim(); if (!q) return $("#needQ").focus(); $("#needRes").innerHTML = `<p>✨ ${t("thinking")}</p>`;
    const r = await api("assist", { method: "POST", body: { mode: "directory", q } });
    if (r.keywords?.length) show([...expand(q), ...r.keywords.flatMap(expand)], "AI: " + r.keywords.join(", ")); else show(expand(q), t("kw_mode")); };
}

function requestListing(cats) {
  openModal(`<div class="row spread"><h2 style="margin:0">➕ ${t("req_btn")}</h2><button class="btn ghost sm" data-close aria-label="Close">✕</button></div>
  <div class="disc">${t("req_review")}</div>
  <form id="reqF" class="stack" novalidate>
   <label>${t("req_name")} *<input type="text" name="name" required minlength="2" maxlength="120"></label>
   <label>${t("req_url")} *<input type="url" name="url" required maxlength="300" placeholder="https://…"></label>
   <label>${t("req_cat")} *<input type="text" name="category" required maxlength="80" list="reqCats" placeholder="e.g. Volunteer & NGOs, Retail, Health"><datalist id="reqCats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></label>
   <label>${t("req_loc")}<input type="text" name="location" maxlength="120" placeholder="e.g. Cebu City / Nationwide"></label>
   <label>${t("req_desc")} *<textarea name="description" required minlength="10" maxlength="500"></textarea></label>
   <label>${t("req_email")}<input type="email" name="email" maxlength="200" autocomplete="email"></label>
   <label class="hp" aria-hidden="true" style="position:absolute;left:-9999px">Website 2<input type="text" name="website2" tabindex="-1" autocomplete="off"></label>
   <label class="row" style="align-items:flex-start;gap:8px"><input type="checkbox" name="consent" required style="width:auto;margin-top:3px"><span style="font-size:12px">${t("req_consent")} <a href="#/privacy" data-close>${t("privacy")}</a></span></label>
   <p id="reqErr" class="chip warn hidden" role="alert"></p>
   <div class="row"><button class="btn">${t("req_submit")}</button><button type="button" class="btn ghost" data-close>${t("cancel")}</button></div></form>`);
  $("#reqF").onsubmit = async e => { e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f)), err = m => { $("#reqErr").textContent = m; $("#reqErr").classList.remove("hidden"); };
    if (v.website2) return closeModal(); // honeypot
    let u; try { u = new URL(v.url); } catch {} if (!u || !/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return err(t("req_bad_url"));
    if ((v.name || "").trim().length < 2 || (v.description || "").trim().length < 10 || !(v.category || "").trim()) return err(t("req_missing"));
    if (!f.consent.checked) return err(t("req_need_consent"));
    const body = { ...v, consent: true };
    const r = await api("directory-request", { method: "POST", body });
    if (r.demo) { demoStore.set("dirreq", [{ ...body, status: "pending", time: new Date().toISOString() }, ...demoStore.get("dirreq")].slice(0, 20)); closeModal(); return toast(t("req_ok_demo")); }
    if (r.error) return err(r.error === "rate_limited" ? t("req_rate") : r.error === "bad_url" ? t("req_bad_url") : t("req_fail"));
    closeModal(); toast(t("req_ok")); };
}

/* ---------- Academy: carousels + How-To guides ---------- */
const CIVIC = [["Read the national budget", "https://www.dbm.gov.ph/", "DBM publishes the GAA and budget documents."], ["File an FOI request", "https://www.foi.gov.ph/", "Ask executive agencies for documents."],
  ["Know your data rights (RA 10173)", "https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html", "Rights to be informed, access, correct, erase."], ["Find laws and cases", "https://lawphil.net/", "LawPhil: statutes and jurisprudence, free."],
  ["Check government bids", "https://notices.philgeps.gov.ph/", "PhilGEPS procurement notices."], ["Explore official statistics", "https://openstat.psa.gov.ph/", "PSA OpenSTAT tables & API."], ["Open Data Philippines", "https://data.gov.ph/", "Government datasets."]];
const howAll = async () => { const [h, e, lf, hl] = await Promise.all([data("howto"), data("howto_earn").catch(() => ({ items: [] })), data("howto_life").catch(() => ({ items: [] })), data("howto_health").catch(() => ({ items: [] }))]); const W = await data("howto_work").catch(() => ({ items: [] })); return { ...h, items: [...h.items, ...e.items.map(x => ({ ...x, _note: e.note })), ...lf.items.map(x => ({ ...x, _note: lf.note })), ...hl.items.map(x => ({ ...x, _note: hl.note })), ...W.items.map(x => ({ ...x, _note: W.note }))] }; };
const howTitle = h => (state.lang === "tl" && h.title_tl) ? h.title_tl : h.title;
const howCard = h => `<div class="card glass">${favBtn("howto", h.id, h.title, "#/howto?id=" + h.id)}<span class="chip ok">${t("howto")}</span><h4 style="padding-right:34px">${esc(howTitle(h))}</h4><p>${h.steps.length} ${t("steps")} · ${t("asof")} ${esc(state._howAsOf || "")}</p><a class="btn sm" href="#/howto?id=${esc(h.id)}">${t("start_guide")} ▶</a></div>`;
async function viewAcademy2() {
  const [a, how] = await Promise.all([data("academy"), howAll()]); state._howAsOf = how.as_of; const hc = [...new Set(how.items.map(h => h.cat))];
  page(`<h1>🎓 ${t("nav_academy")}</h1><p class="sub">${t("acad_sub")}</p>
   <div class="smart glass" role="search"><span style="font-size:22px" aria-hidden="true">🔎</span><input type="search" id="acQ" placeholder="${esc(t("acad_q"))}" aria-label="${esc(t("acad_q"))}"><button class="btn" id="acAI" title="${esc(t("ai_hint"))}">✨ ${t("ask")}</button></div>
   <div class="acats" role="group" aria-label="${esc(t("categories"))}"><button class="chip on" data-ac="">${t("all")}</button>${hc.map(c => `<button class="chip" data-ac="${esc(c)}">${esc(t(c))}</button>`).join("")}</div>
   <div id="acRes" aria-live="polite"></div><div id="acRows">
   ${hc.map((c, n) => rowc("h" + n, "🧭 " + esc(t(c)), how.items.filter(h => h.cat === c).map(howCard))).join("")}
   ${rowc("civic", "🏛️ " + t("civic_knowhow"), CIVIC.map(([n, u, d]) => `<div class="card glass">${favBtn("academy", n, n, u)}<h4 style="padding-right:34px">${n}</h4><p>${d}</p><a href="${u}" target="_blank" rel="noopener">${t("start")} ↗</a></div>`))}
   ${rowc("courses", "💻 " + t("free_courses"), (a.online || []).map(c => `<div class="card glass">${favBtn("academy", c.name, c.name, c.url)}<span class="chip">${esc(c.by)}</span><h4 style="padding-right:34px">${esc(c.name)}</h4><p>${esc(c.tags || "")}</p><a href="${esc(c.url)}" target="_blank" rel="noopener">${t("open")} ↗</a></div>`))}
   </div><div class="card glass sims" style="margin-top:14px"><span class="chip ok">Beta</span><h4>🎮 Civi Sims</h4><p><a href="#/sim"><b>Kung Ikaw ang Presidente ▶</b></a> ${t("sim_blurb")}</p></div>`);
  wireCarousels();
  let cat = "", words = [], aiLab = "";
  const hText = h => norm([h.title, h.title_tl, h.cat, t(h.cat), ...(h.steps || []), h.tip, ...(h.related || [])].join(" "));
  const show = () => { const hits = how.items.filter(h => (!cat || h.cat === cat) && (!words.length || words.some(w => hText(h).includes(w))))
      .sort((a, b) => words.filter(w => hText(b).includes(w)).length - words.filter(w => hText(a).includes(w)).length);
    const filt = cat || words.length; $("#acRows").hidden = !!filt;
    $("#acRes").innerHTML = filt ? `<h2>${t("best_matches")} <span class="chip">${hits.length}</span>${aiLab ? ` <span class="chip ok">${esc(aiLab)}</span>` : ""}</h2>${hits.length ? `<div class="grid">${hits.map(howCard).join("")}</div>` : `<p>${t("no_match")}</p>`}` : ""; };
  $$("[data-ac]").forEach(b => b.onclick = () => { cat = b.dataset.ac; $$("[data-ac]").forEach(x => x.classList.toggle("on", x === b)); show(); });
  let tmr; $("#acQ").oninput = e => { clearTimeout(tmr); tmr = setTimeout(() => { aiLab = ""; words = expand(e.target.value); show(); }, 120); };
  $("#acAI").onclick = async () => { const q = $("#acQ").value.trim(); if (!q) return $("#acQ").focus(); $("#acRes").innerHTML = `<p>✨ ${t("thinking")}</p>`;
    const r = await api("assist", { method: "POST", body: { mode: "academy", q } }); // Workers AI via the AI binding; local keyword fallback
    if (r.keywords?.length) { words = [...expand(q), ...r.keywords.flatMap(expand)]; aiLab = "AI: " + r.keywords.join(", "); } else { words = expand(q); aiLab = t("kw_mode"); } show(); };
}
async function viewHowto() {
  const how = await howAll(), id = new URLSearchParams(location.hash.split("?")[1] || "").get("id"), h = how.items.find(x => x.id === id);
  if (!h) return viewAcademy2();
  const done = JSON.parse(localStorage.getItem("civi.howto." + h.id) || "[]");
  page(`<p><a href="#/academy">← ${t("nav_academy")}</a></p><div class="card glass" style="max-width:760px">${favBtn("howto", h.id, h.title, "#/howto?id=" + h.id)}<span class="chip ok">${t("howto")}</span> <span class="chip">${esc(t(h.cat))}</span>
   <h1 style="padding-right:34px">${esc(howTitle(h))}</h1>${h.title_tl && howTitle(h) !== h.title_tl ? `<p class="sub">${esc(h.title_tl)}</p>` : ""}<div class="disc">📅 ${t("asof")} ${esc(how.as_of)}. ${esc(h._note || how.note)} ${t("not_advice")}</div>
   <ol class="steps">${h.steps.map((s, n) => `<li><label class="row" style="align-items:flex-start;gap:8px"><input type="checkbox" data-step="${n}" ${done.includes(n) ? "checked" : ""} style="width:auto;margin-top:3px" aria-label="${esc(t("mark_done"))} ${n + 1}"><span>${esc(s)}</span></label></li>`).join("")}</ol>
   ${h.tip ? `<div class="disc">💡 ${esc(h.tip)}</div>` : ""}${h.related ? `<p>🔗 ${t("see_more")}: ${h.related.map(r => `<a href="#/directory?q=${encodeURIComponent(r)}">${esc(r)}</a>`).join(" · ")}</p>` : ""}${h.links ? `<p>🌐 ${h.links.map(([n, u, st]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a>${st === "bot-protected" ? ` <small title="${esc(t("botprot"))}">✓</small>` : ""}`).join(" · ")}</p>` : ""}<p><a class="btn" href="${esc(h.src)}" target="_blank" rel="noopener">${t("check_official")} ↗</a> <span class="chip ${h.link === "live" ? "ok" : ""}">${esc(new URL(h.src).hostname)}</span></p>
   <p class="sub" style="font-size:11px">${t("progress_local")}</p></div>`);
  $$("[data-step]").forEach(c => c.onchange = () => localStorage.setItem("civi.howto." + h.id, JSON.stringify($$("[data-step]:checked").map(x => +x.dataset.step))));
}

/* ---------- Help, FAQ, chatbot ---------- */
const FAQ = () => [["faq_q1", "faq_a1"], ["faq_q2", "faq_a2"], ["faq_q3", "faq_a3"], ["faq_q4", "faq_a4"], ["faq_q5", "faq_a5"], ["faq_q6", "faq_a6"], ["faq_q7", "faq_a7"], ["faq_q8", "faq_a8"], ["faq_q9", "faq_a9"], ["faq_q10", "faq_a10"]].map(([q, a]) => [t(q), t(a)]);
function viewHelp() {
  page(`<h1>❓ ${t("help_title")}</h1><p class="sub">${t("help_sub")}</p>
  <div class="grid"><div class="card glass"><h4>🧭 ${t("tour_restart")}</h4><p>${t("tour_desc")}</p><button class="btn" id="tourGo">${t("start_tour")} ▶</button></div>
  <div class="card glass"><h4>💬 ${t("chat_title")}</h4><p>${t("chat_desc")}</p><button class="btn" id="chatGo">${t("open_chat")}</button></div>
  <div class="card glass"><h4>♿ ${t("a11y")}</h4><div class="row" style="flex-wrap:wrap"><button class="btn ghost sm" data-fs="">A</button><button class="btn ghost sm" data-fs="fs-l" style="font-size:15px">A+</button><button class="btn ghost sm" data-fs="fs-xl" style="font-size:17px">A++</button><button class="btn ghost sm" id="hcTog" aria-pressed="${document.documentElement.classList.contains("hc")}">◐ ${t("high_contrast")}</button></div><p style="font-size:12px">${t("a11y_desc")}</p></div>
  <div class="card glass"><h4>✉️ ${t("contact")}</h4><p>${t("contact_desc")} <a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a></p></div></div>
  <h2 id="faq">${t("faq")}</h2><div class="faq">${FAQ().map(([q, a]) => `<details class="glass"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>`);
  $("#tourGo").onclick = () => { location.hash = "#/map"; setTimeout(startTour, 700); }; $("#chatGo").onclick = openChat; a11yWire();
}
function a11yWire() { $$("[data-fs]").forEach(b => b.onclick = () => { document.documentElement.classList.remove("fs-l", "fs-xl"); b.dataset.fs && document.documentElement.classList.add(b.dataset.fs); localStorage.setItem("civi.fs", b.dataset.fs); });
  $("#hcTog") && ($("#hcTog").onclick = () => { const on = document.documentElement.classList.toggle("hc"); localStorage.setItem("civi.hc", on ? 1 : 0); $("#hcTog").setAttribute("aria-pressed", on); }); }
(() => { const fs = localStorage.getItem("civi.fs"); fs && document.documentElement.classList.add(fs); localStorage.getItem("civi.hc") === "1" && document.documentElement.classList.add("hc"); })();
function botAnswer(q) { const words = expand(q), faq = FAQ(); let best = null, bs = 0;
  faq.forEach(([fq, fa]) => { const h = norm(fq + " " + fa); const s = words.reduce((n, w) => n + (w.length > 2 && h.includes(w) ? (norm(fq).includes(w) ? 2 : 1) : 0), 0); if (s > bs) { bs = s; best = fa; } });
  const routes = [[/map|mapa|filter|label/, "#/map"], [/save|favorite|saved|star/, "#/saved"], [/sss|pag-?ibig|passport|nbi|tin|bir|license|philhealth|guide|gabay/, "#/academy"], [/hotline|agency|ahensya|directory/, "#/directory"], [/petition|sumbong|report|empower/, "#/empower"], [/privacy|data/, "#/privacy"]];
  const r = routes.find(([re]) => re.test(norm(q)));
  return (bs ? best : t("bot_dunno")) + (r ? `\n→ ${location.origin}/${r[1]}` : ""); }
function openChat() {
  if ($("#chat")) return $("#chat").remove();
  document.body.insertAdjacentHTML("beforeend", `<section id="chat" class="chat glass" role="dialog" aria-label="${esc(t("chat_title"))}"><div class="row spread"><b>💬 ${t("chat_title")}</b><button class="btn ghost sm" id="chatX" aria-label="Close">✕</button></div>
   <div class="disc" style="font-size:11px">${t("chat_disc")}</div><div class="chat-log" id="chatLog" aria-live="polite"><div class="msg bot">${esc(t("bot_hi"))}</div></div>
   <div class="row" style="flex-wrap:wrap;gap:4px;margin:4px 0">${["faq_q1", "faq_q3", "faq_q5", "faq_q7"].map(k => `<button class="chip" data-sugg="${esc(t(k))}" style="cursor:pointer">${esc(t(k))}</button>`).join("")}</div>
   <form id="chatF" class="row"><input type="text" name="q" maxlength="300" required placeholder="${esc(t("chat_ph"))}" aria-label="${esc(t("chat_ph"))}"><button class="btn sm">${t("send")}</button></form></section>`);
  const log = $("#chatLog"), say = (txt, who) => { const d = document.createElement("div"); d.className = "msg " + who; d.textContent = txt; log.appendChild(d); log.scrollTop = log.scrollHeight; };
  const ask = async q => { say(q, "me"); const local = botAnswer(q); const r = await api("assist", { method: "POST", body: { mode: "help", q, ctx: FAQ().map(x => x.join(": ")).join("\n") } }); say(r.answer ? r.answer + "\n(AI)" : local, "bot"); };
  $("#chatX").onclick = () => $("#chat").remove(); $("#chatF").onsubmit = e => { e.preventDefault(); const q = e.target.q.value.trim(); e.target.q.value = ""; q && ask(q); };
  $$("[data-sugg]").forEach(b => b.onclick = () => ask(b.dataset.sugg)); $("#chatF input").focus();
}
document.body.insertAdjacentHTML("beforeend", `<button class="chat-fab" id="chatFab" aria-label="Help chat">💬</button>`); $("#chatFab").onclick = openChat;

/* ---------- onboarding tour (no deps) ---------- */
const TOUR = [["#dock", "tour1"], [".map-tools", "tour2"], ["#fpanel", "tour3"], ["#glance", "tour4"], ["#briefBtn", "tour5"], ["#lang", "tour6"], ["#chatFab", "tour7"]];
function startTour(i = 0) {
  $$(".tour-hl,.tour-box").forEach(e => e.remove()); if (i >= TOUR.length) return localStorage.setItem("civi.tour", "done");
  const [sel, key] = TOUR[i], el = $(sel); if (!el || !el.offsetParent && getComputedStyle(el).position !== "fixed") return startTour(i + 1);
  const r = el.getBoundingClientRect(); if (!r.width) return startTour(i + 1);
  document.body.insertAdjacentHTML("beforeend", `<div class="tour-hl" style="left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${Math.min(r.height, innerHeight - r.top) + 8}px"></div>
  <div class="tour-box glass" role="dialog" aria-live="polite" aria-label="${esc(t("start_tour"))}"><div class="chip ok">${i + 1}/${TOUR.length}</div><p style="margin:8px 0">${esc(t(key))}</p><div class="row spread"><button class="btn ghost sm" id="tSkip">${t("skip")}</button><div class="row">${i ? `<button class="btn ghost sm" id="tPrev">‹ ${t("prev")}</button>` : ""}<button class="btn sm" id="tNext">${i === TOUR.length - 1 ? t("done") : t("next") + " ›"}</button></div></div></div>`);
  const b = $(".tour-box"), bw = Math.min(340, innerWidth - 24), bh = b.offsetHeight;
  let left = r.right + 12, top = r.top; if (left + bw > innerWidth) left = Math.max(12, Math.min(innerWidth - bw - 12, r.left)), top = r.bottom + 12 + bh > innerHeight ? r.top - bh - 12 : r.bottom + 12;
  Object.assign(b.style, { left: left + "px", top: Math.max(12, Math.min(innerHeight - bh - 12, top)) + "px", width: bw + "px" });
  $("#tNext").focus(); $("#tNext").onclick = () => startTour(i + 1); $("#tSkip").onclick = () => { $$(".tour-hl,.tour-box").forEach(e => e.remove()); localStorage.setItem("civi.tour", "done"); }; $("#tPrev") && ($("#tPrev").onclick = () => startTour(i - 1));
}
addEventListener("keydown", e => { if (e.key === "Escape") { $(".tour-box") && $("#tSkip").click(); $("#chat")?.remove(); closeModal(); } });

Object.assign(ROUTES, { directory: viewDirectory2, academy: viewAcademy2, howto: viewHowto, saved: viewSaved, help: viewHelp, faq: () => { viewHelp(); setTimeout(() => $("#faq")?.scrollIntoView(), 50); } });
loadMe().then(syncFavsFromServer);
setTimeout(() => { if (!localStorage.getItem("civi.tour") && (location.hash || "#/map").startsWith("#/map")) { localStorage.setItem("civi.hint", 1); $("#hint")?.remove(); startTour(); } }, 1600);

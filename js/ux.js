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
function score(item, words) { const hay = norm([item.name, item.name_tl, item.abbr, item.desc, item.desc_tl, item.cat, item.industry, item.role, item.ticker].join(" ")); let s = 0;
  words.forEach(w => { if (w.length < 2) return; if (new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "")).test(hay)) s += 3; else if (hay.includes(w)) s += 1; }); return s; }
const STOP = new Set("ng sa ang na mga ko ako ka mo si ni kay at ay para po the a an of for to my i me in on is and or how what ano paano saan".split(" "));
const expand = q => { const ws = norm(q).split(/[^a-z0-9-]+/).filter(w => w && !STOP.has(w)); return [...new Set(ws.flatMap(w => [w, ...(SYN[w] || Object.entries(SYN).find(([k]) => k.length > 3 && w.startsWith(k))?.[1] || "").split(" ").filter(Boolean)]))]; };
const shortD = (x, n = 90) => { x = String(x || ""); return x.length > n ? x.slice(0, Math.max(40, x.lastIndexOf(" ", n - 2))) + "…" : x; };
const dirName = i => (state.lang === "tl" && i.name_tl) ? i.name_tl : i.name;
const dirDesc = i => (state.lang === "tl" && (i.desc_tl || i.note_tl)) ? (i.desc_tl || i.note_tl) : (i.desc || i.note || "");
Object.assign(CIVI_I18N.en, { view_service: "View service", ai_suggested: "AI suggested", dir_cats: "Categories", dir_all: "All services", community_run: "Community-run", data_updates: "Data subject to update", ask_ai: "Ask AI", "Learning & civic resources": "Learning & civic resources", "Civic know-how": "Civic know-how", "Free courses": "Free courses" });
Object.assign(CIVI_I18N.tl, { view_service: "Tingnan ang serbisyo", ai_suggested: "Mungkahi ng AI", dir_cats: "Mga kategorya", dir_all: "Lahat ng serbisyo", community_run: "Community-run", data_updates: "Puwedeng magbago ang datos", ask_ai: "Magtanong sa AI", "Learning & civic resources": "Pag-aaral at sibika", "Civic know-how": "Kaalaman sa sibika", "Free courses": "Libreng kurso" });
const DIR_GROUPS = [["Emergencies", ["Emergency & hotlines", "Life & safety", "Consumer complaints"]], ["Government", ["Executive departments", "Agencies & GOCCs", "Constitutional bodies & courts", "Legislature", "Public officials", "Government services", "Legal aid & rights", "Data, laws & documents", "Civic tech & community-built"]], ["Health", ["Health", "Health & wellness apps/sites", "Mental health"]], ["Work & money", ["OFW services", "Jobs & livelihood", "Earn: Iwas scam", "Earn: Small gigs", "Earn: Freelance", "Earn: Surveys & micro-tasks", "Earn: Sell online", "Earn: Content creation", "Earn: Rider & delivery", "Earn: Teach & tutor", "Money & finance", "Find any business", "Companies (PSE-listed)"]], ["Learning", ["Learning & scholarships", "Learning centers & tutorials", "Free language & online courses", "Learn farming: Free", "Learn farming: Paid / audit-free", "Scholarships"]], ["Learning & civic resources", ["Civic know-how", "Free courses"]], ["Getting around", ["Transport: Land", "Transport: Air", "Transport: Water", "Telecom & utilities", "Post & couriers", "Must-have apps in PH"]], ["Community", ["Volunteer & NGOs", "Embassies", "Sports & fitness", "Events & activities", "Events & things to do", "Promos, sales & discounts", "Meetups & conferences", "Places & travel"]], ["Environment", ["Recycle & drop-off programs"]], ["Transparency", ["FY 2026 budget"]]];
const dirHost = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const groupOf = cat => { for (const [name, subs] of DIR_GROUPS) if (subs.includes(cat)) return name; return "More"; };
const svcCard = i => { const name = dirName(i), desc = dirDesc(i); return `<article class="svc">${favBtn(i._type || "directory", i.abbr || i.name, name, i.url)}<h3>${esc(i.role ? i.role + ": " + name : name)}</h3><div class="tags"><span class="chip">${esc(t(i.group || ""))}</span><span class="chip">${esc(t(i.cat))}</span>${i.official ? `<span class="okmark" title="${esc(t("official"))}">✓</span>` : ""}</div><div class="dom">${esc(dirHost(i.url))}</div>${i.phone ? `<div class="dom">☎ <a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></div>` : ""}<p class="dshort" title="${esc(desc)}">${esc(shortD(desc))}</p>${i.community ? `<p class="dsrc">${esc(t("community_run"))}. ${esc(t("data_updates"))}.</p>` : ""}${i.asof ? `<p class="dsrc">${esc(t("asof"))} ${esc(i.asof)}</p>` : ""}<a class="btn sm svc-go" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(t("view_service"))}</a></article>`; };
const schCard = x => `<div class="card glass dcard"><span class="chip ${x.scope === "Local" ? "ok" : ""}">${esc(x.scope)}</span> <span class="chip">${esc((x.levels || []).join("/"))}</span><h4>${esc(x.name)}</h4><p class="dshort" title="${esc(x.eligibility || "")}">${esc(x.provider || "")} · ${esc(shortD(x.coverage, 70))}</p><a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(t("view_service"))}</a></div>`;
async function viewDirectory2() {
  const [hub, gov, off, co, ct, dm, sch, acad] = await Promise.all([data("directory_hub"), data("gov_directory"), data("officials"), data("companies"), data("civic_transport").catch(() => ({ items: [] })), data("directory_more").catch(() => ({ items: [] })), data("scholarships").catch(() => ({ items: [] })), data("academy").catch(() => ({ online: [], offline: [] }))]);
  const mark = (list, official) => list.map(i => ({ ...i, official: official || i.official || i.label === "Government", group: groupOf(i.cat), _type: i._type || "directory" }));
  const govHost = u => { try { return new URL(u).hostname.endsWith(".gov.ph"); } catch { return false; } };
  const extNote = acad.note || "External link. Civi does not host this page.";
  const extNoteTl = acad.note_tl || extNote;
  const learn = [
    ...CIVIC.map(([name, url, desc, name_tl, desc_tl]) => ({ name, name_tl, url, desc: `${desc} ${extNote}`, desc_tl: `${desc_tl} ${extNoteTl}`, cat: "Civic know-how", official: govHost(url), asof: acad.as_of || "", _type: "directory" })),
    ...(acad.online || []).map(c => ({ name: c.name, url: c.url, desc: `${c.by || ""}${c.tags ? " · " + c.tags : ""}. ${extNote}`, desc_tl: `${c.by || ""}${c.tags ? " · " + c.tags : ""}. ${extNoteTl}`, cat: "Free courses", official: govHost(c.url), asof: acad.as_of || "", _type: "directory" })),
    ...(acad.offline || []).map(c => ({ name: c.name, url: c.url, desc: `${c.by || ""}${c.tags ? " · " + c.tags : ""}. ${extNote}`, desc_tl: `${c.by || ""}${c.tags ? " · " + c.tags : ""}. ${extNoteTl}`, cat: /PAGASA|PHIVOLCS/i.test(c.name) ? "Civic know-how" : "Free courses", official: govHost(c.url), asof: acad.as_of || "", _type: "directory" }))
  ];
  const all = [...mark(hub.items, true), ...mark(gov.items, true), ...mark(ct.items || [], true), ...mark(dm.items || [], false), ...mark(learn, false), ...mark(off.items.map(i => ({ ...i, cat: "Public officials", _type: "official" })), true), ...mark(co.items.map(i => ({ ...i, cat: "Companies (PSE-listed)", desc: `${i.industry} · ${co.source}`, _type: "company" })), false), { name: "BetterGov FY 2026 Budget Dashboard", url: "https://2026-budget.bettergov.ph/", cat: "FY 2026 budget", desc: "Community-run dashboard of the FY 2026 national budget. Not a government website.", community: true, official: false, group: "Transparency", _type: "directory" }];
  const known = new Set(DIR_GROUPS.flatMap(g => g[1]));
  const extra = [...new Set(all.map(i => i.cat))].filter(c => !known.has(c));
  const groups = [...DIR_GROUPS.map(([name, subs]) => ({ name, subs: subs.filter(s => all.some(i => i.cat === s)) })), ...(extra.length ? [{ name: "More", subs: extra }] : [])].filter(g => g.subs.length);
  const cats = groups.flatMap(g => g.subs);
  const hashSub = decodeURIComponent((location.hash.split("?")[0].split("/")[2] || ""));
  const q0 = new URLSearchParams((location.hash.split("?")[1] || "")).get("q") || "";
  let group = "", sub = "", words = q0 ? expand(q0) : [], aiChips = [], aiNote = "", shown = 12, recShown = 4;
  if (hashSub) { const g = groups.find(x => x.subs.some(s => s === hashSub || norm(s) === norm(hashSub))); if (g) { group = g.name; sub = g.subs.find(s => s === hashSub || norm(s) === norm(hashSub)); } }
  const RECYCLE = "Recycle & drop-off programs";
  const browsing = () => !group && !sub && !words.length;
  const inGroup = i => !group || i.group === group;
  const hits = () => all.filter(i => (!sub || i.cat === sub) && inGroup(i) && (!words.length || score(i, words) >= 3 || words.some(w => w.length > 2 && norm([i.name, i.name_tl, i.desc, i.desc_tl, i.cat].join(" ")).includes(w))));
  const sideBtn = (name, on, kind, val) => `<button type="button" class="${on ? "on" : ""}" data-kind="${kind}" data-v="${esc(val)}">${esc(name)}</button>`;
  page(`<h1>📇 ${t("dir_title")}</h1><p class="sub">${t("directory_sub")}</p>
   <form class="dir-search glass" role="search" id="dirSearch"><input type="search" id="needQ" placeholder="${esc(t("need_ph"))}" aria-label="${esc(t("need_q"))}" value="${esc(q0)}"><button type="submit" class="btn" id="needAI">${esc(t("ask_ai"))}</button></form>
   <div id="aiLine" class="ai-line" aria-live="polite"></div>
   <div class="disc">${t("d_emerg")} ${t("dir_disc")} ${t("d_third")} ${t("dm_note")}</div>
   <div class="row" style="margin-bottom:8px"><button type="button" class="btn ghost sm" id="dirCats" aria-expanded="false" aria-controls="dirSide">${esc(t("dir_cats"))}</button><button type="button" class="btn ghost sm" id="reqAdd">➕ ${t("req_btn")}</button></div>
   <div id="dirChips" class="dir-chips" role="tablist"></div>
   <div id="schRow"></div>
   <div class="dir-layout">
     <nav id="dirSide" class="dir-side glass" aria-label="${esc(t("dir_cats"))}"></nav>
     <div>
       <section id="recycleBox" aria-label="${esc(t(RECYCLE))}"></section>
       <p id="svcCount" class="sub"></p>
       <div id="svcGrid" class="svc-grid"></div>
       <button type="button" class="btn ghost" id="svcMore" hidden>${t("see_more")}</button>
       <p class="sub" style="font-size:11px;margin-top:12px">${esc(gov.note || "")} ${esc(co.note || "")} ${co.url ? `<a href="${esc(co.url)}" target="_blank" rel="noopener">PSE EDGE ↗</a>` : ""}</p>
     </div>
   </div>`);
  if ((sch.items || []).length) { $("#schRow").innerHTML = rowc("sch", "🎓 " + esc(t("scholarships")), sch.items.map(schCard), "", "#/scholarships"); wireCarousels($("#schRow")); }
  const paintSide = () => {
    $("#dirSide").innerHTML = sideBtn(t("dir_all"), !group && !sub, "all", "") + groups.map(g => `<details ${g.name === group || g.subs.includes(sub) ? "open" : ""}><summary>${esc(t(g.name))}</summary>${g.subs.map(s => sideBtn(t(s), sub === s, "sub", s)).join("")}</details>`).join("");
    $("#dirChips").innerHTML = sideBtn(t("dir_all"), !group, "all", "") + groups.map(g => sideBtn(t(g.name), group === g.name, "group", g.name)).join("");
    $$("#dirSide [data-kind], #dirChips [data-kind]").forEach(b => b.onclick = () => {
      if (b.dataset.kind === "all") { group = ""; sub = ""; } else if (b.dataset.kind === "group") { group = b.dataset.v; sub = ""; } else { sub = b.dataset.v; group = groupOf(sub); }
      shown = 12; recShown = 4; $("#dirSide").classList.remove("open"); $("#dirCats").setAttribute("aria-expanded", "false");
      const next = sub ? "#/directory/" + encodeURIComponent(sub) : "#/directory";
      if (location.hash.split("?")[0] !== next) history.replaceState(null, "", next);
      paint();
    });
  };
  const paint = () => {
    paintSide();
    const list = hits();
    const home = browsing();
    $("#schRow").hidden = !home;
    const rec = all.filter(i => i.cat === RECYCLE);
    const showRec = (home || sub === RECYCLE || (group === "Environment" && !sub)) && !words.length;
    $("#recycleBox").hidden = !showRec;
    $("#recycleBox").innerHTML = showRec ? `<h2>${esc(t(RECYCLE))} <span class="chip">${rec.length}</span></h2><div class="svc-grid">${rec.slice(0, recShown).map(svcCard).join("")}</div>${rec.length > recShown ? `<button type="button" class="btn ghost sm" id="recMore">${t("see_more")}</button>` : ""}` : "";
    $("#recMore") && ($("#recMore").onclick = () => { recShown += 6; paint(); });
    const grid = list.filter(i => !(showRec && i.cat === RECYCLE));
    $("#svcCount").textContent = grid.length ? String(grid.length) : "";
    $("#svcGrid").innerHTML = grid.length ? grid.slice(0, shown).map(svcCard).join("") : (showRec ? "" : `<p>${t("no_match")}</p>`);
    const more = $("#svcMore"); more.hidden = grid.length <= shown; 
    $("#aiLine").innerHTML = aiChips.length ? `<span class="chip ok">${esc(t("ai_suggested"))}</span> ${aiChips.map(k => `<button type="button" class="chip" data-ai="${esc(k)}">${esc(k)}</button>`).join(" ")}` : (aiNote ? `<span class="sub">${esc(aiNote)}</span>` : "");
    $$("#aiLine [data-ai]").forEach(b => b.onclick = () => { $("#needQ").value = b.dataset.ai; words = expand(b.dataset.ai); aiChips = []; aiNote = ""; shown = 12; paint(); });
  };
  paint();
  $("#svcMore").onclick = () => { shown += 12; paint(); };
  $("#dirCats").onclick = () => { const open = $("#dirSide").classList.toggle("open"); $("#dirCats").setAttribute("aria-expanded", open); };
  $("#reqAdd").onclick = () => requestListing(cats); if (new URLSearchParams(location.hash.split("?")[1] || "").get("add")) requestListing(cats);
  let tmr; $("#needQ").oninput = e => { clearTimeout(tmr); tmr = setTimeout(() => { words = expand(e.target.value); aiChips = []; aiNote = ""; shown = 12; paint(); }, 120); };
  $("#dirSearch").onsubmit = async e => { e.preventDefault(); const q = $("#needQ").value.trim(); if (!q) return $("#needQ").focus(); $("#aiLine").innerHTML = `<span class="sub">✨ ${esc(t("thinking"))}</span>`;
    const r = await api("assist", { method: "POST", body: { mode: "directory", q } });
    if (r.keywords?.length) { aiChips = r.keywords; aiNote = ""; words = [...expand(q), ...r.keywords.flatMap(expand)]; } else { aiChips = []; aiNote = t("kw_mode"); words = expand(q); }
    shown = 12; paint(); };
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
const CIVIC = [
  ["Read the national budget", "https://www.dbm.gov.ph/", "DBM publishes the GAA and budget documents.", "Basahin ang pambansang budget", "Inilalathala ng DBM ang GAA at mga dokumento ng budget."],
  ["File an FOI request", "https://www.foi.gov.ph/", "Ask executive agencies for documents.", "Mag-file ng FOI request", "Humingi ng dokumento sa mga executive agency."],
  ["Know your data rights (RA 10173)", "https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html", "Rights to be informed, access, correct, and erase.", "Alamin ang data rights (RA 10173)", "Karapatang malaman, ma-access, maitama, at mabura."],
  ["Find laws and cases", "https://lawphil.net/", "LawPhil: statutes and jurisprudence, free.", "Maghanap ng batas at kaso", "LawPhil: batas at jurisprudence, libre."],
  ["Check government bids", "https://notices.philgeps.gov.ph/", "PhilGEPS procurement notices.", "Tingnan ang government bids", "Mga abiso ng procurement sa PhilGEPS."],
  ["Explore official statistics", "https://openstat.psa.gov.ph/", "PSA OpenSTAT tables and API.", "Tingnan ang opisyal na istatistika", "Mga talahanayan at API ng PSA OpenSTAT."],
  ["Open Data Philippines", "https://data.gov.ph/", "Government datasets.", "Open Data Philippines", "Mga dataset ng gobyerno."]
];
const howAll = async () => {
  const [h, e, lf] = await Promise.all([data("howto"), data("howto_earn").catch(() => ({ items: [] })), data("howto_life").catch(() => ({ items: [] }))]);
  const W = await data("howto_work").catch(() => ({ items: [] })), G = await data("howto_gov").catch(() => ({ items: [] }));
  const stamp = file => (file.items || []).map(x => ({ ...x, _note: file.note || "", _note_tl: file.note_tl || "", _asof: file.as_of || "" }));
  return { ...h, note_tl: h.note_tl || "", items: [...stamp(h), ...stamp(e), ...stamp(lf), ...stamp(W), ...stamp(G)] };
};
const howTl = () => state.lang === "tl";
const howPick = (en, tl) => (howTl() && tl != null && tl !== "" && !(Array.isArray(tl) && !tl.length) ? tl : en);
const cleanStep = s => {
  const parts = String(s == null ? "" : s).split(/\s*[☐□▢☑]\s*/).map(x => x.trim()).filter(Boolean);
  if (parts.length <= 1) return (parts[0] || "").replace(/\s{2,}/g, " ");
  if (/^checklist\b/i.test(parts[0])) return `${parts[0].replace(/:?\s*$/, ":")} ${parts.slice(1).join(" · ")}`.replace(/\s{2,}/g, " ");
  return parts.join(" · ");
};
const howTitle = h => howPick(h.title, h.title_tl);
const howSteps = h => (howPick(h.steps, h.steps_tl) || []).map(cleanStep);
const howTip = h => { const tip = howPick(h.tip, h.tip_tl); return tip ? cleanStep(tip) : ""; };
const howNote = h => howPick(h._note || "", h._note_tl || "");
const howRelated = h => { const q = h.related || []; const labels = howPick(h.related_en || q, h.related_tl || h.related_en || q); return q.map((query, i) => ({ q: query, label: labels[i] || query })); };
const flatSecs = c => c.modules.flatMap(m => m.sections);
const courseStat = c => { const s = flatSecs(c), d = s.filter(sectionComplete).length; return { d, n: s.length, p: s.length ? Math.round(100 * d / s.length) : 0 }; };
const estMin = c => flatSecs(c).length * 4;
const timeLabel = m => { if (m < 60) return `${t("est_time")} ${m} ${t("min_unit")}`; const h = Math.floor(m / 60), r = m % 60; return `${t("est_time")} ${h} ${t("hr_unit")}${r ? " " + r + " " + t("min_unit") : ""}`; };
const courseHref = (c, sec) => "#/course/" + encodeURIComponent(c.id) + (sec ? "/" + encodeURIComponent(sec.id) : "");
const badgeKey = id => "civi.badge.course." + id;
function sectionComplete(sec) {
  if (!sec) return false;
  const v = localStorage.getItem("civi.sec." + sec.id);
  if (v === "1") return true;
  if (v === "0") return false;
  try {
    const old = JSON.parse(localStorage.getItem("civi.howto." + sec.id) || "[]");
    if (Array.isArray(old) && (sec.steps || []).length && old.length >= sec.steps.length) { localStorage.setItem("civi.sec." + sec.id, "1"); return true; }
  } catch {}
  return false;
}
function syncCourseBadge(c) {
  const { d, n } = courseStat(c);
  if (n && d >= n) { if (!localStorage.getItem(badgeKey(c.id))) localStorage.setItem(badgeKey(c.id), new Date().toISOString().slice(0, 10)); }
  else localStorage.removeItem(badgeKey(c.id));
  return localStorage.getItem(badgeKey(c.id)) || "";
}
const hostOf = u => { try { return new URL(u, location.origin).hostname.replace(/^www\./, ""); } catch { return ""; } };
const extAttrs = u => String(u).startsWith("#") ? "" : ' target="_blank" rel="noopener"';
async function loadCourses() {
  const [cat, topics, how] = await Promise.all([data("academy_courses"), data("howto_topics").catch(() => ({ items: [] })), howAll()]);
  const byId = new Map();
  how.items.forEach(x => byId.set(x.id, x));
  (topics.items || []).forEach(x => byId.set(x.id, { ...x, _note: topics.note || "", _note_tl: topics.note_tl || "", _asof: topics.as_of || x._asof || "" }));
  const courses = (cat.courses || []).map(c => ({ ...c, modules: (c.modules || []).map(m => ({ ...m, sections: (m.sections || []).map(id => byId.get(id)).filter(Boolean) })).filter(m => m.sections.length) })).filter(c => c.modules.length);
  return { as_of: cat.as_of || how.as_of || "", courses, how };
}
const courseFind = c => norm([c.title, c.title_tl, c.id, ...c.modules.flatMap(m => [m.title, m.title_tl, ...m.sections.flatMap(s => [s.title, s.title_tl, ...(s.steps || []), ...(s.steps_tl || [])])])].join(" "));
const illAlt = o => howPick(o && o.ill_alt, o && o.ill_alt_tl);
const illImg = (file, alt, cls) => `<div class="${cls}"><img src="/assets/courses/${esc(file || "civics.svg")}" alt="${esc(alt || "")}" width="128" height="72" loading="lazy" decoding="async"></div>`;
const acCard = c => {
  const st = courseStat(c), secs = flatSecs(c), next = secs.find(s => !sectionComplete(s)) || secs[0], href = courseHref(c, next), when = localStorage.getItem(badgeKey(c.id));
  return `<article class="ac-card card glass" data-find="${esc(courseFind(c))}">${favBtn("course", c.id, howPick(c.title, c.title_tl), href)}
    <a class="ac-go" href="${href}">${illImg(c.ill, illAlt(c), "ac-plate")}
    <h2><span aria-hidden="true">${esc(c.icon || "")}</span> ${esc(howPick(c.title, c.title_tl))}</h2>
    <p class="ac-meta"><span>${st.n} ${t("sections")}</span><span>· ${timeLabel(estMin(c))}</span>${when ? `<span>· ✓ ${esc(t("completed"))}</span>` : ""}</p>
    <progress max="${st.n || 1}" value="${st.d}" aria-label="${esc(t("course_progress"))}"></progress><span class="ac-pct">${st.p}%</span></a></article>`;
};
async function viewAcademy2() {
  const pack = await loadCourses();
  page(`<h1>🎓 ${t("nav_academy")}</h1><p class="sub">${t("acad_sub")}</p>
   <div class="smart glass" role="search"><span style="font-size:22px" aria-hidden="true">🔎</span><input type="search" id="acQ" placeholder="${esc(t("acad_q"))}" aria-label="${esc(t("acad_q"))}"><button class="btn" id="acAI" title="${esc(t("ai_hint"))}">✨ ${t("ask")}</button></div>
   <p id="acNote" class="sub"></p>
   <div id="acGrid" class="ac-grid">${pack.courses.map(acCard).join("")}</div>
   <div id="acHits"></div>
   <p class="sub sims-note"><a href="#/sim">${esc(t("sim_title"))}</a> — ${esc(t("sim_blurb"))}</p>`);
  let words = [];
  const show = () => {
    const cards = $$("#acGrid .ac-card");
    let n = 0;
    cards.forEach(el => { const on = !words.length || words.some(w => (el.dataset.find || "").includes(w)); el.hidden = !on; if (on) n++; });
    const hits = !words.length ? [] : pack.courses.flatMap(c => flatSecs(c).filter(s => words.some(w => norm(howTitle(s) + " " + (s.title_tl || "")).includes(w))).slice(0, 3).map(s => ({ c, s }))).slice(0, 8);
    $("#acHits").innerHTML = hits.length ? `<h2>${t("best_matches")}</h2><ul class="ac-hits">${hits.map(({ c, s }) => `<li><a href="${courseHref(c, s)}">${esc(howTitle(s))}</a> <span class="sub">${esc(howPick(c.title, c.title_tl))}</span></li>`).join("")}</ul>` : "";
    $("#acNote").textContent = words.length ? `${n} ${t("courses_n")}` : "";
  };
  let tmr; $("#acQ").oninput = e => { clearTimeout(tmr); tmr = setTimeout(() => { words = expand(e.target.value); show(); }, 120); };
  $("#acAI").onclick = async () => {
    const q = $("#acQ").value.trim(); if (!q) return $("#acQ").focus();
    $("#acNote").textContent = "✨ " + t("thinking");
    const r = await api("assist", { method: "POST", body: { mode: "academy", q } });
    words = [...expand(q), ...(r.keywords || []).flatMap(expand)];
    show();
    if (r.keywords?.length) $("#acNote").textContent = "AI: " + r.keywords.join(", ");
  };
}
Object.assign(CIVI_I18N.en, { guide_level: "Guide", lessons: "Sections", course_done: "Section complete", prev_lesson: "Previous", next_lesson: "Next",
  quiz_title: "Quick quiz", quiz_check: "Check answers", quiz_pass: "Passed. Mark the section complete so it counts toward the badge.", quiz_retry: "{ok}/{n} correct — try again.", quiz_passed: "Already passed", quiz_progress: "Course progress", modules: "modules", badge_civics: "Civi Civics Badge", badge_gov: "I know how our government works", quiz_sources: "Sources are listed above. Checked 2026-10-29. No current official is named.",
  sim_title: "If You Were President", sim_ph: "Why this budget?", sim_share_as: "If I were President: ",
  acad_sub: "In-house courses for everyday life in the Philippines. One course per topic. Official sources only.",
  acad_q: "Search courses: passport, typhoon, PhilHealth",
  sections: "sections", est_time: "est.", min_unit: "min", hr_unit: "hr", mark_complete: "Mark as complete", completed: "Completed",
  course_progress: "Course progress", module_progress: "Module progress", open_outline: "Sections", courses_n: "courses",
  disc_safe: "Safety information is general. Follow PAGASA, PHIVOLCS, NDRRMC, OCD, your LGU, and 911. This is not a rescue service.",
  disc_med: "General information, not medical advice. In an emergency call 911. Ask a licensed professional about your own care.",
  disc_legal: "General information, not legal advice. Requirements and fees change. Read the official page.",
  disc_fin: "General information, not financial, tax, or benefits advice. Check the agency for current rules.",
  badge_course: "Course complete", sources: "Sources", progress_local: "Your section progress is saved only on this device.",
  "Paano Kumita Online": "Earning online", "Paano tumatakbo ang gobyerno natin": "How our government works", "Mga industriya sa Pilipinas": "Industries in the Philippines", "Buhay at kabuhayan": "Life & money skills", "Pagsasaka at kalikasan": "Farming & nature", "Paano magsimula ng negosyo": "How to start a business", "Earn: Iwas scam": "Earn: Avoid scams", "Zoos, parks & pasyalan": "Zoos, parks and places to visit" });
Object.assign(CIVI_I18N.tl, { guide_level: "Gabay", lessons: "Mga seksyon", course_done: "Tapos na ang seksyon", prev_lesson: "Nakaraan", next_lesson: "Susunod",
  quiz_title: "Mabilisang quiz", quiz_check: "Suriin ang sagot", quiz_pass: "Pasado. Markahang tapos ang seksyon para mabilang ito sa badge.", quiz_retry: "{ok}/{n} tama — subukan ulit.", quiz_passed: "Pasado na", quiz_progress: "Progreso ng kurso", modules: "mga module", badge_civics: "Civi Civics Badge", badge_gov: "Alam ko kung paano tumatakbo ang gobyerno natin", quiz_sources: "Nasa itaas ang mga source. Sinuri noong 2026-10-29. Walang pinangalanang kasalukuyang opisyal.",
  sim_title: "Kung Ikaw ang Presidente", sim_ph: "Bakit ganito ang budget mo?", sim_share_as: "Kung ako ang Presidente: ",
  acad_sub: "Mga kursong ginawa sa Civi para sa araw-araw na buhay sa Pilipinas. Isang kurso bawat paksa. Opisyal na source lang.",
  acad_q: "Maghanap ng kurso: pasaporte, bagyo, PhilHealth",
  sections: "seksyon", est_time: "tantiya", min_unit: "min", hr_unit: "oras", mark_complete: "Markahang tapos", completed: "Tapos na",
  course_progress: "Progreso ng kurso", module_progress: "Progreso ng module", open_outline: "Mga seksyon", courses_n: "mga kurso",
  disc_safe: "Pangkalahatan ang impormasyon sa kaligtasan. Sundin ang PAGASA, PHIVOLCS, NDRRMC, OCD, ang LGU mo, at ang 911. Hindi ito serbisyong pagsagip.",
  disc_med: "Pangkalahatang impormasyon, hindi medikal na payo. Kung emergency, tumawag sa 911. Magtanong sa lisensyadong propesyonal tungkol sa sarili mong pangangalaga.",
  disc_legal: "Pangkalahatang impormasyon, hindi legal na payo. Nagbabago ang requirement at bayad. Basahin ang opisyal na pahina.",
  disc_fin: "Pangkalahatang impormasyon, hindi payo sa pera, buwis, o benepisyo. Tingnan ang ahensya para sa kasalukuyang patakaran.",
  badge_course: "Tapos na ang kurso", sources: "Mga source", progress_local: "Sa device na ito lang naka-save ang progreso ng seksyon.",
  "Paano Kumita Online": "Paano kumita online", "Paano tumatakbo ang gobyerno natin": "Paano tumatakbo ang gobyerno natin", "Mga industriya sa Pilipinas": "Mga industriya sa Pilipinas", "Buhay at kabuhayan": "Buhay at kabuhayan", "Pagsasaka at kalikasan": "Pagsasaka at kalikasan", "Paano magsimula ng negosyo": "Paano magsimula ng negosyo", "Career roles 101": "Mga role sa trabaho", "Earn: Iwas scam": "Kumita: Iwas scam", "Zoos, parks & pasyalan": "Zoo, parke at mga pasyalan" });
async function viewHowto() {
  const pack = await loadCourses();
  const parts = (location.hash.replace(/^#\//, "").split("?")[0] || "").split("/").map(decodeURIComponent);
  const qid = new URLSearchParams((location.hash.split("?")[1] || "")).get("id");
  let course, sec;
  if (parts[0] === "course" && parts[1]) {
    const want = parts[2] || qid;
    course = pack.courses.find(c => c.id === parts[1]);
    sec = course && flatSecs(course).find(s => s.id === want);
    if (!sec && want) {
      const owner = pack.courses.find(c => flatSecs(c).some(s => s.id === want));
      if (owner) { course = owner; sec = flatSecs(owner).find(s => s.id === want); }
    }
    if (course && !sec) sec = flatSecs(course)[0];
  } else if (qid) {
    course = pack.courses.find(c => flatSecs(c).some(s => s.id === qid));
    sec = course && flatSecs(course).find(s => s.id === qid);
  }
  if (!course || !sec) return viewAcademy2();
  const secs = flatSecs(course);
  const idx = Math.max(0, secs.findIndex(s => s.id === sec.id));
  const prev = secs[idx - 1], next = secs[idx + 1];
  const steps = howSteps(sec), tip = howTip(sec), rel = howRelated(sec);
  const sources = [];
  const seen = new Set();
  secs.forEach(s => { if (s.src && !seen.has(s.src)) { seen.add(s.src); sources.push(s.src); } });
  const asof = sec._asof || pack.as_of;
  const disc = course.disclaimer && t("disc_" + course.disclaimer) !== "disc_" + course.disclaimer ? t("disc_" + course.disclaimer) : t("not_advice");
  const mod = course.modules.find(m => m.sections.some(s => s.id === sec.id));
  const modPct = m => { const d = m.sections.filter(sectionComplete).length, n = m.sections.length; return { d, n, p: n ? Math.round(100 * d / n) : 0 }; };
  const outline = course.modules.map(m => {
    const mp = modPct(m);
    return `<details class="toc-mod" ${m.sections.some(s => s.id === sec.id) ? "open" : ""}><summary>${esc(howPick(m.title, m.title_tl))} <span>${mp.d}/${mp.n} · ${mp.p}%</span></summary>
      <progress id="mod-${esc(m.id)}" max="${mp.n}" value="${mp.d}" aria-label="${esc(t("module_progress"))}: ${esc(howPick(m.title, m.title_tl))} ${mp.p}%"></progress>
      <div class="toc-list">${m.sections.map(s => `<a class="${s.id === sec.id ? "on" : ""}" href="${courseHref(course, s)}"><span>${sectionComplete(s) ? "✓" : "·"}</span>${esc(howTitle(s))}</a>`).join("")}</div></details>`;
  }).join("");
  const st = courseStat(course);
  const when = syncCourseBadge(course);
  const done = sectionComplete(sec);
  const secLinks = (sec.links || []).map(([n, u]) => `<a href="${esc(u)}"${extAttrs(u)}>${esc(n)}${String(u).startsWith("#") ? "" : " ↗"}</a>`).join(" · ");
  page(`<p><a href="#/academy">← ${t("nav_academy")}</a></p>
   <article class="course">
     <button type="button" class="btn ghost sm course-toc" id="tocBtn" aria-expanded="false" aria-controls="toc">${t("open_outline")}</button>
     <nav id="toc" class="course-side glass" aria-label="${esc(t("lessons"))}">
       <b>${esc(howPick(course.title, course.title_tl))}</b>
       <progress id="courseBar" max="${st.n || 1}" value="${st.d}" aria-label="${esc(t("course_progress"))}"></progress>
       <span id="coursePct" class="sub">${st.p}%</span>
       ${outline}
     </nav>
     <div class="course-main card glass">
       <header class="course-head">
         ${favBtn("howto", sec.id, howTitle(sec), courseHref(course, sec))}
         ${illImg(mod && mod.ill || course.ill, illAlt(mod) || illAlt(course), "ac-plate ac-plate-sm")}
         <p class="sub course-kicker">${esc(course.icon || "")} ${esc(howPick(course.title, course.title_tl))}</p>
         <h1>${esc(howTitle(sec))}</h1>
         <p class="course-meta"><span>${timeLabel(estMin(course))}</span><span>${st.n} ${t("sections")}</span><span>${idx + 1}/${secs.length}</span></p>
         <p class="course-src"><span>${t("sources")}:</span> ${sources.slice(0, 8).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(hostOf(u))} ↗</a>`).join(" · ")}${sources.length > 8 ? ` <span class="sub">+${sources.length - 8}</span>` : ""}</p>
         <p class="sub">${t("asof")} ${esc(asof)}</p>
         <progress id="lessonBar" max="${st.n || 1}" value="${st.d}" aria-label="${esc(t("course_progress"))}"></progress><span id="lessonPct" class="sub">${st.p}%</span>
       </header>
       <div class="disc">📅 ${esc(howNote(sec) || pack.how.note || "")} ${esc(disc)}</div>
       <ol class="steps">${steps.map((s, n) => `<li class="step-card plain"><span class="step-n" aria-hidden="true">${n + 1}</span><p class="step-t">${esc(s)}</p></li>`).join("")}</ol>
       ${tip ? `<div class="disc">💡 ${esc(tip)}</div>` : ""}
       ${rel.length ? `<p>🔗 ${t("see_more")}: ${rel.map(r => `<a href="#/directory?q=${encodeURIComponent(r.q)}">${esc(r.label)}</a>`).join(" · ")}</p>` : ""}
       ${secLinks ? `<p>🌐 ${secLinks}</p>` : ""}
       ${sec.src ? `<p class="sub">${t("source")}: <a href="${esc(sec.src)}"${extAttrs(sec.src)}>${esc(hostOf(sec.src) || sec.src)} ↗</a></p>` : ""}
       <button type="button" class="btn" id="markSec" aria-pressed="${done ? "true" : "false"}">${done ? esc(t("completed")) + " ✓" : esc(t("mark_complete"))}</button>
       <div id="courseBadge" class="course-badge" role="status" ${when ? "" : "hidden"}>${when ? "🏅 " + esc(t("badge_course")) + " · " + esc(when) : ""}</div>
       ${window.civiQuizHTML ? window.civiQuizHTML(sec, pack.how) : ""}
       <div class="course-nav"><a class="btn ghost ${prev ? "" : "is-off"}" ${prev ? `href="${courseHref(course, prev)}"` : 'aria-disabled="true" tabindex="-1"'}>‹ ${t("prev_lesson")}</a><a class="btn ${next ? "" : "is-off"}" ${next ? `href="${courseHref(course, next)}"` : 'aria-disabled="true" tabindex="-1"'}>${t("next_lesson")} ›</a></div>
       <p class="sub" style="font-size:11px">${t("progress_local")}</p>
     </div>
   </article>`);
  const paint = () => {
    const stat = courseStat(course);
    const bar = $("#courseBar"), pct = $("#coursePct"), lesson = $("#lessonBar");
    if (bar) bar.value = stat.d; if (pct) pct.textContent = stat.p + "%"; if (lesson) lesson.value = stat.d;
    const lessonPct = $("#lessonPct"); if (lessonPct) lessonPct.textContent = stat.p + "%";
    course.modules.forEach(m => { const el = document.getElementById("mod-" + m.id); if (!el) return; const d = m.sections.filter(sectionComplete).length; el.value = d; const sum = el.parentElement?.querySelector("summary span"); if (sum) sum.textContent = d + "/" + el.max + " · " + (el.max ? Math.round(100 * d / el.max) : 0) + "%"; });
    $$("#toc .toc-list a").forEach(a => { const id = decodeURIComponent((a.getAttribute("href") || "").split("/").pop()); const s = secs.find(x => x.id === id); if (!s) return; const mark = a.querySelector("span"); if (mark) mark.textContent = sectionComplete(s) ? "✓" : "·"; });
    const on = sectionComplete(sec), btn = $("#markSec");
    if (btn) { btn.setAttribute("aria-pressed", on ? "true" : "false"); btn.textContent = on ? t("completed") + " ✓" : t("mark_complete"); }
    const whenNow = syncCourseBadge(course), badge = $("#courseBadge");
    if (badge) { badge.hidden = !whenNow; badge.textContent = whenNow ? "🏅 " + t("badge_course") + " · " + whenNow : ""; }
  };
  $("#markSec").onclick = () => { localStorage.setItem("civi.sec." + sec.id, sectionComplete(sec) ? "0" : "1"); paint(); window.civiQuizCheck?.(sec, pack.how); };
  $("#tocBtn").onclick = () => { const open = $("#toc").classList.toggle("open"); $("#tocBtn").setAttribute("aria-expanded", open); };
  window.civiQuizBind?.(sec, pack.how);
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
  if ($("#welcome")) { window._civiTourPending = i; return; }
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

Object.assign(ROUTES, { directory: viewDirectory2, academy: viewAcademy2, howto: viewHowto, course: viewHowto, saved: viewSaved, help: viewHelp, faq: () => { viewHelp(); setTimeout(() => $("#faq")?.scrollIntoView(), 50); } });
loadMe().then(syncFavsFromServer);
setTimeout(() => { if (!localStorage.getItem("civi.tour") && (location.hash || "#/map").startsWith("#/map")) { localStorage.setItem("civi.hint", 1); $("#hint")?.remove(); startTour(); } }, 1600);

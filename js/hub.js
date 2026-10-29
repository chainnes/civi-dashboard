/* Civi beta hub. Vanilla JS. The browser holds NO keys: all Supabase calls go through /api/* Pages Functions.
   If /api returns 503 (Supabase not configured, e.g. local preview), Civi runs in DEMO MODE: data from /data/*.json,
   accounts/posts stored only in this browser's localStorage, clearly labeled. */
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CAT = { "Government": "#5aa9ff", "Laws & Policy": "#b48cff", "Disaster & Weather": "#ff5d7a", "Community Events": "#9dff6a", "Economy & Jobs": "#ffc24b",
  "Health": "#ff8fb1", "Environment": "#36f1b8", "Security": "#ff8a3d", "Transport & Infrastructure": "#7ee0ff", "Education": "#ffe36e", "Sports": "#4dd2a5",
  "Entertainment": "#f78bff", "Other": "#9aa8bb" };
const STYPES = ["News outlet", "Government / agency", "Community", "User-submitted"];
const state = { lang: localStorage.getItem("civi.lang") || "en", user: null, demo: false, cats: new Set(Object.keys(CAT)), stypes: new Set(STYPES), cache: {} };
const t = k => (CIVI_I18N[state.lang] || {})[k] || CIVI_I18N.en[k] || k;
const device = localStorage.getItem("civi.device") || (localStorage.setItem("civi.device", crypto.randomUUID()), localStorage.getItem("civi.device"));
const toast = m => { const e = $("#toast"); e.textContent = m; e.classList.remove("hidden"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.add("hidden"), 3200); };
async function api(path, opts = {}) {
  try {
    const r = await fetch("/api/" + path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...opts, body: opts.body && JSON.stringify(opts.body) });
    if (r.status === 503 || r.status === 404 || r.status === 501 || r.status === 405) return { demo: true };
    const d = await r.json().catch(() => ({})); if (!r.ok) return { error: d.error || r.status }; return d;
  } catch { return { demo: true }; }
}
const data = async n => state.cache[n] ||= await fetch(`/data/${n}.json`).then(r => r.json());
const ago = s => { const d = new Date(s); if (isNaN(d)) return ""; const h = (Date.now() - d) / 36e5; return h < 1 ? "just now" : h < 24 ? `${h | 0}h ago` : h < 24 * 60 ? `${(h / 24) | 0}d ago` : d.toLocaleDateString("en-PH"); };
const demoStore = { get: k => JSON.parse(localStorage.getItem("civi.demo." + k) || "[]"), set: (k, v) => localStorage.setItem("civi.demo." + k, JSON.stringify(v)) };
const footer = (cls = "") => `<footer class="footer glass ${cls}"><a href="#/privacy">${t("privacy")}</a><a href="#/terms">${t("terms")}</a><a href="#/disclaimer">${t("disclaimer")}</a><a href="#/donate">💛 ${t("donate")}</a>${state.lang !== "en" ? `<a href="#" class="i18n-fb" onclick="event.preventDefault();translationFeedback()">✎ ${t("suggest_tr")}</a>` : ""}<a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a><span>© Chainnes · Civi beta</span></footer>`;
const chipDisc = (k, cls = "warn") => `<span class="chip ${cls}" title="${esc(t(k))}">ⓘ ${esc(t(k))}</span>`;

/* ---------- i18n + auth chrome ---------- */
function applyI18n() {
  $$("[data-i18n]").forEach(e => e.textContent = t(e.dataset.i18n));
  const b = $("#mtBanner"); if (state.lang !== "en") { b.textContent = "⚠ " + t("mt"); b.classList.remove("hidden"); } else b.classList.add("hidden");
  document.documentElement.lang = state.lang; renderAuthBtn();
}
function renderAuthBtn() { const b = $("#authBtn"); b.textContent = state.user ? `@${state.user.handle} · ${t("logout")}` : t("login"); }
async function loadMe() {
  const r = await api("auth/me");
  if (r.demo) { state.demo = true; state.user = JSON.parse(localStorage.getItem("civi.demo.user") || "null"); }
  else { state.user = r.user || null; if (state.user && civiRef().ref_source && !localStorage.getItem("civi.ref.sent")) api("auth/referral", { method: "POST", body: civiRef() }).then(x => { if (!x.error && !x.demo) localStorage.setItem("civi.ref.sent", 1); }); }
  renderAuthBtn();
}
function openModal(html) { $("#modalCard").innerHTML = html; $("#modal").classList.remove("hidden"); }
function closeModal() { $("#modal").classList.add("hidden"); }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal" || e.target.dataset.close != null) closeModal(); });
function authModal(mode = "login") {
  const su = mode === "signup";
  openModal(`<div class="row spread"><h2 style="margin:0">${su ? t("signup") : t("login")}</h2><button class="btn ghost sm" data-close>✕</button></div>
  ${state.demo ? `<div class="disc">Demo mode: Supabase is not connected here, so your demo account lives only in this browser. No data leaves your device.</div>` : ""}
  <p class="sub">Civi keeps only your email and a public handle. <a href="#/privacy" data-close>Privacy Policy</a></p>
  <button class="btn ghost" id="gBtn" style="width:100%;margin:6px 0">🟢 ${t("google")}</button>
  <div style="text-align:center;color:var(--mute);margin:6px">or</div>
  <form id="authForm"><label>${t("email")}<input type="email" name="email" required autocomplete="email"></label>
  <label>${t("password")}<input type="password" name="password" minlength="8" ${su ? 'autocomplete="new-password"' : 'autocomplete="current-password"'} placeholder="min 8 characters"></label>
  ${su ? `<label>Handle (public)<input type="text" name="handle" pattern="[a-z0-9_]{3,20}" required placeholder="e.g. juan_dc"></label>
  <label class="row" style="margin:8px 0;align-items:flex-start"><input type="checkbox" name="consent" required style="width:auto;margin-top:3px"> <span style="font-size:12px">${t("consent")} <a href="#/terms" data-close>Terms</a> · <a href="#/privacy" data-close>Privacy</a></span></label>` : ""}
  <div class="row" style="margin-top:8px"><button class="btn">${su ? t("signup") : t("login")}</button>${su ? "" : `<button type="button" class="btn ghost" id="magicBtn">${t("magic")}</button>`}</div></form>
  <p style="font-size:12px;margin-top:10px">${su ? `Have an account? <a href="#" id="swap">${t("login")}</a>` : `New here? <a href="#" id="swap">${t("signup")}</a>`}</p>`);
  $("#swap").onclick = e => { e.preventDefault(); authModal(su ? "login" : "signup"); };
  $("#gBtn").onclick = async () => { if (state.demo) return toast("Google login works after Supabase + Google OAuth are set up (see README)."); location.href = "/api/auth/google"; };
  const f = $("#authForm");
  $("#magicBtn")?.addEventListener("click", async () => { if (!f.email.value) return toast("Enter your email first"); if (state.demo) return toast("Magic links need Supabase (see README)."); const r = await api("auth/magic", { method: "POST", body: { email: f.email.value } }); toast(r.error ? "Could not send link" : "Check your email for the login link"); });
  f.onsubmit = async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(f));
    if (su && !v.consent) return toast("Please accept the Terms and Privacy Policy");
    if (state.demo) { state.user = { handle: v.handle || v.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20).toLowerCase(), demo: true }; localStorage.setItem("civi.demo.user", JSON.stringify(state.user)); closeModal(); renderAuthBtn(); route(); return toast("Demo account created on this device"); }
    const r = await api(su ? "auth/signup" : "auth/login", { method: "POST", body: { ...v, consent: !!v.consent, ...civiRef() } });
    if (r.error) return toast("Failed: " + r.error); if (r.check_email) { closeModal(); return toast("Check your email to confirm your account"); }
    await loadMe(); closeModal(); route();
  };
}
$("#authBtn").onclick = async () => { if (!state.user) return authModal(); if (state.demo) localStorage.removeItem("civi.demo.user"); else await api("auth/logout", { method: "POST" }); state.user = null; renderAuthBtn(); route(); };
const needLogin = () => { if (state.user) return false; toast(t("need_login")); authModal(); return true; };

/* ---------- MAP (home): Philippines only, smooth zoom, learning labels, smart filters ---------- */
let maskLayer, selLayer, map, cluster, charts = [], labelLayer, regionLayer;
const PH_BOUNDS = [[3.2, 114.0], [22.2, 128.2]];
const KINDS = { news: "kind_news", hazard: "kind_hazard", event: "kind_event", user: "kind_user" };
const RECENCY = { all: 0, "24h": 24, "7d": 168, "30d": 720 };
const FKEY = "civi.filters.v2";
const loadF = () => { try { const f = JSON.parse(localStorage.getItem(FKEY) || "null"); if (f) return { off: Object.fromEntries(Object.entries(f.off || {}).map(([k, v]) => [k, new Set(v)])), rec: f.rec || "all", open: f.open ?? innerWidth >= 900, glance: f.glance ?? true }; } catch {} return { off: {}, rec: "all", open: innerWidth >= 900, glance: true }; };
state.f = loadF();
const saveF = () => localStorage.setItem(FKEY, JSON.stringify({ off: Object.fromEntries(Object.entries(state.f.off).map(([k, v]) => [k, [...v]])), rec: state.f.rec, open: state.f.open, glance: state.f.glance }));
const offSet = k => state.f.off[k] ||= new Set();
function inRing(pt, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
const polys = g => g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
function regionOf(i, geo) { if (i._r !== undefined) return i._r; i._r = "National"; if (!i.ll) return i._r; const pt = [i.ll[1], i.ll[0]];
  for (const f of geo.features) if (polys(f.geometry).some(p => inRing(pt, p[0]))) return i._r = f.properties.name; return i._r = "Offshore (at sea)"; }
function itemKeys(i) { return { cat: i.cat || "Other", stype: i.stype, kind: i.kind === "user" || i.stype === "User-submitted" ? "user" : i.kind || "news", region: i.region || i._r || "National", esrc: i.kind === "event" || i.cat === "Community Events" ? (i.stype === "User-submitted" || i.kind === "user" ? "Community-submitted" : i.esrc || i.source) : undefined }; }
const visible = all => all.filter(i => { const k = itemKeys(i); if (Object.entries(k).some(([g, v]) => v !== undefined && state.f.off[g]?.has(v))) return false;
  if (state.f.off.prov?.has(i.prov || "∅") || state.f.off.city?.has(i.city || "∅")) return false;
  const h = RECENCY[state.f.rec]; if (h && i.time) { const d = new Date(i.time); if (!isNaN(d) && (Date.now() - d) / 36e5 > h) return false; } return true; });

async function viewMap() {
  const v = $("#view"); v.className = "";
  v.innerHTML = `<a href="#mapList" class="skip">${t("skip_map")}</a><div id="map" role="application" aria-label="${esc(t("map_aria"))}"></div>
  <aside class="hud left ${state.f.glance ? "" : "collapsed"}" id="glance" aria-label="${esc(t("kpis"))}">
    <section class="panel glass"><h3><button class="hdr-btn" id="glanceTog" aria-expanded="${state.f.glance}">${state.f.glance ? "▾" : "▸"} ${t("kpis")}</button>${chipDisc("d_third")}</h3><div id="kpis" class="kpis"></div></section>
  </aside>
  <aside class="hud right ${state.f.open ? "" : "collapsed"}" id="fpanel" aria-label="${esc(t("filters"))}">
    <section class="panel glass"><h3><button class="hdr-btn" id="fTog" aria-expanded="${state.f.open}">${state.f.open ? "▾" : "▸"} ⚙️ ${t("filters")} <span id="fCount" class="chip"></span></button><button class="btn ghost sm" id="fClear">${t("clear_all")}</button></h3>
      <div id="fBody"><div id="fChips" class="achips"></div><div id="fGroups"></div></div></section>
    <section class="panel glass fextra"><details class="fg"><summary>📊 ${t("news_by_cat")} · ${t("latest")}</summary>${chipDisc("d_kpi")}<canvas id="catChart" height="170"></canvas><div id="latest" style="font-size:12px;margin-top:8px"></div></details></section>
  </aside>
  <div class="map-tools glass" role="toolbar" aria-label="${esc(t("map_tools"))}">
    <div class="pq-wrap"><input type="search" id="placeQ" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="placeSug" placeholder="📍 ${esc(t("find_place"))}" aria-label="${esc(t("find_place"))}"><ul id="placeSug" class="glass pq-sug" role="listbox" hidden></ul></div>
    <button class="btn ghost sm" id="zIn" aria-label="Zoom in">＋</button><button class="btn ghost sm" id="zOut" aria-label="Zoom out">－</button>
    <button class="btn ghost sm" id="zHome" aria-label="${esc(t("whole_ph"))}" title="${esc(t("whole_ph"))}">🇵🇭</button>
    <button class="btn ghost sm on" id="lblTog" aria-pressed="true" title="${esc(t("labels"))}">🏷️ ${t("labels")}</button>
  </div>
  <div class="mobile-toggle"><button class="btn sm" data-sheet="glance" aria-label="${esc(t("kpis"))}">📊</button><button class="btn sm" data-sheet="fpanel" aria-label="${esc(t("filters"))}">⚙️</button></div>
  <div class="hud-bottom glass" id="hudBottom"></div>
  <section id="mapList" class="sr-only" aria-label="${esc(t("map_list"))}"></section>
  ${footer("onmap")}`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  map = L.map("map", { zoomControl: false, minZoom: 5, maxZoom: 16, maxBounds: PH_BOUNDS, maxBoundsViscosity: 1, zoomSnap: .25, zoomDelta: .5, wheelPxPerZoomLevel: 110, wheelDebounceTime: 30, zoomAnimation: !reduce, inertia: true, worldCopyJump: false }).setView([12.3, 122.4], 6);
  // OSM standard tiles (light use only per OSM tile policy; switch to MapTiler/Stadia before open beta). Other countries are covered by a mask, so only PH shows.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { className: "civi-tiles", bounds: PH_BOUNDS, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundaries: geoBoundaries (NAMRIA/PSA/OCHA, CC BY 3.0 IGO)', maxZoom: 18 }).addTo(map);
  const home = () => innerWidth >= 900 ? map.flyToBounds([[4.6, 116.9], [21.1, 126.6]], { paddingTopLeft: [state.f.glance ? 400 : 110, 60], paddingBottomRight: [state.f.open ? 320 : 40, 40], duration: reduce ? 0 : .8 }) : map.flyTo([12.0, 122.3], 5.25, { duration: reduce ? 0 : .8 });
  home();
  const [geo, items, kpis, gaz] = await Promise.all([data("geo_regions"), data("map_items"), data("kpis"), data("gazetteer")]);
  // inverse mask: whole world minus PH regions -> other countries hidden
  map.createPane("mask"); map.getPane("mask").style.zIndex = 350; map.getPane("mask").style.pointerEvents = "none";
  // hole = PH outline buffered ~3 km OUTWARD (data/ph_mask.json), so land/coast is never clipped; fades out when zoomed in
  const pm = await data("ph_mask");
  maskLayer = L.polygon([[[-89, -179], [-89, 179], [89, 179], [89, -179]], ...pm.rings], { pane: "mask", stroke: false, fillColor: "#03060c", fillOpacity: 1, interactive: false, smoothFactor: 0 }).addTo(map);
  const maskFade = () => { const z = map.getZoom(); maskLayer.setStyle({ fillOpacity: z < 8 ? 1 : z < 10 ? 1 - (z - 8) * .45 : 0 }); }; map.on("zoomend", maskFade); maskFade();
  const shared = await api("map?kind=shared"); const userItems = shared.demo ? demoStore.get("links") : (shared.items || []);
  const all = [...items.items, ...userItems]; all.forEach(i => regionOf(i, geo)); state._all = all; state._geo = geo;
  regionLayer = L.geoJSON(geo, { style: { color: "#38e1ff", weight: .9, opacity: .6, fillColor: "#38e1ff", fillOpacity: .05 },
    onEachFeature: (f, l) => { l.on({ mouseover: () => l.setStyle({ fillOpacity: .16 }), mouseout: () => l.setStyle({ fillOpacity: .05 }),
      click: e => { selectRegion(f.properties.name); const n = f.properties.name, vis = visible(all).filter(i => i._r === n), cats = {}; vis.forEach(i => cats[i.cat] = (cats[i.cat] || 0) + 1);
        L.popup({ maxWidth: 380, autoPan: false }).setLatLng(e.latlng).setContent(`<div class="pc"><h4>${esc(n)}</h4><p>${vis.length} ${t("items_here")}</p>${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, k]) => `<span class="chip" style="color:${CAT[c]}">● ${esc(c)} ${k}</span>`).join(" ")}
          <div class="row" style="margin-top:8px"><button class="btn sm" data-only-region="${esc(n)}">${t("show_only")}</button><button class="btn ghost sm" data-zoom-region>${t("zoom_here")}</button></div></div>`).openOn(map);
        setTimeout(() => { $("[data-only-region]")?.addEventListener("click", () => { onlyIn("region", n); map.closePopup(); }); $("[data-zoom-region]")?.addEventListener("click", () => { map.flyToBounds(l.getBounds(), { duration: reduce ? 0 : .8 }); map.closePopup(); }); }); } });
      l.bindTooltip(f.properties.name, { sticky: true }); } }).addTo(map);
  // learning labels: regions (zoomed out), provinces (mid), cities (zoomed in)
  const lbl = (ll, txt, cls) => L.marker(ll, { interactive: false, keyboard: false, icon: L.divIcon({ className: "maplbl " + cls, html: `<span>${esc(txt)}</span>`, iconSize: null }) });
  const LB = { region: regionLayer.getLayers().map(l => lbl(l.getBounds().getCenter(), l.feature.properties.name, "r")), province: [], city: [] };
  const PL = await data("places"); // real city/municipality centroids (geoBoundaries ADM2/ADM3)
  Object.entries(PL.provinces).forEach(([n, v]) => !n.startsWith("NCR") && LB.province.push(lbl(v.ll, n, "p"))); PL.places.filter(p => p.lvl === "city").forEach(p => LB.city.push(lbl(p.ll, p.n, "c")));
  labelLayer = L.layerGroup().addTo(map);
  const labelsOn = () => localStorage.getItem("civi.labels") !== "0";
  const drawLabels = () => { labelLayer.clearLayers(); if (!labelsOn()) return; const z = map.getZoom(), b = map.getBounds().pad(.1);
    const show = z < 7 ? ["region"] : z < 9 ? ["region", "province"] : ["province", "city"]; show.forEach(k => LB[k].forEach(m => b.contains(m.getLatLng()) && labelLayer.addLayer(m))); $("#map").dataset.z = Math.floor(z); };
  map.on("zoomend moveend", drawLabels); drawLabels();
  const lt = $("#lblTog"); const syncLt = () => { lt.classList.toggle("on", labelsOn()); lt.setAttribute("aria-pressed", labelsOn()); }; syncLt();
  lt.onclick = () => { localStorage.setItem("civi.labels", labelsOn() ? "0" : "1"); syncLt(); drawLabels(); };
  $("#zIn").onclick = () => map.zoomIn(.75); $("#zOut").onclick = () => map.zoomOut(.75); $("#zHome").onclick = home;
  // place search -> flyTo
  const places = [...regionLayer.getLayers().map(l => ({ n: l.feature.properties.name, lvl: "region", b: l.getBounds() })), ...PL.places.map(p => ({ n: p.n, lvl: "city", ll: p.ll, region: p.p + ", " + p.r })), ...Object.entries(PL.provinces).map(([n, v]) => ({ n, lvl: "province", ll: v.ll, region: v.r })), { n: "QC", lvl: "city", ll: PL.places.find(p => p.n === "Quezon City")?.ll, region: "Quezon City" }].filter(p => p.b || p.ll);
  // tidy place suggestions: max 8, ranked (exact > starts with > contains; regions first), closes on outside click / Esc
  const sug = $("#placeSug"), pq = $("#placeQ"), rank = (p, q) => { const n = p.n.toLowerCase(); return (n === q ? 0 : n.startsWith(q) ? 1 : 2) * 3 + (p.lvl === "region" ? 0 : p.lvl === "province" ? 1 : 2); };
  const closeSug = () => { sug.hidden = true; pq.setAttribute("aria-expanded", "false"); };
  pq.addEventListener("input", () => { const q = pq.value.trim().toLowerCase(); if (q.length < 2) return closeSug(); const hits = places.filter(p => p.n.toLowerCase().includes(q)).sort((a, b) => rank(a, q) - rank(b, q)).slice(0, 8);
    sug.innerHTML = hits.map(p => `<li role="option" tabindex="-1" data-n="${esc(p.n)}"><b>${esc(p.n)}</b><small>${esc(t("lvl_" + p.lvl) || p.lvl)}${p.region ? " · " + esc(p.region) : ""}</small></li>`).join("") || `<li class="none">${t("no_place")}</li>`;
    sug.hidden = false; pq.setAttribute("aria-expanded", "true"); $$("li[data-n]", sug).forEach(li => li.onclick = () => { pq.value = li.dataset.n; closeSug(); go(li.dataset.n); }); });
  pq.addEventListener("keydown", e => { if (e.key === "Escape") closeSug(); if (e.key === "ArrowDown") sug.querySelector("li[data-n]")?.focus(); });
  sug.addEventListener("keydown", e => { const li = e.target; if (e.key === "ArrowDown") li.nextElementSibling?.focus(); if (e.key === "ArrowUp") (li.previousElementSibling || pq).focus(); if (e.key === "Enter") li.click(); if (e.key === "Escape") { closeSug(); pq.focus(); } });
  document.addEventListener("click", e => { if (!e.target.closest(".pq-wrap")) closeSug(); });
  const go = q => { q = q.trim().toLowerCase(); if (!q) return; const p = places.find(p => p.n.toLowerCase() === q) || places.find(p => p.n.toLowerCase().startsWith(q)) || places.find(p => p.n.toLowerCase().includes(q));
    if (!p) return toast(t("no_place")); if (p.lvl === "region") { selectRegion(p.n); toast("📍 " + p.n); return; } if (p.b) map.flyToBounds(p.b, { duration: reduce ? 0 : 1 }); else map.flyTo(p.ll, p.lvl === "city" ? 12 : 9.5, { duration: reduce ? 0 : 1 }); toast("📍 " + p.n); };
  $("#placeQ").addEventListener("keydown", e => { if (e.key === "Enter") { closeSug(); go(e.target.value); } });
  $("#glanceTog").onclick = () => { state.f.glance = !state.f.glance; saveF(); $("#glance").classList.toggle("collapsed", !state.f.glance); $("#glanceTog").setAttribute("aria-expanded", state.f.glance); $("#glanceTog").firstChild.textContent = (state.f.glance ? "▾" : "▸") + " "; };
  $("#fTog").onclick = () => { state.f.open = !state.f.open; saveF(); $("#fpanel").classList.toggle("collapsed", !state.f.open); $("#fTog").setAttribute("aria-expanded", state.f.open); $("#fTog").firstChild.textContent = (state.f.open ? "▾" : "▸") + " "; };
  $("#fClear").onclick = () => { state.f.off = {}; state.f.rec = "all"; saveF(); refresh(); };
  $$(".mobile-toggle [data-sheet]").forEach(b => b.onclick = () => { const id = b.dataset.sheet, el = $("#" + id), other = $(id === "glance" ? "#fpanel" : "#glance"); other.classList.remove("sheet-open"); el.classList.toggle("sheet-open"); el.classList.remove("collapsed"); });
  renderFilters(all); drawPins(all); renderKpis(kpis); renderCatChart(kpis); renderLatest(all); renderMapList(all);
  $("#hudBottom").innerHTML = `${legendMini()} · <span>${t("updated")} ${ago(items.fetched_at)}</span>`;
  window.civiMapExtras?.({ map, all, geo, mask: maskLayer, home });
}
const legendMini = () => `<span><span class="legend-dot" style="--c:#38e1ff"></span>${t("lg_cluster")}</span><span><span class="legend-dot" style="--c:#ff5d7a"></span>${t("lg_pin")}</span><span><span class="legend-dot" style="--c:#38e1ff;border-radius:2px;opacity:.5"></span>${t("lg_region")}</span>`;
function refresh() { const a = state._all; renderFilters(a); drawPins(a); renderLatest(a); renderMapList(a); }
function selectRegion(n) { // real region outline + fitBounds (replaces the old bounds rectangle)
  if (!map || !state._geo) return; if (selLayer) map.removeLayer(selLayer); const f = state._geo.features.find(f => f.properties.name === n); if (!f) return;
  const ce = L.geoJSON(f).getBounds().getCenter(); document.dispatchEvent(new CustomEvent("civi:place", { detail: { name: n, ll: [ce.lat, ce.lng] } }));
  selLayer = L.geoJSON(f, { interactive: false, style: { color: "#ffc24b", weight: 3, opacity: .95, fillColor: "#ffc24b", fillOpacity: .08 } }).addTo(map);
  const vis = sel => { const e = $(sel); return e && !e.classList.contains("pp-hide") && !e.classList.contains("collapsed") && innerWidth >= 900; };
  map.flyToBounds(selLayer.getBounds(), { paddingTopLeft: [vis("#glance") ? 420 : 40, 70], paddingBottomRight: [vis("#fpanel") ? 330 : 40, 60], duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : .9 }); }
function onlyIn(g, v) { if (g === "region") selectRegion(v); const opts = state._opts[g] || []; state.f.off[g] = new Set(opts.map(o => o.v).filter(x => x !== v)); saveF(); refresh(); }
function renderFilters(all) {
  const groups = [["region", t("f_location")], ["cat", t("categories")], ["kind", t("f_newstype")], ["esrc", t("f_esrc")], ["stype", t("sources")]], cnt = {};
  all.forEach(i => Object.entries(itemKeys(i)).forEach(([g, v]) => v !== undefined && ((cnt[g] ||= {})[v] = (cnt[g][v] || 0) + 1)));
  state._opts = {}; groups.forEach(([g]) => state._opts[g] = Object.keys(cnt[g] || {}).sort((a, b) => cnt[g][b] - cnt[g][a]).map(v => ({ v, n: cnt[g][v] })));
  const lab = (g, v) => v === "∅" ? t("national") : g === "kind" ? t(KINDS[v] || v) : g === "region" && v === "National" ? t("national") : v;
  const active = [...groups, ["prov"], ["city"]].reduce((s, [g]) => s + (state.f.off[g]?.size || 0), 0) + (state.f.rec !== "all" ? 1 : 0);
  $("#fCount").textContent = active ? `${visible(all).length}/${all.length}` : `${all.length}`;
  $("#fChips").innerHTML = active ? [...groups, ["prov"], ["city"]].flatMap(([g]) => [...(state.f.off[g] || [])].map(v => `<button class="chip warn" data-unhide="${esc(g)}|${esc(v)}" aria-label="${esc(t("show"))} ${esc(lab(g, v))}">⊘ ${esc(lab(g, v))} ✕</button>`)).join("") + (state.f.rec !== "all" ? `<span class="chip ok">⏱ ${esc(t("rec_" + state.f.rec))}</span>` : "") : `<span class="sub" style="font-size:11px">${t("f_all_on")}</span>`;
  $("#fGroups").innerHTML = `<details class="fg" open><summary>⏱ ${t("f_recency")}</summary><div class="seg" role="radiogroup">${Object.keys(RECENCY).map(r => `<button role="radio" aria-checked="${state.f.rec === r}" class="${state.f.rec === r ? "on" : ""}" data-rec="${r}">${t("rec_" + r)}</button>`).join("")}</div></details>` +
    groups.map(([g, label]) => { if (g === "region" && window.civiLocTree) return civiLocTree(all, label); const opts = state._opts[g], off = state.f.off[g] || new Set(), on = opts.filter(o => !off.has(o.v)).length;
      return `<details class="fg" data-g="${g}" ${sessionStorage.getItem("fg." + g) === "1" ? "open" : ""}><summary>${esc(label)} <span class="chip">${on}/${opts.length}</span></summary>
      ${opts.length > 6 ? `<input type="search" class="fq" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))} ${esc(label)}">` : ""}
      <div class="row fa"><button class="btn ghost sm" data-all>${t("select_all")}</button><button class="btn ghost sm" data-none>${t("unselect_all")}</button></div>
      <ul class="fl">${opts.map(o => `<li data-v="${esc(o.v)}"><label><input type="checkbox" ${off.has(o.v) ? "" : "checked"} value="${esc(o.v)}">${g === "cat" ? `<span class="legend-dot" style="--c:${CAT[o.v] || "#9aa8bb"}"></span>` : ""}<span class="fl-n">${esc(lab(g, o.v))}</span><span class="fl-c">${o.n}</span></label><button class="only" data-only="${esc(o.v)}" aria-label="${esc(t("only"))} ${esc(lab(g, o.v))}">${t("only")}</button></li>`).join("")}</ul></details>`; }).join("");
  $$("#fGroups [data-rec]").forEach(b => b.onclick = () => { state.f.rec = b.dataset.rec; saveF(); refresh(); });
  $$("#fChips [data-unhide]").forEach(b => b.onclick = () => { const [g, v] = b.dataset.unhide.split("|"); state.f.off[g]?.delete(v); saveF(); refresh(); });
  window.civiLocWire?.(all); $$("#fGroups details[data-g]:not([data-g=loc])").forEach(d => { const g = d.dataset.g;
    d.addEventListener("toggle", () => sessionStorage.setItem("fg." + g, d.open ? "1" : "0"));
    d.querySelector(".fq")?.addEventListener("input", e => { const q = e.target.value.toLowerCase(); $$("li", d).forEach(li => li.hidden = !li.textContent.toLowerCase().includes(q)); });
    d.querySelector("[data-all]").onclick = () => { delete state.f.off[g]; saveF(); refresh(); };
    d.querySelector("[data-none]").onclick = () => { state.f.off[g] = new Set(state._opts[g].map(o => o.v)); saveF(); refresh(); };
    $$("input[type=checkbox]", d).forEach(c => c.onchange = () => { const s = offSet(g); c.checked ? s.delete(c.value) : s.add(c.value); saveF(); refresh(); });
    $$("[data-only]", d).forEach(b => b.onclick = () => onlyIn(g, b.dataset.only)); });
}
function card(i) {
  return `<div class="pc">${typeof favBtn === "function" ? favBtn("news", i.url, i.title, i.url) : ""}<div class="chips"><span class="chip" style="border-color:${CAT[i.cat]};color:${CAT[i.cat]}">● ${esc(i.cat)}</span><span class="chip">${esc(i.stype)}</span>${i.geo === "psgc-match" ? '<span class="chip warn" title="Location guessed from place names (PSGC match)">≈ location</span>' : ""}</div>
  <h4>${esc(i.title)}</h4>${i.summary ? `<p>${esc(i.summary.slice(0, 160))}${i.summary.length > 160 ? "…" : ""}</p>` : ""}
  <div class="meta"><span>📍 ${esc(i.place || "")}</span><span>${esc(i.source)} · ${ago(i.time)}</span></div>
  <div class="row spread" style="margin-top:8px"><a href="${esc(i.url)}" target="_blank" rel="noopener nofollow">Open source ↗</a>${i.stype === "User-submitted" ? `<span class="chip warn">${esc(t("d_user"))}</span>` : ""}</div></div>`;
}
function drawPins(all) {
  if (!map) return; if (cluster) map.removeLayer(cluster);
  cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: z => z < 7 ? 55 : z < 10 ? 40 : 25, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 13, animate: !matchMedia("(prefers-reduced-motion: reduce)").matches });
  visible(all).filter(i => i.ll).forEach(i => {
    const j = i.geo === "exact" ? [0, 0] : [(Math.random() - .5) * .25, (Math.random() - .5) * .25];
    const m = L.marker([i.ll[0] + j[0], i.ll[1] + j[1]], { icon: L.divIcon({ className: "", html: `<div class="pin" style="--c:${CAT[i.cat] || "#9aa8bb"}"></div>`, iconSize: [14, 14] }) });
    m.bindPopup(card(i), { maxWidth: 400, minWidth: 260 }); m._item = i; cluster.addLayer(m);
  });
  if (localStorage.getItem("civi.pins") !== "0") map.addLayer(cluster); window.civiHover?.(cluster);
}
function renderMapList(all) { const el = $("#mapList"); if (!el) return; el.innerHTML = `<h2>${t("map_list")}</h2><ul>${visible(all).map(i => `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a> (${esc(i.cat)}, ${esc(i.place || "")}, ${esc(i.source)})</li>`).join("")}</ul>`; }
function renderLatest(all) {
  const el = $("#latest"); if (!el) return;
  el.innerHTML = visible(all).filter(i => i.kind !== "hazard").sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 7)
    .map(i => `<div style="padding:5px 0;border-top:1px solid rgba(255,255,255,.05)"><span class="legend-dot" style="--c:${CAT[i.cat]}"></span><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title.slice(0, 80))}</a><div style="color:var(--mute);font-size:10.5px">${esc(i.source)} · ${esc(i.stype)} · ${ago(i.time)}</div></div>`).join("");
}
async function renderKpis(k, sel = "#kpis") {
  const I = k.items, last = s => s && s.length ? s[s.length - 1] : null, out = [];
  const add = (key, fmt, group) => { const x = I[key]; if (!x) return; const l = last(x.series); out.push({ key, x, group, val: x.value ?? (l && fmt(l[1])), when: l && l[0] }); };
  const ex = (await data("kpis_extra")).items; ex.forEach(x => out.push({ key: x.key, x, group: x.group, val: x.value, when: x.when, sub: x.sub }));
  add("inflation", v => v.toFixed(1) + "%", "econ"); add("unemployment", v => v.toFixed(1) + "%", "econ"); add("gdp_growth", v => v.toFixed(1) + "%", "econ"); add("usdphp", v => "₱" + v.toFixed(2), "econ");
  add("population", v => (v / 1e6).toFixed(1) + "M", "people"); add("poverty", v => v.toFixed(1) + "%", "people"); add("hazards_30d", v => v, "people");
  const G = { money: t("g_money"), econ: t("g_econ"), people: t("g_people") }, el = $(sel); if (!el) return;
  el.innerHTML = Object.entries(G).map(([g, gl]) => `<div class="kgroup"><div class="kg-h">${esc(gl)}</div>${out.filter(o => o.group === g).map(o => `<div class="kpi"><div class="kpi-main"><div class="l">${esc(t("k_" + o.key) !== "k_" + o.key ? t("k_" + o.key) : o.x.label)}</div><div class="v ${o.x.linkonly ? "sm" : ""}">${esc(o.val)}</div>${o.sub ? `<div class="l">${esc(o.sub)}</div>` : ""}</div><div class="l when">${esc(o.when || "")}</div>
   ${o.x.series && o.x.series.length > 2 ? `<canvas data-k="${o.key}" aria-hidden="true"></canvas>` : ""}<div class="src">${o.x.official ? `<span class="chip ok">${t("official")}</span>` : `<span class="chip warn">${t("unofficial")}</span>`} <a href="${esc(o.x.url)}" target="_blank" rel="noopener">${esc(o.x.source)} ↗</a></div></div>`).join("")}</div>`).join("") + `<p class="l" style="font-size:10px">${t("kpi_note")}</p>`;
  $$(sel + " canvas[data-k]").forEach(c => { const s = I[c.dataset.k].series; charts.push(new Chart(c, { type: "line", data: { labels: s.map(x => x[0]), datasets: [{ data: s.map(x => x[1]), borderColor: "#38e1ff", borderWidth: 1.6, pointRadius: 0, fill: true, backgroundColor: "rgba(56,225,255,.08)", tension: .35 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { intersect: false } }, scales: { x: { display: false }, y: { display: false } } } })); });
}
function renderCatChart(k) {
  const c = k.items.news_by_cat?.counts || {}; const keys = Object.keys(c).sort((a, b) => c[b] - c[a]);
  charts.push(new Chart($("#catChart"), { type: "bar", data: { labels: keys, datasets: [{ data: keys.map(x => c[x]), backgroundColor: keys.map(x => CAT[x] || "#9aa8bb"), borderRadius: 4 }] },
    options: { indexAxis: "y", animation: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "#8ea3bf" }, grid: { color: "rgba(255,255,255,.05)" } }, y: { ticks: { color: "#c7d6ea", font: { size: 10 } }, grid: { display: false } } } } }));
}

/* ---------- DIRECTORY ---------- */
async function viewDirectory() {
  const d = await data("directory_hub"); const cats = [...new Set(d.items.map(i => i.cat))]; let cur = "All", q = "";
  page(`<h1>📇 Smart Directory</h1><p class="sub">${t("directory_sub")}</p>
   <div class="disc">${t("d_emerg")} Hotline numbers are shown only when published by the agency itself; always confirm on the official site. ${t("d_third")}</div>
   <a class="btn sm" href="#/scholarships" style="margin-bottom:8px">🎓 ${t("scholarships")}: ${t("sch_local")} · ${t("sch_abroad")}</a>
   <input type="search" id="q" placeholder="${t("search")}"><div class="tabs filters" id="dtabs"></div><div class="grid" id="dgrid"></div>`);
  const draw = () => {
    $("#dtabs").innerHTML = ["All", ...cats].map(c => `<button class="${c === cur ? "on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    $$("#dtabs button").forEach(b => b.onclick = () => { cur = b.dataset.c; draw(); });
    $("#dgrid").innerHTML = d.items.filter(i => (cur === "All" || i.cat === cur) && (i.name + i.desc).toLowerCase().includes(q)).map(i => `<div class="card glass"><span class="chip">${esc(i.cat)}</span>${i.access ? ` <span class="chip ${i.access === "A" ? "ok" : "warn"}">access ${esc(i.access)}</span>` : ""}
      <h4>${esc(i.name)}</h4>${i.phone ? `<div class="v" style="font-size:22px;color:var(--lime)">☎ <a href="tel:${esc(i.phone)}" style="color:inherit">${esc(i.phone)}</a></div>` : ""}${i.phone_src ? `<div style="font-size:10.5px">Hotline source: <a href="${esc(i.phone_src)}" target="_blank" rel="noopener">official page ↗</a></div>` : ""}<p>${esc(i.desc)}</p>${i.status ? `<p style="font-size:10.5px;color:var(--mute)">${i.status === "live" ? "✓ site checked live" : "✓ site up (blocks automated checks)"} · ${esc(i.checked)}</p>` : ""}${i.starts_at ? `<p>🗓 ${new Date(i.starts_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} PHT</p>` : ""}<a href="${esc(i.url)}" target="_blank" rel="noopener">Official site ↗</a></div>`).join("") || "<p>No matches.</p>";
  };
  $("#q").oninput = e => { q = e.target.value.toLowerCase(); draw(); }; draw();
}

/* ---------- LOUNGE ---------- */
const LCATS = ["Government", "Laws & Policy", "Economy & Jobs", "Disaster & Weather", "Environment", "Health", "Education", "Security", "Transport & Infrastructure", "Sports", "Entertainment", "Other"];
async function loungeData() {
  const r = await api("lounge");
  if (!r.demo) return r.items;
  const seed = (await data("lounge_seed")).items.map(s => ({ ...s, votes: 0, replies: [] }));
  const mine = demoStore.get("topics"), rep = demoStore.get("replies"), votes = demoStore.get("votes");
  return [...mine, ...seed].map(x => ({ ...x, replies: rep.filter(r => r.topic === x.id), votes: (x.votes || 0) + votes.filter(v => v === x.id).length, voted: votes.includes(x.id) }));
}
async function viewLounge() {
  let items = await loungeData(), cur = "All";
  page(`<div class="row spread"><div><h1>💬 ${t("lounge_title")}</h1><p class="sub">${t("lounge_sub")}</p></div><button class="btn" id="newT">+ ${t("new_topic")}</button></div>
   <div class="disc">${t("d_user")} ${t("d_law")} Be respectful: no personal attacks, no private info (RA 10173). 3 reports from different people auto-hide a post. ${state.demo ? "<b>Demo mode:</b> your posts are saved only in this browser." : ""}</div>
   <div class="tabs filters" id="ltabs"></div><div id="topics"></div>`);
  const draw = () => {
    $("#ltabs").innerHTML = ["All", ...LCATS].map(c => `<button class="${c === cur ? "on" : ""}" data-c="${c}">${c}</button>`).join("");
    $$("#ltabs button").forEach(b => b.onclick = () => { cur = b.dataset.c; draw(); });
    $("#topics").innerHTML = items.filter(x => cur === "All" || x.cat === cur).map(x => `<article class="topic glass" data-id="${esc(x.id)}">
     <div class="vote"><button data-act="vote" aria-label="Upvote" ${x.voted ? 'style="border-color:var(--lime)"' : ""}>▲</button><b>${x.votes || 0}</b></div>
     <div style="flex:1;position:relative">${favBtn("topic", x.id, x.title, "#/lounge")}<div class="row"><span class="chip" style="color:${CAT[x.cat] || "#ccc"}">${esc(x.cat)}</span>${x.by === "Civi starter" ? `<span class="chip ok">${t("starter")} · neutral</span>` : `<span class="chip">@${esc(x.by)}</span>`}</div>
     <h4 style="margin-top:6px">${esc(x.title)}</h4>${x.starter ? `<div class="starter">${esc(x.starter)}</div>` : ""}
     ${(x.sources || []).length ? `<div style="font-size:12px">Sources: ${x.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(" · ")}</div>` : ""}
     <details style="margin-top:6px"><summary style="cursor:pointer;color:var(--mute);font-size:12px">${(x.replies || []).length} replies · ${t("reply")}</summary>
       ${(x.replies || []).map(r => `<div class="reply"><b>@${esc(r.by)}</b> <span style="color:var(--mute);font-size:11px">${ago(r.time)}</span><div>${esc(r.body)}</div></div>`).join("")}
       <form data-act="reply" class="row" style="margin-top:6px"><input type="text" name="body" maxlength="1000" placeholder="${t("reply")}…" required><button class="btn sm">${t("reply")}</button></form></details>
     <div style="text-align:right"><button class="btn ghost sm" data-act="report">⚑ ${t("report")}</button></div></div></article>`).join("");
    $$("#topics article").forEach(a => {
      const id = a.dataset.id;
      a.querySelector("[data-act=vote]").onclick = async () => { if (needLogin()) return; if (state.demo) { const v = demoStore.get("votes"); if (v.includes(id)) return toast("Already voted"); demoStore.set("votes", [...v, id]); } else { const r = await api("lounge", { method: "POST", body: { action: "vote", topic_id: id } }); if (r.error) return toast(r.error); } items = await loungeData(); draw(); };
      a.querySelector("[data-act=report]").onclick = async () => { if (needLogin()) return; if (!state.demo) await api("lounge", { method: "POST", body: { action: "report", topic_id: id } }); toast("Reported. Thank you."); };
      a.querySelector("form").onsubmit = async e => { e.preventDefault(); if (needLogin()) return; const body = e.target.body.value.trim(); if (!body) return;
        if (state.demo) demoStore.set("replies", [...demoStore.get("replies"), { topic: id, body, by: state.user.handle, time: new Date().toISOString() }]);
        else { const r = await api("lounge", { method: "POST", body: { action: "reply", topic_id: id, body } }); if (r.error) return toast(r.error); }
        items = await loungeData(); draw(); };
    });
  };
  $("#newT").onclick = () => { if (needLogin()) return; openModal(`<h2 style="margin-top:0">${t("new_topic")}</h2><form id="tf"><label>Question / topic<input type="text" name="title" maxlength="160" required></label>
    <label>Category<select name="cat">${LCATS.map(c => `<option>${c}</option>`).join("")}</select></label><label>Your opening take (optional)<textarea name="starter" maxlength="1500"></textarea></label>
    <div class="disc">${t("d_user")} Don't post private info about anyone.</div><div class="row"><button class="btn">Post</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`);
    $("#tf").onsubmit = async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      if (state.demo) demoStore.set("topics", [{ id: "u-" + Date.now(), ...v, by: state.user.handle, votes: 0, sources: [] }, ...demoStore.get("topics")]);
      else { const r = await api("lounge", { method: "POST", body: { action: "topic", ...v } }); if (r.error) return toast(r.error); }
      closeModal(); items = await loungeData(); draw(); }; };
  draw();
}

/* ---------- ACADEMY ---------- */
async function viewAcademy() {
  const a = await data("academy");
  const civic = [["Read the national budget", "https://www.dbm.gov.ph/", "DBM publishes the GAA and budget documents."], ["File an FOI request", "https://www.foi.gov.ph/", "Ask executive agencies for documents."],
    ["Know your data rights (RA 10173)", "https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html", "Rights to be informed, access, correct, erase."], ["Find laws and cases", "https://lawphil.net/", "LawPhil: statutes and jurisprudence, free."],
    ["Check government bids", "https://notices.philgeps.gov.ph/", "PhilGEPS procurement notices."], ["Explore official statistics", "https://openstat.psa.gov.ph/", "PSA OpenSTAT tables & API."], ["Open Data Philippines", "https://data.gov.ph/", "Government datasets."]];
  page(`<h1>🎓 Academy</h1><p class="sub">Free learning: civic know-how and skills. Links go to the original providers.</p>
   <h2>Civic know-how</h2><div class="grid">${civic.map(([n, u, d]) => `<div class="card glass"><h4>${n}</h4><p>${d}</p><a href="${u}" target="_blank" rel="noopener">Start ↗</a></div>`).join("")}</div>
   <h2>Free courses</h2><div class="grid">${(a.online || []).map(c => `<div class="card glass"><span class="chip">${esc(c.by)}</span><h4>${esc(c.name)}</h4><p>${esc(c.tags || "")}</p><a href="${esc(c.url)}" target="_blank" rel="noopener">Open ↗</a></div>`).join("")}</div>
   <div class="card glass sims" style="margin-top:14px"><span class="chip ok">Beta: playable now</span><h4>🎮 Civi Sims</h4><p><a href="#/sim"><b>Kung Ikaw ang Presidente ▶</b></a> (budget & policy trade-offs with the real FY 2026 DBM GAA). Coming in Phase 2: <b>Datu</b> of a precolonial barangay, <b>Solarpunk Philippines 2050</b>, and career sims (pilot, banker, investor, farmer, teacher, LGU mayor) to help you discover what you want to do.</p></div>`);
}

/* ---------- SHARE ---------- */
function viewShare() {
  page(`<h1>🔗 ${t("share_title")}</h1><p class="sub">${t("share_help")}</p>
   <div class="card glass"><form id="sf" class="row"><input type="url" name="url" required placeholder="https://…" style="flex:1"><button class="btn">${t("share_btn")}</button></form>
   <div class="disc">Only the link, its public title/caption and thumbnail are stored. Civi does not download videos. TikTok/YouTube use their official oEmbed. Shared links are labeled <b>User-submitted</b> and are the sharer's responsibility. ${t("d_third")}</div><div id="sres"></div></div>
   <h2>Your shared links</h2><div class="grid" id="mine"></div>`);
  const mine = () => $("#mine").innerHTML = demoStore.get("links").map(i => `<div class="card glass">${card(i)}</div>`).join("") || `<p class="sub">${state.demo ? "None yet (demo: stored in this browser)." : "See them on the map."}</p>`;
  mine();
  $("#sf").onsubmit = async e => { e.preventDefault(); if (needLogin()) return; const url = e.target.url.value; $("#sres").textContent = "Reading link…";
    const r = await api("share", { method: "POST", body: { url, demo: state.demo } });
    if (r.error) return $("#sres").textContent = "Could not add: " + r.error;
    let item = r.item;
    if (r.demo) item = await demoPreview(url);
    if (state.demo) demoStore.set("links", [item, ...demoStore.get("links")]);
    $("#sres").innerHTML = `<p>Added ✓</p>${card(item)}`; mine(); };
}
async function demoPreview(url) { // demo-only fallback: category + place guessed from the URL text; no server fetch
  const g = await data("gazetteer"); const txt = decodeURIComponent(url).toLowerCase().replace(/[-_/.]/g, " ");
  const hit = Object.keys(g).sort((a, b) => b.length - a.length).find(k => (" " + txt + " ").includes(" " + k + " "));
  const host = new URL(url).hostname.replace(/^www\./, "");
  return { kind: "user", title: `Shared link from ${host}`, url, source: host, stype: "User-submitted", cat: guessCat(txt), time: new Date().toISOString(), place: hit ? g[hit].n : "Philippines (national)", ll: hit ? g[hit].ll : null, geo: hit ? "psgc-match" : "national", summary: "Demo mode: title not fetched (needs the /api/share Function)." };
}
function guessCat(x) { const R = [["Disaster & Weather", /typhoon|flood|quake|bagyo|storm/], ["Laws & Policy", /law|bill|senate|court/], ["Economy & Jobs", /peso|price|job|inflation/], ["Sports", /pba|uaap|gilas|basketball/], ["Entertainment", /concert|movie|showbiz/], ["Government", /marcos|lgu|mayor|government/]]; return (R.find(([, r]) => r.test(x)) || ["Other"])[0]; }

/* ---------- MORE: donate, premium, sims, about ---------- */
async function viewMore() {
    page(`<h1>✨ More</h1><div class="grid">
   <div class="card glass"><h4>💛 ${t("donate")}</h4><p>Civi is free and pre-revenue. Donations help pay hosting and data costs.</p><a class="btn" href="#/donate">${t("donate")} · GCash · Maya · MariBank</a></div>
   <div class="card glass"><h4>⭐ ${t("premium")}</h4><p>We're studying what people would pay for (alerts for your province, data exports, ad-free, deeper analytics). Tell us what you'd use.</p>
     <form id="wl"><label class="row" style="font-size:12px"><input type="checkbox" name="f" value="alerts" style="width:auto"> Province alerts</label><label class="row" style="font-size:12px"><input type="checkbox" name="f" value="exports" style="width:auto"> Data exports (CSV)</label><label class="row" style="font-size:12px"><input type="checkbox" name="f" value="sims" style="width:auto"> Civi Sims early access</label><label class="row" style="font-size:12px"><input type="checkbox" name="f" value="analytics" style="width:auto"> Deeper analytics</label>
     <button class="btn sm" style="margin-top:6px">${t("waitlist")}</button></form><p style="font-size:11px;color:var(--mute)">Uses your account email only to tell you when Premium opens. Leave anytime.</p></div>
   <div class="card glass sims"><span class="chip ok">Beta: playable</span><h4>🎮 Civi Sims: Kung Ikaw ang Presidente</h4><p>Reallocate the real FY 2026 national budget (DBM GAA), pick policies, see illustrative outcomes, then share your suggestion in the Lounge.</p><a class="btn" href="#/sim">Play ▶</a><p style="font-size:11px;color:var(--mute)">Coming later (Phase 2): Datu of precolonial Philippines · Solarpunk Philippines · career sims (pilot, banker, investor, farmer, teacher, LGU mayor).</p></div>
   <div class="card glass"><h4>ℹ️ About Civi</h4><p>Knowledge as the people's tool. A Chainnes product in beta pilot. Open data, official sources, community voices.</p><a href="#/privacy">${t("privacy")}</a> · <a href="#/terms">${t("terms")}</a> · <a href="#/disclaimer">${t("disclaimer")}</a></div></div>`);
  $("#wl").onsubmit = async e => { e.preventDefault(); if (needLogin()) return; const f = $$("#wl input:checked").map(i => i.value);
    if (state.demo) { localStorage.setItem("civi.demo.waitlist", JSON.stringify(f)); return toast("Saved on this device (demo)"); }
    const r = await api("waitlist", { method: "POST", body: { features: f } }); toast(r.error ? "Failed" : "You're on the waitlist 💛"); };
}

/* ---------- LEGAL PAGES ---------- */
const LEGAL = {
 privacy: `<h1>Privacy Policy</h1><p class="sub">Beta draft, last updated Oct 29, 2026. Written to follow the Data Privacy Act of 2012 (<a href="https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html" target="_blank" rel="noopener">RA 10173</a>). Pending legal review.</p>
 <h2>Who we are</h2><p>Civi is a beta project of Chainnes. Personal information controller contact: <b><a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a></b>. Data Protection Officer: <b>[to be appointed]</b>.</p>
 <h2>What we collect</h2><ul><li><b>Browsing (no account):</b> nothing personal. Your language choice, onboarding hint and a random device id are kept in your browser's localStorage.</li>
 <li><b>Account:</b> email address, a public handle and display name, sign-in method (email or Google). From Google we receive only your email and basic profile, not your contacts or files.</li>
 <li><b>What you post:</b> topics, replies, votes, reports, shared links (URL plus its public title/caption/thumbnail), and Premium interest choices.</li>
 <li><b>Security logs:</b> rate-limit counters keyed to a salted one-way hash of your device id and IP. We do not store raw IP addresses in our database.</li></ul>
 <h2>Why (purpose)</h2><p>To run your account, show your posts, prevent spam and abuse, and (with your choice) tell you when Premium opens. Legal basis: your consent and our legitimate interest in keeping the service safe.</p>
 <h2>What we don't do</h2><p>We do not sell or rent personal data. No advertising trackers. We don't scrape private profiles or collect sensitive personal information.</p>
 <h2>Who processes it</h2><p>Supabase (database & authentication), Cloudflare (hosting), Google (only if you choose Google sign-in). Map tiles load from CARTO/OpenStreetMap servers, which see your IP like any website.</p>
 <h2>Retention</h2><p>Account data is kept while your account is active and deleted within 30 days after you ask us to delete it. Posts may be kept anonymized ("deleted user") to keep threads readable, unless you ask for full removal. Rate-limit records are kept up to 30 days. Waitlist entries are deleted when Premium launches or when you opt out.</p>
 <h2>Daily Briefing (in-app, email, push)</h2><p>The in-app briefing is on by default and uses your chosen topics and optional place (province/city from PSGC). Email and push are <b>off by default</b> and start only after you tick a consent box; we record when you consented. For email we use your account email and send through our email provider (a processor bound to process it only for this purpose). For push we store your device's push address and keys from your browser and delete them when you turn push off. Every email has a one-click unsubscribe, and you can change or turn off any channel in Briefing settings anytime. Briefing items are kept 30 days. Briefings contain links to public sources only; we don't track opens or clicks in emails.</p>
 <h2>Your rights</h2><p>Under RA 10173 you may be informed, access, object, correct, erase or block, get a copy (data portability), and claim damages. You can file a complaint with the <a href="https://privacy.gov.ph/" target="_blank" rel="noopener">National Privacy Commission</a>. To exercise your rights, email <b><a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a></b>.</p>
 <h2>Cookies & local storage</h2><p>Logged-in sessions use secure, HttpOnly cookies set by Civi. localStorage holds language, device id and (in demo mode) your demo posts. No ad or analytics cookies.</p>
 <h2>Children</h2><p>Accounts are for users 13 and older. Minors should have a parent or guardian's guidance.</p>
 <h2>Security & breaches</h2><p>Row-level security in the database, no keys in the browser, encryption in transit. If a breach affects you, we will notify you and the NPC as the law requires.</p>`,
 terms: `<h1>Terms of Use</h1><p class="sub">Beta draft, last updated Oct 29, 2026. Pending legal review.</p>
 <h2>Beta</h2><p>Civi is in beta. Features may change or break, and data may be incomplete.</p>
 <h2>Your content</h2><p>You own what you post, and you're responsible for it. You give Civi permission to display it on the service. Don't post private information about others, hate speech, threats, harassment, illegal content, or copyrighted material you have no right to share. Respect the Data Privacy Act and the Cybercrime Prevention Act.</p>
 <h2>Petitions & Sumbungan ng Bayan</h2><p>Report issues and public projects, not individuals. Do not name or show private persons. Every factual claim must cite a source. Accusations against officials belong with the Ombudsman, COA or the courts. Online libel is punishable under RA 10175. Civi never sends petitions, letters or FOI requests on your behalf; you send them yourself. Signer names are private by default. Photos are stripped of EXIF/GPS in your browser before upload.</p>
 <h2>Daily Briefing</h2><p>The briefing collects items already on Civi and links to their original sources. Civi doesn't write or verify the news; machine-generated summaries are labeled and may contain errors. Email and push are optional, sent only with your consent, and you can stop them anytime (one-click unsubscribe or Briefing settings). Delivery times are approximate and the briefing is not an emergency alert service: follow PAGASA, PHIVOLCS, NDRRMC and your LGU for warnings.</p>
 <h2>Moderation</h2><p>Posts reported by 3 or more different users are hidden automatically and may be reviewed. We may remove content or suspend accounts that break these terms.</p>
 <h2>Information & links</h2><p>Civi aggregates information from third-party sources and links to them. We don't guarantee accuracy, completeness or timeliness. Always verify with the official source.</p>
 <h2>No professional advice</h2><p>Law links are references, not legal advice. Health, financial and safety information is general, not professional advice.</p>
 <h2>Emergencies</h2><p>Civi is not an emergency service. Call 911 or your LGU's official hotline.</p>
 <h2>Contact</h2><p><b><a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a></b> (privacy and data requests)</p>`,
 disclaimer: `<h1>Disclaimers</h1><ul><li><b>Third-party data:</b> ${t("d_third")} Every item links to its source.</li><li><b>KPIs:</b> Official figures (PSA, World Bank, USGS) are labeled "official" and link to the source. The peso rate comes from ECB reference rates via Frankfurter, not BSP. Category counts are experimental keyword tags and may be wrong.</li>
 <li><b>Map locations:</b> Pins marked "≈ location" are placed by matching place names (PSGC) in the text, at province level, with a small offset so pins don't overlap. They are not exact addresses.</li>
 <li><b>Laws:</b> ${t("d_law")}</li><li><b>Translations:</b> Only English is human-written. All other languages are machine-assisted, pending native-speaker review. Tausug and Maguindanaon are low-confidence drafts. Logged-in users can send a better translation with “Suggest a better translation” (footer); suggestions are stored for community review.</li>
 <li><b>User content:</b> ${t("d_user")}</li><li><b>Emergencies:</b> ${t("d_emerg")}</li><li><b>Not government:</b> Civi is an independent project and is not affiliated with any government agency.</li></ul>`
};
const page = html => { const v = $("#view"); v.className = "page"; v.innerHTML = `<div id="featured" class="featured" aria-label="Featured"></div>` + html + footer(); scrollTo(0, 0); window.civiFeatured?.(); };

/* ---------- router ---------- */
const ROUTES = { map: viewMap, directory: viewDirectory, lounge: viewLounge, academy: viewAcademy, share: viewShare, more: viewMore,
  privacy: () => page(`<div class="prose">${LEGAL.privacy}</div>`), terms: () => page(`<div class="prose">${LEGAL.terms}</div>`), disclaimer: () => page(`<div class="prose">${LEGAL.disclaimer}</div>`) };
function route() {
  charts.forEach(c => c.destroy()); charts = []; if (map) { map.remove(); map = null; cluster = null; }
  const r = (location.hash.replace("#/", "") || "map").split("?")[0]; $$("#dock a").forEach(a => a.classList.toggle("on", a.dataset.r === r));
  (ROUTES[r] || viewMap)(); applyI18n();
}
$("#lang").innerHTML = CIVI_LANGS.map(([c, n]) => `<option value="${c}">${n}${c === "en" ? "" : " ·MT"}</option>`).join("");
$("#lang").value = state.lang; $("#lang").onchange = e => { state.lang = e.target.value; localStorage.setItem("civi.lang", state.lang); route(); };
addEventListener("hashchange", () => route());
loadMe().then(() => route());
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

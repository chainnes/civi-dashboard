/* Map UX batch 3: focus mode + per-panel show/hide, hover cards, hierarchical location filter, day/night by PH sunrise/sunset,
   transport layer + advisories. Loaded after hub.js. No API keys; tiles are OSM standard (keyless, light use only). */
(function () {
const X = { en: { f_esrc: "Event source", map_only: "Map only", panels: "Panels", p_glance: "At a Glance", p_fpanel: "Filters", p_tools: "Search bar & zoom", p_legend: "Legend bar", p_footer: "Footer links", p_chat: "Help chat button", p_transport: "Transport advisories", p_dock: "Side menu", p_sun: "Sunrise/sunset", restore: "Show panels (Esc)", hide_panel: "Hide panel",
  th_auto: "Auto (PH sunrise/sunset)", th_day: "Day", th_night: "Night", sunrise: "Sunrise", sunset: "Sunset", layers: "Map layers", l_transport: "Transport (airports, ports, rail, bus)", l_pins: "Show points (news, hazards, events)",
  tr_title: "Transport", tr_disc: "Links go to official pages only. Civi does not copy schedules or live status; always check the official site.", check_official: "Check the official site", loc_hint: "Region › Province › City/Municipality. Only places with items are listed.", more_events: "Find more events (link-only)",
  ev_link_disc: "Link-only: these sites have no public API Civi may use, so Civi does not copy their listings. Share an event link to add it to the map." },
 tl: { f_esrc: "Pinagmulan ng event", map_only: "Mapa lang", panels: "Mga panel", restore: "Ibalik ang mga panel (Esc)", hide_panel: "Itago ang panel", th_auto: "Auto (pagsikat/paglubog ng araw sa PH)", th_day: "Araw", th_night: "Gabi", sunrise: "Pagsikat", sunset: "Paglubog",
  layers: "Mga layer ng mapa", l_transport: "Transportasyon (airport, pantalan, tren, bus)", tr_title: "Transportasyon", tr_disc: "Sa opisyal na pahina lang ang mga link. Hindi kinokopya ng Civi ang schedule o live status; laging i-check ang opisyal na site.", more_events: "Iba pang event (link lang)" } };
for (const l in X) CIVI_I18N[l] = Object.assign(CIVI_I18N[l] || {}, X[l]);
const fine = () => matchMedia("(hover: hover) and (pointer: fine)").matches, reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- hierarchical location filter ---------- */
const open = new Set(JSON.parse(sessionStorage.getItem("civi.locopen") || "[]")); const saveOpen = () => sessionStorage.setItem("civi.locopen", JSON.stringify([...open]));
let TREE = null;
function build(all) { const T = {};
  all.forEach(i => { const r = itemKeys(i).region; const R = T[r] ||= { n: 0, p: {} }; R.n++; if (!i.prov) return; const P = R.p[i.prov] ||= { n: 0, c: {} }; P.n++; if (i.city) P.c[i.city] = (P.c[i.city] || 0) + 1; });
  return T; }
const off = g => state.f.off[g] || new Set();
window.civiLocTree = (all, label) => { TREE = build(all); const regs = Object.keys(TREE).sort((a, b) => TREE[b].n - TREE[a].n);
  const on = regs.filter(r => !off("region").has(r)).length; const lab = r => r === "National" ? t("national") : r;
  const cb = (g, v, l, n, kids) => `<li data-v="${esc(v)}" data-g="${g}" data-s="${esc(l.toLowerCase())}"><div class="tn">${kids ? `<button class="tw" aria-expanded="${open.has(g + v)}" aria-label="expand ${esc(l)}">${open.has(g + v) ? "▾" : "▸"}</button>` : `<span class="tw"></span>`}<label><input type="checkbox" ${off(g).has(v) ? "" : "checked"} value="${esc(v)}"><span class="fl-n">${esc(l)}</span><span class="fl-c">${n}</span></label><button class="only" data-lonly="${g}|${esc(v)}">${t("only")}</button></div>`;
  return `<details class="fg" data-g="loc" ${sessionStorage.getItem("fg.loc") === "0" ? "" : "open"}><summary>📍 ${esc(label.replace(/\s*\(.*\)/, ""))} <span class="chip">${on}/${regs.length}</span></summary>
  <input type="search" class="fq locq" placeholder="${esc(t("search"))}: Quezon City, Cebu…" aria-label="${esc(t("search"))} ${esc(label)}"><div class="sub" style="font-size:10.5px;margin:2px 0 4px">${t("loc_hint")}</div>
  <div class="row fa"><button class="btn ghost sm" data-lall>${t("select_all")}</button><button class="btn ghost sm" data-lnone>${t("unselect_all")}</button></div>
  <ul class="fl tree">${regs.map(r => { const ps = Object.keys(TREE[r].p).sort(); return cb("region", r, lab(r), TREE[r].n, ps.length) + (ps.length ? `<ul ${open.has("region" + r) ? "" : "hidden"}>${ps.map(p => { const cs = Object.keys(TREE[r].p[p].c).sort();
    return cb("prov", p, p, TREE[r].p[p].n, cs.length) + (cs.length ? `<ul ${open.has("prov" + p) ? "" : "hidden"}>${cs.map(c => cb("city", c, c, TREE[r].p[p].c[c]) + "</li>").join("")}</ul>` : "") + "</li>"; }).join("")}</ul>` : "") + "</li>"; }).join("")}</ul></details>`; };
window.civiLocWire = all => { const ev = $('#fGroups details[data-g="esrc"]'); if (ev) ev.insertAdjacentHTML("beforeend", `<div class="evlinks"><b>${t("more_events")}</b><div class="sub" style="font-size:10.5px">${t("ev_link_disc")}</div>${EV_LINKS.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(n)} ↗</a>`).join(" · ")}</div>`);
  const d = $('#fGroups details[data-g="loc"]'); if (!d) return; const T = TREE;
  d.addEventListener("toggle", () => sessionStorage.setItem("fg.loc", d.open ? "1" : "0"));
  $$(".tw[aria-expanded]", d).forEach(b => b.onclick = e => { e.preventDefault(); const li = b.closest("li"), k = li.dataset.g + li.dataset.v, ul = li.querySelector(":scope>ul"); const o = ul.hidden; ul.hidden = !o; b.textContent = o ? "▾" : "▸"; b.setAttribute("aria-expanded", o); o ? open.add(k) : open.delete(k); saveOpen(); });
  $$("input[type=checkbox]", d).forEach(c => c.onchange = () => { const g = c.closest("li").dataset.g, s = offSet(g); c.checked ? s.delete(c.value) : s.add(c.value); saveF(); refresh(); zoomLoc(g, c.value, c.checked); });
  d.querySelector("[data-lall]").onclick = () => { ["region", "prov", "city"].forEach(g => delete state.f.off[g]); saveF(); refresh(); civiHome(); };
  d.querySelector("[data-lnone]").onclick = () => { state.f.off.region = new Set(Object.keys(T)); saveF(); refresh(); civiHome(); };
  $$("[data-lonly]", d).forEach(b => b.onclick = () => { const [g, v] = b.dataset.lonly.split("|"); const R = Object.keys(T), P = R.flatMap(r => Object.keys(T[r].p)), C = R.flatMap(r => Object.values(T[r].p).flatMap(p => Object.keys(p.c)));
    const reg = g === "region" ? v : R.find(r => g === "prov" ? T[r].p[v] : Object.values(T[r].p).some(p => p.c[v])), prov = g === "prov" ? v : g === "city" ? Object.keys(T[reg].p).find(p => T[reg].p[p].c[v]) : null;
    state.f.off.region = new Set(R.filter(x => x !== reg)); state.f.off.prov = new Set(prov ? [...P.filter(x => x !== prov), "∅"] : []); state.f.off.city = new Set(g === "city" ? [...C.filter(x => x !== v), "∅"] : []);
    saveF(); refresh(); if (g === "region") selectRegion(v); else { const it = state._all.find(i => (g === "city" ? i.city : i.prov) === v && i.ll); if (it) map.flyTo(it.ll, g === "city" ? 12.5 : 9.5, { duration: reduce() ? 0 : .9 }); } open.add("region" + reg); if (prov) open.add("prov" + prov); saveOpen(); });
  const q = d.querySelector(".locq"); q.oninput = () => { const s = q.value.trim().toLowerCase();
    $$("li", d).forEach(li => { const hit = !s || li.dataset.s.includes(s) || [...li.querySelectorAll("li")].some(x => x.dataset.s.includes(s)); li.hidden = !hit; if (s && hit) { const ul = li.querySelector(":scope>ul"); if (ul) ul.hidden = false; } }); };
};

/* auto-zoom: ticking a place zooms to it; when every place is on or off, show the whole Philippines */
const civiHome = () => { if (selLayer) { map.removeLayer(selLayer); selLayer = null; } window._civiHome?.(); };
function zoomLoc(g, v, on) { if (!map) return; const regs = Object.keys(TREE || {}), offR = off("region");
  if (!offR.size || offR.size >= regs.length) return civiHome();
  if (on && g === "region" && state._geo?.features.some(f => f.properties.name === v)) return selectRegion(v);
  const pts = visible(state._all).filter(i => i.ll).map(i => i.ll); if (!pts.length) return civiHome();
  const vis = sel => { const e = $(sel); return e && !e.classList.contains("pp-hide") && !e.classList.contains("collapsed") && innerWidth >= 900; };
  map.flyToBounds(L.latLngBounds(pts).pad(.15), { maxZoom: 12, paddingTopLeft: [vis("#glance") ? 420 : 40, 70], paddingBottomRight: [vis("#fpanel") ? 330 : 40, 60], duration: reduce() ? 0 : .9 }); }

/* ---------- hover cards (desktop) ---------- */
const mini = i => `<div class="hc"><b>${esc(i.title.slice(0, 110))}</b><div class="hc-m"><span style="color:${CAT[i.cat] || "#9aa8bb"}">● ${esc(i.cat)}</span> · ${esc(i.source)}${i.esrc && i.esrc !== i.source ? " · " + esc(i.esrc) : ""}</div><div class="hc-m">📍 ${esc(i.city || i.place || i.prov || "")} · ${esc(ago(i.time) || "")}</div><div class="hc-k">click for source ↗ and ☆ save</div></div>`;
window.civiHover = cl => { if (!fine()) return; let tm, tt = L.tooltip({ direction: "top", offset: [0, -10], opacity: 1, className: "hovercard" });
  const show = (ll, html) => { clearTimeout(tm); tm = setTimeout(() => { if (map.hasLayer(tt)) map.closeTooltip(tt); tt.setLatLng(ll).setContent(html); map.openTooltip(tt); }, 140); };
  const hide = () => { clearTimeout(tm); tm = setTimeout(() => map.closeTooltip(tt), 120); };
  cl.on("mouseover", e => e.layer._item && show(e.layer.getLatLng(), mini(e.layer._item))); cl.on("mouseout", hide);
  cl.on("clustermouseover", e => { const ms = e.layer.getAllChildMarkers(), cats = {}; ms.forEach(m => m._item && (cats[m._item.cat] = (cats[m._item.cat] || 0) + 1));
    show(e.layer.getLatLng(), `<div class="hc"><b>${ms.length} items here</b>${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<div class="hc-m"><span style="color:${CAT[c]}">●</span> ${esc(c)} ${n}</div>`).join("")}${ms.slice(0, 3).map(m => `<div class="hc-t">• ${esc((m._item?.title || "").slice(0, 70))}</div>`).join("")}<div class="hc-k">click to zoom in</div></div>`); });
  cl.on("clustermouseout", hide); cl.on("click clusterclick", () => { clearTimeout(tm); map.closeTooltip(tt); }); };

/* ---------- day / night (NOAA solar approximation, Manila 14.5995N 120.9842E, PHT = UTC+8) ---------- */
function sun(d = new Date()) { const pht = new Date(d.getTime() + 8 * 36e5), y0 = Date.UTC(pht.getUTCFullYear(), 0, 1), N = Math.floor((pht - y0) / 864e5) + 1, rad = Math.PI / 180, lat = 14.5995, lon = 120.9842;
  const g = 2 * Math.PI / 365 * (N - 1), eq = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
  const de = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(de)) - Math.tan(lat * rad) * Math.tan(de)) / rad;
  const rise = 720 - 4 * (lon + ha) - eq + 480, set = 720 - 4 * (lon - ha) - eq + 480, now = pht.getUTCHours() * 60 + pht.getUTCMinutes();
  return { rise, set, now, day: now >= rise && now < set }; }
const hm = m => { const h = Math.floor(m / 60), mi = Math.round(m % 60); return `${(h + 11) % 12 + 1}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const themeMode = () => localStorage.getItem("civi.theme") || "auto";
function applyTheme(mask) { const s = sun(), m = themeMode(), day = m === "day" || (m === "auto" && s.day); document.documentElement.dataset.theme = day ? "day" : "night";
  mask?.setStyle({ fillColor: day ? "#dfe8f1" : "#03060c" }); const el = $("#sunInd"); if (el) el.innerHTML = `<span title="${esc(t("sunrise"))}">☀️ ${hm(s.rise)}</span> <span title="${esc(t("sunset"))}">🌙 ${hm(s.set)}</span> <span class="mute">PHT</span>`; }

/* ---------- transport ---------- */
const TR_KEY = "civi.layer.transport"; let trLayer;
async function transport(mapI) { let tm, ct; try { [tm, ct] = await Promise.all([data("transport_map"), data("civic_transport")]); } catch { return; }
  const U = n => ct.items.find(i => i.name.startsWith(n)) || {}; const link = (o, extra = "") => o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.name)} ↗</a>${extra}` : "";
  const LINE = { "LRT-1": ["#ffc24b", U("LRT-1")], "LRT-2": ["#b48cff", U("LRT-2")], "MRT-3": ["#38e1ff", U("MRT-3")], PNR: ["#ff8a3d", U("Philippine National")] };
  const pop = (ic, n, kind, links) => `<div class="pc"><h4>${ic} ${esc(n)}</h4><div class="chips"><span class="chip">${esc(kind)}</span></div><p style="font-size:12px">${links.filter(Boolean).join("<br>")}</p><div class="disc" style="font-size:11px">${t("check_official")}. ${t("tr_disc")}</div><div style="font-size:10px;color:var(--mute)">📍 © OpenStreetMap contributors (ODbL)</div></div>`;
  const ico = (e, c) => L.divIcon({ className: "", html: `<div class="tpin" style="--c:${c}">${e}</div>`, iconSize: [24, 24] });
  trLayer = L.layerGroup(); const add = (ll, e, c, n, kind, links) => { const m = L.marker(ll, { icon: ico(e, c), title: n }).bindPopup(pop(e, n, kind, links), { maxWidth: 280 }); if (fine()) m.bindTooltip(`${e} ${esc(n)}`, { direction: "top", offset: [0, -10] }); trLayer.addLayer(m); };
  (tm.lines || []).forEach(l => l.segs.forEach(s => L.polyline(s, { color: (LINE[l.line] || ["#9aa8bb"])[0], weight: 4, opacity: .85, interactive: false }).addTo(trLayer)));
  (tm.rail || []).forEach(s => add(s.ll, "🚆", (LINE[s.line] || ["#9aa8bb"])[0], s.n, s.line + " station", [link((LINE[s.line] || [])[1] || {}), link(U("Sakay.ph route"))]));
  (tm.airports || []).forEach(a => add(a.ll, "✈️", "#7ee0ff", `${a.n} (${a.iata})`, "Airport", [a.iata === "MNL" ? link(U("NAIA")) : link(U("CAAP")), link(U("Philippine Airlines")), link(U("Cebu Pacific")), link(U("AirAsia")), link(U("PAGASA"))]));
  (tm.ports || []).forEach(p => add(p.ll, "⚓", "#36f1b8", p.n, "Seaport / ferry terminal", [link(U("Philippine Ports")), link(U("Philippine Coast Guard")), link(U("MARINA")), link(U("2GO")), link(U("Starlite")), link(U("OceanJet"))]));
  (tm.bus || []).forEach(b => add(b.ll, "🚌", "#ffe36e", b.n, "Bus terminal", [/PITX|Parañaque Integrated/i.test(b.n) ? link(U("PITX")) : "", link(U("LTFRB")), link(U("DOTr")), link(U("Sakay.ph route"))]));
  const on = () => localStorage.getItem(TR_KEY) !== "0"; if (on()) trLayer.addTo(mapI);
  const lg = $("#fGroups"); if (lg) lg.insertAdjacentHTML("beforebegin", `<details class="fg" id="layersFg" open><summary>🗂️ ${t("layers")}</summary><ul class="fl"><li><label><input type="checkbox" id="lyTr" ${on() ? "checked" : ""}><span class="fl-n">🚆 ${t("l_transport")}</span><span class="fl-c">${trLayer.getLayers().length}</span></label></li><li><label><input type="checkbox" id="lyPins" ${localStorage.getItem("civi.pins") === "0" ? "" : "checked"}><span class="fl-n">📍 ${t("l_pins")}</span></label></li></ul></details>`);
  $("#lyPins")?.addEventListener("change", e => { localStorage.setItem("civi.pins", e.target.checked ? "1" : "0"); if (cluster) e.target.checked ? map.addLayer(cluster) : map.removeLayer(cluster); });
  $("#lyTr")?.addEventListener("change", e => { localStorage.setItem(TR_KEY, e.target.checked ? "1" : "0"); e.target.checked ? trLayer.addTo(mapI) : mapI.removeLayer(trLayer); });
  const adv = [["🌊", "PAGASA weather & gale advisories", "https://bagong.pagasa.dost.gov.ph/weather/weather-advisory"], ["⚓", "Coast Guard (sea travel status)", U("Philippine Coast Guard").url], ["✈️", "NAIA / MIAA flight info", U("NAIA").url], ["✈️", "CAAP (airports)", U("CAAP").url],
    ["🚈", "LRT-1 service updates", U("LRT-1").url], ["🚈", "LRT-2 service updates", U("LRT-2").url], ["🚈", "MRT-3 service updates", U("MRT-3").url], ["🚆", "PNR", U("Philippine National").url], ["🌋", "PHIVOLCS (ash advisories)", U("PHIVOLCS").url]].filter(a => a[2]);
  $("#glance")?.insertAdjacentHTML("beforeend", `<section class="panel glass" id="trPanel"><h3><span>🚦 ${t("tr_title")}</span></h3><ul class="advl">${adv.map(([e, n, u]) => `<li>${e} <a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a></li>`).join("")}</ul><div class="sub" style="font-size:10.5px">${t("tr_disc")} Live feeds are not used because no official public feed was found.</div></section>`);
}
const EV_LINKS = [["Luma (Manila)", "https://luma.com/manila"], ["Eventbrite Philippines", "https://www.eventbrite.com/d/philippines/events/"], ["Facebook Events", "https://www.facebook.com/events/explore/manila"], ["Meetup (Manila)", "https://www.meetup.com/find/?location=ph--Manila"],
  ["Allevents (Manila)", "https://allevents.in/manila"], ["Ticketnet", "https://www.ticketnet.com.ph/"], ["SM Tickets", "https://smtickets.com/"], ["TicketWorld", "https://ticketworld.com.ph/"], ["Klook PH", "https://www.klook.com/en-PH/"], ["DOT: philippines.travel", "https://philippines.travel/"], ["Google Developer Groups", "https://gdg.community.dev/"]];

/* ---------- focus mode + per-panel toggles ---------- */
const PANELS = [["glance", "#glance"], ["fpanel", "#fpanel"], ["transport", "#trPanel"], ["tools", ".map-tools"], ["legend", "#hudBottom"], ["footer", ".footer.onmap"], ["chat", "#chatFab"], ["sun", "#sunInd"], ["dock", "#dock"]];
const HKEY = "civi.panels.hidden"; const hidden = () => new Set(JSON.parse(localStorage.getItem(HKEY) || '["dock_x"]'));
function syncPanels() { const h = hidden(), f = document.body.classList.contains("map-focus");
  PANELS.forEach(([k, s]) => $$(s).forEach(el => el.classList.toggle("pp-hide", f || h.has(k)))); $("#mobTog")?.classList.toggle("pp-hide", f);
  $$(".mobile-toggle").forEach(el => el.classList.toggle("pp-hide", f)); const b = $("#focusBtn"); if (b) { b.classList.toggle("on", f); b.setAttribute("aria-pressed", f); b.innerHTML = f ? `⤢ ${t("restore")}` : `🗺️ ${t("map_only")}`; } }
const setHidden = (k, v) => { const h = hidden(); v ? h.add(k) : h.delete(k); localStorage.setItem(HKEY, JSON.stringify([...h])); syncPanels(); renderMenu(); };
function renderMenu() { const m = $("#panelMenu"); if (!m) return; const h = hidden(); m.innerHTML = PANELS.map(([k]) => `<label><input type="checkbox" data-pk="${k}" ${h.has(k) ? "" : "checked"}> ${t("p_" + k)}</label>`).join("") + `<hr><label class="sub">${t("panels")}: ${t("restore")}</label>`;
  $$("[data-pk]", m).forEach(c => c.onchange = () => setHidden(c.dataset.pk, !c.checked)); }
const focus = v => { document.body.classList.toggle("map-focus", v ?? !document.body.classList.contains("map-focus")); syncPanels(); setTimeout(() => map?.invalidateSize(), 350); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("map-focus")) focus(false); });
window.addEventListener("hashchange", () => { if (!/^#\/map|^#?$/.test(location.hash)) { document.body.classList.remove("map-focus", "on-map"); $("#mapCtl")?.remove(); $("#actPanel")?.remove(); $$(".pp-hide").forEach(e => e.classList.remove("pp-hide")); } });

window.civiMapExtras = async ({ map: M, all, mask, home }) => { window._civiHome = home;
  document.body.classList.add("on-map");
  $("#mapCtl")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div id="mapCtl" class="glass map-ctl" role="toolbar" aria-label="Map view"><button class="btn sm" id="focusBtn" aria-pressed="false"></button>
    <div class="pm-wrap"><button class="btn ghost sm" id="panelsBtn" aria-expanded="false" aria-controls="panelMenu">▦ ${t("panels")}</button><div id="panelMenu" class="glass pmenu" hidden></div></div>
    <span id="sunInd" class="sun-ind"></span></div>`);
  const pb = $("#panelsBtn"), pmn = $("#panelMenu"); pb.onclick = () => { pmn.hidden = !pmn.hidden; pb.setAttribute("aria-expanded", !pmn.hidden); renderMenu(); };
  document.addEventListener("click", e => { if (!e.target.closest(".pm-wrap")) { pmn.hidden = true; pb.setAttribute("aria-expanded", "false"); } });
  $("#focusBtn").onclick = () => focus(); window._civiMask = mask; applyTheme(mask);
  await transport(M);
  [["glance", "#glance .panel h3"], ["fpanel", "#fpanel .panel h3"], ["transport", "#trPanel h3"]].forEach(([k, s]) => { const h = $(s); h?.insertAdjacentHTML("beforeend", `<button class="btn ghost sm px" data-px="${k}" aria-label="${esc(t("hide_panel"))}" title="${esc(t("hide_panel"))}">✕</button>`); });
  $$("[data-px]").forEach(b => b.onclick = () => setHidden(b.dataset.px, true));
  window.civiFeatured?.("map"); window.civiWeather?.(); syncPanels();
};
window.civiSun = sun; window.civiThemeMode = themeMode;
window.civiApplyTheme = () => applyTheme(map && window._civiMask && map.hasLayer(window._civiMask) ? window._civiMask : null);
civiApplyTheme(); clearInterval(window._sunT); window._sunT = setInterval(civiApplyTheme, 60000);
})();

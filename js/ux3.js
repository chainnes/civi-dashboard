/* UX batch 4 (loaded last): global Auto/Day/Night theme selector in the top bar, Featured strip on every page,
   Weather today (Open-Meteo, keyless, + PAGASA link). No keys; the browser sends only the map point's coordinates to Open-Meteo. */
(function () {
const X = { en: { theme: "Theme", featured: "Featured", acad_q: "Search guides or ask: e.g. paano mag-ipon, passport, hydroponics", all: "All",
  th_next: "Click to change", wx_title: "Weather today", wx_feels: "Feels like", wx_rain: "Rain chance", wx_wind: "Wind", wx_src: "Model forecast by Open-Meteo (not PAGASA)", wx_asof: "as of", wx_pagasa: "Official forecasts & warnings: PAGASA", wx_fail: "Weather unavailable right now." },
 tl: { theme: "Tema", featured: "Tampok", acad_q: "Maghanap ng gabay o magtanong: hal. paano mag-ipon, passport, hydroponics", all: "Lahat",
  th_next: "I-click para palitan", wx_title: "Panahon ngayon", wx_feels: "Pakiramdam", wx_rain: "Tsansa ng ulan", wx_wind: "Hangin", wx_src: "Forecast model ng Open-Meteo (hindi PAGASA)", wx_asof: "as of", wx_pagasa: "Opisyal na forecast at babala: PAGASA", wx_fail: "Hindi makuha ang panahon ngayon." } };
for (const l in X) CIVI_I18N[l] = Object.assign(CIVI_I18N[l] || {}, X[l]);

/* theme selector: every page */
function themeSel() { $("#themeSel")?.remove(); if ($("#themeTog")) return syncTheme(); const ta = $(".top-actions"); if (!ta) return;
  ta.insertAdjacentHTML("afterbegin", `<button id="themeTog" class="btn ghost sm theme-tog" type="button"></button>`);
  $("#themeTog").onclick = () => { const order = ["auto", "day", "night"], cur = window.civiThemeMode?.() || "auto"; localStorage.setItem("civi.theme", order[(order.indexOf(cur) + 1) % 3]); window.civiApplyTheme?.(); syncTheme(); }; syncTheme(); }
/* compact icon toggle: Auto (follows PH sunrise/sunset) -> Day -> Night */
function syncTheme() { const b = $("#themeTog"); if (!b) return; const m = window.civiThemeMode?.() || "auto", ic = { auto: "🌗", day: "☀️", night: "🌙" }[m];
  const lab = `${t("theme")}: ${t("th_" + m)}. ${t("th_next")}`; b.textContent = ic; b.title = lab; b.setAttribute("aria-label", lab); b.dataset.mode = m; }
themeSel(); addEventListener("hashchange", () => setTimeout(themeSel, 0));

/* featured strip */
const routeKey = () => { const r = (location.hash.replace("#/", "") || "map").split("?")[0]; return ["petitions", "sumbong", "foi", "projects", "rights", "impact", "scholarships"].includes(r) ? "empower" : r === "howto" ? "academy" : r; };
window.civiFeatured = async (key) => { let F; try { F = await data("featured"); } catch { return; } key = key || routeKey(); const items = F.pages[key] || F.pages.default;
  const html = `<span class="ft-l">⭐ ${t("featured")}</span>${items.map(f => `<a class="ft-i" href="${esc(f.u)}" ${f.u.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${f.i} ${esc(state.lang === "tl" ? f.tl : f.t)}${f.u.startsWith("http") ? " ↗" : ""}</a>`).join("")}`;
  if (key === "map") { $("#featMap")?.remove(); $("#glance")?.insertAdjacentHTML("afterbegin", `<section class="panel glass featured onmap" id="featMap">${html}</section>`); return; }
  const el = $("#featured"); if (el) el.innerHTML = html; };

/* weather today */
const WMO = { 0: ["☀️", "Clear"], 1: ["🌤️", "Mainly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"], 45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"], 51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌧️", "Heavy drizzle"],
  61: ["🌦️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"], 80: ["🌦️", "Rain showers"], 81: ["🌧️", "Rain showers"], 82: ["⛈️", "Violent showers"], 95: ["⛈️", "Thunderstorm"], 96: ["⛈️", "Thunderstorm, hail"], 99: ["⛈️", "Thunderstorm, hail"] };
let wxPlace = { name: "Manila", ll: [14.5995, 120.9842] };
async function weather(p) { if (p) wxPlace = p; const g = $("#glance"); if (!g) return; let w = $("#wxPanel");
  if (!w) { (($("#featMap") || {}).after ? $("#featMap").insertAdjacentHTML("afterend", `<section class="panel glass" id="wxPanel" aria-live="polite"></section>`) : g.insertAdjacentHTML("afterbegin", `<section class="panel glass" id="wxPanel" aria-live="polite"></section>`)); w = $("#wxPanel"); }
  const [la, lo] = wxPlace.ll; w.innerHTML = `<h3><span>🌤️ ${t("wx_title")} · ${esc(wxPlace.name)}</span></h3><p class="sub">…</p>`;
  try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la.toFixed(3)}&longitude=${lo.toFixed(3)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FManila&forecast_days=1`);
    if (!r.ok) throw 0; const d = await r.json(), c = d.current, [ic, lab] = WMO[c.weather_code] || ["🌡️", "—"];
    w.innerHTML = `<h3><span>🌤️ ${t("wx_title")} · ${esc(wxPlace.name)}</span></h3><div class="wx"><span class="wx-i" aria-hidden="true">${ic}</span><div><div class="wx-t">${Math.round(c.temperature_2m)}°C <small>${esc(lab)}</small></div>
      <div class="wx-m">${t("wx_feels")} ${Math.round(c.apparent_temperature)}°C · H ${Math.round(d.daily.temperature_2m_max[0])}° / L ${Math.round(d.daily.temperature_2m_min[0])}° · 💧 ${c.relative_humidity_2m}%</div>
      <div class="wx-m">${t("wx_rain")} ${d.daily.precipitation_probability_max[0] ?? "—"}% · ${t("wx_wind")} ${Math.round(c.wind_speed_10m)} km/h</div></div></div>
      <div class="src">${t("wx_src")} · ${t("wx_asof")} ${esc(c.time.slice(11, 16))} PHT · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo ↗</a> (CC BY 4.0)</div>
      <div class="src"><a href="https://bagong.pagasa.dost.gov.ph/weather" target="_blank" rel="noopener"><b>${t("wx_pagasa")} ↗</b></a></div>`;
  } catch { w.innerHTML = `<h3><span>🌤️ ${t("wx_title")}</span></h3><p class="sub">${t("wx_fail")} <a href="https://bagong.pagasa.dost.gov.ph/weather" target="_blank" rel="noopener">${t("wx_pagasa")} ↗</a></p>`; } }
window.civiWeather = weather;
document.addEventListener("civi:place", e => weather(e.detail));
})();

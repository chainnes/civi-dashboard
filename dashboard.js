/* Civi dashboard. Directory counts come from data/directory.json. Story counts come from data/news.json. */
const NEWS_LIVE = "https://civi-news.charlenecordero28.workers.dev/news";
const UI = {
  en: { searchLabel: "Search stories and services", search: "Search typhoon, SSS, passport…", topics: "Topics", dashboard: "Dashboard", about: "About Civi", home: "Home", tabEmergency: "Emergency", tabIds: "IDs", tabBenefits: "Benefits", tabTopics: "Topics",
    disclaimer: "Headlines are quoted from public feeds and link back to the outlet. Civi sorts them by words in the headline. It does not check that a story is true, and it is not a government website.", suggest: "Suggest a site or report a broken link",
    hello: "What's happening in the Philippines", helloSub: "Civi reads public news feeds, files each headline under a topic, and groups the same story when more than one outlet reports it.",
    services: "Services directory", servicesSub: "Official government, legal, and community sites, free tools, and free courses.",
    inNews: "In the news", stories: "stories", feeds: "feeds", updated: "Updated", unavailable: "The briefing could not load. The services directory is still here.",
    filed: "Filed under", because: "because the headline says", nationWhy: "No topic word matched, so this stays under Nation.",
    outlets: "outlets", readAt: "Read at",
    hotlines: "Emergency hotlines", tapCall: "Tap to call", topTopics: "Top topics", topSub: "Ranked by importance · sites per topic", mix: "How this briefing sorted", mixSub: "Counted from the headlines below", courses: "Free courses", idsW: "Get your IDs & documents", benefitsW: "Benefits", legalW: "Legal help", toolsW: "Free tools",
    checkedW: "Links last checked", official: "Official", community: "Community", total: "sites in the directory", seeAll: "See all", sites: "sites", back: "← Dashboard", all: "All", officialOnly: "Official only", results: "Results", none: "No matches. Try another word.", free: "Free", rank: "Rank", communityChip: "Reputable / community", lang: "FIL", langLabel: "Lipat sa Filipino" },
  fil: { searchLabel: "Maghanap ng balita at serbisyo", search: "Hanapin: bagyo, SSS, passport…", topics: "Mga Paksa", dashboard: "Dashboard", about: "Tungkol sa Civi", home: "Home", tabEmergency: "Emerhensiya", tabIds: "ID", tabBenefits: "Benepisyo", tabTopics: "Paksa",
    disclaimer: "Galing sa pampublikong feed ang mga ulo ng balita at may link pabalik sa outlet. Inuuri ng Civi ayon sa mga salita sa ulo. Hindi nito tinitiyak na totoo ang balita, at hindi ito website ng gobyerno.", suggest: "Magmungkahi ng site o i-report ang sirang link",
    hello: "Ano ang nangyayari sa Pilipinas", helloSub: "Binabasa ng Civi ang pampublikong news feed, inilalagay ang bawat ulo ng balita sa isang paksa, at pinagsasama ang iisang kwento kapag maraming outlet ang nag-ulat.",
    services: "Direktoryo ng serbisyo", servicesSub: "Opisyal na site ng gobyerno, batas, at komunidad, libreng gamit, at libreng kurso.",
    inNews: "Sa mga balita", stories: "kwento", feeds: "feed", updated: "Na-update", unavailable: "Hindi ma-load ang briefing. Nandito pa rin ang direktoryo ng serbisyo.",
    filed: "Nasa", because: "dahil nakasaad ang", nationWhy: "Walang katugmang salita, kaya nasa Bansa.",
    outlets: "outlet", readAt: "Basahin sa",
    hotlines: "Mga emergency hotline", tapCall: "Pindutin para tumawag", topTopics: "Pangunahing paksa", topSub: "Ayon sa kahalagahan · bilang ng site", mix: "Paano inuri ang briefing na ito", mixSub: "Bilang mula sa mga ulo ng balita sa ibaba", courses: "Libreng kurso", idsW: "Kumuha ng ID at dokumento", benefitsW: "Mga benepisyo", legalW: "Tulong legal", toolsW: "Libreng gamit",
    checkedW: "Huling sinuri ang mga link", official: "Opisyal", community: "Komunidad", total: "site sa direktoryo", seeAll: "Tingnan lahat", sites: "site", back: "← Dashboard", all: "Lahat", officialOnly: "Opisyal lang", results: "Resulta", none: "Walang tugma. Subukan ang ibang salita.", free: "Libre", rank: "Ranggo", communityChip: "Mapagkakatiwalaan / komunidad", lang: "EN", langLabel: "Switch to English" },
};
const NATION = { id: "nation", name: "Nation", nameFil: "Bansa", icon: "📰" };
let lang = localStorage.getItem("civi-lang") || "en";
let data = null;
let news = null;
let counts = {};
const state = { tag: null, officialOnly: false, newsTopic: "" };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const t = (k) => UI[lang][k];
const topicById = (id) => (id === "nation" ? NATION : data.topics.find((x) => x.id === id));
const tName = (tp) => (lang === "fil" ? tp.nameFil : tp.name);
const tReason = (tp) => (lang === "fil" ? tp.reasonFil : tp.reason);
const sDesc = (s) => (lang === "fil" ? s.descFil : s.description);
const host = (u) => new URL(u).hostname.replace(/^www\./, "");

/* ---------- pieces ---------- */
function siteCard(s) {
  return `<li class="site"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">
    <span class="site-name">${esc(s.name)}</span>
    <span class="site-desc">${esc(sDesc(s))}</span>
    <span class="chips"><span class="chip ${s.official ? "chip-official" : ""}">${s.official ? t("official") : t("communityChip")}</span>${s.free ? `<span class="chip">${t("free")}</span>` : ""}<span class="chip chip-dim">${esc(tName(topicById(s.topic)))}</span></span>
    <span class="site-url">${esc(host(s.url))} ↗</span></a></li>`;
}
function quickRow(s) {
  return `<li><a class="quick" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span class="quick-text"><span class="quick-name">${esc(s.name)}</span><span class="quick-desc">${esc(sDesc(s))}</span></span><span class="quick-go" aria-hidden="true">↗</span></a></li>`;
}
function widget({ id, cls = "", icon, title, sub = "", body, topic }) {
  const href = topic === "all" ? "#all" : topic ? `#topic/${topic}` : "";
  const see = href ? `<a class="see-all" href="${href}">${t("seeAll")}<span class="sr-only">: ${esc(title)}</span> →</a>` : "";
  return `<section class="widget ${cls}" aria-labelledby="w-${id}"><header class="w-head"><h2 id="w-${id}"><span class="w-icon" aria-hidden="true">${icon}</span>${esc(title)}</h2>${see}</header>${sub ? `<p class="w-sub">${esc(sub)}</p>` : ""}${body}</section>`;
}
function barChart() {
  const tps = [...data.topics].sort((a, b) => a.rank - b.rank);
  const max = Math.max(...tps.map((tp) => counts[tp.id] || 0));
  const rowH = 30, labelW = 0, W = 100;
  const rows = tps.map((tp, i) => {
    const n = counts[tp.id] || 0;
    const w = Math.max(2, (n / max) * 100);
    return `<li><a class="bar-row" href="#topic/${tp.id}"><span class="bar-rank">${tp.rank}</span><span class="bar-label">${esc(tName(tp))}</span>
      <svg class="bar" viewBox="0 0 ${W} 10" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="${W}" height="10" rx="5" class="bar-bg"/><rect x="0" y="0" width="${w}" height="10" rx="5" class="bar-fg"/></svg>
      <span class="bar-n">${n}<span class="sr-only"> ${t("sites")}</span></span></a></li>`;
  });
  return `<ol class="bars">${rows.join("")}</ol>`;
}
function bySiteNames(names) { return names.map((n) => data.sites.find((s) => s.name === n)).filter(Boolean); }
function whenLabel(iso) {
  const time = Date.parse(iso);
  if (!time) return "";
  const mins = Math.round((Date.now() - time) / 60000);
  if (mins < 60) return lang === "fil" ? `${Math.max(mins, 1)} min ang nakalipas` : `${Math.max(mins, 1)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return lang === "fil" ? `${hours} oras ang nakalipas` : `${hours} hr ago`;
  return new Date(time).toLocaleString(lang === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function manilaStamp(iso) {
  const time = Date.parse(iso);
  if (!time) return "";
  return new Date(time).toLocaleString(lang === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function briefingsFor(topicId) {
  if (!news) return [];
  return topicId ? news.briefings.filter((item) => item.topic === topicId) : news.briefings;
}
function whyLine(item, topic) {
  if (!item.matched) return t("nationWhy");
  return `${t("filed")} ${tName(topic)} ${t("because")} “${item.matched}”.`;
}
function briefingCard(item) {
  const topic = topicById(item.topic) || NATION;
  const href = topic.id === "nation" ? "#news/nation" : `#topic/${topic.id}`;
  const sources = item.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)}${source.official ? ` · ${t("official")}` : ""} ↗</a></li>`).join("");
  return `<li class="briefing"><div class="briefing-top"><a class="chip" href="${href}">${topic.icon} ${esc(tName(topic))}</a>${item.published ? `<time datetime="${esc(item.published)}">${esc(whenLabel(item.published))}</time>` : ""}</div><h3><a href="${esc(item.sources[0].url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3><p class="why">${esc(whyLine(item, topic))}</p><p class="sr-only">${t("readAt")}</p><ul class="briefing-sources">${sources}</ul></li>`;
}
function newsMeta() {
  const failed = news.sources.filter((source) => source.error).length;
  const stamp = manilaStamp(news.fetchedAt);
  return `<p class="news-meta">${t("updated")} ${esc(stamp)} · ${news.briefings.length} ${t("stories")} · ${news.sources.length - failed} ${t("feeds")}</p>`;
}
function newsFilters(active) {
  const ids = ["", ...data.topics.map((topic) => topic.id), "nation"].filter((id) => id === "" || briefingsFor(id).length);
  return `<div class="filters" role="group" aria-label="${esc(t("topics"))}">${ids.map((id) => {
    const topic = id ? topicById(id) : null;
    const label = id ? `${topic.icon} ${tName(topic)}` : t("all");
    return `<button type="button" class="pill" aria-pressed="${active === id}" data-news="${esc(id)}">${esc(label)}</button>`;
  }).join("")}</div>`;
}
function bindNewsFilters() {
  $("#view").querySelectorAll("[data-news]").forEach((button) => button.addEventListener("click", () => { state.newsTopic = button.dataset.news; renderHome(); }));
}
function mixChart() {
  const rows = [...data.topics.map((topic) => topic.id), "nation"].map((id) => ({ id, n: briefingsFor(id).length })).filter((row) => row.n);
  const max = Math.max(...rows.map((row) => row.n));
  return `<ol class="bars">${rows.map((row) => {
    const topic = topicById(row.id);
    const width = Math.max(2, (row.n / max) * 100);
    return `<li><a class="bar-row mix-row" href="${row.id === "nation" ? "#news/nation" : `#topic/${row.id}`}"><span class="bar-label">${esc(tName(topic))}</span><svg class="bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="100" height="10" rx="5" class="bar-bg"/><rect x="0" y="0" width="${width}" height="10" rx="5" class="bar-fg"/></svg><span class="bar-n">${row.n}<span class="sr-only"> ${t("stories")}</span></span></a></li>`;
  }).join("")}</ol>`;
}
function servicesGrid() {
  const S = data.sites;
  const nOff = S.filter((s) => s.official).length;
  const courses = S.filter((s) => s.topic === "education" && s.tags.includes("free course"));
  const ids = bySiteNames(["PhilSys (National ID)", "PSA Serbilis / PSAHelpline", "DFA Passport Appointment", "LTO LTMS Portal", "NBI Clearance", "PNP National Police Clearance"]);
  const benefits = bySiteNames(["SSS", "PhilHealth", "Pag-IBIG Fund", "DSWD"]);
  const legal = bySiteNames(["Public Attorney's Office", "LawPhil Project", "Official Gazette", "Supreme Court E-Library", "Commission on Human Rights"]);
  const tools = S.filter((s) => s.topic === "tools").slice(0, 5);
  const offPct = Math.round((nOff / S.length) * 100);
  return `<div class="grid">
      ${widget({ id: "hot", cls: "w-hot", icon: "🚨", title: t("hotlines"), sub: t("tapCall"), topic: "emergency",
        body: `<ul class="hot-grid">${data.hotlines.map((h) => `<li><a class="hotline" href="${esc(h.href)}"><span class="hot-num">${esc(h.number)}</span><span class="hot-name">${esc(h.name)}</span></a></li>`).join("")}</ul>` })}
      ${widget({ id: "mix", cls: "w-top", icon: "📰", title: t("mix"), sub: t("mixSub"), body: news ? mixChart() : "" })}
      ${widget({ id: "top", cls: "w-top", icon: "📊", title: t("topTopics"), sub: t("topSub"), topic: "all", body: barChart() })}
      ${widget({ id: "checked", cls: "w-checked", icon: "✅", title: t("checkedW"), topic: "all",
        body: `<p class="big-date">${esc(data.lastChecked)}</p><p class="w-sub">${S.length} ${t("total")}</p>
        <div class="split" role="img" aria-label="${t("official")} ${nOff}, ${t("community")} ${S.length - nOff}"><span style="width:${offPct}%"></span></div>
        <dl class="split-legend"><div><dt><span class="dot dot-off"></span>${t("official")}</dt><dd>${nOff}</dd></div><div><dt><span class="dot dot-com"></span>${t("community")}</dt><dd>${S.length - nOff}</dd></div></dl>` })}
      ${widget({ id: "ids", icon: "🪪", title: t("idsW"), topic: "ids", body: `<ul class="quick-list">${ids.map(quickRow).join("")}</ul>` })}
      ${widget({ id: "ben", icon: "🤝", title: t("benefitsW"), topic: "benefits", body: `<ul class="quick-tiles">${benefits.map((s) => `<li><a class="tile" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span class="tile-name">${esc(s.name.replace(" Fund", ""))}</span><span class="tile-host">${esc(host(s.url))} ↗</span></a></li>`).join("")}</ul>` })}
      ${widget({ id: "courses", icon: "🎓", title: t("courses"), topic: "education", body: `<ul class="quick-list">${courses.map(quickRow).join("")}</ul>` })}
      ${widget({ id: "legal", icon: "⚖️", title: t("legalW"), topic: "legal", body: `<ul class="quick-list">${legal.map(quickRow).join("")}</ul>` })}
      ${widget({ id: "tools", icon: "🧰", title: t("toolsW"), topic: "tools", body: `<ul class="quick-list">${tools.map(quickRow).join("")}</ul>` })}
    </div>`;
}

/* ---------- views ---------- */
function renderHome() {
  const shown = briefingsFor(state.newsTopic);
  const list = news
    ? `${newsMeta()}${newsFilters(state.newsTopic)}<ol class="briefings">${shown.map(briefingCard).join("") || `<li>${t("none")}</li>`}</ol>`
    : `<p class="news-meta">${t("unavailable")}</p>`;
  $("#view").innerHTML = `<div class="hello"><h1>${t("hello")}</h1><p>${t("helloSub")}</p></div>${list}<h2 class="section-label">${t("services")}</h2><p class="hello-sub">${t("servicesSub")}</p>${servicesGrid()}`;
  if (news) bindNewsFilters();
}
function renderTopic(id) {
  const tp = id === "all" ? { icon: "📚", name: "All sites", nameFil: "Lahat ng site", reason: "Every site in the directory, in topic rank order.", reasonFil: "Lahat ng site sa direktoryo, ayon sa ranggo ng paksa." } : topicById(id);
  if (!tp) return renderHome();
  let list = id === "all" ? [...data.sites].sort((a, b) => topicById(a.topic).rank - topicById(b.topic).rank) : data.sites.filter((s) => s.topic === id);
  const tags = [...new Set(list.flatMap((s) => s.tags))].sort();
  if (state.tag && !tags.includes(state.tag)) state.tag = null;
  if (state.officialOnly) list = list.filter((s) => s.official);
  if (state.tag) list = list.filter((s) => s.tags.includes(state.tag));
  const stories = briefingsFor(id);
  const newsBlock = stories.length ? `<h2 class="section-label">${t("inNews")}</h2><ol class="briefings">${stories.map(briefingCard).join("")}</ol><h2 class="section-label">${t("services")}</h2>` : "";
  $("#view").innerHTML = `<a class="back" href="#">${t("back")}</a>
    <div class="hello"><h1><span aria-hidden="true">${tp.icon}</span> ${esc(tName(tp))}</h1><p>${esc(tReason(tp))} · ${list.length} ${t("sites")}</p></div>
    ${newsBlock}
    <div class="filters" role="group" aria-label="Filters">
      <button type="button" class="pill" aria-pressed="${state.officialOnly}" data-official>${t("officialOnly")}</button>
      <button type="button" class="pill" aria-pressed="${!state.tag}" data-tag="">${t("all")}</button>
      ${tags.map((g) => `<button type="button" class="pill" aria-pressed="${state.tag === g}" data-tag="${esc(g)}">${esc(g)}</button>`).join("")}
    </div>
    <ul class="site-list">${list.map(siteCard).join("") || `<li>${t("none")}</li>`}</ul>`;
  $("#view").querySelectorAll("[data-tag]").forEach((b) => b.addEventListener("click", () => { state.tag = b.dataset.tag || null; renderTopic(id); }));
  $("#view").querySelector("[data-official]").addEventListener("click", () => { state.officialOnly = !state.officialOnly; renderTopic(id); });
}
function renderNewsTopic(id) {
  const topic = topicById(id);
  if (!topic) return renderHome();
  const stories = briefingsFor(id);
  $("#view").innerHTML = `<a class="back" href="#">${t("back")}</a><div class="hello"><h1><span aria-hidden="true">${topic.icon}</span> ${esc(tName(topic))}</h1><p>${stories.length} ${t("stories")}</p></div><ol class="briefings">${stories.map(briefingCard).join("") || `<li>${t("none")}</li>`}</ol>`;
}
function renderSearch(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = data.sites.filter((s) => {
    const tp = topicById(s.topic);
    const hay = [s.name, s.description, s.descFil, s.url, tp.name, tp.nameFil, ...s.tags].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const stories = (news ? news.briefings : []).filter((item) => {
    const topic = topicById(item.topic) || NATION;
    const hay = [item.title, item.matched, topic.name, topic.nameFil, ...item.sources.map((source) => source.name)].join(" ").toLowerCase();
    return words.every((word) => hay.includes(word));
  });
  $("#view").innerHTML = `<a class="back" href="#">${t("back")}</a><div class="hello"><h1>${t("results")} (${stories.length + hits.length})</h1></div>${stories.length ? `<h2 class="section-label">${t("inNews")}</h2><ol class="briefings">${stories.map(briefingCard).join("")}</ol>` : ""}<h2 class="section-label">${t("services")}</h2><ul class="site-list">${hits.map(siteCard).join("") || `<li>${t("none")}</li>`}</ul>`;
}
function renderSidebar(active) {
  $("#side-topics").innerHTML = [...data.topics].sort((a, b) => a.rank - b.rank).map((tp) =>
    `<li><a class="side-link" href="#topic/${tp.id}" ${active === tp.id ? 'aria-current="page"' : ""}><span class="side-rank">${tp.rank}</span><span class="side-icon" aria-hidden="true">${tp.icon}</span><span class="side-name">${esc(tName(tp))}</span><span class="side-count">${counts[tp.id]}</span></a></li>`).join("");
  const home = document.querySelector('[data-route="home"]');
  if (active === "home") home.setAttribute("aria-current", "page"); else home.removeAttribute("aria-current");
  document.querySelectorAll("[data-tab]").forEach((a) => (a.dataset.tab === active ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
}
function route() {
  const q = $("#q").value.trim();
  const hash = location.hash;
  const newsMatch = hash.match(/^#news\/([\w-]+)/);
  const m = hash.match(/^#topic\/([\w-]+)/);
  const topicId = hash === "#all" || hash === "#topic/all" ? "all" : m ? m[1] : null;
  const active = q ? "search" : topicId || "home";
  renderSidebar(active);
  if (q) return renderSearch(q);
  if (newsMatch) return renderNewsTopic(newsMatch[1]);
  if (topicId) renderTopic(topicId); else renderHome();
}

/* ---------- drawer (mobile) ---------- */
const mobileDrawer = window.matchMedia("(max-width: 959px)");
let drawerReturn = null;
function syncDrawerAccess() {
  const closedOffscreen = mobileDrawer.matches && !document.body.classList.contains("drawer-open");
  $("#sidebar").toggleAttribute("inert", closedOffscreen);
}
function setDrawer(open) {
  const wasOpen = document.body.classList.contains("drawer-open");
  if (open) drawerReturn = document.activeElement;
  document.body.classList.toggle("drawer-open", open);
  $("#scrim").hidden = !open;
  $("#drawer-open").setAttribute("aria-expanded", String(open));
  syncDrawerAccess();
  if (open) $("#sidebar").querySelector("a").focus();
  else if (wasOpen && drawerReturn instanceof HTMLElement && document.body.contains(drawerReturn)) drawerReturn.focus();
}

function applyLang() {
  document.documentElement.lang = lang === "fil" ? "fil" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("#q").placeholder = t("search");
  const b = $("#lang-toggle");
  b.textContent = t("lang");
  b.setAttribute("aria-label", t("langLabel"));
  if (data) route();
}

async function init() {
  $("#lang-toggle").addEventListener("click", () => { lang = lang === "en" ? "fil" : "en"; localStorage.setItem("civi-lang", lang); applyLang(); });
  $("#q").addEventListener("input", route);
  $("#drawer-open").addEventListener("click", () => setDrawer(true));
  $("#drawer-close").addEventListener("click", () => setDrawer(false));
  $("#scrim").addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setDrawer(false); });
  mobileDrawer.addEventListener("change", () => {
    if (!mobileDrawer.matches) {
      drawerReturn = null;
      document.body.classList.remove("drawer-open");
      $("#scrim").hidden = true;
      $("#drawer-open").setAttribute("aria-expanded", "false");
    }
    syncDrawerAccess();
  });
  syncDrawerAccess();
  window.addEventListener("hashchange", () => { $("#q").value = ""; state.tag = null; state.officialOnly = false; state.newsTopic = ""; setDrawer(false); route(); window.scrollTo(0, 0); });
  try {
    data = await (await fetch("data/directory.json")).json();
  } catch {
    $("#view").textContent = "The directory could not load. Check your connection and try again.";
    return;
  }
  news = await loadNews();
  data.sites.forEach((s) => (counts[s.topic] = (counts[s.topic] || 0) + 1));
  applyLang();
}
async function loadNews() {
  const urls = [NEWS_LIVE, "data/news.json"].filter(Boolean);
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (!response.ok) continue;
      const payload = await response.json();
      if (payload && Array.isArray(payload.briefings)) return payload;
    } catch { /* try the saved briefing */ }
  }
  return null;
}
init();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

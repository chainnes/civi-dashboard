/* UI batch 5: hide map filter groups one by one (saved in this browser only, localStorage "civi.fg.hidden").
   Each filter group gets a small ✕; hidden groups can be brought back from the ▦ Panels menu. No keys, no network. */
(function () {
const K = "civi.fg.hidden", get = () => new Set(JSON.parse(localStorage.getItem(K) || "[]")), put = s => localStorage.setItem(K, JSON.stringify([...s]));
const key = d => d.id === "layersFg" ? "layers" : d.dataset.g;
const name = d => (d.querySelector("summary")?.childNodes[0]?.textContent || key(d)).trim();
const groups = () => $$("#fpanel details.fg").filter(d => key(d) && !d.closest(".fextra"));
let busy = false;
function apply() { if (busy) return; busy = true; const h = get();
  groups().forEach(d => { const k = key(d); d.hidden = h.has(k);
    const s = d.querySelector("summary"); if (s && !s.querySelector(".fg-x")) s.insertAdjacentHTML("beforeend", `<button type="button" class="fg-x" data-fgx="${esc(k)}" aria-label="${esc(t("hide_filter"))}: ${esc(name(d))}" title="${esc(t("hide_filter"))}">✕</button>`); });
  const n = groups().filter(d => d.hidden).length, c = $("#fgHiddenNote");
  if (n) { const html = `<button type="button" class="chip" id="fgHiddenNote">👁 ${n} ${t("fg_hidden")} · ${t("show")}</button>`; c ? (c.outerHTML = html) : $("#fBody")?.insertAdjacentHTML("afterbegin", html); $("#fgHiddenNote").onclick = () => { put(new Set()); apply(); window.civiRenderPanelMenu?.(); }; }
  else c?.remove();
  busy = false; }
document.addEventListener("click", e => { const b = e.target.closest("[data-fgx]"); if (!b) return; e.preventDefault(); e.stopPropagation(); const h = get(); h.add(b.dataset.fgx); put(h); apply(); window.civiRenderPanelMenu?.(); }, true);
window.civiFgMenu = () => { const gs = groups(); if (!gs.length) return ""; const h = get();
  return `<hr><b class="pm-h">${t("p_filters")}</b>` + gs.map(d => `<label><input type="checkbox" data-fgk="${esc(key(d))}" ${h.has(key(d)) ? "" : "checked"}> ${esc(name(d))}</label>`).join(""); };
window.civiFgWire = m => $$("[data-fgk]", m).forEach(c => c.onchange = () => { const h = get(); c.checked ? h.delete(c.dataset.fgk) : h.add(c.dataset.fgk); put(h); apply(); });
const mo = new MutationObserver(() => apply());
const hook = () => { const f = $("#fpanel"); if (f && !f._fgObs) { f._fgObs = 1; mo.observe(f, { childList: true, subtree: true }); apply(); } };
setInterval(hook, 800); addEventListener("hashchange", () => setTimeout(hook, 300)); hook();
})();
/* all route overrides are loaded now: render the current page once more so deep links (e.g. #/directory) use the newest view */
for (const l in { en: 1, tl: 1 }) CIVI_I18N[l] = Object.assign({ back: l === "tl" ? "Bumalik" : "Back" }, CIVI_I18N[l] || {});
if (!/^#\/map|^#?$/.test(location.hash)) route();

/* Civi extras: referral capture (open-link beta campaign), Donate page, translation feedback. Loaded before hub.js. */
(function () { // first-touch referral: ?ref=tiktok or ?utm_source=fb&utm_campaign=beta1 (no personal data)
  const q = new URLSearchParams(location.search), src = (q.get("ref") || q.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
  if (src && !localStorage.getItem("civi.ref")) localStorage.setItem("civi.ref", JSON.stringify({ ref_source: src, ref_campaign: (q.get("utm_campaign") || "").replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 60) || null }));
})();
function civiRef() { try { return JSON.parse(localStorage.getItem("civi.ref") || "{}"); } catch { return {}; } }

const DONATE_QR = [["gcash", "GCash", "#0a6cff"], ["maya", "Maya", "#2cd889"], ["maribank", "MariBank", "#ff6a3d"]];
async function viewDonate() {
  const cfg = await api("config"); const links = [["PayPal", cfg.paypal_url], ["Ko-fi", cfg.kofi_url], ["Donate", cfg.donate_url]].filter(x => x[1]);
  page(`<h1>💛 ${t("donate")}</h1><p class="sub">Civi is free, independent and pre-revenue. If it helps you, you can chip in for hosting and data costs.</p>
   <div class="grid">${DONATE_QR.map(([k, n, c]) => `<div class="card glass qr-card" style="text-align:center"><h4 style="color:${c}">${n}</h4>
     <div class="qr-slot" data-k="${k}"><img src="/assets/donate/${k}.png" alt="${n} QR code" style="display:none;width:200px;height:200px;object-fit:contain;background:#fff;border-radius:10px;padding:6px">
     <div class="qr-ph" style="width:200px;height:200px;margin:auto;border:2px dashed rgba(255,255,255,.25);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--mute);font-size:12px;padding:10px">${n} QR coming soon<br>(placeholder)</div></div>
     <p style="font-size:11px">Scan with the ${n} app. Check the account name before you send.</p></div>`).join("")}
   <div class="card glass"><h4>🌏 From abroad</h4>${links.length ? links.map(([n, u]) => `<a class="btn" style="margin:4px" href="${esc(u)}" target="_blank" rel="noopener">${n} ↗</a>`).join("") : `<p>PayPal / Ko-fi links coming soon.</p>`}</div></div>
   <div class="disc" style="margin-top:14px"><b>Transparency:</b> Donations are voluntary and are not tax-deductible. Civi is not a registered charity or NGO, and donations do not buy any feature, influence or data. They go to running Civi: hosting, database, domain, data/API costs and map tiles. We plan to publish a simple summary of money received and spent at the end of the beta. Questions: <a href="mailto:privacy@chainnes.com">privacy@chainnes.com</a>. Never send money to anyone claiming to be Civi through DMs; use only the QR codes on this page.</div>`);
  $$(".qr-slot").forEach(s => { const i = s.querySelector("img"); i.onload = () => { i.style.display = "block"; s.querySelector(".qr-ph").remove(); }; i.onerror = () => i.remove(); });
}

function translationFeedback() {
  if (state.lang === "en") return toast("Switch to another language first");
  if (needLogin()) return;
  const keys = [...new Set($$("[data-i18n]").map(e => e.dataset.i18n).concat(Object.keys(CIVI_I18N[state.lang] || {})))].filter(k => CIVI_I18N.en[k]);
  const pg = (location.hash.replace("#/", "") || "map").split("?")[0];
  openModal(`<div class="row spread"><h2 style="margin:0">✎ ${t("suggest_tr")}</h2><button class="btn ghost sm" data-close>✕</button></div>
   <p class="sub">Language: <b>${esc((CIVI_LANGS.find(l => l[0] === state.lang) || [])[1])}</b>. Translations are machine-assisted; native speakers like you make them better. Suggestions are reviewed before they go live.</p>
   <form id="trf"><label>Which text?<select name="key">${keys.map(k => `<option value="${esc(k)}">${esc(CIVI_I18N.en[k].slice(0, 60))}</option>`).join("")}</select></label>
   <div class="disc" id="trcur"></div><label>Your better translation<textarea name="suggestion" maxlength="500" required></textarea></label>
   <label>Note (optional, e.g. region/dialect)<input type="text" name="note" maxlength="300"></label>
   <div class="row"><button class="btn">Send suggestion</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`);
  const f = $("#trf"), cur = () => $("#trcur").innerHTML = `English: “${esc(CIVI_I18N.en[f.key.value])}”<br>Now: “${esc(t(f.key.value))}”`; f.key.onchange = cur; cur();
  f.onsubmit = async e => { e.preventDefault(); const body = { lang: state.lang, key: f.key.value, page: pg, current: t(f.key.value), suggestion: f.suggestion.value.trim(), note: f.note.value.trim() };
    if (state.demo) { demoStore.set("i18n_feedback", [...demoStore.get("i18n_feedback"), { ...body, time: new Date().toISOString() }]); closeModal(); return toast("Saved on this device (demo). Salamat!"); }
    const r = await api("translation", { method: "POST", body }); if (r.error) return toast("Failed: " + r.error); closeModal(); toast("Salamat! Suggestion sent for review."); };
}

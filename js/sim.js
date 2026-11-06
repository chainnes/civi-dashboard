/* Civi Sims beta: "Kung Ikaw ang Presidente". Real FY 2026 GAA totals (DBM BESF 2026 Table B.6.c); outcomes are ILLUSTRATIVE only. */
const POLICIES = [
 { id: "free_lunch", n: "Free school lunch for public elementary pupils", cost: 60, fx: { edu: 3, health: 3, social: 2 } },
 { id: "rice", n: "Rice farmer support: irrigation + post-harvest facilities", cost: 40, fx: { food: 5, jobs: 1 } },
 { id: "rail", n: "Speed up mass transit / rail projects", cost: 80, fx: { infra: 5, jobs: 2, env: 1 } },
 { id: "uhc", n: "Fully fund Universal Health Care (UHC) rollout", cost: 70, fx: { health: 6, social: 1 } },
 { id: "solar", n: "Solar for public schools and rural health units", cost: 30, fx: { env: 4, infra: 1, edu: 1 } },
 { id: "flood", n: "Flood control audit + nature-based flood defenses", cost: 35, fx: { disaster: 5, trust: 3, env: 2 } },
 { id: "teachers", n: "Hire more teachers and reduce class sizes", cost: 50, fx: { edu: 6, jobs: 1 } },
 { id: "open_gov", n: "Open contracting: publish all procurement data", cost: 2, fx: { trust: 6 } },
 { id: "wps", n: "Coast guard + fisherfolk support in the West Philippine Sea", cost: 25, fx: { security: 4, food: 1 } },
 { id: "digital", n: "Free public Wi-Fi + digital ID services", cost: 20, fx: { infra: 2, jobs: 2, edu: 1 } },
 { id: "tax_cut", n: "Cut income tax for minimum-wage earners further", cost: 45, fx: { social: 2, fiscal: -3 } },
 { id: "sin_tax", n: "Raise sin taxes (sugary drinks, vapes) for health", cost: -25, fx: { health: 2, fiscal: 2, trust: -1 } }];
const AREAS = { edu: "🎓 Education", health: "🏥 Health", infra: "🛣️ Infrastructure & transport", social: "🤝 Social protection", food: "🌾 Food security", security: "🛡️ Peace & security", jobs: "💼 Jobs & economy", env: "🌿 Environment", disaster: "🌀 Disaster resilience", justice: "⚖️ Justice", trust: "🗳️ Public trust", fiscal: "💰 Fiscal health" };
async function viewSim() {
  const B = await data("budget_2026"); const st = JSON.parse(sessionStorage.getItem("civi.sim") || "null") || { pct: {}, pol: [] };
  const save = () => sessionStorage.setItem("civi.sim", JSON.stringify(st));
  const fmt = b => "₱" + (b >= 1000 ? (b / 1000).toFixed(2) + "T" : b.toFixed(1) + "B");
  page(`<div class="row spread"><div><span class="chip ok">Civi Sims · beta</span><h1 style="margin:6px 0">🏛️ ${esc(t("sim_title"))}</h1>
   <p class="sub">If you were President: you have the real FY 2026 national budget of <b>${fmt(B.total)}</b>. Move money between departments, pick up to 3 policies, and see what might change.</p></div></div>
   <div class="disc">📊 Budget figures: <a href="${esc(B.url)}" target="_blank" rel="noopener">${esc(B.source)}</a> (₱ billions, fetched ${esc(B.fetched)}). ${esc(B.note)}<br>⚠️ <b>Outcomes are illustrative, not forecasts.</b> They use a simple made-up scoring model to show trade-offs, not real economics. Policy costs are rough round numbers for the game.</div>
   <div class="sim-grid"><section class="card glass"><h2 style="margin-top:0">1 · Budget</h2><div id="simDepts"></div>
     <h4 style="margin-bottom:4px">🔒 Locked (mandatory/automatic)</h4>${B.locked.map(l => `<div class="sim-row locked"><span>${esc(l.name)}</span><b>${fmt(l.b)}</b></div>`).join("")}
     <button class="btn ghost sm" id="simReset" style="margin-top:8px">Reset to GAA</button></section>
    <section class="card glass"><h2 style="margin-top:0">2 · Policies <small style="color:var(--mute)">(max 3)</small></h2><div id="simPol"></div></section>
    <section class="card glass"><h2 style="margin-top:0">3 · Results <span class="chip warn">illustrative</span></h2><div id="simBal"></div><canvas id="simChart" height="260"></canvas><div id="simOut"></div>
     <h2>4 · Share your suggestion</h2><label>Your message to fellow Filipinos (optional)<textarea id="simMsg" maxlength="800" placeholder="${esc(t("sim_ph"))}"></textarea></label>
     <button class="btn" id="simShare">💬 Share to Lounge (Government)</button><div id="simAfter"></div>
     <p style="font-size:11px;color:var(--mute)">Shared suggestions are <b>public posts on Civi</b>, visible to everyone. Civi does not send them to the President or any government office.</p></section></div>`);
  let chart;
  const totals = () => { const items = B.items.map(i => ({ ...i, nb: i.b * (1 + (st.pct[i.name] || 0) / 100) })); const pc = st.pol.reduce((a, id) => a + POLICIES.find(p => p.id === id).cost, 0);
    const spend = items.reduce((a, i) => a + i.nb, 0) + B.locked.reduce((a, l) => a + l.b, 0) + pc; return { items, pc, spend, gap: spend - B.total }; };
  const score = T => { const s = Object.fromEntries(Object.keys(AREAS).map(k => [k, 50]));
    T.items.forEach(i => { if (s[i.area] != null) s[i.area] += 25 * Math.log((i.nb + 1) / (i.b + 1)) * (i.b > 50 ? 1 : .5); });
    st.pol.forEach(id => Object.entries(POLICIES.find(p => p.id === id).fx).forEach(([k, v]) => s[k] += v * 2));
    s.fiscal += -Math.max(-30, Math.min(30, T.gap / 15)); if (T.gap > 100) s.trust -= 3;
    Object.keys(s).forEach(k => s[k] = Math.max(0, Math.min(100, Math.round(s[k])))); return s; };
  const draw = () => {
    const T = totals(), S = score(T);
    $("#simDepts").innerHTML = T.items.map(i => `<div class="sim-row"><span title="${esc(AREAS[i.area] || "")}">${esc(i.name)}</span><input type="range" min="-50" max="50" step="5" value="${st.pct[i.name] || 0}" data-n="${esc(i.name)}" aria-label="${esc(i.name)} change"><b>${fmt(i.nb)}</b><small class="${(st.pct[i.name] || 0) > 0 ? "up" : (st.pct[i.name] || 0) < 0 ? "down" : ""}">${(st.pct[i.name] || 0) > 0 ? "+" : ""}${st.pct[i.name] || 0}%</small></div>`).join("");
    $$("#simDepts input").forEach(r => r.oninput = () => { st.pct[r.dataset.n] = +r.value; save(); draw(); });
    $("#simPol").innerHTML = POLICIES.map(p => `<label class="sim-pol ${st.pol.includes(p.id) ? "on" : ""}"><input type="checkbox" value="${p.id}" ${st.pol.includes(p.id) ? "checked" : ""} style="width:auto"> <span>${esc(p.n)}<br><small>${p.cost >= 0 ? "Cost ~" + fmt(p.cost) : "Raises ~" + fmt(-p.cost)}/yr · helps ${Object.entries(p.fx).filter(([, v]) => v > 0).map(([k]) => AREAS[k]).join(", ")}</small></span></label>`).join("");
    $$("#simPol input").forEach(c => c.onchange = () => { if (c.checked && st.pol.length >= 3) { c.checked = false; return toast("Max 3 policies"); } st.pol = c.checked ? [...st.pol, c.value] : st.pol.filter(x => x !== c.value); save(); draw(); });
    $("#simBal").innerHTML = `<div class="kpi"><div><div class="l">Your total spending</div><div class="v">${fmt(T.spend)}</div></div><div><div class="l">${T.gap > 0 ? "Over the GAA (more borrowing)" : "Under the GAA (savings)"}</div><div class="v" style="color:${T.gap > 0 ? "var(--red,#ff5d7a)" : "var(--lime)"}">${T.gap > 0 ? "+" : ""}${fmt(Math.abs(T.gap))}</div></div></div>`;
    const keys = Object.keys(AREAS); if (chart) chart.destroy();
    chart = new Chart($("#simChart"), { type: "radar", data: { labels: keys.map(k => AREAS[k]), datasets: [{ label: "Your Philippines (illustrative)", data: keys.map(k => S[k]), borderColor: "#38e1ff", backgroundColor: "rgba(56,225,255,.15)" }, { label: "FY 2026 GAA baseline", data: keys.map(() => 50), borderColor: "rgba(255,255,255,.35)", borderDash: [4, 4], pointRadius: 0, fill: false }] },
      options: { animation: false, scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: "rgba(255,255,255,.1)" }, angleLines: { color: "rgba(255,255,255,.1)" }, pointLabels: { color: "#c7d6ea", font: { size: 10 } } } }, plugins: { legend: { labels: { color: "#c7d6ea", font: { size: 10 } } } } } });
    charts.push(chart);
    const best = keys.filter(k => S[k] >= 58).map(k => AREAS[k]), worst = keys.filter(k => S[k] <= 42).map(k => AREAS[k]);
    $("#simOut").innerHTML = `<p style="font-size:13px">${best.length ? `Stronger: ${best.join(", ")}. ` : ""}${worst.length ? `Weaker: ${worst.join(", ")}. ` : ""}${!best.length && !worst.length ? "Close to the actual 2026 budget. Try moving the sliders." : ""}</p>`;
    state._simT = T; state._simS = S;
  };
  $("#simReset").onclick = () => { st.pct = {}; st.pol = []; save(); draw(); };
  $("#simShare").onclick = async () => {
    if (needLogin()) return; const T = state._simT, ch = T.items.filter(i => st.pct[i.name]).sort((a, b) => Math.abs(st.pct[b.name]) - Math.abs(st.pct[a.name]));
    const title = (t("sim_share_as") + (ch.length ? ch.slice(0, 2).map(i => `${st.pct[i.name] > 0 ? "+" : ""}${st.pct[i.name]}% ${i.name.replace(/ \(.*/, "")}`).join(", ") : "keep the 2026 budget") + (st.pol.length ? ` + ${st.pol.length} policies` : "")).slice(0, 160);
    const body = [$("#simMsg").value.trim(), "", "Budget changes vs FY 2026 GAA (DBM): " + (ch.map(i => `${i.name} ${st.pct[i.name] > 0 ? "+" : ""}${st.pct[i.name]}%`).join("; ") || "none"),
      "Policies: " + (st.pol.map(id => POLICIES.find(p => p.id === id).n).join("; ") || "none"), `Total: ${fmt(T.spend)} (${T.gap > 0 ? "+" : "-"}${fmt(Math.abs(T.gap))} vs GAA)`,
      "Made with Civi Sims (illustrative game, not a forecast). Public suggestion, not sent to any government office."].join("\n").slice(0, 1500);
    if (state.demo) demoStore.set("topics", [{ id: "u-" + Date.now(), title, cat: "Government", starter: body, by: state.user.handle, votes: 0, sources: [{ title: "DBM FY 2026 GAA (BESF Table B.6.c)", url: B.url }] }, ...demoStore.get("topics")]);
    else { const r = await api("lounge", { method: "POST", body: { action: "topic", title, cat: "Government", starter: body } }); if (r.error) return toast("Failed: " + r.error); }
    toast("Shared to the Lounge 🎉");
    // Optional: user emails it themselves. Civi never sends email. Addresses from official pages (checked Oct 29, 2026):
    // op-proper.gov.ph/contact-us lists mro@ (documents), pace@ (assistance/referral), hrmo@ (careers) - none is for policy suggestions;
    // 8888.gov.ph/contact-us lists 8888complaint@op.gov.ph (complaints). So we leave "To:" blank and link both official pages.
    const mail = `mailto:?subject=${encodeURIComponent("Budget suggestion from a Filipino citizen: " + title.replace(t("sim_share_as"), ""))}&body=${encodeURIComponent("Dear Mr. President / Office of the President,\n\n" + body.replace(/\nMade with Civi Sims.*$/, "") + "\n\nRespectfully,\n[Your name]")}`;
    $("#simAfter").innerHTML = `<div class="card glass" style="margin-top:10px"><p>✅ Posted in <a href="#/lounge">Lounge → Government</a>.</p>
      <h4>📨 Send to Malacañang (optional)</h4><p style="font-size:12px">Opens <b>your own</b> email app with your suggestion filled in. Pick the right official address from the Office of the President's pages:
       <a href="https://op-proper.gov.ph/contact-us/" target="_blank" rel="noopener">Office of the President – Contact Us</a> · <a href="https://8888.gov.ph/contact-us/" target="_blank" rel="noopener">8888 Citizens' Complaint Center</a> (for complaints about government service).</p>
      <a class="btn" href="${mail}">✉️ Open in my email app</a>
      <div class="disc" style="margin-top:8px">Civi is not affiliated with the government and never sends emails for you. There's no guarantee of a reply. You send it at your own discretion, from your own account. Please be respectful and don't include other people's private information.</div></div>`;
  };
  draw();
}
ROUTES.sim = viewSim; ROUTES.donate = viewDonate;

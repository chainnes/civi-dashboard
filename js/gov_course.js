/* Gov course: per-module quizzes + local completion badge ("Paano tumatakbo ang gobyerno natin").
   Everything stays in this browser (localStorage "civi.quiz.<id>", "civi.badge.gov"). No network, no keys. */
(() => {
  const E = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const passed = id => localStorage.getItem("civi.quiz." + id) === "1";
  const stepsDone = h => JSON.parse(localStorage.getItem("civi.howto." + h.id) || "[]").length >= h.steps.length;
  const mods = how => how.items.filter(x => x.course === "gov");
  const badgeHTML = () => `<div class="gov-badge" role="status"><span aria-hidden="true">🏛️🏅</span><div><b>Civi Civics Badge</b><br><small>Alam ko kung paano tumatakbo ang gobyerno natin · ${E(localStorage.getItem("civi.badge.gov") || "")}</small></div></div>`;
  const progress = how => { const m = mods(how), d = m.filter(x => passed(x.id) && stepsDone(x)).length; return `<p class="sub">📘 Course progress: ${d}/${m.length} modules <progress max="${m.length}" value="${d}" aria-label="course progress"></progress></p>`; };
  window.civiQuizHTML = (h, how) => {
    if (!h.quiz) return "";
    const qs = h.quiz.map((q, i) => `<fieldset class="gov-q reveal" style="--d:${i * 80}ms"><legend>${i + 1}. ${E(q.q)}</legend>${q.o.map((o, j) => `<label class="row" style="gap:6px"><input type="radio" name="q${i}" value="${j}" style="width:auto"> ${E(o)}</label>`).join("")}</fieldset>`).join("");
    const done = localStorage.getItem("civi.badge.gov");
    return `<section class="gov-quiz"><h3>📝 Quick quiz</h3>${qs}<button class="btn sm" id="quizGo">Check answers</button> <span id="quizOut" aria-live="polite">${passed(h.id) ? "✅ Pasado na" : ""}</span>${progress(how)}<div id="govBadge">${done ? badgeHTML() : ""}</div>${h.course === "gov" ? '<p class="sub" style="font-size:11px">Sources sa itaas (🌐). Checked 2026-10-29. Walang pinangalanang kasalukuyang opisyal.</p>' : ""}</section>`;
  };
  window.civiQuizCheck = (h, how) => {
    const m = mods(how);
    if (m.length && m.every(x => passed(x.id) && stepsDone(x)) && !localStorage.getItem("civi.badge.gov")) localStorage.setItem("civi.badge.gov", new Date().toISOString().slice(0, 10));
    const b = document.getElementById("govBadge"); if (b && localStorage.getItem("civi.badge.gov")) b.innerHTML = badgeHTML();
  };
  window.civiQuizBind = (h, how) => {
    const go = document.getElementById("quizGo"); if (!go) return;
    go.onclick = () => {
      let ok = 0;
      h.quiz.forEach((q, i) => { const sel = document.querySelector(`input[name=q${i}]:checked`), fs = document.querySelectorAll(".gov-q")[i]; const r = sel && +sel.value === q.a; ok += r; fs.classList.toggle("ok", !!r); fs.classList.toggle("bad", !r); });
      const pass = ok === h.quiz.length; if (pass) localStorage.setItem("civi.quiz." + h.id, "1");
      document.getElementById("quizOut").textContent = pass ? "✅ Pasado! Tapusin din ang lahat ng hakbang (☐) para mabilang." : `${ok}/${h.quiz.length} tama — subukan ulit.`;
      window.civiQuizCheck(h, how);
    };
    window.civiQuizCheck(h, how);
  };
})();

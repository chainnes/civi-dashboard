// node scripts/i18n_coverage.js -> % of English UI keys translated per locale (missing keys fall back to English)
global.window = global; require("../js/i18n.js"); require("../js/i18n_ux.js");
const en = Object.keys(CIVI_I18N.en); for (const l in CIVI_I18N) { const n = en.filter(k => k in CIVI_I18N[l]).length; console.log(l.padEnd(4), `${n}/${en.length}`, (100 * n / en.length).toFixed(0) + "%"); }

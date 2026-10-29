// Network-first; cache fallback so the PWA works offline. /api is never cached.
const C = "civi-beta-12", CORE = ["/", "/index.html", "/css/hub.css", "/js/i18n_ux.js", "/js/ux.js", "/js/extras.js", "/js/hub.js", "/js/map2.js", "/js/ux3.js", "/js/ui4.js", "/data/featured.json", "/data/howto_work.json", "/js/sim.js", "/js/i18n.js", "/js/empower.js", "/js/briefing.js", "/email/briefing.html", "/data/projects.json", "/data/scholarships.json", "/manifest.webmanifest", "/icons/icon.svg",
 "/data/map_items.json", "/data/kpis.json", "/data/geo_regions.json", "/data/directory_hub.json", "/data/lounge_seed.json", "/data/academy.json", "/data/gazetteer.json", "/data/ph_mask.json", "/data/places.json", "/data/transport_map.json", "/data/directory_more.json", "/data/howto_earn.json", "/data/howto_life.json", "/data/howto_health.json", "/data/howto_gov.json", "/js/gov_course.js"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(CORE))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => { const u = new URL(e.request.url); if (e.request.method !== "GET" || u.pathname.startsWith("/api/") || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request))); });
// Web Push (opt-in only). Payload from n8n: {title, body, url}. Only same-origin URLs are opened.
self.addEventListener("push", e => { let d = {}; try { d = e.data.json(); } catch { d = { title: "Civi Briefing", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Your Civi Briefing", { body: d.body || "New stories for you", icon: "/icons/icon.svg", data: { url: d.url || "/#/briefing" } })); });
self.addEventListener("notificationclick", e => { e.notification.close(); const u = new URL(e.notification.data?.url || "/#/briefing", self.location.origin);
  e.waitUntil(clients.openWindow(u.origin === self.location.origin ? u.href : "/#/briefing")); });

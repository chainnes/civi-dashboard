# Civi · Technical Documentation

Updated Oct 29, 2026 (PHT).

## 1. Architecture
| Layer | Tech | Notes |
|---|---|---|
| Frontend | Static HTML + vanilla JS (`js/*.js`), Leaflet + MarkerCluster, Chart.js | Hash router (`#/map`, `#/directory`, `#/academy`, `#/howto?id=`…). No build step, no keys. |
| Static data | `data/*.json` | Snapshots produced by `scripts/*.py`; cached by the service worker. |
| API | Cloudflare Pages Functions (`functions/api/*`) | Same-origin; forwards the user's Supabase JWT (HttpOnly cookie) so RLS applies. |
| AI | Workers AI binding `AI` | Summaries (`/api/summarize`), assist keywords (`/api/assist`). Optional; keyword fallback. |
| DB/Auth/Storage | Supabase (Postgres, Auth: Email + Google, Storage for Sumbong photos) | RLS on every table; writes through SECURITY DEFINER RPCs with rate limits. |
| Automation | n8n (self-hosted for push) | Ingest, law refs, Daily Briefing. Holds the service_role key and Resend key. |
| Email | Resend (domain `mail.chainnes.com`) | Sent only by n8n to opted-in users. Civi's app never sends email. |

## 2. Data flow
1. You run `scripts/*.py` → write `data/*.json` → commit → Cloudflare Pages deploys.
2. Browser loads `index.html`, then `data()` fetches JSON snapshots; `api()` calls `/api/*`. If `/api` returns 404/503 → **demo mode** (localStorage).
3. n8n every 2 h: RSS + Luma → `news_items`, `directory` in Supabase; `/api/feed` and `/api/map?kind=shared` serve live items.
4. n8n hourly: due briefing users → `briefing_digest` → Resend → `briefing_mark_sent`.

## 3. Supabase schema (run in order)
| File | Tables | Functions / RLS |
|---|---|---|
| 001_schema | sources, news_items, hazard_events, kpis, directory, law_refs, solutions, votes, reports | public read policies; `cast_vote`, `post_solution`, `ranked_solutions`, `report_solution`, weights |
| 002_beta | profiles, lounge_topics/replies/votes/reports, shared_links (+reports), premium_waitlist, rate_events | own-profile read/update, own votes/waitlist; `handle_new_user`, `lounge_*`, `share_link`, `rate_ok` (rate limiter) |
| 003_seed_lounge | seed topics | — |
| 004_feedback_referral | translation_feedback | `suggest_translation`, `set_my_referral` |
| 005_empower | petitions, petition_signatures/updates/reports, reports_issues, report_metoo/flags, foi_requests, user_events, event_flags, project_updates | own signature/metoo/FOI policies; storage policies "upload own folder"; `petition_*`, `report_*`, `event_create`, `project_update_add` |
| 006_briefing | briefing_prefs, briefing_items, briefing_send_log, email_unsubscribe_tokens, push_subscriptions | owner-only policies (`user_id = auth.uid()`); `briefing_build(_all)`, `briefing_digest`, `briefing_mark_sent`, `briefing_save_prefs`, `briefing_unsubscribe` |
| 007_ux | favorites, directory_requests | favorites owner-only (max 500); directory_requests insert-only with `status='pending'` (3/day per rate key); `add_favorite`, `request_directory_listing` |

**RLS principle:** anon can read public content and call RPCs; users read/write only their own rows; nobody can read others' private rows; admins use the Supabase dashboard (service role).

## 4. Pages Functions (`functions/`)
`_lib.js` (Supabase REST helper `sb`, `currentUser`, `withCookies`, `hashId` salted with `VOTER_SALT`, `geotag`) and `api/`: `auth/[[path]]` (login/logout/OAuth callback cookies), `config` (public flags like `PAYPAL_URL`), `map`, `feed`, `share`, `lounge`, `empower`, `favorites`, `directory-request`, `briefing`, `briefing/unsubscribe`, `translation`, `waitlist`, `summarize`, `assist`. POST handlers check same-origin.

Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VOTER_SALT`, optional `PAYPAL_URL`, `DONATE_URL`, `KOFI_URL`, `VAPID_PUBLIC_KEY`; binding `AI`. The service_role key is **never** in Pages.

## 5. n8n workflows (`n8n/`)
| Workflow | Schedule | Steps |
|---|---|---|
| civi-ingest-workflow | every 2 h | RSS feeds → keyword tag → upsert `news_items`; Luma public → upsert `directory` |
| civi-law-ingest-workflow | weekly Mon 06:00 PHT | LawPhil RA index → parse → upsert `law_refs` |
| civi-briefing-workflow | hourly; 06:00 build; 07:30 push | opt-in users → digest + unsubscribe token → render `email/briefing.html` → Resend → mark sent; optional Web Push |

## 6. Data scripts and refresh
| Script | Output | Source / notes |
|---|---|---|
| fetch_data.py | news, quakes, gdacs, weather, kpis | USGS, GDACS, RSS of PH outlets, PSA OpenSTAT |
| fetch_hub.py | geo_regions, gazetteer, map_items, kpis | geoBoundaries, PSGC; geotags via geotag.py |
| build_geo2.py | ph_mask.json, places.json | geoBoundaries ADM0–ADM3; mask buffered ~3 km outward |
| geotag.py | (library) | city/HUC + aliases → province → "Municipality, Province"; QC aliases handled |
| build_transport_map.py | transport_map.json | OSM Overpass (ODbL); airports, ports, rail lines/stations, bus terminals |
| civic_transport.py | civic_transport.json | official schedule pages only |
| fetch_events.py | events.json (+ merged into map_items) | **API/feed:** Luma public discover JSON (PH venues only, 25 cities). **Optional server-side:** Eventbrite org events (`EVENTBRITE_TOKEN`), publisher ICS feeds in `event_feeds.json` (empty until verified). **Link-only:** Facebook Events, Meetup, Allevents, Ticketnet, SM Tickets, TicketWorld, Klook, DOT/LGU calendars, GDG/AWS pages. |
| directory_more.py | directory_more.json | Curated categories; each URL curl-checked; dead/parked dropped; parked detection only on small pages with strong markers (avoids false "sedo" hits) |
| build_ux_data.py + check_links.py | gov_directory, officials, companies, howto | hand-curated from official sources |
| scholarships.py, directory_extra.py, fetch_projects.py, fetch_extra.py | scholarships, directory_hub, projects, law refs | official pages |
| hand-edited | kpis_extra.json, howto_earn.json, howto_life.json | each item has source + as-of |

Checker note: some `.gov.ph` sites refuse TLS from data-center IPs; those were not added (not verifiable) rather than guessed.

## 7. Frontend modules
`hub.js` (router, map, filters, KPIs, lounge, share), `map2.js` (focus mode, panels, hover, location tree, sun/theme, transport), `ux.js` (directory v2, academy v2, how-tos, favorites, tour, help, chatbot, a11y), `empower.js`, `briefing.js`, `sim.js`, `extras.js`, `i18n.js` + `i18n_ux.js`.

## 8. i18n
`t(key)` looks up `CIVI_I18N[lang][key]`, falling back to English. `js/i18n.js` = core strings; `js/i18n_ux.js` generated by `scripts/i18n_ux_src.py`, plus hand-added label blocks appended at the end (batch 3 categories; keep them if you regenerate). Coverage: `node scripts/i18n_coverage.js`. English and Tagalog are complete; other locales are machine-assisted and partial.

## 9. Service worker (`sw.js`)
Network-first with cache fallback; `/api` never cached. Cache name `civi-beta-7`; CORE includes map2.js and the new data files. Bump the name on each release so users get new files.

## 10. Security and privacy
- RLS everywhere; RPC rate limits (`rate_ok`, per-table caps).
- HttpOnly cookies; same-origin POST check; no secrets in frontend; `.env`/`.dev.vars` gitignored.
- No raw IPs (salted hash); EXIF stripped client-side; contact emails on directory requests deleted 90 days after review (policy text).
- RA 10173 notices on forms; privacy@chainnes.com for data requests.
- No scraping of FB/IG/TikTok; robots.txt and ToS respected; OSM tile policy (light use) → paid tiles before open beta.

## Update (Oct 29, 2026): health batch
New `data/howto_health.json` (merged by `howAll()` in js/ux.js; same schema as howto_life). Directory health cards live in `data/directory_more.json` (category 'Health & wellness apps/sites') and are declared in `scripts/directory_more.py`. SW cache `civi-beta-8` precaches howto_health.json.

## Update: UX batch 4 (Oct 29, 2026)
- **Theme:** `map2.js` computes Manila sunrise/sunset and sets `html[data-theme]` globally (`civiApplyTheme`, every 60 s); `ux3.js` adds the top-bar selector (`localStorage civi.theme`). CSS day variables live on `html[data-theme=day] body`; hard-coded dark colors have day overrides. Contrast is checked with a headless script (WCAG AA 4.5:1 / 3:1 large).
- **Weather:** browser → `https://api.open-meteo.com/v1/forecast` (keyless, CC BY 4.0; free tier is for non-commercial use, so review Open-Meteo terms or a paid plan if Civi becomes commercial). Only region-center coordinates are sent (never the user's location). Shown with source, time (PHT) and a PAGASA link.
- **Featured:** `data/featured.json` (`pages.{map,directory,lounge,academy,empower,default}`), rendered by `civiFeatured()`; `page()` in hub.js adds `#featured`.
- **Academy assist:** `/api/assist` accepts `mode:"academy"` → keywords via Workers AI (`env.AI`); 503 → client keyword fallback. No external API key.
- **Map:** place suggestions replace the native datalist; `zoomLoc()` auto-zooms on location filter changes; `civi.pins` toggle; `selectRegion()` emits `civi:place` (weather follows); `#mapCtl`/`#actPanel` are removed when leaving the map.
- **Motion/perf:** CSS keyframes on transform/opacity only (fadeUp 0.18–0.26 s, staggered cards), skeleton for the featured strip, all disabled by `prefers-reduced-motion`. Headless check: no long tasks over 200 ms on desktop/mobile page loads. SW cache `civi-beta-9`.

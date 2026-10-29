# Civi · Philippines Community Intel Hub (beta pilot)

Civi is a mobile-first web app (installable PWA) that turns "doom scrolling" into learning about the Philippines: a live map of news, hazards, events and transport; a curated Directory of ~570 verified links; an Academy of step-by-step guides and in-house courses; civic tools (petitions, Sumbong reports, FOI, Project Watch); a respectful community "Usapang Bayan" lounge; and an opt-in Daily Briefing by email or push.

Owner: Charlene "Chai" Cordero · Domain: civi.chainnes.com · Status: closed beta from **Nov 17, 2026**, open beta target **Jan 8, 2027** (backup Jan 12).

## License and contributing

Civi is open source under the [MIT License](LICENSE) (Copyright 2026 chainnes). To contribute, read [CONTRIBUTING.md](CONTRIBUTING.md): fork the repo, copy `.dev.vars.example` to `.dev.vars` (never commit it), and open a small pull request. A maintainer reviews every PR before merge.

## Ground rules (built into the code)
- **Real data only.** Every figure has a source and an as-of date. No invented stats, earnings or results.
- **Verified links only.** Each Directory link is checked: `live` (HTTP 2xx/3xx) or `bot-protected` (401/403/429: site up but blocks bots). Dead and parked domains are dropped.
- **No scraping** of Facebook/Instagram/TikTok. Respect each site's ToS and robots.txt. Facebook events come only from links that users submit.
- **No keys in the frontend.** Secrets live in Cloudflare env vars or n8n credentials. Never commit `.env`, `.dev.vars`, `.n8n-local-login.txt` or `backups/`.
- **Privacy (RA 10173).** RLS on every table, minimal data, consent text on every form, salted hashes instead of IPs.
- **Brand listings are not endorsements.** Promo cards say "Civi doesn't verify individual deals."
- **Civi never sends email itself.** Emails go through n8n + Resend, only to users who opted in.

## Features
| Area | What it does |
|---|---|
| **Map** (home) | Philippines-only map (buffered inverse mask, no land clipping), smooth fractional zoom, learning labels (region/province/city, toggleable), place search, region stats + real outline (incl. NCR), **Map only** focus mode + per-panel hide toggles, hover cards on desktop, **day/night theme** from Manila sunrise/sunset (Auto/Day/Night), **transport layer** (airports, seaports, LRT/MRT/PNR, bus terminals → official schedule pages + advisories), events from Luma. |
| **Smart filters** | Collapsible panel: recency, **Location Region › Province › City** tree (Quezon City etc.), Categories, News type, **Event source**, Source type; search box, checkboxes, Select/Unselect all, "Only", chips. Saved in the browser. Bottom sheet on mobile. |
| **At a Glance** | Collapsible KPI panel: 2026 budget (₱6.793T, DBM), NG debt (₱19.61T end-Aug 2026, BTr), inflation, unemployment, GDP, remittances (link), **PNP focus crimes Q3 2026**, each with source + date. |
| **Directory** | Carousels by type with "See more", smart "What help do you need?" search (Taglish synonyms + optional Workers AI keywords), favorites, "Request to add your website" form (admin review). Categories include government, officials, civic tech, transport, **Earn & side income (Kumita at raket)**, **Events & things to do**, **Meetups & conferences**, **Promos & sales**, **Must-have apps**, embassies, learning centers, free language courses, **Learn farming (free/paid)**, sports, nature, animals, zoos/pasyalan, scholarships, life & safety and more. |
| **Academy** | Carousels of lessons + 18 government how-tos (SSS, Pag-IBIG, PhilHealth, passport…) + in-house courses: **Paano Kumita Online** (14 modules) and **7 life/eco/farming courses** (Pagtitipid, Eco-friendly, RA 9003 waste, Prepping, Permaculture, Hydroponics, Urban farming). Each has checklists, official links and as-of dates. Progress is saved on the device. |
| **Empower** | Petitions, Sumbong (issue reports with EXIF-stripped photos), FOI helper, Project Watch (PhilGEPS), Rights, Scholarships, community events, Impact. |
| **Lounge** | "Usapang Bayan" community conversations with neutral starter topics and sources; voting, reporting, rate limits. |
| **Daily Briefing** | Opt-in personalized digest (email via n8n + Resend; optional web push). One-click unsubscribe. |
| **Help & access** | Start tour, Help/FAQ page, help chatbot (FAQ + optional AI), accessibility options (text size, contrast, reduced motion), 10 languages (English + Tagalog full; others partial, machine-assisted). |
| **Other** | Favorites / My Saved, Share links, Donate (QR + PayPal.me), Premium waitlist, Simulator. |

## Architecture
```
Browser (index.html + js/*.js, Leaflet, Chart.js)  -- no keys
  │ /data/*.json (static snapshots)       │ /api/* (same origin)
  ▼                                        ▼
Cloudflare Pages (static)          Pages Functions (functions/api/*)
                                     │ SUPABASE_URL + anon key + user JWT cookie → RLS
                                     │ AI binding (Workers AI): summaries, assist
                                     ▼
                              Supabase (Postgres + Auth + Storage, RLS everywhere)
                                     ▲
n8n (service_role, schedules) ───────┘  ingest news/events, LawPhil, Daily Briefing → Resend / Web Push
Python scripts (scripts/*.py) → data/*.json snapshots (run by you, committed)
```
**Demo mode:** if `/api` is unreachable (local preview), Civi reads `/data/*.json` and keeps accounts, posts and favorites in localStorage, clearly labeled.

## Setup (short version; full beginner guide: `docs/SETUP_GUIDE_FOR_CHAI.md`)
1. Supabase project (Singapore). Schema deploys from `supabase/migrations/` on merge to `main` (see below). Enable Email + Google auth.
2. Fix git author on all commits, create a private GitHub repo, push.
3. Cloudflare Pages → connect repo (no build, output `/`). Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VOTER_SALT`, optional `PAYPAL_URL`, `DONATE_URL`, `KOFI_URL`, `VAPID_PUBLIC_KEY`. Binding: Workers AI as `AI`. Redeploy.
4. Resend: verify `mail.chainnes.com` (SPF/DKIM). n8n: import the 3 workflows in `n8n/`, add Supabase service_role + Resend credentials there only.
5. privacy@chainnes.com alias, donate QR images in `assets/donate/`, `PAYPAL_URL`.
6. Hard refresh after each deploy (`Cmd+Shift+R`).

## Database migrations

`supabase/migrations/` is the only schema. `sql/*.sql` files are pointers so the old scripts are not a second copy. Supabase's GitHub integration (working directory `.`, deploy to production on merge to `main`) applies **new** files in that folder when they reach `main`.

| Order | Migration | Replaces |
|---|---|---|
| 1 | `supabase/migrations/20261029105510_schema.sql` | `sql/001_schema.sql` |
| 2 | `supabase/migrations/20261029105511_beta.sql` | `sql/002_beta.sql` |
| 3 | `supabase/migrations/20261029105513_seed_lounge.sql` | `sql/003_seed_lounge.sql` |
| 4 | `supabase/migrations/20261029105515_feedback_referral.sql` | `sql/004_feedback_referral.sql` |
| 5 | `supabase/migrations/20261029105517_empower.sql` | `sql/005_empower.sql` |
| 6 | `supabase/migrations/20261029105518_briefing.sql` | `sql/006_briefing.sql` |
| 7 | `supabase/migrations/20261029105520_ux.sql` | `sql/007_ux.sql` |

Those seven files are safe to run on an empty database and on a database where `sql/001`–`007` were already pasted in the SQL editor. They use `IF NOT EXISTS`, `CREATE OR REPLACE`, and `DROP POLICY IF EXISTS` before `CREATE POLICY`. Lounge starter rows use `ON CONFLICT (id) DO UPDATE`, so a second run refreshes the text and does not insert duplicates.

**Later changes:** run `supabase migration new short_name`, edit only that new file, open a pull request, and merge to `main`. Do not edit a migration that has already been applied. Do not commit the service role key or any other secret. `supabase/config.toml` is the local CLI config from `supabase init` and only references `env(...)` names.

## Local run
```
python3 -m http.server 8799     # demo mode (no /api)
npx wrangler pages dev .        # with Functions; secrets in .dev.vars (never commit)
```

## Refresh data
| Data | Command |
|---|---|
| News, KPIs, hazards | `python3 scripts/fetch_data.py && python3 scripts/fetch_hub.py` |
| Events (Luma; optional Eventbrite/ICS) | `python3 scripts/fetch_events.py` |
| Directory extra categories | `python3 scripts/directory_more.py` (re-checks every link) |
| Civic tech + transport links | `python3 scripts/civic_transport.py` |
| Transport map points | `python3 scripts/build_transport_map.py` (OSM Overpass; occasionally) |
| Geo boundaries / places | `python3 scripts/build_geo2.py` (rarely) |
| Gov directory, officials, how-tos | `python3 scripts/build_ux_data.py && python3 scripts/check_links.py` |
| Budget/debt/crime KPIs | edit `data/kpis_extra.json` by hand with source + date |
Then bump the cache name in `sw.js`, commit and push.

## Docs
- `docs/Civi_Project_Documentation.md/.docx`: functional (features, user flows)
- `docs/TECHNICAL_DOCUMENTATION.md/.docx`: architecture, schema, RLS, functions, n8n, data, i18n, SW, security
- `docs/CODE_DOCUMENTATION.md/.docx`: every file, key functions, glossary
- `docs/SETUP_GUIDE_FOR_CHAI.md/.docx`: beginner step-by-step
- `docs/Civi_Case_Study`, `docs/Civi_Whitepaper`

## Known limits
OSM tiles are for light use only (switch to MapTiler/Stadia before open beta). Non-Tagalog dialects are partial and machine-assisted. Directory requests and reports are reviewed in the Supabase Table Editor (no admin page yet). Some government sites block automated checks; they are marked "site up".

## Update: Healthy lifestyle (Oct 29, 2026)
New Academy course **Healthy lifestyle at nutrisyon** (`data/howto_health.json`, 6 modules: Pinggang Pinoy, tubig at tulog, galaw, mental health with NCMH 1553, checkup + PhilHealth YAKAP, food safety/bawas asukal-asin/tipid meals) and Directory set **Health & wellness apps/sites** (12 cards). Not medical advice; consult a doctor. SW cache `civi-beta-8`.

## Update: UX batch 4 (Oct 29, 2026)
- **Theme everywhere:** Auto/Day/Night selector in the top bar (Auto follows Manila sunrise/sunset). Applies to every page, popups, menus, tooltips and modals; checked for WCAG AA text contrast in both themes.
- **Weather today** on the map dashboard: Open-Meteo forecast model (keyless, CC BY 4.0) for Manila or the selected region, with source + time, plus the official PAGASA link.
- **Dashboard layout:** semi-transparent glass panels docked left/right; the Panels menu lives only on the map, anchored to its button, and closes on outside click.
- **Filters:** tidy collapsible groups, ranked place suggestions (max 8), auto-zoom when you tick/untick places, "Show points" toggle to hide all points.
- **Readable popups** (up to 380 px), cleaner **Action Map** legend docked in the right panel ("Community event"; the source is in each point's details).
- **Featured strip** at the top of every page (`data/featured.json`).
- **Academy:** category chips, search, and ✨ Ask (Workers AI via `/api/assist` mode `academy`, keyword fallback).
- Calm motion (CSS only, transform/opacity, 150–300 ms, off with reduced motion). SW cache `civi-beta-9`.

**AI chatbot / ✨ Ask:** needs only the Cloudflare **Workers AI binding named `AI`**, with no external API key. Cloudflare → Workers & Pages → your Civi project → Settings → Bindings → Add → Workers AI → Variable name `AI` → Save → redeploy. Without it, Civi uses its built-in keyword/FAQ matching.

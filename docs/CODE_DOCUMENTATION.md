# Civi Code Documentation

*Updated Oct 29, 2026 (PHT): adds map batch 3 (js/map2.js), events, directory expansion, Earn, Academy courses. See section 7 for the batch-3 file map.*

For Chai: how the Civi code is organized, how data flows, what the key functions do, and what the technical words mean. Last updated Oct 29, 2026.

## 1. Big picture
Civi is a static website plus small server functions:
- **Frontend** (what runs in the browser): `index.html`, `css/hub.css`, `js/*.js`. Plain JavaScript, no build step. Libraries load from CDNs: Leaflet (map), Leaflet.markercluster (pin clusters), Chart.js (charts).
- **Backend** (what runs on Cloudflare): `functions/api/*.js` = Cloudflare Pages Functions. They talk to Supabase using env vars. The browser never sees keys.
- **Database**: Supabase (Postgres). Tables, security rules and functions are in `supabase/migrations/` (applied on merge to `main`). `sql/` only points there.
- **Automation**: n8n workflows in `n8n/` fetch news, events and laws on a schedule and send the opt-in Daily Briefing.
- **Static data**: `data/*.json` snapshots made by `scripts/*.py`. Used directly by the map, KPIs and directory, and as the demo-mode fallback.

## 2. Data flow
1. A visitor opens Civi. `hub.js` calls `/api/auth/me`. If it gets 404/503, Civi switches to **demo mode** (localStorage only).
2. The map loads `data/geo_regions.json` (region shapes), `data/map_items.json` (news/hazards/events), `data/kpis.json` + `data/kpis_extra.json` (at-a-glance numbers), `data/gazetteer.json` (PSGC places), plus user-shared links from `/api/map?kind=shared`.
3. Every item gets a region by checking which region polygon contains its coordinates (point-in-polygon). Filters hide items by region, category, type, source type and recency.
4. Actions (vote, post, petition, save) go to `/api/*`. The function reads the user's session cookie, calls Supabase with the user's token, and Postgres **RLS** decides what is allowed.
5. n8n (with the service_role key, outside the browser) writes new news/laws into Supabase and sends briefing emails through Resend to users who opted in.

## 3. Folders and files
| Path | What it is |
|---|---|
| `index.html` | The single page shell: top bar, dock menu, `<main id="view">`, modal, toast, script tags. |
| `auth-callback.html` | Landing page after Google/magic-link login; passes the session to `/api/auth`. |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA install info and the service worker (offline cache `civi-beta-5`). |
| `css/hub.css` | All styles: glass panels, map HUD, filters, carousels, tour, chat, accessibility modes. |
| `js/i18n.js` | Languages list (`CIVI_LANGS`) and core UI strings (`CIVI_I18N`). |
| `js/i18n_ux.js` | Strings for the UX batch (generated from `scripts/i18n_ux_src.py`). Merged into `CIVI_I18N`. |
| `js/extras.js` | Referral tracking (`civiRef`), translation feedback modal. |
| `js/hub.js` | Core app: helpers, auth modal, **map**, filters, KPIs, Lounge, Share, More, legal pages, **router**. |
| `js/sim.js` | Civi Sims (President budget sim) and the Donate page. |
| `js/empower.js` | Empower hub: petitions, Sumbungan ng Bayan, Project Watch, FOI helper, Know Your Rights, Impact, Action Map layer, Scholarships. |
| `js/briefing.js` | Daily Briefing page, settings, email preview, push subscribe. |
| `js/ux.js` | Favorites + Saved page, Directory carousels + smart search, Academy carousels + How-To guides, Help/FAQ, help chat, tour, accessibility toggles. Overrides some routes. |
| `functions/_lib.js` | Shared server helpers: `json`, `configured`, `sb` (Supabase REST call), `authApi`, cookies/session, `currentUser`, `sameOrigin`, `hashId` (salted hash), `fail`, keyword categorizer, `geotag`. |
| `functions/api/auth/[[path]].js` | Sign up, log in, magic link, Google OAuth, logout, me, referral. |
| `functions/api/feed.js`, `map.js` | News feed with ranking; shared-link pins. |
| `functions/api/lounge.js` | Topics, replies, anonymous votes, reports. |
| `functions/api/share.js` | Share a link: fetch title/oEmbed, categorize, geotag. |
| `functions/api/empower.js` | Petitions, signatures, sumbong reports, events, impact. |
| `functions/api/briefing.js`, `briefing/unsubscribe.js` | Briefing settings and one-click unsubscribe. |
| `functions/api/favorites.js` | **New.** GET/POST saved items for the logged-in user. |
| `functions/api/assist.js` | **New.** Optional Workers AI: directory keywords and FAQ-only help answers. Returns 503 if no `AI` binding; the browser falls back. Stores nothing. |
| `functions/api/directory-request.js` | **New.** "Request to add your website": honeypot + URL check, saves a pending request via `request_directory_listing()` RPC (3/day). Admin review before anything is published. |
| `functions/api/summarize.js`, `translation.js`, `waitlist.js`, `config.js` | AI summaries, translation suggestions, Premium waitlist, public config (donate links). |
| `supabase/migrations/` | Database schema, RLS policies, RPC functions. Applied by the Supabase GitHub integration. `20261029105520_ux.sql` adds `favorites` + `add_favorite()` and `directory_requests` + `request_directory_listing()` (insert-only RLS). `supabase/config.toml` is local CLI config from `supabase init` (no keys). |
| `n8n/*.json` | Importable n8n workflows (ingest, law ingest, briefing). |
| `email/briefing.html` | Briefing email template. |
| `data/*.json` | Snapshots: `geo_regions` (geoBoundaries ADM1), `gazetteer` (PSGC places), `map_items`, `kpis`, `kpis_extra`, `budget_2026`, `projects` (PhilGEPS), `directory_hub`, `gov_directory`, `officials`, `companies`, `howto`, `academy`, `scholarships`, `lounge_seed`, `law_refs`, etc. |
| `scripts/*.py` | Data builders: `fetch_data.py`, `fetch_hub.py`, `fetch_projects.py`, `scholarships.py`, `build_ux_data.py`, `check_links.py`, `i18n_ux_src.py`, `md2docx.py`; `i18n_coverage.js`. |
| `docs/` | This file, project documentation, case study, whitepaper, source map. |
| `screenshots/` | Test screenshots (`screenshots/ux/` for this batch). |

## 4. Key functions (frontend)
| Function | File | What it does |
|---|---|---|
| `t(key)` | hub.js | Returns the UI text in the chosen language, falling back to English. |
| `api(path, opts)` | hub.js | Calls `/api/…`; returns `{demo:true}` when the backend isn't there. |
| `data(name)` | hub.js | Loads and caches `/data/name.json`. |
| `route()` / `ROUTES` | hub.js | Reads `#/page` from the URL and runs that page's view function. Other files add pages with `Object.assign(ROUTES, …)`. |
| `viewMap()` | hub.js | Builds the map: PH bounds, inverse mask, region layer + popups, labels by zoom, place search, filter panel, KPIs. |
| `regionOf(item, geo)` | hub.js | Point-in-polygon test to find an item's region. |
| `visible(all)` | hub.js | Applies the filters (state.f) to the item list. |
| `renderFilters()` / `onlyIn()` | hub.js | Draws filter groups with search, checkboxes, Select/Unselect all, Only, chips; saves to localStorage `civi.filters.v2`. |
| `drawPins()` | hub.js | Puts pins into a zoom-aware cluster group. |
| `renderKpis()` | hub.js | Groups and draws KPI rows + sparklines with source links. |
| `favBtn()` / `viewSaved()` | ux.js | Star button and the Saved page; syncs with `/api/favorites` when logged in. |
| `expand()` / `score()` | ux.js | Smart search: splits words, removes filler words, adds synonyms (e.g. "utang" → loan, Pag-IBIG, SSS), scores matches. |
| `rowc()` / `wireCarousels()` | ux.js | Horizontal carousel rows with ‹ › and See more. |
| `startTour(i)` | ux.js | Spotlight tour step i; remembers completion in `civi.tour`. |
| `requestListing()` | ux.js | Directory "Request to add your website" form with client checks; demo mode saves to localStorage `civi.demo.dirreq`. |
| **Honeypot** | | (glossary) A hidden form field people never see; bots fill it, so those submissions are ignored. |
| `openChat()` / `botAnswer()` | ux.js | Help chat: FAQ matching in the browser, optional AI via `/api/assist`. |

## 5. Data rules
- Every number on "at a glance" comes from a file with `source`, `url` and an as-of date. To update, edit `data/kpis_extra.json` or re-run `scripts/fetch_data.py`.
- Officials list names only top offices with a source and as-of date; full lists link to the Senate and House sites.
- `check_links.py` marks links `live`, `bot-protected` (site up but blocks bots, e.g. Cloudflare-protected .gov.ph) or `check` (could not be auto-checked; verify by hand).

## 7. Batch 3 additions (map, events, directory, Earn, Academy)

### js/map2.js (map batch 3, loaded after hub.js)
| Function | What it does |
|---|---|
| `civiLocTree(all, label)` | Builds the Region › Province › City filter tree HTML from item `region/prov/city` tags (counts per node). |
| `civiLocWire(all)` | Wires the tree: expand/collapse, checkbox cascade, search, "Only"; writes `state.f.off.region/prov/city`. |
| `civiHover(cluster)` | On fine pointers (desktop), shows the item card as a tooltip on hover. |
| `fine()` | `matchMedia("(pointer:fine)")` helper. |
| `sun()` / `civiSun` / `_sunT` | NOAA-style sunrise/sunset for Manila (UTC+8); returns rise/set minutes and `day`. |
| `themeMode()` / `applyTheme(mask)` | Auto/Day/Night (`localStorage civi.theme`); sets `html[data-theme]`, mask color, sunrise/sunset chip. |
| `transport(map)` | Transport layer from `transport_map.json` + official links from `civic_transport.json` (airports, ports, rail lines/stations, bus terminals); toggle saved in `civi.layer.transport`. |
| `setHidden`, `renderMenu`, `syncPanels` | Per-panel hide toggles ("Panels" menu) saved in localStorage. |
| `focus` (internal) | "Map only" mode (`body.map-focus`), Esc restores. |
| `civiMapExtras(map, mask)` | Entry point called by `viewMap()` to add the toolbar, theme, transport and panels. |

### Changes in js/hub.js
`maskLayer` now uses `data/ph_mask.json` (PH outline buffered outward ~3 km, fades out from zoom 8–10) so land is never clipped; `selLayer` draws the selected region's outline (NCR included); `itemKeys()` adds `esrc` (event source) and uses `region/prov/city`; `visible()` honors prov/city filters; labels and place search use `data/places.json`.

### Changes in js/ux.js
`viewDirectory2()` category `order` includes Earn sub-groups, Events, Meetups, Promos, Must-have apps, Learning centers, Free language courses, Learn farming, Embassies; `SYN` has Taglish synonyms (kumita, raket, benta, gimik, promo, embahada, nihongo, sine, pagsasaka, hydroponics…). `howAll()` merges `howto.json`, `howto_earn.json`, `howto_life.json`. `viewHowto()` shows `links` (verified URL list with ✓ for bot-protected) and `related` Directory searches.

### New data files
| File | Shape |
|---|---|
| `data/ph_mask.json` | `{rings:[[lat,lng]...]}` holes for the inverse mask |
| `data/places.json` | `{provinces:{name:{ll,r}}, places:[{n,lvl,ll,p,r}]}` city/municipality centroids |
| `data/transport_map.json` | `{airports, ports, rail, lines, bus}` from OSM |
| `data/events.json` | `{fetched_at,status,items:[{kind:"event",title,url,source,esrc,time,place,ll,region,prov,city}]}` |
| `data/event_feeds.json` | allowed Eventbrite org IDs / ICS feeds (empty by default) |
| `data/directory_more.json` | `{as_of,note,items:[{cat,name,abbr,url,label,desc,link,checked}]}` |
| `data/howto_earn.json`, `data/howto_life.json` | `{as_of,course,note,items:[{id,cat,title,title_tl,src,steps[],tip,related[],links?[[name,url,status]]}]}` |

### New scripts
`build_geo2.py`, `build_transport_map.py`, `geotag.py`, `fetch_events.py`, `directory_more.py` (see TECHNICAL_DOCUMENTATION §6).

## 6. Glossary
| Term | Meaning |
|---|---|
| **PWA** | Progressive Web App: a website that can be installed like an app and work partly offline. |
| **Service worker** | A small script (`sw.js`) the browser runs in the background to cache files and receive push notifications. |
| **Pages Functions** | Small server programs on Cloudflare that run when a URL under `/api/` is called. |
| **Workers AI / AI binding** | Cloudflare's hosted AI models. A "binding" connects it to your Functions as `env.AI` without any key in the code. |
| **Env var** | A secret/config value set in the hosting dashboard (e.g. `SUPABASE_URL`), not in code. |
| **Supabase** | Hosted Postgres database with login (Auth), file storage and auto-generated APIs. |
| **anon key / service_role key** | Supabase keys. anon = limited, obeys RLS (used by Functions). service_role = full access, bypasses RLS (only in n8n). |
| **RLS (Row-Level Security)** | Database rules that decide, row by row, who can read or change data (e.g. you only see your own saved items). |
| **RPC** | Remote Procedure Call: a database function called through the API (e.g. `add_favorite`), used to add checks and rate limits. |
| **JWT / session cookie** | The signed login token; Civi stores it in an HttpOnly cookie so page scripts can't read it. |
| **OAuth** | "Continue with Google" login standard. |
| **Magic link** | Login by clicking a link sent to your email. |
| **CSRF / same-origin check** | Protection so other sites can't trigger actions using your login. |
| **Rate limit** | A cap on how often an action can be done, to stop spam. |
| **Salted hash** | One-way scrambling of a value (device id + IP + secret salt) so it can be compared without storing the original. |
| **localStorage** | Small storage inside your browser on this device (language, filters, demo data). |
| **Demo mode** | Civi running without a backend; data stays in the browser. |
| **Leaflet** | Open-source map library. **Tiles** are the square map images; **OSM** = OpenStreetMap, the free community map. |
| **GeoJSON** | Standard format for map shapes (region boundaries). |
| **Inverse mask** | A huge polygon with the Philippines cut out as holes, drawn on top of the tiles so only PH shows. |
| **maxBounds / zoomSnap / flyTo** | Leaflet settings: lock panning to an area; allow fractional zoom steps; animated move-and-zoom. |
| **Marker cluster** | Groups nearby pins into one numbered circle. |
| **Point-in-polygon** | Math test to check whether a coordinate is inside a shape. |
| **PSGC** | Philippine Standard Geographic Code (PSA): official codes for regions, provinces, cities, barangays. |
| **geoBoundaries** | Open dataset of administrative boundaries (PH from NAMRIA/PSA/OCHA, CC BY 3.0 IGO). |
| **oEmbed** | Official way platforms (TikTok, YouTube) share a post's title/thumbnail without scraping. |
| **robots.txt** | A site's rules for automated visitors; Civi respects it. |
| **n8n** | Workflow automation tool that runs scheduled jobs. |
| **Resend** | Email-sending service; **SPF/DKIM** are DNS records proving emails really come from chainnes.com. |
| **Web Push / VAPID** | Browser notifications; VAPID keys identify the sender of push messages. |
| **i18n** | Internationalization: making all text translatable. "Machine-assisted" = drafted by machine, not yet reviewed by a native speaker. |
| **ARIA** | HTML attributes that help screen readers understand buttons and regions. |
| **Fuzzy / synonym search** | Matching words that are close or related, not only exact. |
| **RA 10173** | Data Privacy Act of 2012. **NPC** = National Privacy Commission. |
| **RA 10175** | Cybercrime Prevention Act (includes online libel). |
| **FOI** | Freedom of Information requests to executive agencies. |
| **GAA / BESF** | General Appropriations Act (the budget law) / Budget of Expenditures and Sources of Financing (DBM). |
| **PhilGEPS** | Government procurement (bidding) portal. |
| **PSE / PSE EDGE** | Philippine Stock Exchange and its company disclosure site. |

- **Inverse mask**: a world-sized polygon with the Philippines cut out as holes, so only PH shows.
- **Buffered mask**: holes enlarged a few km outward so coastlines are never covered.
- **Focus mode / Map only**: hides all panels to show the full map.
- **Kratky / DWC / NFT**: hydroponics methods (passive jar; aerated deep water; thin nutrient film in channels).
- **IPM**: Integrated Pest Management, observe first and use the least harmful control.
- **Bot-protected**: the site answered 401/403/429 to our checker, which means it's up but blocks bots.
- **Link-only source**: Civi links to the page but does not pull its data (no API or not allowed).
- **as-of date**: the date a fact or link was last checked.

## Update (Oct 29, 2026): health batch
`howAll()` now also loads `data/howto_health.json`; `viewDirectory2()` order adds 'Health & wellness apps/sites' after 'Health'; `SYN` adds kalusugan, nutrisyon, nutrition, diet, healthy, ehersisyo, exercise, tulog, mental, lungkot, yakap. tl labels appended to `js/i18n_ux.js`.

## Update: UX batch 4 (Oct 29, 2026)
| File | New / changed |
|---|---|
| `js/ux3.js` (new) | `themeSel()` top-bar theme selector; `civiFeatured(key)` featured strip; `weather(place)` / `civiWeather` Open-Meteo card; listens to `civi:place`. |
| `js/map2.js` | `civiApplyTheme`, `civiThemeMode` (global); `zoomLoc()`, `civiHome()`; "Show points" (`#lyPins`); removes `#mapCtl`/`#actPanel` on leaving the map; calls `civiFeatured("map")`, `civiWeather()`. |
| `js/hub.js` | Place suggestion list (`#placeSug`, ranked, keyboard); region click → `selectRegion`; wider popups; pins toggle; `selectRegion` dispatches `civi:place`; `page()` adds `#featured`; stats collapsed into one details; filter groups collapsed by default. |
| `js/empower.js` | Action Map: "Community event", tidy grid legend, panel docked into the right HUD, button inside the map toolbar. |
| `js/ux.js` | Academy: category chips (`data-ac`), search (`#acQ`), ✨ Ask (`#acAI`, `/api/assist` mode academy); `?add=1` opens the directory request form; synonyms ipon/savings/budget. |
| `functions/api/assist.js` | `mode:"academy"`. |
| `css/hub.css` | Global day theme, contrast fixes, glass panels, suggestions, popups, legend, featured, weather, academy chips, motion. |
| `data/featured.json` (new) | Curated featured links per page. |

Glossary: **WCAG AA**: minimum text contrast 4.5:1 (3:1 for large text). **Skeleton loader**: a soft placeholder shown while content loads. **Progressive disclosure**: showing less by default and expanding on demand.

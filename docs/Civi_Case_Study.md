# Civi Case Study: Designing a People's Dashboard for the Philippines
*Chainnes · Pre-launch case study · Oct 29, 2026 · Editable*

> Honest status: Civi has not launched. This case study explains the problem, the decisions and how we'll measure success. It contains no user results, because there are none yet.

## Context
Chainnes builds solarpunk-minded civic tools. Civi started as a Community Hub Intelligence MVP (dashboard, directory, academy, nature tracker). Feedback from the founder, Charlene "Chai" Cordero, pushed it toward a national hub: a map-first "performance analytics of the Philippines" that feels like a spaceship dashboard but stays simple.

## The challenge
- Make dense public data feel alive without overwhelming first-time users.
- Collect information legally: many PH government sites block bots, and social platforms forbid scraping.
- Let people debate (Filipinos love a good argument) without turning into a toxic comment section.
- Protect privacy under RA 10173 while still requiring accounts for posting.
- Serve a multilingual country.

## Design decisions and rationale
| Decision | Why |
|---|---|
| Map as the homepage | People think in places ("what's happening in my province"). Clusters show where news concentrates at a glance. |
| Glass HUD panels, few controls | Gives the "dashboard while driving" feel; two filter groups + one hint keep it learnable. |
| Category + source-type chips on every card | Users immediately see *what* it is and *who* says so (news outlet vs agency vs community vs user). |
| Official vs unofficial labels on KPIs | Trust: PSA/World Bank/USGS figures are marked official and linked; ECB-based peso rate and keyword counts are labeled as such. |
| Legal-first data map (47 sources, access classes A–D) | Avoids scraping blocked or forbidden sources; FOI requests for the rest. |
| Share-a-link instead of scraping social media | TikTok/YouTube official oEmbed gives captions legally; users bring the content. |
| No pre-approval, ranking + 3-report auto-hide | Keeps the Lounge fast and community-owned; rate limits reduce spam. |
| Neutral Civi starter topics with primary sources | Sets a respectful tone and models citing sources. |
| Server-side auth with HttpOnly cookies | No keys in the browser; RLS enforces per-user permissions. |
| Machine-assisted translations, clearly flagged | Reach 11 languages now, while being honest until native speakers review. |

## What we built for the beta
Map HUD with real KPIs (PSA inflation 7.2% Sep 2026, PSA unemployment 5.3% Aug 2026, USD→PHP from ECB data, World Bank GDP growth/poverty/population, USGS quake count), 84 map items from news RSS, USGS, GDACS and Luma events (60 geotagged), a 73-entry Smart Directory, 28 Lounge starter topics, link sharing, auth, legal pages, donate and Premium waitlist. Figures are as fetched on Oct 29, 2026 and change on each refresh.

## Risks we see
Misinformation through shared links, brigading in the Lounge, translation errors, geotag mistakes (place-name matching), reliance on free APIs and tile servers, and the solo-founder workload.

## How we will judge success
See the beta targets table. We'll publish real results after the closed beta.

## Roadmap and timeline (proposed, dates in PHT)

| Phase | Dates (proposed) | What happens | Exit criteria |
|---|---|---|---|
| 0. Setup | Oct 29 – Nov 15, 2026 | Chai creates Supabase project, Google OAuth, GitHub repo, Cloudflare Pages deploy; privacy contact = privacy@chainnes.com; uploads donate QR images; native-speaker review of Tagalog + Bisaya strings; legal read of Privacy Policy/Terms | Site live on a private URL, login works, all 3 SQL files applied, n8n workflows running |
| 1a. Closed beta | Nov 16 – Dec 13, 2026 (4 weeks) | Open-link beta (anyone with the link; referral source tracked; was 50–100 invited testers) spread across Luzon, Visayas, Mindanao. Weekly feedback form, bug triage | Targets below met or understood; no open privacy/security issue |
| 1b. Open beta | Jan 5 – Mar 27, 2027 (12 weeks, after holidays) | Public sign-up, social launch, Lounge weekly "Topic of the week", partner outreach (schools, NGOs, LGU info offices) | Open-beta targets below |
| 2. Premium pilot + Civi Sims | Apr – Sep 2027 | Premium (coming soon → paid pilot) based on waitlist demand; Civi Sims MVP; province view; PAGASA/PHIVOLCS live alerts; native-reviewed translations for all 11 languages | Paying pilot users or a clear no-go decision; Sims playtested |
| 3. Scale | Q4 2027+ | Data partnerships, FOI-sourced datasets, LGU dashboards, native mobile app | Sustainable costs |

### Beta targets and success metrics (proposed, to be confirmed by Chai)

| Metric | Closed beta (4 wks) | Open beta (12 wks) |
|---|---|---|
| Registered users | 50–100 | 1,000 |
| Weekly active users | 30 | 300 |
| Provinces with at least one user-shared link | 10 | 40 |
| Shared links | 50 | 500 |
| Lounge replies | 100 | 2,000 |
| Week-4 return rate | ≥ 30% | ≥ 25% |
| Reported-and-hidden content | < 2% of posts | < 2% |
| Usability (System Usability Scale survey) | ≥ 68 | ≥ 70 |
| Premium waitlist sign-ups | 15 | 100 (≈10% of users) |

These are targets, not results. Civi has no users yet.

### Civi Sims (President sim is now a playable beta; the rest are Phase 2 ideas)
Real-life simulation games about the Philippines, to learn how the country works and to help people discover what they want to do.

| Sim | Player role | Learning goals | Real data it could use |
|---|---|---|---|
| If you were President | Allocate the national budget, pick policies, face trade-offs (inflation, jobs, debt, disasters) | How the GAA works, trade-offs, why budgets are political | DBM budget (GAA), PSA inflation/LFS, World Bank GDP/poverty |
| Datu of a precolonial barangay | Lead a barangay: trade, alliances, food, sea routes | Precolonial history, community governance | NHCP/NCCA public history resources (to verify) |
| Solarpunk Philippines 2050 | Plan a climate-resilient city: energy, transport, green space | Climate adaptation, renewable energy, urban planning | PAGASA climate data, DOE energy stats, NOAH hazard maps |
| LGU Mayor | Run a city: typhoon response, roads, health, local revenue | Local Government Code, DRRM, public service | RA 7160, NDRRMC sitreps, PSA city data |
| Career sims | Pilot, banker, investor, farmer, teacher, nurse, coder, OFW | What the work is really like, pay, training paths | PSA occupational wages, TESDA/CHED programs, PhilJobNet |

Design notes: short sessions (5–10 min), choices backed by cited data, no real politicians depicted, results shareable to the Lounge.

## Update Oct 29, 2026: beta additions (Chai's decisions)

**1. Smart Directory: 117 entries (was 73).** New categories: *Volunteer & NGOs* (25), *Legal aid & rights* (6), *Consumer complaints* (5), *Mental health* (2), *OFW services* (2), plus 2 more scholarships, DSWD and WHO Philippines. Every new entry is an official website checked on Oct 29, 2026: "live" (HTTP 200) or "up but blocks automated checks" (bot challenge). Only one phone number was added: the NCMH Crisis Hotline 1553, cited to a DOH page. Left out: Kaya Natin and Teach for the Philippines (sites unreachable from our check), Akshaya Patra (India-based, not a PH org). Script: `scripts/directory_extra.py` (`--check` re-verifies).

**2. Donate page (`#/donate`).** QR slots for GCash, Maya and MariBank. Chai uploads her own images to `assets/donate/{gcash,maya,maribank}.png`; until then placeholders show (no fake QR codes). Optional PayPal / Ko-fi links via Cloudflare env vars `PAYPAL_URL`, `KOFI_URL` (https only). Transparency note: voluntary, not tax-deductible, Civi is not a registered charity, money covers hosting/data/domain/map costs, a summary of money in and out is planned at the end of the beta.

**3. Privacy contact: privacy@chainnes.com** (Privacy Policy, Terms, footer, docs). Chai sets it up as an alias.

**4. Community translation review.** Every non-English page has "Suggest a better translation" in the footer (login required). Suggestions go to the Supabase table `translation_feedback` (RLS: users read only their own rows; inserts only through the rate-limited RPC `suggest_translation`, 30/hour). Reviewers read them in the Supabase dashboard and mark them accepted/rejected. No paid reviewer for now: users are the reviewers.

**5. Civi Sims beta: "Kung Ikaw ang Presidente" (moved from Phase 2 to the beta).** Playable at `#/sim`. Uses the real FY 2026 GAA expenditure program by department (DBM, BESF 2026 Table B.6.c, total ₱6.793T; e.g. DepEd ₱1,015.3B, DPWH ₱530.9B, DOH ₱304.6B, DSWD ₱270.2B, debt interest ₱950B). Players move department budgets ±50%, pick up to 3 policies, and see a radar of 12 areas plus over/under vs the GAA. Outcomes are a simple **illustrative** scoring model, clearly labeled, not a forecast. "Share to Lounge" posts a public topic in the Government category with the DBM source. After sharing, an optional "Send to Malacañang" opens the user's **own** email app (mailto) with the suggestion prefilled; the To: field is left blank and the user picks the address from the Office of the President's official Contact Us page (op-proper.gov.ph/contact-us, which lists MRO, PACe and HRMO emails, none specifically for policy suggestions) or the 8888 Citizens' Complaint Center page (8888.gov.ph/contact-us). Civi never sends email itself. Disclaimer shown: Civi is not affiliated with the government, no guarantee of a reply, users send at their own discretion, be respectful, no private info about others.

**6. Open-link beta (no invites).** Anyone with the link can join. First-touch referral is recorded from `?ref=` or `utm_source`/`utm_campaign` (e.g. `civi.app/?ref=tiktok&utm_campaign=beta1`), stored on the profile (`ref_source`, `ref_campaign`; `supabase/migrations/20261029105515_feedback_referral.sql`), and counted in the `signup_sources` view (aggregates only, not readable by users). Campaign tips: one link per channel (tiktok, fb, ig, x, gc, school, ngo); post a 15-second screen recording of the map and the President sim; weekly "Topic of the week" in the Lounge; ask testers to share their sim result; partner posts with schools and NGOs from the Directory; reply to every feedback in week 1.

### Revised beta timeline and targets (proposed)

| Phase | Dates | What happens | Targets |
|---|---|---|---|
| 0. Setup | Oct 29 – Nov 15, 2026 | Supabase (run SQL 001–004), Google OAuth, GitHub, Cloudflare Pages; privacy@ alias; upload QR images; legal read of Privacy/Terms | Site live; login, Lounge, sim share and translation feedback work |
| 1a. Soft open-link beta | Nov 16 – Dec 13, 2026 | Chai shares the link on her own channels with ref tags; quick fixes weekly | 150 sign-ups, 40 weekly active, 30 sim shares, 25 translation suggestions, ≥3 channels with ≥10 sign-ups each |
| 1b. Open beta campaign | Jan 5 – Mar 27, 2027 | Public campaign, partner posts, Topic of the week | 1,000 sign-ups, 300 weekly active, 300 sim shares, 100 Premium waitlist |
| 2. Premium pilot + more Sims | Apr – Sep 2027 | Premium pilot; Datu, Solarpunk PH and career sims; province view; live alerts | Paying pilot or clear no-go |

These are targets, not results. Civi has no users yet.

## Update Oct 29, 2026 (2): Empower hub, Kapangyarihan ng Bayan
Goal: help people act on public issues safely, in a non-partisan way. **Civi never sends letters, emails or FOI requests.** Users review them and send them on their own.

- **Petitions** (`#/petitions`): users create a petition with a title, a clear ask, a target agency or office, 1 to 8 https source links (required) and a goal from 10 to 1,000,000. Signing requires login and is limited to one signature per user (primary key). Signer names are private by default; only the count and a progress bar are public. Creators can post updates, and anyone can share or report. A letter generator works with copy or mailto (the To field stays blank), and there is a "Turn into FOI request" option. Limits: 3 petitions/day, 60 signatures/hour.
- **Sumbungan ng Bayan** (`#/sumbong`): users report public issues and projects on a map. Categories: flood control, roads & bridges, land & IP rights, utilities, environment, public services, other public project. Each report needs at least one evidence link and an acknowledgement of the rules. The optional photo is re-encoded in the browser, which removes EXIF/GPS. The server rejects files that aren't JPEG, that still have EXIF APP1, or that are over 3 MB, and saves them to Supabase Storage `sumbong-photos/<uid>/`. Coordinates are rounded to about 100 m. Includes an "Ako rin" counter and a status that only the reporter can change (Reported → Escalated → Agency responded → Resolved). Reports are auto-hidden after 3 flags. Limit: 3 reports/day.
  - **Rules (UI + Terms):** report issues, not individuals. Don't name or show private persons. Every claim needs a source. Accusations against officials belong with the Ombudsman, COA or the courts. Cyberlibel is a crime under RA 10175.
  - **Where to escalate:** Ombudsman, COA, 8888, CHR, NCIP, DENR, DPWH, LGU (via DILG), PAO. Official links were checked Oct 29, 2026. COA, 8888, NCIP, DENR, PAO and FOI returned 403 to automated checks (bot blocking), but they are the official domains.
- **Project Watch** (`#/projects`): **real data**, 20 PhilGEPS public bid notices (Open Opportunities, first page) fetched Oct 29, 2026 PHT by `scripts/fetch_projects.py`. Shows the approved budget, procuring entity, bid closing date, area and an official link. Contractor reads "Not yet awarded (open bid)". Contact persons are not stored (RA 10173). DPWH project monitoring sits behind an Incapsula anti-bot wall, so it is **linked only, not scraped**. Citizens can add ground updates, and Sumbungan reports linked to a project appear on its page.
- **FOI Helper** (`#/foi`): a guided EO 2 request (agency, data requested, purpose, format) with copy and a link to foi.gov.ph. Users track their own requests (status, tracking no., date filed, estimated 15-working-day due date). The tracker is private (RLS: owner only).
- **Know Your Rights** (`#/rights`): explainers on peaceful assembly (Const. Art. III, BP 880), IPRA/FPIC (RA 8371), the Consumer Act (RA 7394), Labor Code basics (PD 442), the Data Privacy Act (RA 10173), FOI (EO 2 s. 2016) and cyberlibel (RA 10175). Each links to the LawPhil text and is marked "Not legal advice."
- **Action Map layer:** an "✊ Action Map" toggle on the home map shows Luma public events, user-submitted events (hearings, peaceful assemblies, volunteer activities; labeled unverified, auto-hidden after 3 flags) and Sumbungan reports. Volunteer groups from the Directory have no single location, so they are counted and linked.
- **Impact board** (`#/impact`): computed only from petitions that reached their goal and reports marked Resolved. The empty state is honest, and wins are never seeded.
- **Neutral seeding:** there are no seeded petitions or reports, apart from one petition clearly labeled **SAMPLE** (which can't be signed) that links real DPWH and EO 2 pages. Civi makes no claims about MRT, Pax Silica or flood control cases.
- **Database:** `supabase/migrations/20261029105517_empower.sql` adds petitions, signatures, updates, reports, issue reports, me-too, flags, project updates, foi_requests, user_events and the `impact_public` view. RLS is on for every table, and writes go only through security-definer RPCs with `rate_ok()`. Public views never expose signer identities. Tested on local Postgres 17 with Supabase auth/storage stubs.
- **API:** `functions/api/empower.js`. **i18n:** full English and Tagalog strings; other locales get the nav label and fall back to English.

## Update Oct 29, 2026 (3): Scholarships (Directory → Scholarships)
`#/scholarships` has **Local** and **Abroad** tabs and filters by level (UG/Masters/PhD/Short), country and field keyword. Each entry lists the provider, levels, fields, coverage, typical deadline window ("Check official site" when unsure), eligibility and the official link. `scripts/scholarships.py` checks every link live and drops any entry it can't verify. Result: **26 listed (11 Local, 15 Abroad)**. Five sites (Chevening, Fulbright PH, GKS/Study in Korea, OWWA EDSP and ELAP) block scripted checks, so they were confirmed through a separate web fetch.
Not yet listed because they couldn't be verified on Oct 29: CHED CMSP page (403), LGU (DILG), Metrobank Foundation, Jollibee Group Foundation, Australia Awards PH (503), Chinese Government Scholarship (CSC), ADB-JSP. Re-run the script, or check them by hand.
Backlog: **optional deadline alerts** (opt-in email or push about 30 days before a scholarship's typical window; needs a verified-dates table and Supabase cron or n8n).


## Update (Oct 29, 2026)
Since the first draft, Civi added a Philippines-only learning map (day/night, transport layer, location tree), a ~570-card verified Directory (Earn & side income, events, promos, must-have apps, embassies, farming, recycling programs), and in-house Academy courses (Paano Kumita Online; pagtitipid, eco, waste, prepping, permaculture, hydroponics, urban farming). Closed beta Nov 17, 2026; open beta target Jan 8, 2027.

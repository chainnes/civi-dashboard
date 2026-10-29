# Civi · Project Documentation (Functional)

Version: beta pilot, updated Oct 29, 2026 (PHT). Owner: Charlene "Chai" Cordero.

## 1. Purpose
Civi is a Philippine community intel hub: a calmer alternative to social feeds full of trends, memes and anger. Instead of doom scrolling, Filipinos (especially youth) learn about the country, find official help fast, earn safely, and take part in their community. Tone: friendly Taglish, sourced, neutral.

## 2. Users
- **Visitors** (no account): map, directory, academy, help, lounge reading.
- **Members** (email or Google): favorites synced, lounge posts/votes, petitions, Sumbong reports, Daily Briefing, share links.
- **Admin (Chai / moderators)**: reviews directory requests, reports and flags in Supabase.

## 3. Feature history (from the start)
| Batch | Delivered |
|---|---|
| MVP | Map of news + hazards, Directory, Lounge, Academy, Simulator, auth, PWA |
| Empower | Petitions, Sumbong, FOI helper, Project Watch, Rights, Scholarships, Events, Impact |
| Briefing | Daily Briefing prefs, email template, n8n + Resend, web push (optional), unsubscribe |
| Premium/Donate | Premium waitlist, Donate page (QR + PayPal.me), referral |
| UX batch 1 | PH-only map, smooth zoom, labels, place search, smart filters, At a Glance KPIs, directory/academy carousels, 18 how-tos, favorites + My Saved, tour, Help/FAQ/chatbot, accessibility |
| UX batch 2 | "Request to add your website" form, README + code docs |
| Civic & transport | Civic Tech & Community-built carousel; Transport & Schedules (Land/Air/Water) |
| Map batch 3 | No land clipping, NCR outline, Map only + per-panel toggles, hover cards, Region › Province › City filter, day/night by sunrise/sunset, transport layer, Event source filter, crime KPI |
| Directory expansion | 30+ new categories incl. sports, nature, animals, zoos, entertainment, shopping, apps, events, meetups, promos, embassies, languages, learning centers, farming |
| Earn | "Earn & side income / Kumita at raket" sub-groups + Iwas scam |
| Academy courses | Paano Kumita Online (14 modules); Pagtitipid, Eco-friendly, Waste (RA 9003), Prepping, Permaculture, Hydroponics, Urban farming |

## 4. Features and user flows

### 4.1 Map (home)
- Shows only the Philippines. Zoom with wheel/pinch or + / − buttons; 🇵🇭 resets.
- **Labels** button shows/hides region, province and city names (learning mode).
- **Find a place**: type "Quezon City", "Cebu", "Region VII" → map flies there; regions get a real outline and stats.
- **Hover** a pin (desktop) to see the card; tap on mobile.
- **🗺️ Map only** hides every panel (Esc to restore). **▦ Panels** lets you hide panels one by one.
- **Theme**: Auto follows Manila sunrise/sunset (shown in PHT); or force Day/Night.
- **Transport layer**: airports ✈️, seaports ⚓, rail 🚆 (LRT-1/2, MRT-3, PNR lines), bus terminals 🚌. Popups link to official schedules and advisories (PAGASA, Coast Guard, CAAP). Civi never copies schedules or fares.
- **Events**: public events from Luma (API feed); other sources link-only.

### 4.2 Filters
Open the Filters panel (mobile: bottom sheet). Groups: When (any/24h/7d/30d), Location tree (Region › Province › City), Categories, News type, Event source, Sources. Each group: search box, checkboxes, Select all / Unselect all, "Only". Active filters appear as chips; tap to undo. Clear all resets.

### 4.3 At a Glance
Collapsible KPI panel with sparklines. Each value has an "official" badge, source link and date. Crime: PNP focus crimes Jul–Sep 2026 = 7,233 (−29.75% vs Q3 2025), recorded incidents not a rate; source PNP data as reported by GMA News (PNP briefing Oct 5, 2026).

### 4.4 Directory
1. Type a need in "What help do you need?" (e.g., "passport", "raket", "barko", "embahada", "pagsasaka"). Taglish synonyms expand the search; ✨ Ask uses Workers AI for keywords if enabled.
2. Or browse carousels per category; "See more" opens the full row; "See full list" cards redirect to authoritative hubs (DFA, DOT, PEZA, SEC/DTI/BIR for businesses).
3. ☆ saves a card to My Saved.
4. "Request to add your website": name, URL, category, location, description, optional email, consent → stored as *pending*; admin reviews before anything is published.

New category counts (directory_more.json, Oct 29, 2026): Earn: Freelance 9, Surveys & micro-tasks 9 (incl. Swagbucks watch-to-earn with warning), Sell online 17, Content creation 5, Small gigs 4, Teach & tutor 3, Rider & delivery 2, Iwas scam 2; Events & things to do 22; Meetups & conferences 11; Promos, sales & discounts 11; Must-have apps 34; Embassies 5; Learning centers 2; Free language & online courses 6; Learn farming Free 9 / Paid-audit-free 3; Sports & fitness 15; Entertainment & tickets 13; Nature & wildlife 8. Directory total ≈ 568 cards.

### 4.5 Academy
Carousels of lessons and how-tos. Opening a guide shows: title (EN + Tagalog), as-of date, disclaimer, numbered checklist (tick boxes saved on your device), tip, related Directory cards, verified official links.
- **Paano Kumita Online** (14): Pagsisimula, Iwas scam, Survey/micro-task, Freelancing, Pagbebenta online, Affiliate, Content creation, Digital products, Pagtuturo online, POD & stock, Rider/delivery, Home-based food, Legal at buwis, Pag-manage ng kita. No income promises.
- **Life, eco & farming** (7): Pagtitipid (budget, 50/30/20, Meralco tips, MP2), Eco-friendly na pamumuhay, Tamang pagtatapon ng basura (RA 9003), Paghahanda sa sakuna (go-bag, family plan, typhoon/quake/flood/fire), Ano ang permaculture? (3 ethics, 12 Holmgren principles, zones/sectors), Hydroponics para sa baguhan (Kratky/DWC/NFT, pH/EC), Paano mag-plano ng urban farming.

### 4.6 Empower, Lounge, Briefing, Donate
- **Petitions**: create, sign/unsign, update, report; letter generator.
- **Sumbong**: report local issues with photo (EXIF stripped), "me too", flags; status updates.
- **FOI helper**: drafts FOI requests; deadline helper (working days).
- **Project Watch**: PhilGEPS procurement facts.
- **Lounge (Usapang Bayan)**: topics, replies, votes, reports; rate-limited.
- **Daily Briefing**: choose topics/regions/time → n8n builds and sends via Resend, or web push. Unsubscribe link in every email.
- **Donate**: QR codes (GCash/Maya/bank) + PayPal.me from `PAYPAL_URL`.

### 4.7 Help & accessibility
Start tour on first visit (re-run from Help), FAQ, help chat, accessibility options, language switcher (10 languages; EN/TL complete).

## 5. Content and moderation policy
Verified links only; official sources first; brand cards are not endorsements; scams warnings in Earn; user content reviewed and reportable; no personal data beyond what each feature needs.

## 6. Roadmap to open beta (Jan 8, 2027)
Legal review of Privacy/Terms, moderators and admin page, paid tile plan (MapTiler or Stadia), native translation review, more event feeds with permission, Project Watch mobile table.

## Update: Healthy lifestyle at nutrisyon (Oct 29, 2026)
Academy course with 6 short modules and checklists (FNRI Pinggang Pinoy, WHO diet/activity/salt/food-safety guidance, NCMH 1553, PhilHealth YAKAP). Directory 'Health & wellness apps/sites' (12: DOH, FNRI, NNC, PhilHealth YAKAP, NCMH 1553, FDA, WHO x2, mWell, KonsultaMD, MyFitnessPal, Pinoy Fitness). Every page shows 'Not medical advice; consult a doctor'. Search synonyms: kalusugan, nutrisyon, diet, tulog, ehersisyo, lungkot, yakap.

## Update: UX batch 4 (Oct 29, 2026)
User flows added or changed:
- **Change theme:** top bar → 🌗 Auto / ☀️ Day / 🌙 Night. Auto switches at Manila sunrise/sunset. Works on every page.
- **Check today's weather:** Map → left panel "Weather today" (Manila by default; tap a region or use Location "Only" to switch). Official warnings: PAGASA link.
- **Focus on a place:** tick or "Only" a region/province/city in Filters → Location; the map zooms there. "Unselect all" or "Select all" → whole Philippines. Clicking a region on the map also zooms and outlines it.
- **Hide all points:** Filters → Map layers → untick "Show points".
- **Find a place:** type 2+ letters in the search box; pick from up to 8 suggestions (Esc closes).
- **Featured:** each page starts with a short strip of the most important things to check.
- **Academy:** filter by category chips, search ("ipon", "passport"), or ✨ Ask in Taglish.
- **Action Map:** legend uses "Community event"; the event source appears in the point's details.

# Civi

Community Intelligence Hub, the first product from **chainnes** (a solo tech studio in the Philippines).

Civi is a national hub for public information. It is meant to gather public updates from across the web — government sites, LGU pages, public advisories, news, and public social posts — and organize them by place and topic. The homepage is now the directory (`index.html`): a mobile-first dashboard of official and community sites, hotlines, and topics. The landing page and waitlist moved to `about.html`. Features on that page are marked **planned**. The product is not open yet. The Philippines drawing is a placeholder, labeled coverage rolling out. It is not a live map and not a list of included places.

Directory copy is in `index.html`, `dashboard.js`, and `data/directory.json`. Landing-page copy is in `about.html`. Waitlist messages and the Supabase placeholders are at the top of `app.js`.

## Run locally

From the repository root, so the service worker and manifest resolve:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 for the directory. Open http://localhost:8080/about.html for the landing page and waitlist. Use a local server. Opening `index.html` as a file will not register the service worker.

The waitlist form on `about.html` checks name, email, and role in the browser. Province / City is optional. Until you replace the Supabase placeholders, submit shows an error and does not send anything.

## Deploy to Cloudflare Pages

No build step. Framework preset: **None**.

1. Push this repository to the Git host connected to Cloudflare.
2. Workers & Pages → Create → Pages → Connect to Git.
3. Build command: leave empty.
4. Build output directory: `/` (the repository root).
5. Deploy.

Direct upload of the same files also works:

```bash
npx wrangler pages deploy . --project-name civi
```

The repository root also contains later-phase folders (`apps/`, `services/`, `edge/`, `docs/`). A root deploy publishes those paths too. To publish only the site, upload `index.html`, `about.html`, `styles.css`, `app.js`, `dashboard.js`, `data/`, `manifest.json`, `sw.js`, and `icons/`.

## Supabase values

1. Create a Supabase project.
2. Run `supabase/waitlist.sql` in the SQL editor. If the table already exists, that script adds a nullable `location` column and does not drop rows.
3. In `app.js`, replace the two constants at the top:

```js
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";
```

Use **Project URL** and the **anon** key (Project Settings → API). The form posts to `{SUPABASE_URL}/rest/v1/waitlist` with `name`, `email`, `role`, and `location` (`null` when Province / City is left blank).

Put only the anon key in `app.js`. It is visible in the browser. Row-level security allows insert and does not allow anon to select, update, or delete. Never put the service role key in this file. Read rows from the Supabase table editor.

`supabase/schema.sql` is a separate, later schema (profiles, posts, insights). The landing page does not use it. The waitlist table still has a nullable `barangay` column from the first schema. The form does not ask for it.

## What is placeholder

| Item | Where | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | `app.js` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | `app.js` | `your-anon-key` |
| Philippines map | Coverage section on `about.html` | A drawing of Luzon, Visayas, and Mindanao, not a map API and not an official boundary |
| App icons | `icons/` | Simple generated marks, not a finished logo |
| Features | Features section on `about.html` | Each one is labeled **planned** |

Public contact on the directory footer and the about page is `hello@chainnes.com`.

Do not add statistics, testimonials, partner logos, endorsements, or user counts unless they are real.

## Other folders

These are not required to run the landing page.

| Path | What it is |
| --- | --- |
| `apps/web` | Internal Next.js preview. Not the public site. |
| `services/ai` | Later FastAPI ingest service |
| `edge/` | Cloudflare Worker proxy for that later service |
| `n8n/` | Sample ingest workflow |
| `docs/CHAINNES.md` | Studio notes |
| `docs/PHASE1.md` | How the AI service talks to Supabase |

`docker compose up --build` still starts the AI service and n8n when `.env` is filled from `.env.example`. That stack is separate from this page.

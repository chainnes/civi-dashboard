# Civi Setup Guide for Chai (step by step)

Hi Chai! Follow these in order. Each step says where to click. Take your time, at kung may error, i-screenshot mo lang. 💪

**Before you start:** you need a GitHub account, a Supabase account, a Cloudflare account (with chainnes.com), a Resend account, and your n8n. Never paste keys into code, screenshots or chat.

## Step 1. Create the Supabase project
1. Go to https://supabase.com/dashboard and sign in (GitHub or email).
2. Click **New project**. Name: `civi`. Create a strong database password (save it in your password manager). Region: **Southeast Asia (Singapore)**. Click **Create**.
3. Wait 1–2 minutes until it says ready.

> Tip: Schema changes ship through Supabase's GitHub integration (working directory `.`, deploy to production when `main` updates). That is separate from Google login. "Unrecognized client_id" is an OAuth client mismatch, usually Google (Step 3), not the migration deploy.

## Step 2. Database schema (GitHub integration)
The schema lives only in `supabase/migrations/`. Supabase's GitHub integration is connected with working directory `.` and **deploy to production on merge to main** turned on. When a pull request merges to `main`, Supabase runs any new file in that folder. You do not paste these into the SQL editor for a normal deploy.

The first seven files are the old `sql/001` … `007` scripts, in the same order. They are safe on an empty database and safe if you already ran those scripts by hand:

1. `supabase/migrations/20261029105510_schema.sql`
2. `supabase/migrations/20261029105511_beta.sql`
3. `supabase/migrations/20261029105513_seed_lounge.sql` (28 Lounge starter topics; a second run updates the text and does not add duplicates)
4. `supabase/migrations/20261029105515_feedback_referral.sql`
5. `supabase/migrations/20261029105517_empower.sql`
6. `supabase/migrations/20261029105518_briefing.sql`
7. `supabase/migrations/20261029105520_ux.sql`

`sql/001_schema.sql` … `sql/007_ux.sql` only point at those files. Do not edit them and do not paste them. Pasting one stops with an error that names the real file.

After the merge that adds these files, open **Table Editor**. You should see tables like `profiles`, `petitions`, `favorites`, `directory_requests`.

**Every later schema change:**
1. On your computer, in the Civi folder, run `supabase migration new short_name` (install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) once if you do not have it).
2. Write the SQL in the new file it creates under `supabase/migrations/`. Use `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, and `ON CONFLICT DO NOTHING` for seed rows.
3. Commit, open a pull request, merge to `main`.
4. Supabase applies only that new file. Do not change a migration that already ran on production. Add another file instead.

Never put the `service_role` key, or any other secret, in a migration or in `supabase/config.toml`. n8n is the only place for the service role key.

> Tip: kapag nag-error ang deploy, huwag gumawa ng bagong file na may parehong pangalan. I-screenshot ang migration name at ang error.

## Step 3. Google login (OAuth)
1. Go to https://console.cloud.google.com → create a project "Civi" → **APIs & Services → OAuth consent screen** (External; app name Civi; your email; add `chainnes.com` as authorized domain).
2. **Credentials → Create credentials → OAuth client ID → Web application.** Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (copy it from Supabase **Authentication → Providers → Google**).
3. Paste the Client ID and Client Secret into Supabase **Authentication → Providers → Google**, enable, Save.
4. Supabase **Authentication → URL Configuration**: Site URL = `https://civi.chainnes.com` (or your pages.dev URL). Add redirect URL `https://civi.chainnes.com/auth-callback.html`.
5. Copy **Project URL** and **anon public key** from **Settings → API**. Keep the `service_role` key secret: n8n lang ang gagamit nito.

## Step 4. privacy@ email alias
In your domain email (or Cloudflare **Email Routing**), create `privacy@chainnes.com` forwarding to your Gmail. This is shown in the Privacy page for data requests (RA 10173).

## Step 5. Donate: QR images and PayPal.me
1. Save your GCash/Maya/bank QR images into `assets/donate/` using the file names in `assets/donate/README`.
2. Your PayPal.me link (e.g. `https://paypal.me/yourname`) goes in Cloudflare as env var `PAYPAL_URL` (Step 8). Not in the code.

## Step 6. Resend domain verification
1. https://resend.com → **Domains → Add domain** → `mail.chainnes.com`.
2. Resend shows SPF (TXT/MX) and DKIM records. In Cloudflare → chainnes.com → **DNS → Add record**, add each one exactly. Proxy: off (DNS only).
3. Click **Verify** in Resend; it can take minutes to hours.
4. **API Keys → Create** (sending access). Copy it once, then put it only in n8n (Step 7).

## Step 7. n8n credentials and imports
1. In n8n: **Credentials → New**: 
   - "Supabase Civi" = HTTP Header Auth with `apikey: <service_role>` and `Authorization: Bearer <service_role>` (or the Supabase credential type), URL = your Project URL.
   - "Resend" = HTTP Header Auth `Authorization: Bearer re_…`.
2. **Workflows → Import from file**: `n8n/civi-ingest-workflow.json`, `n8n/civi-law-ingest-workflow.json`, `n8n/civi-briefing-workflow.json`. Open each, pick your credentials in the red nodes, Save, then **Activate**.
3. Test the briefing first with only your own account opted in.
> Web Push needs self-hosted n8n (not n8n Cloud). Optional.

## Step 8. Fix the git author, then push to GitHub
The commits were made as "Civi Bot". Make yourself the author of **all** of them. In Terminal:
```
cd path/to/civi-mvp
git config user.name "Charlene Cordero"
git config user.email "charlenecordero28@gmail.com"
git rebase -r --root --exec "git commit --amend --no-edit --reset-author"
git log --format='%h %an %ae' | head     # check: all should show your name
```
(For just the latest commit, `git commit --amend --reset-author --no-edit` is enough, but there are several commits now, kaya gamitin ang rebase command sa itaas.)

Then create a **private** repo on GitHub (no README), and:
```
git remote add origin https://github.com/<you>/civi.git
git push -u origin main
```
If you already pushed before the author fix: `git push --force-with-lease` (only on your own repo).

## Step 9. Cloudflare Pages
1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → choose the repo.
2. Framework preset: **None**. Build command: *(empty)*. Output directory: `/`. Deploy.
3. **Settings → Variables and Secrets** (Production): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VOTER_SALT` (any long random text), `PAYPAL_URL`; optional `DONATE_URL`, `KOFI_URL`, `VAPID_PUBLIC_KEY`.
4. **Settings → Bindings → Add → Workers AI**, variable name `AI`.
5. **Custom domains** → `civi.chainnes.com`.
6. **Deployments → Retry/Redeploy** so the variables apply.

## Step 10. Hard refresh
Open the site and press **Cmd + Shift + R** (Mac) or **Ctrl + Shift + R** (Windows). On phone: close the tab/app and reopen. The service worker cache name changes every release (`civi-beta-7` now).

## Step 11. Review directory requests and reports
Supabase → **Table Editor**:
- `directory_requests`: check the site is real, legal and useful (open it!). Set `status` to `approved` or `rejected`. Approved ones: add to `scripts/directory_more.py` (or the right data file), run the script, commit, push.
- `reports_issues`, `report_flags`, `lounge_reports`, `petition_reports`, `shared_link_reports`, `event_flags`: review flagged content; hide/delete abusive items.
- Delete request contact emails 90 days after review (privacy promise).

## Step 12. Refresh data with the scripts
Install Python 3, then in the folder:
```
python3 scripts/fetch_data.py && python3 scripts/fetch_hub.py   # news, KPIs, hazards
python3 scripts/fetch_events.py                                   # Luma events
python3 scripts/directory_more.py                                 # re-check directory links
python3 scripts/civic_transport.py                                # transport links
```
Update `data/kpis_extra.json` by hand when DBM, BTr or PNP publish new numbers (always with source + date). Then bump `civi-beta-N` in `sw.js`, `git commit -am "Data refresh"`, `git push`.

## Pre-open-beta checklist (target Jan 8, 2027)
- [ ] Lawyer review of Privacy Policy, Terms, Disclaimer (RA 10173, NPC registration if needed)
- [ ] Recruit 2–3 moderators; agree on rules and response times
- [ ] Map tiles: sign up for **MapTiler** or **Stadia Maps**, add the key via a server proxy or domain-restricted key, replace OSM tiles in `js/hub.js`
- [ ] Native speakers review Cebuano, Ilocano, Hiligaynon, Waray, Kapampangan, Bikol, Pangasinan, etc.
- [ ] Test on cheap Android phones and slow data
- [ ] Backups of Supabase enabled; Resend domain verified; n8n workflows active
- [ ] Re-run all data scripts and link checks
- [ ] Avoid launching big releases during Mercury retrograde (Feb 9–Mar 3), per Wit 😄

## Troubleshooting
| Problem | Fix |
|---|---|
| "Unrecognized client_id" | OAuth client mismatch, usually Google (Step 3). Schema deploys through the GitHub integration (Step 2), not through that client id. |
| Yellow "Demo mode" | `SUPABASE_URL`/`SUPABASE_ANON_KEY` missing or not redeployed. |
| Google login loops/does nothing | Check redirect URLs in Google Cloud and Supabase (Step 3). |
| ✨ Ask says "keyword match" | `AI` binding missing; redeploy after adding. |
| Emails not sending | Resend domain not verified, wrong key in n8n, or user not opted in. |
| Old version shows | Hard refresh; check `sw.js` cache name was bumped. |
| git push rejected | `git pull --rebase` first, or `--force-with-lease` after the author fix on your own repo. |
| SQL error "already exists" | These migrations are written to be re-run. If a merge still errors, screenshot the migration name and the message. Do not rename a file that already ran. |
| Map tiles slow/blocked | OSM light-use limit: move to MapTiler/Stadia. |

## Update: AI chatbot and ✨ Ask (Oct 29, 2026)
The help chatbot, Directory ✨ Ask and Academy ✨ Ask need **only** the Cloudflare **Workers AI binding named `AI`**. No OpenAI or other API key, and nothing to paste into the code.
1. Cloudflare dashboard → **Workers & Pages** → your Civi project → **Settings** → **Bindings**.
2. **Add** → **Workers AI** → Variable name: `AI` (capital letters) → **Save**.
3. **Deployments** → **Retry deployment** (bindings apply on the next deploy).
4. Test: Academy → type "paano mag-ipon" → ✨ Ask. You should see a green "AI: …" chip. If you see "keyword match", the binding isn't active yet (still works, just simpler).
> Tip: Workers AI has a free daily allowance on Cloudflare; check Workers AI usage in the dashboard.

Weather on the map uses Open-Meteo, which needs no key. If Civi becomes a paid/commercial service, review Open-Meteo's terms (they have a commercial plan).

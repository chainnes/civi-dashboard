# Civi Setup Guide for Chai (step by step)

Hi Chai! Follow these in order. Each step says where to click. Take your time, at kung may error, i-screenshot mo lang. 💪

**Before you start:** you need a GitHub account, a Supabase account, a Cloudflare account (with chainnes.com), a Resend account, and your n8n. Never paste keys into code, screenshots or chat.

## Step 1. Create the Supabase project
1. Go to https://supabase.com/dashboard and sign in (GitHub or email).
2. Click **New project**. Name: `civi`. Create a strong database password (save it in your password manager). Region: **Southeast Asia (Singapore)**. Click **Create**.
3. Wait 1–2 minutes until it says ready.

> Tip: "Unrecognized client_id" error? That comes from trying to connect Supabase through an outside app or integration. Hindi mo kailangan iyon. Always use the Supabase **dashboard** directly.

## Step 2. Run the SQL files 001 to 007
1. In your project, open **SQL Editor** → **New query**.
2. Open `sql/001_schema.sql` from the Civi folder in a text editor, copy everything, paste, click **Run**. You should see "Success".
3. Repeat, one file at a time, in this exact order: `002_beta.sql`, `003_seed_lounge.sql`, `004_feedback_referral.sql`, `005_empower.sql`, `006_briefing.sql`, `007_ux.sql`.
4. Check **Table Editor**: you should see tables like `profiles`, `petitions`, `favorites`, `directory_requests`.

> Tip: kapag nag-error ang isang file, huwag nang ituloy ang susunod. I-screenshot ang error.

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
| "Unrecognized client_id" when connecting Supabase | You don't connect Supabase through outside apps. Use the dashboard (Step 1–3). |
| Yellow "Demo mode" | `SUPABASE_URL`/`SUPABASE_ANON_KEY` missing or not redeployed. |
| Google login loops/does nothing | Check redirect URLs in Google Cloud and Supabase (Step 3). |
| ✨ Ask says "keyword match" | `AI` binding missing; redeploy after adding. |
| Emails not sending | Resend domain not verified, wrong key in n8n, or user not opted in. |
| Old version shows | Hard refresh; check `sw.js` cache name was bumped. |
| git push rejected | `git pull --rebase` first, or `--force-with-lease` after the author fix on your own repo. |
| SQL error "already exists" | Safe to ignore for `if not exists`; otherwise you ran a file twice out of order. Screenshot it. |
| Map tiles slow/blocked | OSM light-use limit: move to MapTiler/Stadia. |

## Update: AI chatbot and ✨ Ask (Oct 29, 2026)
The help chatbot, Directory ✨ Ask and Academy ✨ Ask need **only** the Cloudflare **Workers AI binding named `AI`**. No OpenAI or other API key, and nothing to paste into the code.
1. Cloudflare dashboard → **Workers & Pages** → your Civi project → **Settings** → **Bindings**.
2. **Add** → **Workers AI** → Variable name: `AI` (capital letters) → **Save**.
3. **Deployments** → **Retry deployment** (bindings apply on the next deploy).
4. Test: Academy → type "paano mag-ipon" → ✨ Ask. You should see a green "AI: …" chip. If you see "keyword match", the binding isn't active yet (still works, just simpler).
> Tip: Workers AI has a free daily allowance on Cloudflare; check Workers AI usage in the dashboard.

Weather on the map uses Open-Meteo, which needs no key. If Civi becomes a paid/commercial service, review Open-Meteo's terms (they have a commercial plan).

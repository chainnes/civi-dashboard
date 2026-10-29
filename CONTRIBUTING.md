# Contributing to Civi

Salamat! Civi is open source (MIT) so anyone can use and adapt it.

## Setup
1. Fork and clone. Copy `.dev.vars.example` (or `.env.example`) to `.dev.vars` and fill in your own values.
2. Run `npx wrangler pages dev .` and open the local URL.

## Rules
- **No secrets in commits or frontend code.** Never commit `.env`, `.dev.vars`, `backups/`, or local login files. Keys live only in Cloudflare env vars.
- **Facts must be sourced.** Data in `data/*.json` needs an official source link and an `as_of` date. Verify links before adding; mark sites that block bots as `bot-protected`. Don't name current officeholders unless verified from an official site.
- **Privacy (RA 10173).** Collect the minimum; keep progress in localStorage where possible. No scraping of IG/FB/TikTok; don't bypass bot blocks.
- **Email.** Civi doesn't send email except the opt-in digest.
- **UI.** Keep animations light and respect `prefers-reduced-motion`; check day and night contrast (WCAG AA).
- **Service worker.** When you add/change cached files, bump the cache version in `sw.js`.

## Pull requests
Small, focused PRs with a short description and screenshots (no keys visible). A maintainer reviews every PR before merge.

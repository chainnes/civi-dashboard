# Chainnes studio context (Civi)

A `CHAINNES` source file was not present in this repository or nearby studio folders. This note captures the **studio-level intent** used to structure Civi until the canonical Chainnes guidelines are checked in.

## Studio

**Chainnes** is the parent studio. Products are modular systems: data in, intelligence out, automation as the connective tissue. Branding is precise, not loud — civic infrastructure for communities that want to understand themselves.

## Product

**Civi** is a national community intelligence hub for the Philippines. It gathers public information from across the internet — government sites, LGU pages, public advisories, news, and public social posts — and organizes it by location and topic so anyone can see what is happening in their area.

The public site is the static landing page at the repository root (`index.html`), with a waitlist (`supabase/waitlist.sql`). Features on that page are planned, not live. Coverage is described as rolling out across Luzon, Visayas, and Mindanao. That map is a placeholder drawing.

Later layers in this repo (ingest, agents, edge, the internal web preview) stay replaceable. They are not the public site.

## Architecture principles

1. **Modular surfaces** — web (Pages), edge routing (Workers), AI/data plane (Python), persistence (Supabase), orchestration (n8n) stay replaceable.
2. **Least privilege** — browsers use the anon key and RLS; agents and n8n use service role or signed webhooks, never the anon key for writes that bypass policy.
3. **Ingest is dumb; intelligence is a job** — HTTP ingest persists raw posts quickly; analysis is asynchronous.
4. **Edge is a door, not a brain** — Cloudflare routes and hardens; heavy work stays in the AI service.
5. **Aesthetic** — solarpunk civic UI: canopy greens, warm gold, dark loam surfaces, one muted neon accent. Cyberpunk as restraint (grids, scanlines), not chrome overload.

## Naming

| Layer | Name |
| --- | --- |
| Studio | Chainnes |
| Product | Civi |
| AI service | `civi-ai` |
| Edge worker | `civi-edge` |
| Web app | `civi-web` |

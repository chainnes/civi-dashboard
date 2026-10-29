# Phase 1: connect Civi AI to Supabase

The public landing page and its waitlist are separate: `index.html` and `supabase/waitlist.sql`. This note is the later AI pipeline. Use it after `supabase/schema.sql` is applied and `.env` is filled from `.env.example`. The landing page must not receive the service role key.

## 1. Create (or start) the Supabase project

**Hosted:** Dashboard → Project Settings → API. Copy Project URL, `anon` key, and `service_role` key.

**Local:** `npx supabase start`, then copy the printed URL and keys. Apply the schema with the SQL editor or `psql`.

Never put `service_role` in the Next.js `NEXT_PUBLIC_*` variables.

## 2. Apply the schema

Run `supabase/schema.sql` against the project. Confirm tables `profiles`, `community_posts`, and `insights` exist and RLS is enabled.

## 3. Choose a client in Python

| Approach | When |
| --- | --- |
| **supabase-py** (this repo) | CRUD on tables, Auth-aware REST, matches RLS/service-role model |
| **asyncpg / SQLAlchemy** | Bulk jobs, `listen/notify`, or queries PostgREST cannot express |

Phase 1 uses supabase-py with the **service role** so ingest and agents can insert posts and insights regardless of RLS. The key still must stay inside the AI container, not the browser.

## 4. Wire environment

In `.env` (loaded by Docker and pydantic-settings):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — AI writes
- `SUPABASE_ANON_KEY` — optional; only if the service must impersonate a user
- `INGEST_WEBHOOK_SECRET` — n8n → `x-civi-secret`

`app/db.py` builds a singleton `create_client(url, service_role_key)`.

## 5. RLS implications

- Browser + anon key: subject to policies (read posts/insights; members insert own submissions).
- Service role: **bypasses RLS**. Treat it like a database root password.
- n8n should not hold the service role if it can call `/v1/ingest` with the webhook secret instead.

## 6. Runtime path

1. n8n (or a forum connector) POSTs JSON to `http://ai:8000/v1/ingest` (from Compose) or `http://localhost:8000/v1/ingest` (host).
2. FastAPI validates `source`, `body`, optional `external_id`.
3. Insert `community_posts`.
4. `insight_agent.analyze_post` runs (heuristic now; later an LLM).
5. Insert `insights` with `status=complete` and mark `processed_at`.
6. Dashboard `GET /v1/insights` and `GET /v1/metrics`.

Later: insert with `status=pending`, enqueue, worker updates `running` → `complete`/`failed` and stores `error`.

## 7. Errors

- Missing URL/key → HTTP 503 from the AI service.
- Unique `(source, external_id)` conflict → return 409 in a follow-up; handle duplicates in n8n.
- LLM failures → write `insights.status=failed` and `error`; do not delete the post.

## 8. Verify

```bash
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/v1/ingest \
  -H 'content-type: application/json' \
  -H "x-civi-secret: $INGEST_WEBHOOK_SECRET" \
  -d '{"source":"n8n","channel":"pilot","body":"Great meetup downtown, proud of this community."}'
curl -s http://localhost:8000/v1/insights
```

Confirm rows in the Supabase Table Editor.

## 9. Next (not Phase 1)

- Swap the heuristic for a real agent (tool use, citations).
- Outbox / queue so ingest returns before analysis.
- Cloudflare Worker env `AI_ORIGIN` pointed at the deployed FastAPI URL.

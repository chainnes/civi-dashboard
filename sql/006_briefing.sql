-- Civi 006: Daily Briefing (in-app inbox, opt-in email digest, opt-in Web Push). Run AFTER 001-005.
create extension if not exists pgcrypto;
-- Privacy (RA 10173): default = in-app only. Email/push need explicit consent, recorded with timestamp + policy version.
-- Briefing items are COPIES of already-sourced Civi rows (news_items, law_refs, petition_updates, user_events) and always keep the source link.
-- RLS on every table. The service_role key (n8n only) bypasses RLS to build digests and send email; the browser never sees it.

create table if not exists briefing_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  topics text[] not null default array['governance','disaster','laws']::text[]
    check (topics <@ array['governance','disaster','economy','health','education','environment','security','events','laws','scholarships','petitions']::text[]),
  place_psgc text check (place_psgc ~ '^[0-9]{9,10}$'), place_name text check (length(place_name) <= 80),
  areas text[] not null default '{}' check (cardinality(areas) <= 6),   -- e.g. {'pampanga','central luzon','luzon'} for matching
  in_app boolean not null default true,
  email_on boolean not null default false, email_freq text not null default 'daily' check (email_freq in ('daily','weekly')),
  email_hour smallint not null default 7 check (email_hour between 0 and 23),          -- hour in Asia/Manila (PHT)
  email_dow smallint not null default 1 check (email_dow between 0 and 6),             -- weekly: 0=Sun (PHT)
  email_consent_at timestamptz, push_on boolean not null default false, push_consent_at timestamptz,
  consent_version text, last_email_at timestamptz, updated_at timestamptz default now(),
  constraint email_needs_consent check (not email_on or email_consent_at is not null),
  constraint push_needs_consent check (not push_on or push_consent_at is not null));

create table if not exists briefing_items (id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  day date not null default (now() at time zone 'Asia/Manila')::date,
  kind text not null check (kind in ('news','law','petition_update','event','scholarship')),
  ref_id text not null, topic text, title text not null check (length(title) <= 300),
  source text not null, url text not null check (url ~ '^https://'),
  summary text check (length(summary) <= 600), summary_is_ai boolean not null default false,
  rank real default 0, read_at timestamptz, created_at timestamptz default now(),
  unique (user_id, kind, ref_id));
create index if not exists briefing_items_user_day on briefing_items (user_id, day desc, rank desc);

create table if not exists push_subscriptions (id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'), p256dh text not null, auth text not null,
  ua text check (length(ua) <= 200), created_at timestamptz default now());

create table if not exists email_unsubscribe_tokens (token text primary key check (length(token) >= 32),
  user_id uuid not null references auth.users on delete cascade, created_at timestamptz default now(), used_at timestamptz);

create table if not exists briefing_send_log (id bigserial primary key, user_id uuid references auth.users on delete cascade,
  channel text check (channel in ('email','push')), items int, status text, provider_id text, at timestamptz default now());

alter table briefing_prefs enable row level security;
alter table briefing_items enable row level security;
alter table push_subscriptions enable row level security;
alter table email_unsubscribe_tokens enable row level security;
alter table briefing_send_log enable row level security;

-- Users manage only their own rows.
drop policy if exists bp_own on briefing_prefs;
create policy bp_own on briefing_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bi_read on briefing_items;
create policy bi_read on briefing_items for select to authenticated using (user_id = auth.uid());
drop policy if exists bi_mark on briefing_items;
create policy bi_mark on briefing_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bi_del on briefing_items;
create policy bi_del on briefing_items for delete to authenticated using (user_id = auth.uid());
drop policy if exists ps_own on push_subscriptions;
create policy ps_own on push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bsl_read on briefing_send_log;
create policy bsl_read on briefing_send_log for select to authenticated using (user_id = auth.uid());
-- email_unsubscribe_tokens: NO policies for anon/authenticated = no direct access. Only the RPC below and service_role.
revoke all on email_unsubscribe_tokens from anon, authenticated;
revoke update on briefing_items from authenticated; grant update (read_at) on briefing_items to authenticated;

-- One-click unsubscribe (no login). Turns off email only; keeps in-app. Works with the token from the email footer.
create or replace function briefing_unsubscribe(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid; begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  select user_id into u from email_unsubscribe_tokens where token = p_token; if u is null then return false; end if;
  update briefing_prefs set email_on = false, updated_at = now() where user_id = u;
  update email_unsubscribe_tokens set used_at = coalesce(used_at, now()) where token = p_token; return true; end $$;
revoke all on function briefing_unsubscribe(text) from public; grant execute on function briefing_unsubscribe(text) to anon, authenticated;

-- Rate-limited save of prefs; consent timestamps are set server-side from the explicit checkbox.
create or replace function briefing_save_prefs(p jsonb) returns briefing_prefs
language plpgsql security invoker set search_path = public as $$
declare r briefing_prefs; em boolean := coalesce((p->>'email_on')::boolean,false); pu boolean := coalesce((p->>'push_on')::boolean,false);
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  if em and not coalesce((p->>'email_consent')::boolean,false) then raise exception 'email_consent_required'; end if;
  if pu and not coalesce((p->>'push_consent')::boolean,false) then raise exception 'push_consent_required'; end if;
  insert into briefing_prefs as b (user_id, topics, place_psgc, place_name, areas, in_app, email_on, email_freq, email_hour, email_dow,
    email_consent_at, push_on, push_consent_at, consent_version, updated_at)
  values (auth.uid(), coalesce(array(select jsonb_array_elements_text(p->'topics')), '{}'), nullif(p->>'place_psgc',''), nullif(p->>'place_name',''),
    coalesce(array(select lower(jsonb_array_elements_text(p->'areas'))), '{}'), coalesce((p->>'in_app')::boolean,true), em,
    coalesce(p->>'email_freq','daily'), coalesce((p->>'email_hour')::smallint,7), coalesce((p->>'email_dow')::smallint,1),
    case when em then now() end, pu, case when pu then now() end, p->>'consent_version', now())
  on conflict (user_id) do update set topics = excluded.topics, place_psgc = excluded.place_psgc, place_name = excluded.place_name, areas = excluded.areas,
    in_app = excluded.in_app, email_on = excluded.email_on, email_freq = excluded.email_freq, email_hour = excluded.email_hour, email_dow = excluded.email_dow,
    email_consent_at = case when excluded.email_on then coalesce(b.email_consent_at, now()) end,
    push_on = excluded.push_on, push_consent_at = case when excluded.push_on then coalesce(b.push_consent_at, now()) end,
    consent_version = excluded.consent_version, updated_at = now()
  returning * into r;
  if not pu then delete from push_subscriptions where user_id = auth.uid(); end if;  -- turning push off removes stored endpoints
  return r; end $$;
grant execute on function briefing_save_prefs(jsonb) to authenticated;

-- Topic key -> categories used by news_items.topics (scripts/fetch_data.py TOPICS).
create or replace function briefing_news_topics(k text) returns text[] language sql immutable as $$
  select case k when 'governance' then array['Governance'] when 'disaster' then array['Disaster & Weather'] when 'economy' then array['Economy & Jobs']
    when 'health' then array['Health'] when 'education' then array['Education'] when 'environment' then array['Environment']
    when 'security' then array['Security & Sea'] else array[]::text[] end $$;

-- Builds today's items for one user from EXISTING sourced rows only. Called by n8n (service_role). Ranking: topic match + local match + recency.
create or replace function briefing_build(p_user uuid, p_max int default 10) returns int
language plpgsql security definer set search_path = public as $$
declare pr briefing_prefs; n int := 0; d date := (now() at time zone 'Asia/Manila')::date; tk text; begin
  select * into pr from briefing_prefs where user_id = p_user; if pr is null then return 0; end if;
  foreach tk in array pr.topics loop
    if briefing_news_topics(tk) <> '{}' then
      insert into briefing_items (user_id, day, kind, ref_id, topic, title, source, url, summary, summary_is_ai, rank)
      select p_user, d, 'news', ni.id::text, tk, ni.title, ni.source, ni.link,
        coalesce(ni.ai_summary, ni.summary), ni.ai_summary is not null,
        1 + case when exists (select 1 from unnest(ni.regions) r where lower(r) = any(pr.areas)) or exists (select 1 from unnest(pr.areas) a where lower(ni.title) like '%'||a||'%') then 2 else 0 end
          + power(0.5, extract(epoch from now() - coalesce(ni.published_at, ni.fetched_at)) / 3600 / 24)
      from news_items ni where ni.link ~ '^https://' and coalesce(ni.published_at, ni.fetched_at) > now() - interval '36 hours'
        and ni.topics && briefing_news_topics(tk)
      order by 11 desc limit 4 on conflict do nothing;
    end if;
  end loop;
  if 'laws' = any(pr.topics) then
    insert into briefing_items (user_id, day, kind, ref_id, topic, title, source, url, rank)
    select p_user, d, 'law', lr.id::text, 'laws', coalesce(lr.number || ': ', '') || lr.title, lr.source, lr.url, 1.5
    from law_refs lr where lr.url ~ '^https://' and lr.fetched_at > now() - interval '8 days' order by lr.fetched_at desc limit 3 on conflict do nothing;
  end if;
  if 'petitions' = any(pr.topics) then   -- only petitions this user signed
    insert into briefing_items (user_id, day, kind, ref_id, topic, title, source, url, summary, rank)
    select p_user, d, 'petition_update', pu.id::text, 'petitions', 'Update: ' || p.title, 'Civi Petitions', 'https://' || current_setting('app.civi_host', true) || '/#/petitions?id=' || p.id, left(pu.body, 300), 3
    from petition_updates pu join petitions p on p.id = pu.petition_id join petition_signatures s on s.petition_id = p.id and s.user_id = p_user
    where pu.created_at > now() - interval '8 days' and not p.hidden and current_setting('app.civi_host', true) is not null on conflict do nothing;
  end if;
  if 'events' = any(pr.topics) then
    insert into briefing_items (user_id, day, kind, ref_id, topic, title, source, url, rank)
    select p_user, d, 'event', e.id::text, 'events', e.title, 'Civi community event', e.url, 2
    from user_events_public e where e.starts_at between now() and now() + interval '14 days' and e.url ~ '^https://' limit 3 on conflict do nothing;
  end if;
  get diagnostics n = row_count;
  -- Keep only the top p_max for today.
  delete from briefing_items where user_id = p_user and day = d and id not in
    (select id from briefing_items where user_id = p_user and day = d order by rank desc limit p_max);
  delete from briefing_items where user_id = p_user and day < d - 30;  -- retention: 30 days
  return (select count(*) from briefing_items where user_id = p_user and day = d); end $$;
revoke all on function briefing_build(uuid, int) from public, anon, authenticated;

-- Email recipients due now (PHT): opt-in only, consent recorded, not sent in the last 20 h (daily) / 6 days (weekly).
create or replace view briefing_email_due with (security_invoker = true) as
select b.user_id, u.email, b.email_freq, b.place_name from briefing_prefs b join auth.users u on u.id = b.user_id
where b.email_on and b.email_consent_at is not null and u.email is not null
  and extract(hour from now() at time zone 'Asia/Manila') = b.email_hour
  and (b.email_freq = 'daily' and (b.last_email_at is null or b.last_email_at < now() - interval '20 hours')
    or b.email_freq = 'weekly' and extract(dow from now() at time zone 'Asia/Manila') = b.email_dow and (b.last_email_at is null or b.last_email_at < now() - interval '6 days'));
revoke all on briefing_email_due from anon, authenticated;
-- Set the public host once (used for petition links):  alter database postgres set app.civi_host = 'your-civi-domain';

-- ===== Helpers for the n8n workflow (service_role only) =====
-- Builds in-app briefings for every user with prefs (daily, ~06:00 PHT).
create or replace function briefing_build_all() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; begin for r in select user_id from briefing_prefs where in_app loop perform briefing_build(r.user_id); n := n + 1; end loop; return n; end $$;
-- One call per due email user: builds items, mints a fresh unsubscribe token, returns {user_id,email,scope,freq,items,token}.
create or replace function briefing_digest(p_user uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare tok text := encode(gen_random_bytes(24), 'hex'); d date := (now() at time zone 'Asia/Manila')::date; res jsonb; begin
  if not exists (select 1 from briefing_prefs where user_id = p_user and email_on and email_consent_at is not null) then return null; end if;
  perform briefing_build(p_user);
  insert into email_unsubscribe_tokens (token, user_id) values (tok, p_user);
  select jsonb_build_object('user_id', p_user, 'email', u.email, 'freq', b.email_freq, 'scope', coalesce(b.place_name || ' + national', 'Philippines'), 'token', tok,
    'items', coalesce((select jsonb_agg(jsonb_build_object('title', i.title, 'source', i.source, 'url', i.url, 'summary', i.summary, 'summary_is_ai', i.summary_is_ai) order by i.rank desc)
      from (select * from briefing_items where user_id = p_user and day >= case when b.email_freq = 'weekly' then d - 6 else d end order by rank desc limit 10) i), '[]'::jsonb))
  into res from briefing_prefs b join auth.users u on u.id = b.user_id where b.user_id = p_user;
  return res; end $$;
create or replace function briefing_mark_sent(p_user uuid, p_channel text, p_items int, p_status text, p_provider_id text) returns void
language sql security definer set search_path = public as $$
  update briefing_prefs set last_email_at = now() where user_id = p_user and p_channel = 'email' and p_status = 'sent';
  insert into briefing_send_log (user_id, channel, items, status, provider_id) values (p_user, p_channel, p_items, p_status, left(p_provider_id, 80)); $$;
-- Push targets: opt-in users with a stored subscription and at least one unread item today.
create or replace view briefing_push_targets with (security_invoker = true) as
select s.user_id, s.endpoint, s.p256dh, s.auth, count(i.id) as n, (array_agg(i.title order by i.rank desc))[1] as top_title
from push_subscriptions s join briefing_prefs b on b.user_id = s.user_id and b.push_on and b.push_consent_at is not null
join briefing_items i on i.user_id = s.user_id and i.day = (now() at time zone 'Asia/Manila')::date and i.read_at is null group by 1,2,3,4;
revoke all on briefing_push_targets from anon, authenticated;
revoke all on function briefing_build_all() from public, anon, authenticated;
revoke all on function briefing_digest(uuid) from public, anon, authenticated;
revoke all on function briefing_mark_sent(uuid, text, int, text, text) from public, anon, authenticated;
grant execute on function briefing_build_all(), briefing_digest(uuid), briefing_mark_sent(uuid, text, int, text, text), briefing_build(uuid, int) to service_role;
-- gen_random_bytes needs pgcrypto (enabled by default on Supabase): create extension if not exists pgcrypto;

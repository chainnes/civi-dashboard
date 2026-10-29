-- Civi beta: accounts (Supabase Auth), Lounge, shared links, premium waitlist. Run AFTER 001_schema.sql.
-- All writes go through security-definer RPCs or RLS policies tied to auth.uid(). anon can only read public views.
create table if not exists profiles (id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'), display_name text, consent_at timestamptz, consent_version text,
  created_at timestamptz default now());
alter table profiles enable row level security;
drop policy if exists "own profile read" on profiles; create policy "own profile read" on profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on profiles; create policy "own profile update" on profiles for update using (auth.uid() = id);
-- auto-create profile on signup (handle from signup metadata, or derived for Google users)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare h text := lower(coalesce(new.raw_user_meta_data->>'handle', regexp_replace(split_part(new.email,'@',1),'[^a-z0-9_]','','gi')));
begin
  h := left(h, 16); if length(h) < 3 then h := 'user'; end if;
  while exists(select 1 from profiles where handle = h) loop h := left(h,14) || floor(random()*100)::int; end loop;
  insert into profiles(id, handle, consent_at, consent_version) values (new.id, h, (new.raw_user_meta_data->>'consent_at')::timestamptz, new.raw_user_meta_data->>'consent_version');
  return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table if not exists rate_events (user_id uuid, kind text, at timestamptz default now());
create index if not exists rate_events_idx on rate_events(user_id, kind, at);
alter table rate_events enable row level security; -- no policies: only RPCs touch it
create or replace function rate_ok(k text, max_n int, win interval) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (select count(*) from rate_events where user_id = auth.uid() and kind = k and at > now() - win) >= max_n then raise exception 'rate limited' using errcode = 'P0001'; end if;
  insert into rate_events(user_id, kind) values (auth.uid(), k);
  delete from rate_events where at < now() - interval '30 days';
end $$;

-- Lounge
create table if not exists lounge_topics (id text primary key default gen_random_uuid()::text, title text not null check (length(title) <= 160),
  cat text not null, body text, sources jsonb default '[]', is_seed boolean default false, user_id uuid references auth.users on delete set null,
  hidden boolean default false, created_at timestamptz default now());
create table if not exists lounge_replies (id bigserial primary key, topic_id text references lounge_topics on delete cascade, body text not null check (length(body) <= 1000),
  user_id uuid references auth.users on delete set null, hidden boolean default false, created_at timestamptz default now());
create table if not exists lounge_votes (topic_id text references lounge_topics on delete cascade, user_id uuid references auth.users on delete cascade, at timestamptz default now(), primary key (topic_id, user_id));
create table if not exists lounge_reports (topic_id text references lounge_topics on delete cascade, user_id uuid references auth.users on delete cascade, reason text, at timestamptz default now(), primary key (topic_id, user_id));
alter table lounge_topics enable row level security; alter table lounge_replies enable row level security;
alter table lounge_votes enable row level security; alter table lounge_reports enable row level security;
drop policy if exists "own votes" on lounge_votes; create policy "own votes" on lounge_votes for select using (auth.uid() = user_id);
-- Ranking: same spirit as 001 (no approval). score = (ln(1+votes)+1) * topic_weight * recency(half-life 7 days; seeds don't decay)
create or replace view lounge_topics_ranked with (security_invoker = false) as
  select t.id, t.title, t.cat, t.body, t.sources, t.is_seed, p.handle, t.created_at, coalesce(v.n,0) as votes,
    (ln(1+coalesce(v.n,0))+1) * case t.cat when 'Disaster & Weather' then 1.5 when 'Health' then 1.4 when 'Security' then 1.3 when 'Laws & Policy' then 1.2
      when 'Environment' then 1.2 when 'Government' then 1.1 when 'Economy & Jobs' then 1.1 when 'Transport & Infrastructure' then 1.1 else 1.0 end
    * case when t.is_seed then 0.8 else power(0.5, extract(epoch from now()-t.created_at)/604800) end as score
  from lounge_topics t left join profiles p on p.id = t.user_id
  left join (select topic_id, count(*) n from lounge_votes group by 1) v on v.topic_id = t.id
  where not t.hidden and (select count(*) from lounge_reports r where r.topic_id = t.id) < 3
  order by score desc;
create or replace view lounge_replies_public with (security_invoker = false) as
  select r.id, r.topic_id, r.body, coalesce(p.handle,'deleted_user') handle, r.created_at from lounge_replies r left join profiles p on p.id = r.user_id where not r.hidden;
grant select on lounge_topics_ranked, lounge_replies_public to anon, authenticated;
create or replace function lounge_post_topic(p_title text, p_cat text, p_body text) returns text language plpgsql security definer set search_path = public as $$
declare i text; begin perform rate_ok('topic', 5, interval '1 hour');
  insert into lounge_topics(title, cat, body, user_id) values (p_title, p_cat, p_body, auth.uid()) returning id into i; return i; end $$;
create or replace function lounge_post_reply(p_topic text, p_body text) returns bigint language plpgsql security definer set search_path = public as $$
declare i bigint; begin perform rate_ok('reply', 30, interval '1 hour');
  insert into lounge_replies(topic_id, body, user_id) values (p_topic, p_body, auth.uid()) returning id into i; return i; end $$;
create or replace function lounge_vote(p_topic text) returns boolean language plpgsql security definer set search_path = public as $$
begin perform rate_ok('vote', 60, interval '1 hour'); insert into lounge_votes(topic_id, user_id) values (p_topic, auth.uid()) on conflict do nothing; return true; end $$;
create or replace function lounge_report(p_topic text, p_reason text) returns boolean language plpgsql security definer set search_path = public as $$
begin perform rate_ok('report', 10, interval '1 day'); insert into lounge_reports(topic_id, user_id, reason) values (p_topic, auth.uid(), p_reason) on conflict do nothing; return true; end $$;

-- Shared links
create table if not exists shared_links (id bigserial primary key, user_id uuid references auth.users on delete cascade, url text not null, title text, summary text,
  thumb_url text, author text, host text, cat text, place text, lat double precision, lon double precision, psgc text, hidden boolean default false,
  created_at timestamptz default now(), unique (user_id, url));
alter table shared_links enable row level security;
create table if not exists shared_link_reports (link_id bigint references shared_links on delete cascade, user_id uuid references auth.users on delete cascade, primary key (link_id, user_id));
alter table shared_link_reports enable row level security;
create or replace view shared_links_public with (security_invoker = false) as
  select s.id, s.url, s.title, s.summary, s.thumb_url, s.host, s.cat, s.place, s.lat, s.lon, s.created_at, p.handle from shared_links s left join profiles p on p.id = s.user_id
  where not s.hidden and (select count(*) from shared_link_reports r where r.link_id = s.id) < 3;
grant select on shared_links_public to anon, authenticated;
create or replace function share_link(p jsonb) returns bigint language plpgsql security definer set search_path = public as $$
declare i bigint; begin perform rate_ok('share', 10, interval '1 hour');
  insert into shared_links(user_id, url, title, summary, thumb_url, author, host, cat, place, lat, lon, psgc)
  values (auth.uid(), p->>'url', p->>'title', p->>'summary', p->>'thumb_url', p->>'author', p->>'host', p->>'cat', p->>'place', (p->>'lat')::float8, (p->>'lon')::float8, p->>'psgc')
  on conflict (user_id, url) do update set title = excluded.title returning id into i; return i; end $$;

-- Premium interest
create table if not exists premium_waitlist (user_id uuid primary key references auth.users on delete cascade, features text[], created_at timestamptz default now());
alter table premium_waitlist enable row level security;
drop policy if exists "own waitlist" on premium_waitlist; create policy "own waitlist" on premium_waitlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on function rate_ok(text,int,interval) from public, anon;
revoke all on function lounge_post_topic(text,text,text), lounge_post_reply(text,text), lounge_vote(text), lounge_report(text,text), share_link(jsonb) from public, anon;
grant execute on function lounge_post_topic(text,text,text), lounge_post_reply(text,text), lounge_vote(text), lounge_report(text,text), share_link(jsonb) to authenticated;
-- Right to erasure: deleting the auth user cascades profile, votes, reports, links, waitlist; topics/replies keep text as "deleted_user"
-- (delete those rows too if the user asks for full removal).

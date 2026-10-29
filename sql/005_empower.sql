-- Civi Empower (Kapangyarihan ng Bayan): Petitions, Sumbungan ng Bayan, Project Watch ground updates, FOI tracker, user events, Impact board.
-- Run AFTER 001-004. Uses rate_ok() and profiles from 002. All writes via security-definer RPCs (login required, rate limited). RLS on every table.
-- Signer identities are never exposed: public views show counts only. Civi never sends letters/FOI requests; users send them themselves.

-- ---------- Petitions ----------
create table if not exists petitions (id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 10 and 140), ask text not null check (length(ask) between 20 and 1500),
  target text not null check (length(target) between 3 and 160), cat text not null default 'Government',
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) between 1 and 8),
  goal int not null check (goal between 10 and 1000000), user_id uuid references auth.users on delete set null,
  hidden boolean default false, created_at timestamptz default now());
create table if not exists petition_signatures (petition_id uuid references petitions on delete cascade, user_id uuid references auth.users on delete cascade,
  show_name boolean not null default false, at timestamptz default now(), primary key (petition_id, user_id));
create table if not exists petition_updates (id bigserial primary key, petition_id uuid references petitions on delete cascade,
  body text not null check (length(body) <= 1500), user_id uuid references auth.users on delete set null, created_at timestamptz default now());
create table if not exists petition_reports (petition_id uuid references petitions on delete cascade, user_id uuid references auth.users on delete cascade, reason text, at timestamptz default now(), primary key (petition_id, user_id));
alter table petitions enable row level security; alter table petition_signatures enable row level security;
alter table petition_updates enable row level security; alter table petition_reports enable row level security;
drop policy if exists "own signature" on petition_signatures; create policy "own signature" on petition_signatures for select using (auth.uid() = user_id);
create or replace view petitions_public with (security_invoker = false) as
  select p.id, p.title, p.ask, p.target, p.cat, p.sources, p.goal, coalesce(pr.handle,'deleted_user') handle, p.created_at,
    (select count(*) from petition_signatures s where s.petition_id = p.id) signatures,
    (select coalesce(jsonb_agg(jsonb_build_object('body', u.body, 'at', u.created_at) order by u.created_at desc), '[]') from petition_updates u where u.petition_id = p.id) updates
  from petitions p left join profiles pr on pr.id = p.user_id
  where not p.hidden and (select count(*) from petition_reports r where r.petition_id = p.id) < 3;
grant select on petitions_public to anon, authenticated;
create or replace function petition_create(p_title text, p_ask text, p_target text, p_cat text, p_sources jsonb, p_goal int) returns uuid
language plpgsql security definer set search_path = public as $$ declare i uuid; begin perform rate_ok('petition', 3, interval '1 day');
  if exists (select 1 from jsonb_array_elements_text(p_sources) s where s !~ '^https://') then raise exception 'sources must be https links'; end if;
  insert into petitions(title, ask, target, cat, sources, goal, user_id) values (p_title, p_ask, p_target, p_cat, p_sources, p_goal, auth.uid()) returning id into i; return i; end $$;
create or replace function petition_sign(p_id uuid, p_show_name boolean default false) returns boolean language plpgsql security definer set search_path = public as $$
begin perform rate_ok('sign', 60, interval '1 hour');
  insert into petition_signatures(petition_id, user_id, show_name) values (p_id, auth.uid(), coalesce(p_show_name,false)) on conflict do nothing; return true; end $$;
create or replace function petition_unsign(p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin delete from petition_signatures where petition_id = p_id and user_id = auth.uid(); return true; end $$;
create or replace function petition_update(p_id uuid, p_body text) returns bigint language plpgsql security definer set search_path = public as $$
declare i bigint; begin perform rate_ok('pupdate', 5, interval '1 day');
  if not exists (select 1 from petitions where id = p_id and user_id = auth.uid()) then raise exception 'only the creator can post updates'; end if;
  insert into petition_updates(petition_id, body, user_id) values (p_id, p_body, auth.uid()) returning id into i; return i; end $$;
create or replace function petition_report(p_id uuid, p_reason text) returns boolean language plpgsql security definer set search_path = public as $$
begin perform rate_ok('report', 10, interval '1 day');
  insert into petition_reports(petition_id, user_id, reason) values (p_id, auth.uid(), left(p_reason,200)) on conflict do nothing; return true; end $$;

-- ---------- Sumbungan ng Bayan (issue reports; issues, not individuals) ----------
create table if not exists reports_issues (id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 10 and 140), body text not null check (length(body) between 20 and 2000),
  cat text not null check (cat in ('Flood control','Roads & bridges','Land & IP rights','Utilities (water/power)','Environment','Public services','Other public project')),
  place text check (length(place) <= 120), lat double precision check (lat between 4 and 22), lng double precision check (lng between 116 and 128),
  evidence jsonb not null default '[]' check (jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) between 1 and 8),
  photo_path text, project_id text, status text not null default 'Reported' check (status in ('Reported','Escalated','Agency responded','Resolved','Unverified')),
  rules_ack boolean not null check (rules_ack), user_id uuid references auth.users on delete set null, hidden boolean default false, created_at timestamptz default now());
create table if not exists report_metoo (report_id uuid references reports_issues on delete cascade, user_id uuid references auth.users on delete cascade, at timestamptz default now(), primary key (report_id, user_id));
create table if not exists report_flags (report_id uuid references reports_issues on delete cascade, user_id uuid references auth.users on delete cascade, reason text, at timestamptz default now(), primary key (report_id, user_id));
alter table reports_issues enable row level security; alter table report_metoo enable row level security; alter table report_flags enable row level security;
drop policy if exists "own metoo" on report_metoo; create policy "own metoo" on report_metoo for select using (auth.uid() = user_id);
create or replace view reports_public with (security_invoker = false) as
  select r.id, r.title, r.body, r.cat, r.place, round(r.lat::numeric,3) lat, round(r.lng::numeric,3) lng, r.evidence, r.photo_path, r.project_id, r.status,
    coalesce(p.handle,'deleted_user') handle, r.created_at, (select count(*) from report_metoo m where m.report_id = r.id) metoo
  from reports_issues r left join profiles p on p.id = r.user_id
  where not r.hidden and (select count(*) from report_flags f where f.report_id = r.id) < 3;
grant select on reports_public to anon, authenticated;
create or replace function report_create(p_title text, p_body text, p_cat text, p_place text, p_lat double precision, p_lng double precision, p_evidence jsonb, p_photo text, p_project text, p_ack boolean)
returns uuid language plpgsql security definer set search_path = public as $$ declare i uuid; begin perform rate_ok('sumbong', 3, interval '1 day');
  if exists (select 1 from jsonb_array_elements_text(p_evidence) s where s !~ '^https://') then raise exception 'evidence must be https links'; end if;
  if p_photo is not null and p_photo !~ ('^' || auth.uid()::text || '/[a-z0-9-]+\.jpg$') then raise exception 'bad photo path'; end if;
  insert into reports_issues(title, body, cat, place, lat, lng, evidence, photo_path, project_id, rules_ack, user_id)
  values (p_title, p_body, p_cat, p_place, p_lat, p_lng, p_evidence, p_photo, p_project, p_ack, auth.uid()) returning id into i; return i; end $$;
create or replace function report_metoo_toggle(p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin perform rate_ok('metoo', 60, interval '1 hour');
  if exists (select 1 from report_metoo where report_id = p_id and user_id = auth.uid()) then delete from report_metoo where report_id = p_id and user_id = auth.uid(); return false; end if;
  insert into report_metoo(report_id, user_id) values (p_id, auth.uid()); return true; end $$;
create or replace function report_set_status(p_id uuid, p_status text) returns boolean language plpgsql security definer set search_path = public as $$
begin -- reporter updates their own report's status (e.g. after the agency responds); 'Unverified' is for moderators
  if p_status = 'Unverified' then raise exception 'not allowed'; end if;
  update reports_issues set status = p_status where id = p_id and user_id = auth.uid(); return found; end $$;
create or replace function report_flag(p_id uuid, p_reason text) returns boolean language plpgsql security definer set search_path = public as $$
begin perform rate_ok('report', 10, interval '1 day');
  insert into report_flags(report_id, user_id, reason) values (p_id, auth.uid(), left(p_reason,200)) on conflict do nothing; return true; end $$;

-- Photos: private-by-path Storage bucket. Client strips EXIF/GPS by re-encoding to JPEG before upload. 3 MB max, JPEG only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sumbong-photos','sumbong-photos', true, 3145728, array['image/jpeg'])
  on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];
drop policy if exists "sumbong upload own folder" on storage.objects;
create policy "sumbong upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'sumbong-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sumbong delete own" on storage.objects;
create policy "sumbong delete own" on storage.objects for delete to authenticated using (bucket_id = 'sumbong-photos' and owner = auth.uid());

-- ---------- Project Watch ground updates (link to Sumbungan reports) ----------
create table if not exists project_updates (id bigserial primary key, project_id text not null check (length(project_id) <= 40),
  body text not null check (length(body) between 10 and 1000), report_id uuid references reports_issues on delete set null,
  user_id uuid references auth.users on delete set null, hidden boolean default false, created_at timestamptz default now());
alter table project_updates enable row level security;
create or replace view project_updates_public with (security_invoker = false) as
  select u.id, u.project_id, u.body, u.report_id, coalesce(p.handle,'deleted_user') handle, u.created_at from project_updates u left join profiles p on p.id = u.user_id where not u.hidden;
grant select on project_updates_public to anon, authenticated;
create or replace function project_update_add(p_project text, p_body text, p_report uuid) returns bigint language plpgsql security definer set search_path = public as $$
declare i bigint; begin perform rate_ok('pwatch', 10, interval '1 day');
  insert into project_updates(project_id, body, report_id, user_id) values (p_project, p_body, p_report, auth.uid()) returning id into i; return i; end $$;

-- ---------- FOI tracker (private to the user; Civi does not file requests) ----------
create table if not exists foi_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  agency text not null check (length(agency) <= 160), data_requested text not null check (length(data_requested) <= 2000), purpose text check (length(purpose) <= 600),
  format text check (length(format) <= 60), tracking_no text check (length(tracking_no) <= 60),
  status text not null default 'Draft' check (status in ('Draft','Filed','Acknowledged','Extended','Granted','Partially granted','Denied','Appealed')),
  filed_on date, created_at timestamptz default now(), updated_at timestamptz default now());
alter table foi_requests enable row level security;
drop policy if exists "foi own all" on foi_requests;
create policy "foi own all" on foi_requests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on foi_requests to authenticated;

-- ---------- User events for the Action Map layer ----------
create table if not exists user_events (id uuid primary key default gen_random_uuid(), title text not null check (length(title) between 5 and 140),
  kind text not null check (kind in ('Public hearing','Peaceful assembly','Volunteer activity','Community meeting','Other')),
  starts_at timestamptz not null, place text not null check (length(place) <= 120), lat double precision check (lat between 4 and 22), lng double precision check (lng between 116 and 128),
  url text check (url ~ '^https://'), user_id uuid references auth.users on delete set null, hidden boolean default false, created_at timestamptz default now());
create table if not exists event_flags (event_id uuid references user_events on delete cascade, user_id uuid references auth.users on delete cascade, at timestamptz default now(), primary key (event_id, user_id));
alter table user_events enable row level security; alter table event_flags enable row level security;
create or replace view user_events_public with (security_invoker = false) as
  select e.id, e.title, e.kind, e.starts_at, e.place, e.lat, e.lng, e.url, coalesce(p.handle,'deleted_user') handle from user_events e left join profiles p on p.id = e.user_id
  where not e.hidden and e.starts_at > now() - interval '1 day' and (select count(*) from event_flags f where f.event_id = e.id) < 3;
grant select on user_events_public to anon, authenticated;
create or replace function event_create(p_title text, p_kind text, p_starts timestamptz, p_place text, p_lat double precision, p_lng double precision, p_url text) returns uuid
language plpgsql security definer set search_path = public as $$ declare i uuid; begin perform rate_ok('event', 5, interval '1 day');
  insert into user_events(title, kind, starts_at, place, lat, lng, url, user_id) values (p_title, p_kind, p_starts, p_place, p_lat, p_lng, nullif(p_url,''), auth.uid()) returning id into i; return i; end $$;

-- ---------- Impact board (computed, never seeded) ----------
create or replace view impact_public with (security_invoker = false) as
  select 'petition' kind, id::text, title, signatures::int n, created_at from petitions_public where signatures >= goal
  union all select 'report', id::text, title, metoo::int, created_at from reports_public where status = 'Resolved';
grant select on impact_public to anon, authenticated;

revoke all on function petition_create, petition_sign, petition_unsign, petition_update, petition_report, report_create, report_metoo_toggle, report_set_status, report_flag, project_update_add, event_create from anon;
grant execute on function petition_create, petition_sign, petition_unsign, petition_update, petition_report, report_create, report_metoo_toggle, report_set_status, report_flag, project_update_add, event_create to authenticated;

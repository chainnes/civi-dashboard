-- Civi waitlist
-- Apply in the Supabase SQL editor after the project exists.
-- The landing page inserts with the anon key. Anon must not be able to read rows.
-- gen_random_uuid() needs pgcrypto on older Postgres; Supabase already provides it.
-- If this table already exists, the alter statement adds location without dropping rows.

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique not null,
  barangay text,
  role text,
  location text,
  created_at timestamptz default now()
);

alter table public.waitlist add column if not exists location text;

alter table public.waitlist enable row level security;

drop policy if exists "waitlist_insert_anon" on public.waitlist;
create policy "waitlist_insert_anon"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- No select, update, or delete policy for anon (or authenticated).
grant usage on schema public to anon;

revoke all on table public.waitlist from anon;
revoke all on table public.waitlist from authenticated;
grant insert on table public.waitlist to anon;

comment on table public.waitlist is
  'Waitlist. Browser clients may insert only. Read rows from the Supabase table editor, which uses a privileged role.';

comment on column public.waitlist.location is
  'Optional province or city from the landing-page form.';

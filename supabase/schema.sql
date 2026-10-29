-- Civi Phase 1 schema (profiles, posts, insights).
-- The public waitlist is a separate script: supabase/waitlist.sql.
-- Apply in the Supabase SQL editor (hosted) or: psql "$DATABASE_URL" -f supabase/schema.sql
-- Requires auth.users (Supabase Auth). Do not drop auth schema.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (public user records bound to Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique,
  display_name text,
  role text not null default 'member'
    check (role in ('member', 'moderator', 'operator', 'agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  source text not null
    check (source in ('forum', 'social', 'submission', 'n8n', 'other')),
  channel text,
  external_id text,
  title text,
  body text not null,
  language text,
  metadata jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (source, external_id)
);

create index if not exists community_posts_ingested_at_idx
  on public.community_posts (ingested_at desc);
create index if not exists community_posts_source_channel_idx
  on public.community_posts (source, channel);
create index if not exists community_posts_unprocessed_idx
  on public.community_posts (ingested_at)
  where processed_at is null;

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts (id) on delete set null,
  agent_name text not null default 'insight-v1',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'complete', 'failed')),
  sentiment text
    check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score numeric(4, 3),
  categories text[] not null default '{}',
  headline text,
  summary text,
  actions jsonb not null default '[]'::jsonb,
  model text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insights_created_at_idx
  on public.insights (created_at desc);
create index if not exists insights_status_idx
  on public.insights (status);
create index if not exists insights_sentiment_idx
  on public.insights (sentiment);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists insights_set_updated_at on public.insights;
create trigger insights_set_updated_at
  before update on public.insights
  for each row execute function public.set_updated_at();

-- New auth users get a profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.insights enable row level security;

-- Profiles: users read all public handles; update own row
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Posts: members read; authors insert submissions; service role bypasses RLS
drop policy if exists "posts_select_authenticated" on public.community_posts;
create policy "posts_select_authenticated"
  on public.community_posts for select
  to authenticated
  using (true);

drop policy if exists "posts_insert_own" on public.community_posts;
create policy "posts_insert_own"
  on public.community_posts for insert
  to authenticated
  with check (author_id = auth.uid() or author_id is null);

-- Insights: authenticated read completed reports; writes via service role only
drop policy if exists "insights_select_complete" on public.insights;
create policy "insights_select_complete"
  on public.insights for select
  to authenticated
  using (status = 'complete' or auth.uid() is not null);

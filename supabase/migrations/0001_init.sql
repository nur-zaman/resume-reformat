-- RLS policies and Data API grants live in 0002_rls.sql; run this first.

-- Keep `private` out of the Data API's Exposed schemas setting - these are privileged helpers.
create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  base_resume         jsonb,
  base_resume_version integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.allowed_emails (
  email    text primary key
    constraint allowed_emails_email_normalized
    check (email = lower(trim(email))),
  note     text,
  added_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  company    text,
  jd_text    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.generations (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  origin_resume  jsonb not null,
  working_resume jsonb not null,
  review_items   jsonb not null,
  schema_version integer not null,
  model_provider text not null,
  model_id       text not null,
  prompt_version text not null,
  revision       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint generations_job_owner_fkey
    foreign key (job_id, user_id)
    references public.jobs (id, user_id)
    on delete cascade
);

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists generations_user_id_idx on public.generations (user_id);
create index if not exists generations_job_id_idx on public.generations (job_id);

-- SECURITY DEFINER, intentionally in a private/unexposed schema; checks only the
-- caller's verified Auth JWT claims.
create or replace function private.is_current_user_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.allowed_emails ae
    where ae.email = lower(trim(auth.jwt() ->> 'email'))
  ) and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

grant usage on schema private to authenticated;
revoke all on function private.is_current_user_allowed() from public, anon;
grant execute on function private.is_current_user_allowed() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(trim(new.email)))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function private.set_updated_at();

drop trigger if exists generations_set_updated_at on public.generations;
create trigger generations_set_updated_at
  before update on public.generations
  for each row execute function private.set_updated_at();

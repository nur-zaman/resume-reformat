-- Multiple resumes per user. Introduces public.resumes (1..N per profile),
-- replacing the single profiles.base_resume as the source of editable resumes.
-- The old profiles.base_resume / base_resume_version columns are intentionally LEFT
-- in place but unused (no data migration); a later cleanup migration may drop them.
-- Mirrors the public.jobs ownership/RLS patterns from 0001_init.sql / 0002_rls.sql.

create table if not exists public.resumes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'Untitled resume',
  doc        jsonb not null,
  version    integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite key so a future generations.resume_id can enforce same-owner FK.
  unique (id, user_id)
);

create index if not exists resumes_user_id_idx on public.resumes (user_id);

-- Keep updated_at fresh on every write (shared helper from 0001_init.sql).
drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security + Data API grants. Every policy combines ownership with
-- current allowlist membership, exactly like jobs/generations.
-- ---------------------------------------------------------------------------

alter table public.resumes enable row level security;

revoke all on table public.resumes from anon, authenticated, service_role;

-- resumes is fully app-owned (no auth-managed columns like profiles.email), so a
-- full table grant is correct; RLS restricts which rows authenticated users reach.
grant select, insert, update, delete on table public.resumes to authenticated;

create policy "resumes_all_own" on public.resumes
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_current_user_allowed())
  )
  with check (
    user_id = (select auth.uid())
    and (select private.is_current_user_allowed())
  );

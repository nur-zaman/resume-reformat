create table if not exists public.resumes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'Untitled resume',
  doc        jsonb not null,
  version    integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists resumes_user_id_idx on public.resumes (user_id);

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function private.set_updated_at();

-- Same ownership + allowlist policy pattern as jobs/generations.
alter table public.resumes enable row level security;

revoke all on table public.resumes from anon, authenticated, service_role;

-- resumes is fully app-owned (no auth-managed columns like profiles.email), so a full
-- table grant is safe; RLS restricts rows.
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

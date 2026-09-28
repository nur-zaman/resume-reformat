-- Every policy combines ownership with current allowlist membership.

alter table public.profiles       enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.jobs           enable row level security;
alter table public.generations    enable row level security;

-- Data API access is opt-in on new Supabase projects; grants below are scoped to what
-- the app needs, and RLS controls which rows authenticated users can reach.
revoke all on table public.profiles, public.allowed_emails,
  public.jobs, public.generations from anon, authenticated, service_role;

grant select on table public.profiles to authenticated;
grant update (base_resume, base_resume_version)
  on table public.profiles to authenticated;
grant select, insert, update, delete on table public.jobs to authenticated;
grant select, insert, update, delete on table public.generations to authenticated;

-- The server-side secret key is used only for the pre-auth allowlist lookup.
grant select on table public.allowed_emails to service_role;

-- allowed_emails: RLS enabled with no policies and no client table privileges.
-- Only server-side secret-key access and the private policy helper can read it.

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    and (select private.is_current_user_allowed())
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    and (select private.is_current_user_allowed())
  )
  with check (
    id = (select auth.uid())
    and (select private.is_current_user_allowed())
  );

create policy "jobs_all_own" on public.jobs
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_current_user_allowed())
  )
  with check (
    user_id = (select auth.uid())
    and (select private.is_current_user_allowed())
  );

create policy "generations_all_own" on public.generations
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_current_user_allowed())
  )
  with check (
    user_id = (select auth.uid())
    and (select private.is_current_user_allowed())
  );

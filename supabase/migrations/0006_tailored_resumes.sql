-- M6-lite: tailored resumes + a non-consuming rate-limit peek.
--
-- The dashboard now distinguishes a user's *base* resumes (edited directly) from the
-- *tailored* resumes produced for a specific job. Both still live in public.resumes, so the
-- whole editor/save/export pipeline is reused unchanged. This migration is purely additive:
-- every existing row defaults to kind='base', status='ready', review_items='[]', which is
-- exactly how it renders today. The 0003 grant (full CRUD on resumes to authenticated)
-- already covers the new columns, and RLS is unchanged (ownership + current allowlist).

alter table public.resumes
  add column if not exists kind text not null default 'base'
    constraint resumes_kind_check check (kind in ('base', 'tailored')),
  -- Target job metadata. NULL on base resumes; set on tailored ones for the jobs table.
  add column if not exists company text,
  add column if not exists target_role text,
  -- Which base resume this was tailored from. SET NULL on delete so removing a base resume
  -- never orphans (or cascades away) the tailored work derived from it.
  add column if not exists source_resume_id uuid
    references public.resumes (id) on delete set null,
  -- Persisted AI proposals for tailored resumes, so the dashboard can show "N to review" and
  -- the editor can resume a half-reviewed draft. Always [] for base resumes.
  add column if not exists review_items jsonb not null default '[]'::jsonb,
  -- draft  → parked, nothing pending; review → has pending proposals; ready → exportable.
  add column if not exists status text not null default 'ready'
    constraint resumes_status_check check (status in ('draft', 'review', 'ready'));

-- The dashboard reads base and tailored rows separately; index the common filter.
create index if not exists resumes_user_kind_idx on public.resumes (user_id, kind);

-- ---------------------------------------------------------------------------
-- peek_rate_limit — report whether a key is still UNDER its limit in the active window
-- WITHOUT counting a hit. Companion to check_rate_limit (0004), used by the dashboard to
-- show the "AI paused" banner when the per-user generation quota is exhausted. Same private
-- table, same SECURITY DEFINER + service_role-only contract; STABLE because it never writes.
-- Returns true when allowed (under limit), false once the limit is reached — matching
-- check_rate_limit's polarity.
-- ---------------------------------------------------------------------------

create or replace function public.peek_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select h.hits
      from private.rate_limit_hits h
      where h.key = p_key
        and h.window_start = to_timestamp(
          floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
        )
    ),
    0
  ) < p_limit;
$$;

revoke all on function public.peek_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.peek_rate_limit(text, integer, integer) to service_role;

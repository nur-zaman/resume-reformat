alter table public.resumes
  add column if not exists kind text not null default 'base'
    constraint resumes_kind_check check (kind in ('base', 'tailored')),
  add column if not exists company text,
  add column if not exists target_role text,
  add column if not exists source_resume_id uuid
    references public.resumes (id) on delete set null,
  add column if not exists review_items jsonb not null default '[]'::jsonb,
  add column if not exists status text not null default 'ready'
    constraint resumes_status_check check (status in ('draft', 'review', 'ready'));

create index if not exists resumes_user_kind_idx on public.resumes (user_id, kind);

-- Companion to check_rate_limit: reports whether still under the limit without counting
-- a hit. Same private table, same SECURITY DEFINER + service_role-only contract; STABLE
-- because it never writes. Returns true when allowed, matching check_rate_limit's polarity.
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

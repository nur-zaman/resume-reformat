-- M5 cost controls — per-user and per-IP generation rate limits (PRD §11).
--
-- A fixed-window counter lives in the unexposed `private` schema. The only entry point is a
-- SECURITY DEFINER function in `public` that is callable solely by the server-side secret
-- key (service_role): EXECUTE is revoked from anon/authenticated, and the table itself is
-- never exposed to the Data API. This mirrors the allowlist pattern in 0001/0002.

create table if not exists private.rate_limit_hits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);

-- Atomically count one hit against (key, current window) and report whether the caller is
-- still within `p_limit`. Returns true when allowed, false once the limit is exceeded.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_limit_hits as h (key, window_start, hits)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set hits = h.hits + 1
  returning h.hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

-- Only the server-side secret key may call this; clients never can.
revoke all on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Note: expired windows accumulate slowly; prune `private.rate_limit_hits` where
-- window_start < now() - interval '1 day' in a future maintenance job if needed.

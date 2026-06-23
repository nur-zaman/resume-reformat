-- Public waitlist capture for the marketing landing page.
--
-- Mirrors the allowed_emails pattern (0001/0002): RLS is enabled with NO policies and
-- NO client table privileges, so anon/authenticated can never reach this table through
-- the Data API. The only writer is the server-side secret key (service_role), used by the
-- `joinWaitlist` server action. Email is stored normalized (lower + trim) and unique, so a
-- repeat sign-up is an idempotent no-op (the action upserts with on-conflict-do-nothing).

create table if not exists public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique
    constraint waitlist_email_normalized
    check (email = lower(trim(email))),
  source     text,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

-- No client access at all. The public landing form posts to a server action that inserts
-- with the server-side secret key; browser clients (anon/authenticated) never touch it.
revoke all on table public.waitlist_signups from anon, authenticated, service_role;
grant select, insert on table public.waitlist_signups to service_role;

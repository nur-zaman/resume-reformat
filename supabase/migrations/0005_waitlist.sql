-- Mirrors the allowed_emails pattern: RLS is enabled with no policies and no client
-- table privileges, so anon/authenticated can never reach this table through the Data
-- API; only the secret key (service_role) writes.

create table if not exists public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique
    constraint waitlist_email_normalized
    check (email = lower(trim(email))),
  source     text,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

revoke all on table public.waitlist_signups from anon, authenticated, service_role;
grant select, insert on table public.waitlist_signups to service_role;

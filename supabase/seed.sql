-- Seed the allowlist with the owner's email so first sign-in works.
-- Emails are stored normalized (lower + trim). Edit before running.
insert into public.allowed_emails (email, note)
values ('nur@manzil.ca', 'owner')
on conflict (email) do nothing;

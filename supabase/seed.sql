insert into public.allowed_emails (email, note)
values ('nur@manzil.ca', 'owner')
on conflict (email) do nothing;

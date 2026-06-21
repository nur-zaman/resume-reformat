# Supabase setup (M1)

This project targets hosted Supabase and uses the current publishable/secret API
keys. The legacy `anon` and `service_role` environment variables are not used.

## 1. Apply schema and RLS

Run these files in order through the SQL editor, or push them with a linked
Supabase CLI project:

1. `migrations/0001_init.sql` - schema, constraints, private functions, triggers.
2. `migrations/0002_rls.sql` - explicit Data API grants, RLS, and policies.

Keep the `private` schema out of **Project Settings -> API -> Exposed schemas**.
The RLS allowlist helper is deliberately defined there because it bypasses RLS.

New Supabase projects no longer expose SQL-created tables to the Data API by
default. `0002_rls.sql` explicitly grants the authenticated role only the table
operations this app needs. The `allowed_emails` table remains inaccessible to
`anon` and `authenticated`; `service_role` receives only `SELECT` on that table.

## 2. Seed the allowlist

Edit `seed.sql` to the owner email (stored lowercase and trimmed), then run it.
Add or remove invited users directly in `allowed_emails`; there is no admin UI in
v1. Removing an email takes effect immediately through RLS, including for an
existing session.

## 3. Configure Auth

- In **Authentication -> URL Configuration**, set the Site URL and add
  `http://localhost:3000/auth/confirm` plus the production equivalent to Redirect
  URLs.
- Change the **Magic Link** email template to:

  ```html
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Sign in</a>
  ```

The dashboard Site URL must match the app's `SITE_URL` environment variable.

## 4. Configure the app

Copy `.env.example` to `.env.local` and fill in the project URL, publishable key,
secret key, and canonical site URL. The `SUPABASE_SECRET_KEY` bypasses RLS and
must never use a `NEXT_PUBLIC_` prefix.

Pin Supabase dependency versions and commit `package-lock.json` when upgrading.

## 5. Verify RLS

Enable the `pgtap` extension, then run against a disposable or test database:

```sh
psql "$DATABASE_URL" -f supabase/tests/0001_rls_test.sql
```

The suite runs inside a transaction and rolls back. After schema changes, also
run the Supabase database advisors and resolve security/performance findings.

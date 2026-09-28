# Supabase setup

This project targets hosted Supabase and uses the current publishable/secret API
keys. The legacy `anon` and `service_role` environment variables are not used.

## 1. Apply schema and RLS

Push the migrations with a linked Supabase CLI project (`npm run db:push`), or run
every file in `migrations/` in numeric order through the SQL editor:

| Migration | Contents |
| --- | --- |
| `0001_init.sql` | Profiles, allowlist, private helper functions, triggers |
| `0002_rls.sql` | Data API grants, RLS, and policies |
| `0003_resumes.sql` | Multi-resume table with RLS |
| `0004_rate_limits.sql` | Postgres-backed fixed-window rate limiter |
| `0005_waitlist.sql` | Public waitlist signups |
| `0006_tailored_resumes.sql` | Tailored resume metadata and review items |
| `0007_application_tracking.sql` | Application stages, dates, and timeline |

Keep the `private` schema out of **Project Settings -> API -> Exposed schemas**.
The RLS allowlist helper is deliberately defined there because it bypasses RLS.

New Supabase projects no longer expose SQL-created tables to the Data API by
default. `0002_rls.sql` explicitly grants the authenticated role only the table
operations this app needs. The `allowed_emails` table remains inaccessible to
`anon` and `authenticated`; `service_role` receives only `SELECT` on that table.

## 2. Seed the allowlist

Edit `seed.sql` to the owner email (stored lowercase and trimmed), then run it.
Add or remove invited users directly in `allowed_emails`; there is no admin UI.
Removing an email takes effect immediately through RLS, including for an existing
session.

## 3. Configure Auth (password sign-in)

Sign-in is invite-only **email + password**. The password is set on first sign-in:
the server action creates the account with the admin (secret) key, pre-confirmed, so
**no email is ever sent** — login is unaffected by Supabase's email rate limits.

- In **Authentication -> Sign In / Providers -> Email**, turn **off**
  "Allow new users to sign up". The allowlist plus admin-created accounts are the only
  way in; this stops anyone from self-registering with the publishable key. Admin
  account creation (the first-sign-in flow) bypasses this toggle.
- If you tested the earlier magic-link flow, delete any leftover users in
  **Authentication -> Users** for invited emails. A stray (passwordless) account blocks
  first-time password creation with "User already registered".
- No email template or Redirect URL configuration is required for login. The
  `/auth/confirm` route is retained for future email flows (e.g. password reset) and is
  unused by password sign-in.
- Custom SMTP (Authentication -> SMTP Settings) is only needed if you later add
  email-based flows; it is not required for password sign-in.

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

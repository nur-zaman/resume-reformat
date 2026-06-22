# Resume Reformatter

A private, invite-only web app for tailoring an existing resume to a pasted job
description. You paste your base resume, review the AI-parsed structured version, generate
a tailored draft, resolve every AI-proposed claim, edit the result, and export a
fixed-template PDF. The canonical resume is structured JSON consumed by both the live HTML
preview and the client-side PDF renderer.

See [`PRD.md`](./PRD.md) for the product spec and [`DESIGN.md`](./DESIGN.md) for the design
system.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-based `@theme` tokens in `app/globals.css`)
- **Supabase** — email magic-link auth, Postgres, and Row Level Security
- **Vitest** for unit tests; **pgTAP** for RLS tests

> This repo pins a Next.js version with breaking changes (e.g. `middleware.ts` → `proxy.ts`,
> async `cookies()`/`params`). Read the relevant guide in `node_modules/next/dist/docs/`
> before writing framework code — see [`AGENTS.md`](./AGENTS.md).

## Getting started

1. Set up Supabase (schema, allowlist, auth config) by following
   [`supabase/README.md`](./supabase/README.md).
2. Copy the env template and fill it in from your Supabase project:

   ```bash
   cp .env.example .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Access is invite-only — sign in with
   an email present in the `allowed_emails` table.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |

RLS tests run against a Supabase Postgres with the `pgtap` extension — see
[`supabase/README.md`](./supabase/README.md).


## Project layout

```
app/            App Router routes: landing, (auth) sign-in, (app) protected shell, /auth/confirm
components/     UI primitives and auth components
lib/            supabase/ clients, auth/ helpers (allowlist, guards, actions), utils
proxy.ts        Session refresh + UX redirects (NOT the security boundary)
supabase/       SQL migrations, seed, and pgTAP RLS tests
```

## Status

**M1 — Foundations** is implemented: design tokens + app shell, Supabase schema with RLS,
magic-link auth, normalized-email allowlist, and protected navigation/server boundaries.
Subsequent milestones (resume schema + editor, HTML/PDF rendering, parsing, tailoring,
persistence, launch hardening) are tracked in [`PRD.md`](./PRD.md) §14.

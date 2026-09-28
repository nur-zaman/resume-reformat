<div align="center">

# Resume Reformatter

**Tailor your resume to every job, without the rewrite.**

Paste a job description, get a tailored draft, and approve every AI-written claim before
exporting a clean PDF.

[![CI](https://github.com/nur-zaman/resume-reformat/actions/workflows/ci.yml/badge.svg)](https://github.com/nur-zaman/resume-reformat/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini-8E75B2?logo=googlegemini&logoColor=white)

<img src="docs/screenshots/landing.jpg" alt="Resume Reformatter landing page" width="100%" />

</div>

## Features

### Tailor to any role

Pick a base resume, paste the job description, and generate a draft rewritten for that role.
Job title and company are inferred when you leave them blank.

<img src="docs/screenshots/tailor.png" alt="Tailoring form with a pasted job description" width="100%" />

### Review every AI claim

Content the model can't trace back to your base resume is flagged as a proposal with an
explanation. Accept, edit, or delete each one. Export stays locked until nothing is pending.

<img src="docs/screenshots/review.png" alt="Editor showing an AI-proposed claim beside the live preview" width="100%" />

### One workspace for every version

Keep your base resume alongside every tailored version, each with its review status.

<img src="docs/screenshots/dashboard.png" alt="Workspace dashboard with a base resume and tailored jobs" width="100%" />

### Print-ready PDF

The HTML preview and the PDF export render the same document model with the same
typography, so what you see is what you send.

<img src="docs/screenshots/preview.png" alt="Resume preview with PDF export" width="100%" />

### Track your applications

Each tailored resume doubles as an application with a stage, applied and follow-up dates,
the posting link, notes, and a timeline.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/tracker.png" alt="Job tracker list" /></td>
    <td width="50%"><img src="docs/screenshots/tracker-panel.png" alt="Application detail panel" /></td>
  </tr>
</table>

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Data & auth | Supabase: Postgres, Auth, Row Level Security |
| AI | Vercel AI SDK, Google Gemini, Zod structured output |
| Editor | Tiptap 3 |
| PDF | `@react-pdf/renderer` |
| Testing | Vitest, pgTAP |

## Engineering highlights

- **Single source of truth.** Resumes are versioned JSON documents with schema migrations and
  invariant checks. The editor, HTML preview, and PDF renderer all read the same model.
- **Guarded AI output.** The model fills a small schema, and a deterministic assembler builds
  the final document from it. Strict validation runs before anything reaches the user, and
  schema failures get one retry with the errors fed back to the model.
- **Human in the loop.** AI results come back as drafts. Nothing is saved until the user
  reviews it, and unverified claims block export.
- **Layered security.** Invite-only access, server-side authorization on every action, and
  Postgres RLS policies as the final boundary.
- **Rate limiting.** Per-user and per-IP limits run inside Postgres, so they hold across
  serverless instances with no extra infrastructure.

## Project structure

```
app/                 routes: landing, sign-in, dashboard, editor, tailor, preview, tracker
components/          UI grouped by feature
lib/
  resume/            document model, validation, migrations, persistence
  parsing/           resume import pipeline
  tailoring/         tailoring pipeline
  applications/      application tracking
  editor/            editor state
  render/            shared HTML/PDF rendering
  ai/ auth/ ratelimit/ supabase/
supabase/            migrations and RLS tests
```

## Getting started

**Prerequisites:** Node.js 20+, a [Supabase](https://supabase.com) project, and a
[Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/nur-zaman/resume-reformat.git
cd resume-reformat
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Supabase secret key (server only) |
| `SITE_URL` | App origin, e.g. `http://localhost:3000` |
| `AI_MODEL_ID` | Gemini model id, e.g. `gemini-3.1-flash-lite` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key (server only) |

Set up the database by following [`supabase/README.md`](./supabase/README.md), then start
the app:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) and sign in with an email from the
`allowed_emails` table.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler |
| `npm test` | Run unit and snapshot tests |
| `npm run db:push` | Apply migrations to the linked Supabase project |

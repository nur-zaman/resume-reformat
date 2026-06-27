-- Application tracking on tailored resumes.
--
-- A tailored resume already stands in for a job application: it carries `company` +
-- `target_role` (0006) and the JD it was built from. This migration layers a lightweight
-- application *pipeline* onto that same row — no new table — so the dashboard's "Tailored
-- jobs" band can double as an application tracker. Purely additive and default-safe: every
-- existing tailored row becomes application_stage='none' (Not applied) with an empty history,
-- which renders exactly as it does today. Base rows ignore these columns (just like `company`
-- / `review_items`). RLS is unchanged, and the 0003 grant (full CRUD on resumes to
-- authenticated) already covers the new columns.
--
-- NOTE: `application_stage` is deliberately SEPARATE from `status` (0006). `status` is the
-- resume's *readiness* (draft / review / ready — it gates export); `application_stage` is
-- where the user is with the *employer*. A resume can be `ready` while the application is
-- still `none`.

alter table public.resumes
  add column if not exists application_stage text not null default 'none'
    constraint resumes_application_stage_check
      check (application_stage in
        ('none', 'applied', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn')),
  -- First time the application entered an applied-or-later stage. NULL until then; drives the
  -- "applied" sort/stats. Kept as a denormalised column (vs. derived from stage_history) so
  -- the dashboard query can sort/aggregate without unpacking JSON.
  add column if not exists applied_at timestamptz,
  -- Optional in-app reminder date. There is no email/push in v1 ($0 infra), so this is shown
  -- and highlighted-when-due in the UI only.
  add column if not exists follow_up_at timestamptz,
  -- Link to the job posting, when the user has one. Scheme validated server-side (http/https).
  add column if not exists job_url text,
  -- Free-text notes for the application.
  add column if not exists notes text,
  -- Append-only [{ "stage": ..., "at": ISO8601 }] timeline of stage changes, for the detail
  -- panel. Always [] for base resumes and for tailored resumes never moved off 'none'.
  add column if not exists stage_history jsonb not null default '[]'::jsonb;

alter table public.resumes
  add column if not exists application_stage text not null default 'none'
    constraint resumes_application_stage_check
      check (application_stage in
        ('none', 'applied', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn')),
  add column if not exists applied_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists job_url text,
  add column if not exists notes text,
  add column if not exists stage_history jsonb not null default '[]'::jsonb;

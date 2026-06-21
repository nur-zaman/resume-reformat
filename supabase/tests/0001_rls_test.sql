-- pgTAP RLS suite: cross-user isolation, allowlist enforcement, explicit Data
-- API grants, privileged-function isolation, and generation/job ownership.
-- The transaction rolls back, so it leaves no test data behind.

begin;
create extension if not exists pgtap;
select plan(15);

select ok(
  has_table_privilege('authenticated', 'public.jobs', 'select'),
  'authenticated has explicit Data API access to jobs');

select ok(
  not has_table_privilege('authenticated', 'public.allowed_emails', 'select'),
  'authenticated has no table privilege on the allowlist');

select ok(
  not has_table_privilege('service_role', 'public.jobs', 'select'),
  'the secret-key role has no unnecessary access to user data');

select ok(
  not has_function_privilege(
    'authenticated', 'private.handle_new_user()', 'execute'
  ),
  'authenticated cannot execute the privileged auth trigger function');

-- Fixtures run as the privileged session role; the auth trigger creates profiles.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.dev');

insert into public.allowed_emails (email) values ('a@test.dev'), ('b@test.dev');

insert into public.jobs (id, user_id, title, jd_text) values
  ('0a000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'Job A', 'jd a'),
  ('0b000000-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222', 'Job B', 'jd b');

insert into public.generations
  (id, job_id, user_id, origin_resume, working_resume, review_items,
   schema_version, model_provider, model_id, prompt_version)
values
  ('09000000-0000-0000-0000-000000000003',
   '0a000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 1, 'test', 'test', 'v1');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"a@test.dev","role":"authenticated"}',
  true);

select throws_ok(
  'select * from public.allowed_emails',
  '42501', null,
  'authenticated cannot query the allowlist through the Data API role');

select is(
  (select count(*) from public.profiles)::int, 1,
  'user A sees exactly one profile');

select is(
  (select id from public.profiles),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'the profile user A sees is their own');

select is(
  (select count(*) from public.jobs)::int, 1,
  'user A sees only their own job');

select is(
  (select count(*) from public.generations)::int, 1,
  'user A sees only their own generation');

select throws_ok(
  $$ insert into public.generations
       (job_id, user_id, origin_resume, working_resume, review_items,
        schema_version, model_provider, model_id, prompt_version)
     values
       ('0b000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 1, 'test', 'test', 'v1') $$,
  '23503', null,
  'a generation cannot reference another user''s job');

-- Act as user B.
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"b@test.dev","role":"authenticated"}',
  true);

select is(
  (select count(*) from public.jobs)::int, 1,
  'user B sees only their own job');

select is(
  (select count(*) from public.jobs
   where user_id = '11111111-1111-1111-1111-111111111111')::int, 0,
  'user B cannot see user A''s jobs');

-- De-allowlist user A, then reuse the existing user A session claims.
reset role;
delete from public.allowed_emails where email = 'a@test.dev';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"a@test.dev","role":"authenticated"}',
  true);

select is(
  (select count(*) from public.profiles)::int, 0,
  'de-allowlisting blocks profile access in an existing session');

select is(
  (select count(*) from public.jobs)::int, 0,
  'de-allowlisting blocks job access in an existing session');

-- Anonymous Auth users carry the authenticated Postgres role; reject them even
-- if their email claim happens to match the allowlist.
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"b@test.dev","role":"authenticated","is_anonymous":true}',
  true);

select is(
  (select count(*) from public.jobs)::int, 0,
  'anonymous Auth users cannot pass the allowlist policy');

select * from finish();
rollback;

-- THE 5,000-CUSTOMER ORGANIZATION guard readspeed3_b reads (READ-SPEED-8). Kept, found by slug, never minted per run.
--
--   psql -X -v ON_ERROR_STOP=1 -f scripts/campaign-tests/_readspeed3_b_5000_fixture.sql
--
-- Idempotent: every step tops up only what is missing, each in its OWN short transaction (statement_timeout 50 s,
-- one connection), so no step can break the one-minute rule and a re-run after an interruption carries on.
--   1. The organization (scripts/campaign-tests/_fixture_org.sql, slug larkspur-garage-doors-readspeed-b) with
--      Customers and Jobs: Jobs.customer links each job to its customer; Customers.job_count counts, through that
--      back-link, the jobs whose status is "Done" (a filtered back-link roll-up, as Plumbing Company HQ's "Jobs done").
--      test@test.com is a member who sees what she is shared: Customers whole, no Job — a PARTIAL reader.
--   2. Customers grown to 5,000 in batches of 100 (each with 0-3 jobs, about half of them Done).
--   3. The refresh job's work: the marks applied, then every stale kept value worked out, 500 per transaction.
--   4. The refresh door's reader work for admin@admin.com and test@test.com (kept judgement, masks, columns).
\set ON_ERROR_STOP on
\timing off
\set suite '_readspeed3_b_5000_fixture.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '50s';
\set fixture_slug 'larkspur-garage-doors-readspeed-b'
\set fixture_name 'Larkspur Garage Doors Co'
\set fixture_abbr 'LGD'
\i scripts/campaign-tests/_fixture_org.sql
do $fx$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com
  c_test    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';   -- test@test.com
  v_org  uuid := current_setting('matrx.use_case_org')::uuid;
  v_home uuid; v_cust uuid; v_jobs uuid; v_back text;
begin
  perform set_config('app.actor_system', 'campaign-test/readspeed3_b fixture', true);
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_test, 'member', 'active')
  on conflict (container_type, container_id, user_id) do nothing;
  if not exists (select 1 from platform.knob_override where feature = 'custom' and key = 'system_enabled' and scope_kind = 'organization' and scope_id = v_org) then
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
    values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'readspeed3_b fixture');
  end if;
  select t.id into v_cust from custom.record t
   where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid and t.deleted_at is null and t.data ->> 'slug' = 'customers';
  if v_cust is not null then
    raise notice 'Customers already declared: %', v_cust;
    return;
  end if;
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;
  v_jobs := custom.table_declare(v_org, jsonb_build_object('name', 'Jobs', 'slug', 'jobs', 'type', 'entity',
    'label_singular', 'Job', 'label_plural', 'Jobs', 'title_field', 'title', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text, 'fields', jsonb_build_array(jsonb_build_object('name', 'title'))));
  v_cust := custom.table_declare(v_org, jsonb_build_object('name', 'Customers', 'slug', 'customers', 'type', 'entity',
    'label_singular', 'Customer', 'label_plural', 'Customers', 'title_field', 'name', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text, 'fields', jsonb_build_array(jsonb_build_object('name', 'name'))));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'title', 'label', 'Title', 'type', 'text', 'sort', 10, 'required', true));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'status', 'label', 'Status', 'type', 'text', 'sort', 20));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'customer', 'label', 'Customer', 'type', 'relation', 'relation_target', v_cust, 'sort', 30));
  select coalesce(nullif(f.data ->> 'inverse_key', ''), 'linked_' || replace(f.id::text, '-', '')) into v_back from custom.record f
   where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'customer';
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'sort', 10, 'required', true));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'job_count', 'label', 'Jobs done', 'type', 'rollup',
    'via', v_back, 'agg', 'count', 'of', 'title', 'filter', jsonb_build_object('status', 'Done'), 'sort', 20));
  perform custom.share_grant(v_org, v_cust, 'person', c_test, 'viewer'::public.permission_level);
  raise notice 'declared Customers % and Jobs % (back-link %)', v_cust, v_jobs, v_back;
end
$fx$;
commit;

-- 2. Customers to 5,000, 100 per transaction (a batch adds nothing once 5,000 are there)
select format($s$begin; set local statement_timeout = '50s'; do $b$
declare
  v_org uuid; v_cust uuid; v_jobs uuid; v_n integer; i integer; k integer; v_id uuid;
begin
  perform set_config('app.actor_system', 'campaign-test/readspeed3_b fixture', true);
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
  select o.id into v_org from iam.organizations o where o.slug = 'larkspur-garage-doors-readspeed-b' and o.archived_at is null;
  select t.id into v_cust from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid and t.deleted_at is null and t.data ->> 'slug' = 'customers';
  select t.id into v_jobs from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid and t.deleted_at is null and t.data ->> 'slug' = 'jobs';
  select count(*) into v_n from custom.record r where r.organization_id = v_org and r.table_id = v_cust and r.deleted_at is null;
  for i in v_n + 1 .. least(v_n + 100, 5000) loop
    v_id := custom.record_write(v_org, v_cust, jsonb_build_object('name', 'Customer ' || lpad(i::text, 4, '0')));
    for k in 1 .. (i %% 4) loop
      perform custom.record_write(v_org, v_jobs, jsonb_build_object('title', 'Door service ' || i || '-' || k,
        'status', case when (i + k) %% 2 = 0 then 'Done' else 'Open' end, 'customer', v_id));
    end loop;
  end loop;
  raise notice 'customers %% -> %%', v_n, least(v_n + 100, 5000);
end $b$; commit;$s$) from generate_series(1, 50) \gexec

-- test@test.com is shared NO Job (she sees Jobs only in part: not at all). A per-record share on Jobs would also stop
-- the owner seeing Jobs "whole" (custom.visible_set lists it as a granted row), and kept values would not be served to
-- admin@admin.com either (READ-SPEED-8 finding) — so any such share left by an earlier run is taken back.
begin;
set local statement_timeout = '50s';
do $sh$
declare v_org uuid; v_jobs uuid; v_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
  select o.id into v_org from iam.organizations o where o.slug = 'larkspur-garage-doors-readspeed-b' and o.archived_at is null;
  select t.id into v_jobs from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid and t.deleted_at is null and t.data ->> 'slug' = 'jobs';
  for v_id in select r.id from custom.record r where r.organization_id = v_org and r.table_id = v_jobs and r.deleted_at is null order by r.created_at limit 30 loop
    if iam.granted_level('4060701e-706a-4c76-b3ca-0bbc69fa5a14', 'record', v_id) is not null then
      perform custom.share_revoke(v_org, v_id, 'person', '4060701e-706a-4c76-b3ca-0bbc69fa5a14'::uuid);
    end if;
  end loop;
end
$sh$;
commit;

-- 3. the refresh job's work: marks applied, then 500 stale kept values per transaction until none is left
begin;
set local statement_timeout = '50s';
do $m$
declare v_org uuid;
begin
  perform set_config('request.jwt.claims', '', true);
  select o.id into v_org from iam.organizations o where o.slug = 'larkspur-garage-doors-readspeed-b' and o.archived_at is null;
  perform custom._computed_apply_org_mark(v_org);
end
$m$;
commit;
select format($s$begin; set local statement_timeout = '50s'; do $r$
declare v_org uuid; v_t uuid; v_ids uuid[];
begin
  perform set_config('request.jwt.claims', '', true);
  select o.id into v_org from iam.organizations o where o.slug = 'larkspur-garage-doors-readspeed-b' and o.archived_at is null;
  for v_t in select t.id from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid
                and t.deleted_at is null and t.data ->> 'slug' in ('customers', 'jobs') loop
    select coalesce(array_agg(x.record_id), '{}') into v_ids from (select rc.record_id from custom.record_computed rc
      where rc.organization_id = v_org and rc.table_id = v_t and rc.stale limit 500) x;
    if cardinality(v_ids) > 0 then
      perform custom.computed_refresh(v_org, v_t, v_ids);
      return;
    end if;
  end loop;
end $r$; commit;$s$) from generate_series(1, 30) \gexec

-- 4. the refresh door's reader work, then what is there
begin;
set local statement_timeout = '50s';
do $w$
declare v_org uuid; v_cust uuid; v_n integer; v_stale integer; v_marks integer;
begin
  select o.id into v_org from iam.organizations o where o.slug = 'larkspur-garage-doors-readspeed-b' and o.archived_at is null;
  select t.id into v_cust from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid and t.deleted_at is null and t.data ->> 'slug' = 'customers';
  perform custom._computed_warm('87a6e699-3622-4869-8843-d0867456c0dd'::uuid, v_org, v_cust);
  perform custom._computed_warm('4060701e-706a-4c76-b3ca-0bbc69fa5a14'::uuid, v_org, v_cust);
  select count(*) into v_n from custom.record r where r.organization_id = v_org and r.table_id = v_cust and r.deleted_at is null;
  select count(*) into v_stale from custom.record_computed rc where rc.organization_id = v_org and rc.stale;
  select count(*) into v_marks from custom.computed_org_mark m where m.organization_id = v_org;
  raise notice 'READSPEED3_B FIXTURE org % Customers %: % records, % stale kept values, % marks waiting', v_org, v_cust, v_n, v_stale, v_marks;
end
$w$;
commit;

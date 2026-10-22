-- READ-SPEED-7 a — A PARTIAL READER IS SERVED THE KEPT VALUE OF EVERY WORKED-OUT COLUMN WHOSE EVERY SOURCE SHE SEES,
-- AND OF NO OTHER (R3).
--
-- Built and rolled back here, in disposable organizations (nothing is left behind). A Customers-like Table and its Jobs:
-- each customer links several jobs; Customers works out job_count (roll-up count), job_total (roll-up sum of Amount),
-- cost_total (roll-up sum of Cost — confidential on Jobs), limit_x2 ({Credit limit} * 2 — confidential on Customers),
-- name_upper (UPPER({Name})) and size_band (IF({Job total} > 1000 ...) — a formula over a roll-up).
--   A  "View-only member": test@test.com is a member, sees every row of both Tables at viewer, not the confidential
--      columns. She must be served job_count, job_total, name_upper, size_band from the kept values, and never
--      cost_total or limit_x2.
--   B  "partial rows": test@test.com is a member who sees what she is shared — every Customer, ONE of the Jobs. Every
--      roll-up (and size_band) reads Jobs, which she does not see whole (the rows she reads are carried to her by the
--      Customers she is shared): only name_upper may be served.
--   C  "outsider with an interface share": test@test.com is not a member; an Interface list of Customers is shared to
--      her (custom.interface_rows; that door hands no worked-out column at all). Timed only.
-- RED when a column is served whose source she does not see (the served set is not exactly the hand-computed one, or
-- the page differs from the page worked out at read), and before READ-SPEED-7 a (nothing is served to A).
-- Plant a break: psql -v plant=1 serves every column to everyone (custom._computed_reader_cols answers all): RED.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed7_a_a_partial_reader_is_served_only_columns_she_sees_every_source_of.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '58s';
set local lock_timeout = '10s';
create temp table rs7a (k text primary key, v uuid) on commit drop;
create temp table rs7a_read (org text, path text, ms numeric, page jsonb, cols text[]) on commit drop;
grant select, insert on rs7a, rs7a_read to authenticated;

\if :{?plant}
-- THE PLANTED BREAK (rolled back with everything else): every worked-out column served to every reader.
create or replace function custom._computed_reader_cols(p_me uuid, p_org uuid, p_table uuid) returns text[]
language sql stable set search_path to 'pg_catalog' as $p$
  select coalesce(array_agg(fd.data ->> 'key'), '{}') from custom.record fd
   where fd.organization_id = p_org and fd.table_id = custom.field_kernel_id() and fd.deleted_at is null
     and fd.data ->> 'entity_definition_id' = p_table::text and custom.parity_type(fd.data) in ('lookup', 'rollup', 'formula')
$p$;
\endif

do $fixture$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com
  c_test    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';   -- test@test.com
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_spec text; v_org uuid; v_home uuid; v_cust uuid; v_jobs uuid; v_id uuid; v_c uuid[]; v_j uuid[]; i integer; v_ids uuid[]; v_t uuid; v_if uuid; v_back text;
begin
  perform set_config('app.actor_system', 'campaign-test/readspeed7_a', true);
  foreach v_spec in array array['A', 'B', 'C'] loop
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', c_admin_j, true);
    v_org := gen_random_uuid();
    insert into iam.organizations (id, name, slug, abbreviation, created_by)
    values (v_org, 'Larkspur Garage Doors ' || v_spec || ' ' || substr(v_org::text, 1, 8), 'larkspur-rs7a-' || lower(v_spec) || '-' || substr(v_org::text, 1, 8), 'LGD', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
    values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    if v_spec in ('A', 'B') then
      insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
      values (v_org, 'organization', v_org, c_test, 'member', 'active');
    end if;
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
    values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'readspeed7_a fixture');
    if v_spec in ('A', 'B') then
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
    perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'amount', 'label', 'Amount', 'type', 'currency', 'unit', '$', 'sort', 20));
    perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'cost', 'label', 'Cost', 'type', 'currency', 'unit', '$', 'sort', 30, 'sensitivity', 'confidential'));
    perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'customer', 'label', 'Customer', 'type', 'relation', 'relation_target', v_cust, 'sort', 40));
    select coalesce(nullif(f.data ->> 'inverse_key', ''), 'linked_' || replace(f.id::text, '-', '')) into v_back from custom.record f
     where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'customer';
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'sort', 10, 'required', true));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'credit_limit', 'label', 'Credit limit', 'type', 'currency', 'unit', '$', 'sort', 20, 'sensitivity', 'confidential'));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'jobs', 'label', 'Jobs', 'type', 'relation', 'relation_target', v_jobs, 'multi', true, 'sort', 30));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'job_count', 'label', 'Job count', 'type', 'rollup', 'via', 'jobs', 'agg', 'count', 'of', 'title', 'sort', 40));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'job_total', 'label', 'Job total', 'type', 'rollup', 'via', 'jobs', 'agg', 'sum', 'of', 'amount', 'sort', 50));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'cost_total', 'label', 'Cost total', 'type', 'rollup', 'via', 'jobs', 'agg', 'sum', 'of', 'cost', 'sort', 60));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'limit_x2', 'label', 'Limit x2', 'type', 'formula', 'formula_text', '{Credit limit} * 2', 'sort', 70));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'name_upper', 'label', 'Name upper', 'type', 'formula', 'formula_text', 'UPPER({Name})', 'sort', 80));
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'size_band', 'label', 'Size band', 'type', 'formula', 'formula_text', 'IF({Job total} > 1000, "Big", "Small")', 'sort', 90));
    -- a roll-up through the BACK-link (Jobs.customer): worked out at read through her row predicate on Jobs
    perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'linked_count', 'label', 'Linked jobs', 'type', 'rollup', 'via', v_back, 'agg', 'count', 'of', 'title', 'sort', 100));
    v_j := '{}'; v_c := '{}';
    for i in 1..30 loop
      v_id := custom.record_write(v_org, v_jobs, jsonb_build_object('title', 'Spring replacement ' || i, 'amount', 150 + i * 10, 'cost', 90 + i * 5));
      v_j := v_j || v_id;
    end loop;
    for i in 1..12 loop
      v_id := custom.record_write(v_org, v_cust, jsonb_build_object('name', 'Customer ' || i, 'credit_limit', 1000 * i,
                'jobs', to_jsonb(array[v_j[i], v_j[i + 12]] || case when i <= 6 then array[v_j[i + 24]] else '{}'::uuid[] end)));
      v_c := v_c || v_id;
      perform custom.record_update(v_org, v_j[i], jsonb_build_object('customer', v_id));
      perform custom.record_update(v_org, v_j[i + 12], jsonb_build_object('customer', v_id));
      if i <= 6 then perform custom.record_update(v_org, v_j[i + 24], jsonb_build_object('customer', v_id)); end if;
    end loop;
    insert into rs7a values ('org_' || v_spec, v_org), ('cust_' || v_spec, v_cust), ('jobs_' || v_spec, v_jobs);
    if v_spec = 'A' then   -- View-only: both Tables shared to her at viewer
      perform custom.share_grant(v_org, v_cust, 'person', c_test, 'viewer'::public.permission_level);
      perform custom.share_grant(v_org, v_jobs, 'person', c_test, 'viewer'::public.permission_level);
    end if;
    if v_spec = 'B' then
      perform custom.share_grant(v_org, v_cust, 'person', c_test, 'viewer'::public.permission_level);
      perform custom.share_grant(v_org, v_j[1], 'person', c_test, 'viewer'::public.permission_level);   -- one job: Customer 1's first
    end if;
    if v_spec = 'C' then
      perform set_config('role', 'authenticated', true);
      v_if := custom.dashboard_declare(v_org, v_cust, 'Customer desk', '[]'::jsonb, jsonb_build_object('kind', 'interface',
        'published', jsonb_build_object('version', 1, 'pages', jsonb_build_array(jsonb_build_object('id', 'p1', 'name', 'Customers',
          'blocks', jsonb_build_array(jsonb_build_object('id', 'e-list', 'kind', 'list', 'table_id', v_cust,
            'columns', jsonb_build_array('name', 'job_count', 'job_total', 'name_upper'))))))), null);
      perform set_config('role', 'postgres', true);
      perform custom.share_grant(v_org, v_if, 'user', c_test, 'viewer'::public.permission_level);
      insert into rs7a values ('if_C', v_if);
    end if;
    -- the refresh job's work for these two Tables, then the refresh door's reader work for test@test.com
    perform set_config('request.jwt.claims', '', true);
    perform custom._computed_mark_tables(v_org, array[v_cust, v_jobs]);
    perform custom._computed_apply_org_mark(v_org);
    foreach v_t in array array[v_cust, v_jobs] loop
      loop
        select coalesce(array_agg(x.record_id), '{}') into v_ids from (select rc.record_id from custom.record_computed rc
          where rc.organization_id = v_org and rc.table_id = v_t and rc.stale limit 500) x;
        exit when cardinality(v_ids) = 0;
        perform custom.computed_refresh(v_org, v_t, v_ids);
      end loop;
    end loop;
    if v_spec in ('A', 'B') then
      perform custom._computed_warm(c_test, v_org, v_cust);
    end if;
  end loop;
end
$fixture$;

-- the reads, each its own statement (a page read is): served first, then the same page worked out at read
do $t$
declare r record; v0 timestamptz; v_page jsonb; v_cols text[]; v_whole boolean;
begin
  for r in select (select v from rs7a where k = 'org_' || s) org, (select v from rs7a where k = 'cust_' || s) cust, s from unnest(array['A', 'B']) s loop
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
    v_cols := null;
    if to_regprocedure('custom._computed_reader_cols_ok(uuid,uuid,uuid)') is not null then   -- absent before READ-SPEED-7 a
      execute 'select custom._computed_reader_cols_ok($1, $2, $3)' into v_cols using '4060701e-706a-4c76-b3ca-0bbc69fa5a14'::uuid, r.org, r.cust;
    end if;
    insert into rs7a_read (org, path, cols) values (r.s, 'cols', v_cols);
    select vs.o_all_visible into v_whole from custom.visible_set('4060701e-706a-4c76-b3ca-0bbc69fa5a14', r.org, (select v from rs7a where k = 'jobs_' || r.s), 'viewer') vs;
    perform set_config('request.jwt.claims', '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}', true);
    perform set_config('role', 'authenticated', true);
    raise notice '% — she sees Jobs whole: %, Jobs rows she reads: %', r.s, v_whole,
      jsonb_array_length(custom.read_records_page(r.org, (select v from rs7a where k = 'jobs_' || r.s), '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null) -> 'rows');
    v0 := clock_timestamp();
    v_page := custom.read_records_page(r.org, r.cust, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
    insert into rs7a_read (org, path, ms, page) values (r.s, 'served', extract(epoch from clock_timestamp() - v0) * 1000, v_page);
  end loop;
  perform set_config('role', 'postgres', true);
end
$t$;
do $t$
declare r record; v0 timestamptz; v_page jsonb;
begin
  for r in select (select v from rs7a where k = 'org_' || s) org, (select v from rs7a where k = 'cust_' || s) cust, s from unnest(array['A', 'B']) s loop
    perform set_config('request.jwt.claims', '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}', true);
    perform set_config('role', 'authenticated', true);
    perform set_config('mx.computed_store', 'off', true);
    v0 := clock_timestamp();
    v_page := custom.read_records_page(r.org, r.cust, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
    insert into rs7a_read (org, path, ms, page) values (r.s, 'read-time', extract(epoch from clock_timestamp() - v0) * 1000, v_page);
  end loop;
  perform set_config('mx.computed_store', '', true);
  perform set_config('request.jwt.claims', '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}', true);
  perform set_config('role', 'authenticated', true);
  v0 := clock_timestamp();
  v_page := custom.interface_rows((select v from rs7a where k = 'if_C'), 'e-list', null, 50, 0);
  insert into rs7a_read (org, path, ms, page) values ('C', 'interface', extract(epoch from clock_timestamp() - v0) * 1000, v_page);
  perform set_config('role', 'postgres', true);
end
$t$;

do $t$
declare
  v_fail text[] := '{}'; s text; v_cols text[]; v_want text[]; v_srv jsonb; v_slow jsonb; v_row jsonb; v_c1 jsonb; v_if jsonb;
begin
  perform set_config('role', 'postgres', true);
  foreach s in array array['A', 'B'] loop
    select cols into v_cols from rs7a_read where org = s and path = 'cols';
    select page into v_srv from rs7a_read where org = s and path = 'served';
    select page into v_slow from rs7a_read where org = s and path = 'read-time';
    v_want := case s when 'A' then array['job_count', 'job_total', 'linked_count', 'name_upper', 'size_band'] else array['name_upper'] end;
    raise notice '% — served % ms, read-time % ms, % rows; served columns %', s,
      (select round(ms) from rs7a_read where org = s and path = 'served'), (select round(ms) from rs7a_read where org = s and path = 'read-time'),
      jsonb_array_length(v_srv -> 'rows'), coalesce(v_cols::text, 'none kept');
    if v_cols is null or (select array_agg(x order by x) from unnest(v_cols) x) is distinct from (select array_agg(x order by x) from unnest(v_want) x) then
      v_fail := v_fail || format('%s: served columns %s, expected exactly %s (a served column whose source she does not see is a leak)', s, coalesce(v_cols::text, 'none'), v_want);
    end if;
    if jsonb_array_length(coalesce(v_srv -> 'rows', '[]'::jsonb)) <> 12 then
      v_fail := v_fail || format('%s: %s rows, not 12', s, jsonb_array_length(coalesce(v_srv -> 'rows', '[]'::jsonb)));
    end if;
    if v_srv is distinct from v_slow then
      v_fail := v_fail || format('%s: the served page differs from the page worked out at read', s);
    end if;
    select e into v_c1 from jsonb_array_elements(v_srv -> 'rows') e where e::text like '%"Customer 1"%' and e::text not like '%"Customer 1_"%' limit 1;
    raise notice '%   Customer 1 as served: level % job_count % job_total % size_band % name_upper % linked_count % | hidden %', s, v_c1 ->> 'level', v_c1 -> 'document' -> 'job_count',
      v_c1 -> 'document' -> 'job_total', v_c1 -> 'document' -> 'size_band', v_c1 -> 'document' -> 'name_upper', v_c1 -> 'document' -> 'linked_count', (select array_agg(k) from jsonb_object_keys(coalesce(v_c1 -> 'document' -> '_hidden', '{}'::jsonb)) k);
    if v_c1::text ~ '"(cost_total|limit_x2|credit_limit)": *[0-9]' then
      v_fail := v_fail || format('%s: a confidential value reached her: %s', s, left(v_c1::text, 300));
    end if;
  end loop;
  select page into v_if from rs7a_read where org = 'C' and path = 'interface';
  raise notice 'C — interface list as an outsider % ms, % rows, worked-out columns handed: %',
    (select round(ms) from rs7a_read where org = 'C' and path = 'interface'), jsonb_array_length(coalesce(v_if -> 'rows', '[]'::jsonb)),
    (select count(*) from jsonb_array_elements(coalesce(v_if -> 'rows', '[]'::jsonb)) e, jsonb_object_keys(e -> 'document') k where k in ('job_count', 'job_total', 'name_upper'));
  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — each partial reader is served exactly the columns whose every source she sees, identical to the read-time page';
end
$t$;

rollback;

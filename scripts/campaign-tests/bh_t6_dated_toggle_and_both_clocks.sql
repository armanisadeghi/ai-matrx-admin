-- LANE BUILD-HIST (BH-) — ACCEPTANCE TEST 6 THE WAY A PERSON DOES IT.
--
-- Arman (§ 6): "ABC's address Field is dated. Address was X until June 2024, then Y. In September 2026
-- someone records this correction. As-of March 2024 returns X. As-of March 2025 returns Y. 'What did the
-- system say in August 2026, before the correction' returns whatever was stored then."
-- w3_hist_c17 PART 2 declares the field dated at birth. A person turns "Each value has its own date" ON
-- for an Address column that already holds a value (custom.field_update {dated:true}), then saves the
-- periods the way @ai-matrx/records `setValuePeriods` sends them (whole _values block). Rolled back.
-- RED (`-v red=1`): the field is never marked dated, so the periods are refused by the field's name.
--
-- Run: psql "<main dsn>" -X -v ON_ERROR_STOP=1 -f scripts/campaign-tests/bh_t6_dated_toggle_and_both_clocks.sql

\set ON_ERROR_STOP on
\timing off
\set suite 'bh_t6_dated_toggle_and_both_clocks.sql'
\set requires 'grant:authenticated:custom.query_record_as_of'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
\if :{?red}
\else
\set red 0
\endif


begin;
set local statement_timeout = '120s';
select set_config('bh.red', :'red', true);

do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_boss text := current_user;
  v_home uuid; v_tbl uuid; v_fld uuid; v_rec uuid; v_doc jsonb; v_said_then timestamptz; v_msg text;
begin
  perform set_config('app.actor_system', 'campaign-test/bh_t6', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'BH- Harbor Freight Brokers', 'bh-harbor-' || substr(v_org::text,1,8), 'BHH', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'campaign-test/bh_t6');
  insert into custom.record (organization_id, table_id, data)
  values (v_org, null, jsonb_build_object('name', 'BH- Harbor — Main Office')) returning id into v_home;

  perform set_config('role', 'authenticated', true);
  v_tbl := custom.table_declare(v_org, jsonb_build_object('name','BH- Clients','slug','bh_clients','type','entity',
    'label_singular','Client','label_plural','Clients','title_field','cname','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',30,
    'fields', jsonb_build_array(jsonb_build_object('name','cname')),'parent_id', v_home::text));
  v_fld := custom.field_declare(v_org, v_tbl, jsonb_build_object('key','address','label','Address','type','text'));
  v_rec := custom.record_write(v_org, v_tbl, jsonb_build_object('cname','BH- ABC Logistics','address','X','parent_id',v_home::text));

  -- What the store said BEFORE the correction (the recorded clock), moved back to August 2026.
  perform set_config('role', v_boss, true);
  update history.row_versions set occurred_at = timestamptz '2026-08-01 12:00+00' where organization_id = v_org and row_id = v_rec;
  update history.capture_window set opened_at = least(opened_at, timestamptz '2026-07-01 00:00+00') where entity_type = 'custom.record';
  perform set_config('role', 'authenticated', true);
  v_said_then := timestamptz '2026-08-15 12:00+00';

  -- (a) The person turns dates on for the existing column.
  if current_setting('bh.red', true) <> '1' then
    perform custom.field_update(v_org, v_fld, jsonb_build_object('dated', true));
  end if;

  -- (b) September: the correction, X until June 2024 then Y — the patch setValuePeriods builds.
  v_msg := null;
  begin
    perform custom.record_update(v_org, v_rec, jsonb_build_object(
      'address', 'Y',
      '_values', jsonb_build_object('address', jsonb_build_object('dated', jsonb_build_array(
        jsonb_build_object('from', null, 'to', '2024-06-01', 'value', 'X'),
        jsonb_build_object('from', '2024-06-01', 'to', null, 'value', 'Y'))))));
  exception when check_violation then
    get stacked diagnostics v_msg = message_text;
  end;
  if v_msg is not null then raise exception 'T6 (b): the periods were refused after dates were turned on — "%"', v_msg; end if;

  -- (c) World clock: March 2024 → X, March 2025 → Y.
  v_doc := custom.query_record_as_of(v_org, v_rec, null, date '2024-03-01');
  if (v_doc ->> 'address') is distinct from 'X' then raise exception 'T6 (c): March 2024 read %', v_doc -> 'address'; end if;
  v_doc := custom.query_record_as_of(v_org, v_rec, null, date '2025-03-01');
  if (v_doc ->> 'address') is distinct from 'Y' then raise exception 'T6 (c): March 2025 read %', v_doc -> 'address'; end if;

  -- (d) Recorded clock: what the system said in August 2026, before the correction → X.
  v_doc := custom.query_record_as_of(v_org, v_rec, v_said_then, null);
  if (v_doc ->> 'address') is distinct from 'X' then raise exception 'T6 (d): August 2026 (said then) read %', v_doc -> 'address'; end if;

  -- (e) Today the record says Y, and the field keeps its dates.
  v_doc := custom.query_record_as_of(v_org, v_rec, now(), null);
  if (v_doc ->> 'address') is distinct from 'Y' or jsonb_array_length(v_doc -> '_values' -> 'address' -> 'dated') <> 2 then
    raise exception 'T6 (e): today reads % with periods %', v_doc -> 'address', v_doc -> '_values' -> 'address';
  end if;

  raise notice 'T6 PASSED — dates turned on for an existing Address; X until June 2024 then Y saved; world March 2024 X, March 2025 Y; said in August 2026 X; today Y.';
end
$t$;

rollback;

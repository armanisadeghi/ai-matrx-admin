-- ROLLUP-FILTER (a) — A ROLL-UP FILTER ACCEPTS SEVERAL VALUES PER COLUMN.
--
-- WHAT THIS PROVES. A roll-up's `config.filter` takes, per column: (a) one value (unchanged), (b) an
-- any-of list {"status": ["sent","Overdue"]} matching key OR label, (c) a not-in form
-- {"status": {"not": ["draft","cancelled"]}} (a single word works too), (d) the relative window.
-- "Awaiting payment" = the invoices whose status is Sent OR Overdue; "Billed" = everything except
-- Draft and Cancelled.
--
-- RED before migrations/campaign/rollupfilter_a_*.sql: the {"not": ...} form is refused/ignored.
-- GREEN after: 400 awaiting (Sent+Overdue by key and by label), 700 not-draft/cancelled, 1000 with `not` of one word.
-- Everything is rolled back. Run: binlocal/p.sh -f scripts/campaign-tests/rollupfilter_a_green.sql
\set ON_ERROR_STOP on
\set suite 'rollupfilter_a_green.sql'
\set requires 'exec:custom.record_write|exec:custom.table_declare|exec:custom.field_declare|exec:custom.field_update'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';
create temp table rf_fx (k text primary key, v text) on commit drop;
create temp table rf_res (check_name text, ok boolean, detail text) on commit drop;
grant all on rf_fx, rf_res to authenticated, service_role;

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com
  v_org uuid; v_home uuid; v_inv uuid; v_cli uuid; v_c uuid;
  v_ids text[] := '{}'; v_i uuid; s text; amt numeric;
begin
  insert into iam.organizations (name, slug, abbreviation, created_by)
  values ('Lakeside Plumbing Rollup Test', 'rf-test-' || substr(md5(random()::text),1,8), 'LPR', c_admin) returning id into v_org;
  insert into iam.memberships (organization_id, user_id, role, status, container_type, container_id)
  values (v_org, c_admin, 'owner', 'active', 'organization', v_org);
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value)
  values ('custom','system_enabled','organization', v_org, v_org, 'true');
  perform set_config('app.actor_system','campaign-test/rollupfilter_a_green', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  perform set_config('role','authenticated', true);
  v_home := custom.record_write(v_org, custom.person_kernel_id(), jsonb_build_object('name','Rollup filter test'));

  v_inv := custom.table_declare(v_org, jsonb_build_object('name','Invoices','slug','rf_inv_' || substr(md5(random()::text),1,8),'type','entity',
    'label_singular','Invoice','label_plural','Invoices','title_field','number','display','list','weight','light','ordered',false,
    'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'on_delete','cascade',
    'fields', jsonb_build_array(jsonb_build_object('name','number')), 'parent_id', v_home::text));
  perform custom.field_declare(v_org, v_inv, jsonb_build_object('key','number','label','Number','type','text'));
  perform custom.field_declare(v_org, v_inv, jsonb_build_object('key','status','label','Status','type','select',
    'options', jsonb_build_array('Draft','Sent','Overdue','Paid','Cancelled')));
  perform custom.field_declare(v_org, v_inv, jsonb_build_object('key','amount','label','Amount','type','currency','unit','$'));
  v_cli := custom.table_declare(v_org, jsonb_build_object('name','Clients','slug','rf_cli_' || substr(md5(random()::text),1,8),'type','entity',
    'label_singular','Client','label_plural','Clients','title_field','name','display','list','weight','light','ordered',false,
    'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'on_delete','cascade',
    'fields', jsonb_build_array(jsonb_build_object('name','name')), 'parent_id', v_home::text));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','name','label','Name','type','text'));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','invoices','label','Invoices','type','relation','relation_target',v_inv,'multi',true));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','awaiting','label','Awaiting payment','type','rollup','via','invoices','agg','sum','of','amount',
    'filter', jsonb_build_object('status', jsonb_build_array('sent','overdue'))));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','awaiting_n','label','Awaiting count','type','rollup','via','invoices','agg','count',
    'filter', jsonb_build_object('status', jsonb_build_array('Sent','OVERDUE'))));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','billed','label','Billed','type','rollup','via','invoices','agg','sum','of','amount',
    'filter', jsonb_build_object('status', jsonb_build_object('not', jsonb_build_array('draft','Cancelled')))));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','not_paid','label','Not paid','type','rollup','via','invoices','agg','sum','of','amount',
    'filter', jsonb_build_object('status', jsonb_build_object('not', 'Paid'))));
  perform custom.field_declare(v_org, v_cli, jsonb_build_object('key','one_paid','label','One paid','type','rollup','via','invoices','agg','sum','of','amount',
    'filter', jsonb_build_object('status', 'paid')));

  -- Draft 100, Sent 150, Overdue 250, Paid 300, Cancelled 200
  foreach s in array array['Draft','Sent','Overdue','Paid','Cancelled'] loop
    amt := case s when 'Draft' then 100 when 'Sent' then 150 when 'Overdue' then 250 when 'Paid' then 300 else 200 end;
    v_i := custom.record_write(v_org, v_inv, jsonb_build_object('number','INV-'||s,'status',s,'amount',amt));
    v_ids := v_ids || v_i::text;
  end loop;
  v_c := custom.record_write(v_org, v_cli, jsonb_build_object('name','Okafor Dental', 'invoices', to_jsonb(v_ids)));
  reset role;
  insert into rf_fx values ('org', v_org::text), ('cli', v_c::text), ('clit', v_cli::text);
end;
$t$;

do $t$
declare
  v_org uuid := (select v::uuid from rf_fx where k='org');
  v_c uuid := (select v::uuid from rf_fx where k='cli');
  v jsonb;
begin
  v := custom.record_values(v_org, v_c);
  insert into rf_res values
    ('1a any-of by key: Sent+Overdue = 400', (v ->> 'awaiting') = '400', v ->> 'awaiting'),
    ('1b any-of by label (case-insensitive): 2 records', (v ->> 'awaiting_n') = '2', v ->> 'awaiting_n'),
    ('1c not-in a list: everything except Draft/Cancelled = 700', (v ->> 'billed') = '700', v ->> 'billed'),
    ('1d not-in one word: everything except Paid = 700', (v ->> 'not_paid') = '700', v ->> 'not_paid'),
    ('1e single value unchanged: Paid = 300', (v ->> 'one_paid') = '300', v ->> 'one_paid');
end;
$t$;

select check_name, case when ok then 'ok' else 'FAIL' end as result, left(detail, 110) as detail from rf_res order by check_name;
do $t$
declare v_bad integer := (select count(*) from rf_res where not ok);
begin
  if v_bad > 0 then raise exception 'rollupfilter_a_green: % check(s) FAILED (RED)', v_bad; end if;
  raise notice 'rollupfilter_a_green: all % checks passed (GREEN)', (select count(*) from rf_res);
end;
$t$;
rollback;

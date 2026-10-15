-- LANE NOTION-AUTO (2026-10-14) — THE GREEN SUITE for (1) an autonumber backfill that moves the counter and
-- (2) custom.field_make_automatic keeping every record's imported value.
--
-- WHAT MAKES IT FAIL:
--   1  six rows backfilled, then the next new row is not 7 (it was 1: the backfill's save changed nothing the
--      row trigger watches, so no number was ever stored), or the backfill counted rows as changed.
--   2  a plain ID column converted in place: the imported numbers 10..50 not kept, the row without one not
--      numbered after the highest (51), the next new row not 52.
--   3  Created time / Last edited time columns losing the imported moments, Created time moving on an edit,
--      Last edited time not moving on an edit.
--   4  Created by / Last changed by not keeping the imported person, or never handing over to the real writer.
--   5  a stranger converting the column, a non-column, or a word that is not an automatic kind.

\set ON_ERROR_STOP on
\timing off

\set suite 'notionauto_green.sql'
\set requires 'function:custom.field_make_automatic'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';

do $t$
declare
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_stranger constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  v_org constant uuid := 'e7b04d54-6939-4d69-a4e1-d9f11459d3bb';   -- admin's test org "Lumen Social — agent move"
  v_home constant text := '061b5187-cac3-43ad-8359-d8561417f977';
  t1 uuid; t2 uuid; f uuid; v_res jsonb; v_ids uuid[] := '{}'; i int; v_new uuid; v_row jsonb;
  f_id uuid; f_cr uuid; f_ed uuid; f_by uuid; f_eb uuid; v_upd_before timestamptz; v_ver_before integer; v_caught text;
  c_table constant text := '''type'',''entity'',''label_singular'',''Row'',''label_plural'',''Rows'',''title_field'',''title'',''display'',''list'',''weight'',''light'',''ordered'',true,''row_order'',''sorted'',''retention_days'',3650';
begin
  if not exists (select 1 from custom.record where organization_id = v_org limit 1) then
    raise notice 'SKIPPED: the test organization is not in this database';
    return;
  end if;
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  if current_user is distinct from 'authenticated' then raise exception '0: not seated'; end if;

  -- ══ PART 1 — A BACKFILL MOVES THE COUNTER ═══════════════════════════════════════════════
  t1 := custom.table_declare(v_org, jsonb_build_object('name','NA proof one','slug','na_proof_one','type','entity','label_singular','Row','label_plural','Rows','title_field','title','display','list','weight','light','ordered',true,'row_order','sorted','retention_days',3650,'default_sort',jsonb_build_array(jsonb_build_object('field','title','direction','asc')),'parent_id',v_home,'agent_writable',true,'fields',jsonb_build_array(jsonb_build_object('name','title'))));
  for i in 1..6 loop
    v_ids := v_ids || custom.record_write(v_org, t1, jsonb_build_object('title', 'Post ' || i));
  end loop;
  perform set_config('role', 'postgres', true);
  select r.updated_at, r.version into v_upd_before, v_ver_before from custom.record r where r.id = v_ids[1];
  perform set_config('role', 'authenticated', true);
  f := custom.field_declare(v_org, t1, jsonb_build_object('key','id','label','ID','type','autonumber','sort',5));
  v_res := custom.autonumber_backfill(v_org, f);
  if (v_res ->> 'numbered')::int is distinct from 6 or (v_res ->> 'highest')::int is distinct from 6 then
    raise exception '1a: the backfill said % (it must report the highest number it stored)', v_res;
  end if;
  v_new := custom.record_write(v_org, t1, jsonb_build_object('title','Post 7'));
  if (custom.read_record(v_org, v_new, false) ->> 'id')::int is distinct from 7 then
    raise exception '1b: the next new row got %, not 7', custom.read_record(v_org, v_new, false) ->> 'id';
  end if;
  perform set_config('role', 'postgres', true);
  if (select r.updated_at <> v_upd_before or r.version <> v_ver_before from custom.record r where r.id = v_ids[1]) then
    raise exception '1c: the backfill counted the record as edited';
  end if;
  perform set_config('role', 'authenticated', true);
  raise notice '1 PASS — six rows numbered 1..6, the next new row is 7, nobody was marked edited.';

  -- ══ PART 2 — IN PLACE, KEEPING THE VALUES ═════════════════════════════════════════════════
  t2 := custom.table_declare(v_org, jsonb_build_object('name','NA proof two','slug','na_proof_two','type','entity','label_singular','Row','label_plural','Rows','title_field','title','display','list','weight','light','ordered',true,'row_order','sorted','retention_days',3650,'default_sort',jsonb_build_array(jsonb_build_object('field','title','direction','asc')),'parent_id',v_home,'agent_writable',true,'fields',jsonb_build_array(jsonb_build_object('name','title'))));
  f_id := custom.field_declare(v_org, t2, jsonb_build_object('key','nid','label','ID','type','number','sort',10));
  f_cr := custom.field_declare(v_org, t2, jsonb_build_object('key','made_at','label','Created time','type','datetime','sort',20));
  f_ed := custom.field_declare(v_org, t2, jsonb_build_object('key','edited_at','label','Last edited time','type','datetime','sort',30));
  f_by := custom.field_declare(v_org, t2, jsonb_build_object('key','made_by','label','Created by','type','text','sort',40));
  f_eb := custom.field_declare(v_org, t2, jsonb_build_object('key','edited_by','label','Last edited by','type','text','sort',50));
  v_ids := '{}';
  for i in 1..5 loop
    v_ids := v_ids || custom.record_write(v_org, t2, jsonb_build_object('title','Item '||i,'nid', i*10.0,   -- the importer's parser hands numbers over as 10.0
       'made_at', '2024-0'||i||'-01T10:00:00Z', 'edited_at', '2025-0'||i||'-15T09:30:00Z', 'made_by','Ana Whitfield','edited_by','Dev Patel'));
  end loop;
  v_ids := v_ids || custom.record_write(v_org, t2, jsonb_build_object('title','Item 6'));

  perform set_config('request.jwt.claims', c_stranger, true);
  begin perform custom.field_make_automatic(v_org, f_id, 'autonumber'); raise exception '5a: a stranger converted the column';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims', c_admin, true);
  begin perform custom.field_make_automatic(v_org, f_id, 'sparkles'); raise exception '5b: a made-up kind was accepted';
  exception when check_violation then null; end;
  begin perform custom.field_make_automatic(v_org, v_ids[1], 'autonumber'); raise exception '5c: a record was converted as a column';
  exception when foreign_key_violation then null; end;

  perform custom.field_make_automatic(v_org, f_id, 'autonumber');
  perform custom.field_make_automatic(v_org, f_cr, 'created_time');
  perform custom.field_make_automatic(v_org, f_ed, 'modified_time');
  perform custom.field_make_automatic(v_org, f_by, 'created_by');
  perform custom.field_make_automatic(v_org, f_eb, 'modified_by');
  if (custom.field_make_automatic(v_org, f_id, 'autonumber') ->> 'changed')::boolean then raise exception '2z: a second conversion changed something'; end if;

  v_row := custom.read_record(v_org, v_ids[3], false);
  if (v_row ->> 'nid')::int is distinct from 30 then raise exception '2a: the imported ID 30 became %', v_row ->> 'nid'; end if;
  if (custom.read_record(v_org, v_ids[6], false) ->> 'nid')::int is distinct from 51 then
    raise exception '2b: the row with no ID got %, not 51', custom.read_record(v_org, v_ids[6], false) ->> 'nid';
  end if;
  v_new := custom.record_write(v_org, t2, jsonb_build_object('title','Item 7 new'));
  if (custom.read_record(v_org, v_new, false) ->> 'nid')::int is distinct from 52 then
    raise exception '2c: the next new row got %, not 52', custom.read_record(v_org, v_new, false) ->> 'nid';
  end if;
  raise notice '2 PASS — imported IDs 10..50 kept, the row without one is 51, the next new row is 52.';

  -- ══ PART 3 — THE TWO STAMPS ═══════════════════════════════════════════════════════════════
  if (v_row ->> 'made_at')::timestamptz is distinct from '2024-03-01T10:00:00Z'::timestamptz
     or (v_row ->> 'edited_at')::timestamptz is distinct from '2025-03-15T09:30:00Z'::timestamptz then
    raise exception '3a: the imported moments were lost: % / %', v_row ->> 'made_at', v_row ->> 'edited_at';
  end if;
  perform set_config('role', 'postgres', true);
  -- the conversion "happened an hour ago" so an edit in this transaction is a later moment
  perform set_config('app.relabel_keeps_updated_at', 'on', true);
  update custom.record set data = jsonb_set(data, '{_retired}', (select jsonb_agg(e || jsonb_build_object('at', to_jsonb(now() - interval '1 hour'))) from jsonb_array_elements(data -> '_retired') e))
   where id = any (v_ids) and jsonb_typeof(data -> '_retired') = 'array';
  perform set_config('app.relabel_keeps_updated_at', '', true);
  perform set_config('role', 'authenticated', true);
  perform custom.record_update(v_org, v_ids[2], jsonb_build_object('title','Item 2 edited'));
  v_row := custom.read_record(v_org, v_ids[2], false);
  if (v_row ->> 'made_at')::timestamptz is distinct from '2024-02-01T10:00:00Z'::timestamptz then
    raise exception '3b: Created time moved on an edit: %', v_row ->> 'made_at';
  end if;
  if (v_row ->> 'edited_at')::timestamptz < now() - interval '1 minute' then
    raise exception '3c: Last edited time did not move on an edit: %', v_row ->> 'edited_at';
  end if;
  if (custom.read_record(v_org, v_ids[1], false) ->> 'edited_at')::timestamptz is distinct from '2025-01-15T09:30:00Z'::timestamptz then
    raise exception '3d: an untouched record''s Last edited time moved';
  end if;
  raise notice '3 PASS — both stamps kept; created stays, last edited moves only on an edit.';

  -- ══ PART 4 — THE PEOPLE ═══════════════════════════════════════════════════════════════════
  if v_row -> 'made_by' ->> 'name' is distinct from 'Ana Whitfield' then raise exception '4a: Created by lost the imported person: %', v_row -> 'made_by'; end if;
  if v_row -> 'edited_by' ->> 'name' is not distinct from 'Dev Patel' then raise exception '4b: Last edited by still names the imported person after an edit'; end if;
  if custom.read_record(v_org, v_ids[1], false) -> 'edited_by' ->> 'name' is distinct from 'Dev Patel' then raise exception '4c: an untouched record lost its imported Last edited by'; end if;
  if custom.read_record(v_org, v_new, false) -> 'made_by' ->> 'id' is distinct from '87a6e699-3622-4869-8843-d0867456c0dd' then raise exception '4d: a new record does not name its real writer'; end if;
  raise notice '4 PASS — imported people kept; the real writer takes over on an edit and on every new record.';
  raise notice 'NOTIONAUTO GREEN — every part passed.';
end
$t$;

rollback;

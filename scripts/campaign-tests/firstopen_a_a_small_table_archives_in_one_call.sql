-- LANE FIRST-OPEN (item 5) - A SMALL TABLE ARCHIVES IN ONE CALL.
-- The client (archiveTableFromHome) asks once for a count (chunk 0) and then calls custom.table_archive with chunk 20 until `done`.
-- A table of three columns and three rows used to need three of those passes (a pass held two door calls of 0.3-0.7 s under
-- the 1 s window); migrations/campaign/firstopen_a_a_small_table_archives_in_one_call.sql lets a table whose tail is 12 rows or fewer
-- take one pass. A table with a big tail (20 columns) must NOT take the long window: it still needs several passes,
-- so no call runs towards PostgREST's 8 s cancel.
-- Run from the repo root:  ~/lane-resume/rso3/psql.sh -f scripts/campaign-tests/firstopen_a_a_small_table_archives_in_one_call.sql
-- ONE transaction, ROLLBACK at the end. It runs in the admin's own organization (one of the biggest), because the cost of a door step
-- is what it is there: about 0.3 s a step, which is why two steps filled the 1 s window.
\set ON_ERROR_STOP on
\timing off
\set suite 'firstopen_a_a_small_table_archives_in_one_call.sql'
\set requires 'function:custom.table_archive|function:custom.table_declare|function:custom.record_write'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local lock_timeout = '40s';
set local statement_timeout = '240s';
create temp table fo (k text primary key, v text) on commit drop;
grant select, insert on fo to authenticated;

do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';  -- admin@admin.com's AI Matrx organization: a big one, where a door step costs real time
  v_home uuid; v_small uuid; v_big uuid; v_fields jsonb; i int;
begin
  perform set_config('app.actor_system', 'campaign-test/firstopen', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  if not exists (select 1 from iam.organizations where id = v_org) then raise exception 'SKIPPED: the admin organization is absent here'; end if;
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;
  v_small := custom.table_declare(v_org, jsonb_build_object('name', 'Boarding Waitlist', 'slug', 'boarding_waitlist', 'type', 'entity',
    'label_singular', 'Pet', 'label_plural', 'Pets', 'title_field', 'name', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')), 'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'name'))));
  perform custom.field_declare(v_org, v_small, jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'sort', 10));
  perform custom.field_declare(v_org, v_small, jsonb_build_object('key', 'email', 'label', 'Email', 'type', 'text', 'sort', 20));
  perform custom.field_declare(v_org, v_small, jsonb_build_object('key', 'phone', 'label', 'Phone', 'type', 'text', 'sort', 30));
  for i in 4..8 loop
    perform custom.field_declare(v_org, v_small, jsonb_build_object('key', 'extra_' || i, 'label', 'Extra ' || i, 'type', 'text', 'sort', i * 10));
  end loop;
  for i in 4..8 loop
    perform custom.field_declare(v_org, v_small, jsonb_build_object('key', 'extra_' || i, 'label', 'Extra ' || i, 'type', 'text', 'sort', i * 10));
  end loop;
  v_big := custom.table_declare(v_org, jsonb_build_object('name', 'Wide Intake', 'slug', 'wide_intake', 'type', 'entity',
    'label_singular', 'Intake', 'label_plural', 'Intakes', 'title_field', 'col_1', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')), 'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'col_1'))));
  for i in 1..20 loop
    perform custom.field_declare(v_org, v_big, jsonb_build_object('key', 'col_' || i, 'label', 'Col ' || i, 'type', 'text', 'sort', i * 10));
  end loop;
  for i in 1..3 loop
    perform custom.record_write(v_org, v_small, jsonb_build_object('name', 'Pet ' || i, 'email', 'p' || i || '@example.test', 'phone', '555000' || i));
  end loop;
  select count(*) into i from custom.table_contents(v_org, v_small) where kind = 'field';
  if i < 8 then raise exception 'FIXTURE: the small table has % columns, wanted 8 or more', i; end if;
  select count(*) into i from custom.table_contents(v_org, v_big) where kind = 'field';
  if i < 20 then raise exception 'FIXTURE: the big table has % columns, wanted 20 or more', i; end if;
  insert into fo values ('org', v_org::text), ('small', v_small::text), ('big', v_big::text);
end $t$;

do $t$
declare
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid; v_small uuid; v_big uuid; r jsonb; t0 timestamptz; n int; worst numeric; ms numeric;
begin
  select v::uuid into v_org from fo where k = 'org'; select v::uuid into v_small from fo where k = 'small'; select v::uuid into v_big from fo where k = 'big';
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);
  -- the small table, the way the client does it: one count, then passes
  r := custom.table_archive(v_org, v_small, 0, true);
  n := 0; worst := 0;
  loop
    n := n + 1; t0 := clock_timestamp();
    r := custom.table_archive(v_org, v_small, 20, true);
    ms := extract(epoch from clock_timestamp() - t0) * 1000; worst := greatest(worst, ms);
    exit when (r ->> 'done')::boolean or n > 12;
  end loop;
  if n > 1 then
    raise exception 'A RED: a 8-column, 3-row table took % passes (worst % ms) to archive; a small table archives in ONE pass', n, round(worst);
  end if;
  if (r ->> 'table_archived')::boolean is not true then
    raise exception 'A RED: the pass said done but the table is not archived: %', r;
  end if;
  raise notice 'A PASS - the 8-column 3-row table archived in % pass (% ms): %', n, round(worst), r ->> 'message';
  -- the wide table: the long window must NOT apply
  r := custom.table_archive(v_org, v_big, 0, true);
  n := 0; worst := 0;
  loop
    n := n + 1; t0 := clock_timestamp();
    r := custom.table_archive(v_org, v_big, 20, true);
    ms := extract(epoch from clock_timestamp() - t0) * 1000; worst := greatest(worst, ms);
    exit when (r ->> 'done')::boolean or n > 30;
  end loop;
  if n < 2 then
    raise exception 'B RED: a 20-column table archived in one pass (% ms): the small-table window leaked to a big tail', round(worst);
  end if;
  if worst > 6000 then
    raise exception 'B RED: a pass of the 20-column table took % ms, towards the 8 s cancel', round(worst);
  end if;
  raise notice 'B PASS - the 20-column table took % passes, the worst % ms', n, round(worst);
  perform set_config('role', 'postgres', true);
end $t$;
rollback;

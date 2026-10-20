-- ============================================================
-- INSTANCE-PAGES - custom.template_instances returns each copy's recorded root page and pages; the backfill fills only empty installs.
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file.sql   (signs in as admin@admin.com inside the txn; rolled back at the end)
-- Red before instancepages_a: "RED p1: no root_page_id key" (the answer had neither key).
-- ============================================================
begin;
set local statement_timeout = '120s';
select set_config('ip.tpl', (select t.id::text from custom.template t where t.catalogue_id = 'SP0215' and t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ip.type', (select d.document_type_id::text from content.document d where d.format = 'spaces' limit 1), true),
       set_config('request.jwt.claims', json_build_object('sub', (select u.id from auth.users u where u.email = 'admin@admin.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_inst uuid := gen_random_uuid();
  v_old uuid := gen_random_uuid();
  v_root uuid; v_kid uuid; v_marked uuid;
  v_a jsonb; v_row jsonb; v_n integer;
begin
  for v_n in 1..40 loop
    v_a := custom.template_install_fresh(c_org, current_setting('ip.tpl')::uuid, 'IP copy', v_inst, 600000);
    exit when coalesce((v_a ->> 'done')::boolean, false);
  end loop;
  if not coalesce((v_a ->> 'done')::boolean, false) then raise exception 'TEST SETUP: the copy did not finish'; end if;
  select r into v_row from jsonb_array_elements(custom.template_instances(c_org, 'SP0215')) r where r ->> 'install_id' = v_inst::text;
  if not (v_row ? 'root_page_id') or not (v_row ? 'pages') then raise exception 'RED p1: no root_page_id / pages key in %', v_row; end if;
  if v_row -> 'root_page_id' <> 'null'::jsonb or jsonb_array_length(v_row -> 'pages') <> 0 then raise exception 'RED p2: nothing recorded must be null and []: %', v_row; end if;

  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ip.type')::uuid, 'spaces', 'IP root', 'internal') returning id into v_root;
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ip.type')::uuid, 'spaces', 'IP second', 'internal') returning id into v_kid;
  perform custom.template_install_note(c_org, v_inst, 'page', v_root, 'IP root');
  perform custom.template_install_note(c_org, v_inst, 'page', v_kid, 'IP second');
  select r into v_row from jsonb_array_elements(custom.template_instances(c_org, 'SP0215')) r where r ->> 'install_id' = v_inst::text;
  if (v_row ->> 'root_page_id')::uuid <> v_root then raise exception 'RED p3: root is the first recorded page: %', v_row; end if;
  if jsonb_array_length(v_row -> 'pages') <> 2 or (v_row -> 'pages' -> 1 ->> 'id')::uuid <> v_kid then raise exception 'RED p4: pages list: %', v_row -> 'pages'; end if;

  -- the backfill: an install with nothing recorded and exactly one marked page gets it; one that records a page is left alone
  insert into content.document (organization_id, document_type_id, format, title, visibility, metadata)
    values (c_org, current_setting('ip.type')::uuid, 'spaces', 'IP marked', 'internal',
            jsonb_build_object('from_template', jsonb_build_object('install_id', v_inst, 'catalogue_id', 'SP0215'))) returning id into v_marked;
  reset role;
  perform set_config('ip.inst', v_inst::text, true);
end $$;
reset role;
-- run the backfill body (data-only migration) inside this transaction
\i migrations/inverse/instancepages_b_backfill_the_root_page_onto_older_installs.sql
do $$
declare v_inst uuid := current_setting('ip.inst')::uuid; v_n integer; v_made jsonb;
begin
  select made into v_made from custom.template_install where id = v_inst;
  select count(*) into v_n from jsonb_array_elements(v_made) m where m ->> 'kind' = 'page';
  if v_n <> 2 or exists (select 1 from jsonb_array_elements(v_made) m where (m ->> 'backfilled') is not null) then
    raise exception 'RED p5: an install that records pages must not be backfilled: %', v_made;
  end if;
  -- clear its pages, then the backfill finds the marked one
  update custom.template_install set made = (select coalesce(jsonb_agg(m), '[]'::jsonb) from jsonb_array_elements(made) m where m ->> 'kind' <> 'page') where id = v_inst;
end $$;
\i migrations/inverse/instancepages_b_backfill_the_root_page_onto_older_installs.sql
do $$
declare v_inst uuid := current_setting('ip.inst')::uuid; v_made jsonb;
begin
  select made into v_made from custom.template_install where id = v_inst;
  if jsonb_path_query_array(v_made, '$[*] ? (@.kind == "page" && @.backfilled == true)') = '[]'::jsonb then raise exception 'RED p6: the marked page was not backfilled: %', v_made; end if;
end $$;
\i migrations/inverse/instancepages_b_backfill_the_root_page_onto_older_installs_down.sql
do $$
declare v_inst uuid := current_setting('ip.inst')::uuid;
begin
  if jsonb_path_exists((select made from custom.template_install where id = v_inst), '$[*] ? (@.kind == "page")') then raise exception 'RED p7: the inverse left the backfilled entry'; end if;
end $$;
rollback;
select 'instancepages tests passed' as result;

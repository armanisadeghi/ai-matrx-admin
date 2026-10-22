-- ============================================================
-- INSTALL-ATOMIC a - the host records a template page on the install BEFORE it writes it (caller-chosen id), so a run cut off
-- between the write and the record can never leave a page the install does not know (ADVERSARIAL-7 F1b, SP0579).
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file.sql   (signs in as admin@admin.com inside the txn; rolled back at the end)
-- Light: no real install runs; one install row is inserted inside the txn (rolled back).
-- Red before installatomic_a: template_install_note refused a page id no document held yet
-- ("That is not a workspace page of this organization").
-- ============================================================
begin;
set local statement_timeout = '30s';
select set_config('ia.admin', (select u.id::text from auth.users u where u.email = 'admin@admin.com'), true),
       set_config('ia.type', (select d.document_type_id::text from content.document d where d.format = 'spaces' limit 1), true),
       set_config('ia.tpl', (select t.id::text from custom.template t where t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ia.inst', gen_random_uuid()::text, true),
       set_config('ia.page', gen_random_uuid()::text, true),
       set_config('ia.notes', gen_random_uuid()::text, true);
insert into custom.template_install (id, organization_id, template_id, catalogue_id, template_version, state, install_day, timezone, installed_by)
values (current_setting('ia.inst')::uuid, '5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ia.tpl')::uuid, 'IA-TEST', 1, 'installed',
        current_date, 'UTC', current_setting('ia.admin')::uuid);
-- a non-Spaces document of the same org: an id a document holds must still be a Spaces page
insert into content.document (id, organization_id, document_type_id, format, title, visibility)
values (current_setting('ia.notes')::uuid, '5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ia.type')::uuid, 'markdown', 'IA not a page', 'internal');
select set_config('request.jwt.claims', json_build_object('sub', current_setting('ia.admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_inst uuid := current_setting('ia.inst')::uuid;
  v_page uuid := current_setting('ia.page')::uuid;
  v_a jsonb; v_n integer;
begin
  -- 1. the planned page (no document yet) is recorded
  begin
    v_a := custom.template_install_note(c_org, v_inst, 'page', v_page, 'IA root');
  exception when sqlstate '22023' then
    raise exception 'RED a1: a planned page id (written next) was refused: %', sqlerrm;
  end;
  -- 2. recording it again (a retry) is one record
  v_a := custom.template_install_note(c_org, v_inst, 'page', v_page, 'IA root');
  -- 3. an id a non-Spaces document holds is still refused
  begin
    perform custom.template_install_note(c_org, v_inst, 'page', current_setting('ia.notes')::uuid, 'IA bad');
    raise exception 'RED a3: a non-Spaces document was recorded as a template page';
  exception when sqlstate '22023' then null;
  end;
end $$;
-- 4. the page is written under the recorded id: the install answers for it at once
reset role;
do $$
declare v_n integer;
begin
  select count(*) into v_n from custom.template_install i, jsonb_array_elements(i.made) x
   where i.id = current_setting('ia.inst')::uuid and x ->> 'kind' = 'page' and x ->> 'id' = current_setting('ia.page');
  if v_n <> 1 then raise exception 'RED a2: a retried record is % entries, not 1', v_n; end if;
end $$;
insert into content.document (id, organization_id, document_type_id, format, title, visibility, created_by)
values (current_setting('ia.page')::uuid, '5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ia.type')::uuid, 'spaces', 'IA root', 'internal',
        current_setting('ia.admin')::uuid);
set local role authenticated;
do $$
declare v jsonb;
begin
  v := custom.template_instance_of_page('5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ia.page')::uuid);
  if v is null or v ->> 'id' <> current_setting('ia.inst') or v ->> 'root_page_id' <> current_setting('ia.page') then
    raise exception 'RED a4: the written page is not answered as the copy root: %', v;
  end if;
  raise notice 'INSTALL-ATOMIC a: all green';
end $$;
rollback;

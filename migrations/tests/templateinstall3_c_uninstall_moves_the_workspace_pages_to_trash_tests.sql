-- ============================================================
-- TEMPLATE-INSTALL-3 c - Remove moves the workspace pages an install made to Trash, and Restore brings them back.
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file.sql   (signs in as admin@admin.com inside the txn; rolled back at the end)
-- Red before 20261020 templateinstall3_c: template_install_note refused kind 'page' ("An install records only ... an agent or a workflow"),
-- and an uninstall of an install that was never told about its pages left them in the sidebar.
-- ============================================================
begin;
set local statement_timeout = '600s';
select set_config('ti3.tpl', (select t.id::text from custom.template t where t.catalogue_id = 'SP0215' and t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ti3.type', (select d.document_type_id::text from content.document d where d.format = 'spaces' limit 1), true),
       set_config('request.jwt.claims', json_build_object('sub', (select u.id from auth.users u where u.email = 'admin@admin.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_inst uuid := gen_random_uuid();
  v_tpl uuid := current_setting('ti3.tpl')::uuid;
  v_root uuid; v_kid uuid; v_other uuid;
  v_a jsonb; v_n integer; v_deleted timestamptz; v_kid_deleted timestamptz;
begin
  for v_n in 1..40 loop
    v_a := custom.template_install_fresh(c_org, v_tpl, 'TI3c copy', v_inst, 600000);
    exit when coalesce((v_a ->> 'done')::boolean, false);
  end loop;
  if not coalesce((v_a ->> 'done')::boolean, false) then raise exception 'TEST SETUP: the copy did not finish: %', v_a ->> 'refusal'; end if;
  -- the host's pages: a root and a sub-page under it, the way the Spaces store makes them
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ti3.type')::uuid, 'spaces', 'TI3c root', 'internal') returning id into v_root;
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ti3.type')::uuid, 'spaces', 'TI3c child', 'internal') returning id into v_kid;
  perform public.assoc_link('document', v_kid, 'document', v_root, 'sub_page', 'sub_page', 1);
  -- a page that is not the install's stays where it is
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ti3.type')::uuid, 'spaces', 'TI3c bystander', 'internal') returning id into v_other;

  begin
    perform custom.template_install_note(c_org, v_inst, 'page', v_root, 'TI3c root');
  exception when sqlstate '22023' then
    raise exception 'RED c1: template_install_note refused the kind page: %', sqlstate;
  end;
  begin
    perform custom.template_install_note(c_org, v_inst, 'page', gen_random_uuid(), 'not a page');
    raise exception 'RED c2: a page id that is not a workspace page of the organization was recorded';
  exception when sqlstate '22023' then
    null;
  end;
  -- recording it twice is the same record (a refresh, a retried call)
  perform custom.template_install_note(c_org, v_inst, 'page', v_root, 'TI3c root');
  reset role;
  if (select jsonb_array_length(jsonb_path_query_array(i.made, '$[*] ? (@.kind == "page")')) from custom.template_install i where i.id = v_inst) <> 1 then
    raise exception 'RED c3: the page was recorded twice';
  end if;
  set local role authenticated;

  for v_n in 1..80 loop
    v_a := custom.template_uninstall(c_org, v_inst, 600000);
    exit when coalesce((v_a ->> 'done')::boolean, false);
  end loop;
  if not coalesce((v_a ->> 'done')::boolean, false) then raise exception 'RED c4: the uninstall did not finish: %', v_a ->> 'refusal'; end if;
  select d.deleted_at into v_deleted from content.document d where d.id = v_root;
  select d.deleted_at into v_kid_deleted from content.document d where d.id = v_kid;
  if v_deleted is null then raise exception 'RED c5: the uninstall left the workspace page in the sidebar'; end if;
  if v_kid_deleted is null then raise exception 'RED c6: the page''s sub-page did not follow it into Trash'; end if;
  if (select d.deleted_at from content.document d where d.id = v_other) is not null then raise exception 'RED c7: a page that is not the install''s went to Trash'; end if;

  for v_n in 1..80 loop
    v_a := custom.template_restore(c_org, v_inst, 600000);
    exit when coalesce((v_a ->> 'done')::boolean, false);
  end loop;
  if not coalesce((v_a ->> 'done')::boolean, false) then raise exception 'RED c8: the restore did not finish: %', v_a ->> 'refusal'; end if;
  if (select d.deleted_at from content.document d where d.id = v_root) is not null then raise exception 'RED c9: Restore did not bring the page back'; end if;
  if (select d.deleted_at from content.document d where d.id = v_kid) is not null then raise exception 'RED c10: Restore did not bring the sub-page back'; end if;
  raise notice 'TEMPLATE-INSTALL-3 c workspace-page tests passed';
end
$$;
rollback;

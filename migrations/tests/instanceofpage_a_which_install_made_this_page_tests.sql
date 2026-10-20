-- ============================================================
-- INSTANCE-OF-PAGE - custom.template_instance_of_page(org, page): the install that recorded the page, else null.
-- Run:  uv run --project ../aidream python /tmp/runsql.py this_file.sql   (admin@admin.com / test@test.com inside the txn; rolled back at the end)
-- Red before instanceofpage_a: 'function custom.template_instance_of_page(uuid, uuid) does not exist'.
-- ============================================================
begin;
set local statement_timeout = '60s';
select set_config('ip.tpl', (select t.id::text from custom.template t where t.catalogue_id = 'SP0215' and t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ip.type', (select d.document_type_id::text from content.document d where d.format = 'spaces' limit 1), true),
       set_config('ip.admin', (select u.id::text from auth.users u where u.email = 'admin@admin.com'), true),
       set_config('ip.other', (select u.id::text from auth.users u where u.email = 'test@test.com'), true);
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_inst uuid := gen_random_uuid();
  v_root uuid; v_kid uuid; v_free uuid; v_priv uuid; v_got jsonb;
begin
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ip.type')::uuid, 'spaces', 'IOP root', 'internal') returning id into v_root;
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ip.type')::uuid, 'spaces', 'IOP sub', 'internal') returning id into v_kid;
  insert into content.document (organization_id, document_type_id, format, title, visibility)
    values (c_org, current_setting('ip.type')::uuid, 'spaces', 'IOP unrelated', 'internal') returning id into v_free;
  insert into custom.template_install (id, organization_id, template_id, catalogue_id, template_version, state, install_day, timezone, installed_by, made)
    values (v_inst, c_org, current_setting('ip.tpl')::uuid, 'SP0215', 1, 'installed', current_date, 'UTC', current_setting('ip.admin')::uuid,
            jsonb_build_array(jsonb_build_object('kind', 'page', 'id', v_root, 'title', 'IOP root'),
                              jsonb_build_object('kind', 'page', 'id', v_kid, 'title', 'IOP sub')));
  perform set_config('ip.root', v_root::text, true); perform set_config('ip.kid', v_kid::text, true);
  perform set_config('ip.free', v_free::text, true); perform set_config('ip.inst', v_inst::text, true);
end $$;

-- the member
select set_config('request.jwt.claims', json_build_object('sub', current_setting('ip.admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b'; v jsonb;
begin
  v := custom.template_instance_of_page(c_org, current_setting('ip.root')::uuid);
  if v is null or (v ->> 'id') <> current_setting('ip.inst') or (v ->> 'root_page_id') <> current_setting('ip.root')
     or v ->> 'catalogue_id' <> 'SP0215' or v ->> 'status' <> 'installed' or (v ->> 'template_version')::int <> 1 then
    raise exception 'RED 1: root page must return its install: %', v; end if;
  v := custom.template_instance_of_page(c_org, current_setting('ip.kid')::uuid);
  if v is null or (v ->> 'id') <> current_setting('ip.inst') or (v ->> 'root_page_id') <> current_setting('ip.root') then
    raise exception 'RED 2: a sub-page must return the same install with the root: %', v; end if;
  v := custom.template_instance_of_page(c_org, current_setting('ip.free')::uuid);
  if v is not null then raise exception 'RED 3: an unrelated page must be null: %', v; end if;
  v := custom.template_instance_of_page(c_org, gen_random_uuid());
  if v is not null then raise exception 'RED 3b: an unknown page must be null: %', v; end if;
end $$;

-- a caller outside the organization: refused or null, never the install
reset role;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('ip.other'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b'; v jsonb; v_err text;
begin
  begin
    v := custom.template_instance_of_page(c_org, current_setting('ip.root')::uuid);
  exception when others then v_err := sqlerrm; v := null;
  end;
  if v is not null then raise exception 'RED 4: an outsider must not get the install: %', v; end if;
  raise notice 'outsider: % ', coalesce(v_err, 'null');
  if has_function_privilege('anon', 'custom.template_instance_of_page(uuid,uuid)', 'execute') then
    raise exception 'RED 5: anon must not execute the door'; end if;
end $$;
reset role;
rollback;
select 'ALL GREEN' as result;

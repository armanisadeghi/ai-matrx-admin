-- AT-REVIEWFIX I2: a base move names who keeps access through a share, keeps them by default, and can take it back;
-- the refusal to a non-admin is plain words. begin..rollback, fixture orgs, nothing persists.
-- RED before atmoveshare_a (refusal names custom.base_move; no access_kept door); GREEN after.
begin;
do $g$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_org uuid;
  v_home uuid; v_t1 uuid; v_r uuid; v_out jsonb; v_n integer; v_msg text;
begin
  perform set_config('app.actor_system', 'campaign.atreviewfix', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  foreach v_org in array array[v_a, v_b] loop
    insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'ATREVFIX Fixture', 'atrevfix-' || substr(v_org::text,1,8), 'ATR', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'ATREVFIX fixture');
  end loop;
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_a, 'organization', v_a, c_test, 'member', 'active');
  insert into custom.record (organization_id, table_id, data) values (v_a, null, jsonb_build_object('name','Move Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t1 := custom.table_declare(v_a, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list','label_singular','Job','label_plural','Jobs',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_r := custom.record_write(v_a, v_t1, jsonb_build_object('title','Job one'));
  perform custom.share_grant(v_a, v_t1, 'user', c_test, 'viewer');

  -- 1. A non-admin's refusal is plain words, never the door's name.
  perform set_config('request.jwt.claims', c_test_j, true);
  begin
    perform custom.base_move(v_home, v_b);
    raise exception 'RED: a member without Full access moved the base';
  exception when insufficient_privilege then
    v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'You need Full access on this base to move it.' then
    raise exception 'RED: the refusal is not plain words: %', v_msg;
  end if;

  -- 2. Before the move the admin is told who keeps access (test: a share, not a member of B).
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_out := custom.base_move_access_kept(v_home, v_b);
  raise notice 'access kept: %', v_out;
  if not exists (select 1 from jsonb_array_elements(v_out) e where e ->> 'user_id' = c_test::text and (e ->> 'shares')::int >= 1) then
    raise exception 'RED: the move does not name test@test.com as keeping access: %', v_out;
  end if;
  if exists (select 1 from jsonb_array_elements(v_out) e where e ->> 'user_id' = c_admin::text) then
    raise exception 'RED: the mover is listed as keeping access: %', v_out;
  end if;

  -- 3. Default keep: after the move the share is still live.
  perform custom.base_move(v_home, v_b);
  perform set_config('role','postgres', true);
  select count(*) into v_n from iam.permissions p where p.resource_id = v_t1 and p.granted_to_user_id = c_test and coalesce(p.status,'') <> 'archived';
  if v_n <> 1 then raise exception 'RED: the default (keep access) did not keep the share: % live', v_n; end if;
  perform set_config('role','authenticated', true);

  -- 4. "Remove their access" takes it back.
  v_out := custom.base_move_remove_access(v_home, array[c_test]);
  raise notice 'removed: %', v_out;
  perform set_config('role','postgres', true);
  select count(*) into v_n from iam.permissions p where p.resource_id = v_t1 and p.granted_to_user_id = c_test and coalesce(p.status,'') <> 'archived';
  if v_n <> 0 then raise exception 'RED: remove access left % live share(s)', v_n; end if;
  perform set_config('role','authenticated', true);
  if jsonb_array_length(custom.base_move_access_kept(v_home, gen_random_uuid())) <> 0 then
    raise exception 'RED: after removal someone is still listed';
  end if;

  -- 5. A non-admin cannot take shares away.
  perform set_config('request.jwt.claims', c_test_j, true);
  begin
    perform custom.base_move_remove_access(v_home, array[c_admin]);
    raise exception 'RED: a non-admin changed who has access';
  exception when insufficient_privilege then null;
  end;
  raise notice 'GREEN: plain refusal; mover told test@test.com keeps access; kept by default; removed on request; non-admin refused';
end $g$;
rollback;

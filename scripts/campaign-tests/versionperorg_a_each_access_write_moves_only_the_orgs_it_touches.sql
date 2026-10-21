-- VERSION-PER-ORG guard a: EACH ACCESS WRITE MOVES THE ORGANIZATIONS IT TOUCHES, AND NO OTHER.
-- Kept values (reader judgement, read mask, served columns) are stamped with custom._access_versions(org) =
-- [org version, platform version] and served only while the stamp matches. So for every access table and every way to
-- write it (insert, update, delete, insert-on-conflict-update, merge, an update that moves a row to another
-- organization, a statement that touches nothing), this asserts:
--   * the organization the rows touch moves (a missed bump would serve kept values worked out under old access);
--   * an untouched organization does not move, and the platform version does not move for an organization's rows
--     (a platform bump marks every organization's kept values stale);
--   * a membership change in Y moves X when X shared a resource with Y (a member of Y reads it);
--   * the platform-wide kernel rule tables (carrying_rule, membership_grant, entity_relationships) and a platform-scoped
--     access_setup row move the platform version.
-- Built in disposable organizations inside ONE transaction that the runner rolls back (nothing is left behind).
-- RED before VERSION-PER-ORG a (every access write moved the platform), GREEN after. A planted missed bump (one
-- trigger dropped in the same rolled-back transaction) goes RED naming the case.
-- ORG-CLEANUP (2026-10-18): the suite only asserts, so it builds inside one transaction and leaves nothing.
begin;
DO $guard$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';   -- test@test.com
  v_a uuid := gen_random_uuid();   -- the organization the writes touch
  v_b uuid := gen_random_uuid();   -- an organization no write touches (except the move case)
  v_y uuid := gen_random_uuid();   -- an organization A shared a record with
  v_home uuid;
  v_r uuid;                        -- a Table in A
  v_portal uuid;
  v_case record;
  v_sql text;
  a0 bigint; b0 bigint; y0 bigint; p0 bigint;
  a1 bigint; b1 bigint; y1 bigint; p1 bigint;
  v_moved text[];
  v_bad text[] := '{}';
  v_n integer := 0;
begin
  perform set_config('app.actor_system', 'campaign-test/versionperorg_a', true);
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values
    (v_a, 'Quillfeather Bindery A ' || substr(v_a::text, 1, 8), 'quillfeather-vpo-a-' || substr(v_a::text, 1, 8), 'QBA', c_admin),
    (v_b, 'Quillfeather Bindery B ' || substr(v_b::text, 1, 8), 'quillfeather-vpo-b-' || substr(v_b::text, 1, 8), 'QBB', c_admin),
    (v_y, 'Quillfeather Bindery Y ' || substr(v_y::text, 1, 8), 'quillfeather-vpo-y-' || substr(v_y::text, 1, 8), 'QBY', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values
    (v_a, 'organization', v_a, c_admin, 'owner', 'active'),
    (v_b, 'organization', v_b, c_admin, 'owner', 'active'),
    (v_y, 'organization', v_y, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_a, v_a, 'true'::jsonb, 'versionperorg_a fixture');
  insert into custom.record (organization_id, table_id, data) values (v_a, null, jsonb_build_object('name', 'Home')) returning id into v_home;
  -- a Table (a Table is itself a record): shared, set up, and named by the portal below
  v_r := custom.table_declare(v_a, jsonb_build_object('name', 'Commissions', 'slug', 'commissions', 'type', 'entity',
    'label_singular', 'Commission', 'label_plural', 'Commissions', 'title_field', 'title', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text, 'fields', jsonb_build_array(jsonb_build_object('name', 'title'))));
  -- A makes the record available to Y (organization availability; a membership change in Y reaches A)
  perform set_config('iam.org_availability', iam._org_availability_token(), true);
  insert into iam.permissions (resource_type, resource_id, granted_to_organization_id, permission_level, created_by)
  values ('record', v_r, v_y, 'viewer', c_admin);
  insert into custom.portal (organization_id, title, slug, client_table_id, created_by)
  values (v_a, 'Bindery portal', 'vpo-' || substr(replace(v_a::text, '-', ''), 1, 12), v_r, c_admin) returning id into v_portal;
  insert into iam.team (name, organization_id, created_by) values ('Binders', v_a, c_admin);
  insert into custom.portal_principal (portal_id, organization_id, client_record_id, email, invited_by) values (v_portal, v_a, v_r, 'guard-principal@example.com', c_admin);
  insert into iam.access_setup (entity_type, setup, declared_by, scope)
  values ('record', '{"grid": {}, "seats": [{"key": "table_admin", "fallback": "org_owners_admins", "required": true, "resolver": {"fn": "custom.store_seat_holders(uuid,jsonb)", "kind": "store", "seat": {"min": "admin", "kind": "row_level"}, "has_fn": "custom.store_seat_has(uuid,uuid,jsonb)", "set_fn": "custom.store_seat_records(uuid,uuid,jsonb)"}}], "admin_seats": ["table_admin"]}'::jsonb,
          'campaign-test/versionperorg_a', jsonb_build_object('table_id', v_r));

  for v_case in
    select * from (values
      -- (label, statement with %A %B %Y %R %P %ADMIN %TEST placeholders, the set that must move)
      ('permissions insert',            $s$insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, created_by) values ('record', '%R', '%TEST', 'viewer', '%ADMIN')$s$, '{A}'),
      ('permissions update',            $s$update iam.permissions set permission_level = 'editor' where resource_id = '%R' and granted_to_user_id = '%TEST'$s$, '{A}'),
      ('permissions upsert',            $s$insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, created_by) values ('record', '%R', '%TEST', 'viewer', '%ADMIN') on conflict (resource_type, resource_id, granted_to_user_id) do update set permission_level = excluded.permission_level$s$, '{A}'),
      ('permissions merge',             $s$merge into iam.permissions p using (select '%R'::uuid as r, '%TEST'::uuid as u) s on p.resource_id = s.r and p.granted_to_user_id = s.u when matched then update set permission_level = 'editor'$s$, '{A}'),
      ('permissions delete',            $s$delete from iam.permissions where resource_id = '%R' and granted_to_user_id = '%TEST'$s$, '{A}'),
      ('permissions org grant update',  $s$update iam.permissions set permission_level = 'editor' where resource_id = '%R' and granted_to_organization_id = '%Y'$s$, '{A}'),
      ('memberships insert into Y',     $s$insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values ('%Y', 'organization', '%Y', '%TEST', 'member', 'active')$s$, '{A,Y}'),
      ('memberships update in Y',       $s$update iam.memberships set role = 'admin' where organization_id = '%Y' and user_id = '%TEST'$s$, '{A,Y}'),
      ('memberships delete from Y',     $s$delete from iam.memberships where organization_id = '%Y' and user_id = '%TEST'$s$, '{A,Y}'),
      ('memberships insert into A',     $s$insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values ('%A', 'organization', '%A', '%TEST', 'member', 'active')$s$, '{A}'),
      ('memberships upsert into A',     $s$insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values ('%A', 'organization', '%A', '%TEST', 'admin', 'active') on conflict (container_type, container_id, user_id) do update set role = excluded.role$s$, '{A}'),
      ('memberships soft delete in A',  $s$update iam.memberships set deleted_at = now() where organization_id = '%A' and user_id = '%TEST'$s$, '{A}'),
      ('entity_grants insert',          $s$insert into platform.entity_grants (entity_type, entity_id, audience, organization_id, granted_by) values ('record', '%R', 'organization', '%Y', '%ADMIN')$s$, '{A}'),
      ('entity_grants update',          $s$update platform.entity_grants set granted_by = granted_by where entity_id = '%R'$s$, '{A}'),
      ('entity_grants delete',          $s$delete from platform.entity_grants where entity_id = '%R'$s$, '{A}'),
      ('share_links insert',            $s$insert into platform.share_links (resource_type, resource_id, token, permission_level, created_by, organization_id) values ('record', '%R', 'vpo-' || md5(random()::text), 'viewer', '%ADMIN', '%A')$s$, '{A}'),
      ('share_links update',            $s$update platform.share_links set label = 'guard' where resource_id = '%R'$s$, '{A}'),
      ('share_links delete',            $s$delete from platform.share_links where resource_id = '%R'$s$, '{A}'),
      ('team insert',                   $s$insert into iam.team (name, organization_id, created_by) values ('Finishers', '%A', '%ADMIN')$s$, '{A}'),
      ('team update',                   $s$update iam.team set description = 'guard' where organization_id = '%A'$s$, '{A}'),
      ('team merge',                    $s$merge into iam.team t using (select '%A'::uuid as o) s on t.organization_id = s.o when matched then update set description = 'guard merge'$s$, '{A}'),
      ('team moved to B',               $s$update iam.team set organization_id = '%B' where organization_id = '%A' and name = 'Finishers'$s$, '{A,B}'),
      ('team delete',                   $s$delete from iam.team where organization_id in ('%A', '%B')$s$, '{A,B}'),
      ('portal insert',                 $s$insert into custom.portal (organization_id, title, slug, client_table_id, created_by) values ('%A', 'Second portal', 'vpo2-' || substr(md5(random()::text), 1, 12), '%R', '%ADMIN')$s$, '{A}'),
      ('portal update',                 $s$update custom.portal set config = coalesce(config, '{}') where organization_id = '%A'$s$, '{A}'),
      ('portal_principal insert',       $s$insert into custom.portal_principal (portal_id, organization_id, client_record_id, email, invited_by) values ('%P', '%A', '%R', 'guard-two@example.com', '%ADMIN')$s$, '{A}'),
      ('portal_principal update',       $s$update custom.portal_principal set is_active = false, revoked_at = now() where portal_id = '%P'$s$, '{A}'),
      ('portal_principal delete',       $s$delete from custom.portal_principal where portal_id = '%P'$s$, '{A}'),
      ('portal_table insert',           $s$insert into custom.portal_table (portal_id, organization_id, table_id, names_via_field_id, edge_role) values ('%P', '%A', '%R', '%R', 'client')$s$, '{A}'),
      ('portal_table update',           $s$update custom.portal_table set ord = 2 where portal_id = '%P'$s$, '{A}'),
      ('portal_table delete',           $s$delete from custom.portal_table where portal_id = '%P'$s$, '{A}'),
      ('portal delete',                 $s$delete from custom.portal where organization_id = '%A' and title = 'Second portal'$s$, '{A}'),
      ('access_setup (Table) update',   $s$update iam.access_setup set setup = setup where scope ->> 'table_id' = '%R'$s$, '{A}'),
      ('access_setup (Table) delete',   $s$delete from iam.access_setup where scope ->> 'table_id' = '%R'$s$, '{A}'),
      ('access_setup (platform) update',$s$update iam.access_setup set setup = setup where scope is null and entity_type = (select entity_type from iam.access_setup where scope is null limit 1)$s$, '{PLATFORM}'),
      ('knob_override insert',          $s$insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom', 'member_default_visibility', 'organization', '%A', '%A', '"shared_only"'::jsonb, 'versionperorg_a')$s$, '{A}'),
      ('knob_override update',          $s$update platform.knob_override set set_note = 'versionperorg_a again' where organization_id = '%A' and key = 'member_default_visibility'$s$, '{A}'),
      ('knob_override delete',          $s$delete from platform.knob_override where organization_id = '%A' and key = 'member_default_visibility'$s$, '{A}'),
      ('carrying_rule (kernel rule)',   $s$update custom.carrying_rule set note = note$s$, '{PLATFORM}'),
      ('membership_grant (system role)',$s$update iam.membership_grant set confers = confers$s$, '{PLATFORM}'),
      ('entity_relationships (kernel)', $s$update platform.entity_relationships set note = note where child_type = (select child_type from platform.entity_relationships limit 1)$s$, '{PLATFORM}'),
      ('empty statement, org table',    $s$delete from iam.permissions where false$s$, '{}'),
      ('empty statement, memberships',  $s$update iam.memberships set role = role where false$s$, '{}')
    ) as c(label, stmt, expect)
  loop
    v_n := v_n + 1;
    v_sql := replace(replace(replace(replace(replace(replace(replace(v_case.stmt,
               '%ADMIN', c_admin::text), '%TEST', c_test::text), '%A', v_a::text), '%B', v_b::text), '%Y', v_y::text),
               '%R', v_r::text), '%P', v_portal::text);
    -- once per transaction per organization: forget the earlier cases' bumps so this case is judged alone
    perform set_config('mx.access_bumped', '', true);
    a0 := (custom._access_versions(v_a))[1]; b0 := (custom._access_versions(v_b))[1];
    y0 := (custom._access_versions(v_y))[1]; p0 := (custom._access_versions(v_a))[2];
    begin
      execute v_sql;
    exception when others then
      v_bad := v_bad || format('%s: the write itself failed: %s (%s)', v_case.label, sqlerrm, sqlstate);
      continue;
    end;
    a1 := (custom._access_versions(v_a))[1]; b1 := (custom._access_versions(v_b))[1];
    y1 := (custom._access_versions(v_y))[1]; p1 := (custom._access_versions(v_a))[2];
    v_moved := array_remove(array[case when a1 <> a0 then 'A' end, case when b1 <> b0 then 'B' end,
                                  case when y1 <> y0 then 'Y' end, case when p1 <> p0 then 'PLATFORM' end], null);
    if v_moved is distinct from v_case.expect::text[] then
      v_bad := v_bad || format('%s: moved %s, must move exactly %s', v_case.label, v_moved, v_case.expect);
    end if;
  end loop;
  if cardinality(v_bad) > 0 then
    raise exception 'RED: % of % access writes moved the wrong versions:%', cardinality(v_bad), v_n,
      E'\n  ' || array_to_string(v_bad, E'\n  ');
  end if;
  raise notice 'GREEN: % access writes each moved exactly the organizations they touch (and the platform only for platform-wide rules)', v_n;
end
$guard$;
rollback;

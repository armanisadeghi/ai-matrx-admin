-- additive: yes
-- AT-NOTIFY-MOVE task 2 / Airtable parity "Move / transfer base between workspaces". A base is a Home (a record) holding
-- tables, with its identity in custom.base. custom.base_move(home, organization) moves the whole base: EVERY live table of the
-- Home goes through the existing per-table door (custom.table_move, which carries fields, rows, views, pages, automations,
-- forms, comments and history and refuses a table that cannot go), then the Home record and its custom.base row follow into the
-- destination and the tables are put back under that Home, so the base stays one base. All or nothing: one refusal undoes it all.
-- Who: admin on the Home (the base's structure is the admins') AND a member of the destination organization. Nobody else is restricted.
-- Proof: scripts/campaign-tests/atnotify_base_move.sql. Inverse: migrations/inverse/atnotify_b_a_base_moves_to_another_workspace_down.sql

CREATE OR REPLACE FUNCTION custom.base_move(p_home_id uuid, p_to_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid := custom.query_principal();
  v_from   uuid;
  v_base   uuid;
  v_name   text;
  v_tables uuid[];
  v_t      uuid;
  v_moved  jsonb := '[]'::jsonb;
  v_res    jsonb;
begin
  if v_me is null then
    raise exception 'Sign in to move a base.' using errcode = '42501';
  end if;
  if p_home_id is null or p_to_organization_id is null then
    raise exception 'Say which base to move and which workspace it goes to.' using errcode = '22004';
  end if;
  select b.id, b.organization_id, b.name into v_base, v_from, v_name
    from custom.base b where b.home_id = p_home_id and b.deleted_at is null;
  if v_base is null then
    raise exception 'That base is not one you have been given, so nothing moved.' using errcode = '42501';
  end if;
  -- The organization wall, then the row: admin on the Home.
  perform custom.assert_client_may_change(v_from, p_home_id, 'custom.base_move', 'admin', 'base');
  if p_to_organization_id = v_from then
    raise exception '% is already in that workspace.', v_name using errcode = '22023';
  end if;
  if not iam.is_org_member(v_me, p_to_organization_id) then
    raise exception 'You are not a member of that workspace, so % cannot go there.', v_name
      using errcode = '42501', hint = 'A base moves only into a workspace you belong to.';
  end if;
  perform custom.assert_store_door(p_to_organization_id, 'custom.base_move');

  select coalesce(array_agg(t.id order by t.created_at, t.id), array[]::uuid[]) into v_tables
    from custom.record t
   where t.organization_id = v_from and t.data_class = 'table' and t.deleted_at is null
     and custom.containment_parent(t.data) = p_home_id;

  -- EVERY TABLE THROUGH THE ONE TABLE DOOR; its own refusal (not yours to move, held by something) stops and undoes the whole base.
  foreach v_t in array v_tables loop
    v_res := custom.table_move(v_t, p_to_organization_id, null);
    v_moved := v_moved || jsonb_build_array(jsonb_build_object('id', v_t, 'name', v_res #>> '{table,name}'));
  end loop;

  -- THE HOME AND ITS BASE ROW FOLLOW (the same mark custom.table_move sets, for the same partition re-key).
  perform set_config('custom.table_move_from', v_from::text, true);
  update custom.record h set organization_id = p_to_organization_id where h.organization_id = v_from and h.id = p_home_id;
  update custom.base b set organization_id = p_to_organization_id where b.id = v_base;
  perform set_config('custom.table_move_from', '', true);
  update history.row_versions v set organization_id = p_to_organization_id
   where v.entity_type = 'custom.record' and v.organization_id = v_from and v.row_id = p_home_id;

  -- THE TABLES GO BACK UNDER THEIR HOME, so the base is still one base over there.
  foreach v_t in array v_tables loop
    perform custom.record_reparent(p_to_organization_id, v_t, p_home_id);
  end loop;

  return jsonb_build_object('moved', true, 'base_id', v_base, 'home_id', p_home_id, 'name', v_name,
           'from_organization_id', v_from, 'to_organization_id', p_to_organization_id,
           'tables', v_moved, 'path', '/data/bases/' || p_home_id::text);
end;
$function$;

comment on function custom.base_move(uuid, uuid) is
  'AT-NOTIFY-MOVE — moves a whole base (its Home, its custom.base row and every table with its pages and automations) to another organization the caller belongs to. Admin on the Home.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'base_move', 'p_home_id uuid, p_to_organization_id uuid',
   array['uuid'::regtype, 'uuid'::regtype]::oid[],
   'Moves a whole base to another workspace the person belongs to, from the Base page.',
   'atnotify_b_a_base_moves_to_another_workspace.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atnotify_b_a_base_moves_to_another_workspace.sql',
     'declared_at', '2026-10-18 lane AT-NOTIFY-MOVE, read from the body and exercised in scripts/campaign-tests/atnotify_base_move.sql',
     'arguments', jsonb_build_object(
       'p_home_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'custom_record',
         'check', 'the Home must carry a live custom.base row (42501 otherwise), then custom.assert_client_may_change(the Home) at admin.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atnotify_base_move.sql, rolled back'),
       'p_to_organization_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'entity', 'organization',
         'check', 'the caller must be a member of it (42501 otherwise), then its store must be open.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atnotify_base_move.sql, rolled back'))))
on conflict do nothing;

grant execute on function custom.base_move(uuid, uuid) to authenticated;

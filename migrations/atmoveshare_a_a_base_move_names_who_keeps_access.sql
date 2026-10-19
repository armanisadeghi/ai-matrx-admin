-- why: AT-REVIEW-1 I2: shares survived a base move into a workspace the grantee is not in, and the Move dialog did not say so.
--   custom.base_move_access_kept(home, target) lists the people who hold a share on the base (its Home, tables or rows) and are
--   not members of the target, so the dialog names them before the person confirms; custom.base_move_remove_access(home, users)
--   takes back the shares of the people the person ticked, right after the move (default: everyone keeps access).
--   custom.base_move's refusal now reads "You need Full access on this base to move it." instead of naming the door.
-- Proof: scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql. Inverse: migrations/inverse/atmoveshare_a_a_base_move_names_who_keeps_access_down.sql
-- based-on: custom.base_move(uuid, uuid) 591b0c07c0bec841ac0a22727d5424bd4118f7cc4acae46366026dc60f0f40e1

CREATE OR REPLACE FUNCTION custom.base_move(p_home_id uuid, p_to_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid := custom.query_principal();
  v_from   uuid;
  v_hdata  jsonb;
  v_base   uuid;
  v_name   text;
  v_tables uuid[];
  v_t      uuid;
  v_moved  jsonb := '[]'::jsonb;
  v_res    jsonb;
  v_out    text[];
  v_n      text;
  v_to_name text;
  r        record;
begin
  if v_me is null then
    raise exception 'Sign in to move a base.' using errcode = '42501';
  end if;
  if p_home_id is null or p_to_organization_id is null then
    raise exception 'Say which base to move and which workspace it goes to.' using errcode = '22004';
  end if;
  -- A BASE IS A HOME THAT HOLDS TABLES (the rule /data/bases uses); its custom.base row (a name, an icon) exists only once someone named it.
  select h.organization_id, h.data into v_from, v_hdata
    from custom.record h where h.id = p_home_id and h.deleted_at is null;
  select b.id, b.name into v_base, v_name
    from custom.base b where b.home_id = p_home_id and b.deleted_at is null;
  if v_from is null then
    raise exception 'That base is not one you have been given, so nothing moved.' using errcode = '42501';
  end if;
  select coalesce(array_agg(t.id order by t.created_at, t.id), array[]::uuid[]) into v_tables
    from custom.record t
   where t.organization_id = v_from and t.data_class = 'table' and t.deleted_at is null
     and custom.containment_parent(t.data) = p_home_id;
  if v_base is null and coalesce(array_length(v_tables, 1), 0) = 0 then
    raise exception 'That base is not one you have been given, so nothing moved.' using errcode = '42501';
  end if;
  v_name := coalesce(v_name, nullif(btrim(v_hdata ->> 'name'), ''),
                     (select nullif(btrim(t.data ->> 'name'), '') from custom.record t where t.id = v_tables[1]), 'This base');
  -- The organization wall, then the row: admin on the Home.
  -- AT-REVIEWFIX I2: the ladder's refusal named the door ("… and custom.base_move needs the admin level"); a person reads plain words.
  begin
    perform custom.assert_client_may_change(v_from, p_home_id, 'custom.base_move', 'admin', 'base');
  exception when insufficient_privilege then
    if sqlerrm like '%custom.base_move%' then
      raise exception 'You need Full access on this base to move it.' using errcode = '42501',
            hint = 'Ask an admin of this base, or an owner of this workspace, to move it or to raise your access.';
    end if;
    raise;
  end;
  if p_to_organization_id = v_from then
    raise exception '% is already in that workspace.', v_name using errcode = '22023';
  end if;
  if not iam.is_org_member(v_me, p_to_organization_id) then
    raise exception 'You are not a member of that workspace, so % cannot go there.', v_name
      using errcode = '42501', hint = 'A base moves only into a workspace you belong to.';
  end if;
  perform custom.assert_store_door(p_to_organization_id, 'custom.base_move');
  select o.name::text into v_to_name from iam.organizations o where o.id = p_to_organization_id;

  if coalesce(array_length(v_tables, 1), 0) > 0 then
    -- LINKS TO TABLES OUTSIDE THE BASE refuse, by name (links among the base's own tables are internal and travel with it).
    select coalesce(array_agg(distinct x.nm order by x.nm), array[]::text[]) into v_out from (
      select coalesce(nullif(btrim(ot.data ->> 'name'), ''), 'another table') as nm
        from custom.record f
        join custom.record ot on ot.organization_id = v_from and ot.id = nullif(f.data ->> 'relation_target', '')::uuid
                             and ot.data_class <> 'kernel' and ot.deleted_at is null
       where f.organization_id = v_from and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and nullif(f.data ->> 'entity_definition_id', '')::uuid = any (v_tables)
         and not (ot.id = any (v_tables))
      union all
      select coalesce(nullif(btrim(st.data ->> 'name'), ''), 'another table')
        from custom.record f
        join custom.record st on st.organization_id = v_from and st.id = nullif(f.data ->> 'entity_definition_id', '')::uuid
                             and st.deleted_at is null
       where f.organization_id = v_from and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and nullif(f.data ->> 'relation_target', '')::uuid = any (v_tables)
         and not (st.id = any (v_tables))) x;
    if coalesce(array_length(v_out, 1), 0) > 0 then
      raise exception '% is linked to % outside this base, so nothing moved.', v_name, array_to_string(v_out, ', ')
        using errcode = '55000',
              hint = 'Remove those links, or move the other table into this base, then move it again.';
    end if;
    -- Each table must be the caller's to move and must not collide with a table already over there (the checks the per-table door made one by one).
    foreach v_t in array v_tables loop
      select t.* into r from custom.record t where t.id = v_t;
      if not (r.created_by = v_me or iam.is_org_manager(v_from, v_me)) then
        raise exception 'Only the person who made % or an owner or admin of its workspace can move it.', coalesce(nullif(btrim(r.data ->> 'name'), ''), 'a table')
          using errcode = '42501';
      end if;
      if exists (select 1 from custom.record d
                  where d.organization_id = p_to_organization_id and d.table_id = custom.table_kernel_id() and d.deleted_at is null
                    and lower(coalesce(d.data ->> 'slug', d.data ->> 'name')) = lower(coalesce(r.data ->> 'slug', r.data ->> 'name'))) then
        raise exception '% already has a table called %. Rename one of them first.', v_to_name, coalesce(nullif(btrim(r.data ->> 'name'), ''), 'a table')
          using errcode = '55000';
      end if;
    end loop;

    -- ALL THE BASE'S TABLES THROUGH THE ONE TABLE DOOR, AS ONE SET: the door's plan carries every table of the set together
    -- (custom._table_move_set), so its own refusals (held by something) still stop and undo the whole base.
    -- The other tables are filed inside the first for the length of the move (a table inside a carried table rides with it, and lands
    -- after it); the loop below puts every table back under the Home. The first stays where it is.
    foreach v_t in array v_tables[2:array_length(v_tables, 1)] loop
      perform custom.record_reparent(v_from, v_t, v_tables[1]);
    end loop;
    perform set_config('custom.table_move_set', v_tables::text, true);
    v_res := custom.table_move(v_tables[1], p_to_organization_id, null);
    perform set_config('custom.table_move_set', '', true);
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.data ->> 'name') order by t.created_at, t.id), '[]'::jsonb)
      into v_moved from custom.record t where t.id = any (v_tables);
  end if;

  -- THE HOME AND ITS BASE ROW (when someone named the base) FOLLOW (the same mark custom.table_move sets, for the same partition re-key).
  perform set_config('custom.table_move_from', v_from::text, true);
  update custom.record h set organization_id = p_to_organization_id where h.organization_id = v_from and h.id = p_home_id;
  if v_base is not null then
    update custom.base b set organization_id = p_to_organization_id where b.id = v_base;
  end if;
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

-- AT-REVIEWFIX I2: WHO KEEPS ACCESS AFTER A MOVE. A share (iam.permissions on the base's Home, its tables, or their rows)
-- travels with the base, so a person who holds one and is NOT a member of the target workspace keeps reaching it there.
-- The Move dialog lists them before the person confirms (default: they keep access; opinions become knobs, defaults lean open)
-- and can take back each one's access right after the move.
CREATE OR REPLACE FUNCTION custom._base_share_rows(p_home_id uuid)
 RETURNS TABLE(permission_id uuid, user_id uuid, level public.permission_level, subject_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  with home as (
    select h.id, h.organization_id from custom.record h where h.id = p_home_id and h.deleted_at is null
  ), tbls as (
    select t.id from custom.record t, home
     where t.organization_id = home.organization_id and t.data_class = 'table' and t.deleted_at is null
       and custom.containment_parent(t.data) = home.id
  ), subjects as (
    select home.id from home
    union all select tbls.id from tbls
    union all select r.id from custom.record r, home
     where r.organization_id = home.organization_id and r.table_id in (select tbls.id from tbls)
  )
  select p.id, p.granted_to_user_id, p.permission_level, p.resource_id
    from iam.permissions p
   where p.resource_type = 'record' and p.granted_to_user_id is not null
     and coalesce(p.status, '') <> 'archived'
     and (p.expires_at is null or p.expires_at > now())
     and p.resource_id in (select s.id from subjects s);
$function$;

CREATE OR REPLACE FUNCTION custom.base_move_access_kept(p_home_id uuid, p_to_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me   uuid := custom.query_principal();
  v_from uuid;
begin
  if v_me is null then
    raise exception 'Sign in to move a base.' using errcode = '42501';
  end if;
  select h.organization_id into v_from from custom.record h where h.id = p_home_id and h.deleted_at is null;
  if v_from is null then
    raise exception 'That base is not one you have been given.' using errcode = '42501';
  end if;
  begin
    perform custom.assert_client_may_change(v_from, p_home_id, 'custom.base_move_access_kept', 'admin', 'base');
  exception when insufficient_privilege then
    if sqlerrm like '%custom.base_move_access_kept%' then
      raise exception 'You need Full access on this base to move it.' using errcode = '42501';
    end if;
    raise;
  end;
  if not iam.is_org_member(v_me, p_to_organization_id) then
    raise exception 'You are not a member of that workspace, so the base cannot go there.' using errcode = '42501';
  end if;
  -- One entry per person who holds a share here and is not a member of the target workspace.
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', x.user_id,
             'name', coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                              split_part(u.email::text, '@', 1), 'Someone'),
             'email', u.email::text,
             'shares', x.n,
             'level', x.top::text) order by lower(coalesce(u.raw_user_meta_data ->> 'display_name', u.email::text, '')))
      from (select s.user_id, count(*) as n, max(s.level) as top
              from custom._base_share_rows(p_home_id) s
             where s.user_id <> v_me
               and not iam.is_org_member(s.user_id, p_to_organization_id)
             group by s.user_id) x
      left join auth.users u on u.id = x.user_id), '[]'::jsonb);
end;
$function$;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'base_move_access_kept', 'p_home_id uuid, p_to_organization_id uuid', array['uuid'::regtype, 'uuid'::regtype]::oid[],
   'Lists, for the Move base dialog, the people who keep access to the base through a share and are not members of the target workspace.',
   'atmoveshare_a_a_base_move_names_who_keeps_access.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atmoveshare_a_a_base_move_names_who_keeps_access.sql',
     'declared_at', '2026-10-19 lane AT-REVIEWFIX, read from the body and exercised in scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql',
     'arguments', jsonb_build_object(
       'p_home_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'custom_record',
         'check', 'the Home must be a live record (42501 otherwise), then custom.assert_client_may_change(the Home) at admin.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql, rolled back'),
       'p_to_organization_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'entity', 'organization',
         'check', 'the caller must be a member of it (42501 otherwise); it only filters the list.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql, rolled back'))))
on conflict do nothing;
GRANT EXECUTE ON FUNCTION custom.base_move_access_kept(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION custom.base_move_remove_access(p_home_id uuid, p_user_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me   uuid := custom.query_principal();
  v_org  uuid;
  v_gone integer;
begin
  if v_me is null then
    raise exception 'Sign in to change who has access.' using errcode = '42501';
  end if;
  select h.organization_id into v_org from custom.record h where h.id = p_home_id and h.deleted_at is null;
  if v_org is null then
    raise exception 'That base is not one you have been given.' using errcode = '42501';
  end if;
  begin
    perform custom.assert_client_may_change(v_org, p_home_id, 'custom.base_move_remove_access', 'admin', 'base');
  exception when insufficient_privilege then
    if sqlerrm like '%custom.base_move_remove_access%' then
      raise exception 'You need Full access on this base to change who has access.' using errcode = '42501';
    end if;
    raise;
  end;
  -- Only people who are NOT members of the workspace the base is in now: a member's access is the workspace's, not a share's.
  -- REVOCATION RULE (T-32e): a share is archived by the one remove function, never deleted.
  select count(*) filter (where coalesce((iam.remove_grant(s.permission_id, v_me, true) ->> 'outcome') = 'removed', false))
    into v_gone
    from custom._base_share_rows(p_home_id) s
   where s.user_id = any (coalesce(p_user_ids, '{}'::uuid[]))
     and s.user_id <> v_me
     and not iam.is_org_member(s.user_id, v_org);
  return jsonb_build_object('removed', v_gone,
           'message', case when v_gone = 0 then 'Nobody''s access changed.'
                           when v_gone = 1 then 'Removed 1 share.'
                           else format('Removed %s shares.', v_gone) end);
end;
$function$;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'base_move_remove_access', 'p_home_id uuid, p_user_ids uuid[]', array['uuid'::regtype, 'uuid[]'::regtype]::oid[],
   'Takes back, after a base move, the shares of the people the person ticked in the Move base dialog (only people who are not members of the workspace the base is in).',
   'atmoveshare_a_a_base_move_names_who_keeps_access.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atmoveshare_a_a_base_move_names_who_keeps_access.sql',
     'declared_at', '2026-10-19 lane AT-REVIEWFIX, read from the body and exercised in scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql',
     'arguments', jsonb_build_object(
       'p_home_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'custom_record',
         'check', 'the Home must be a live record (42501 otherwise), then custom.assert_client_may_change(the Home) at admin.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql, rolled back'),
       'p_user_ids', jsonb_build_object('type', 'uuid[]', 'position', 2, 'optional', false, 'entity', 'user',
         'check', 'only shares on this base held by these people AND who are not members of its workspace are removed; an id with no such share removes nothing.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atmoveshare_a_a_move_names_who_keeps_access.sql, rolled back'))))
on conflict do nothing;
GRANT EXECUTE ON FUNCTION custom.base_move_remove_access(uuid, uuid[]) TO authenticated, service_role;

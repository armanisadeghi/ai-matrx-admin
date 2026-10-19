-- INVERSE of atmoveshare_a_a_base_move_names_who_keeps_access.sql: custom.base_move back to its body before (the ladder's refusal), and the two access doors dropped.
-- chair-step: restores one function body, drops three functions.
-- based-on: custom.base_move(uuid, uuid) 83adee8d116adbe04bd035396d4dca3c2774c8596b9a1ac0c9723aaadbcdbb15

DROP FUNCTION IF EXISTS custom.base_move_remove_access(uuid, uuid[]);
DROP FUNCTION IF EXISTS custom.base_move_access_kept(uuid, uuid);
DROP FUNCTION IF EXISTS custom._base_share_rows(uuid);
delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('base_move_access_kept', 'base_move_remove_access');

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
  perform custom.assert_client_may_change(v_from, p_home_id, 'custom.base_move', 'admin', 'base');
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

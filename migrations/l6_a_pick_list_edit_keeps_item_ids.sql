-- L6 defect 13 (2026-10-17): a pick-list edit keeps every item's id.
-- custom.pick_list_update and its older twin public.update_user_list archived EVERY item and wrote
-- the list back under NEW ids on any p_items edit, so every saved reference to an item (agent
-- variable defaults, values already sent, the directive_v1_reference_pick_list_item fence carrying
-- item_id) silently pointed at nothing (real tests core-chain LEDGER 2026-10-16 05:20Z PB-01).
-- Now: an item whose `id` names a live item of this list is updated in place (only the fields that
-- changed); an item with no id (or an id this list does not hold) is added under a new id; a live
-- item the call no longer names is archived (custom.record_delete — soft, restorable).
-- Guard: aidream tests/test_a_pick_list_edit_keeps_its_item_ids_live.py
-- based-on: custom.pick_list_update(uuid, text, text, jsonb) 68e7740cd44ccd19841f17d80fa84b8553b42a9377c5ea6076cfd95657abf620
-- based-on: public.update_user_list(uuid, character varying, text, boolean, boolean, boolean, jsonb) 82beb9d87ce6df9b490588d62ef92602f8011f70aa1e505c671663296516b3f6

create or replace function custom._pick_list_items_apply(p_org uuid, p_list_id uuid, p_items jsonb)
 returns void
 language plpgsql
 set search_path to 'pg_catalog'
as $function$
declare
  v_item  jsonb;
  v_raw   text;
  v_id    uuid;
  v_new   jsonb;
  v_data  jsonb;
  v_patch jsonb;
  v_rows  jsonb[];
  v_keep  uuid[] := '{}'::uuid[];
  v_old   uuid;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    continue when coalesce(nullif(btrim(coalesce(v_item ->> 'Label', v_item ->> 'label')), ''), '') = '';
    v_new := jsonb_build_object(
      'name', coalesce(v_item ->> 'Label', v_item ->> 'label'),
      'description', coalesce(v_item ->> 'Description', v_item ->> 'description'),
      'help_text', coalesce(v_item ->> 'Help Text', v_item ->> 'help_text'),
      'group_name', coalesce(v_item ->> 'Group', v_item ->> 'group_name'),
      'icon', coalesce(v_item ->> 'icon_name', v_item ->> 'icon'));
    v_raw := coalesce(v_item ->> 'id', v_item ->> 'Id', v_item ->> 'item_id');
    v_id := case when v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_raw::uuid end;
    v_data := null;
    if v_id is not null and not (v_id = any(v_keep)) then
      select c.data into v_data from custom.record c
       where c.organization_id = p_org and c.table_id = p_list_id and c.id = v_id
         and c.data_class = 'record' and c.deleted_at is null;
    end if;
    if v_data is not null then
      -- THE SAME ITEM, KEPT: only what changed is written, so its id (and every reference to it) holds.
      v_keep := v_keep || v_id;
      select jsonb_object_agg(e.key, e.value) into v_patch
        from jsonb_each(v_new) e
       where (v_data ->> e.key) is distinct from (e.value #>> '{}');
      if v_patch is not null then
        perform custom.record_update(p_org, v_id, v_patch);
      end if;
    else
      v_rows := v_rows || jsonb_strip_nulls(v_new);
    end if;
  end loop;
  -- What the call no longer names is archived (soft, restorable), never destroyed.
  for v_old in select c.id from custom.record c
                where c.organization_id = p_org and c.table_id = p_list_id
                  and c.data_class = 'record' and c.deleted_at is null
                  and not (c.id = any(v_keep)) loop
    perform custom.record_delete(p_org, v_old);
  end loop;
  if coalesce(cardinality(v_rows), 0) > 0 then
    perform custom.record_write_many(p_org, p_list_id, v_rows);
  end if;
end;
$function$;

-- SECURITY INVOKER: called directly it changes nothing a caller could not change through the record doors it calls.

CREATE OR REPLACE FUNCTION custom.pick_list_update(p_list_id uuid, p_list_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_items jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org  uuid;
begin
  select t.organization_id into v_org
    from custom.record t where t.id = p_list_id and t.data_class = 'table' and t.deleted_at is null limit 1;
  if v_org is null then
    raise exception 'there is no list with that id in the new system' using errcode = '02000',
          detail = jsonb_build_object('list_id', p_list_id)::text;
  end if;
  -- The one ladder, asked about the list alone (a direct share to a non-member counts; no organization wall).
  if auth.role() <> 'service_role'
     and not coalesce(custom.effective_level((select auth.uid()), v_org, p_list_id, 'record') >= 'editor'::public.permission_level, false) then
    raise exception 'owner access required for this list' using errcode = '42501',
          detail = jsonb_build_object('list_id', p_list_id)::text;
  end if;
  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'A list''s items are a list of choices, each with a label.' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_list_name, '')), '') is not null or p_description is not null then
    perform custom.record_update(v_org, p_list_id, jsonb_strip_nulls(jsonb_build_object(
      'name', nullif(btrim(coalesce(p_list_name, '')), ''), 'description', p_description)));
  end if;
  if p_items is not null then
    -- L6 (2026-10-17): items matched by id keep their id; new ones are added; dropped ones archived.
    perform custom._pick_list_items_apply(v_org, p_list_id, p_items);
  end if;
  return platform._store_pick_list_document(p_list_id, null, 'detail') - 'items_grouped'
         || jsonb_build_object('items', coalesce((
              select jsonb_agg(jsonb_build_object(
                       'id', c.id, 'label', c.data ->> 'name', 'description', c.data ->> 'description',
                       'help_text', c.data ->> 'help_text', 'group_name', c.data ->> 'group_name') order by c.created_at, c.id)
                from custom.record c
               where c.organization_id = v_org and c.table_id = p_list_id
                 and c.data_class = 'record' and c.deleted_at is null), '[]'::jsonb));
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_list(p_list_id uuid, p_list_name character varying DEFAULT NULL::character varying, p_description text DEFAULT NULL::text, p_is_public boolean DEFAULT NULL::boolean, p_authenticated_read boolean DEFAULT NULL::boolean, p_public_read boolean DEFAULT NULL::boolean, p_items jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_org  uuid;
begin
  -- lane LISTS-AFTER-SWITCH: a list that lives in the store is written through the store's own
  -- doors in the caller's seat (rename / describe the Table; p_items edits the choices: items matched
  -- by id keep their id, new ones are added, dropped ones are archived — soft, restorable; L6 2026-10-17).
  if platform.list_lives_in(p_list_id) = 'record' then
    select t.organization_id into v_org
      from custom.record t where t.id = p_list_id and t.data_class = 'table' and t.deleted_at is null limit 1;
    if v_org is null then
      raise exception 'there is no list with that id in the new system' using errcode = '02000',
            detail = jsonb_build_object('list_id', p_list_id)::text;
    end if;
    if (auth.role() = 'service_role'
        or coalesce(custom.has_visibility((select auth.uid()), 'record', p_list_id, 'editor'::public.permission_level), false)) is not true then
      raise exception 'owner access required for this list' using errcode = '42501',
            detail = jsonb_build_object('list_id', p_list_id)::text;
    end if;
    if nullif(btrim(coalesce(p_list_name, '')), '') is not null or p_description is not null then
      perform custom.record_update(v_org, p_list_id, jsonb_strip_nulls(jsonb_build_object(
        'name', nullif(btrim(coalesce(p_list_name, '')), ''), 'description', p_description)));
    end if;
    if p_items is not null then
      perform custom._pick_list_items_apply(v_org, p_list_id, p_items);
    end if;
    return platform._store_pick_list_document(p_list_id, null, 'detail') - 'items_grouped'
           || jsonb_build_object('items', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', c.id, 'label', c.data ->> 'name', 'description', c.data ->> 'description',
                         'help_text', c.data ->> 'help_text', 'group_name', c.data ->> 'group_name') order by c.created_at, c.id)
                  from custom.record c
                 where c.organization_id = v_org and c.table_id = p_list_id
                   and c.data_class = 'record' and c.deleted_at is null), '[]'::jsonb));
  end if;

  -- POST-MOVE-DOORS: there is no older list any more (the older lists are in the deprecated); a list
  -- with no id is no list.
  raise exception 'there is no list with that id in the new system' using errcode = '02000',
        detail = jsonb_build_object('list_id', p_list_id)::text;
end;
$function$;

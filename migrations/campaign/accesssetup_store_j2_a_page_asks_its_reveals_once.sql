-- chair-step: PERFORMANCE of row-scoped reveals (accesssetup_store_j): custom.read_records_by_ids asks the Table setup's reveals ONCE per call (custom._store_row_reveals) and each row through the new custom.store_row_visible_with (no per-row memo round trip); a Table with no setup skips it entirely; the organization-fallback membership is asked once per reveals (is_fallback), never per row. custom.store_row_visible keeps its signature and asks the same body. Answers unchanged.
-- lane: access-store
-- lock: custom
-- based-on: custom._store_row_reveals(uuid, uuid) 2c9829562743619387b7ca15608475f96ba9556ee7567cbdba78e301b4356e70
-- based-on: custom.store_row_visible(uuid, uuid, custom.record, text[]) 0fc0dc686bcf5a740f3d3730163fce5ba1686e2afebd87f9512bab83b5d06e38
-- based-on: custom.read_records_by_ids(uuid, uuid, uuid[], boolean) 9b5b288d030b3a270c2e10f6493665d778836ff4e7a6460204c713ad1a41b037
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1 budget (b).
-- Inverse: migrations/inverse/accesssetup_store_j2_a_page_asks_its_reveals_once_down.sql

CREATE OR REPLACE FUNCTION custom._store_row_reveals(p_person uuid, p_table uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- [{kind, field_key, fallback, keys[]}]: each per-row read cell (row_field / row_creator) of the Table's scoped setup,
-- with the live, non-worked-out columns of its parts this person may otherwise touch (portal narrowing kept).
-- '[]' for a Table with no setup. Kept in the statement memo per (person, table).
declare
  v_key text := 'srr:' || coalesce(p_person::text, '-') || ':' || coalesce(p_table::text, '-');
  v_hit text;
  s jsonb;
  v_org uuid;
  v_out jsonb;
  v_fb boolean;
begin
  if p_person is null or p_table is null then return '[]'::jsonb; end if;
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then return v_hit::jsonb; end if;
  s := iam._access_setup_of_table(p_table);
  if s is null then
    perform platform.memo_k_put(v_key, '[]');
    return '[]'::jsonb;
  end if;
  select t.organization_id into v_org from custom.record t where t.id = p_table;
  v_fb := exists (select 1 from custom.store_seat_fallback(v_org) u where u = p_person);
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', st #>> '{resolver,seat,kind}',
           'field_key', custom._store_seat_field_key(nullif(st #>> '{resolver,seat,field_id}', '')::uuid, p_table),
           'fallback', coalesce((st ->> 'required')::boolean, false) and st ->> 'fallback' = 'org_owners_admins',
           'is_fallback', v_fb,
           'keys', (select coalesce(jsonb_agg(distinct f.data ->> 'key'), '[]'::jsonb)
                      from custom.record f
                     where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                       and (f.data ->> 'entity_definition_id')::uuid = p_table and coalesce(f.data ->> 'type', '') <> 'formula'
                       and (g.value -> custom.store_field_part(f.data) ->> 'level') is not null
                       and (g.value -> custom.store_field_part(f.data) ->> 'level')::public.permission_level >= 'viewer'
                       and custom._store_portal_allows(p_person, f.id, v_org, 'read')))), '[]'::jsonb)
    into v_out
    from jsonb_array_elements(coalesce(s -> 'seats', '[]'::jsonb)) st
    join jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g on g.key = st ->> 'key'
   where st #>> '{resolver,seat,kind}' in ('row_field', 'row_creator');
  v_out := coalesce((select jsonb_agg(e) from jsonb_array_elements(v_out) e where jsonb_array_length(e -> 'keys') > 0), '[]'::jsonb);
  perform platform.memo_k_put(v_key, v_out::text);
  return v_out;
end $function$;

-- the row's visible keys from reveals the caller already holds (asked once per page); the organization fallback
-- membership is asked at most once per call and only when a required row seat names nobody
create or replace function custom.store_row_visible_with(p_reveals jsonb, p_person uuid, p_row custom.record, p_visible text[])
 returns text[]
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  e jsonb;
  v_out text[] := p_visible;
  v_held boolean;
  v_people uuid[];
  v_add boolean := false;
begin
  if p_reveals is null or jsonb_array_length(p_reveals) = 0 or p_row.id is null then return p_visible; end if;
  for e in select x from jsonb_array_elements(p_reveals) x loop
    if e ->> 'kind' = 'row_creator' then
      v_held := p_row.created_by = p_person;
      v_people := case when p_row.created_by is null then '{}'::uuid[] else array[p_row.created_by] end;
    elsif e ->> 'field_key' is null or jsonb_typeof(p_row.data -> (e ->> 'field_key')) is null
          or jsonb_typeof(p_row.data -> (e ->> 'field_key')) = 'null' then
      v_held := false; v_people := '{}'::uuid[];
    else
      v_people := custom._store_seat_cell_people(p_row.data -> (e ->> 'field_key'));
      v_held := p_person = any (v_people);
    end if;
    if not coalesce(v_held, false) and (e ->> 'fallback')::boolean and cardinality(v_people) = 0 then
      v_held := coalesce((e ->> 'is_fallback')::boolean, false);
    end if;
    if coalesce(v_held, false) then
      v_out := v_out || array(select jsonb_array_elements_text(e -> 'keys'));
      v_add := true;
    end if;
  end loop;
  if not v_add then return p_visible; end if;
  return array(select distinct u from unnest(v_out) u);
end $function$;

-- the one-row form keeps its signature and asks the same body
create or replace function custom.store_row_visible(p_person uuid, p_table uuid, p_row custom.record, p_visible text[])
 returns text[]
 language sql
 stable security definer
 set search_path to ''
as $function$
  select custom.store_row_visible_with(custom._store_row_reveals(p_person, p_table), p_person, p_row, p_visible);
$function$;

CREATE OR REPLACE FUNCTION custom.read_records_by_ids(p_organization_id uuid, p_table_id uuid, p_record_ids uuid[], p_by_id boolean DEFAULT false)
 RETURNS TABLE(id uuid, document jsonb, level permission_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me       uuid := auth.uid();
  v_rec      record;
  v_set      record;
  v_mask     jsonb;
  v_visible  text[];
  v_declared text[];
  v_rv       text[];
  v_reveals  jsonb;    -- ACCESS-SETUP §12.1: the Table setup's row-scoped read cells for this reader, asked once per call   -- ACCESS-SETUP §12.1: this row's visible keys (row-scoped parts revealed)
  v_n        integer := coalesce(cardinality(p_record_ids), 0);
  v_rows     custom.record[];
  v_row      custom.record;
  v_levels   jsonb;
  v_cache    jsonb := '{}'::jsonb;
  v_vs       record;
  v_cr       jsonb;
  v_world_def boolean := false;
  v_seen     uuid[];  -- PERF-FIX-5
  v_mask_ready boolean := false;  -- HOT-DOORS-2
  v_mask_lvl   text;
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- CHAIR-WORLD-LANE-2: the wall first (as custom.assert_may_know_table asks it), then — for a person it admitted
  -- ONLY through the world lane — the one other way through: every row asked for is a definition row of a Public
  -- Table of this organization (the Table record itself, one of its Fields, or a choice of one of its Fields).
  -- Anything else, and every other person, meets custom.assert_may_know_table exactly as before.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_by_ids');
  v_world_def := custom.world_reader_reads_public_definition(p_organization_id, p_table_id, p_record_ids);
  if not v_world_def then
    perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_by_ids');
  end if;

  -- NOTHING ASKED FOR IS NOT AN ERROR — it is an empty answer, and it costs nothing.
  if v_n = 0 then
    return;
  end if;

  -- THE SAME CEILING THE PAGE DOORS DECLARE, and it refuses above it by name rather than
  -- handing back a short list the caller cannot tell from a complete one.
  perform custom.page_size(p_organization_id, 'custom.read_records_by_ids', v_n, 200);

  -- STEP 1, ONCE: THE ONE LADDER decides WHICH rows. Identical call, identical arguments to
  -- the page door's. This is the question that must never be asked twice in two ways.
  -- PERF-FIX-5 (2026-10-08). A READ OF N IDS ASKS ABOUT THOSE N ROWS, NOT ABOUT THE WHOLE TABLE. On the Table kernel
  -- (the Table's own row, which every table page reads) custom.visible_set answers by walking the one ladder over EVERY live
  -- Table of the organization, to return one. Its kernel branch hands back nothing but "every Table is seen" or the seen list
  -- (no class, no granted answer), so the rows asked for are visible when she created them or when custom.tables_seen_among
  -- - the very walk the set builds its list from, here for these ids only, asked through iam.has_access_for_many first -
  -- sees them. Only where visible_set does not stop (an archived organization, a registered FK containment parent for record)
  -- and for a person admitted through the world lane; everything else, every other Table, asks visible_set as before.
  -- mx.read_by_ids_set = off: the whole set, as before (the proofs compare both on one snapshot).
  if p_table_id = custom.table_kernel_id()
     and not v_world_def
     and coalesce(current_setting('mx.read_by_ids_set', true), '') <> 'off'
     and not exists (select 1 from platform.entity_relationships er
                      where er.child_type = 'record' and er.kind in ('composition', 'containment'))
     and not exists (select 1 from iam.organizations o
                      where o.id = p_organization_id and o.archived_at is not null) then
    select coalesce(array_agg(g.id), '{}'::uuid[]) into v_seen
      from custom.tables_seen_among(v_me, array[p_organization_id], p_record_ids) g
     where g.seen and g.organization_id = p_organization_id;
    select false as o_all_visible, '{}'::platform.visibility[] as o_true_visibility, '{}'::uuid[] as o_granted_all,
           '{}'::uuid[] as o_granted_visible, v_seen as o_carried_visible, 0 as o_ladder_calls,
           false as o_fallback, null::text as o_note
      into v_set;
  else
    v_set := custom.visible_set(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level);
  end if;

  if v_set.o_fallback then
    raise notice '%', v_set.o_note;
  end if;

  -- STORE-READ-PERF-2: the rows first, in the door's own order, so the ladder can be asked about
  -- the whole set at once (custom.levels_of) instead of once per row inside custom.read_mask.
  select coalesce(array_agg(r order by r.created_at desc, r.id), '{}'::custom.record[]) into v_rows
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = p_table_id
       and r.deleted_at is null
       and r.id = any (p_record_ids)
       and ( case
               -- CHAIR-WORLD-LANE-2: definition rows of a Public Table, every one checked above, read at viewer.
               when v_world_def then
                 true
               -- The ladder could not answer in a bounded way, so each row is asked directly —
               -- `read_records`' fallback arm, and the same single call.
               when v_set.o_fallback then
                 custom.has_visibility(v_me, 'record', custom.record_org_hint(r.id, r.organization_id), 'viewer')
               -- Every live row of this Table is hers.
               when v_set.o_all_visible then
                 true
               -- A class she holds, WITH EXCEPTIONS: a granted id is never answered by its
               -- class (VIS-19), and containment only ever adds (VIS-6).
               when coalesce(array_length(v_set.o_true_visibility, 1), 0) > 0 then
                 ( r.created_by = v_me
                   or (r.visibility = any (v_set.o_true_visibility)
                       and not (r.id = any (v_set.o_granted_all)))
                   or r.id = any (v_set.o_granted_visible)
                   or r.id = any (v_set.o_carried_visible) )
               -- Nothing by class — `shared_only`, or a Table nobody shared with her.
               else
                 ( r.created_by = v_me
                   or r.id = any (v_set.o_granted_visible)
                   or r.id = any (v_set.o_carried_visible) )
             end )
  ;
  -- HOT-DOORS-3 (2026-10-08): every row here is a row of p_organization_id, so the levels are read in it
  -- (custom.levels_of, handed the organization in the statement memo: same answers, one partition). mx.read_page_set = off: as before.
  if coalesce(current_setting('mx.read_page_set', true), '') = 'off' then
    v_levels := custom.levels_of(v_me, (select array_agg(x.id) from unnest(v_rows) x));
  else
    perform platform.memo_k_put('custom.levels_of_org', p_organization_id::text);
    v_levels := custom.levels_of(v_me, (select array_agg(x.id) from unnest(v_rows) x));
    perform platform.memo_k_put('custom.levels_of_org', '');
  end if;

  foreach v_row in array v_rows
  loop
    select * into v_vs from custom.record_values_step(v_row, v_cache);
    v_cache := v_vs.o_cache;
    if v_cr is null then
      v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
    end if;
    -- STEP 2, PER ROW: THE ONE MASK decides which FIELDS of it she may see, at the level she
    -- holds ON THIS RECORD. The same call `custom.read_record` makes for its one row.
    -- The row is in p_organization_id and p_table_id (the query above says so), which is the
    -- organization and Table custom.read_mask took the mask in; the rung is the set's answer.
    -- HOT-DOORS-2 (2026-10-08): THE FIELD QUESTION ONCE PER LEVEL, NOT ONCE PER ROW. The mask depends on the
    -- table, the reader and the level only; a page of 50 rows at one level asked it 50 times (0.6 ms each,
    -- 29 ms of a page). The rows are the same; a row at another level asks again.
    if not v_mask_ready
       or v_mask_lvl is distinct from (case when v_world_def then 'viewer' else (v_levels -> v_row.id::text ->> 'l') end) then
      v_mask_lvl := case when v_world_def then 'viewer' else (v_levels -> v_row.id::text ->> 'l') end;
      v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id,
                                     case when v_world_def then 'viewer'::public.permission_level
                                          else (v_levels -> v_row.id::text ->> 'l')::public.permission_level end, 'read');
      -- DOOR-N-5: id-keyed on request means EVERY declared Field's key, as the page doors do.
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
        from jsonb_array_elements(v_mask -> 'visible') x;
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared
        from jsonb_array_elements(v_mask -> 'declared') x;
      v_mask_ready := true;
    end if;

    id := v_row.id;
    if v_reveals is null then v_reveals := custom._store_row_reveals(v_me, p_table_id); end if;
    v_rv := case when jsonb_array_length(v_reveals) = 0 then v_visible
                 else custom.store_row_visible_with(v_reveals, v_me, v_row, v_visible) end;
    document := custom.choice_render_with(p_organization_id, p_table_id,
                  custom.mask_document(v_vs.o_doc, v_rv, v_mask -> 'notices', p_by_id,
                                       v_mask -> 'all_key_ids', v_declared), v_cr);
    -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
    document := custom.with_whole_value_pointers(document, v_row.data -> '_values', v_row.data -> '_sources', v_rv, p_by_id, v_mask -> 'all_key_ids');
    -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
    document := custom.with_retired(document, v_row.data -> '_retired', v_rv, v_declared);
    level := (v_mask ->> 'level')::public.permission_level;
    return next;
  end loop;
end;
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_j2_a_page_asks_its_reveals_once.sql (lane access-store)', 'ACCESS-SETUP §12.1: one rows visible keys from reveals already asked.',
       'server_only: an internal Store Tables answer, called only by other store functions and the equivalence proof; takes any person id, so never a client door', false, false
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom.store_row_visible_with(jsonb,uuid,custom.record,text[])'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;
revoke all on function custom.store_row_visible_with(jsonb,uuid,custom.record,text[]) from public, anon, authenticated;

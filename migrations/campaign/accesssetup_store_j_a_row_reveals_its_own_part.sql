-- chair-step: ROW-SCOPED PARTS IN READS (access-setup PLAN §12.1 "only that row's JSON reveals it"). ADDS custom._store_row_reveals (the Table setup's row_field / row_creator read cells for one person, statement-memoised; '[]' for a Table with no setup) and custom.store_row_visible (a row's visible keys: the mask's plus a row-scoped part's columns in exactly the rows where the person holds that seat, org owners/admins when a required seat names nobody). REPLACES custom.read_records_by_ids (every page, keyset, view-order and bundle read), custom._read_record_with (single reads) and custom.record_card to mask each row with those keys. Sort, filter, search, aggregates, group headers, drill, enrichment and duplicate keep asking the mask, where the part stays hidden. A Table with no setup answers exactly as before.
-- lane: access-store
-- lock: custom
-- based-on: custom.read_records_by_ids(uuid, uuid, uuid[], boolean) 4e25a0e3aebd3eb4564834d397f4df849442e9fbf0d0f9a4823288d8c617fdec
-- based-on: custom._read_record_with(uuid, uuid, boolean, jsonb, jsonb) 1b651a5887dedf7e9ba96db179162fe03e970594039115fcfadb94363b09f662
-- based-on: custom.record_card(uuid, uuid, uuid) 3f8b672a6649db216f3cf78042e45ab3d509a60e140d05803846ce8471c381a5
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1 ("One page, one answer").
-- Inverse: migrations/inverse/accesssetup_store_j_a_row_reveals_its_own_part_down.sql

-- ── the row-scoped reveals of one person on one Table (per statement) ─────────────────────────────
create or replace function custom._store_row_reveals(p_person uuid, p_table uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
-- [{kind, field_key, fallback, keys[]}]: each per-row read cell (row_field / row_creator) of the Table's scoped setup,
-- with the live, non-worked-out columns of its parts this person may otherwise touch (portal narrowing kept).
-- '[]' for a Table with no setup. Kept in the statement memo per (person, table).
declare
  v_key text := 'srr:' || coalesce(p_person::text, '-') || ':' || coalesce(p_table::text, '-');
  v_hit text;
  s jsonb;
  v_org uuid;
  v_out jsonb;
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
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', st #>> '{resolver,seat,kind}',
           'field_key', custom._store_seat_field_key(nullif(st #>> '{resolver,seat,field_id}', '')::uuid, p_table),
           'fallback', coalesce((st ->> 'required')::boolean, false) and st ->> 'fallback' = 'org_owners_admins',
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

-- ── the columns one row reveals to one person: the page's visible keys plus a row-scoped part's columns in
--    exactly the rows where the person holds that seat (§12.1 "only that row's JSON reveals it"). Every
--    set-wide use (sort, filter, search, aggregates, group headers, drill, enrichment, duplicate) keeps asking
--    the mask, where such a part stays hidden. ──────────────────────────────────────────────────────────
create or replace function custom.store_row_visible(p_person uuid, p_table uuid, p_row custom.record, p_visible text[])
 returns text[]
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  r jsonb := custom._store_row_reveals(p_person, p_table);
  e jsonb;
  v_out text[] := p_visible;
  v_held boolean;
  v_people uuid[];
begin
  if jsonb_array_length(r) = 0 or p_row.id is null then return p_visible; end if;
  for e in select x from jsonb_array_elements(r) x loop
    if e ->> 'kind' = 'row_creator' then
      v_held := p_row.created_by = p_person;
      v_people := case when p_row.created_by is null then '{}'::uuid[] else array[p_row.created_by] end;
    else
      v_people := case when e ->> 'field_key' is null then '{}'::uuid[]
                       else custom._store_seat_cell_people(p_row.data -> (e ->> 'field_key')) end;
      v_held := p_person = any (v_people);
    end if;
    if not coalesce(v_held, false) and (e ->> 'fallback')::boolean and cardinality(v_people) = 0 then
      v_held := p_person in (select custom.store_seat_fallback(p_row.organization_id));
    end if;
    if coalesce(v_held, false) then
      v_out := v_out || array(select jsonb_array_elements_text(e -> 'keys'));
    end if;
  end loop;
  return array(select distinct u from unnest(v_out) u);
end $function$;

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
  v_rv       text[];   -- ACCESS-SETUP §12.1: this row's visible keys (row-scoped parts revealed)
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
    v_rv := custom.store_row_visible(v_me, p_table_id, v_row, v_visible);
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

CREATE OR REPLACE FUNCTION custom._read_record_with(p_organization_id uuid, p_record_id uuid, p_by_id boolean, p_levels jsonb, p_cache jsonb, OUT o_doc jsonb, OUT o_cache jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me       uuid := auth.uid();
  v_table    uuid;
  v_doc      jsonb;
  v_mask     jsonb;
  v_visible  text[];
  v_declared text[];
  v_now      uuid;
  v_alts     jsonb;
  v_out      jsonb;
  v_wv_values  jsonb;
  v_wv_sources jsonb;
  v_row      custom.record;
  v_vs       record;
  v_ck       text;
  v_mk       text;
  v_wk       text;
  v_ak       text;
  v_level    public.permission_level;
  v_known    boolean;
  v_key_ids  jsonb;
begin
  o_cache := coalesce(p_cache, '{}'::jsonb);
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501', hint = 'DOOR-1: the read door reads the person from the session.';
  end if;

  -- ARGS-RULED (2026-09-21). THE WALL IS DECIDED FIRST, AND IT WAS NOT DECIDED AT ALL.
  -- REC-29: "organizations are hard walls, and a door decides who may reach one before it
  -- decides anything else" — every other door in this store obeys it and DOOR-1, the one read
  -- door, did not. It made no membership decision about the organization it was handed.
  -- CHAIR-READPERF (round 2): asked once per organization in one call. The wall's yes holds for the
  -- statement (custom.assert_client_may_reach remembers it itself, at the price of a hash of the
  -- person's claims on every ask); a set door reading 600 records of one organization carries the
  -- yes in o_cache instead. A no raises, so it is never carried. The cache is this door's own: no
  -- client role may call it (it has no client grant), exactly as with the rungs it is handed.
  v_wk := 'w:' || p_organization_id::text;
  if not coalesce(o_cache ? v_wk, false) then
    perform custom.assert_client_may_reach(p_organization_id, 'custom.read_record');
    if v_wk is not null then
      o_cache := o_cache || jsonb_build_object(v_wk, true);
    end if;
  end if;

  -- REC-21 / T5. THE ID A MERGE SENT SOMEWHERE ELSE — a redirect, never a silent substitution.
  -- CHAIR-READPERF (round 2): custom.resolve_id follows custom.record_alias rows of this organization
  -- that are not revoked; an organization that keeps none answers every id with itself, so whether
  -- it keeps any is asked once per call and the per-record lookup is skipped when it keeps none.
  v_ak := 'al:' || p_organization_id::text;
  if not coalesce(o_cache ? v_ak, true) then
    o_cache := o_cache || jsonb_build_object(v_ak, exists (
                 select 1 from custom.record_alias ra
                  where ra.organization_id = p_organization_id and ra.revoked_at is null));
  end if;
  v_now := case when coalesce((o_cache ->> v_ak)::boolean, true)
                then custom.resolve_id(p_organization_id, p_record_id)
                else p_record_id end;
  -- STORE-READ-PERF-2: a set door that already asked the ladder about this record for the whole
  -- set (custom.levels_of) hands the answer in; alone, the door asks it here as it always did.
  v_known := coalesce(p_levels ? v_now::text, false);

  -- AND THE LADDER BEFORE EXISTENCE. This used to raise 02000 "there is no record % in this
  -- organization" BEFORE asking custom.has_visibility, so the two answers differed: a caller who
  -- guessed a record uuid learned whether it existed in that organization (02000) or not
  -- (42501). One bit per guess, and the store's own rule is that a record you may not open and a
  -- record that is not there answer the same thing. `custom.has_visibility` answers false for an
  -- id that is not there, so this ordering makes the two identical without a second read.
  if not (case when v_known then (p_levels -> v_now::text ->> 's')::boolean
               else custom.has_visibility(v_me, 'record', custom.record_org_hint(v_now, p_organization_id), 'viewer') end) then
    raise exception 'You do not have access to this record.'
      using errcode = '42501',
            hint = 'DOOR-1: nothing reads a record around this door - not a screen, not an agent, not an export. Ask somebody who holds it to share it with you.';
  end if;

  select r.* into v_row
    from custom.record r
   where r.organization_id = p_organization_id and r.id = v_now and r.deleted_at is null;
  if not found then
    -- Only somebody the ladder has already admitted reaches this sentence, so it now tells a
    -- person who holds the record that it is in the trash — and tells a stranger nothing.
    raise exception 'There is no such record in this organization.' using errcode = '02000', hint = 'It was deleted, or it never existed here.',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;
  v_table := v_row.table_id;
  v_wv_values := v_row.data -> '_values';
  v_wv_sources := v_row.data -> '_sources';
  -- custom.record_values_of(r), with the Table's plan carried from record to record.
  select * into v_vs from custom.record_values_step(v_row, o_cache);
  v_doc := v_vs.o_doc;
  o_cache := v_vs.o_cache;

  -- THE ONE FACT. `custom.read_mask` is the whole of what this door used to work out privately.
  -- CHAIR-READPERF (2026-10-03): taken from the row this door holds — custom.read_mask_at re-read it
  -- by id alone (every partition) to learn the Table and organization already in v_row — and kept in
  -- o_cache per (organization, Table, rung) for the rest of the call, so a set door parses each
  -- Table's mask once. The rung is the set's answer when a set door handed it in, else the ladder's,
  -- asked only for a row that has a Table (a row with no Table takes the empty mask either way).
  if v_table is not null then
    v_level := case when v_known then (p_levels -> v_now::text ->> 'l')::public.permission_level
                    else custom.effective_level(v_me, p_organization_id, v_now) end;
  end if;
  v_mk := 'rm:' || p_organization_id::text || ':' || coalesce(v_table::text, '-') || ':' || coalesce(v_level::text, '-');
  v_mask := o_cache -> v_mk;
  if v_mask is null then
    v_mask := custom.read_mask_for(v_me, p_organization_id, v_table, v_level, 'read');
    o_cache := o_cache || jsonb_build_object(v_mk, v_mask);
  end if;
  -- STORE-READ-PERF-2 / DOOR-N-5: id-keyed on request means EVERY declared Field's key, as the
  -- page doors have always done — not only the hidden ones.
  v_key_ids := coalesce(v_mask -> 'all_key_ids', v_mask -> 'key_ids');
  v_visible := array(select jsonb_array_elements_text(coalesce(v_mask -> 'visible', '[]'::jsonb)));
  v_declared := array(select jsonb_array_elements_text(coalesce(v_mask -> 'declared', '[]'::jsonb)));

  -- ACCESS-SETUP §12.1: a row-scoped part's columns, revealed on this row to the person holding its seat
  v_visible := custom.store_row_visible(v_me, v_table, v_row, v_visible);
  v_out := custom.mask_document(v_doc, v_visible, v_mask -> 'notices', p_by_id,
                                v_key_ids, v_declared);

  -- CHOICE-VALUE. Rendered AFTER masking, so a field this reader may not see keeps its notice
  -- and is never resolved.
  if v_table is not null then
    v_ck := 'cr:' || p_organization_id::text || ':' || v_table::text;
    if not (o_cache ? v_ck) then
      o_cache := o_cache || jsonb_build_object(v_ck, custom.choice_render_plan(p_organization_id, v_table));
    end if;
    v_out := custom.choice_render_with(p_organization_id, v_table, v_out, o_cache -> v_ck);
  end if;

  -- BIG-VALUES-READERS. A value too big for one cell keeps its first words here and its whole
  -- text in a file; the pointer (`_values.<key>.src` -> `_sources.<ptr>`, the file fields only)
  -- rides along for the keys this reader may see, so a screen opens the file and an agent's
  -- context reads the whole text. Nothing else of the provenance block is carried.
  -- SCOPES-HANDOFF-BUDGET: asked only when the record keeps a whole value in a file. Otherwise
  -- custom.with_whole_value_pointers hands the document back unchanged (whole_value_pointer_of is
  -- null for every key when `_sources` is not an object or names no whole_value_in_file), but a
  -- record with `_values` and no `_sources` took its slow arm and cost a third of a millisecond.
  if jsonb_typeof(v_wv_values) = 'object' and jsonb_typeof(v_wv_sources) = 'object'
     and exists (select 1 from jsonb_each(v_wv_sources) s0
                  where s0.value ->> 'kind' = 'whole_value_in_file'
                    and coalesce(s0.value ->> 'file_id', '') <> '') then
    v_out := custom.with_whole_value_pointers(v_out, v_wv_values, v_wv_sources, v_visible, p_by_id,
                                              v_key_ids);
  end if;

  -- T5 / REC-N-11. THE ALTERNATES THE MERGE KEPT — only for keys this reader may see.
  -- SCOPES-HANDOFF-BUDGET: read from v_row, the row fetched above by its key (organization, id) —
  -- the same row this query used to fetch a second time — and only when some value keeps one.
  if v_wv_values is not null
     and (jsonb_typeof(v_wv_values) <> 'object' or v_wv_values @? '$.*.alternates') then
    select jsonb_object_agg(k, alts) into v_alts
      from (
        select e.key as k,
               (select jsonb_agg(jsonb_build_object(
                         'value',  a -> 'value',
                         'rank',   a -> 'rank',
                         'source', v_row.data -> '_sources' -> (a ->> 'src'))
                       order by (a ->> 'rank')::int)
                  from jsonb_array_elements(coalesce(e.value -> 'alternates', '[]'::jsonb)) a) as alts
          from jsonb_each(coalesce(v_row.data -> '_values', '{}'::jsonb)) e
         where e.key = any (v_visible)
           and jsonb_array_length(coalesce(e.value -> 'alternates', '[]'::jsonb)) > 0
      ) x
     where x.alts is not null;
  end if;

  if v_alts is not null and v_alts <> '{}'::jsonb then
    v_out := v_out || jsonb_build_object('_alternates', v_alts);
  end if;

  -- SEAT-SUITES / T5+T12. THE VALUES THE STORE KEPT AND THE DOOR THREW AWAY, masked exactly
  -- like the value they used to be.
  -- SCOPES-HANDOFF-BUDGET: from v_row (the same row, by its key), and only when it keeps one.
  v_out := custom.with_retired(v_out, v_row.data -> '_retired', v_visible, v_declared);

  if v_now is distinct from p_record_id then
    v_out := v_out || jsonb_build_object(
      '_redirected_from', p_record_id,
      '_redirect_says', 'That record was merged into this one, so its id now answers with this record. REC-21: the merged id resolves to the survivor for good — undoing the merge puts both records and both ids back.');
  end if;

  o_doc := v_out;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.record_card(p_viewer uuid, p_organization_id uuid, p_record_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- THE MASKED DOCUMENT FOR ONE READER, FOR ONE RECORD, WHEREVER THAT RECORD LIVES.
--
-- `custom.read_record` is the door a person opens a record of THEIR OWN organization
-- through, and it starts by asserting that organization. A record on the other side of the
-- wall fails that assertion by definition — the reader is not a member there — so following
-- a cross-organization link cannot go through it. What must NOT be re-implemented is the
-- part after the wall: the one ladder, then the level, then `iam.visible_field_ids` at that
-- level, then `custom.mask_document` with a notice per hidden key. That is this function,
-- byte for byte, and `custom.read_record` is untouched.
--
-- It decides. `custom.has_visibility` is asked about p_viewer and this record, and a reader
-- it says no to gets null rather than a document — including, and especially, a reader whose
-- only relationship to the owning organization is that somebody there linked to this record.
declare
  v_table    uuid;
  v_doc      jsonb;
  v_level    public.permission_level;
  v_visible  text[];
  v_declared text[];
  v_notices  jsonb;
  v_key_ids  jsonb;
  v_mask     jsonb;
begin
  if p_viewer is null or p_record_id is null then
    return null;
  end if;

  select r.table_id, custom.record_values(r.organization_id, r.id)
    into v_table, v_doc
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  if not found then
    return null;
  end if;

  if not custom.has_visibility(p_viewer, 'record', p_record_id, 'viewer') then
    return null;
  end if;

  v_level := custom.effective_level(p_viewer, p_organization_id, p_record_id);

  -- READ-MASK-ONCE: the field mask is the one door's answer, asked once per statement for this
  -- (person, organization, Table, level) and memoised — never worked out here a second way.
  v_mask := custom.read_mask_for(p_viewer, p_organization_id, v_table, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared
    from jsonb_array_elements(v_mask -> 'declared') x;
  v_notices := v_mask -> 'notices';
  v_key_ids := v_mask -> 'key_ids';

  -- ACCESS-SETUP §12.1: a row-scoped part's columns, revealed on this row to the person holding its seat
  v_visible := custom.store_row_visible(p_viewer, v_table, (select r from custom.record r where r.id = p_record_id), v_visible);
  return custom.mask_document(v_doc, v_visible, v_notices, false, v_key_ids, v_declared);
end;
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_j_a_row_reveals_its_own_part.sql (lane access-store)', 'ACCESS-SETUP §12.1: the row-scoped read cells of a Table setup for one person.',
       'server_only: an internal Store Tables answer, called only by other store functions and the equivalence proof; takes any person id, so never a client door', false, false
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom._store_row_reveals(uuid,uuid)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;
revoke all on function custom._store_row_reveals(uuid,uuid) from public, anon, authenticated;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_j_a_row_reveals_its_own_part.sql (lane access-store)', 'ACCESS-SETUP §12.1: one rows visible keys with its row-scoped parts revealed.',
       'server_only: an internal Store Tables answer, called only by other store functions and the equivalence proof; takes any person id, so never a client door', false, false
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom.store_row_visible(uuid,uuid,custom.record,text[])'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;
revoke all on function custom.store_row_visible(uuid,uuid,custom.record,text[]) from public, anon, authenticated;

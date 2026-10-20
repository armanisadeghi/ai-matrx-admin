-- chair-step: the inverse of READ-SPEED-7 a — a partial reader's worked-out columns are all worked out at read again
-- lane: READ-SPEED-7
-- allows: revoke custom
-- based-on: custom.read_records_by_ids(uuid, uuid, uuid[], boolean) a6db1ba0ecf6d7352f051147c5de3ff31b5175d464bbfde6a4515e2ab88d0c86
-- based-on: custom._page_derived_prefetch(uuid, uuid, uuid[]) fd7f4533647cdcaef617ae2d2c2795278c69f2682a932045ecebbec41ff9f3cb
-- based-on: custom._computed_warm(uuid, uuid, uuid) 9026a625922b0f6341dcf6d4630d7ab9de2b5f3cb983d5cc6d836b9891027882
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
  v_store      jsonb;    -- READ-SPEED-3: this page's kept worked-out values, {record id: values}
  v_fresh_ids  uuid[];
  v_tdefs      jsonb;    -- READ-SPEED-3: this Table's columns that read the clock, {key: declaration}: worked out now
  v_kept       jsonb;
  v_kplain     jsonb;
  v_tk         text;
  v_try        jsonb;
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

  -- READ-SPEED-2: the page's roll-ups and lookups, worked out for every row at once (each row is one this reader
  -- may open: the visible set above chose it). The loop below reads them from the statement memo.
  -- READ-SPEED-3: KEPT VALUES. A reader who sees every row and column the Table's worked-out values come from
  -- (custom._computed_reader_ok) is served the kept values of every current row (custom.record_computed); a stale,
  -- missing or unkeepable row, and every other reader, is worked out below exactly as before.
  if not v_world_def and cardinality(v_rows) > 0
     and custom._computed_reader_ok(v_me, p_organization_id, p_table_id) then
    select coalesce(jsonb_object_agg(rc.record_id::text, rc.vals), '{}'::jsonb) into v_store
      from custom.record_computed rc
     where rc.record_id = any (select x.id from unnest(v_rows) x)
       and rc.organization_id = p_organization_id and rc.table_id = p_table_id
       and not rc.stale and rc.vals is not null;
    select coalesce(jsonb_object_agg(f.data ->> 'key', f.data), '{}'::jsonb) into v_tdefs
      from custom.record f
     where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and f.data ->> 'entity_definition_id' = p_table_id::text
       and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
       and coalesce(f.data ->> 'compute_on', '') = 'read'
       and coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? (f.data ->> 'key');
  end if;
  select coalesce(array_agg(x.id), '{}') into v_fresh_ids from unnest(v_rows) x
   where v_store is null or not (v_store ? x.id::text);
  if not v_world_def and cardinality(v_fresh_ids) > 1 then
    perform custom._page_derived_prefetch(p_organization_id, p_table_id, v_fresh_ids);
  end if;
  foreach v_row in array v_rows
  loop
    if v_store is not null and v_store ? v_row.id::text then
      -- custom.record_values_step's document, its read-time columns (and their _errors) taken from the store
      v_kplain := (v_row.data - '_computed' - '_retired' - '_values' - '_sources' - '_derived')
             || case when v_row.data ? '_computed' then custom.computed_block(v_row.data -> '_computed') else '{}'::jsonb end
             || case when v_row.data ? '_derived' then custom.computed_block(v_row.data -> '_derived') else '{}'::jsonb end;
      v_kept := v_store -> v_row.id::text;
      -- a column that reads the clock is worked out now, exactly as custom.record_values_step works it out
      for v_tk in select k from jsonb_object_keys(coalesce(v_tdefs, '{}'::jsonb)) k loop
        continue when not (v_kept ? v_tk);
        v_try := custom._derived_attempt(p_organization_id, v_row.id, v_tdefs -> v_tk, v_kplain);
        v_kept := (v_kept - '_errors') || jsonb_build_object(v_tk, v_try -> 'v')
                  || case when (coalesce(v_kept -> '_errors', '{}'::jsonb) - v_tk)
                                || case when v_try ? 'e' then jsonb_build_object(v_tk, v_try -> 'e') else '{}'::jsonb end = '{}'::jsonb
                          then '{}'::jsonb
                          else jsonb_build_object('_errors', (coalesce(v_kept -> '_errors', '{}'::jsonb) - v_tk)
                                || case when v_try ? 'e' then jsonb_build_object(v_tk, v_try -> 'e') else '{}'::jsonb end) end;
      end loop;
      select v_kplain || v_kept as o_doc, v_cache as o_cache into v_vs;
    else
      select * into v_vs from custom.record_values_step(v_row, v_cache);
      v_cache := v_vs.o_cache;
    end if;
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

CREATE OR REPLACE FUNCTION custom._page_derived_prefetch(p_organization_id uuid, p_table_id uuid, p_record_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_tf      text;
  v_fields  jsonb[];
  fd        jsonb;
  v_par     text;
  v_via     text;
  v_key     text;
  v_agg     text;
  v_filter  jsonb;
  v_hash    text;
  v_table   uuid;
  v_gone    jsonb;
  v_tg      jsonb;
  v_back_ids uuid[];
  v_back    jsonb;
  v_me      uuid;
  v_pred    text;
  v_mk      text;
  v_memo    text;
  v_far     uuid;
  v_where   text;
  v_all     uuid[];
  v_pass    uuid[];
  v_fv      jsonb;
  v_vals    jsonb[];
  v_nums    numeric[];
  v_out     jsonb;
  v_one     jsonb;
  v_val     jsonb;
  v_n       integer;
  v_rid     uuid;
  v_t       uuid;
  v_multi   boolean;
  v_values  jsonb;
  v_put     integer := 0;
begin
  -- READ-SPEED-2 (2026-10-19): A PAGE'S ROLL-UPS AND LOOKUPS ARE WORKED OUT FOR THE WHOLE PAGE AT ONCE.
  -- Asked one record at a time, every roll-up of every row found its links, asked the reader's predicate, compiled
  -- its filter, read each linked record and asked whether its source was archived — per row, per column, and again
  -- for every formula that reads it (rows x columns x formulas). Here each read-time roll-up and lookup of the Table
  -- is worked out ONCE for all of p_record_ids: its links in one statement (forward links from the documents, back-
  -- links from platform.associations through the reader's predicate), its filter compiled once and asked once over
  -- every linked record, the column it reads taken from every linked record in one statement
  -- (custom._far_values), and the answer per row by the one aggregation (custom._rollup_agg). Each answer is put in
  -- the statement memo under (organization, record, md5 of the column's declaration); custom.rollup_value and
  -- custom.lookup_value answer from it first, so the per-row path, every formula over these columns and every
  -- error stay exactly as they were. Nothing is stored and nothing is invalidated: the memo lives for this
  -- statement, for this reader, and any Field or Rule write clears it.
  --   Kept per row, unchanged (nothing put): a column whose set answer raises (a refusal, a far column that cannot
  --   be read, a circle), a filtered roll-up whose answer depends on the linked records' order, and every record
  --   when a derived read is already in progress (custom.derived_stack). Those rows ask custom.rollup_value /
  --   custom.lookup_value as before and get the same answer and the same sentence.
  --   🚨 THE CALLER'S PROMISE: every id is a live row of p_table_id that this reader may open at viewer (the read
  --   doors hand only the rows their visible set chose). custom.relation_targets asks custom.assert_client_may_open
  --   per row; for these rows that question is already answered yes.
  --   mx.page_prefetch = off: nothing is put (the proofs compare both on one snapshot).
  if coalesce(cardinality(p_record_ids), 0) < 2
     or coalesce(current_setting('custom.derived_stack', true), '') <> ''
     or coalesce(current_setting('mx.page_prefetch', true), '') = 'off' then
    return 0;
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.relation_targets');

  v_tf := custom.table_type_field(p_organization_id, p_table_id);
  select coalesce(array_agg(x.d), '{}'::jsonb[]) into v_fields
    from (select distinct a.data as d
            from (select distinct case when v_tf is null then null else r.data ->> v_tf end as rt
                    from custom.record r
                   where r.organization_id = p_organization_id and r.id = any (p_record_ids)) t
            cross join lateral custom.applicable_fields(p_organization_id, p_table_id, t.rt) a
           where custom.parity_type(a.data) in ('lookup', 'rollup')
             and coalesce(a.data ->> 'compute_on', '') = 'read') x;

  foreach fd in array v_fields loop
    begin
      v_par    := custom.parity_type(fd);
      v_via    := fd -> 'config' ->> 'via';
      v_key    := case when v_par = 'lookup' then fd -> 'config' ->> 'pick' else fd -> 'config' ->> 'of' end;
      v_agg    := fd -> 'config' ->> 'agg';
      v_filter := fd -> 'config' -> 'filter';
      v_multi  := coalesce((fd ->> 'multi')::boolean, false);
      v_hash   := md5(fd::text);
      v_table  := coalesce(nullif(fd ->> 'entity_definition_id', '')::uuid, p_table_id);
      v_values := '{}'::jsonb;

      -- An archived source answers the typed state on every row (CHAIR-ROLLUP-HONEST), as per row.
      v_gone := custom._derived_source_archived(p_organization_id, v_table, fd);
      if v_gone is not null then
        select jsonb_object_agg(i::text, jsonb_build_array(v_gone)) into v_values from unnest(p_record_ids) i;
      elsif v_par = 'rollup' and v_filter is not null and jsonb_typeof(v_filter) = 'object' and v_filter <> '{}'::jsonb
            and coalesce(v_agg, '') not in ('count', 'sum', 'avg', 'countall', 'counta', 'and', 'or', 'xor') then
        -- A filtered roll-up whose answer depends on the order of what it reads: per row, as before.
        continue;
      else
        -- THE LINKS, EVERY ROW AT ONCE (custom.relation_targets' two arms, each once). A row that carries the key
        -- reads its own document; a row that does not reads the Table's back-link of that key, if there is one.
        select coalesce(jsonb_object_agg(s.id::text, s.ts), '{}'::jsonb) into v_tg
          from (select r.id,
                       (select coalesce(jsonb_agg(z.u order by z.u), '[]'::jsonb)
                          from (select distinct (t #>> '{}')::uuid as u
                                  from jsonb_array_elements(
                                         case when jsonb_typeof(r.data -> v_via) = 'array' then r.data -> v_via
                                              when jsonb_typeof(r.data -> v_via) = 'string' then jsonb_build_array(r.data -> v_via)
                                              else '[]'::jsonb end) t
                                 where (t #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') z
                         where z.u <> r.id) as ts
                  from custom.record r
                 where r.organization_id = p_organization_id and r.id = any (p_record_ids)
                   and r.deleted_at is null and r.data ? v_via) s;
        select coalesce(array_agg(i), '{}'::uuid[]) into v_back_ids
          from unnest(p_record_ids) i where not (v_tg ? i::text);
        if cardinality(v_back_ids) > 0 then
          v_back := case when v_via is null then null
                         else custom._back_link_relation(p_organization_id, p_table_id, v_via) end;
          if v_back is not null then
            v_me := custom.query_principal();
            -- The reader's predicate on the linking Table: the same statement-memo key custom.relation_targets uses.
            if v_me is null then
              v_pred := 'true';
            else
              v_mk := 'custom.relation_targets_pred:' || v_me::text || ':' || p_organization_id::text || ':'
                      || (v_back ->> 'relation_target') || ':'
                      || md5(coalesce(platform.memo_k_get('custom.visible_predicate_listed:' || v_me::text || ':'
                               || p_organization_id::text || ':' || (v_back ->> 'relation_target')), ''));
              v_pred := platform.memo_k_get(v_mk);
              if v_pred is null then
                v_pred := custom.visible_predicate_sql(v_me, p_organization_id,
                            (v_back ->> 'relation_target')::uuid, 'viewer'::public.permission_level, 'r');
                perform platform.memo_k_put(v_mk, v_pred);
              end if;
            end if;
            execute format($q$
              with e as (
                select a.target_id as tid, r.id as rid
                  from platform.associations a
                  join custom.record r
                    on r.organization_id = $1 and r.id = a.source_id and r.table_id = $2
                   and r.data_class = 'record' and r.deleted_at is null
                 where a.organization_id = $1
                   and a.target_type = 'record' and a.target_id = any ($4)
                   and a.relation_field_id = $3
                   and a.deleted_at is null
                   and (%s))
              select coalesce(jsonb_object_agg(p.tid::text,
                       coalesce((select jsonb_agg(distinct e.rid order by e.rid) from e
                                  where e.tid = p.tid and e.rid <> p.tid), '[]'::jsonb)), '{}'::jsonb)
                from unnest($4::uuid[]) p(tid)
            $q$, v_pred)
              into v_one
              using p_organization_id, (v_back ->> 'relation_target')::uuid, (v_back ->> 'back_link_of')::uuid, v_back_ids;
            v_tg := v_tg || v_one;
          end if;
          select v_tg || coalesce(jsonb_object_agg(i::text, '[]'::jsonb), '{}'::jsonb) into v_tg
            from unnest(v_back_ids) i where not (v_tg ? i::text);
        end if;

        select coalesce(array_agg(distinct (e #>> '{}')::uuid), '{}'::uuid[]) into v_all
          from jsonb_each(v_tg) k cross join lateral jsonb_array_elements(k.value) e;

        -- THE FILTER, COMPILED ONCE AND ASKED ONCE OVER EVERY LINKED RECORD (custom.rollup_value's statement memo).
        if v_par = 'rollup' and v_filter is not null and jsonb_typeof(v_filter) = 'object' and v_filter <> '{}'::jsonb
           and cardinality(v_all) > 0 then
          v_mk := 'custom.rollup_where:' || p_organization_id::text || ':' || coalesce(v_table::text, '-') || ':' || v_hash;
          v_memo := platform.memo_k_get(v_mk);
          if v_memo is not null then
            v_far := nullif(split_part(v_memo, chr(2), 1), '')::uuid;
            v_where := substr(v_memo, strpos(v_memo, chr(2)) + 1);
          else
            select nullif(f.data ->> 'relation_target', '')::uuid into v_far
              from custom.record f
             where f.organization_id = p_organization_id
               and f.table_id = custom.field_kernel_id()
               and f.deleted_at is null
               and f.data ->> 'entity_definition_id' = v_table::text
               and f.data ->> 'key' = v_via
             limit 1;
            if v_far is null then
              v_far := nullif(custom._back_link_relation(p_organization_id, v_table, v_via) ->> 'relation_target', '')::uuid;
            end if;
            if v_far is null then
              continue;   -- the per-row path says why, word for word.
            end if;
            v_where := custom.record_filter_sql(p_organization_id, v_far,
                         case when custom.filter_is_rule(v_filter) then v_filter
                              else custom.choice_filter_normalize(custom.choice_field_map(p_organization_id, v_far), v_filter) end);
            perform platform.memo_k_put(v_mk, v_far::text || chr(2) || v_where);
          end if;
          execute format('select coalesce(array_agg(r.id), ''{}''::uuid[]) from custom.record r '
                         'where r.organization_id = $1 and r.table_id = $2 and r.id = any ($3) '
                         'and r.deleted_at is null and %s', v_where)
             into v_pass
            using p_organization_id, v_far, v_all;
          select coalesce(jsonb_object_agg(k.key,
                   coalesce((select jsonb_agg(e order by o) from jsonb_array_elements(k.value) with ordinality x(e, o)
                              where (e #>> '{}')::uuid = any (v_pass)), '[]'::jsonb)), '{}'::jsonb)
            into v_tg
            from jsonb_each(v_tg) k;
          v_all := v_pass;
        end if;

        -- THE COLUMN IT READS, FROM EVERY LINKED RECORD IN ONE STATEMENT.
        v_fv := custom._far_values(p_organization_id, v_all, v_key, fd);

        -- EVERY ROW'S ANSWER IN ONE STATEMENT, in each row's link order (the order custom.relation_targets answers in).
        if v_par = 'rollup' then
          select coalesce(jsonb_object_agg(k.key, case when x.v is null then '[]'::jsonb else jsonb_build_array(x.v) end), '{}'::jsonb)
            into v_values
            from jsonb_each(v_tg) k
            cross join lateral (
              select custom._rollup_agg(v_agg, coalesce(z.n, 0), coalesce(z.vals, '{}'::jsonb[]),
                                        coalesce(z.nums, array[]::numeric[])) as v
                from (select count(*)::integer as n,
                             array_agg(coalesce(v_fv -> e.t -> 0, 'null'::jsonb) order by e.o)
                               filter (where v_key is not null) as vals,
                             array_agg(((v_fv -> e.t -> 0) #>> '{}')::numeric order by e.o)
                               filter (where v_key is not null and jsonb_typeof(v_fv -> e.t -> 0) = 'number') as nums
                        from jsonb_array_elements_text(k.value) with ordinality e(t, o)) z) x;
        else
          select coalesce(jsonb_object_agg(k.key, case when x.v is null then '[]'::jsonb else jsonb_build_array(x.v) end), '{}'::jsonb)
            into v_values
            from jsonb_each(v_tg) k
            cross join lateral (
              select case when v_multi then coalesce(z.a, '[]'::jsonb) else z.a -> 0 end as v
                from (select jsonb_agg(v_fv -> e.t -> 0 order by e.o)
                               filter (where v_key is not null and (v_fv -> e.t -> 0) is not null) as a
                        from jsonb_array_elements_text(k.value) with ordinality e(t, o)) z) x;
        end if;
      end if;

      perform platform.memo_k_put('custom.pdv:' || p_organization_id::text || ':' || e.key || ':' || v_hash, e.value::text)
         from jsonb_each(v_values) e;
      v_put := v_put + (select count(*) from jsonb_each(v_values))::integer;
    exception
      when others then
        null;   -- this column is worked out per row, as before, and says its own sentence there.
    end;
  end loop;
  return v_put;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._computed_warm(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ver bigint[] := custom._access_versions(p_org);
  v_ok  boolean;
  v_lvl public.permission_level;
begin
  if p_me is null then
    return false;
  end if;
  -- READ-SPEED-6 c: this reader's masks of this Table, kept at every level while no access changed (custom.read_mask_for
  -- reads them); only a level with no current kept mask is worked out
  foreach v_lvl in array enum_range(null::public.permission_level) loop
    continue when exists (select 1 from custom.read_mask_kept k
                           where k.reader_id = p_me and k.organization_id = p_org and k.table_id = p_table
                             and k.level = v_lvl::text and k.versions = v_ver and k.kept_at > now() - interval '4 minutes');
    insert into custom.read_mask_kept as k (reader_id, organization_id, table_id, level, versions, mask, kept_at)
    values (p_me, p_org, p_table, v_lvl::text, v_ver, custom._read_mask_compute(p_me, p_org, p_table, v_lvl, 'read'), now())
    on conflict (reader_id, organization_id, table_id, level)
    do update set versions = excluded.versions, mask = excluded.mask, kept_at = excluded.kept_at;
  end loop;
  if not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  -- READ-SPEED-6 c: a current judgement is kept, not judged again on every call
  select j.ok into v_ok from custom.computed_reader_judgement j
   where j.reader_id = p_me and j.organization_id = p_org and j.table_id = p_table
     and j.versions = v_ver and j.judged_at > now() - interval '4 minutes';
  if v_ok is not null then
    return v_ok;
  end if;
  v_ok := custom._computed_reader_judge(p_me, p_org, p_table);
  insert into custom.computed_reader_judgement as j (reader_id, organization_id, table_id, versions, ok, judged_at)
  values (p_me, p_org, p_table, v_ver, v_ok, now())
  on conflict (reader_id, organization_id, table_id) do update set versions = excluded.versions, ok = excluded.ok, judged_at = excluded.judged_at;
  return v_ok;
end;
$function$;

drop function if exists custom._computed_reader_cols_ok(uuid, uuid, uuid);
drop function if exists custom._computed_keep_reader_cols(uuid, uuid, uuid, boolean, bigint[]);
drop function if exists custom._computed_reader_cols(uuid, uuid, uuid);
drop function if exists custom._computed_col_sources(uuid, uuid);
delete from platform.entity_types where token = 'computed_reader_cols';
drop table if exists custom.computed_reader_cols;

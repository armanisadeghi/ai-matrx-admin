-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: DUP-ORG
-- lock: custom
-- based-on: custom._table_duplicate_step(uuid, interval) 219b8ff43f2ddd8938a16af1f06611b5f940994f4f1d1c8d3638d0761bc5a136
--
-- DUP-ORG — A COPY WITH ROWS MAY CONTAIN ROWS INSIDE ROWS.
-- ROOT CAUSE. NOT the organization argument (an explicit p_organization_id equal to the table's own
-- is the very same path as NULL: v_to = v_from). custom._table_duplicate_step copies a table's rows
-- in (created_at, id) order and carries each row's parent_id over, remapped to the copy's id when the
-- parent is another row of the same table. A parent that is NOT yet in the copy is refused by the
-- immediate store guard (custom._containment_guard): "that container is not in this organization" /
-- "REC-8 / T15: containment never crosses an organization". Order is not parents-first (a record moved
-- under a newer record, or two rows sharing one created_at inside a transaction, copies child before
-- parent), so the failure looked random, passed with NULL some runs and failed with an explicit org
-- others; it is reproducible every run when a parent is newer than its child.
-- THE FIX. Step 4 leaves out a parent_id whose parent the copy carries; new step 5b, once every row
-- exists, puts parent_id back from its own cursor (parent_cursor in the job), so the guard sees a
-- parent that is there. A parent that is NOT carried (the Home, or a row not handed to the maker)
-- is untouched: it still travels in step 4 as before.
-- Sibling census: the only other verbs that bulk-insert rows from rows carrying a parent
-- (_ctx_store_type, _options_table_for) write fresh rows, not copies; no other verb is affected.
-- The inverse is migrations/inverse/duplorg_a_a_copy_may_contain_rows_inside_rows_down.sql.
--
CREATE OR REPLACE FUNCTION custom._table_duplicate_step(p_copy uuid, p_budget interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_fields_per_unit  constant integer := 5;
  c_records_per_unit constant integer := 25;
  c_options_per_unit constant integer := 200;
  c_links_per_unit   constant integer := 50;
  -- The budget is counted from the start of THIS CALL (statement_timestamp), and is asked only
  -- after a pass has done at least one unit, so every pass moves the copy on.
  v_start      timestamptz := statement_timestamp();
  v_units      integer := 0;
  v_me         uuid := custom.query_principal();
  v_job        record;
  v_inv        jsonb;
  v_from       uuid;
  v_to         uuid;
  v_src        uuid;
  v_with       boolean;
  v_cutoff     timestamptz;
  v_fields     uuid[];
  v_views      uuid[];
  v_lists      uuid[];
  v_visible    text[];
  v_declared   text[];
  v_hidden     text[];
  v_self_keys  text[];
  v_dead_keys  text[];
  v_map        jsonb;
  v_opt        uuid;
  v_opt_data   jsonb;
  v_opt_meta   jsonb;
  v_opt_shown  platform.shown_to;
  v_new_opts   uuid;
  v_opt_dead   text[];
  v_view       record;
  v_new_view   uuid;
  v_def        jsonb;
  v_meta       jsonb;
  v_k          integer;
  v_cursor     jsonb;
  v_step       text := 'done';
  v_status     text := 'copying';
  v_sentence   text;
  v_src_live   boolean;
  v_src_name   text;
  v_d_fields   bigint; v_d_views bigint; v_d_lists bigint; v_d_recs bigint;
  v_out        jsonb;
  v_setup_ms   numeric;
begin
  -- ONE PASS AT A TIME PER COPY. A second pass that arrives while one is running answers "busy"
  -- (the client waits and asks again), never a duplicate-key error halfway through a page.
  if not pg_try_advisory_xact_lock(hashtextextended('custom.table_duplicate:' || p_copy::text, 0)) then
    return jsonb_build_object('status', 'busy', 'step', 'busy',
      'sentence', 'Another pass of this copy is running. Wait a moment and carry on.');
  end if;

  -- THE JOB is the copy's one history row (verb "duplicate"): its stored undo carries what the
  -- copy was asked for and everything fixed when it started.
  select m.id, m.organization_id, m.inverse into v_job
    from history.migration_log m
   where m.verb = 'duplicate' and m.target_kind = 'table' and m.target_id = p_copy
   order by m.applied_at desc
   limit 1;
  if v_job.id is null then
    raise exception 'That is not a copy that is being made, so there is nothing to carry on.'
      using errcode = '42501';
  end if;
  v_inv    := v_job.inverse;
  v_to     := v_job.organization_id;
  v_from   := (v_inv ->> 'duplicated_from_organization_id')::uuid;
  v_src    := (v_inv ->> 'duplicated_from')::uuid;
  v_with   := coalesce((v_inv ->> 'with_records')::boolean, false);
  v_cutoff := (v_inv ->> 'cutoff')::timestamptz;
  select coalesce(array_agg(x::uuid), '{}') into v_fields from jsonb_array_elements_text(v_inv -> 'fields') x;
  select coalesce(array_agg(x::uuid), '{}') into v_views  from jsonb_array_elements_text(v_inv -> 'views') x;
  select coalesce(array_agg(x::uuid), '{}') into v_lists  from jsonb_array_elements_text(v_inv -> 'choice_lists') x;
  select coalesce(array_agg(x), '{}') into v_visible   from jsonb_array_elements_text(v_inv -> 'mask_visible') x;
  select coalesce(array_agg(x), '{}') into v_declared  from jsonb_array_elements_text(v_inv -> 'mask_declared') x;
  select coalesce(array_agg(x), '{}') into v_hidden    from jsonb_array_elements_text(v_inv -> 'mask_hidden') x;
  select coalesce(array_agg(x), '{}') into v_self_keys from jsonb_array_elements_text(v_inv -> 'self_keys') x;
  select coalesce(array_agg(x), '{}') into v_dead_keys from jsonb_array_elements_text(v_inv -> 'dead_keys') x;

  -- ALREADY OVER: handed over, failed, or discarded (the half copy archived).
  if (v_inv ->> 'state') in ('done', 'failed', 'discarded') then
    v_status := v_inv ->> 'state';
  elsif exists (select 1 from custom.record t where t.organization_id = v_to and t.id = p_copy and t.deleted_at is not null) then
    v_inv := v_inv || jsonb_build_object('state', 'discarded', 'open', false);
    update history.migration_log set inverse = v_inv where id = v_job.id;
    v_status := 'discarded';
  end if;

  -- THE SOURCE IS STILL WHOLE, OR THE COPY STOPS. An archived source, or one whose archive has
  -- started, would be handed over half-copied; instead the copy is marked failed, kept hidden,
  -- and the person is told how to discard it.
  if v_status = 'copying' then
    select t.deleted_at is null, coalesce(nullif(t.data ->> 'name', ''), 'The table') into v_src_live, v_src_name
      from custom.record t where t.organization_id = v_from and t.id = v_src;
    if not coalesce(v_src_live, false)
       or exists (select 1 from history.migration_log a
                   where a.organization_id = v_from and a.verb = 'archive' and a.target_kind = 'table'
                     and a.target_id = v_src and a.undone_at is null
                     and coalesce((a.inverse ->> 'open')::boolean, false)) then
      v_sentence := format('%s was archived while it was being copied, so the copy was stopped and not handed over. Discard it from your unfinished copies.',
                           coalesce(v_src_name, 'The table'));
      v_inv := v_inv || jsonb_build_object('state', 'failed', 'open', false, 'why', v_sentence);
      update history.migration_log set inverse = v_inv where id = v_job.id;
      v_status := 'failed';
    end if;
  end if;

  if v_status = 'copying' then
    -- EVERY ROW THIS PASS WRITES IS PART OF THE ONE DUPLICATE EVENT (history.migration_record's
    -- own mark, set again for this statement), and this transaction is marked as writing this
    -- copy: the organization's version is bumped once at handover rather than per row, and no cycle walk for the columns it copies.
    perform set_config('history.mark_at',   statement_timestamp()::text, true);
    perform set_config('history.mark_id',   v_job.id::text,              true);
    perform set_config('history.mark_verb', 'duplicate',                 true);
    perform set_config('custom.table_duplicate_into', p_copy::text, true);

    -- THE MAP of structure ids (bounded by the Table's shape, never its rows): the Table, its
    -- columns as fixed when the copy started, and every choice list with its columns and options.
    v_map := jsonb_build_object(v_src::text, p_copy::text);
    v_map := v_map || coalesce((select jsonb_object_agg(f::text, custom._duplicate_id(p_copy, f)::text)
                                  from unnest(v_fields) f), '{}'::jsonb);
    v_map := v_map || coalesce((
      select jsonb_object_agg(o.id::text, custom._duplicate_id(p_copy, o.id)::text)
        from custom.record o
       where o.organization_id = v_from
         and (   o.id = any (v_lists)
              or (o.table_id = custom.field_kernel_id() and o.data_class <> 'kernel' and o.deleted_at is null
                  and (o.data ->> 'entity_definition_id')::uuid = any (v_lists))
              or (o.table_id = any (v_lists) and o.data_class = 'record' and o.deleted_at is null))), '{}'::jsonb);

    -- How long this pass took before its first unit (reported in the answer as pass.setup_ms).
    v_setup_ms := round(extract(epoch from clock_timestamp() - v_start) * 1000);

    <<work>>
    loop
      -- 1. EVERY CHOICE LIST, AS A NEW ONE: its Table (in a Home of its own), its columns, its
      -- options in pages — words, colours, stable keys, order.
      foreach v_opt in array v_lists loop
        v_new_opts := custom._duplicate_id(p_copy, v_opt);
        select o.data, o.metadata, o.shown_to into v_opt_data, v_opt_meta, v_opt_shown
          from custom.record o where o.organization_id = v_from and o.id = v_opt;
        if not exists (select 1 from custom.record t where t.organization_id = v_to and t.id = v_new_opts) then
          if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'choices'; exit work; end if;
          insert into custom.record (id, organization_id, table_id, data)
          values (custom._duplicate_id(p_copy, v_new_opts), v_to, custom.person_kernel_id(),
                  jsonb_build_object('name', coalesce(nullif(v_opt_data ->> 'name', ''), 'Choices') || ' Home'));
          insert into custom.record (id, organization_id, table_id, data_class, data, metadata, shown_to)
          values (v_new_opts, v_to, custom.table_kernel_id(), 'table',
                  custom._uuid_remap(v_opt_data, v_map)
                    || jsonb_build_object(
                         'parent_id', custom._duplicate_id(p_copy, v_new_opts)::text,
                         'slug', left(regexp_replace(coalesce(nullif(v_opt_data ->> 'slug', ''), 'choices'),
                                                     '_[0-9a-f]{16,}$', '')
                                      || '_' || left(replace(v_new_opts::text, '-', ''), 20), 48)),
                  custom._copied_metadata(v_opt_meta), v_opt_shown);
          v_units := v_units + 1;
        end if;
        if exists (select 1 from custom.record x
                    where x.organization_id = v_from and x.table_id = custom.field_kernel_id()
                      and x.data_class <> 'kernel' and x.deleted_at is null
                      and x.data ->> 'entity_definition_id' = v_opt::text
                      and not exists (select 1 from custom.record c where c.organization_id = v_to
                                         and c.id = custom._duplicate_id(p_copy, x.id))) then
          if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'choices'; exit work; end if;
          insert into custom.record (id, organization_id, table_id, data_class, data, metadata, shown_to)
          select custom._duplicate_id(p_copy, x.id), v_to, x.table_id, x.data_class,
                 custom._uuid_remap(x.data, v_map), custom._copied_metadata(x.metadata), x.shown_to
            from custom.record x
           where x.organization_id = v_from and x.table_id = custom.field_kernel_id()
             and x.data_class <> 'kernel' and x.deleted_at is null
             and x.data ->> 'entity_definition_id' = v_opt::text
             and not exists (select 1 from custom.record c where c.organization_id = v_to
                                and c.id = custom._duplicate_id(p_copy, x.id))
           order by coalesce((x.data ->> 'sort')::integer, 0), x.created_at;
          v_units := v_units + 1;
        end if;
        select coalesce(array_agg(distinct d.data ->> 'key'), array[]::text[]) into v_opt_dead
          from custom.record d
         where d.organization_id = v_from and d.table_id = custom.field_kernel_id()
           and d.data_class <> 'kernel' and d.deleted_at is not null
           and d.data ->> 'entity_definition_id' = v_opt::text
           and not exists (select 1 from custom.record l
                            where l.organization_id = v_from and l.table_id = custom.field_kernel_id()
                              and l.data_class <> 'kernel' and l.deleted_at is null
                              and l.data ->> 'entity_definition_id' = v_opt::text
                              and l.data ->> 'key' = d.data ->> 'key');
        loop
          exit when not exists (
            select 1 from custom.record x
             where x.organization_id = v_from and x.table_id = v_opt and x.data_class = 'record' and x.deleted_at is null
               and not exists (select 1 from custom.record c where c.organization_id = v_to
                                  and c.id = custom._duplicate_id(p_copy, x.id)));
          if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'choices'; exit work; end if;
          insert into custom.record (id, organization_id, table_id, data_class, data, metadata, shown_to)
          select custom._duplicate_id(p_copy, x.id), v_to, v_new_opts, 'record',
                 custom._uuid_remap(x.data - '_values' - v_opt_dead, v_map), custom._copied_metadata(x.metadata), x.shown_to
            from custom.record x
           where x.organization_id = v_from and x.table_id = v_opt and x.data_class = 'record' and x.deleted_at is null
             and not exists (select 1 from custom.record c where c.organization_id = v_to
                                and c.id = custom._duplicate_id(p_copy, x.id))
           order by x.created_at, x.id
           limit c_options_per_unit;
          v_units := v_units + 1;
        end loop;
      end loop;

      -- 2. THE COLUMNS AS FIXED WHEN THE COPY STARTED (one archived in the source since is still
      -- copied — and named in the answer). Stored ones five at a time; a worked-out one (formula,
      -- lookup, rollup) one at a time, after every stored one, and never walked for a circle (see
      -- custom._field_reads_what_it_reads).
      loop
        exit when not exists (
          select 1 from custom.record f
           where f.organization_id = v_from and f.id = any (v_fields)
             and not exists (select 1 from custom.record c where c.organization_id = v_to
                                and c.id = custom._duplicate_id(p_copy, f.id)));
        if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'fields'; exit work; end if;
        insert into custom.record (id, organization_id, table_id, data_class, data, metadata, shown_to)
        select custom._duplicate_id(p_copy, f.id), v_to, f.table_id, f.data_class,
               coalesce(custom._without_rows_of(custom._remap_rows(custom._uuid_remap(f.data, v_map), p_copy, v_inv),
                                                v_from, v_src), '{}'::jsonb),
               custom._copied_metadata(f.metadata), f.shown_to
          from custom.record f
         where f.organization_id = v_from and f.id = any (v_fields)
           and not exists (select 1 from custom.record c where c.organization_id = v_to
                              and c.id = custom._duplicate_id(p_copy, f.id))
           and (coalesce(f.data ->> 'type', '') = 'formula' or coalesce(f.data ->> 'source', '') = 'formula')
               = not exists (select 1 from custom.record g
                              where g.organization_id = v_from and g.id = any (v_fields)
                                and coalesce(g.data ->> 'type', '') <> 'formula' and coalesce(g.data ->> 'source', '') <> 'formula'
                                and not exists (select 1 from custom.record c where c.organization_id = v_to
                                                   and c.id = custom._duplicate_id(p_copy, g.id)))
         order by coalesce((f.data ->> 'sort')::integer, 0), f.created_at
         limit case when exists (select 1 from custom.record g
                                  where g.organization_id = v_from and g.id = any (v_fields)
                                    and coalesce(g.data ->> 'type', '') <> 'formula' and coalesce(g.data ->> 'source', '') <> 'formula'
                                    and not exists (select 1 from custom.record c where c.organization_id = v_to
                                                       and c.id = custom._duplicate_id(p_copy, g.id)))
                    then c_fields_per_unit else 1 end;
        v_units := v_units + 1;
      end loop;

      -- 3. THE VIEWS fixed when the copy started (another person's "only me" view stays theirs),
      -- made through the house door for a new view (custom.view_declare), then given the source
      -- view's look, order, hand-set positions and "Shown to" by name. A view the house door
      -- refuses is named in the answer, never half made.
      for v_view in
        select sv.id, sv.name, sv.description, sv.definition, sv.metadata, sv.shown_to, sv.sort_order,
               (sv.is_default or (sv.definition -> 'is_default') = 'true'::jsonb) as is_default
          from platform.saved_view sv
         where sv.organization_id = v_from and sv.id = any (v_views)
           and not exists (select 1 from platform.saved_view c
                            where c.organization_id = v_to and c.subject_id = p_copy and c.deleted_at is null
                              and c.metadata ->> 'copied_from_view' = sv.id::text)
           and not (coalesce(v_inv -> 'views_failed', '{}'::jsonb) ? sv.id::text)
         order by sv.sort_order nulls last, sv.created_at
      loop
        if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'views'; exit work; end if;
        v_def := coalesce(custom._without_rows_of(custom._remap_rows(custom._uuid_remap(v_view.definition, v_map), p_copy, v_inv),
                                                  v_from, v_src), '{}'::jsonb);
        v_meta := coalesce(custom._without_rows_of(custom._remap_rows(custom._uuid_remap(coalesce(v_view.metadata, '{}'::jsonb), v_map),
                                                                      p_copy, v_inv), v_from, v_src), '{}'::jsonb);
        begin
          v_new_view := custom.view_declare(v_to, p_copy, jsonb_build_object(
            'name', v_view.name,
            'filters', coalesce(v_def -> 'filters', '{}'::jsonb),
            'definition', v_def - 'table_id' - 'filters' - 'order' - 'is_default' - 'moved_from' - 'hidden_fields'));
          update platform.saved_view sv
             set description = v_view.description,
                 sort_order  = v_view.sort_order,
                 shown_to    = v_view.shown_to,
                 definition  = case when v_def ->> 'order' = 'manual'
                                    then jsonb_set(sv.definition, '{order}', '"manual"'::jsonb, true)
                                    else sv.definition end,
                 metadata    = coalesce(sv.metadata, '{}'::jsonb) || v_meta
                               || jsonb_build_object('copied_from_view', v_view.id::text)
           where sv.organization_id = v_to and sv.id = v_new_view;
          if v_view.is_default then
            perform custom.view_designate(v_to, p_copy, v_new_view, null);
          end if;
        exception when others then
          v_inv := jsonb_set(v_inv, '{views_failed}',
                             coalesce(v_inv -> 'views_failed', '{}'::jsonb)
                             || jsonb_build_object(v_view.id::text, v_view.name || ': ' || sqlerrm), true);
          update history.migration_log set inverse = v_inv where id = v_job.id;
        end;
        v_units := v_units + 1;
      end loop;

      -- 4. THE RECORDS fixed when the copy started, in pages, in (created_at, id) order from a
      -- cursor the job keeps (no pass reads the whole set), through the read mask fixed then:
      -- a column the maker may not read keeps its place in the copy and its values stay behind.
      if v_with then
        loop
          v_cursor := coalesce(v_inv -> 'record_cursor', '{}'::jsonb);
          exit when not exists (
            select 1 from custom.record r
             where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
               and r.deleted_at is null
               and (v_cursor = '{}'::jsonb
                    or (r.created_at, r.id) > ((v_cursor ->> 'at')::timestamptz, (v_cursor ->> 'id')::uuid))
               and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id));
          if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'records'; exit work; end if;
          with page as (
            select r.*
              from custom.record r
             where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
               and r.deleted_at is null
               and (v_cursor = '{}'::jsonb
                    or (r.created_at, r.id) > ((v_cursor ->> 'at')::timestamptz, (v_cursor ->> 'id')::uuid))
               and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id)
             order by r.created_at, r.id
             limit c_records_per_unit
          ), ins as (
            insert into custom.record (id, organization_id, table_id, data_class, data, metadata, shown_to)
            select custom._duplicate_id(p_copy, p.id), v_to, p_copy, 'record',
                   custom._remap_rows(custom._uuid_remap(
                     custom.mask_document(p.data - '_values' - v_dead_keys, v_visible, '{}'::jsonb,
                                          false, '{}'::jsonb, v_declared)
                     - v_hidden, v_map), p_copy, v_inv) - v_self_keys
                     - (case when custom._duplicate_carries_row(v_inv, v_from, v_src, nullif(p.data ->> 'parent_id', '')::uuid)
                             then 'parent_id' else '' end),
                   custom._copied_metadata(p.metadata), p.shown_to
              from page p
             where not exists (select 1 from custom.record c where c.organization_id = v_to
                                  and c.id = custom._duplicate_id(p_copy, p.id))
            returning 1
          )
          select jsonb_build_object('at', max_at, 'id', max_id) into v_cursor
            from (select p.created_at as max_at, p.id as max_id from page p order by p.created_at desc, p.id desc limit 1) z
           where (select count(*) from ins) >= 0;
          v_inv := jsonb_set(v_inv, '{record_cursor}', v_cursor, true);
          update history.migration_log set inverse = v_inv where id = v_job.id;
          v_units := v_units + 1;
        end loop;

        -- 5. THE LINKS WITHIN THE TABLE, once every row is there, from their own cursor: each
        -- follows to the copy's row; a link to a row the copy does not carry is left empty.
        if cardinality(v_self_keys) > 0 then
          loop
            v_cursor := coalesce(v_inv -> 'link_cursor', '{}'::jsonb);
            exit when not exists (
              select 1 from custom.record r
               where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
                 and (v_cursor = '{}'::jsonb
                      or (r.created_at, r.id) > ((v_cursor ->> 'at')::timestamptz, (v_cursor ->> 'id')::uuid))
                 and exists (select 1 from unnest(v_self_keys) k(key) where jsonb_typeof(r.data -> k.key) in ('string', 'array'))
                 and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id));
            if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'links'; exit work; end if;
            with page as (
              select r.*
                from custom.record r
               where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
                 and (v_cursor = '{}'::jsonb
                      or (r.created_at, r.id) > ((v_cursor ->> 'at')::timestamptz, (v_cursor ->> 'id')::uuid))
                 and exists (select 1 from unnest(v_self_keys) k(key) where jsonb_typeof(r.data -> k.key) in ('string', 'array'))
                 and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id)
               order by r.created_at, r.id
               limit c_links_per_unit
            ), patch as (
              select custom._duplicate_id(p_copy, p.id) as new_id,
                     jsonb_object_agg(k.key,
                       case jsonb_typeof(p.data -> k.key)
                         when 'string' then case when custom._duplicate_carries_row(v_inv, v_from, v_src, lower(p.data ->> k.key)::uuid)
                                                 then to_jsonb(custom._duplicate_id(p_copy, lower(p.data ->> k.key)::uuid)::text) end
                         else (select coalesce(jsonb_agg(to_jsonb(custom._duplicate_id(p_copy, lower(e.v)::uuid)::text)), '[]'::jsonb)
                                 from jsonb_array_elements_text(p.data -> k.key) e(v)
                                where e.v ~* '^[0-9a-f-]{36}$'
                                  and custom._duplicate_carries_row(v_inv, v_from, v_src, lower(e.v)::uuid))
                       end) filter (where jsonb_typeof(p.data -> k.key) in ('string', 'array')) as patch
                from page p cross join unnest(v_self_keys) k(key)
               group by p.id
            ), upd as (
              update custom.record x
                 set data = x.data || jsonb_strip_nulls(pt.patch)
                from patch pt
               where x.organization_id = v_to and x.id = pt.new_id and pt.patch is not null
              returning 1
            )
            select jsonb_build_object('at', z.created_at, 'id', z.id) into v_cursor
              from (select p.created_at, p.id from page p order by p.created_at desc, p.id desc limit 1) z
             where (select count(*) from upd) >= 0;
            v_inv := jsonb_set(v_inv, '{link_cursor}', v_cursor, true);
            update history.migration_log set inverse = v_inv where id = v_job.id;
            v_units := v_units + 1;
          end loop;
        end if;

        -- 5b. THE CONTAINERS WITHIN THE TABLE, once every row is there (DUP-ORG). A record may sit
        -- INSIDE another record of its own table (REC-8), and the store refuses a parent that is not
        -- there yet (custom._containment_guard, "that container is not in this organization"). Rows
        -- are copied in (created_at, id) order, which is not parents-first (a record moved under a
        -- newer one is older than its parent), so step 4 leaves a carried parent out and this pass
        -- puts it back, from its own cursor, once all the copy's rows exist.
        loop
          v_cursor := coalesce(v_inv -> 'parent_cursor', '{}'::jsonb);
          exit when not exists (
            select 1 from custom.record r
             where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
               and r.deleted_at is null
               and (v_cursor = '{}'::jsonb
                    or (r.created_at, r.id) > ((v_cursor ->> 'at')::timestamptz, (v_cursor ->> 'id')::uuid))
               and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id)
               and custom._duplicate_carries_row(v_inv, v_from, v_src, nullif(r.data ->> 'parent_id', '')::uuid));
          if v_units > 0 and clock_timestamp() - v_start > p_budget then v_step := 'links'; exit work; end if;
          with page as (
            select r.*
              from custom.record r
             where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
               and r.deleted_at is null
               and (v_cursor = '{}'::jsonb
                    or (r.created_at, r.id) > ((v_cursor ->> 'at')::timestamptz, (v_cursor ->> 'id')::uuid))
               and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id)
               and custom._duplicate_carries_row(v_inv, v_from, v_src, nullif(r.data ->> 'parent_id', '')::uuid)
             order by r.created_at, r.id
             limit c_links_per_unit
          ), upd as (
            update custom.record x
               set data = x.data || jsonb_build_object('parent_id',
                                      custom._duplicate_id(p_copy, lower(p.data ->> 'parent_id')::uuid)::text)
              from page p
             where x.organization_id = v_to and x.id = custom._duplicate_id(p_copy, p.id)
            returning 1
          )
          select jsonb_build_object('at', z.created_at, 'id', z.id) into v_cursor
            from (select p.created_at, p.id from page p order by p.created_at desc, p.id desc limit 1) z
           where (select count(*) from upd) >= 0;
          v_inv := jsonb_set(v_inv, '{parent_cursor}', v_cursor, true);
          update history.migration_log set inverse = v_inv where id = v_job.id;
          v_units := v_units + 1;
        end loop;
      end if;

      -- 6. HANDED OVER: the copy stops being the app's work in progress and becomes a person's
      -- table; the organization's version is bumped once, now.
      update custom.record t
         set data = t.data - 'kept_by_the_app' - 'kept_for',
             shown_to = (v_inv ->> 'table_shown_to')::platform.shown_to
       where t.organization_id = v_to and t.id = p_copy;
      perform set_config('custom.table_duplicate_into', '', true);
      perform custom.bump_epoch('record', p_copy, v_to);
      v_inv := v_inv || jsonb_build_object('state', 'done', 'open', false);
      update history.migration_log set inverse = v_inv where id = v_job.id;
      v_status := 'done';
      v_step := 'done';
      exit work;
    end loop work;
    perform set_config('custom.table_duplicate_into', '', true);
  end if;

  -- PROGRESS, exact: totals are what was fixed when the copy started; done is read off the copy.
  select count(*) into v_d_fields from unnest(v_fields) f
   where exists (select 1 from custom.record c where c.organization_id = v_to and c.id = custom._duplicate_id(p_copy, f));
  select count(*) into v_d_lists from unnest(v_lists) l
   where exists (select 1 from custom.record c where c.organization_id = v_to and c.id = custom._duplicate_id(p_copy, l));
  select count(*) into v_d_views from platform.saved_view c
   where c.organization_id = v_to and c.subject_id = p_copy and c.deleted_at is null and c.metadata ? 'copied_from_view';
  if v_with then
    select count(*) into v_d_recs from custom.record c
     where c.organization_id = v_to and c.table_id = p_copy and c.data_class = 'record' and c.deleted_at is null;
  end if;

  v_out := jsonb_build_object(
    'status', v_status,
    'step', case when v_status = 'copying' then v_step else v_status end,
    'pass', jsonb_build_object('setup_ms', v_setup_ms, 'units', v_units,
                               'ms', round(extract(epoch from clock_timestamp() - v_start) * 1000)),
    'progress', jsonb_build_object(
      'choice_lists', jsonb_build_object('done', v_d_lists, 'total', cardinality(v_lists)),
      'fields',       jsonb_build_object('done', v_d_fields, 'total', cardinality(v_fields)),
      'views',        jsonb_build_object('done', v_d_views, 'total', cardinality(v_views)),
      'records',      case when v_with then jsonb_build_object('done', v_d_recs, 'total', (v_inv ->> 'records_total')::bigint) end));

  if v_status in ('failed', 'discarded') then
    v_out := v_out || jsonb_build_object('sentence',
      coalesce(v_inv ->> 'why', 'This copy was discarded, so there is nothing to carry on.'));
  end if;

  if v_status = 'done' then
    v_out := v_out || jsonb_build_object(
      'copied', jsonb_build_object(
        'fields', v_d_fields, 'choice_lists', v_d_lists,
        'choices', (select count(*) from custom.record o
                     where o.organization_id = v_to and o.data_class = 'record' and o.deleted_at is null
                       and o.table_id in (select custom._duplicate_id(p_copy, l) from unnest(v_lists) l)),
        'views', v_d_views, 'records', coalesce(v_d_recs, 0), 'with_records', v_with),
      'left_behind', (v_inv -> 'left_behind')
        || jsonb_build_object(
             'views_not_copied', coalesce((select jsonb_agg(value) from jsonb_each_text(coalesce(v_inv -> 'views_failed', '{}'::jsonb))), '[]'::jsonb)),
      -- WHAT MOVED IN THE SOURCE WHILE IT WAS BEING COPIED: the copy's structure is the one fixed
      -- when it started, so a column archived since is still here (complete for the rows copied
      -- before it went); a row changed after it was copied keeps the values it had then.
      'changed_during_copy', jsonb_build_object(
        'columns_archived_since', coalesce((
            select jsonb_agg(coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key'))
              from custom.record f
             where f.organization_id = v_from and f.id = any (v_fields) and f.deleted_at is not null), '[]'::jsonb),
        'rows_changed_after_copied', (
            select count(*) from custom.record r
              join custom.record c on c.organization_id = v_to and c.id = custom._duplicate_id(p_copy, r.id)
             where r.organization_id = v_from and r.table_id = v_src and r.deleted_at is null
               and r.updated_at > c.created_at),
        'rows_archived_since', case when v_with then (
            select count(*) from custom.record r
             where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
               and r.deleted_at is not null and r.deleted_at > v_cutoff
               and custom._duplicate_carries_row(v_inv, v_from, v_src, r.id)) end,
        'rows_added_since', case when v_with then (
            select count(*) from custom.record r
             where r.organization_id = v_from and r.table_id = v_src and r.data_class = 'record'
               and r.deleted_at is null and r.created_at > v_cutoff) end));
  end if;
  return v_out;
end;
$function$;

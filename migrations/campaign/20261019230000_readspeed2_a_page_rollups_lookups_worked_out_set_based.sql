-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-2
-- lock: custom
-- based-on: custom.rollup_value(uuid, uuid, jsonb) aaa6b3434dbadaf503ab2f87842b8f7df5ca26a1e4109234f566a3fceca351c2
-- based-on: custom.lookup_value(uuid, uuid, jsonb) 5b12f2068ca4461fbf9f554ba1b58ecb92af66c833cef973347975ba88d0005e
-- based-on: custom.formula_value(uuid, uuid, jsonb, jsonb) 10966a7bb5ea5eb49926f0e0412dc4dc3fab15acc87dc1ab147acc7e58ed33c7
-- based-on: custom.rule_field_key(uuid, uuid) 731294a3c292f3888f123abcd8a09af7e43772113f10fdea805a9e41b27caf0e
-- based-on: custom.rule_context(uuid, uuid) 8a586c53c943f4e4403f1084d240a20d12e4a8c911089357e831ebd416f4921b
-- based-on: custom._derived_attempt(uuid, uuid, jsonb, jsonb) 049af5254d7f91b565e9b5fb8f2bcab9efea2c53104cf2664f78043b1492a645
-- based-on: custom.table_type_field(uuid, uuid) 3ba47fc2e8505abb6dc82e0cd004282412bb387e335aa4a399ebf5a3e57f4bb9
-- based-on: custom.read_records_by_ids(uuid, uuid, uuid[], boolean) e5ebfef294b44a6806e085609f3e74954cad2c1c950d4ac7fb9b93638731603c
--
-- READ-SPEED-2 a — A PAGE'S ROLL-UPS AND LOOKUPS ARE WORKED OUT FOR THE WHOLE PAGE, SET-BASED; EVERY COLUMN OF A
-- RECORD IS WORKED OUT ONCE PER READ.
--
-- WHY (measured live 2026-10-19 after READ-SPEED a-g). A page read cost rows x roll-ups x (links, reader predicate,
-- filter, far reads, archived-source check), and again for every formula that read a roll-up or another formula
-- (Jobs: 147 formula evaluations for 21 rows, 7 per row for 4 formulas). Customers / Jobs / Donors / Campaigns read
-- in 1.0-1.6 s from the client, ~1 s on the server.
--
-- THE FIX. Values are still worked out at read time (nothing stored at write, nothing to invalidate):
--  * custom._page_derived_prefetch: each read-time roll-up and lookup of the Table, for ALL the page's rows at once —
--    links in one statement per arm, the filter compiled once and asked once over every linked record, the far
--    column read from every linked record in one statement (custom._far_values), answered per row by the one
--    aggregation (custom._rollup_agg, custom.rollup_value's former tail). Put in the statement memo; custom.rollup_value
--    and custom.lookup_value answer from it first. A column whose set answer raises, or a filtered roll-up whose
--    answer depends on order, stays per row. Called by custom.read_records_by_ids for the rows its visible set chose.
--  * custom._derived_attempt: one column of one record is worked out once per read (statement memo, keyed by record,
--    declaration and values handed in; only while the transaction has written nothing; never an answer that met a
--    circle). custom.rule_context likewise; custom.rule_field_key and formula_value's key lists once per statement.
--  Switches for the proofs: mx.page_prefetch = off, mx.read_memo = off (the per-row path exactly as before).
-- PROOF (before apply): the first page of every table with a read-time formula / roll-up / lookup in every
-- organization admin@admin.com belongs to (125 tables), read as admin before and after the new bodies in one
-- rolled-back REPEATABLE READ transaction, and after with the prefetch off: 0 differ (11 tables refuse identically). Numbers: ~/lane-resume/reports/READ-SPEED-2.md.
-- Inverse: migrations/inverse/20261019230000_readspeed2_a_page_rollups_lookups_worked_out_set_based_down.sql

CREATE FUNCTION custom._rollup_agg(p_agg text, p_n integer, p_vals jsonb[], p_nums numeric[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_one jsonb;
begin
  -- READ-SPEED-2: THE ONE AGGREGATION a roll-up answers with, over the linked records it counts (p_n), every value of
  -- the column it reads (p_vals, empty ones as JSON null, in the linked records' order) and the numbers among them
  -- (p_nums). custom.rollup_value (one record) and custom._page_derived_prefetch (a whole page) both answer through
  -- it, so the two can never disagree. The body is custom.rollup_value's former tail, word for word.
  if p_agg = 'count' then
    return to_jsonb(p_n);
  end if;
  -- AIRTABLE PARITY (lane AT-FORMULA): the aggregates that read the values as they are, not only as numbers.
  if p_agg in ('countall', 'counta', 'and', 'or', 'xor', 'arrayjoin', 'concatenate', 'arrayunique', 'arraycompact') then
    if p_agg = 'countall' then
      return to_jsonb(coalesce(cardinality(p_vals), 0));
    elsif p_agg = 'counta' then
      return to_jsonb((select count(*) from unnest(p_vals) x where not custom._fx_blank(x)));
    elsif cardinality(p_vals) = 0 then
      return case when p_agg in ('arrayunique', 'arraycompact') then '[]'::jsonb
                  when p_agg in ('arrayjoin', 'concatenate') then '""'::jsonb else null end;
    end if;
    return case p_agg
      when 'and' then to_jsonb(not exists (select 1 from unnest(p_vals) x where not custom._fx_truthy(x)))
      when 'or' then to_jsonb(exists (select 1 from unnest(p_vals) x where custom._fx_truthy(x)))
      when 'xor' then to_jsonb((select count(*) from unnest(p_vals) x where custom._fx_truthy(x)) % 2 = 1)
      when 'arrayjoin' then to_jsonb(coalesce((select string_agg(custom._fx_text(x), ', ' order by i) from unnest(p_vals) with ordinality t(x, i)), ''))
      when 'concatenate' then to_jsonb(coalesce((select string_agg(custom._fx_text(x), '' order by i) from unnest(p_vals) with ordinality t(x, i)), ''))
      when 'arrayunique' then coalesce((select jsonb_agg(u.x order by u.m) from (select x, min(i) m from unnest(p_vals) with ordinality t(x, i) group by x) u), '[]'::jsonb)
      else coalesce((select jsonb_agg(x order by i) from unnest(p_vals) with ordinality t(x, i) where not custom._fx_blank(x)), '[]'::jsonb) end;
  end if;
  -- TEMPLATE-GAPS D3 (REVIEW-2): THE LATEST / EARLIEST DATE. min and max read numbers; a date column holds ISO
  -- text. With no numbers, min / max compare the values that read as moments and answer the winning value as stored.
  if p_agg in ('min', 'max') and array_length(p_nums, 1) is null then
    select x into v_one
      from unnest(p_vals) x
     where jsonb_typeof(x) = 'string'
       and btrim(x #>> '{}') ~ '^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$'
     order by case when p_agg = 'max' then (btrim(x #>> '{}'))::timestamptz end desc nulls last,
              case when p_agg = 'min' then (btrim(x #>> '{}'))::timestamptz end asc nulls last
     limit 1;
    return v_one;                   -- null when no value reads as a date: an absence, never a zero.
  end if;
  if array_length(p_nums, 1) is null then
    -- BUTTON-STAMPS: a SUM of nothing is 0; an average, a minimum or a maximum of nothing is an absence.
    return case when p_agg = 'sum' then to_jsonb(0) else null end;
  end if;
  return case p_agg
    when 'sum' then to_jsonb((select sum(x) from unnest(p_nums) x))
    when 'min' then to_jsonb((select min(x) from unnest(p_nums) x))
    when 'max' then to_jsonb((select max(x) from unnest(p_nums) x))
    when 'avg' then to_jsonb((select avg(x) from unnest(p_nums) x))
  end;
end;
$function$;

CREATE FUNCTION custom._far_values(p_organization_id uuid, p_record_ids uuid[], p_key text, p_reader jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_out jsonb := '{}'::jsonb;
  g     record;
  v_tf  text;
  v_mk  text;
  v_fd  text;
  f     custom.record;
  v_id  uuid;
  v_one jsonb;
begin
  -- READ-SPEED-2: custom.far_value(org, id, key, reader) for MANY records at once, as {id: [value]} ([] when the
  -- answer is SQL NULL; an id that is not there is absent and reads as NULL). A far column that is stored is read for
  -- every record in one statement, exactly as custom.record_value_one assembles it; a far column that is itself worked
  -- out at read time is asked of custom.far_value one record at a time, so its circle and depth refusals stand.
  if p_key is null or coalesce(cardinality(p_record_ids), 0) = 0 then
    return v_out;
  end if;
  -- Records that are not a Table's rows (no table, a kernel or a relation row): the document and the Rule layer's block.
  select coalesce(jsonb_object_agg(r.id::text,
           case when x.v is null then '[]'::jsonb else jsonb_build_array(x.v) end), '{}'::jsonb)
    into v_one
    from custom.record r
    cross join lateral (select ((r.data - '_computed' - '_retired' - '_values' - '_sources' - '_derived')
                                || custom.computed_block(r.data -> '_computed')) -> p_key as v) x
   where r.organization_id = p_organization_id and r.id = any (p_record_ids)
     and (r.table_id is null or r.data_class in ('kernel', 'relation'));
  v_out := v_out || v_one;

  for g in
    select r.table_id
      from custom.record r
     where r.organization_id = p_organization_id and r.id = any (p_record_ids)
       and r.table_id is not null and r.data_class not in ('kernel', 'relation')
     group by r.table_id
  loop
    v_tf := custom.table_type_field(p_organization_id, g.table_id);
    for v_one in
      select to_jsonb(t) from (
        select case when v_tf is null then null else r.data ->> v_tf end as rt, array_agg(r.id) as ids
          from custom.record r
         where r.organization_id = p_organization_id and r.id = any (p_record_ids)
           and r.table_id = g.table_id and r.data_class not in ('kernel', 'relation')
         group by 1) t
    loop
      -- The same statement-memo question custom.record_value_one asks (READ-SPEED d), under the same key.
      v_mk := 'custom.rvo_field:' || p_organization_id::text || ':' || g.table_id::text || ':'
              || coalesce(v_one ->> 'rt', '') || ':' || p_key;
      v_fd := platform.memo_k_get(v_mk);
      if v_fd is null then
        select * into f
          from custom.applicable_fields(p_organization_id, g.table_id, v_one ->> 'rt') a
         where a.data ->> 'key' = p_key
           and custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
           and coalesce(a.data ->> 'compute_on', '') = 'read'
         limit 1;
        v_fd := case when f.id is not null then f.data::text else '-' end;
        perform platform.memo_k_put(v_mk, v_fd);
      end if;
      if v_fd <> '-' then
        select v_out || coalesce(jsonb_object_agg(x.id::text,
                 case when x.v is null then '[]'::jsonb else jsonb_build_array(x.v) end), '{}'::jsonb)
          into v_out
          from (select (e #>> '{}')::uuid as id,
                       custom.far_value(p_organization_id, (e #>> '{}')::uuid, p_key, p_reader) as v
                  from jsonb_array_elements(v_one -> 'ids') e) x;
      else
        select v_out || coalesce(jsonb_object_agg(r.id::text,
                 case when x.v is null then '[]'::jsonb else jsonb_build_array(x.v) end), '{}'::jsonb)
          into v_out
          from custom.record r
          cross join lateral (select ((r.data - '_computed' - '_retired' - '_values' - '_sources' - '_derived')
                                      || custom.computed_block(r.data -> '_computed')
                                      || custom.computed_block(r.data -> '_derived')) -> p_key as v) x
         where r.organization_id = p_organization_id
           and r.id in (select (e #>> '{}')::uuid from jsonb_array_elements(v_one -> 'ids') e);
      end if;
    end loop;
  end loop;
  return v_out;
end;
$function$;

CREATE FUNCTION custom._page_derived_prefetch(p_organization_id uuid, p_table_id uuid, p_record_ids uuid[])
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

CREATE OR REPLACE FUNCTION custom.rollup_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_via     text := p_field_data -> 'config' ->> 'via';
  v_of      text := p_field_data -> 'config' ->> 'of';
  v_agg     text := p_field_data -> 'config' ->> 'agg';
  v_filter  jsonb := p_field_data -> 'config' -> 'filter';
  v_nums    numeric[] := array[]::numeric[];
  v_vals    jsonb[] := '{}';   -- every value of the column read, empty ones as null (Airtable's list aggregates)
  v_n       integer := 0;
  v_one     jsonb;
  v_t       uuid;
  v_targets uuid[];
  v_table   uuid;
  v_far     uuid;
  v_where   text;
  v_gone    jsonb;
  v_mk      text;     -- READ-SPEED b
  v_memo    text;
  v_hit     text;     -- READ-SPEED-2
begin
  -- READ-SPEED-2: worked out for the whole page already (custom._page_derived_prefetch, this statement, this reader).
  v_hit := platform.memo_k_get('custom.pdv:' || p_organization_id::text || ':' || p_record_id::text || ':' || md5(p_field_data::text));
  if v_hit is not null then
    return v_hit::jsonb -> 0;
  end if;
  -- Held by the custom/system_enabled switch like every store function (the door that calls this asserts it).
  v_table := coalesce(nullif(p_field_data ->> 'entity_definition_id', '')::uuid,
                      (select r.table_id from custom.record r
                        where r.organization_id = p_organization_id and r.id = p_record_id));
  -- CHAIR-ROLLUP-HONEST: A SOURCE THAT IS ARCHIVED IS NOT A ZERO. When the link it reads through
  -- (or the back-link's linking column, or the column it totals) is archived, the answer is the
  -- typed state naming that column — never a count of nothing.
  v_gone := custom._derived_source_archived(p_organization_id, v_table, p_field_data);
  if v_gone is not null then
    return v_gone;
  end if;

  -- The linked records, once each (custom.relation_targets is DISTINCT), never the record itself.
  select coalesce(array_agg(t), '{}'::uuid[]) into v_targets
    from custom.relation_targets(p_organization_id, p_record_id, v_via) t
   where t <> p_record_id;         -- a record is never one of the things it adds up.

  -- CHAIR-MATH (b): WHICH OF THEM. config.filter is a saved view's filter written against the far
  -- table (custom.record_filter_sql: the one grammar — a flat map of column keys, windows, or a
  -- Rule expression over field ids), compiled once per roll-up and asked of the linked records in
  -- ONE statement. It is asked as this reader: a column the reader may not read refuses here as it
  -- refuses on the view (custom.derived_value turns that into an empty column, warned), and a Rule
  -- filter treats a hidden column as undecided — the roll-up counts what THIS reader may see.
  if v_filter is not null and jsonb_typeof(v_filter) = 'object' and v_filter <> '{}'::jsonb
     and cardinality(v_targets) > 0 then
    -- READ-SPEED b (2026-10-19): THE FILTER IS COMPILED ONCE PER STATEMENT, NOT ONCE PER ROW. The far table and
    -- the WHERE depend on this organization, this Table, this column's declaration and the reader only, so a page of
    -- 50 rows compiled the same filter 50 times (custom.record_filter_sql: 2.2 s of a 14-row Donors page). The
    -- answer is kept in the statement memo (seat + statement + transaction + generation stamped; a Field or Rule
    -- write clears it). A refusal is never kept: it raises before the put, every time.
    v_mk := 'custom.rollup_where:' || p_organization_id::text || ':' || coalesce(v_table::text, '-') || ':'
            || md5(p_field_data::text);
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
    -- CHAIR-UI-STORE: a roll-up through a back-link adds up records of the LINKING table.
    if v_far is null then
      v_far := nullif(custom._back_link_relation(p_organization_id, v_table, v_via) ->> 'relation_target', '')::uuid;
    end if;
    if v_far is null then
      raise exception 'The column "%" narrows the records it adds up, but the relation it reads through (%) points at no table, so it is left empty.',
        coalesce(nullif(p_field_data ->> 'label', ''), p_field_data ->> 'key', 'this column'), v_via
        using errcode = '23514', hint = 'FLD-11: give the relation a relation_target.';
    end if;
    v_where := custom.record_filter_sql(p_organization_id, v_far,
                 case when custom.filter_is_rule(v_filter) then v_filter
                      else custom.choice_filter_normalize(custom.choice_field_map(p_organization_id, v_far), v_filter) end);
    perform platform.memo_k_put(v_mk, v_far::text || chr(2) || v_where);
    end if;
    execute format('select coalesce(array_agg(r.id), ''{}''::uuid[]) from custom.record r '
                   'where r.organization_id = $1 and r.table_id = $2 and r.id = any ($3) '
                   'and r.deleted_at is null and %s', v_where)
       into v_targets
      using p_organization_id, v_far, v_targets;
  end if;

  foreach v_t in array v_targets loop
    v_n := v_n + 1;                                    -- count counts RECORDS, once each.
    if v_of is not null then
      -- STORE-TAILS-3: the one column it adds up, never the far record whole.
      v_one := custom.far_value(p_organization_id, v_t, v_of, p_field_data);
      v_vals := v_vals || coalesce(v_one, 'null'::jsonb);
      if v_one is not null and jsonb_typeof(v_one) = 'number' then
        v_nums := v_nums || (v_one #>> '{}')::numeric;
      end if;
    end if;
  end loop;

  return custom._rollup_agg(v_agg, v_n, v_vals, v_nums);   -- READ-SPEED-2: the one aggregation.
end;
$function$;

CREATE OR REPLACE FUNCTION custom.lookup_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_via   text := p_field_data -> 'config' ->> 'via';
  v_pick  text := p_field_data -> 'config' ->> 'pick';
  v_multi boolean := coalesce((p_field_data ->> 'multi')::boolean, false);
  v_out   jsonb := '[]'::jsonb;
  v_one   jsonb;
  v_t     uuid;
  v_gone  jsonb;
  v_hit   text;   -- READ-SPEED-2
begin
  -- READ-SPEED-2: worked out for the whole page already (custom._page_derived_prefetch, this statement, this reader).
  v_hit := platform.memo_k_get('custom.pdv:' || p_organization_id::text || ':' || p_record_id::text || ':' || md5(p_field_data::text));
  if v_hit is not null then
    return v_hit::jsonb -> 0;
  end if;
  -- CHAIR-ROLLUP-HONEST: the link it reads through, or the column it borrows, archived — the typed
  -- state naming that column, never an empty that looks like "nothing on the linked record".
  v_gone := custom._derived_source_archived(p_organization_id,
              coalesce(nullif(p_field_data ->> 'entity_definition_id', '')::uuid,
                       (select r.table_id from custom.record r
                         where r.organization_id = p_organization_id and r.id = p_record_id)),
              p_field_data);
  if v_gone is not null then
    return v_gone;
  end if;
  for v_t in select * from custom.relation_targets(p_organization_id, p_record_id, v_via) loop
    if v_t = p_record_id then
      continue;                     -- a record cannot look itself up through itself.
    end if;
    -- THE FAR SIDE, ONE COLUMN OF IT (STORE-TAILS-3). A lookup OF a computed Value, or of
    -- another lookup, still answers through the same precedence the whole-record reader uses —
    -- but only the picked column is worked out, so two tables that point at each other no
    -- longer work each other out whole, round and round, until the stack runs out.
    v_one := custom.far_value(p_organization_id, v_t, v_pick, p_field_data);
    if v_one is not null then
      v_out := v_out || jsonb_build_array(v_one);
    end if;
  end loop;
  if v_multi then
    return v_out;
  end if;
  return case when jsonb_array_length(v_out) = 0 then null else v_out -> 0 end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.formula_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb, p_values jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_values jsonb;
  v_who    uuid;
  v_env    jsonb;
  v_born   timestamptz;
  v_rec    custom.record;
  v_rtype  text;
  v_tf     text;
  v_key    text;
  v_keys   text[];
  v_imp    jsonb;
  v_upd    timestamptz;
  v_val    jsonb;
  v_txt    text;
  v_person jsonb;
  v_mk     text;     -- READ-SPEED-2
  v_memo   text;
  v_ckeys  text[];
begin
  -- LANE 10 P4: WHO MADE IT AND WHO LAST CHANGED IT, the way Created time and Last changed time
  -- are filled: from the record's own stamps (custom.record.created_by / updated_by, which
  -- platform._stamp_actor writes from the writing actor), on read, never typed. The value is
  -- {id, name, actor}: the name is the organization's own (custom.history_people, the namer
  -- comments and history use), null for somebody who is not a member of it.
  -- V8 #4: WHO WROTE IS ALSO WHICH KIND OF WRITER. A system or an agent write leaves
  -- custom.record.updated_by naming the person before it; the write's own tier is on its values'
  -- envelopes (`_values.<key>.actor`: user, agent or system, with `on_behalf_of` for an agent).
  -- Last changed by reads the latest envelope; Created by the envelope stamped when the record was
  -- made. A system write answers {id: null, name: null, actor: "system"}; an agent's answers
  -- actor "agent" with the person it wrote for.
  if (p_field_data -> 'config' ->> 'system') in ('created_by', 'modified_by') then
    select case when (p_field_data -> 'config' ->> 'system') = 'created_by' then r.created_by else r.updated_by end,
           r.created_at,
           (select e.value from jsonb_each(case when jsonb_typeof(r.data -> '_values') = 'object' then r.data -> '_values' else '{}'::jsonb end) e
             where jsonb_typeof(e.value) = 'object' and e.value ? 'actor' and e.value ? 'at'
               -- Created by: a value first written (ver 1), the earliest. Last changed by: the latest
               -- write, and of writes in one moment the one with the most versions behind it.
               and ((p_field_data -> 'config' ->> 'system') = 'modified_by' or coalesce(e.value ->> 'ver', '1') = '1')
             order by case when (p_field_data -> 'config' ->> 'system') = 'created_by' then (e.value ->> 'at')::timestamptz end asc,
                      case when (p_field_data -> 'config' ->> 'system') = 'modified_by' then (e.value ->> 'at')::timestamptz end desc,
                      case when (p_field_data -> 'config' ->> 'system') = 'modified_by' then coalesce((e.value ->> 'ver')::numeric, 1) end desc
             limit 1)
      into v_who, v_born, v_env
      from custom.record r
     where r.organization_id = p_organization_id
       and r.id = p_record_id;
    -- NOTION-AUTO: A COLUMN MADE AUTOMATIC KEEPING ITS VALUES (custom.field_make_automatic) set the
    -- imported person aside in `_retired` under this key. Created by answers it for good (a record
    -- is created once); Last changed by answers it until somebody changes the record, then the real
    -- person. The person is a member's or an unmatched guest's Person record, or plain words.
    select e.value, r.updated_at into v_imp, v_upd
      from custom.record r,
           jsonb_array_elements(case when jsonb_typeof(r.data -> '_retired') = 'array' then r.data -> '_retired' else '[]'::jsonb end) with ordinality e(value, ord)
     where r.organization_id = p_organization_id and r.id = p_record_id
       and e.value ->> 'key' = p_field_data ->> 'key'
       and jsonb_typeof(e.value -> 'value') <> 'null'
     order by e.ord desc
     limit 1;
    if v_imp is not null
       and ((p_field_data -> 'config' ->> 'system') = 'created_by'
            or v_upd <= (v_imp ->> 'at')::timestamptz) then
      v_val := v_imp -> 'value';
      if jsonb_typeof(v_val) = 'array' then
        v_val := v_val -> 0;
      end if;
      if jsonb_typeof(v_val) = 'object' then
        v_val := coalesce(v_val -> 'id', v_val -> 'name', v_val -> 'email');
      end if;
      v_txt := v_val #>> '{}';
      if v_txt is not null and v_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select p.data into v_person from custom.record p
         where p.organization_id = p_organization_id and p.id = v_txt::uuid;
        return jsonb_strip_nulls(jsonb_build_object('id', v_txt, 'actor', 'user', 'imported', true,
          'name', coalesce(v_person ->> 'name', v_person ->> 'full_name', v_person ->> 'email'),
          'email', v_person ->> 'email'));
      elsif v_txt is not null and btrim(v_txt) <> '' then
        return jsonb_build_object('id', null, 'actor', 'user', 'imported', true, 'name', v_txt);
      end if;
    end if;
    -- A Created by envelope counts only when it was stamped as the record was made.
    if (p_field_data -> 'config' ->> 'system') = 'created_by' and v_env is not null
       and abs(extract(epoch from ((v_env ->> 'at')::timestamptz - v_born))) > 5 then
      v_env := null;
    end if;
    if v_env ->> 'actor' = 'system' then
      -- V11 #6: A SYSTEM WRITE NAMES WHO SET IT GOING, when the store knows: the envelope's
      -- on_behalf_of, else — for Created by — the record's own creator stamp (platform._stamp_actor
      -- writes the signed-in person there). Last changed by never borrows updated_by for a system
      -- write: that stamp still names whoever wrote before it.
      v_who := coalesce(nullif(v_env ->> 'on_behalf_of', '')::uuid,
                        case when (p_field_data -> 'config' ->> 'system') = 'created_by' then v_who end);
      return jsonb_build_object('id', v_who, 'actor', 'system',
                                'name', case when v_who is not null then custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name' end);
    end if;
    if v_env ->> 'actor' = 'agent' then
      v_who := coalesce(nullif(v_env ->> 'on_behalf_of', '')::uuid, v_who);
      return jsonb_build_object('id', v_who, 'actor', 'agent',
                                'name', case when v_who is not null then custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name' end);
    end if;
    if v_who is null then
      return 'null'::jsonb;
    end if;
    return jsonb_build_object('id', v_who, 'actor', 'user',
                              'name', custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name');
  end if;
  v_values := coalesce(p_values, custom.record_values(p_organization_id, p_record_id));
  -- REC-15's evaluator, not a second one: every Rule node, every refusal and REC-17's
  -- "by id, never by name" still come from custom.rule_eval, which custom.formula_eval hands
  -- them to unchanged. GRID-PRIMITIVES G3 adds the formula language's own `fx.*` nodes, and
  -- the three facts only a formula about ITS OWN record can use (its id, its column, its table:
  -- autonumber and the created / modified stamps). They ride under fx_* keys so no Rule node
  -- that reads the context (stage_count, sibling_count read `table_id`) answers differently.
  --
  -- CHAIR-MATH (a): A WORKED-OUT COLUMN THIS FORMULA READS IS WORKED OUT FIRST. The values a
  -- caller hands in are the stored row, the Rule layer's block and what was stamped at write
  -- time; a roll-up, a lookup or another read-time formula is none of those, so its key is
  -- absent and the evaluator read it as blank (0). Each such key is resolved here through
  -- custom.far_value — the one reader that refuses a circle by sentence instead of recursing —
  -- and only when it is absent, so a caller that already worked it out (custom.derived_values_of
  -- in dependency order) pays nothing more.
  if p_values is not null and p_record_id is not null then
    -- READ-SPEED-2: THE COLUMNS THIS FORMULA READS, ASKED ONCE PER STATEMENT. formula_field_keys resolves every field id
    -- of the expression (custom.rule_field_key, one lookup each) and depends on the organization and the expression
    -- only; a page asked it once per row per formula. Kept in the statement memo (seat + statement + transaction +
    -- generation stamped; any Field write clears it).
    v_mk := 'custom.fv_keys:' || p_organization_id::text || ':' || md5(coalesce((p_field_data -> 'config' -> 'expr')::text, ''));
    v_memo := platform.memo_k_get(v_mk);
    if v_memo is not null then
      v_keys := v_memo::text[];
    else
      v_keys := custom.formula_field_keys(p_organization_id, p_field_data -> 'config' -> 'expr');
      perform platform.memo_k_put(v_mk, v_keys::text);
    end if;
    if cardinality(v_keys) > 0 then
      select * into v_rec from custom.record
       where organization_id = p_organization_id and id = p_record_id;
      if v_rec.id is not null and v_rec.table_id is not null
         and v_rec.data_class not in ('kernel', 'relation') then
        v_tf := custom.table_type_field(v_rec.organization_id, v_rec.table_id);
        if v_tf is not null then
          v_rtype := v_rec.data ->> v_tf;
        end if;
        -- READ-SPEED-2: which of them are worked out at read time on this Table and record type, asked once per
        -- statement (the same applicable_fields question, kept in the statement memo in its own order).
        v_mk := 'custom.fv_computed:' || v_rec.organization_id::text || ':' || v_rec.table_id::text || ':'
                || coalesce(v_rtype, '') || ':' || coalesce(p_field_data ->> 'key', '') || ':' || md5(v_keys::text);
        v_memo := platform.memo_k_get(v_mk);
        if v_memo is not null then
          v_ckeys := v_memo::text[];
        else
          select coalesce(array_agg(a.data ->> 'key' order by a.ordinality), '{}'::text[]) into v_ckeys
            from custom.applicable_fields(v_rec.organization_id, v_rec.table_id, v_rtype) with ordinality a
           where (a.data ->> 'key') = any (v_keys)
             and (a.data ->> 'key') is distinct from (p_field_data ->> 'key')
             and custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
             and coalesce(a.data ->> 'compute_on', '') = 'read';
          perform platform.memo_k_put(v_mk, v_ckeys::text);
        end if;
        for v_key in
          select k from unnest(v_ckeys) with ordinality u(k, o)
           where not (v_values ? k)
           order by o
        loop
          v_values := v_values || jsonb_build_object(v_key,
                        custom.far_value(p_organization_id, p_record_id, v_key, p_field_data));
        end loop;
      end if;
    end if;
  end if;

  return custom.formula_eval(p_organization_id, p_field_data -> 'config' -> 'expr',
                             v_values,
                             coalesce(custom.rule_context(p_organization_id, p_record_id), '{}'::jsonb)
                             || jsonb_build_object('fx_self_id', p_record_id,
                                                   'fx_field_key', p_field_data ->> 'key',
                                                   'fx_table_id', p_field_data ->> 'entity_definition_id'));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.rule_field_key(p_organization_id uuid, p_field_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
declare
  v_mk text;
  v_m  text;
  v_k  text;
begin
  -- WRITE-PERF-2, LADDER-PERF's class on the rest of the write path: the plan is cached for the session.
  -- READ-SPEED-2 (2026-10-19): A FIELD'S KEY, ASKED ONCE PER STATEMENT. Every field node of every formula of every row
  -- asked it again (346 lookups on one 21-row Jobs page). Kept in the statement memo (seat + statement + transaction +
  -- generation stamped; any Field write clears the generation). "-" marks "no such live Field".
  v_mk := 'custom.rule_field_key:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_field_id::text, '-');
  v_m := platform.memo_k_get(v_mk);
  if v_m is not null then
    return case when v_m = '-' then null else substr(v_m, 2) end;
  end if;
  v_k := (
  select f.data ->> 'key'
    from custom.record f
   where f.organization_id = p_organization_id
     and f.id = p_field_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
  );
  perform platform.memo_k_put(v_mk, case when v_k is null then '-' else 'k' || v_k end);
  return v_k;
end
$function$;

CREATE OR REPLACE FUNCTION custom.rule_context(p_organization_id uuid, p_record_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
declare
  v_mk  text;
  v_m   text;
  v_out jsonb;
begin
  -- WRITE-PERF-2: this function's own SQL body, only the language moved (plan cached for the session).
  -- READ-SPEED-2 (2026-10-19): ONE RECORD'S CONTEXT, ASKED ONCE PER STATEMENT IN A READ. Every formula of a row asked it
  -- again (7 times a row on Jobs). Kept in the statement memo only while this transaction has written nothing (no
  -- transaction id yet): a write in the same statement could change the record or its parent, so a writing
  -- statement asks every time, exactly as before. mx.read_memo = off: asked every time.
  if pg_current_xact_id_if_assigned() is null
     and coalesce(current_setting('mx.read_memo', true), '') <> 'off' then
    v_mk := 'custom.rule_context:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_record_id::text, '-');
    v_m := platform.memo_k_get(v_mk);
    if v_m is not null then
      return case when v_m = '-' then null else substr(v_m, 2)::jsonb end;
    end if;
  end if;
  v_out := (
  -- ONE parent, read through W1-TABLE's own REC-7 reader, and NOTHING RECURSIVE. This body
  -- is the whole of REC-16's ceiling: an evaluator cannot reach a grandparent because the
  -- map it reads has one parent in it and no way to ask for another.
  select jsonb_build_object(
           'record_id',     r.id,
           'parent_id',     to_jsonb(custom.containment_parent(r.data)),
           'parent_values', coalesce(custom.record_values(p_organization_id,
                                       custom.containment_parent(r.data)), 'null'::jsonb))
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_record_id
     and r.deleted_at is null
  );
  if v_mk is not null and pg_current_xact_id_if_assigned() is null then
    perform platform.memo_k_put(v_mk, case when v_out is null then '-' else 'j' || v_out::text end);
  end if;
  return v_out;
end
$function$;

CREATE OR REPLACE FUNCTION custom._derived_attempt(p_organization_id uuid, p_record_id uuid, p_field_data jsonb, p_values jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
-- CHAIR-SHEET-STORE (a): ONE worked-out column of one record, and WHY when it cannot be worked out.
--   {"v": <value>}                  worked out (the key is absent when the answer is SQL NULL)
--   {"e": "<plain-English reason>"} not worked out; the column is empty on this read
-- custom.derived_value is `-> 'v'` of this, exactly as it answered before; the read doors
-- (custom.record_values_step) also keep `-> 'e'` in the record's `_errors`.
declare
  v_parity text := custom.parity_type(p_field_data);
  v_value  jsonb;
  v_what   text;
  v_says   text;
  v_mk     text;     -- READ-SPEED-2
  v_m      text;
  v_circ   text;
  v_out    jsonb;
begin
  -- READ-SPEED-2 (2026-10-19): ONE COLUMN OF ONE RECORD IS WORKED OUT ONCE PER READ. A formula that reads another
  -- formula (margin_flag reads margin_pct reads margin) worked the inner ones out again for every column that
  -- reads them. The answer depends on the record, the column's declaration and the values handed in, so it is kept
  -- in the statement memo under those three — only in a read (this transaction has written nothing: a write could
  -- change what the answer reads) and only when nothing inside it met a circle (custom.derived_circles did not
  -- move: an answer that met a circle depends on where the read started, so it is worked out every time, as before).
  -- mx.read_memo = off: nothing kept (the proofs compare both on one snapshot).
  if pg_current_xact_id_if_assigned() is null and p_record_id is not null
     and coalesce(current_setting('mx.read_memo', true), '') <> 'off' then
    v_mk := 'custom.da:' || coalesce(p_organization_id::text, '-') || ':' || p_record_id::text || ':'
            || md5(p_field_data::text) || ':' || md5(coalesce(p_values::text, '-'));
    v_m := platform.memo_k_get(v_mk);
    if v_m is not null then
      return v_m::jsonb;
    end if;
    v_circ := coalesce(current_setting('custom.derived_circles', true), '');
  end if;
  v_value := case v_parity
    when 'lookup'  then custom.lookup_value(p_organization_id, p_record_id, p_field_data)
    when 'rollup'  then custom.rollup_value(p_organization_id, p_record_id, p_field_data)
    when 'formula' then custom.formula_value(p_organization_id, p_record_id, p_field_data, p_values)
    else null
  end;
  v_out := case when v_value is null then '{}'::jsonb else jsonb_build_object('v', v_value) end;
  if v_mk is not null and pg_current_xact_id_if_assigned() is null
     and coalesce(current_setting('custom.derived_circles', true), '') = v_circ then
    perform platform.memo_k_put(v_mk, v_out::text);
  end if;
  return v_out;
exception
  -- 🚨 NEVER SWALLOWED: a refusal is an answer about ACCESS and belongs to the caller, and a
  -- cancelled or timed-out read has established nothing about this column at all. Both
  -- re-raise exactly as they arrived.
  when insufficient_privilege or query_canceled then
    raise;
  when others then
    raise warning 'custom.derived_value: the % column "%" (key %) could not be worked out for record %: % (%). The column is empty on this read; every other column and the record itself are unaffected. REMEDY: fix the Field''s own definition - REC-17 says a formula, a lookup and a rollup point at a Field by ID and never by name.',
      coalesce(v_parity, 'worked-out'),
      coalesce(p_field_data ->> 'label', p_field_data ->> 'key', '(unnamed)'),
      coalesce(p_field_data ->> 'key', '(no key)'),
      p_record_id, sqlerrm, sqlstate;
    v_what := case v_parity when 'lookup' then 'lookup' when 'rollup' then 'roll-up' else 'formula' end;
    -- The store's own refusals are already sentences ("This formula divides by zero.", a circle
    -- named by custom.far_value): they are kept word for word. Postgres's own words are not, so
    -- the common ones are said plainly and anything else keeps its words behind a plain lead-in.
    v_says := case
      when sqlerrm ~ '^[A-Z`"]' and sqlerrm ~ '[.!?]$' then sqlerrm
      when sqlstate = '22012' then format('This %s divides by zero.', v_what)
      when sqlstate = '22003' then format('This %s''s answer is too large to keep.', v_what)
      when sqlstate in ('22P02', '22007', '22008') then
        format('This %s reads a value that is not a number or a date where it needs one.', v_what)
      when sqlstate = '54001' then format('This %s reads itself in a circle.', v_what)
      else format('This %s could not be worked out: %s.', v_what, rtrim(sqlerrm, '.'))
    end;
    -- READ-SPEED-2: a circle (or a chain too long) is counted, so no answer that met one is kept (above). The handler
    -- runs after the failed attempt is undone, so the count survives it.
    if sqlstate = '42P17' then
      perform set_config('custom.derived_circles',
                coalesce(current_setting('custom.derived_circles', true), '') || 'c', true);
    elsif v_mk is not null and pg_current_xact_id_if_assigned() is null
          and coalesce(current_setting('custom.derived_circles', true), '') = v_circ then
      perform platform.memo_k_put(v_mk, jsonb_build_object('e', v_says)::text);
    end if;
    return jsonb_build_object('e', v_says);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_type_field(p_organization_id uuid, p_table_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_answer text;
  v_key    text;
  v_hit    text;
  v_ok     text;
begin
  -- READ-SPEED-2 (2026-10-19): ONCE PER STATEMENT, THE CHECKS INCLUDED. A sort by a worked-out column asks this for every
  -- matching record (5,000 asks, 2 s of checks alone); the two checks and the answer depend on the reader, the
  -- organization and the Table only. Kept in the statement memo after both checks passed (seat + statement +
  -- transaction + generation stamped): a reader the checks refuse is refused every time, as before.
  v_ok := 'custom.ttf_ok:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_table_id::text, '-');
  v_hit := platform.memo_k_get(v_ok);
  if v_hit is not null then
    return v_hit::jsonb #>> '{}';
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_type_field');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.table_type_field');

  -- `to_jsonb`/`#>> '{}'` and not the bare text, so a Table that HAS no type field — a null
  -- answer, which is the common one — is a hit rather than a miss forever.
  v_key := 'tf:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_table_id::text, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    perform platform.memo_k_put(v_ok, v_hit);
    return v_hit::jsonb #>> '{}';
  end if;

  select t.data ->> 'type_field' into v_answer
    from custom.record t
   where t.organization_id = p_organization_id
     and t.id = p_table_id
     and t.table_id = custom.table_kernel_id()
     and t.deleted_at is null;
  perform platform.memo_k_put(v_key, coalesce(to_jsonb(v_answer), 'null'::jsonb)::text);
  perform platform.memo_k_put(v_ok, coalesce(to_jsonb(v_answer), 'null'::jsonb)::text);
  return v_answer;
end;
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

  -- READ-SPEED-2: the page's roll-ups and lookups, worked out for every row at once (each row is one this reader
  -- may open: the visible set above chose it). The loop below reads them from the statement memo.
  if not v_world_def and cardinality(v_rows) > 1 then
    perform custom._page_derived_prefetch(p_organization_id, p_table_id, (select array_agg(x.id) from unnest(v_rows) x));
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

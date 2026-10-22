-- Inverse of migrations/campaign/20261021230000_closeformula_b_a_lookup_through_many_links_answers_every_one.sql: the two readers as they were, then the helper goes.
set lock_timeout = '3s';
set statement_timeout = '60s';

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
  v_skip    text[] := string_to_array(nullif(platform.memo_k_get('custom.page_prefetch_skip:' || p_organization_id::text || ':' || p_table_id::text), ''), chr(1));  -- READ-SPEED-7
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
    -- READ-SPEED-7: a column this reader is served from the kept values (custom.read_records_by_ids says which) is not worked out here
    continue when v_skip is not null and (fd ->> 'key') = any (v_skip);
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

DROP FUNCTION IF EXISTS custom._lookup_answers_many(uuid, uuid, jsonb);

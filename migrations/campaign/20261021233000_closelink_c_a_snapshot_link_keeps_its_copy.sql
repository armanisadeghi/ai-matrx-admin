-- Lane CLOSE-LINK (CD-LINK-05, VISION Rule 5 "binding: live (follows the target) or snapshot (freezes a copy at that moment)"). A link column bound snapshot (config.binding) now really keeps a frozen copy: the record edge writers (custom._relation_associations_stmt_insert / _stmt_update, REPLACED by body) put the target's document on the edge as payload_kind relation_snapshot when the link is made (a link that stays keeps its copy; one made again takes a fresh one), custom.lookup_value (REPLACED by body) reads a lookup through a snapshot link from that copy, custom._page_derived_prefetch (REPLACED by body) leaves those lookups to it, and custom.field_update (REPLACED by body) takes `binding` (live | snapshot) and, turning snapshot on, takes a copy for every link already there. Three helpers are new. Before this, platform.relation_set alone took copies and the grid's write path never did, so the setting changed nothing. Inverse: migrations/inverse/20261021233000_closelink_c_a_snapshot_link_keeps_its_copy_down.sql.
-- lane: close-link
-- lock: custom
-- based-on: custom._relation_associations_stmt_insert() 191f09e8b261ab47d17ae15f34fb8fac4f9a6eb6245ce11625bc61c26554ad97
-- based-on: custom._relation_associations_stmt_update() 9df28bc03a6a1a866001896240935989233efccd5218763f10ec8fdacbb99f1b
-- based-on: custom.lookup_value(uuid, uuid, jsonb) 6252ea1e58920ca5db4ae7c2957f689acb84ebcf968d2f3a004c17e61ab6dedd
-- based-on: custom._page_derived_prefetch(uuid, uuid, uuid[]) 6536d64dd8763915884e3da2ba79eeb1597114d359b995503d46297713b275f4
-- based-on: custom.field_update(uuid, uuid, jsonb) d26a0ef1a11df7907a5d530c07c0b8596e92003361b0cb558b79fb06536b813c
--
-- Test: scripts/campaign-tests/closelink_snapshot_green.sql (RED before: "A column has no setting called \"binding\"" / the lookup follows the new address).

set lock_timeout = '3s';
set statement_timeout = '120s';

-- ── HELPERS (new). ───────────────────────────────────────────────────────────────────────────
-- Is this link column bound `snapshot` (VISION Rule 5: "binding: live (follows the target) or snapshot (freezes a copy at that moment)")?
CREATE OR REPLACE FUNCTION custom._relation_field_is_snapshot(p_organization_id uuid, p_field_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce((select f.data -> 'config' ->> 'binding' = 'snapshot'
                     from custom.record f
                    where f.organization_id = p_organization_id and f.id = p_field_id
                      and f.deleted_at is null), false)
$function$;

-- The frozen copy a snapshot link keeps of the record it points at, taken now: the same shape
-- platform.relation_snapshot_of writes through platform.relation_set (taken_at, title, table_id, values).
-- It asks nothing of the caller: it is only ever called by the store's own edge writers, after the
-- link itself has been allowed, and every reader masks it (platform.relations_from, custom.lookup_value
-- reads only targets custom.relation_targets lets this reader see).
CREATE OR REPLACE FUNCTION custom._relation_snapshot_copy(p_organization_id uuid, p_target_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select pg_catalog.jsonb_build_object(
           'taken_at', pg_catalog.to_char(pg_catalog.now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'title',    platform.relation_label(p_organization_id, 'record', p_target_id),
           'table_id', r.table_id,
           'values',   coalesce(r.data, '{}'::jsonb))
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_target_id and r.deleted_at is null
$function$;

-- Does the link column `p_key` of table `p_table_id` keep snapshots? (memoised per statement, like custom.record_relation_edges)
CREATE OR REPLACE FUNCTION custom._relation_via_is_snapshot(p_organization_id uuid, p_table_id uuid, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_key text;
  v_hit text;
  v_yes boolean;
begin
  if p_organization_id is null or p_table_id is null or coalesce(p_key, '') = '' then
    return false;
  end if;
  v_key := 'rvs:' || p_organization_id::text || ':' || p_table_id::text || ':' || p_key;
  v_hit := platform.memo_s_get(v_key);
  if v_hit is not null then
    return v_hit = 't';
  end if;
  select exists (select 1 from custom.record f
                  where f.organization_id = p_organization_id
                    and f.table_id = custom.field_kernel_id()
                    and f.deleted_at is null
                    and f.data ->> 'entity_definition_id' = p_table_id::text
                    and coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name') = p_key
                    and f.data ->> 'type' = 'relation'
                    and f.data -> 'config' ->> 'binding' = 'snapshot')
    into v_yes;
  perform platform.memo_s_put(v_key, case when v_yes then 't' else 'f' end);
  return v_yes;
end
$function$;

CREATE OR REPLACE FUNCTION custom._relation_associations_stmt_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_named boolean := false;
begin
  if nullif(current_setting('app.actor_system', true), '') is null
     and coalesce(platform.declared_actor_tier(), platform.actor_tier()) in ('agent', 'system') then
    perform set_config('app.actor_system', 'custom.relations', true);
    v_named := true;
  end if;

  -- WRITE what it declares now, WITH THE FIELD ON IT. `platform.enforce_relation_edge` is
  -- what then holds REL-5, REL-7, REL-8 and REL-12 over it.
  insert into platform.associations
    (source_type, source_id, target_type, target_id, role, organization_id,
     relation_field_id, "position", payload_kind, payload)
  select 'record', n.id, 'record', e.target_id, e.edge_role, n.organization_id,
         e.field_id, e.ord,
         -- CLOSE-LINK (CD-LINK-05): a link bound `snapshot` keeps a frozen copy of what it points at, taken now.
         case when custom._relation_field_is_snapshot(n.organization_id, e.field_id) then 'relation_snapshot' end,
         case when custom._relation_field_is_snapshot(n.organization_id, e.field_id)
              then custom._relation_snapshot_copy(n.organization_id, e.target_id) end
    from new_rows n
    cross join lateral custom.record_relation_edges(n.organization_id, n.id, n.table_id,
                                                    n.data_class, n.data, n.deleted_at) e
   order by n.id
  on conflict (source_type, source_id, target_type, target_id, role) do update
     set relation_field_id = excluded.relation_field_id,
         "position"        = excluded."position",
         -- CLOSE-LINK (CD-LINK-05): an edge that stayed keeps the copy it took; a re-made one (or one with none) takes today's.
         payload_kind      = case when associations.deleted_at is not null or associations.payload is null
                                  then coalesce(excluded.payload_kind, associations.payload_kind) else associations.payload_kind end,
         payload           = case when associations.deleted_at is not null or associations.payload is null
                                  then coalesce(excluded.payload, associations.payload) else associations.payload end,
         deleted_at        = null,
         -- The revive the separate UPDATE used to do, on exactly the rows it used to touch.
         deleted_via_type  = case when associations.deleted_at is not null
                                  then null else associations.deleted_via_type end,
         deleted_via_id    = case when associations.deleted_at is not null
                                  then null else associations.deleted_via_id end;

  -- ── SC-R / P12: THE ENTITY EDGES a new record's document implies, beside the record ones.
  insert into platform.associations
    (source_type, source_id, target_type, target_id, role, organization_id,
     relation_field_id, "position")
  select 'record', n.id, e.target_type, e.target_id, e.edge_role, n.organization_id,
         e.field_id, e.ord
    from new_rows n
    cross join lateral custom.record_entity_edges(n.organization_id, n.id, n.table_id,
                                                  n.data_class, n.data, n.deleted_at) e
   order by n.id
  on conflict (source_type, source_id, target_type, target_id, role) do update
     set relation_field_id = excluded.relation_field_id,
         "position"        = excluded."position",
         deleted_at        = null,
         deleted_via_type  = case when associations.deleted_at is not null
                                  then null else associations.deleted_via_type end,
         deleted_via_id    = case when associations.deleted_at is not null
                                  then null else associations.deleted_via_id end;

  if v_named then
    perform set_config('app.actor_system', '', true);
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._relation_associations_stmt_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_named boolean := false;
begin
  if nullif(current_setting('app.actor_system', true), '') is null
     and coalesce(platform.declared_actor_tier(), platform.actor_tier()) in ('agent', 'system') then
    perform set_config('app.actor_system', 'custom.relations', true);
    v_named := true;
  end if;

  update platform.associations a
     set deleted_at = now()
    from new_rows n
    join old_rows o on o.organization_id = n.organization_id and o.id = n.id
   where not (o.data       is not distinct from n.data
              and o.data_class is not distinct from n.data_class
              and o.table_id   is not distinct from n.table_id
              and o.deleted_at is not distinct from n.deleted_at)
     and a.deleted_at is null
     and a.source_type = 'record'
     and a.source_id = o.id
     and a.relation_field_id is not null
     and (a.target_id, a.role) in (
           select e.target_id, e.edge_role
             from custom.record_relation_edges(o.organization_id, o.id, o.table_id,
                                               o.data_class, o.data, o.deleted_at) e)
     and (a.target_id, a.role) not in (
           select e.target_id, e.edge_role
             from custom.record_relation_edges(n.organization_id, n.id, n.table_id,
                                               n.data_class, n.data, n.deleted_at) e);

  update platform.associations a
     set deleted_at        = null,
         deleted_via_type  = null,
         deleted_via_id    = null,
         relation_field_id = e.field_id,
         "position"        = e.ord,
         -- CLOSE-LINK (CD-LINK-05): a link made again is a new link, so a snapshot link takes a fresh copy.
         payload_kind      = case when custom._relation_field_is_snapshot(n.organization_id, e.field_id)
                                  then 'relation_snapshot' else a.payload_kind end,
         payload           = case when custom._relation_field_is_snapshot(n.organization_id, e.field_id)
                                  then custom._relation_snapshot_copy(n.organization_id, e.target_id) else a.payload end
    from new_rows n
    join old_rows o on o.organization_id = n.organization_id and o.id = n.id
    cross join lateral custom.record_relation_edges(n.organization_id, n.id, n.table_id,
                                                    n.data_class, n.data, n.deleted_at) e
   where not (o.data       is not distinct from n.data
              and o.data_class is not distinct from n.data_class
              and o.table_id   is not distinct from n.table_id
              and o.deleted_at is not distinct from n.deleted_at)
     and a.deleted_at is not null
     and a.source_type = 'record'
     and a.source_id = n.id
     and a.target_id = e.target_id
     and a.role = e.edge_role;

  insert into platform.associations
    (source_type, source_id, target_type, target_id, role, organization_id,
     relation_field_id, "position", payload_kind, payload)
  select 'record', n.id, 'record', e.target_id, e.edge_role, n.organization_id,
         e.field_id, e.ord,
         -- CLOSE-LINK (CD-LINK-05): a link bound `snapshot` keeps a frozen copy of what it points at, taken now.
         case when custom._relation_field_is_snapshot(n.organization_id, e.field_id) then 'relation_snapshot' end,
         case when custom._relation_field_is_snapshot(n.organization_id, e.field_id)
              then custom._relation_snapshot_copy(n.organization_id, e.target_id) end
    from new_rows n
    join old_rows o on o.organization_id = n.organization_id and o.id = n.id
    cross join lateral custom.record_relation_edges(n.organization_id, n.id, n.table_id,
                                                    n.data_class, n.data, n.deleted_at) e
   where not (o.data       is not distinct from n.data
              and o.data_class is not distinct from n.data_class
              and o.table_id   is not distinct from n.table_id
              and o.deleted_at is not distinct from n.deleted_at)
   order by n.id
  on conflict (source_type, source_id, target_type, target_id, role) do update
     set relation_field_id = excluded.relation_field_id,
         "position"        = excluded."position",
         -- CLOSE-LINK (CD-LINK-05): an edge that stayed keeps the copy it took; a re-made one (or one with none) takes today's.
         payload_kind      = case when associations.deleted_at is not null or associations.payload is null
                                  then coalesce(excluded.payload_kind, associations.payload_kind) else associations.payload_kind end,
         payload           = case when associations.deleted_at is not null or associations.payload is null
                                  then coalesce(excluded.payload, associations.payload) else associations.payload end,
         deleted_at        = null;

  -- ── SC-R / P12: THE ENTITY EDGES — withdraw, revive, write — for record → <platform thing>.
  update platform.associations a
     set deleted_at = now()
    from new_rows n
    join old_rows o on o.organization_id = n.organization_id and o.id = n.id
   where not (o.data       is not distinct from n.data
              and o.data_class is not distinct from n.data_class
              and o.table_id   is not distinct from n.table_id
              and o.deleted_at is not distinct from n.deleted_at)
     and a.deleted_at is null
     and a.source_type = 'record'
     and a.source_id = o.id
     and a.target_type <> 'record'
     and a.relation_field_id is not null
     and (a.target_type, a.target_id, a.role) in (
           select e.target_type, e.target_id, e.edge_role
             from custom.record_entity_edges(o.organization_id, o.id, o.table_id,
                                             o.data_class, o.data, o.deleted_at) e)
     and (a.target_type, a.target_id, a.role) not in (
           select e.target_type, e.target_id, e.edge_role
             from custom.record_entity_edges(n.organization_id, n.id, n.table_id,
                                             n.data_class, n.data, n.deleted_at) e);

  update platform.associations a
     set deleted_at        = null,
         deleted_via_type  = null,
         deleted_via_id    = null,
         relation_field_id = e.field_id,
         "position"        = e.ord
    from new_rows n
    join old_rows o on o.organization_id = n.organization_id and o.id = n.id
    cross join lateral custom.record_entity_edges(n.organization_id, n.id, n.table_id,
                                                  n.data_class, n.data, n.deleted_at) e
   where not (o.data       is not distinct from n.data
              and o.data_class is not distinct from n.data_class
              and o.table_id   is not distinct from n.table_id
              and o.deleted_at is not distinct from n.deleted_at)
     and a.deleted_at is not null
     and a.source_type = 'record'
     and a.source_id = n.id
     and a.target_type = e.target_type
     and a.target_id = e.target_id
     and a.role = e.edge_role;

  insert into platform.associations
    (source_type, source_id, target_type, target_id, role, organization_id,
     relation_field_id, "position")
  select 'record', n.id, e.target_type, e.target_id, e.edge_role, n.organization_id,
         e.field_id, e.ord
    from new_rows n
    join old_rows o on o.organization_id = n.organization_id and o.id = n.id
    cross join lateral custom.record_entity_edges(n.organization_id, n.id, n.table_id,
                                                  n.data_class, n.data, n.deleted_at) e
   where not (o.data       is not distinct from n.data
              and o.data_class is not distinct from n.data_class
              and o.table_id   is not distinct from n.table_id
              and o.deleted_at is not distinct from n.deleted_at)
   order by n.id
  on conflict (source_type, source_id, target_type, target_id, role) do update
     set relation_field_id = excluded.relation_field_id,
         "position"        = excluded."position",
         deleted_at        = null;

  if v_named then
    perform set_config('app.actor_system', '', true);
  end if;
  return null;
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
  v_multi boolean;
  v_out   jsonb := '[]'::jsonb;
  v_one   jsonb;
  v_t     uuid;
  v_gone  jsonb;
  v_hit   text;   -- READ-SPEED-2
  v_snap  boolean;  -- CLOSE-LINK (CD-LINK-05)
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
  -- CLOSE-FORMULA (2026-10-21): A LOOKUP THROUGH A LINK THAT HOLDS SEVERAL ANSWERS EVERY ONE OF THEM (Airtable's lookup).
  -- The field's own `multi` was never set by either declare door, so a lookup of "Contact email" over four linked deals
  -- answered the first deal's email only. custom._lookup_answers_many is the one place that decides it.
  v_multi := custom._lookup_answers_many(p_organization_id,
               coalesce(nullif(p_field_data ->> 'entity_definition_id', '')::uuid,
                        (select r.table_id from custom.record r
                          where r.organization_id = p_organization_id and r.id = p_record_id)),
               p_field_data);
  -- CLOSE-LINK (CD-LINK-05): THROUGH A SNAPSHOT LINK, THE COPY IT TOOK. An invoice whose "Bill to" is bound
  -- `snapshot` shows the address the client had when the invoice was linked, not today's. A link with no copy on it
  -- (none can be made after this migration: the edge writers take one, and turning snapshot on takes one for every
  -- link already there) reads live, as before.
  v_snap := custom._relation_via_is_snapshot(p_organization_id,
              coalesce(nullif(p_field_data ->> 'entity_definition_id', '')::uuid,
                       (select r.table_id from custom.record r
                         where r.organization_id = p_organization_id and r.id = p_record_id)),
              v_via);
  for v_t in select * from custom.relation_targets(p_organization_id, p_record_id, v_via) loop
    if v_t = p_record_id then
      continue;                     -- a record cannot look itself up through itself.
    end if;
    -- THE FAR SIDE, ONE COLUMN OF IT (STORE-TAILS-3). A lookup OF a computed Value, or of
    -- another lookup, still answers through the same precedence the whole-record reader uses —
    -- but only the picked column is worked out, so two tables that point at each other no
    -- longer work each other out whole, round and round, until the stack runs out.
    v_one := null;
    if v_snap then
      select coalesce(a.payload -> 'values' -> v_pick, a.payload -> 'values' -> '_derived' -> v_pick, 'null'::jsonb)
        into v_one
        from platform.associations a
       where a.source_type = 'record' and a.source_id = p_record_id
         and a.target_type = 'record' and a.target_id = v_t
         and a.role = v_via and a.deleted_at is null
         and a.organization_id = p_organization_id
         and a.payload_kind = 'relation_snapshot' and a.payload is not null
       limit 1;
      if v_one = 'null'::jsonb then
        v_one := null;
        continue;
      end if;
    end if;
    if v_one is null then
      v_one := custom.far_value(p_organization_id, v_t, v_pick, p_field_data);
    end if;
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
    -- CLOSE-LINK (CD-LINK-05): a lookup through a snapshot link reads the copy on each link (custom.lookup_value, per row).
    continue when custom.parity_type(fd) = 'lookup'
              and custom._relation_via_is_snapshot(p_organization_id,
                    coalesce(nullif(fd ->> 'entity_definition_id', '')::uuid, p_table_id), fd -> 'config' ->> 'via');
    begin
      v_par    := custom.parity_type(fd);
      v_via    := fd -> 'config' ->> 'via';
      v_key    := case when v_par = 'lookup' then fd -> 'config' ->> 'pick' else fd -> 'config' ->> 'of' end;
      v_agg    := fd -> 'config' ->> 'agg';
      v_filter := fd -> 'config' -> 'filter';
      v_hash   := md5(fd::text);
      v_table  := coalesce(nullif(fd ->> 'entity_definition_id', '')::uuid, p_table_id);
      -- CLOSE-FORMULA: a lookup through a link that holds several answers every one (custom._lookup_answers_many).
      v_multi  := v_par = 'lookup' and custom._lookup_answers_many(p_organization_id, v_table, fd);
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

CREATE OR REPLACE FUNCTION custom.field_update(p_organization_id uuid, p_field_id uuid, p_patch jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_old       jsonb;
  v_table     uuid;
  v_next      jsonb;
  v_opts      uuid;
  v_word      text;
  v_spec      jsonb;
  v_was       text;
  v_now       text;
  v_behaviour boolean;
  v_compute_was text;
  v_compute_now text;
  v_parity    text;
  v_restamped integer := 0;
  -- IMPORT-2: THE CLOSED LIST OF WHAT THIS DOOR STORES. A key that is not here is refused by
  -- name; a key that is added to an arm below is added here in the same edit, which is the
  -- whole point — the list and the body cannot drift apart without the door going silent.
  c_settings constant text[] := array[
    'key', 'label', 'required', 'dated', 'sort', 'sensitivity', 'context_policy', 'unit',
    'rules', 'options', 'options_table_id', 'display', 'multi', 'promoted', 'unique',
    'depends_on', 'applies_to_types', 'expr', 'compute_on', 'relation_target', 'relation_max',
    'on_target_delete', 'source', 'source_config', 'review_interval_days',
    'parity_type', 'plain', 'type',
    -- GRID-PRIMITIVES G3 / G5: the formula a person types, and how the grid draws the column.
    'formula_text', 'display_format',
    -- STORE-RULE-GAPS (2): a choice list's "other values allowed" setting.
    'allow_other',
    -- CHOICE-COLUMN-EDIT: choices added to the ones a column already has (the cell's "Add").
    'options_add',
    -- DATA-V2-BASICS-2: what a new record this column is not named in starts with.
    'default',
    -- CHAIR-MATH (b), 2026-10-03: what a lookup or roll-up reads (via, pick, agg, of) and which
    -- linked records a roll-up adds up (filter). Before this they were refused here by name on a
    -- retype, and `filter` did not exist.
    'via', 'pick', 'agg', 'of', 'filter',
    -- LANE 10 P4: a status column's groups and a barcode column's symbology.
    'status_groups', 'symbology',
    -- LANE AT-FORMULA: a column's help text (config.description), shown when the header is hovered.
    'description',
    -- LANE 10 P4 round 3 (V11 #4): a rating's top star, as custom.field_declare takes it.
    'max',
    -- NOTION-PROPS-3: a button column's settings, and a link to its own table that says one record
    -- waits on another (a timeline draws it as a dependency).
    'button', 'dependency',
    -- NOTION-PROPS-3 (b): a one-record link to its own table nests the table's records as sub-items.
    'sub_items',
    -- ACCESS-SETUP §12.1 (Store Tables): the part of the Table this column belongs to (who sees and edits it).
    'part',
    -- W2-A 4: a Last changed time column limited to chosen fields (config.only_fields, the key formula_eval reads).
    'only_fields',
    -- CLOSE-LINK (CD-LINK-03): a link column's picker offers only the records of one saved view of the table it points at.
    'limit_to_view',
    -- CLOSE-LINK (CD-LINK-05): follow the linked record, or keep a copy of it from when it was linked.
    'binding'];
  v_unknown  text[];
  v_missing_keys text;  -- W2-A 4: only_fields keys this table does not have
  v_target_word text;   -- LANE 10 P4 round 3: the kind a change of behaviour names
  v_maxn     numeric;   -- LANE 10 P4 round 3: a rating's new top star
  v_parsed   jsonb;
  -- CHOICE-COLUMN-EDIT: the choices exactly as they were sent (words, or {id, words}).
  v_opt_entries jsonb;
  -- FX2 (2026-10-17): the choices this column had before this save; only the ones it gains are painted.
  v_opts_before uuid[] := '{}';
  v_painted     jsonb;
  v_view_table  uuid;      -- CLOSE-LINK: the table a limit_to_view view reads
  v_bind_now    text;      -- CLOSE-LINK (CD-LINK-05): the binding this call sets
  v_frozen      integer := 0;
  v_view_name   text;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.field_update');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_update');
  -- VISION-REACH W4 (a): the organization's "Agent changes" setting, enforced here (custom._agent_change_gate).
  perform custom._agent_change_gate(p_organization_id, null, 'custom.field_update', p_field_id);

  -- ── IMPORT-2: STORED OR REFUSED BY NAME, NEVER IGNORED. ─────────────────────────────────
  -- `custom.field_update(field, {"expr": …})` answered with the field id and changed nothing,
  -- because `expr` is read only inside the behaviour arm below. A door that accepts a word and
  -- drops it is the silent failure this store does not allow, and the remedy is a list rather
  -- than one more arm: whatever this body does not store, it says so about, by name.
  select array_agg(k order by k) into v_unknown
    from jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) k
   where k <> all (c_settings);
  if v_unknown is not null then
    raise exception 'A column has no setting called %.',
        (select string_agg(format('"%s"', u), ', ') from unnest(v_unknown) u)
      using errcode = '23514',
            hint = format('FLD-12: the settings this door changes are %s. Nothing was changed.',
                          (select string_agg(format('%s', s), ', ' order by s) from unnest(c_settings) s));
  end if;

  -- ── CHOICE-COLUMN-EDIT, 2026-09-27: A CHOICE IS KNOWN BY ITS ID, NOT ONLY BY ITS WORDS. ──
  -- The column editor sends each choice as {id, words}, so a re-worded choice is the SAME
  -- option with new words, not one retired and another made (which left every cell holding the
  -- retired one). Every reader below this line still reads plain words; the entries themselves
  -- are what custom._field_choices_save saves.
  if jsonb_typeof(p_patch -> 'options') = 'array' then
    v_opt_entries := p_patch -> 'options';
    p_patch := jsonb_set(p_patch, '{options}', custom._choice_words_array(p_patch -> 'options'));
  end if;
  if p_patch ? 'options_add' and jsonb_typeof(p_patch -> 'options_add') <> 'array' then
    raise exception 'Choices to add are sent as a list of words, and % is not one.', p_patch -> 'options_add'
      using errcode = '23514', hint = 'Send options_add as ["the words", …]. Nothing was changed.';
  end if;
  if p_patch ? 'options_add' and (p_patch ? 'type' or p_patch ? 'parity_type' or p_patch ? 'plain') then
    raise exception 'Adding choices and changing what a column stores are two saves, not one.'
      using errcode = '23514', hint = 'Change what it stores first, then add the choices. Nothing was changed.';
  end if;

  select r.data, (r.data ->> 'entity_definition_id')::uuid into v_old, v_table
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_field_id
     and r.table_id = custom.field_kernel_id()
     and r.deleted_at is null;
  v_opts_before := custom._choice_ids_live(p_organization_id, nullif(v_old -> 'config' ->> 'options_table_id', '')::uuid);
  if v_old is null then
    raise exception 'There is no such field in this organization, so nothing was changed.'
      using errcode = '23514', hint = 'REC-29: organizations are hard walls.';
  end if;
  if v_table is not null then
    perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.field_update',
                                            'admin'::public.permission_level, 'table');
  end if;

  -- ── GRID-PRIMITIVES G3, 2026-09-22: A TYPED FORMULA BECOMES THE EXPRESSION HERE. ─────────
  -- The person edits text; the store parses it against this Table's columns and the rest of
  -- this door stores the expression exactly as if it had been sent, so every refusal below
  -- ("not worked out by the store", FIX-10B-F5's column check) still applies to it.
  if p_patch ? 'formula_text' then
    if v_table is null then
      raise exception 'A typed formula reads the columns of a table, and this field belongs to none.'
        using errcode = '23514';
    end if;
    v_parsed := custom.formula_parse(p_organization_id, v_table, p_patch ->> 'formula_text');
    if not coalesce((v_parsed ->> 'ok')::boolean, false) then
      raise exception 'The formula for "%" cannot be worked out: % (at character %).',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'),
                      v_parsed ->> 'error', coalesce((v_parsed ->> 'position')::integer, 0) + 1
        using errcode = '23514',
              hint = 'GRID-PRIMITIVES G3: a formula names columns in braces, like {Visit fee} - {Deposit taken}; select signature, says from custom.formula_node_kinds() lists every function. Nothing was changed.';
    end if;
    p_patch := p_patch || jsonb_build_object('expr', v_parsed -> 'expr');
  end if;

  if nullif(p_patch ->> 'key', '') is not null and (p_patch ->> 'key') is distinct from (v_old ->> 'key') then
    raise exception 'A field''s key is how every saved value finds it, so it cannot be renamed.'
      using errcode = '23514', hint = 'The name a person reads is the label, and that can be changed freely.';
  end if;

  -- ── DATA-V2-BASICS, 2026-09-27: TWO COLUMNS OF ONE TABLE NEVER READ THE SAME. ──────────────
  -- BREAKER-1 F8: renaming "Notes" to "Patient Name" beside a real "Patient Name" was taken, the
  -- header row then read "Patient Name" twice over different data, and a 500-row paste matched its
  -- header to the wrong one and blanked a real column (F10). A person tells columns apart by their
  -- names, so a rename onto another column's name is refused, naming it.
  if p_patch ? 'label' and v_table is not null
     and lower(btrim(coalesce(p_patch ->> 'label', ''))) is distinct from lower(btrim(coalesce(v_old ->> 'label', '')))
     and exists (select 1 from custom.record r
                  where r.organization_id = p_organization_id
                    and r.table_id = custom.field_kernel_id()
                    and r.data_class = 'field'
                    and r.deleted_at is null
                    and r.id <> p_field_id
                    and r.data ->> 'entity_definition_id' = v_table::text
                    and lower(btrim(coalesce(r.data ->> 'label', ''))) = lower(btrim(coalesce(p_patch ->> 'label', '')))) then
    raise exception 'You already have a column called "%".', btrim(p_patch ->> 'label')
      using errcode = '23505',
            hint = 'Give this column another name, or rename the other one first. Nothing was changed.';
  end if;

  -- ── IS THIS A CHANGE OF BEHAVIOUR? T12. ───────────────────────────────────────────────
  -- Any of the three words a caller uses for it. The door used to refuse one of them and
  -- ignore the other two; it now carries all three out through the same function that shapes
  -- a field when it is created, so a column changed and a column created are the same shape.
  v_behaviour := coalesce(nullif(p_patch ->> 'parity_type', ''),
                          nullif(p_patch ->> 'plain', ''),
                          nullif(p_patch ->> 'type', '')) is not null;

  -- LANE 10 P4 round 3 (V11 #3): TWO CHANGES OF KIND A COLUMN CANNOT MAKE, said plainly. A Count is
  -- declared with the link column it counts, so a column cannot become one; and a column that fills
  -- itself in (Created by, Last changed by, a Count) cannot become another kind.
  if v_behaviour then
    v_target_word := lower(btrim(coalesce(nullif(p_patch ->> 'parity_type', ''), nullif(p_patch ->> 'plain', ''), p_patch ->> 'type')));
    if v_target_word in ('count', 'count_of_linked', 'link_count') and custom.field_kind_of(v_old) is distinct from 'count' then
      raise exception 'A column cannot become a Count. Add a Count column instead; it counts the records a link column points at.'
        using errcode = '23514', hint = 'P4: declare a column of type count with via naming the link column. Nothing was changed.';
    end if;
    if custom.field_kind_of(v_old) in ('created_by', 'modified_by', 'count')
       and v_target_word is distinct from custom.field_kind_of(v_old) then
      raise exception '"%" fills itself in, so it cannot become another kind of column. Add a new column instead.',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'P4: Created by, Last changed by and a Count are worked out by the store. Nothing was changed.';
    end if;
  end if;

  -- ACCESS-SETUP §12.1: a column's part is a setting of its own, never carried by a change of kind.
  if v_behaviour and p_patch ? 'part' then
    raise exception 'Change what "%" holds and who sees it in two steps.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
      using errcode = '23514', hint = 'ACCESS-SETUP: send part on its own patch. Nothing was changed.';
  end if;

  if v_behaviour then
    -- The spec is everything this field already is, with the patch written over it. The key
    -- and the table never move; `custom._field_document_for` decides the rest.
    v_spec := jsonb_strip_nulls(jsonb_build_object(
      'key',            v_old ->> 'key',
      'label',          coalesce(p_patch ->> 'label', v_old ->> 'label'),
      -- LANE 10 P4 round 3 (V11 #8): "several" and a unit are carried only to a kind that takes them,
      -- so a column changed to a rating or an address is never refused for what it used to be.
      'multi',          coalesce(p_patch -> 'multi',
                                 case when v_target_word in ('rating', 'stars', 'star_rating', 'duration', 'address', 'rich_text',
                                                             'status', 'created_by', 'modified_by', 'count', 'select', 'checkbox')
                                      then null else v_old -> 'multi' end),
      'dated',          coalesce(p_patch -> 'dated', v_old -> 'dated'),
      'required',       coalesce(p_patch -> 'required', v_old -> 'required'),
      'sort',           coalesce(p_patch -> 'sort', v_old -> 'sort'),
      'source',         coalesce(p_patch ->> 'source', v_old ->> 'source'),
      'source_config',  coalesce(p_patch -> 'source_config', v_old -> 'source_config'),
      'sensitivity',    coalesce(p_patch ->> 'sensitivity', v_old ->> 'sensitivity'),
      'context_policy', coalesce(p_patch ->> 'context_policy', v_old ->> 'context_policy'),
      'applies_to_types', coalesce(p_patch -> 'applies_to_types', v_old -> 'applies_to_types'),
      'depends_on',     coalesce(p_patch -> 'depends_on', v_old -> 'depends_on'),
      'unit',           coalesce(p_patch ->> 'unit',
                                 case when v_target_word in ('number', 'range', 'integer', 'decimal', 'float', 'currency')
                                      then v_old ->> 'unit' end),
      'max',            p_patch -> 'max',
      'expr',           coalesce(p_patch -> 'expr', v_old -> 'config' -> 'expr'),
      -- CHAIR-MATH (b), 2026-10-03: WHAT A LOOKUP OR ROLL-UP READS rides a change of kind too.
      -- This fixed key list never carried via / pick / agg / of, so a column retyped to a rollup
      -- through this door was refused by the guard as "has to say which relation it reads
      -- through" however the caller spelled it; and the new filter rides beside them.
      'via',            coalesce(nullif(p_patch ->> 'via', ''),  v_old -> 'config' ->> 'via'),
      'pick',           coalesce(nullif(p_patch ->> 'pick', ''), v_old -> 'config' ->> 'pick'),
      'agg',            coalesce(nullif(p_patch ->> 'agg', ''),  v_old -> 'config' ->> 'agg'),
      'of',             coalesce(nullif(p_patch ->> 'of', ''),   v_old -> 'config' ->> 'of'),
      'filter',         case when p_patch ? 'filter' then p_patch -> 'filter'
                             else v_old -> 'config' -> 'filter' end,
      -- TAILS-2, 2026-09-21: WHEN a worked-out column works itself out is part of what the
      -- column IS, and this builder's fixed key list did not carry it — so a caller who
      -- retyped a formula and said `compute_on` got `custom._field_document_for`'s default
      -- ('read') and no word about it. It is carried now; a rollup still gets 'read', and
      -- that is said out loud rather than swallowed (see the settings arm below).
      'compute_on',     coalesce(nullif(p_patch ->> 'compute_on', ''), v_old ->> 'compute_on'),
      'on_target_delete', coalesce(p_patch ->> 'on_target_delete', v_old ->> 'on_target_delete'),
      -- DATA-V2-BASICS-2 (BREAKER-2 B2-07): the table a relation points at rides the change of kind. A
      -- column made a Relation from its settings, naming its table, was refused "does not say which".
      'relation_target', coalesce(nullif(p_patch ->> 'relation_target', ''), v_old ->> 'relation_target'),
      'options_table_id', coalesce(p_patch ->> 'options_table_id', v_old -> 'config' ->> 'options_table_id'),
      'options',        p_patch -> 'options',
      'rules',          coalesce(p_patch -> 'rules', v_old -> 'rules'),
      -- DEFECTS A1: `unique: true` reaches the one field-document builder, which turns it into the unique rule.
      'unique',         p_patch -> 'unique',
      -- GRID-PRIMITIVES G3 / G5: carried like every other setting, so a retyped column keeps them.
      'formula_text',   case when p_patch ? 'formula_text' then p_patch -> 'formula_text'
                             when p_patch ? 'expr' then null
                             else v_old -> 'config' -> 'formula_text' end,
      'display_format', coalesce(p_patch -> 'display_format', v_old -> 'display_format'),
      -- LANE 10 P4: carried like every other setting, so a status keeps its groups and a barcode
      -- its symbology when the column is saved through its kind.
      'status_groups',  coalesce(p_patch -> 'status_groups', v_old -> 'config' -> 'status_groups'),
      'symbology',      coalesce(p_patch -> 'symbology', v_old -> 'config' -> 'symbology')));
    -- The patch's own word for the behaviour, whichever of the three it used.
    if nullif(p_patch ->> 'parity_type', '') is not null then
      v_spec := v_spec || jsonb_build_object('parity_type', p_patch ->> 'parity_type');
    elsif nullif(p_patch ->> 'plain', '') is not null then
      v_spec := v_spec || jsonb_build_object('plain', p_patch ->> 'plain');
    else
      v_spec := v_spec || jsonb_build_object('type', p_patch ->> 'type');
    end if;

    v_next := custom._field_document_for(p_organization_id, v_table, v_spec);
    -- The key and the table are this field's identity and _field_document_for takes them from
    -- the spec; written again here so a spec that lost one cannot silently move a field.
    v_next := v_next || jsonb_build_object('key', v_old ->> 'key');
    -- SEAT-SUITES: a column that was indexed stays indexed when it changes what it holds,
    -- unless the patch says otherwise. `custom._field_document_for` builds a fresh document
    -- and knows nothing about either setting, so without this a retype silently un-promoted
    -- the column and the index went on standing for a shape that no longer exists.
    if coalesce(p_patch -> 'promoted', v_old -> 'promoted') is not null then
      v_next := v_next || jsonb_build_object('promoted', coalesce(p_patch -> 'promoted', v_old -> 'promoted'));
    end if;
    if coalesce(p_patch -> 'unique', v_old -> 'unique') is not null then
      v_next := v_next || jsonb_build_object('unique', coalesce(p_patch -> 'unique', v_old -> 'unique'));
    end if;
    -- W1-STORE 4d: `unique: false` TAKES THE UNIQUE RULE OFF. It used to store the flag and keep the rule, so a column a
    -- person had made not-unique went on refusing duplicates. Callers read first: no database function passes `unique`
    -- to this door (promote_table adds the rule itself and never calls it; promote_field is not client-callable); the
    -- only sender is a person's settings change in the grid, so this is that and nothing else. A promoted column's
    -- already-built unique index is not touched here (it is the index's own change to make).
    if lower(coalesce(p_patch ->> 'unique', '')) in ('false', 'f', '0', 'no') then
      v_next := jsonb_set(v_next, '{rules}', coalesce((select jsonb_agg(x order by n)
                  from jsonb_array_elements(coalesce(v_next -> 'rules', '[]'::jsonb)) with ordinality e(x, n)
                 where x ->> 'kind' is distinct from 'unique'), '[]'::jsonb));
    end if;
    if v_table is not null then
      v_next := v_next || jsonb_build_object('entity_definition_id', v_table::text);
    end if;

    -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-05 / B2-15): A COLUMN THAT STOPS BEING A LIST.
    -- (1) Several choices turn off, and the values are kept as words ("Neck, Knee"): a Multi-choice
    --     column changed to Text kept `multi` and every value was refused as "holds many values",
    --     so it could never be made Text at all.
    -- (2) Its list goes with it, kept (`config.list_kept`): changing Visit Status to Text and back
    --     made a second "Visit Status choices" with only the words in use — the unused No-show and
    --     every color were gone. Changing it back to a choice column takes the same list again.
    if (v_old ->> 'type') = 'list' and (v_next ->> 'type') <> 'list' then
      if not (p_patch ? 'multi') and v_next ? 'multi' then
        v_next := jsonb_set(v_next, '{multi}', 'false'::jsonb);
      end if;
      if nullif(v_old -> 'config' ->> 'options_table_id', '') is not null then
        v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                    || jsonb_build_object('list_kept', v_old -> 'config' -> 'options_table_id'));
        -- (3) DATA-V2-BASICS-2 (2026-10-01, BREAKER-3/4 B3-15): its "take other values" setting is kept
        --     with it, so a strict column changed to Text and back is strict again, never silently open.
        if jsonb_typeof(v_old -> 'config' -> 'allow_other') = 'boolean' then
          v_next := jsonb_set(v_next, '{config}', (v_next -> 'config')
                      || jsonb_build_object('list_kept_allow_other', v_old -> 'config' -> 'allow_other'));
        end if;
      end if;
    elsif (v_next ->> 'type') <> 'list' and nullif(v_old -> 'config' ->> 'list_kept', '') is not null then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                  || jsonb_build_object('list_kept', v_old -> 'config' -> 'list_kept'));
      if jsonb_typeof(v_old -> 'config' -> 'list_kept_allow_other') = 'boolean' then
        v_next := jsonb_set(v_next, '{config}', (v_next -> 'config')
                    || jsonb_build_object('list_kept_allow_other', v_old -> 'config' -> 'list_kept_allow_other'));
      end if;
    end if;

    -- THE LIST KEPT COMES BACK (B2-15): a column that becomes a list again takes the list it had, when
    -- that list is still live, and adds any new words the caller sent to it.
    if (v_next ->> 'type') = 'list'
       and nullif(v_next -> 'config' ->> 'options_table_id', '') is null
       and nullif(v_old -> 'config' ->> 'list_kept', '') is not null
       and exists (select 1 from custom.record t
                    where t.organization_id = p_organization_id
                      and t.id = (v_old -> 'config' ->> 'list_kept')::uuid
                      and t.table_id = custom.table_kernel_id()
                      and t.deleted_at is null) then
      v_opts := (v_old -> 'config' ->> 'list_kept')::uuid;
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
      -- The kept "take other values" comes back with it, unless this change names it (B3-15).
      if not (p_patch ? 'allow_other') and jsonb_typeof(v_old -> 'config' -> 'list_kept_allow_other') = 'boolean' then
        v_next := jsonb_set(v_next, '{config}', (v_next -> 'config')
                    || jsonb_build_object('allow_other', v_old -> 'config' -> 'list_kept_allow_other'));
      end if;
      if jsonb_typeof(p_patch -> 'options') = 'array' and jsonb_array_length(p_patch -> 'options') > 0 then
        perform custom._field_choices_save(p_organization_id, v_opts, coalesce(v_opt_entries, p_patch -> 'options'), true);
      end if;
    end if;
    if (v_next ->> 'type') = 'list' and ((v_next -> 'config') ? 'list_kept' or (v_next -> 'config') ? 'list_kept_allow_other') then
      v_next := jsonb_set(v_next, '{config}', (v_next -> 'config') - 'list_kept' - 'list_kept_allow_other');
    end if;

    v_was := custom.field_behaviour(v_old);
    v_now := custom.field_behaviour(v_next);

    -- THE CHOICES. A column that becomes a list gets its Table of choices here, with the words
    -- the caller typed — or with none (lane CHOICE-COLUMN-EDIT, 2026-09-27: a choice column made
    -- with no choices yet stays a choice column with an empty list; it used to be refused, and the
    -- Sheet's Add column kept the column as plain text without a word). Its first choice is added
    -- from its settings, or from a cell (options_add, the enum nudge).
    if (v_next ->> 'type') = 'list'
       and nullif(v_next -> 'config' ->> 'options_table_id', '') is null then
      v_opts := custom._options_table_for(p_organization_id, v_next ->> 'label',
                                          case when jsonb_typeof(p_patch -> 'options') = 'array'
                                               then p_patch -> 'options' else '[]'::jsonb end);
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
    end if;

    -- STORE-RULE-GAPS (2): "other values allowed" is the list's own setting, so a retype that
    -- stays a list (one choice ↔ several) keeps it, and a patch that names it sets it. The
    -- shape guard refuses it on anything that is not a list, by name.
    if (v_next ->> 'type') = 'list' and p_patch ? 'allow_other' then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                          || jsonb_build_object('allow_other', p_patch -> 'allow_other'));
    elsif (v_next ->> 'type') = 'list' and (v_old -> 'config') ? 'allow_other' then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                          || jsonb_build_object('allow_other', v_old -> 'config' -> 'allow_other'));
    elsif p_patch ? 'allow_other' then
      raise exception 'Only a choice column can take values that are not one of its choices, and "%" will not be one.',
          coalesce(nullif(v_next ->> 'label', ''), v_next ->> 'key')
        using errcode = '23514', hint = 'FLD-5: allow_other belongs to a list field. Nothing was changed.';
    end if;

    -- ── RELATION-DECLARE, 2026-09-20: THE LINKS GO FIRST, THEN THE COLUMN CHANGES. ────
    -- Retyping a relation column to text left its edges LIVE in platform.associations, still
    -- naming a field that no longer behaves as a relation - and platform.relations_to then
    -- raised 23514 for EVERY record of the table it used to point at. One column took down
    -- the whole reverse side of another table. The links go in the same operation as the
    -- change that made them meaningless, softly, so REL-13's history keeps its record of them.
    if (v_old ->> 'type') = 'relation'
       and ((v_next ->> 'type') is distinct from 'relation'
            or (v_next ->> 'relation_target') is distinct from (v_old ->> 'relation_target')) then
      perform custom.relation_edges_withdraw(p_organization_id, array[p_field_id],
        case when (v_next ->> 'type') is distinct from 'relation'
             then format('"%s" no longer points at other records',
                         coalesce(v_next ->> 'label', v_next ->> 'key'))
             else format('"%s" now points at a different table',
                         coalesce(v_next ->> 'label', v_next ->> 'key')) end);
    end if;

    -- DATA-V2-BASICS-2 (2026-09-27): A COLUMN'S DEFAULT IS ONE OF ITS SETTINGS. `default` is what a
    -- new record this column is not named in starts with (custom.record_write fills it); null
    -- clears it. A column that changes what it holds keeps its default — a default that no longer
    -- fits is simply not filled, never a refusal.
    if p_patch ? 'default' then
      v_next := case when p_patch -> 'default' is null or jsonb_typeof(p_patch -> 'default') = 'null'
                     then v_next - 'default' else jsonb_set(v_next, '{default}', p_patch -> 'default') end;
    elsif v_old ? 'default' and not (v_next ? 'default') then
      -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-01): THE DEFAULT IS CARRIED LIKE THE VALUES. A default
      -- the column can no longer hold would make every new row fail, so it converts the way a cell does
      -- (custom._field_value_carry: a choice by its words, words to their choice) or it goes, said.
      if coalesce(jsonb_typeof(custom._field_value_carry(p_organization_id, v_old, v_next, v_old -> 'default')), 'null') <> 'null' then
        v_next := v_next || jsonb_build_object('default',
                    custom._field_value_carry(p_organization_id, v_old, v_next, v_old -> 'default'));
      else
        raise notice 'custom: "%" no longer has a default: % does not fit what it holds now.',
          coalesce(v_next ->> 'label', v_next ->> 'key'), coalesce((v_old -> 'default')::text, 'it');
      end if;
    end if;

    -- DATA-V2-BASICS-2 (2026-09-29): the default fits what the column holds now, or the save is refused.
    v_next := custom._field_default_fitted(p_organization_id, v_next);

    -- AND THE WRITE, which is what fires custom._field_type_converts_values: every value of
    -- this column is converted where it converts and kept in `_retired` with its reason where
    -- it does not, and the history.migration_log row is written by that same trigger. Nothing
    -- here duplicates any of it — this door's whole job was to let it happen.
    update custom.record
       set data = v_next, updated_at = now(), version = version + 1
     where organization_id = p_organization_id
       and id = p_field_id
       and table_id = custom.field_kernel_id();

    -- FX2: A COLUMN THAT BECAME A CHOICE COLUMN takes its words as choices in the write above (F2's
    -- `_field_type_converts_values` trigger), so they are painted here, once, and only when there is
    -- something to paint (measured: a text → Choice retype drew every choice grey).
    if coalesce(v_old ->> 'type', '') <> 'list' and (v_next ->> 'type') = 'list' then
      select r.data into v_painted
        from custom.record r
       where r.organization_id = p_organization_id and r.id = p_field_id and r.table_id = custom.field_kernel_id();
      if v_painted is not null then
        v_next := custom._choices_paint_new(p_organization_id, v_painted, v_opts_before);
        if v_next is distinct from v_painted then
          update custom.record
             set data = v_next, updated_at = now(), version = version + 1
           where organization_id = p_organization_id
             and id = p_field_id
             and table_id = custom.field_kernel_id();
        end if;
      end if;
    end if;
    if v_was is not distinct from v_now then
      raise notice 'custom: "%" still behaves as %; its other settings were saved.',
        coalesce(v_next ->> 'label', v_next ->> 'key'), coalesce(v_now, 'before');
    end if;
    return p_field_id;
  end if;

  -- ── OTHERWISE: THE SETTINGS, exactly as before. ───────────────────────────────────────
  v_next := v_old;
  -- ── ACCESS-SETUP §12.1 (Store Tables): WHICH PART OF THE TABLE THIS COLUMN BELONGS TO. ─────
  -- A table admin's choice, never an agent's (constraint d); the column that names each record and a
  -- worked-out column (as private as every column it reads) never carry one. Null or '' takes it back.
  if p_patch ? 'part' then
    if platform.declared_actor_tier() is not distinct from 'agent' then
      raise exception 'An agent never decides who sees a column. A table admin does that in "Who can see and edit".'
        using errcode = '42501', hint = 'ACCESS-SETUP §12 (d): no agent door writes a part. Nothing was changed.';
    end if;
    if auth.uid() is not null
       and custom.effective_level(auth.uid(), p_organization_id,
                                  nullif(v_old ->> 'entity_definition_id', '')::uuid, 'record') is distinct from 'admin' then
      raise exception 'Only a table admin decides who sees "%".', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '42501', hint = 'ACCESS-SETUP §12 (d): moving a column into a part needs Full access on its Table. Nothing was changed.';
    end if;
    if jsonb_typeof(p_patch -> 'part') = 'null' or btrim(coalesce(p_patch ->> 'part', '')) = '' then
      v_next := v_next - 'part';
    else
      if coalesce(v_old ->> 'type', '') = 'formula' then
        raise exception '"%" is worked out from other columns, so it is as private as what it reads and has no part of its own.',
            coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
          using errcode = '23514', hint = 'ACCESS-SETUP §12.1: move the columns it reads instead. Nothing was changed.';
      end if;
      if exists (select 1 from custom.record t
                  where t.id = nullif(v_old ->> 'entity_definition_id', '')::uuid
                    and t.table_id = custom.table_kernel_id()
                    and t.data ->> 'title_field' = v_old ->> 'key') then
        raise exception '"%" names each record, so everyone who can open a row sees it.',
            coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
          using errcode = '23514', hint = 'ACCESS-SETUP §12.1: pick another column to name each record first. Nothing was changed.';
      end if;
      if jsonb_typeof(p_patch -> 'part') <> 'string' or char_length(btrim(p_patch ->> 'part')) > 40 then
        raise exception 'A part is named in words, at most 40 characters (for example "Pay").'
          using errcode = '22023', hint = 'ACCESS-SETUP: send part as a short name, or null to take it back. Nothing was changed.';
      end if;
      v_next := jsonb_set(v_next, '{part}', to_jsonb(btrim(p_patch ->> 'part')));
    end if;
  end if;
  if p_patch ? 'label'          then v_next := jsonb_set(v_next, '{label}', to_jsonb(p_patch ->> 'label')); end if;
  if p_patch ? 'required'       then v_next := jsonb_set(v_next, '{required}', to_jsonb(coalesce((p_patch ->> 'required')::boolean, false))); end if;
  if p_patch ? 'dated'          then v_next := jsonb_set(v_next, '{dated}', to_jsonb(coalesce((p_patch ->> 'dated')::boolean, false))); end if;
  if p_patch ? 'sort'           then v_next := jsonb_set(v_next, '{sort}', to_jsonb(coalesce((p_patch ->> 'sort')::numeric, 100))); end if;
  if p_patch ? 'sensitivity'    then v_next := jsonb_set(v_next, '{sensitivity}', to_jsonb(p_patch ->> 'sensitivity')); end if;
  if p_patch ? 'context_policy' then v_next := jsonb_set(v_next, '{context_policy}', to_jsonb(p_patch ->> 'context_policy')); end if;
  if p_patch ? 'unit'           then v_next := jsonb_set(v_next, '{unit}', to_jsonb(p_patch ->> 'unit')); end if;
  if p_patch ? 'applies_to_types' then
    v_next := jsonb_set(v_next, '{applies_to_types}',
                        case when jsonb_typeof(p_patch -> 'applies_to_types') = 'array'
                             then p_patch -> 'applies_to_types' else '[]'::jsonb end);
  end if;
  if p_patch ? 'options_table_id' then
    v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(p_patch ->> 'options_table_id'));
  end if;
  -- LANE 10 P4: a status column's groups, and a barcode column's symbology, changed in place.
  -- custom._field_kind_shape_ok refuses either on a column that is not that kind, by name.
  if p_patch ? 'status_groups' then
    -- V8 #3: MERGED into the groups the column holds, never replacing them; the Field guard keys
    -- each name to its choice, refuses a name that is no choice, and drops removed choices.
    v_next := jsonb_set(v_next, '{config,status_groups}',
                coalesce(case when jsonb_typeof(v_old -> 'config' -> 'status_groups') = 'object'
                              then v_old -> 'config' -> 'status_groups' end, '{}'::jsonb)
                || custom.status_groups_of(p_patch -> 'status_groups'));
  end if;
  if p_patch ? 'symbology' then
    v_next := case when nullif(btrim(coalesce(p_patch ->> 'symbology', '')), '') is null
                   then v_next #- '{config,symbology}'
                   else jsonb_set(v_next, '{config,symbology}', to_jsonb(lower(btrim(p_patch ->> 'symbology')))) end;
  end if;

  -- NOTION-PROPS-3 (2026-10-08): A BUTTON'S SETTINGS, changed in place — its label, its color and what a
  -- press does ({label, color?, do?, url?, automation_id?, action_id?}). The object REPLACES config.button;
  -- custom._field_kind_shape_ok judges it as the document lands (a do that is none of the three, a link
  -- that is not one, an automation or action id that is not an id are refused there, by name).
  if p_patch ? 'button' then
    if custom.field_kind_of(v_old) is distinct from 'button' then
      raise exception '"%" is not a button, so it has no button settings.', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'NOTION-PROPS-3: send button only for a button column. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'button') is distinct from 'object' then
      raise exception 'A button''s settings are its label, its color and what a press does.'
        using errcode = '22023', hint = 'NOTION-PROPS-3: button = {"label": "…", "color": "…", "do": "open_url" | "run_automation" | "run_action", …}. Nothing was written.';
    end if;
    if (p_patch -> 'button') ? 'color' and (p_patch -> 'button' ->> 'color') is not null
       and (p_patch -> 'button' ->> 'color') !~ '^[a-z_]{1,24}$' then
      raise exception 'A button''s color is one of the table''s color names, and "%" is not one.', left(p_patch -> 'button' ->> 'color', 40)
        using errcode = '22023', hint = 'NOTION-PROPS-3: a color name like blue, green or red. Nothing was written.';
    end if;
    v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || jsonb_build_object('button',
                jsonb_strip_nulls((p_patch -> 'button') || jsonb_build_object('label',
                  coalesce(nullif(btrim(p_patch -> 'button' ->> 'label'), ''), v_next ->> 'label', v_old ->> 'label')))));
  end if;
  -- AIRTABLE PARITY (lane AT-FORMULA): A COLUMN'S HELP TEXT (config.description). Plain text of at most 300
  -- characters; empty or null takes it away. It rides config, so it survives a change of kind.
  if p_patch ? 'description' then
    if jsonb_typeof(p_patch -> 'description') not in ('string', 'null') then
      raise exception 'A column''s help text is words.' using errcode = '22023',
        hint = 'AT-FORMULA: description is text of at most 300 characters, or null to clear it. Nothing was written.';
    end if;
    if char_length(coalesce(p_patch ->> 'description', '')) > 300 then
      raise exception 'A column''s help text is at most 300 characters.' using errcode = '22023',
        hint = 'AT-FORMULA: shorten description. Nothing was written.';
    end if;
    v_next := case when nullif(btrim(coalesce(p_patch ->> 'description', '')), '') is null
                   then v_next #- '{config,description}'
                   else jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                                  || jsonb_build_object('description', btrim(p_patch ->> 'description'))) end;
  end if;
  -- W2-A 4 (AIRTABLE-PARITY row 89): A LAST CHANGED TIME COLUMN WATCHES ONLY THESE FIELDS (config.only_fields). A list of
  -- this table's own field keys; the column then answers the latest moment one of them was written (formula_eval reads
  -- the per-field stamps). Empty or null takes the limit away: the column follows the whole record again.
  if p_patch ? 'only_fields' then
    if coalesce(v_old -> 'config' ->> 'system', '') <> 'modified_time' then
      raise exception '"%" is not a last changed time column, so it watches no fields.', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'W2-A: send only_fields only for a last changed time column. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'only_fields') not in ('array', 'null')
       or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_patch -> 'only_fields') = 'array' then p_patch -> 'only_fields' else '[]'::jsonb end) e
                   where jsonb_typeof(e) <> 'string') then
      raise exception 'The fields a last changed time column watches are a list of column keys.' using errcode = '22023',
        hint = 'W2-A: only_fields = ["title", "status"], or null to watch the whole record. Nothing was written.';
    end if;
    select string_agg(k, ', ') into v_missing_keys
      from jsonb_array_elements_text(case when jsonb_typeof(p_patch -> 'only_fields') = 'array' then p_patch -> 'only_fields' else '[]'::jsonb end) k
     where not exists (select 1 from custom.record f
                        where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                          and (f.data ->> 'entity_definition_id') = (v_old ->> 'entity_definition_id') and (f.data ->> 'key') = k
                          and f.id <> p_field_id);
    if v_missing_keys is not null then
      raise exception 'This table has no other column called %.', v_missing_keys using errcode = '23514',
        hint = 'W2-A: only_fields names this table''s own column keys. Nothing was written.';
    end if;
    v_next := case when coalesce(jsonb_array_length(case when jsonb_typeof(p_patch -> 'only_fields') = 'array' then p_patch -> 'only_fields' end), 0) = 0
                   then v_next #- '{config,only_fields}'
                   else jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                                  || jsonb_build_object('only_fields', (select jsonb_agg(distinct k) from jsonb_array_elements_text(p_patch -> 'only_fields') k))) end;
  end if;
  -- NOTION-PROPS-3: A LINK TO ITS OWN TABLE MAY SAY ONE RECORD WAITS ON ANOTHER (config.dependency). A timeline
  -- draws each such link as a connector, and moving a record moves the records waiting on it.
  if p_patch ? 'dependency' then
    if coalesce(v_old ->> 'type', '') <> 'relation'
       or coalesce(v_old ->> 'relation_target', '') is distinct from coalesce(v_old ->> 'entity_definition_id', '-') then
      raise exception '"%" does not link a table to itself, so it cannot say one record waits on another.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'NOTION-PROPS-3: dependency is a setting of a link to its own table. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'dependency') not in ('boolean', 'null') then
      raise exception 'Whether a link is a dependency is yes or no.' using errcode = '22023',
        hint = 'NOTION-PROPS-3: dependency is true or false. Nothing was written.';
    end if;
    v_next := case when coalesce((p_patch ->> 'dependency')::boolean, false)
                   then jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || '{"dependency": true}'::jsonb)
                   else v_next #- '{config,dependency}' end;
  end if;

  -- NOTION-PROPS-3 (b): SUB-ITEMS ON AND OFF (config.sub_items). A one-record link to its own table names each
  -- record's parent; on, the table draws its records as a tree; off, the link stays a plain link and no value moves.
  -- CLOSE-LINK (CD-LINK-03): A LINK'S CHOICES LIMITED TO A VIEW (config.limit_to_view). Airtable's "Limit record
  -- selection to a view": the picker lists only the records that view shows. The view must be a saved view of the
  -- table this link points at; null takes the limit off. A link already holding a record outside the view keeps it.
  if p_patch ? 'limit_to_view' then
    if coalesce(v_old ->> 'type', '') <> 'relation' or nullif(v_old ->> 'relation_target', '') is null then
      raise exception '"%" does not point at one table, so its choices cannot be limited to a view.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'CD-LINK-03: limit_to_view is a setting of a link to a table. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'limit_to_view') = 'null' or coalesce(p_patch ->> 'limit_to_view', '') = '' then
      v_next := v_next #- '{config,limit_to_view}';
    else
      if (p_patch ->> 'limit_to_view') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'A link''s choices are limited to a saved view, named by its id.' using errcode = '22023',
          hint = 'CD-LINK-03: limit_to_view is the id of a view of the table the link points at, or null. Nothing was written.';
      end if;
      select nullif(sv.definition ->> 'table_id', '')::uuid, sv.name into v_view_table, v_view_name
        from platform.saved_view sv
       where sv.id = (p_patch ->> 'limit_to_view')::uuid
         and sv.organization_id = p_organization_id
         and sv.deleted_at is null
         and sv.surface_key = 'custom/records';
      if v_view_table is null then
        raise exception 'There is no saved view with that id in this organization.' using errcode = '23503',
          hint = 'CD-LINK-03: pick one of the views of the table the link points at. Nothing was written.';
      end if;
      if v_view_table <> (v_old ->> 'relation_target')::uuid then
        raise exception 'The view "%" belongs to another table, not the one "%" points at.',
          coalesce(v_view_name, 'that view'), coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
          using errcode = '23514', hint = 'CD-LINK-03: pick a view of the table this link points at. Nothing was written.';
      end if;
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                          || jsonb_build_object('limit_to_view', p_patch ->> 'limit_to_view'));
    end if;
  end if;

  -- CLOSE-LINK (CD-LINK-05): FOLLOW THE LINKED RECORD, OR KEEP A COPY FROM WHEN IT WAS LINKED (config.binding).
  -- VISION Rule 5: "binding: live (follows the target) or snapshot (freezes a copy at that moment)" - the invoice keeps
  -- the March address. Turning snapshot on takes a copy for every link already there (below, after the write).
  if p_patch ? 'binding' then
    if coalesce(v_old ->> 'type', '') <> 'relation' then
      raise exception '"%" is not a link, so there is nothing for it to follow or keep a copy of.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'CD-LINK-05: binding is a setting of a link column. Nothing was written.';
    end if;
    v_bind_now := lower(coalesce(nullif(p_patch ->> 'binding', ''), 'live'));
    if v_bind_now not in ('live', 'snapshot') then
      raise exception 'A link either follows the linked record (live) or keeps a copy of it from when it was linked (snapshot).'
        using errcode = '22023', hint = 'CD-LINK-05: binding is live or snapshot. Nothing was written.';
    end if;
    v_next := case when v_bind_now = 'snapshot'
                   then jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || '{"binding": "snapshot"}'::jsonb)
                   else v_next #- '{config,binding}' end;
  end if;

  if p_patch ? 'sub_items' then
    if coalesce(v_old ->> 'type', '') <> 'relation'
       or coalesce(v_old ->> 'relation_target', '') is distinct from coalesce(v_old ->> 'entity_definition_id', '-')
       or coalesce((v_old ->> 'multi')::boolean, false) then
      raise exception '"%" is not a one-record link to its own table, so it cannot nest sub-items.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'NOTION-PROPS-3: sub_items is a setting of a one-record link to its own table (its parent). Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'sub_items') not in ('boolean', 'null') then
      raise exception 'Whether a link nests sub-items is yes or no.' using errcode = '22023',
        hint = 'NOTION-PROPS-3: sub_items is true or false. Nothing was written.';
    end if;
    v_next := case when coalesce((p_patch ->> 'sub_items')::boolean, false)
                   then jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || '{"sub_items": true}'::jsonb)
                   else v_next #- '{config,sub_items}' end;
  end if;

  -- ── IMPORT-2: THE FORMULA ITSELF, CHANGEABLE WITHOUT RETYPING THE COLUMN. ────────────────
  -- This was the found instance: `expr` appeared exactly once in this body, inside the
  -- behaviour arm, so changing a formula without ALSO sending a type word reported success and
  -- left yesterday's expression in place. A person who edits the formula of a column that is
  -- already a formula is not retyping anything. The two cases that cannot be applied are
  -- refused by name, the way `compute_on` refuses them, rather than forced quietly; and a
  -- formula naming a column that does not exist is still refused as the document lands, by
  -- FIX-10B-F5's guard on `config.expr`.
  if p_patch ? 'expr' then
    if coalesce(v_old ->> 'type', '') <> 'formula' and coalesce(v_old ->> 'source', '') <> 'formula' then
      raise exception '"%" is not worked out by the store, so it has no formula to change.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-11: make it a worked-out column first - send type "formula" with the expr to this same door - and then the formula can be edited on its own. Nothing was changed.';
    end if;
    if jsonb_typeof(p_patch -> 'expr') is distinct from 'object' then
      raise exception 'A formula is an expression, and this one is a %.',
        coalesce(jsonb_typeof(p_patch -> 'expr'), 'nothing')
        using errcode = '23514',
              hint = 'FLD-11 / REC-15: expr is a Rule expression - the same shape and the same evaluator a Rule uses, e.g. {"op":"concat","args":[{"field":"<field id>"}]}. Nothing was changed.';
    end if;
    v_next := jsonb_set(v_next, '{config,expr}', p_patch -> 'expr');
  end if;

  -- ── FIX-7B-FIELD, 2026-09-20: THE SHAPE OF THE VALUE, WHICH IS A SETTING LIKE ANY OTHER. ──
  -- MEASURED on this database from the seat `authenticated`, before this migration: declare a
  -- relation column with `multi` false, call `custom.field_update(org, field, {"multi": true})`,
  -- read it back with `custom.read_record` — `multi=false, relation_max=1`. The door returned
  -- the field id, reported success and changed NOTHING. `multi` appeared exactly once in this
  -- body, inside the BEHAVIOUR arm above, which only runs when the patch also carries
  -- `parity_type`, `plain` or `type`. So the ONE control the roll-up panel's own refusal sends
  -- a person to — "Tick 'Can hold more than one' on Photos, or use Borrowed value to read its
  -- one value" — could not be reached by any door, from any client, at all. Same class as
  -- `promoted` / `unique` (SEAT-SUITES, 2026-09-19) and `source` / `review_interval_days`
  -- (ENRICH, 2026-09-20): a door that says yes and does nothing.
  --
  -- A LIST IS REFUSED BY NAME, NOT SILENTLY WRITTEN. For `select` and `multi_select`, "one
  -- answer or several" IS the behaviour — `custom._field_document_for` derives `multi` from the
  -- parity type and never from the caller — so writing `multi` on a list column here would put
  -- the document permanently at odds with its own `parity_type`, which is the silent failure
  -- again wearing the fix's clothes. The behaviour arm above already does this properly, and
  -- the refusal names the word to send it.
  if p_patch ? 'multi' then
    if (v_old ->> 'type') = 'list' then
      raise exception 'Whether "%" takes one answer or several IS what it holds, so it is changed by saying which kind it is.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-2: send parity_type "select" for one answer or "multi_select" for several; multi alone is not a setting on a list.';
    end if;
    v_next := jsonb_set(v_next, '{multi}', to_jsonb(coalesce((p_patch ->> 'multi')::boolean, false)));
  end if;
  -- CHAIR-MATH (b), 2026-10-03: WHICH LINKED RECORDS A ROLL-UP ADDS UP IS A SETTING LIKE ANY
  -- OTHER. `{"filter": {"status": "open"}}` on an existing roll-up lands in config.filter and is
  -- validated against the far table by custom._field_type_parity_guard on this very write;
  -- `{"filter": null}` takes it off. On anything that is not a roll-up it is refused by name.
  if p_patch ? 'filter' then
    if custom.parity_type(v_old) is distinct from 'rollup' then
      raise exception 'Only a column that adds up linked records can narrow which ones it adds up, and "%" is not one.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-11: make it a roll-up first (type "rollup" with via and agg), then send filter.';
    end if;
    if jsonb_typeof(p_patch -> 'filter') = 'null' then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) - 'filter');
    else
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                  || jsonb_build_object('filter', p_patch -> 'filter'));
    end if;
  end if;
  -- REC-51: A RELATION'S CARDINALITY LIVES IN TWO KEYS AND BOTH MUST MOVE. `custom.validate_values`
  -- counts the links against `relation_max` and `custom.relation_declaration` calls the column
  -- "one" while that number is 1 — so `multi` true beside `relation_max` 1 is a column that ticks
  -- the box on screen and still refuses the second record. `custom._field_document_for` derives
  -- the same pair the same way when a column is created (1, or 25 when it holds several); a cap a
  -- caller had already widened past 25 is kept rather than narrowed, and an explicit
  -- `relation_max` in the patch always wins.
  if (v_next ->> 'type') = 'relation' and (p_patch ? 'multi' or p_patch ? 'relation_max') then
    v_next := jsonb_set(v_next, '{relation_max}', to_jsonb(greatest(1, coalesce(
      nullif(p_patch ->> 'relation_max', '')::integer,
      case when coalesce((v_next ->> 'multi')::boolean, false)
           then greatest(coalesce((v_old ->> 'relation_max')::integer, 1), 25)
           else 1 end))));
  end if;
  -- ── ENRICH, 2026-09-20: THE THREE SETTINGS THAT MADE AGT-6 UNREACHABLE. ───────────────
  -- `source`, `source_config` and `review_interval_days` are keys the Field document has
  -- always carried and this door has never had an arm for. So `custom.field_update(field,
  -- {"source":"agent","review_interval_days":30})` returned the field id, reported success
  -- and changed NOTHING - and no person and no agent could declare an enrichment on an
  -- existing column through any door at all. That is the measured state behind AGT-6's own
  -- "zero readers and zero writers", and it is the same class as `promoted` / `unique`,
  -- which SEAT-SUITES closed on 2026-09-19.
  --
  -- A column a MODEL owns is not an ordinary setting, so the arm does not simply write the
  -- word: `source = 'agent'` is handed to custom.enrich_normalize, the ONE judge of an
  -- enrichment, exactly as custom.enrich_declare does. There is therefore no way into
  -- "a model fills this in" that skips the judging - not a door, not a script, not a lane.
  if p_patch ? 'review_interval_days' then
    if jsonb_typeof(p_patch -> 'review_interval_days') = 'null' then
      v_next := v_next - 'review_interval_days';
    else
      v_next := jsonb_set(v_next, '{review_interval_days}',
                          to_jsonb((p_patch ->> 'review_interval_days')::integer));
    end if;
  end if;
  if p_patch ? 'source' or p_patch ? 'source_config' then
    v_next := jsonb_set(v_next, '{source}',
                        to_jsonb(coalesce(nullif(p_patch ->> 'source', ''), v_next ->> 'source', 'manual')));
    v_next := jsonb_set(v_next, '{source_config}',
                        coalesce(p_patch -> 'source_config', v_next -> 'source_config', '{}'::jsonb));
    if (v_next ->> 'source') = 'agent' then
      v_next := jsonb_set(v_next, '{source_config}',
                  custom.enrich_normalize(p_organization_id, v_table, v_next ->> 'key',
                    coalesce(v_next -> 'source_config', '{}'::jsonb)
                    || jsonb_strip_nulls(jsonb_build_object('review_interval_days',
                         v_next -> 'review_interval_days'))));
      -- The two copies of freshness cannot disagree: the Field's own key is the one AGT-6
      -- names, and the judged config is what the runner reads, so the judge decides both.
      if (v_next -> 'source_config' -> 'review_interval_days') is not null then
        v_next := jsonb_set(v_next, '{review_interval_days}',
                            v_next -> 'source_config' -> 'review_interval_days');
      else
        v_next := v_next - 'review_interval_days';
      end if;
    end if;
  end if;
  -- SEAT-SUITES: THE TWO SETTINGS THIS DOOR ACCEPTED AND THREW AWAY. `custom.promote_field`
  -- reads `promoted` and `unique` off the Field document to decide whether to build an index
  -- and whether it is a unique one. Neither had an arm here, so `custom.field_update(field,
  -- {"promoted":true,"unique":true})` returned the field id, reported success and changed
  -- nothing — and no person could ever ask for an indexed or a unique column through any
  -- door. Measured from the seat `authenticated` on the main database, 2026-09-19:
  -- promote_field answered `"unique": false` after the door said yes. Same class as T12,
  -- which STORE-T closed for `plain` and `type`; these are the last two.
  if p_patch ? 'promoted'       then v_next := jsonb_set(v_next, '{promoted}', to_jsonb(coalesce((p_patch ->> 'promoted')::boolean, false))); end if;
  if p_patch ? 'unique'         then v_next := jsonb_set(v_next, '{unique}', to_jsonb(coalesce((p_patch ->> 'unique')::boolean, false))); end if;
  if p_patch ? 'rules'          then v_next := jsonb_set(v_next, '{rules}', coalesce(p_patch -> 'rules', '[]'::jsonb)); end if;
  -- DEFECTS A1: `unique: true` is the unique rule here too, exactly as custom._field_document_for makes it for every
  -- declaring door (once; a rule already there is not doubled). It used to store only the flag, and duplicates were taken.
  if lower(coalesce(p_patch ->> 'unique', '')) in ('true', 't', '1', 'yes')
     and not coalesce(v_next -> 'rules', '[]'::jsonb) @> '[{"kind": "unique"}]'::jsonb then
    v_next := jsonb_set(v_next, '{rules}', coalesce(v_next -> 'rules', '[]'::jsonb) || '[{"kind": "unique"}]'::jsonb);
  end if;
    -- W1-STORE 4d: `unique: false` TAKES THE UNIQUE RULE OFF. It used to store the flag and keep the rule, so a column a
    -- person had made not-unique went on refusing duplicates. Callers read first: no database function passes `unique`
    -- to this door (promote_table adds the rule itself and never calls it; promote_field is not client-callable); the
    -- only sender is a person's settings change in the grid, so this is that and nothing else. A promoted column's
    -- already-built unique index is not touched here (it is the index's own change to make).
    if lower(coalesce(p_patch ->> 'unique', '')) in ('false', 'f', '0', 'no') then
      v_next := jsonb_set(v_next, '{rules}', coalesce((select jsonb_agg(x order by n)
                  from jsonb_array_elements(coalesce(v_next -> 'rules', '[]'::jsonb)) with ordinality e(x, n)
                 where x ->> 'kind' is distinct from 'unique'), '[]'::jsonb));
    end if;
  -- STORE-RULE-GAPS (2): whether this choice list takes values that are not one of its
  -- choices. Stored on the list's own config; the shape guard judges the word and the type.
  if p_patch ? 'allow_other' then
    if (v_next ->> 'type') is distinct from 'list' then
      raise exception 'Only a choice column can take values that are not one of its choices, and "%" is not one.',
          coalesce(nullif(v_next ->> 'label', ''), v_next ->> 'key')
        using errcode = '23514', hint = 'FLD-5: allow_other belongs to a list field. Nothing was changed.';
    end if;
    v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                        || jsonb_build_object('allow_other', p_patch -> 'allow_other'));
  end if;
  -- ── lane RELATION-DISPLAY, 2026-09-21: WHICH OF THE OTHER RECORD''S COLUMNS THIS ONE
  --    SHOWS. The same judge the create door uses (custom._display_spec_for), so a spec
  --    cannot be looser here than it was there, and an explicit null REMOVES it - the
  --    column goes back to whatever the table it points at is titled by.
  if p_patch ? 'display' then
    if (v_next ->> 'type') is distinct from 'relation' then
      raise exception 'Only a column that points at other records can say which of their columns to show, and "%" does not point at any.',
          coalesce(nullif(v_next ->> 'label', ''), nullif(v_next ->> 'key', ''), 'this column')
        using errcode = '23514',
              hint = 'REL-DISP: retype it to a column that points at another table first, or leave display out. Nothing was changed.';
    end if;
    if jsonb_typeof(p_patch -> 'display') = 'null' then
      v_next := v_next - 'display';
    else
      v_next := jsonb_set(v_next, '{display}',
                  coalesce(custom._display_spec_for(p_organization_id,
                             nullif(v_next ->> 'relation_target', '')::uuid,
                             p_patch -> 'display'), 'null'::jsonb));
      if jsonb_typeof(v_next -> 'display') = 'null' then v_next := v_next - 'display'; end if;
    end if;
  end if;
  -- STORE-T / T7: the dependency list is a SETTING of a worked-out column, and a door that
  -- could not change it could not fix a formula that reads the wrong column either.
  if p_patch ? 'depends_on'     then v_next := jsonb_set(v_next, '{depends_on}',
                                       case when jsonb_typeof(p_patch -> 'depends_on') = 'array'
                                            then p_patch -> 'depends_on' else '[]'::jsonb end); end if;

  -- ── RED-SUITES-2, 2026-09-21: THE LAST TWO KEYS THIS DOOR WAS TOLD AND THREW AWAY. ──────
  -- MEASURED on the main database through `w1_rel_c12` REL-2 / T7, from the seat
  -- `authenticated`: `custom.field_update(org, field, {"on_target_delete":"restrict"})` returns
  -- the field id, reports success, and the column still says `set_null`. `on_target_delete` and
  -- `relation_target` are BOTH declared on the published contract — `FieldPatch` in
  -- `@ai-matrx/records` `src/field.ts`, where `relation_target` is documented as "re-point the
  -- column. The old edges are withdrawn by the door" — and BOTH are honoured only by the
  -- BEHAVIOUR arm above, which runs only when the same patch also carries `type` / `plain` /
  -- `parity_type`. A person changing only "what happens when the thing this points at is
  -- deleted" sends neither, so the settings arm ran and dropped the key.
  --
  -- This is the SAME CLASS this door has already been fixed for four times, each one written
  -- into the body above: `promoted` / `unique` (SEAT-SUITES), `multi` (FIX-7B-FIELD),
  -- `source` / `review_interval_days` (ENRICH), `compute_on` (TAILS-2). These are the last two
  -- keys of `FieldPatch` the settings arm did not carry. As in every one of those, THE ANSWER
  -- IS TO APPLY IT, and the cases that cannot be applied are refused BY NAME.
  if p_patch ? 'on_target_delete' then
    if (v_next ->> 'type') is distinct from 'relation' then
      raise exception '"%" does not point at other records, so there is nothing to decide when something it points at is deleted.',
        coalesce(v_next ->> 'label', v_next ->> 'key')
        using errcode = '22023',
              hint = 'on_target_delete belongs to a relation column. Change the column to point at a table first, or leave this out.';
    end if;
    if coalesce(p_patch ->> 'on_target_delete', '') not in ('restrict', 'set_null', 'cascade') then
      raise exception '"%" is not something that can happen when a linked record is deleted.',
        coalesce(p_patch ->> 'on_target_delete', '<nothing>')
        using errcode = '22023',
              hint = 'The three answers are: restrict (refuse the delete while this link exists), set_null (drop the link and keep this record), cascade (delete this record too).';
    end if;
    v_next := jsonb_set(v_next, '{on_target_delete}', to_jsonb(p_patch ->> 'on_target_delete'));
  end if;

  -- RE-POINTING THE COLUMN, with the edges withdrawn in the SAME operation — the rule the
  -- behaviour arm above states in full: "the links go in the same operation as the change that
  -- made them meaningless, softly, so REL-13's history keeps its record of them." Dropping this
  -- key silently was the worse half of that defect: it left the caller believing the column had
  -- been re-pointed while every edge still named the old table.
  if p_patch ? 'relation_target' then
    if (v_next ->> 'type') is distinct from 'relation' then
      raise exception '"%" does not point at other records, so it cannot be pointed at a different table.',
        coalesce(v_next ->> 'label', v_next ->> 'key')
        using errcode = '22023',
              hint = 'Change the column to a link first, and then choose the table it points at.';
    end if;
    if nullif(p_patch ->> 'relation_target', '') is null then
      raise exception '"%" has to point at some table — it cannot point at nothing.',
        coalesce(v_next ->> 'label', v_next ->> 'key')
        using errcode = '22023',
              hint = 'Name the table this column should point at, or change the column to a kind that holds its own value.';
    end if;
    -- "MAY I POINT AT IT" IS "MAY I SEE IT" — the same question custom.field_declare asks of a
    -- caller who names the target themselves (RELATION-DECLARE, 2026-09-20). Without it this
    -- arm would be a way to reach a table the caller may not see, by patching instead of
    -- declaring.
    perform custom.assert_may_know_table(p_organization_id,
              (p_patch ->> 'relation_target')::uuid, 'custom.field_update');
    if (p_patch ->> 'relation_target') is distinct from (v_next ->> 'relation_target') then
      perform custom.relation_edges_withdraw(p_organization_id, array[p_field_id],
        format('"%s" now points at a different table',
               coalesce(v_next ->> 'label', v_next ->> 'key')));
    end if;
    v_next := jsonb_set(v_next, '{relation_target}', to_jsonb(p_patch ->> 'relation_target'));
  end if;

  -- THE CHOICES, EDITED WHERE THEY LIVE (lane CHOICE-COLUMN-EDIT, 2026-09-27). The whole list,
  -- in its order: re-worded by id, added, brought back, reordered and — what the list no longer
  -- names — retired (archived, never deleted), in this one statement. The options table's own
  -- title field is written, so a moved column (a copy keyed `name`) is edited exactly like a
  -- native one; before this, the arm wrote `title` only and a moved column was refused upstream.
  if jsonb_typeof(p_patch -> 'options') = 'array' and (v_old ->> 'type') = 'list' then
    v_opts := nullif(v_old -> 'config' ->> 'options_table_id', '')::uuid;
    if v_opts is null then
      v_opts := custom._options_table_for(p_organization_id, v_next ->> 'label', p_patch -> 'options');
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
    else
      perform custom._field_choices_save(p_organization_id, v_opts, coalesce(v_opt_entries, p_patch -> 'options'), false);
    end if;
  end if;

  -- CHOICES ADDED, NOTHING ELSE TOUCHED: what a cell's "Add "<words>" to the choices" sends. A
  -- word that already names a live choice (any case) adds nothing; one that names a retired
  -- choice brings it back; the rest are added at the end.
  if jsonb_typeof(p_patch -> 'options_add') = 'array' then
    if coalesce(v_next ->> 'type', v_old ->> 'type') <> 'list' then
      raise exception '"%" is not a choice column, so it has no choices to add to.', coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514', hint = 'Make it a choice column first (its settings, Stores). Nothing was changed.';
    end if;
    v_opts := nullif(v_next -> 'config' ->> 'options_table_id', '')::uuid;
    if v_opts is null then
      v_opts := custom._options_table_for(p_organization_id, v_next ->> 'label',
                                          custom._choice_words_array(p_patch -> 'options_add'));
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
    else
      perform custom._field_choices_save(p_organization_id, v_opts, p_patch -> 'options_add', true);
    end if;
  end if;

  -- ── TAILS-2, 2026-09-21: WHEN IT WORKS ITSELF OUT, WHICH THIS DOOR WAS TOLD AND IGNORED. ──
  -- MEASURED (lane SHARE-OUT, 2026-09-20): the settings arm's key list has never carried
  -- `compute_on`, so `custom.field_update(org, field, {"compute_on":"write"})` returned the
  -- field id, reported success and left the column working itself out on every read forever.
  -- A door that is told something and answers yes without doing it is the silent failure this
  -- campaign exists to end — same class as `promoted`/`unique`, `multi`, `source`.
  --
  -- THE ANSWER IS TO APPLY IT, not to refuse it: `custom._derived_fields` already stamps a
  -- `write` formula into `_derived` on every save and `custom.derived_values_of` already works
  -- a `read` one out on every read. The only cases that CANNOT be applied are refused BY NAME,
  -- with the way to change them, because "it is not a formula" and "a rollup is always read"
  -- are answers a person can act on.
  if p_patch ? 'compute_on' then
    v_parity := custom.parity_type(v_old);
    v_compute_was := nullif(v_old ->> 'compute_on', '');
    v_compute_now := nullif(btrim(coalesce(p_patch ->> 'compute_on', '')), '');
    if v_compute_now is null or v_compute_now not in ('read', 'write') then
      raise exception 'A column either works its answer out when somebody reads it or when somebody saves it, and "%" is neither.',
        coalesce(p_patch ->> 'compute_on', 'nothing')
        using errcode = '23514', hint = 'FLD-9: send compute_on as "read" or as "write".';
    end if;
    if coalesce(v_old ->> 'type', '') <> 'formula' and coalesce(v_old ->> 'source', '') <> 'formula' then
      raise exception '"%" is not worked out by the store, so there is no moment for it to be worked out at.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-9: make it a worked-out column first — send type "formula" (with expr), "lookup" or "rollup" to this same door — and then say compute_on.';
    end if;
    if v_parity = 'rollup' and v_compute_now = 'write' then
      raise exception 'A roll-up adds up other records, so an answer stamped when "%" was last saved would be wrong the moment one of them changed. It is worked out when somebody reads it, always.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-11: to stamp a number at save time, make this column a formula over its own record''s columns (send type "formula" with an expr) — a roll-up cannot be one.';
    end if;
    v_next := jsonb_set(v_next, '{compute_on}', to_jsonb(v_compute_now));
  end if;

  -- ── GRID-PRIMITIVES G3 / G5, 2026-09-22. ────────────────────────────────────────────────
  -- The text beside the expression: kept when the person typed it, dropped when an expression
  -- was sent without it (the old text would no longer describe what is worked out). A system
  -- column's expression is its system node and is not replaced by a patch.
  if coalesce(v_next -> 'config' ->> 'system', '') <> '' and p_patch ? 'expr'
     and (p_patch -> 'expr' ->> 'op') is distinct from ('fx.' || (v_next -> 'config' ->> 'system')) then
    raise exception '"%" is filled in by the store (%), so it has no formula of its own to change.',
      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'), v_next -> 'config' ->> 'system'
      using errcode = '23514',
            hint = 'Make it a formula column first (send type "formula" with formula_text), then its formula can be edited. Nothing was changed.';
  end if;
  if p_patch ? 'formula_text' then
    v_next := jsonb_set(v_next, '{config,formula_text}', to_jsonb(p_patch ->> 'formula_text'));
  elsif p_patch ? 'expr' then
    v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) - 'formula_text');
  end if;
  if p_patch ? 'display_format' then
    v_next := custom._with_display_format(v_next, p_patch);
  end if;

  -- DATA-V2-BASICS-2 (2026-09-27): A COLUMN'S DEFAULT IS ONE OF ITS SETTINGS. `default` is what a
  -- new record this column is not named in starts with (custom.record_write fills it); null
  -- clears it. A column that changes what it holds keeps its default — a default that no longer
  -- fits is simply not filled, never a refusal.
  if p_patch ? 'default' then
    v_next := case when p_patch -> 'default' is null or jsonb_typeof(p_patch -> 'default') = 'null'
                   then v_next - 'default' else jsonb_set(v_next, '{default}', p_patch -> 'default') end;
  elsif v_old ? 'default' and not (v_next ? 'default') then
    v_next := v_next || jsonb_build_object('default', v_old -> 'default');
  end if;

  -- LANE 10 P4 round 3 (V11 #4): A RATING'S TOP STAR, CHANGED IN PLACE — the same word and the same
  -- refusals as custom.field_declare. It is the column's max Rule (min 0 beside it) and its stars;
  -- values above the new top are kept in `_retired` by custom._field_type_converts_values.
  if p_patch ? 'max' then
    if custom.field_kind_of(v_next) is distinct from 'rating' then
      raise exception 'A top star belongs to a rating, and "%" is not one.', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'P4: max is a rating''s setting. Nothing was changed.';
    end if;
    if coalesce(p_patch ->> 'max', '') !~ '^-?[0-9]+(\.[0-9]+)?$' then
      raise exception 'A rating goes up to a whole number of stars from 1 to 10, and "%" asks for "%", which is not a number.',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'), coalesce(p_patch ->> 'max', 'nothing')
        using errcode = '23514', hint = 'P4: send max as a number between 1 and 10. Nothing was changed.';
    end if;
    v_maxn := (p_patch ->> 'max')::numeric;
    if v_maxn <> trunc(v_maxn) or v_maxn < 1 or v_maxn > 10 then
      raise exception 'A rating goes up to a whole number of stars from 1 to 10, and "%" asks for %.',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'), v_maxn
        using errcode = '23514', hint = 'P4: send max between 1 and 10. Nothing was changed.';
    end if;
    v_next := jsonb_set(v_next, '{rules}',
                coalesce((select jsonb_agg(r) from jsonb_array_elements(coalesce(v_next -> 'rules', '[]'::jsonb)) r
                           where coalesce(r ->> 'kind', '') not in ('min', 'max')), '[]'::jsonb)
                || jsonb_build_array(jsonb_build_object('kind', 'min', 'value', 0), jsonb_build_object('kind', 'max', 'value', v_maxn)));
    if coalesce(v_next -> 'display_format' ->> 'id', 'rating') = 'rating' then
      v_next := jsonb_set(v_next, '{display_format}', jsonb_build_object('id', 'rating', 'options',
                  coalesce(v_next -> 'display_format' -> 'options', '{}'::jsonb) || jsonb_build_object('ratingMax', v_maxn)));
    end if;
  end if;

  -- DATA-V2-BASICS-2 (2026-09-29): the default fits what the column holds, or the save is refused.
  v_next := custom._field_default_fitted(p_organization_id, v_next);

  -- FX2 (records walk W3, 2026-10-17): A NEW CHOICE WEARS A COLOR. Every choice this save adds (the
  -- list's own words, "Add" from a cell, a list brought back) takes the next palette color the
  -- column does not wear yet; a choice that already has a look is never repainted.
  v_next := custom._choices_paint_new(p_organization_id, v_next, v_opts_before);

  update custom.record
     set data = v_next, updated_at = now(), version = version + 1
   where organization_id = p_organization_id
     and id = p_field_id
     and table_id = custom.field_kernel_id();


  -- CLOSE-LINK (CD-LINK-05): snapshot just turned on - every link already in this column takes its copy now.
  if v_bind_now = 'snapshot' and coalesce(v_old -> 'config' ->> 'binding', 'live') <> 'snapshot' then
    -- the edges are the store's own write on the person's (or agent's) behalf, named the way the edge writers name it
    if nullif(current_setting('app.actor_system', true), '') is null
       and coalesce(platform.declared_actor_tier(), platform.actor_tier()) in ('agent', 'system') then
      perform set_config('app.actor_system', 'custom.relations', true);
    end if;
    update platform.associations a
       set payload_kind = 'relation_snapshot',
           payload      = custom._relation_snapshot_copy(p_organization_id, a.target_id)
     where a.relation_field_id = p_field_id
       and a.deleted_at is null
       and a.organization_id = p_organization_id
       and a.source_type = 'record' and a.target_type = 'record'
       and a.payload is null;
    get diagnostics v_frozen = row_count;
    raise notice 'custom: "%" now keeps a copy of what each link points at; % link(s) took theirs now.',
      coalesce(v_next ->> 'label', v_next ->> 'key'), v_frozen;
  end if;

  -- ── AND THE ANSWERS THAT ARE ALREADY OUT THERE MOVE WITH IT. ────────────────────────────
  -- `_derived` is written by the save path and by nothing else, so a column switched to
  -- `write` would hold NO stamped answer on any record until each one happened to be saved
  -- again — a column that reads empty on every existing row and full on every new one, with
  -- nothing on the screen saying why. Switching the other way leaves a stale stamp behind
  -- that `custom.computed_provenance` would keep reporting as a fact about this column.
  -- Both are closed here, through the ordinary write path, so every guard and every history
  -- row sees the change exactly as it sees a save.
  if v_table is not null and v_compute_now is not null and v_compute_now is distinct from v_compute_was then
    if v_compute_now = 'write' then
      update custom.record r
         set updated_at = now()
       where r.organization_id = p_organization_id
         and r.table_id = v_table
         and r.deleted_at is null
         and r.data_class = 'record';
      get diagnostics v_restamped = row_count;
    else
      update custom.record r
         set data = jsonb_set(r.data, '{_derived}', (r.data -> '_derived') - (v_old ->> 'key')),
             updated_at = now()
       where r.organization_id = p_organization_id
         and r.table_id = v_table
         and r.deleted_at is null
         and r.data_class = 'record'
         and (r.data -> '_derived') ? (v_old ->> 'key');
      get diagnostics v_restamped = row_count;
    end if;
    raise notice 'custom: "%" is now worked out on %, and % record(s) were brought with it.',
      coalesce(v_next ->> 'label', v_next ->> 'key'), v_compute_now, v_restamped;
  end if;

  return p_field_id;
end;
$function$;

-- ── ONCE: the snapshot links that already exist take their copy (live census 2026-10-21: 1 link, lane CLOSE-LINK's own fixture).
select set_config('app.actor_system', 'migration closelink_c', true);
update platform.associations a
   set payload_kind = 'relation_snapshot',
       payload      = custom._relation_snapshot_copy(a.organization_id, a.target_id)
  from custom.record f
 where f.organization_id = a.organization_id and f.id = a.relation_field_id
   and f.deleted_at is null and f.data -> 'config' ->> 'binding' = 'snapshot'
   and a.deleted_at is null and a.payload is null
   and a.source_type = 'record' and a.target_type = 'record';

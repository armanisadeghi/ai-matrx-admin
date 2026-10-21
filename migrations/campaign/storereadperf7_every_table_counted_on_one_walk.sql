-- chair-step: it REPLACES the body of custom.table_row_counts(uuid, uuid[]) (same signature, return shape, volatility, SECURITY DEFINER, search_path, owner, grants and door row; no new function, table, index, policy, permission or knob). The inverse is migrations/inverse/storereadperf7_every_table_counted_on_one_walk_down.sql.
-- lane: STORE-READ-PERF-7
-- based-on: custom.table_row_counts(uuid, uuid[]) 9792641676fa4f7eb327c9a2fbf91afbbb6a5cc49e1edb8cd0c1f1a398201b19
--
-- STORE-READ-PERF-7 — EVERY TABLE A LIST COUNTS IS COUNTED ON ONE WALK.
--
-- THE PROBLEM (tracker 81993071-334d-4285-80d9-847e7df0fc75, 2026-10-21): `table list` for a platform
-- admin with many organizations (~183 Tables, a few thousand rows in all) timed out once on
-- custom.table_row_counts and answered on retry. The door counted one Table at a time: per Table the
-- wall (custom.assert_may_know_table, memoised per seat and Table), then
-- count(*) over custom.query_visible_ids(org, Table, 'viewer') — and each of those calls paid, for its
-- one Table, the "shown to" context, custom.visible_set, custom.read_door_carried_ids' containment walk
-- (the organization's edges, UP, the ladder per ancestor, DOWN) and its own four-branch row query. The
-- cost grows with the number of Tables, not with the number of rows. (The code side already turns a
-- timeout into row_count None: aidream 44a4f2409a.)
--
-- THE FIX (the STORE-READ-PERF-6 pair batch, which custom.query_visible_ids and
-- custom.read_door_carried_ids already carry; nothing in them changes): the door asks the wall for every
-- Table FIRST, exactly as before (same order, same refusal swallowed as an invented id), and then names
-- the (organization, Table) pairs that PASSED in the statement memo ('custom.qvi_pairs:<person>'). The
-- first custom.query_visible_ids call then works out every named pair in one pass (one containment walk,
-- one row query) and the rest read their answer; the counts are count(*) of exactly the ids the per-Table
-- call returns. Only Tables the wall admitted are ever named, so nothing is worked out for a Table she may
-- not know, and nothing changes in what is returned: a refused Table is still simply absent.
--   * The memo is read only while the transaction has written nothing, at viewer, for a non-kernel Table
--     (custom.query_visible_ids' own guard); in any other transaction every call takes the old per-Table
--     path verbatim — the same answers, which is what the green suite compares.
--   * A 'custom.qvi_pairs:<person>' list an outer door of the same statement had named is put back when
--     the counts are done (dropped when there was none), so a caller's own batch is never lost.
--   * No principal (the store owner / service lane): nothing is named; the per-Table path, as before.
-- Profile: NOT YET TAKEN — see the lane notes in the commit; the before/after numbers are to be recorded
-- on the dev clone (scripts/campaign-tests/storereadperf7_timing.sql) before this is applied live.

CREATE OR REPLACE FUNCTION custom.table_row_counts(p_organization_id uuid, p_table_ids uuid[])
 RETURNS TABLE(table_id uuid, visible_rows bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t     uuid;
  v_ok    uuid[] := '{}'::uuid[];
  -- STORE-READ-PERF-7
  v_me    uuid;
  v_key   text;
  v_prior text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_row_counts');
  if coalesce(cardinality(p_table_ids), 0) > 500 then
    raise exception 'One call counts at most 500 tables; this one named %.', cardinality(p_table_ids)
      using errcode = '54000', hint = 'Ask for the tables a screen shows, a page at a time. Nothing was counted.';
  end if;

  -- THE WALL FIRST, FOR EVERY TABLE, IN THE SAME ORDER AS BEFORE: only the Tables it admits are kept.
  for v_t in
    select distinct t.id
      from unnest(coalesce(p_table_ids, '{}'::uuid[])) as a(id)
      join custom.record t on t.organization_id = p_organization_id and t.id = a.id
     where t.table_id = custom.table_kernel_id() and t.data_class = 'table' and t.deleted_at is null
  loop
    begin
      perform custom.assert_may_know_table(p_organization_id, v_t, 'custom.table_row_counts');
    exception when insufficient_privilege then
      continue;   -- a Table this reader may not know is answered exactly like an invented id
    end;
    v_ok := v_ok || v_t;
  end loop;

  -- STORE-READ-PERF-7 (2026-10-21): THE ADMITTED PAIRS NAMED ONCE, so custom.query_visible_ids answers
  -- them all on one walk (its STORE-READ-PERF-6 pair batch). Only admitted Tables are named; an outer
  -- door's own list is put back afterwards.
  v_me := custom.query_principal();
  if v_me is not null and cardinality(v_ok) > 1 then
    v_key := 'custom.qvi_pairs:' || v_me::text;
    v_prior := platform.memo_k_get(v_key);
    perform platform.memo_k_put(v_key,
      (select string_agg(p_organization_id::text || ':' || x::text, ',' order by x) from unnest(v_ok) x));
  end if;

  foreach v_t in array v_ok loop
    table_id := v_t;
    select count(*) into visible_rows from custom.query_visible_ids(p_organization_id, v_t, 'viewer');
    return next;
  end loop;

  if v_key is not null then
    if v_prior is not null then
      perform platform.memo_k_put(v_key, v_prior);
    else
      perform platform.memo_k_drop(v_key);
    end if;
  end if;
end
$function$;

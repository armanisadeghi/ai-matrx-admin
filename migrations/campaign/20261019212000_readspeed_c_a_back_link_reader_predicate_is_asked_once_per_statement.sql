-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.relation_targets(uuid, uuid, text) 453884937d0aecec048a70e99f82290404457522875b7a3b5c2ae476e076693d
--
-- READ-SPEED c — THE READER'S PREDICATE ON A BACK-LINK'S LINKING TABLE IS ASKED ONCE PER STATEMENT.
--
-- WHY (measured live 2026-10-19, after READ-SPEED a and b). custom.relation_targets reads a back-link (a roll-up
-- of Gifts on Donors) as the linking records this reader may see, and built that "may see" predicate with
-- custom.visible_predicate_sql on EVERY call: once per row per roll-up — 86 custom.visible_set walks on one 14-row
-- Donors page (624 ms of it under load, and far more inside a transaction that has written: read_door_granted_ids
-- 2.6-4.1 s, carrying_edges_in 1.2-1.8 s).
--
-- THE FIX. The predicate depends on the reader, the organization and the linking Table only. It is kept in the
-- statement memo (platform.memo_k_*: seat + statement + backend + transaction + generation stamped), keyed by
-- reader, organization, linking Table and the "shown to" context custom.read_records_page may have handed
-- custom.visible_predicate_sql for that Table, so no other reader, statement or structure write ever sees it.
-- After: one Donors page 4.4 s -> 1.6 s on the same loaded database (visible_set 86 -> 4 calls). Proven identical
-- before shipping: the first page of all 45 computed tables installed in the test organization in the last 4 days,
-- read as the test admin before and after in one transaction — 45 tables, 0 differ, 0 errors.
-- Inverse: migrations/inverse/20261019212000_readspeed_c_a_back_link_reader_predicate_is_asked_once_per_statement_down.sql

CREATE OR REPLACE FUNCTION custom.relation_targets(p_organization_id uuid, p_record_id uuid, p_via_key text)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
declare
  v_table uuid;
  v_back  jsonb;
  v_me    uuid;
  v_pred  text;
  v_mk    text;   -- READ-SPEED c
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.relation_targets');
  -- LANE 12 P7: the links of the row a Confidential Table's reader rule is being worked out for
  -- (custom.confidential_answer marks it for that one evaluation): the rule reads them with no reader seat.
  if nullif(current_setting('mx.confidential_rule_row', true), '') is distinct from p_record_id::text then
    perform custom.assert_client_may_open(p_organization_id, p_record_id, 'custom.relation_targets', 'viewer'::public.permission_level, 'record');
  end if;
  -- CHAIR-UI-STORE (2026-10-03): A BACK-LINK IS READ BY ITS EDGES. A key this record does not
  -- carry may be one of its table's reverse columns (REL-9, virtual): then the linked records are
  -- the linking records whose relation edge points here — the same platform.associations rows
  -- custom.reverse_links_many reads — and only the ones this reader may see, as that door counts.
  if not exists (select 1 from custom.record r
                  where r.organization_id = p_organization_id and r.id = p_record_id
                    and r.data ? p_via_key) then
    select r.table_id into v_table from custom.record r
     where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
    v_back := custom._back_link_relation(p_organization_id, v_table, p_via_key);
    if v_back is not null then
      v_me := custom.query_principal();
      -- READ-SPEED c (2026-10-19): THE READER'S PREDICATE ON THE LINKING TABLE, ASKED ONCE PER STATEMENT. It depends
      -- on the reader, the organization and the linking Table only, so a page of rows each rolling up through the
      -- same back-link asked custom.visible_predicate_sql (and custom.visible_set under it) once per row per roll-up
      -- (86 calls on one 14-row page). Kept in the statement memo (seat + statement + transaction + generation).
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
      return query execute format($q$
        select distinct r.id
          from platform.associations a
          join custom.record r
            on r.organization_id = $1 and r.id = a.source_id and r.table_id = $3
           and r.data_class = 'record' and r.deleted_at is null
         where a.organization_id = $1
           and a.target_type = 'record' and a.target_id = $2
           and a.relation_field_id = $4
           and a.deleted_at is null
           and (%s)
      $q$, v_pred)
      using p_organization_id, p_record_id, (v_back ->> 'relation_target')::uuid, (v_back ->> 'back_link_of')::uuid;
      return;
    end if;
  end if;
  return query
-- DISTINCT is the whole of "no double counting": a record listed twice in the same
  -- relation is one related record, whatever the document says.
  select distinct (t #>> '{}')::uuid
    from custom.record r
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(r.data -> p_via_key) = 'array' then r.data -> p_via_key
           when r.data ? p_via_key and jsonb_typeof(r.data -> p_via_key) = 'string'
                then jsonb_build_array(r.data -> p_via_key)
           else '[]'::jsonb end) t
   where r.organization_id = p_organization_id
     and r.id = p_record_id
     and r.deleted_at is null
     and (t #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
end;
$function$

;

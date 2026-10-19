-- target: branch,production
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.relation_targets(uuid, uuid, text) b4c578668b2c3d94510632ad810c2e2bf0cdd565b068b57155addb32f111c842
-- Inverse of READ-SPEED c: custom.relation_targets building the reader predicate on every call.

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
      v_pred := case when v_me is null then 'true'
                     else custom.visible_predicate_sql(v_me, p_organization_id,
                            (v_back ->> 'relation_target')::uuid, 'viewer'::public.permission_level, 'r') end;
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

-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.record_value_one(uuid, uuid, text) 4f3da0c743a53f70feb237c35be6edf1edc7c79700dab7fce1dd7b38c0537775
--
-- READ-SPEED d — WHICH COLUMN A FAR KEY IS, LOOKED UP ONCE PER STATEMENT.
--
-- WHY (measured live 2026-10-19, after READ-SPEED a-c). A roll-up reads one column of every linked record through
-- custom.far_value -> custom.record_value_one, and each of those asked custom.applicable_fields for the far Table
-- again to learn whether the key is a read-time derived column: 87 calls (~1.7 ms each, a memo hit that still
-- parses the whole field list) on one 7-row Campaigns page.
--
-- THE FIX. The answer — that column's declaration, or none — depends on the organization, the Table, the record
-- type and the key. It is kept in the statement memo (platform.memo_k_*: seat + statement + backend + transaction
-- + generation stamped; any Field write runs platform.memo_clear). The first ask runs every check exactly as
-- before. Proven identical before shipping: the first page of all 45 computed tables installed in the test
-- organization in the last 4 days, read as the test admin before and after in one transaction — 0 differ, 0 errors.
-- Inverse: migrations/inverse/20261019213000_readspeed_d_a_far_column_is_looked_up_once_per_statement_down.sql

CREATE OR REPLACE FUNCTION custom.record_value_one(p_organization_id uuid, p_record_id uuid, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_rec   custom.record;
  v_plain jsonb;
  v_tf    text;
  v_rtype text;
  f       custom.record;
  v_mk    text;   -- READ-SPEED d
  v_fd    text;
begin
  -- EXACTLY `custom.record_values(org, record) -> key`, working out only that one column.
  -- The values a read-time formula is evaluated against are assembled the same way
  -- `custom.derived_values_of` assembles them (the document, the Rule layer's block, what was
  -- stamped at write time), so the one answer is the answer the whole-record read gives.
  select * into v_rec from custom.record
   where organization_id = p_organization_id and id = p_record_id;
  if v_rec.id is null or p_key is null then
    return null;
  end if;
  v_plain := (v_rec.data - '_computed' - '_retired' - '_values' - '_sources' - '_derived')
             || custom.computed_block(v_rec.data -> '_computed');
  if v_rec.table_id is null or v_rec.data_class in ('kernel', 'relation') then
    return v_plain -> p_key;
  end if;
  v_plain := v_plain || custom.computed_block(v_rec.data -> '_derived');

  v_tf := custom.table_type_field(v_rec.organization_id, v_rec.table_id);
  if v_tf is not null then
    v_rtype := v_rec.data ->> v_tf;
  end if;
  -- READ-SPEED d (2026-10-19): WHICH COLUMN THIS KEY IS, ASKED ONCE PER STATEMENT. A roll-up reads one column of
  -- every linked record, and each read asked custom.applicable_fields for the far Table again (87 calls, ~1.7 ms
  -- each, on one 7-row Campaigns page). The answer (the read-time derived column's declaration, or none) depends on
  -- the organization, the Table, the record type and the key; it is kept in the statement memo (seat + statement +
  -- transaction + generation stamped; any Field write clears it). The first ask runs every check as before.
  v_mk := 'custom.rvo_field:' || v_rec.organization_id::text || ':' || v_rec.table_id::text || ':'
          || coalesce(v_rtype, '') || ':' || p_key;
  v_fd := platform.memo_k_get(v_mk);
  if v_fd is null then
    select * into f
      from custom.applicable_fields(v_rec.organization_id, v_rec.table_id, v_rtype) a
     where a.data ->> 'key' = p_key
       and custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
       and coalesce(a.data ->> 'compute_on', '') = 'read'
     limit 1;
    v_fd := case when f.id is not null then f.data::text else '-' end;
    perform platform.memo_k_put(v_mk, v_fd);
  end if;
  if v_fd <> '-' then
    return custom.derived_value(v_rec.organization_id, v_rec.id, v_fd::jsonb, v_plain);
  end if;
  return v_plain -> p_key;
end;
$function$

;

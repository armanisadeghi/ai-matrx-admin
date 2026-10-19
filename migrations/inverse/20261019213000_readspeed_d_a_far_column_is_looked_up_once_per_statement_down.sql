-- target: branch,production
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.record_value_one(uuid, uuid, text) 85a7b22662215d7bfef725efc4ba874c2188338aa7e1a72c258b91a51ce59cb5
-- Inverse of READ-SPEED d: custom.record_value_one asking applicable_fields on every call.

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
  select * into f
    from custom.applicable_fields(v_rec.organization_id, v_rec.table_id, v_rtype) a
   where a.data ->> 'key' = p_key
     and custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
     and coalesce(a.data ->> 'compute_on', '') = 'read'
   limit 1;
  if f.id is not null then
    return custom.derived_value(v_rec.organization_id, v_rec.id, f.data, v_plain);
  end if;
  return v_plain -> p_key;
end;
$function$

;

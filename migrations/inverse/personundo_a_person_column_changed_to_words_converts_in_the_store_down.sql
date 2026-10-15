-- INVERSE of migrations/campaign/personundo_a_person_column_changed_to_words_converts_in_the_store.sql: the body it replaced, byte for byte.
-- chair-step: restores custom._field_value_carry to the body before PERSON-UNDO (ids no longer convert to a person's words in the store)
-- based-on: custom._field_value_carry(uuid, jsonb, jsonb, jsonb) 43f2523ce68a96a1e7151149bd7387a0134bf580a8389ab616a0a864d63f82b9

CREATE OR REPLACE FUNCTION custom._field_value_carry(p_organization_id uuid, p_from jsonb, p_to jsonb, p_value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
-- ONE VALUE, CARRIED FROM WHAT A COLUMN WAS TO WHAT IT IS NOW (DATA-V2-BASICS-2). The carry by
-- behaviour is custom._field_value_carry_base, unchanged; LANE 10 P4 fits its answer to the newer
-- kinds (custom._kind_value_fit). V11 #1: and every value landing in words, numbers or a tick is
-- then judged WHOLE by the column it lands in — its format and every Rule (a Link's pattern, an
-- Email's, a Phone's, a Percentage's 0..100) — so no change of kind leaves a value in place that the
-- column refuses. SQL null means "does not fit": the caller keeps it in `_retired` with its reason.
declare
  v jsonb;
begin
  v := custom._kind_value_fit(p_to, p_value, custom._field_value_carry_base(p_organization_id, p_from, p_to, p_value));
  if v is not null and jsonb_typeof(v) <> 'null'
     and coalesce(p_to ->> 'type', '') in ('text', 'range', 'boolean')
     and not custom._value_fits_field(p_organization_id, null, p_to, v) then
    return null;
  end if;
  return v;
end;
$function$;

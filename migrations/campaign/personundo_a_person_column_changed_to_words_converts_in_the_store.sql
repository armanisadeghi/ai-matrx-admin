-- additive: yes
-- based-on: custom._field_value_carry(uuid, jsonb, jsonb, jsonb) ee7328cc5ddd9664c137fb48994f0b2848cbf7ae57ee5fcb6c246918fa605098
--
-- PERSON-UNDO (2026-10-15) — A PERSON COLUMN CHANGED TO WORDS CONVERTS IN THE STORE, NOT BY HAND.
-- MEASURED (admin@admin.com, three people in a Person column): Person -> Email through the retype
-- door set EVERY person's id aside in `_retired` (an id is not an email), and the screen then wrote
-- the emails over the cell, leaving the old id kept aside beside the converted value. Person -> Text
-- kept the id as the text. Now the conversion carries a Person row id into the person's words: their
-- email when the column becomes an Email column, their name when it becomes Text. A person with no
-- email (or no name) does not convert and is kept aside exactly as before. Every other change is
-- untouched (the old body runs for everything else).
-- Guard: scripts/campaign-tests/personundo_a_person_column_changed_to_words_converts_in_the_store.sql
-- Inverse: migrations/inverse/personundo_a_person_column_changed_to_words_converts_in_the_store_down.sql

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
-- PERSON-UNDO: a Person row id leaving a Person column for words becomes the person's email (an Email
-- column) or name (Text) first; nobody's id is ever left as the words of a column.
declare
  v        jsonb;
  v_val    jsonb := p_value;
  v_email  boolean := coalesce(p_to ->> 'format', '') = 'email';
  v_one    jsonb;
  v_word   text;
  v_out    jsonb;
begin
  if coalesce(p_from ->> 'type', '') = 'relation'
     and p_from ->> 'relation_target' = custom.person_kernel_id()::text
     and coalesce(p_to ->> 'type', '') = 'text'
     and p_value is not null and jsonb_typeof(p_value) in ('string', 'array') then
    v_out := case when jsonb_typeof(p_value) = 'array' then '[]'::jsonb end;
    for v_one in select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else jsonb_build_array(p_value) end) e loop
      v_word := null;
      if jsonb_typeof(v_one) = 'string' and (v_one #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select nullif(btrim(case when v_email then x.data ->> 'email' else x.data ->> 'full_name' end), '')
          into v_word
          from custom.record x
         where x.organization_id = p_organization_id
           and x.id = (v_one #>> '{}')::uuid
           and x.table_id = custom.person_kernel_id();
      end if;
      if v_word is null then
        return null;                    -- a person with no such words does not convert: the caller keeps the id aside
      end if;
      v_out := case when v_out is null then to_jsonb(v_word) else v_out || jsonb_build_array(v_word) end;
    end loop;
    if v_out is not null then
      v_val := v_out;
    end if;
  end if;
  v := custom._kind_value_fit(p_to, v_val, custom._field_value_carry_base(p_organization_id, p_from, p_to, v_val));
  if v is not null and jsonb_typeof(v) <> 'null'
     and coalesce(p_to ->> 'type', '') in ('text', 'range', 'boolean')
     and not custom._value_fits_field(p_organization_id, null, p_to, v) then
    return null;
  end if;
  return v;
end;
$function$;

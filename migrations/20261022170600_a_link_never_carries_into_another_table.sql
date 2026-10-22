-- Lane A2 (2026-10-22, Notion import no-loss), second half of 20261022170500: custom._field_value_carry (REPLACED by
-- body) answers "does not fit" for a link value moving to a link column that points at a different table, so the
-- type-change trigger sets it aside instead of carrying it (and never brings a set-aside one back). Without it,
-- re-pointing a column that held links was refused at commit: "<col> can only point at records of <new table>".
-- Test: aidream packages/matrx-records/tests/test_a_repointed_link_column_sets_its_old_links_aside.py.
-- based-on: custom._field_value_carry(uuid, jsonb, jsonb, jsonb) 43f2523ce68a96a1e7151149bd7387a0134bf580a8389ab616a0a864d63f82b9

set lock_timeout = '3s';
set statement_timeout = '120s';

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
  -- LANE A2 (2026-10-22): A LINK NEVER CARRIES INTO ANOTHER TABLE. A link column re-pointed at a different
  -- table has its links withdrawn by custom.field_update; the ids its rows held name the OLD table's records,
  -- so they do not fit (SQL null: the caller keeps them in `_retired`). Before, they carried as they were —
  -- custom._field_type_converts_values left them in place and even brought back ones already set aside, and
  -- REL-11 / REL-8 refused the re-point at commit.
  if coalesce(p_from ->> 'type', '') = 'relation' and coalesce(p_to ->> 'type', '') = 'relation'
     and coalesce(p_from ->> 'relation_target', '') is distinct from coalesce(p_to ->> 'relation_target', '') then
    return null;
  end if;
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

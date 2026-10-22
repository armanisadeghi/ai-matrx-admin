-- additive: yes
-- based-on: custom.applicable_fields(uuid, uuid, text) 9da8e565e82de57bf699362c01f65c360b19138437636ee3e639994c1b36a783
--
-- CLOSE-CORE CD-CORE-15 (acceptance test 8, "Type field"): a table whose Kind decides its columns showed
-- none of the type-only columns anywhere on its own screens. custom.applicable_fields answers "which columns
-- does a record of THIS type have"; asked with no type it answers only the columns every record has, so the
-- grid, Column settings and the filter pickers never listed Radius, Width or Height and nobody could set
-- them. p_record_type '*' now answers every column of the table. Nothing else changes: no type still means
-- the shared columns, a type still means that type's columns. Inverse beside this file.

CREATE OR REPLACE FUNCTION custom.applicable_fields(p_organization_id uuid, p_table_id uuid, p_record_type text DEFAULT NULL::text)
 RETURNS SETOF custom.record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_types text[];
  v_key   text;
  v_json  jsonb;
  v_hit   text;
  v_e     jsonb;      -- BUTTON-STAMPS: one field row while its derived look is worked out
  v_look  jsonb;
  v_out   jsonb := '[]'::jsonb;
begin
  -- The decision comes BEFORE the read, so a foreign organization id and an invented one
  -- answer identically: both are refused, neither is told whether the table exists.
  --
  -- INSTALL-SPEED-2: each of the three doors opens with its own memo check and returns at once on
  -- a yes already given in this statement to this seat. When all three yeses are there, asking
  -- the three functions only to have each return on its first line costs three calls per ask
  -- (four asks per row written); so read the same three slots here and call the doors otherwise.
  -- KEEP IN STEP: these are the first lines of custom.assert_store_door ('w:d:'),
  -- custom.assert_client_may_reach ('w:r:') and custom.assert_may_know_table ('w:k:').
  if platform.memo_k_get('w:d:' || coalesce(p_organization_id::text, '-')) = '1'
     and platform.memo_k_get('w:r:' || coalesce(p_organization_id::text, '-')) = '1'
     and platform.memo_k_get('w:k:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_table_id::text, '-')) = '1' then
    null;
  else
    perform custom.assert_store_door(p_organization_id, 'custom.applicable_fields');
    perform custom.assert_client_may_reach(p_organization_id, 'custom.applicable_fields');
    perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.applicable_fields');
  end if;

  -- THE SAME TABLE, ALREADY READ IN THIS TRANSACTION. The three lines above ran first, so this
  -- is a shortcut through the READ and never through the DECISION.
  --
  -- WRITE-PERF-4: its own slot, not a corner of a 37 KB blob. Measured on the main database,
  -- a 17-field table: 427 us a call out of the shared blob, 254 us out of its own key. The
  -- value is `jsonb_strip_nulls`ed before it is stored — `jsonb_populate_recordset` reads an
  -- absent key and a null key identically, and a `custom.record` row is mostly nulls, so this
  -- is the same 17 rows out of a much smaller text.
  -- CONF-STRUCTURE: a person who may know a Confidential table but cannot read any of its rows
  -- is told its name and nothing about its columns (feature knob access/confidential_hides_structure).
  if not custom.may_see_table_structure(p_organization_id, p_table_id) then
    return;
  end if;

  v_key := 'af:' || coalesce(p_organization_id::text, '-') || ':' ||
                    coalesce(p_table_id::text, '-') || ':' || coalesce(p_record_type, '');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    -- DEFECT-46: EXECUTE, never a cached plan. A cached `select * from jsonb_populate_recordset(null::custom.record, ...)`
    -- expands `*` once per session and records no dependency on the table, so after `custom.record` gains a column every
    -- live session returns the OLD width and the call fails 'structure of query does not match function result type'
    -- (2026-10-18: test_run_id/test_expires_at, 19 vs 21). EXECUTE plans per call against the current width (~0.04 ms).
    return query execute 'select * from pg_catalog.jsonb_populate_recordset(null::custom.record, $1)' using v_hit::jsonb;
    return;
  end if;

  -- T8. The record's type value is the option's KEY; whoever declared "Radius applies to a
  -- Circle" may have written the word, the key or the option's id. All of them name the same
  -- choice, so the question is asked with all of them. This is the clause the seventh pass
  -- failed: "asking what columns THIS record has answers without Radius".
  v_types := case when p_record_type is null or p_record_type = '*' then '{}'::text[]
                  else custom.choice_synonyms(p_organization_id, p_table_id, p_record_type) end;

  select coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(q))), '[]'::jsonb) into v_json from (
    select f.*
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id
       and (jsonb_array_length(coalesce(f.data -> 'applies_to_types', '[]'::jsonb)) = 0
            -- CLOSE-CORE CD-CORE-15: '*' asks for EVERY field of the table, whichever types it applies to — the
            -- table's own screens (the grid's columns, Column settings, filters) list Radius and Width side by side;
            -- one record's form still asks with that record's type.
            or p_record_type = '*'
            or (p_record_type is not null
                and coalesce(f.data -> 'applies_to_types', '[]'::jsonb) ?| v_types))) q;

  -- BUTTON-STAMPS: A ROLLUP OR LOOKUP WITH NO LOOK OF ITS OWN READS IN THE NUMBER FORMAT OF THE COLUMN IT READS — derived
  -- here, every time the fields are asked for, never copied onto the field: change the source column's format and every
  -- rollup / lookup that reads it follows. A look somebody chose (display_format on the field) is the override.
  for v_e in select x from jsonb_array_elements(v_json) x loop
    if v_e -> 'data' ->> 'type' = 'formula' and v_e -> 'data' ->> 'compute_on' = 'read'
       and not (v_e -> 'data' ? 'display_format')
       and ((v_e -> 'data' -> 'config' ->> 'agg') in ('sum', 'min', 'max', 'avg')
            or ((v_e -> 'data' -> 'config' ->> 'pick') is not null and (v_e -> 'data' -> 'config' ->> 'agg') is null)) then
      v_look := custom._picked_look(p_organization_id, p_table_id, v_e -> 'data' -> 'config' ->> 'via',
                  coalesce(nullif(v_e -> 'data' -> 'config' ->> 'pick', ''), v_e -> 'data' -> 'config' ->> 'of'));
      if v_look is not null then
        v_e := jsonb_set(v_e, '{data,display_format}', v_look);
      end if;
    end if;
    v_out := v_out || jsonb_build_array(v_e);
  end loop;
  v_json := v_out;

  perform platform.memo_k_put(v_key, v_json::text);
  -- DEFECT-46: see the memo branch above — EXECUTE so the row width is read at call time, never from a stale session plan.
  return query execute 'select * from pg_catalog.jsonb_populate_recordset(null::custom.record, $1)' using v_json;
end $function$;

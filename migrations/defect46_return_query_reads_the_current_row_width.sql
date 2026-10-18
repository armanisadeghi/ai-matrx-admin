-- based-on: custom.applicable_fields(uuid, uuid, text) 1437e03099d9ec6b980240ff3b3db9452702c48ab71ec75f1607dce5029700c8
-- based-on: public.dict_upsert_entries_for(uuid, text, uuid, jsonb) 1fe81ea09f5665c788a2e0fdcb309a0c1e4d9466d6bfba05d4c07d30b41415a4
-- based-on: public.get_feedback_comments(uuid) 3b1c100de833d01e23c2cfbe5f2e54211fbcf57f6d8b187ce5bbc5e10e2fc299
-- based-on: public.get_user_messages(uuid) 8d56372eb0569a2b7f43b72f9f95b558330622d996bc54fa72d451a80ffcf2c4
-- DEFECT-46 (2026-10-18): a RETURN QUERY whose column list comes from a TYPE, not a table read, goes stale when the table grows.
--
-- What broke: test-data L2 added test_run_id + test_expires_at to ~550 tables (no ledger row; db-work-now 2026-10-17).
-- Postgres re-plans a cached statement when a TABLE it reads changes, but NOT when only a row TYPE it expands changes.
-- So in every session that had already run these functions, `select * from jsonb_populate_recordset(null::custom.record, …)`
-- and `select * from public.dict_list_entries_for(…)` kept expanding to the OLD width, while the caller expected the new one:
-- "Number of returned columns (19) does not match expected column count (21)" (context active_selection, every `table`
-- search through custom.read_record). Fresh sessions were fine, so it healed only as pooled sessions recycled.
-- The fix: RETURN QUERY EXECUTE in exactly the statements of that shape (census: every set-returning plpgsql function
-- returning a table's row type, 2026-10-18 — these four functions; the two feedback readers return tables not altered
-- today, so they had not failed yet). Bodies are otherwise byte-identical to live;
-- CREATE OR REPLACE keeps owner, grants and the client_callable_door row. Guard: pnpm check:return-query-shapes.

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
  v_types := case when p_record_type is null then '{}'::text[]
                  else custom.choice_synonyms(p_organization_id, p_table_id, p_record_type) end;

  select coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(q))), '[]'::jsonb) into v_json from (
    select f.*
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id
       and (jsonb_array_length(coalesce(f.data -> 'applies_to_types', '[]'::jsonb)) = 0
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

CREATE OR REPLACE FUNCTION public.dict_upsert_entries_for(p_user_id uuid, p_level text, p_owner_id uuid, p_entries jsonb)
 RETURNS SETOF dictionary.dict_entries
 LANGUAGE plpgsql
AS $function$
DECLARE rec jsonb;
DECLARE v_sounds_like_type text;
BEGIN
    PERFORM public.dict_assert_access(p_user_id, p_level, p_owner_id);
    IF jsonb_typeof(p_entries) <> 'array' THEN
        RAISE EXCEPTION 'dict_upsert_entries: p_entries must be a JSON array' USING ERRCODE = '22023';
    END IF;

    FOR rec IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
        IF coalesce(btrim(rec->>'term'), '') = '' THEN
            CONTINUE;  -- skip blank terms defensively
        END IF;

        IF rec ? 'sounds_like' AND rec->'sounds_like' IS NOT NULL AND jsonb_typeof(rec->'sounds_like') <> 'null' THEN
            v_sounds_like_type := jsonb_typeof(rec->'sounds_like');
            IF v_sounds_like_type NOT IN ('array', 'string') THEN
                RAISE EXCEPTION 'dict_upsert_entries: sounds_like for term "%" must be a string or an array of strings, got %',
                    rec->>'term', v_sounds_like_type USING ERRCODE = '22023';
            END IF;
        END IF;

        INSERT INTO dictionary.dict_entries
            (id, user_id, organization_id, scope_type_id, scope_id,
             term, sounds_like, pronunciation, ipa, definition, category, is_active, created_by)
        VALUES (
            coalesce((rec->>'id')::uuid, gen_random_uuid()),
            CASE WHEN p_level = 'user'         THEN p_owner_id END,
            CASE WHEN p_level = 'organization' THEN p_owner_id END,
            CASE WHEN p_level = 'scope_type'   THEN p_owner_id END,
            CASE WHEN p_level = 'scope'        THEN p_owner_id END,
            btrim(rec->>'term'),
            CASE WHEN rec ? 'sounds_like' AND jsonb_typeof(rec->'sounds_like') = 'array'
                 THEN ARRAY(SELECT btrim(v) FROM jsonb_array_elements_text(rec->'sounds_like') v WHERE btrim(v) <> '')
                 WHEN rec ? 'sounds_like' AND jsonb_typeof(rec->'sounds_like') = 'string' AND btrim(rec->>'sounds_like') <> ''
                 THEN ARRAY[btrim(rec->>'sounds_like')]
                 ELSE '{}'::text[] END,
            nullif(btrim(coalesce(rec->>'pronunciation','')), ''),
            nullif(btrim(coalesce(rec->>'ipa','')), ''),
            nullif(btrim(coalesce(rec->>'definition','')), ''),
            nullif(btrim(coalesce(rec->>'category','')), ''),
            coalesce((rec->>'is_active')::boolean, true),
            p_user_id
        )
        ON CONFLICT (user_id, organization_id, scope_type_id, scope_id, lower(term)) DO UPDATE SET
            sounds_like   = EXCLUDED.sounds_like,
            pronunciation = EXCLUDED.pronunciation,
            ipa           = EXCLUDED.ipa,
            definition    = EXCLUDED.definition,
            category      = EXCLUDED.category,
            is_active     = EXCLUDED.is_active,
            term          = EXCLUDED.term,
            deleted_at    = NULL,   -- 1355: re-adding an archived term revives that row
            updated_at    = now();
    END LOOP;

    -- DEFECT-46: EXECUTE, never a cached plan. A cached `SELECT * FROM <function>()` fixes the row width when the session
    -- first runs it; after dictionary.dict_entries gains a column it returns the old width and this call fails
    -- 'structure of query does not match function result type'. EXECUTE reads the current width each call.
    RETURN QUERY EXECUTE 'SELECT * FROM public.dict_list_entries_for($1, $2, $3)' USING p_user_id, p_level, p_owner_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_feedback_comments(p_feedback_id uuid)
 RETURNS SETOF users.feedback_comments
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if (auth.role()='service_role' or coalesce(public.is_platform_admin(),false)) is not true then
    raise exception 'platform admin required' using errcode='42501';
  end if;
  -- DEFECT-46: EXECUTE, never a cached `select * from <function>()` — that fixes the row width per session and
  -- fails 'structure of query does not match function result type' once the returned table gains a column.
  return query execute 'select * from public._d31_impl_get_feedback_comments($1)' using p_feedback_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_messages(p_feedback_id uuid)
 RETURNS SETOF users.feedback_user_messages
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if (
    auth.role()='service_role'
    or coalesce(public.is_platform_admin(),false)
    or exists (
      select 1 from users.user_feedback f
      where f.id=p_feedback_id and f.deleted_at is null
        and (f.user_id=(select auth.uid()) or f.created_by=(select auth.uid()))
    )
  ) is not true then
    raise exception 'feedback access denied' using errcode='42501';
  end if;
  -- DEFECT-46: EXECUTE, never a cached `select * from <function>()` — that fixes the row width per session and
  -- fails 'structure of query does not match function result type' once the returned table gains a column.
  return query execute 'select * from public._d31_impl_get_user_messages($1)' using p_feedback_id;
end;
$function$;

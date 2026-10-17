-- additive: yes
--
-- It REPLACES one function body, `custom.relation_words_many(uuid, uuid, uuid[])`: before the per-id words, one
-- custom.reaches_directly_many over the ids leaves every id's access answer in the statement memo, so the per-id
-- check inside custom._words_for reads it instead of walking the single-row kernel. Same answer.
-- Inverse: migrations/inverse/w1_perf_b_relation_words_ask_access_as_one_set_down.sql.
--
-- W1-PERF (tables close-out, 2026-10-17). custom.relation_words_with_icons_many@member@large raised 39 perf alerts in
-- 7 days. Each of its 50 ids (and each display hop) asked the read door's own check alone, ~3-6 ms an id for a
-- member. Measured warm on live with probe-identical calls (committed pg_temp copies, session connection):
-- @member@large 248 -> 168 ms p50; the other three twins unchanged; full answers md5-identical before/after.
--
-- based-on: custom.relation_words_many(uuid, uuid, uuid[]) 3e7801956ca2c2a565b80597dde84a239e86c13f4e05889daf7c32f3b813d434

CREATE OR REPLACE FUNCTION custom.relation_words_many(p_organization_id uuid, p_field_id uuid, p_record_ids uuid[])
 RETURNS TABLE(record_id uuid, words text, archived boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_display  jsonb;
  v_withheld text := platform.relation_withheld_label();
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.relation_words_many');
  v_display := custom._display_of_field(p_organization_id, p_field_id);
  -- W1-PERF (2026-10-17): THE ACCESS QUESTION FOR EVERY ID, ASKED ONCE AS A SET, BEFORE THE WORDS. custom._words_for
  -- asks the read door's own check (reader, 'record', id, viewer) for each id on its own, and each ask walked the
  -- whole single-row kernel (iam.has_access_for, ~3-6 ms an id for a member: 50 ids, 150-300 ms). One
  -- custom.reaches_directly_many over the same ids leaves each id's set answer in the statement memo
  -- ('iam.kernel_set:...', the key custom.reaches_directly reads first) and each walked id's own answer
  -- ('custom.reaches_directly:...'), so the per-id asks below read the memo. The same ladder answers, asked
  -- together; the memo lives in this one statement and nowhere else. No reader (a server lane): nothing asked.
  if custom.query_principal() is not null and coalesce(cardinality(p_record_ids), 0) > 1 then
    perform count(*) from custom.reaches_directly_many(
              custom.query_principal(),
              array(select distinct i from unnest(p_record_ids) i where i is not null),
              'record', 'viewer'::public.permission_level);
  end if;
  -- A PAGE AT A TIME, and the ladder is still asked per record inside the resolver, so
  -- batching buys a round trip and never a disclosure.
  --
  -- ARCHIVED (lane REFERENCE-KEEPS-ARCHIVED, chair ruling B3-21): an archive keeps every reference
  -- to what it archived, so a chip can point at a record in Archived items. The door says so, for
  -- a record this reader may see only — a withheld one answers null, exactly as before.
  return query
    select w.id, w.words,
           case when w.words is null or w.words = v_withheld then null
                else exists (select 1 from custom.record r
                              where r.organization_id = p_organization_id and r.id = w.id
                                and r.deleted_at is not null) end
      from (select i.id, custom._words_for(p_organization_id, i.id, v_display, null, 0) as words
              from unnest(coalesce(p_record_ids, '{}'::uuid[])) as i(id)
             where i.id is not null) w;
end
$function$;

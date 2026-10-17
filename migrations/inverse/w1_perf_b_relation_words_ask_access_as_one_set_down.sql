-- chair-step: W1-PERF inverse - restores the body of custom.relation_words_many(uuid,uuid,uuid[]) exactly as it was before w1_perf_b_relation_words_ask_access_as_one_set.sql (the per-id/per-row form); answers are identical either way, only the speed changes.
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

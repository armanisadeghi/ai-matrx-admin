-- chair-step: canonicalization lane 6 drops the legacy owner column user_id (text) from workbench.heatmap_saves (its one row's user_id equals created_by) and supersedes the two restrictive guards that pinned that column to the caller; std_insert already requires created_by = auth.uid() and std_update requires owner or editor, so no write door opens
-- based-on: platform._search_item_sync_heatmap_save() 29336d3f0a0838846c70948780e92c14bbcd6e501a0e8daf0cc3ad96773ef57d
-- lane: canonicalization lane 6. Clears legacy_owner_col, bespoke_policy_present, policies_canonical on heatmap_save.
-- Readers/writers repointed in the same change: app/(public)/free/zip-code-heatmap/[id]/page.tsx (owner check reads
-- created_by), app/(public)/free/zip-code-heatmap/components/SaveHeatmapModal.tsx (no longer sends user_id;
-- _stamp_actor stamps created_by). The search sync trigger stops reading the column.
set lock_timeout = '2s';

CREATE OR REPLACE FUNCTION platform._search_item_sync_heatmap_save()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform platform._search_item_drop('heatmap_save', old.id);
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (old.title, old.organization_id, old.created_by, old.visibility, old.deleted_at, old.description) is not distinct from (new.title, new.organization_id, new.created_by, new.visibility, new.deleted_at, new.description)
       and date_trunc('hour', new.updated_at) = date_trunc('hour', old.updated_at) then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    perform platform._search_item_drop('heatmap_save', old.id);
  end if;
  if new.organization_id is not null and new.deleted_at is null then
    perform platform._search_item_put('heatmap_save', new.id, new.organization_id, new.created_by, new.visibility, coalesce(nullif(btrim(new.title::text), ''), 'Untitled heatmap save' || coalesce(' ' || to_char(new.created_at, 'YYYY-MM-DD'), '')), left(new.description::text, 140), '{}'::text[], new.updated_at, null::text, null::text);
  else
    perform platform._search_item_drop('heatmap_save', new.id);
  end if;
  return null;
end
$function$;

select iam.supersede_bespoke_policies('workbench','heatmap_saves',
  array['heatmap_saves_user_id_is_the_caller_insert','heatmap_saves_user_id_is_the_caller_update'],
  'They pinned the legacy text user_id to the caller on insert/update. user_id is dropped in this same file; created_by is the owner, std_insert requires created_by = auth.uid() and std_update requires owner or editor, so the same job is done by the class policies.');

alter table workbench.heatmap_saves drop column user_id;

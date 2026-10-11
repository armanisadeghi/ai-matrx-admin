-- chair-step: inverse of custom_migrate_undo_own_row_verbs_at_edit — restores custom.migrate_undo's previous body, where every undo asks admin.
-- lane: member-defects-4
-- lock: custom
-- based-on: custom.migrate_undo(uuid, uuid) 70350b4221b3b37735009b2fa27126b50110b23aba6fe6639b6474667d9c1c3a
CREATE OR REPLACE FUNCTION custom.migrate_undo(p_organization_id uuid, p_log_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_target uuid;
  v_verb   text;
  v_mu     jsonb;
  v_answer jsonb;
  v_win    uuid;
  v_loser  uuid;
  v_links  integer := 0;
  v_kids   integer := 0;
  v_winner_back boolean := false;
  v_after  uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_undo');
  if p_log_id is null then
    raise exception 'custom.migrate_undo: which Migration?' using errcode = '22004';
  end if;

  select coalesce(nullif(l.inverse ->> 'record_id', '')::uuid, l.target_id), l.verb, l.inverse -> 'merge_undo'
    into v_target, v_verb, v_mu
    from history.migration_log l
   where l.organization_id = p_organization_id and l.id = p_log_id;
  if v_target is null and v_verb is null then
    raise exception 'There is no such Migration on the record for this organization.' using errcode = '02000',
            detail = jsonb_build_object('log_id', p_log_id)::text;
  end if;

  -- THE ONE LADDER, on the record the Migration was about. Undoing a merge WRITES — it
  -- restores the loser and revokes its alias — so it asks the same question every other
  -- write in this store asks, at the same level.
  perform custom.assert_client_may_change(p_organization_id, v_target, 'custom.migrate_undo',
                                          'admin'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_undo');

  -- The undo itself is unchanged: `history.migration_undo` writes through the store's own
  -- verbs, and schema `history` stays closed to clients — this door is the reach into it.
  v_answer := history.migration_undo(p_organization_id, p_log_id);

  -- CORE-VISION (2026-10-10): A SPLIT OR AN EXTRACTED PARENT COMES UNDONE WHOLE. Both verbs make a
  -- NEW record and log it as the inverse's `delete_after`; history.migration_undo put the original
  -- back and never read that key, so the new record stayed (a duplicate after a split, an orphan
  -- parent after an extract). It is archived here — soft, restorable from trash like any record —
  -- and the split's alias for it is revoked, so its id stops resolving to the record that kept it.
  v_after := (select nullif(l.inverse ->> 'delete_after', '')::uuid
                from history.migration_log l
               where l.organization_id = p_organization_id and l.id = p_log_id);
  if v_after is not null then
    if exists (select 1 from custom.record r
                where r.organization_id = p_organization_id and r.id = v_after and r.deleted_at is null) then
      perform custom.record_delete(p_organization_id, v_after);
    end if;
    update custom.record_alias a
       set revoked_at = now()
     where a.organization_id = p_organization_id and a.old_id = v_after and a.revoked_at is null;
    v_answer := coalesce(v_answer, '{}'::jsonb) || jsonb_build_object('removed', v_after);
  end if;

  -- TABLE-EXPERIENCE (v7 item 3) — A MERGE COMES UNDONE WHOLE. `history.migration_undo` brings
  -- the merged-away record back and revokes its alias; what the merge did to everything else is
  -- put back here from `merge_undo` (written by `custom.migrate_merge`). A merge recorded before
  -- this carries no `merge_undo` and is undone as before.
  if v_verb = 'merge' and v_mu is not null then
    v_win   := nullif(v_mu ->> 'winner_id', '')::uuid;
    v_loser := v_target;
    -- The links that were moved to the winner point at the record they were made for again.
    update platform.associations x
       set target_id = v_loser
     where x.organization_id = p_organization_id
       and x.id in (select (e #>> '{}')::uuid from jsonb_array_elements(coalesce(v_mu -> 'retargeted', '[]')) e)
       and x.target_id = v_win and x.deleted_at is null;
    get diagnostics v_links = row_count;
    -- The duplicate links the merge withdrew come back (they pointed at the loser all along).
    update platform.associations x
       set deleted_at = null
     where x.organization_id = p_organization_id
       and x.id in (select (e #>> '{}')::uuid from jsonb_array_elements(coalesce(v_mu -> 'detached', '[]')) e)
       and x.deleted_at is not null;
    -- Children hang off the record they belonged to again.
    update custom.record r
       set data = r.data || jsonb_build_object('parent_id', v_loser::text)
     where r.organization_id = p_organization_id
       and r.id in (select (e #>> '{}')::uuid from jsonb_array_elements(coalesce(v_mu -> 'reparented', '[]')) e)
       and nullif(r.data ->> 'parent_id', '')::uuid = v_win;
    get diagnostics v_kids = row_count;
    -- The winner's own values, alternates and kept-aside values as they were — only while the
    -- winner is exactly as the merge left it: an edit made since is somebody's work, never undone.
    if v_win is not null
       and (select r.data from custom.record r where r.organization_id = p_organization_id and r.id = v_win)
           = (v_mu -> 'winner_after')
       and (v_mu -> 'winner_before') <> '{}'::jsonb then
      perform custom.record_update(p_organization_id, v_win, v_mu -> 'winner_before');
      v_winner_back := true;
    end if;
    v_answer := coalesce(v_answer, '{}'::jsonb) || jsonb_build_object(
      'links_moved_back', v_links, 'children_moved_back', v_kids, 'winner_put_back', v_winner_back);
  end if;
  return v_answer;
end;
$function$;

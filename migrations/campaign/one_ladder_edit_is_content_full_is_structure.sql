-- lane: ONE-LADDER
-- chair-step: tightens structure doors from Edit (editor) to Full access (admin) and folds the retired edit_content level into editor, per Arman's 2026-10-10 ruling "Edit = Edit content, never structure"; all data is test data (Arman, same day).
-- =============================================================================
-- ONE-LADDER — ONE ACCESS LADDER FOR EVERY KIND OF DATA (Arman, 2026-10-10).
--   View (viewer) read · Comment (commenter) read + comment · Edit (editor) change values and content,
--   never structure · Full access (admin) Edit + structure (fields, views, settings, rename / move /
--   archive the table or page) + sharing at Full.
--
--   1. iam.may_grant_as(actor, type, id, level, target_kind, target_id) — THE ONE SHARING RULE, read by
--      every share door. Knob-driven (feature access.sharing, organization-overridable):
--        editor_may_share       (true)  Edit may share View / Comment / Edit, never above its own level
--        outside_org_min_level  (admin) the level needed to share outside the item's organization
--                                       (a person who is not a member, an Anyone link, another organization)
--        confidential_min_level (admin) the level needed to share a Confidential item
--      Owner or Full access on the thing may share at any level (iam.may_manage_sharing_as, unchanged).
--      Edit may never change the access of someone who already holds more than Edit.
--      Derived shares (iam.share_with_person with p_basis, e.g. hr_derived, record_store) never reach it.
--   2. Structure doors ask admin (patched in place from the live body; a body that no longer carries the
--      text stops the whole file with a sentence, nothing half-applied).
--   3. edit_content retired: its 28 grants become editor, every door that asked it asks editor, the share
--      doors stop accepting it, the level list stops listing it, and a trigger turns any late write of it
--      into editor. The enum value stays (Postgres cannot drop an enum value in place); the iam kernel's
--      own arms that name it are untouched and now see no row that holds it.
-- iam kernel internals (has_access_for*, memo) are not edited.
-- =============================================================================

insert into platform.feature_knob (
  feature, key, value, default_value, value_type, allowed_values, label, description, set_by, basis,
  review_due, overridable_by, delegable, not_delegable_reason
) values
  ('access.sharing', 'editor_may_share', 'true'::jsonb, 'true'::jsonb, 'boolean', null,
   'Edit can share',
   'Someone with Edit access can share View, Comment or Edit (never more than their own level).',
   'agent', 'Arman 2026-10-10: "I don''t see anything wrong with someone who can edit the content sharing read or edit access with someone else." Default pending his answer on cross-org.',
   current_date + 30, array['organization'], true, null),
  ('access.sharing', 'outside_org_min_level', '"admin"'::jsonb, '"admin"'::jsonb, 'enum', '["editor","admin"]'::jsonb,
   'Sharing outside the organization needs',
   'The access needed to share with someone outside the item''s organization, or by Anyone link: Edit or Full access.',
   'agent', 'Owner session 2026-10-10: Arman is reconsidering cross-org sharing by Edit; Full access is the safe default until he answers.',
   current_date + 30, array['organization'], true, null),
  ('access.sharing', 'confidential_min_level', '"admin"'::jsonb, '"admin"'::jsonb, 'enum', '["editor","admin"]'::jsonb,
   'Sharing a Confidential item needs',
   'The access needed to share a Confidential item: Edit or Full access.',
   'agent', 'Owner session 2026-10-10: only Full access shares Confidential items by default.',
   current_date + 30, array['organization'], true, null)
on conflict (feature, key) do nothing;

-- The level the actor holds on the thing, asked the way iam.may_manage_sharing_as asks Full access
-- (a record asks the store's ladder, so an access setup's seats answer; everything else asks the kernel).
create or replace function iam.holds_level_as(p_actor uuid, p_resource_type text, p_resource_id uuid, p_level public.permission_level)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $fn$
begin
  if p_actor is null or p_resource_id is null then return false; end if;
  if p_resource_type = 'record' then
    -- the store's own ladder (custom.effective_level answers exactly as the store's level check:
    -- 150/150 sampled grants at viewer, editor and admin, 2026-10-10)
    return coalesce(custom.effective_level(p_actor, (select r.organization_id from custom.record r where r.id = p_resource_id),
                                           p_resource_id, 'record') >= p_level, false);
  end if;
  if p_actor is not distinct from (select auth.uid()) then
    return iam.has_access_for(p_actor, p_resource_type, p_resource_id, p_level);
  end if;
  return iam.has_access_for_base(p_actor, p_resource_type, p_resource_id, p_level);
exception when others then
  return false;
end
$fn$;

create or replace function iam.may_grant_as(
  p_actor uuid, p_resource_type text, p_resource_id uuid, p_level public.permission_level,
  p_target_kind text, p_target_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $fn$
-- ONE-LADDER: may this person give this level on this thing to this target? NULL = yes; otherwise the
-- sentence to show them. Every share door asks it; derived shares (a basis) never do.
declare
  v_level  public.permission_level := case when p_level = 'edit_content' then 'editor'::public.permission_level else p_level end;
  v_res    record;
  v_org    uuid;
  v_class  text;
  v_inside boolean;
  v_need   public.permission_level;
begin
  if p_actor is null or p_resource_id is null or v_level is null then
    return 'Say who is sharing, what, and at which level.';
  end if;

  -- Full access (the owner, or admin on the thing — org admins and access-setup seats included): any level.
  if iam.may_manage_sharing_as(p_actor, p_resource_type, p_resource_id) then
    return null;
  end if;

  if not iam.holds_level_as(p_actor, p_resource_type, p_resource_id, 'editor'::public.permission_level) then
    return 'You need Edit or Full access on this to share it.';
  end if;
  if v_level > 'editor'::public.permission_level then
    return 'You can share up to Edit, your own level. Full access is shared by someone who holds it.';
  end if;

  -- The item's organization and class.
  if p_resource_type = 'record' then
    select r.organization_id, r.data_class into v_org, v_class from custom.record r where r.id = p_resource_id;
  else
    begin
      select * into strict v_res from public.resolve_shareable_resource(p_resource_type);
      execute format('select organization_id from %I.%I where %I = $1', v_res.schema_name, v_res.table_name, v_res.id_column)
        into v_org using p_resource_id;
    exception when others then v_org := null;
    end;
    begin
      execute format('select data_class::text from %I.%I where %I = $1', v_res.schema_name, v_res.table_name, v_res.id_column)
        into v_class using p_resource_id;
    exception when others then v_class := null;
    end;
  end if;
  v_class := coalesce(v_class, iam.class_gate_class(p_resource_type));

  if not coalesce((platform.knob_resolve('access.sharing', 'editor_may_share', v_org) #>> '{}')::boolean, true) then
    return 'In this organization only Full access can share.';
  end if;

  -- Edit never changes the access of someone who already holds more than Edit.
  if p_target_id is not null and exists (
       select 1 from iam.permissions p
        where p.resource_id = p_resource_id
          and p.permission_level > 'editor'::public.permission_level
          and coalesce(p.status, 'active') <> 'archived'
          and ((p_target_kind = 'person' and p.granted_to_user_id = p_target_id)
            or (p_target_kind = 'organization' and p.granted_to_organization_id = p_target_id))) then
    return 'They hold Full access. Only Full access can change that.';
  end if;

  if v_class = 'confidential' then
    v_need := coalesce((platform.knob_resolve('access.sharing', 'confidential_min_level', v_org) #>> '{}')::public.permission_level, 'admin');
    if v_need > 'editor'::public.permission_level then
      return 'This item is Confidential. Only Full access can share it.';
    end if;
  end if;

  v_inside := case p_target_kind
    when 'person' then v_org is not null and exists (select 1 from iam.organization_member m where m.organization_id = v_org and m.user_id = p_target_id)
    when 'organization' then v_org is not null and p_target_id = v_org
    else false   -- an Anyone link reaches people outside the organization
  end;
  if not v_inside then
    v_need := coalesce((platform.knob_resolve('access.sharing', 'outside_org_min_level', v_org) #>> '{}')::public.permission_level, 'admin');
    if v_need > 'editor'::public.permission_level then
      return case when p_target_kind = 'anyone'
        then 'Only Full access can make a link anyone can open.'
        else 'They are outside this organization. Only Full access can share outside it.' end;
    end if;
  end if;

  return null;
exception when others then
  return 'This cannot be shared right now: ' || sqlerrm;
end
$fn$;

revoke all on function iam.may_grant_as(uuid, text, uuid, public.permission_level, text, uuid) from public;
revoke all on function iam.holds_level_as(uuid, text, uuid, public.permission_level) from public;
grant execute on function iam.may_grant_as(uuid, text, uuid, public.permission_level, text, uuid) to authenticated, service_role;

-- The level list every picker reads: four levels.
create or replace function iam.content_levels()
 returns table(level permission_level, ordinal integer, noun text)
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
begin
  return query
    select e.enumlabel::text::public.permission_level,
           row_number() over (order by e.enumsortorder)::integer,
           case e.enumlabel
             when 'viewer'    then 'can read it'
             when 'commenter' then 'can read it and say something about it'
             when 'editor'    then 'can change its values and content, not its structure'
             when 'admin'     then 'can also change its structure and decide who else may'
           end
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'permission_level'
       and e.enumlabel <> 'edit_content'   -- ONE-LADDER: retired 2026-10-10
     order by e.enumsortorder;
end
$function$;

do $patch$
declare
  r record; f record; v_def text; v_new text; v_n int; v_hits int;
begin
  for r in select * from (values
    -- ── A. CONTENT DOORS: the retired edit_content level becomes Edit (editor) ──
    ($q$^custom\.(record_update|record_change_many|record_upsert|record_write_graph)\($q$, $q$'edit_content'::public\.permission_level$q$, $q$'editor'::public.permission_level$q$),
    ($q$^content\.space_save\($q$, $q$'edit_content'(::public\.permission_level)?$q$, $q$'editor'::public.permission_level$q$),
    ($q$^iam\.permission_means\($q$, $q$\s*when 'edit_content' then '[^']*'$q$, $q$$q$),
    ($q$^iam\.permission_means\($q$, $q$when 'editor' then 'can read and change it'$q$, $q$when 'editor' then 'can read and change its values and content, not its structure'$q$),
    -- ── B. LEVEL LISTS: the share doors stop accepting edit_content ──
    ($q$^(public\.)?(share_resource_with_user|share_with_audience|audience_share_preview|create_share_link|grant_org_availability|update_permission_level)\($q$, $q$'viewer',\s*'commenter',\s*'edit_content',\s*'editor',\s*'admin'$q$, $q$'viewer', 'commenter', 'editor', 'admin'$q$),
    -- ── C. STRUCTURE DOORS: Full access (admin), never Edit ──
    ($q$^custom\.(action_declare|automation_declare|checklist_declare|dashboard_declare|doc_template_delete|doc_template_restore|doc_template_save|io_import_open|row_template_declare|table_decorate|table_dimensions_set|table_sync_settings_set|table_sync|view_designate|work_template_declare)\($q$, $q$'editor'::public\.permission_level, '(table|dashboard|checklist)'\)$q$, $q$'admin'::public.permission_level, '\1')$q$),
    ($q$^custom\.(migrate_delete|migrate_extract_parent|migrate_merge|migrate_rename|migrate_reparent|migrate_retype|migrate_split|migrate_undo|record_reparent)\($q$, $q$'editor'::public\.permission_level$q$, $q$'admin'::public.permission_level$q$),
    ($q$^custom\.view_declare\($q$, $q$(custom\.has_visibility\(custom\.query_principal\(\), 'record', p_table_id, )'editor'::public\.permission_level\)$q$, $q$\1'admin'::public.permission_level)$q$),
    ($q$^custom\.table_archive\($q$, $q$assert_client_may_change\(p_organization_id, p_table_id, 'custom\.table_archive'\)$q$, $q$assert_client_may_change(p_organization_id, p_table_id, 'custom.table_archive', 'admin'::public.permission_level, 'table')$q$),
    ($q$^custom\.table_restore\($q$, $q$assert_client_may_change\(p_organization_id, p_table_id, 'custom\.table_restore'\)$q$, $q$assert_client_may_change(p_organization_id, p_table_id, 'custom.table_restore', 'admin'::public.permission_level, 'table')$q$),
    ($q$^content\.(space_publish|space_set_trashed|version_publish|version_unpublish)\($q$, $q$(iam\.has_access\('document', p_(space|document)_id, )'editor'(::public\.permission_level)?\)$q$, $q$\1'admin'::public.permission_level)$q$),
    ($q$^content\._document_guard_folder\($q$, $q$iam\.has_access\('folder', new\.folder_id, 'editor'\)$q$, $q$iam.has_access('folder', new.folder_id, 'admin')$q$),
    ($q$^(public\.)?(move_file|rename_file|rename_folder|soft_delete_file|soft_delete_folder|restore_file|restore_folder)\($q$, $q$(iam\.has_access\('(file|folder)', p_\w+, )'editor'\)$q$, $q$\1'admin')$q$),
    ($q$^iam\._guard_edit_content_structure\($q$, $q$'editor'::public\.permission_level$q$, $q$'admin'::public.permission_level$q$),
    ($q$^iam\._guard_edit_content_structure\($q$, $q$Edit-content access does not include$q$, $q$Edit access does not include$q$),
    ($q$^iam\._guard_edit_content_structure\($q$, $q$ask them for editor access to this item$q$, $q$ask them for Full access to this item$q$),
    -- ── D. SHARE DOORS: one knob-driven check, iam.may_grant_as ──
    ($q$^iam\.share_with_person\($q$, $q$if not iam\.may_manage_sharing_as\(p_actor, v_type, p_resource_id\) then\s+return jsonb_build_object\('success', false, 'error',\s+'You need Admin on this to decide who else may see it\. Ask whoever holds it, or an owner of the organization\.'\);\s+end if;$q$,
     $q$if iam.may_grant_as(p_actor, v_type, p_resource_id, p_level, 'person', p_target_user_id) is not null then
      return jsonb_build_object('success', false, 'error', iam.may_grant_as(p_actor, v_type, p_resource_id, p_level, 'person', p_target_user_id));
    end if;$q$),
    ($q$^(public\.)?update_permission_level\($q$, $q$IF NOT public\.may_manage_sharing\(v_resolved\.resource_type, p_resource_id\) THEN\s+RETURN jsonb_build_object\('success', false, 'error',\s+'You need Admin[^']*'\);\s+END IF;$q$,
     $q$IF iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, p_new_level::permission_level, CASE WHEN p_target_org_id IS NOT NULL THEN 'organization' ELSE 'person' END, COALESCE(p_target_org_id, p_target_user_id)) IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, p_new_level::permission_level, CASE WHEN p_target_org_id IS NOT NULL THEN 'organization' ELSE 'person' END, COALESCE(p_target_org_id, p_target_user_id)));
  END IF;$q$),
    ($q$^(public\.)?grant_org_availability\($q$, $q$IF NOT public\.may_manage_sharing\(v_resolved\.resource_type, p_resource_id\) THEN\s+RETURN jsonb_build_object\('success', false, 'error',\s+'You need Admin[^']*'\);\s+END IF;$q$,
     $q$IF iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'organization', p_target_org_id) IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'organization', p_target_org_id));
  END IF;$q$),
    ($q$^(public\.)?create_share_link\($q$, $q$IF NOT public\.is_resource_owner\(v_resolved\.resource_type, p_resource_id\) THEN RETURN jsonb_build_object\('success', false, 'error', 'Only the owner can create a share link'\); END IF;$q$,
     $q$IF iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'anyone', NULL) IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'anyone', NULL)); END IF;$q$),
    ($q$^custom\.share_grant\($q$, $q$(perform custom\.assert_client_may_change\(p_organization_id, p_subject_id, 'share_grant',\s+)'admin'(::public\.permission_level, 'record'\);)$q$,
     $q$\1'editor'\2
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_subject_id, p_level, 'person', p_principal_id) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_subject_id, p_level, 'person', p_principal_id) using errcode = '42501';
  end if;$q$),
    ($q$^custom\.(table_share_outside_grant|table_share_outside_invite)\($q$, $q$(perform custom\.assert_client_may_change\(p_organization_id, p_table_id,\s+'custom\.table_share_outside_(grant|invite)', )'admin'(::public\.permission_level, 'table'\);)$q$,
     $q$\1'editor'\3
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) using errcode = '42501';
  end if;$q$)
  ) as t(sigrx, rx, rep) loop
    v_hits := 0;
    for f in select p.oid from pg_proc p where p.prokind = 'f' and p.oid::regprocedure::text ~ r.sigrx loop
      v_def := pg_get_functiondef(f.oid);
      v_n := regexp_count(v_def, r.rx);
      if v_n = 0 then continue; end if;
      v_new := regexp_replace(v_def, r.rx, r.rep, 'g');
      execute v_new;
      v_hits := v_hits + v_n;
      raise notice 'ONE-LADDER: % patched (% place(s))', f.oid::regprocedure, v_n;
    end loop;
    if v_hits = 0 then
      raise exception 'ONE-LADDER: no function matching % carries %, so nothing was patched (another lane changed it, or it was already applied)', r.sigrx, r.rx;
    end if;
  end loop;
end
$patch$;

-- Spaces pages: the extra edit_content update policy goes; std_update already admits Edit, and the
-- structure guard (now asking admin) keeps Edit off the page's structure columns.
drop policy if exists edit_content_update on content.document;

-- Fold: every edit_content grant becomes Edit (one statement).
update iam.permissions set permission_level = 'editor' where permission_level = 'edit_content';
update platform.share_links set permission_level = 'editor' where permission_level = 'edit_content';

-- A late write of the retired level lands as Edit (same rights under the one ladder).
create or replace function iam._edit_content_is_editor()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $fn$
begin
  if new.permission_level = 'edit_content'::public.permission_level then
    new.permission_level := 'editor'::public.permission_level;
  end if;
  return new;
end
$fn$;
drop trigger if exists _a000_edit_content_is_editor on iam.permissions;
create trigger _a000_edit_content_is_editor before insert or update of permission_level on iam.permissions
  for each row execute function iam._edit_content_is_editor();
drop trigger if exists _a000_edit_content_is_editor on platform.share_links;
create trigger _a000_edit_content_is_editor before insert or update of permission_level on platform.share_links
  for each row execute function iam._edit_content_is_editor();

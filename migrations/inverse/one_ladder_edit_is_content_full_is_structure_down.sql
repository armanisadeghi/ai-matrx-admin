-- lane: ONE-LADDER
-- Inverse of one_ladder_edit_is_content_full_is_structure.sql: restores every patched body verbatim, the edit_content policy and grants, and drops the new objects.

CREATE OR REPLACE FUNCTION public.audience_share_preview(p_kind text, p_source_id uuid, p_level text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me    uuid := auth.uid();
  k       record;
  v_org   uuid;
  v_title text;
  v_href  text;
  v_level text;
  v_offer text;
  v_plan  jsonb;
begin
  select * into k from iam.audience_kinds() ak where ak.kind = p_kind;
  if not found then
    raise exception 'There is no audience called "%".', p_kind using errcode = '22023';
  end if;
  if p_level is not null and p_level not in ('viewer', 'commenter', 'edit_content', 'editor', 'admin') then
    raise exception 'A Permission is viewer, commenter, editor or admin (got "%").', p_level using errcode = '22023';
  end if;
  -- Authority before anything is read about the record.
  if v_me is null or not (coalesce(iam.owner_of(k.source_token, p_source_id) = v_me, false)
          or iam.has_access_for(v_me, k.source_token, p_source_id, 'admin'::public.permission_level)) then
    raise exception 'Only the person who owns this %, or someone with Admin on it, can share it with %.',
      k.source_noun, k.label using errcode = '42501';
  end if;
  execute format('select organization_id, title, href from %s($1)', k.describe_fn)
    into v_org, v_title, v_href using p_source_id;
  v_level := coalesce(p_level,
                      platform.knob_resolve(k.level_knob_feature, k.level_knob_key, v_org, v_me) #>> '{}',
                      'viewer');
  v_offer := coalesce(platform.knob_resolve(k.offer_knob_feature, k.offer_knob_key, v_org, v_me) #>> '{}', 'offer');
  v_plan := iam._audience_plan(p_kind, p_source_id, v_level::public.permission_level, v_me, '{}');
  return v_plan || jsonb_build_object('offer_mode', v_offer, 'default_level',
    coalesce(platform.knob_resolve(k.level_knob_feature, k.level_knob_key, v_org, v_me) #>> '{}', 'viewer'));
end;
$function$;

CREATE OR REPLACE FUNCTION content._document_guard_folder()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if new.folder_id is null
     or (tg_op = 'UPDATE' and new.folder_id is not distinct from old.folder_id)
     or auth.uid() is null then
    return new;
  end if;
  if not iam.has_access('folder', new.folder_id, 'editor') then
    raise exception using
      errcode = '42501',
      message = 'You can only file a document in a folder you can edit.',
      hint = 'Pick a folder you own or hold editor on, or leave folder_id empty.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION content.space_publish(p_space_id uuid, p_published boolean DEFAULT NULL::boolean, p_include_sub_pages boolean DEFAULT NULL::boolean, p_allow_duplicate boolean DEFAULT NULL::boolean, p_slug text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc content.document;
  v_pub boolean; v_inc boolean; v_dup boolean; v_slug text; v_base text;
  v_tree uuid[]; v_sub boolean;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Sign in to publish a page.';
  end if;
  select * into v_doc from content.document d where d.id = p_space_id and d.deleted_at is null and d.format = 'spaces';
  if not found then
    raise exception using errcode = '42501', message = 'You cannot open that page, or it does not exist.';
  end if;
  if not iam.has_access('document', p_space_id, 'editor'::public.permission_level) then
    raise exception using errcode = '42501', message = 'Only someone who can edit this page can publish it.';
  end if;

  v_pub := coalesce(p_published, v_doc.published_to_web);
  v_inc := coalesce(p_include_sub_pages, v_doc.web_include_sub_pages);
  v_dup := coalesce(p_allow_duplicate, v_doc.web_allow_duplicate);

  v_slug := nullif(lower(btrim(coalesce(p_slug, ''))), '');
  if v_slug is null then
    v_slug := v_doc.slug;
  end if;
  if v_slug is null and v_pub then
    v_base := trim(both '-' from left(regexp_replace(lower(coalesce(v_doc.title, '')), '[^a-z0-9]+', '-', 'g'), 48));
    v_slug := case when v_base = '' then 'page' else v_base end || '-' || left(replace(v_doc.id::text, '-', ''), 8);
  end if;
  if v_slug is not null and v_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception using errcode = '22023',
      message = 'A page link is 3 to 64 lower-case letters, digits and hyphens.';
  end if;
  if v_pub and v_slug is not null and exists (
       select 1 from content.document d
        where d.slug = v_slug and d.id <> p_space_id and d.published_to_web and d.deleted_at is null) then
    raise exception using errcode = '23505', message = format('The link "%s" is already taken.', v_slug);
  end if;

  update content.document d
     set published_to_web = v_pub, web_include_sub_pages = v_inc, web_allow_duplicate = v_dup, slug = v_slug
   where d.id = p_space_id;

  v_sub := v_pub and v_inc;
  v_tree := content._space_tree_ids(p_space_id);
  update content.document d
     set published_to_web = v_sub, web_include_sub_pages = v_inc, web_allow_duplicate = v_dup
   where d.id = any (v_tree)
     and (d.published_to_web, d.web_include_sub_pages, d.web_allow_duplicate) is distinct from (v_sub, v_inc, v_dup);

  return jsonb_build_object(
    'published', v_pub, 'include_sub_pages', v_inc, 'allow_duplicate', v_dup, 'slug', v_slug,
    'sub_pages', cardinality(v_tree));
end $function$;

CREATE OR REPLACE FUNCTION content.space_save(p_document_id uuid, p_expected_version integer, p_snapshot jsonb, p_title text DEFAULT NULL::text, p_projection text DEFAULT NULL::text, p_origin text DEFAULT 'manual'::text)
 RETURNS content.document
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc  content.document;
  v_row  content.document;
  v_hash text;
  v_icon text;
begin
  -- The one save door for a Space: compare-and-swap on version, then one insert-only snapshot per new content version.
  if coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon')
     and not iam.has_access('document', p_document_id, 'edit_content') then
    raise exception using errcode = '42501',
      message = 'You cannot edit this Space, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  select * into v_doc from content.document d where d.id = p_document_id and d.deleted_at is null for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'You cannot edit this Space, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  if v_doc.format <> 'spaces' then
    raise exception using errcode = '22023',
      message = format('content.space_save saves Spaces only; this document is %s.', v_doc.format),
      hint = 'Update content.document.body with guardedUpdate on version.';
  end if;
  if p_expected_version is null or v_doc.version <> p_expected_version then
    raise exception using errcode = 'PT409',
      message = format('This Space changed since you loaded it (you had version %s; it is now %s).', p_expected_version, v_doc.version),
      hint = 'Reload it, re-apply your edit, and save again.';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception using errcode = '22023',
      message = 'The snapshot must be a Space page object.',
      hint = 'Send { settings, icon, cover, blocks } as the Spaces editor produced it.';
  end if;
  if coalesce(p_origin, '') not in ('manual', 'autosave', 'agent', 'import', 'sync', 'restore', 'system') then
    raise exception using errcode = '22023',
      message = format('Unknown save origin %s.', coalesce(p_origin, 'NULL')),
      hint = 'Use manual, autosave, agent, import, sync, restore or system.';
  end if;

  v_hash := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  -- The list shows the page icon without reading a snapshot: mirror it into the document's icon column.
  v_icon := case when jsonb_typeof(p_snapshot -> 'icon') = 'object' then (p_snapshot -> 'icon')::text end;
  if v_hash = v_doc.payload_hash
     and coalesce(p_projection, v_doc.body) = v_doc.body
     and coalesce(p_title, v_doc.title) = v_doc.title
     and v_icon is not distinct from v_doc.icon then
    return v_doc;   -- nothing changed; no version, no payload
  end if;

  perform set_config('content.space_save_doc', p_document_id::text, true);
  update content.document d
     set body = coalesce(p_projection, d.body),
         title = coalesce(p_title, d.title),
         icon = v_icon,
         payload_hash = v_hash,
         last_origin = p_origin
   where d.id = p_document_id
  returning * into v_row;
  perform set_config('content.space_save_doc', '', true);

  if v_row.content_version <> v_doc.content_version then
    insert into content.space_payload (organization_id, created_by, document_id, content_version, snapshot)
    values (v_row.organization_id, v_row.updated_by, v_row.id, v_row.content_version, p_snapshot);
  end if;
  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION content.space_set_trashed(p_document_id uuid, p_trashed boolean)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_doc content.document;
  v_at  timestamptz;
begin
  -- Move a Space to Trash, or back out. Who may: who may update the row (std_update: its creator or
  -- editor access on it). Definer only because the owner-only trash rule (platform.trash_hides) hides a
  -- trashed page from everyone but its creator, so a full-access editor's plain UPDATE fails the read
  -- check on the new row (42501) even though the update itself is allowed.
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sign in to move a page to Trash.';
  end if;
  select * into v_doc from content.document d where d.id = p_document_id for update;
  if not found or v_doc.format <> 'spaces' then
    raise exception using errcode = '42501', message = 'This page does not exist, or you cannot change it.';
  end if;
  if not (v_doc.created_by = v_uid
          or iam.has_access('document', p_document_id, 'editor'::public.permission_level)
          or (select public.is_platform_admin())) then
    raise exception using errcode = '42501',
      message = case when p_trashed then 'You cannot move this page to Trash.' else 'You cannot restore this page.' end,
      hint = 'Ask its owner for full access.';
  end if;
  v_at := case when p_trashed then coalesce(v_doc.deleted_at, now()) end;
  update content.document d set deleted_at = v_at where d.id = p_document_id;
  return v_at;
end;
$function$;

CREATE OR REPLACE FUNCTION content.version_publish(p_document_id uuid, p_content_version integer DEFAULT NULL::integer)
 RETURNS content.document
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc content.document;
  v_row content.document;
  v_cv  integer;
begin
  if coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon')
     and not iam.has_access('document', p_document_id, 'editor') then
    raise exception using errcode = '42501',
      message = 'You cannot publish this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  select * into v_doc from content.document d where d.id = p_document_id and d.deleted_at is null for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'You cannot publish this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  v_cv := coalesce(p_content_version, v_doc.content_version);
  if not exists (select 1 from content.document_version v
                  where v.document_id = p_document_id and v.content_version = v_cv
                    and v.change_kind = 'content') then
    raise exception using errcode = '22023',
      message = format('Version %s of this document does not exist or holds no content.', v_cv),
      hint = 'Publish a version listed in content.document_version with change_kind = content.';
  end if;
  perform set_config('content.publish_doc', p_document_id::text, true);
  update content.document d
     set published_content_version = v_cv, published_at = now()
   where d.id = p_document_id
  returning * into v_row;
  perform set_config('content.publish_doc', '', true);
  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION content.version_unpublish(p_document_id uuid)
 RETURNS content.document
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row content.document;
begin
  if coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon')
     and not iam.has_access('document', p_document_id, 'editor') then
    raise exception using errcode = '42501',
      message = 'You cannot unpublish this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  perform set_config('content.publish_doc', p_document_id::text, true);
  update content.document d
     set published_content_version = null, published_at = null
   where d.id = p_document_id
  returning * into v_row;
  perform set_config('content.publish_doc', '', true);
  if v_row.id is null then
    raise exception using errcode = '42501',
      message = 'You cannot unpublish this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_share_link(p_resource_type text, p_resource_id uuid, p_permission_level text DEFAULT 'viewer'::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_max_uses integer DEFAULT NULL::integer, p_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_resolved record; v_token text; v_id uuid; v_org uuid;
        v_shareable boolean; v_short text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF COALESCE(p_permission_level,'viewer') NOT IN ('viewer', 'commenter', 'edit_content', 'editor', 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level'); END IF;
  BEGIN SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
  SELECT COALESCE(is_link_shareable, false) INTO v_shareable FROM platform.shareable_resource_registry WHERE resource_type = v_resolved.resource_type;
  IF NOT v_shareable THEN RETURN jsonb_build_object('success', false, 'error', 'Public link sharing is not enabled for this item type'); END IF;
  -- DD-137c / §3.4 chokepoint 3: the registry flag is derived from the class, and the gate is
  -- asked anyway, because a refusal that is only a boolean leaves no row anybody can read
  -- tomorrow. The BOOLEAN form is used on purpose: this function catches everything and
  -- returns {success:false}, and catching a RAISE would roll the audit row back with it.
  IF NOT iam.class_allows(
       (SELECT et.token FROM platform.entity_types et
         WHERE et.schema_name = v_resolved.schema_name AND et.table_name = v_resolved.table_name
           AND et.is_active LIMIT 1),
       'share_link', NULL) THEN
    RETURN jsonb_build_object('success', false, 'error',
      coalesce(nullif(current_setting('iam.class_gate_last_reason', true), ''),
               'This kind of item cannot be shared by public link.'));
  END IF;
  IF NOT public.is_resource_owner(v_resolved.resource_type, p_resource_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Only the owner can create a share link'); END IF;
  -- ACCESS LADDER T-40: a table ROW opens through its link; a whole Table does not yet.
  IF v_resolved.resource_type = 'record' AND EXISTS (
       SELECT 1 FROM custom.record r WHERE r.id = p_resource_id
          AND r.table_id IN (custom.table_kernel_id(), custom.field_kernel_id())) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'A whole table cannot be shared by Anyone link yet. Share its rows by link, or share the table with people.');
  END IF;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  BEGIN EXECUTE format('SELECT organization_id FROM %I.%I WHERE %I = $1', v_resolved.schema_name, v_resolved.table_name, v_resolved.id_column) INTO v_org USING p_resource_id;
  EXCEPTION WHEN OTHERS THEN v_org := NULL; END;
  INSERT INTO platform.share_links (resource_type, resource_id, token, permission_level, created_by, organization_id, expires_at, max_uses, label)
  VALUES (v_resolved.resource_type, p_resource_id, v_token, COALESCE(p_permission_level,'viewer')::permission_level, v_uid, v_org, p_expires_at, p_max_uses, p_label)
  RETURNING id INTO v_id;
  v_short := platform._mint_share_short_alias(v_id);
  RETURN jsonb_build_object('success', true, 'token', v_token, 'id', v_id,
                            'resource_type', v_resolved.resource_type,
                            'short_token', v_short);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $function$;

CREATE OR REPLACE FUNCTION custom.action_declare(p_organization_id uuid, p_table_id uuid, p_actions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_list jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.action_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.action_declare');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.action_declare',
                                          'editor'::public.permission_level, 'table');
  perform 1 from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null
   for update;
  if not found then
    raise exception 'That table is not in this organization, so it has no actions to change.'
      using errcode = '23503', hint = 'REC-29: organizations are hard walls. Nothing was written.';
  end if;
  v_list := custom._action_check(p_organization_id, p_table_id, p_actions);
  update custom.record
     set data = case when jsonb_array_length(v_list) = 0 then data - 'row_actions'
                     else jsonb_set(data, '{row_actions}', v_list, true) end
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();
  return v_list;
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_declare(p_organization_id uuid, p_table_id uuid, p_spec jsonb, p_automation_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc    jsonb;
  v_check  jsonb;
  v_list   jsonb;
  v_item   jsonb;
  v_id     uuid;
  v_found  boolean := false;
  v_new    jsonb := '[]'::jsonb;
  e        jsonb;
  v_me     uuid := custom.query_principal();
  v_dup    jsonb;
  -- AUTOMATIONS-AIRTABLE (2026-10-10): AI ON A SCHEDULE IS SAVED SWITCHED OFF (Arman's standing rule): an automation
  -- whose trigger is a time (date arrives / every…) and which has an agent step is stored off, and switching it on is
  -- its own explicit act (custom.automation_set_enabled). Editing one INTO that shape switches it off too.
  v_ai_sched boolean;
  v_was_ai   boolean;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.automation_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.automation_declare');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.automation_declare',
                                          'editor'::public.permission_level, 'table');
  select t.data into v_doc from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null
   for update;
  if not found then
    raise exception 'That table is not in this organization, so it has no automations to change.'
      using errcode = '23503', hint = 'REC-29: organizations are hard walls. Nothing was written.';
  end if;

  v_check := custom._automation_check_timed(p_organization_id, p_table_id, p_spec);
  if v_check ? '_errors' then
    return jsonb_build_object('ok', false, '_errors', v_check -> '_errors');
  end if;

  v_ai_sched := (v_check -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                and jsonb_path_exists(v_check -> 'spec', '$.actions[*] ? (@.do == "agent")');

  v_list := case when jsonb_typeof(v_doc -> 'automations') = 'array' then v_doc -> 'automations' else '[]'::jsonb end;
  -- MAKE-AUTODUP: declaring the same automation again (same judged spec, not archived) answers the one already
  -- there instead of storing a second; a template installed twice into a reused table keeps one reminder.
  if p_automation_id is null then
    select x into v_dup from jsonb_array_elements(v_list) x
     where x -> 'spec' = v_check -> 'spec' and nullif(x ->> 'archived_at', '') is null
     order by x ->> 'created_at' limit 1;
    if v_dup is not null then
      return jsonb_build_object('ok', true, 'automation_id', (v_dup ->> 'id')::uuid, 'table_id', p_table_id,
               'enabled', coalesce((v_dup ->> 'enabled')::boolean, true), 'spec', v_dup -> 'spec', 'reused', true);
    end if;
  end if;
  v_id := coalesce(p_automation_id, gen_random_uuid());

  for e in select x from jsonb_array_elements(v_list) x loop
    if e ->> 'id' = v_id::text then
      v_found := true;
      v_item := e || jsonb_build_object('spec', v_check -> 'spec', 'updated_at', now(), 'updated_by', v_me);
      v_was_ai := (e -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                  and jsonb_path_exists(e -> 'spec', '$.actions[*] ? (@.do == "agent")');
      if v_ai_sched and not coalesce(v_was_ai, false) then
        v_item := v_item || jsonb_build_object('enabled', false);
      end if;
      v_new := v_new || jsonb_build_array(v_item);
    else
      v_new := v_new || jsonb_build_array(e);
    end if;
  end loop;
  if p_automation_id is not null and not v_found then
    raise exception 'There is no such automation on this table.'
      using errcode = '23503', hint = 'It may belong to another table or organization. Nothing was changed.';
  end if;
  if not v_found then
    if jsonb_array_length(v_list) >= 50 then
      return jsonb_build_object('ok', false, '_errors', jsonb_build_object('automations', 'A table has at most 50 automations; archive one first.'));
    end if;
    v_item := jsonb_strip_nulls(jsonb_build_object('id', v_id, 'spec', v_check -> 'spec', 'enabled', not v_ai_sched,
                'created_at', now(), 'created_by', v_me, 'updated_at', now(), 'updated_by', v_me));
    v_new := v_new || jsonb_build_array(v_item);
  end if;

  update custom.record set data = jsonb_set(data, '{automations}', v_new, true)
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();

  return jsonb_build_object('ok', true, 'automation_id', v_id, 'table_id', p_table_id,
           'enabled', coalesce((v_item ->> 'enabled')::boolean, true), 'spec', v_check -> 'spec')
         || case when v_ai_sched then jsonb_build_object('ai_on_schedule', true,
                   'says', 'It runs an agent on a schedule, so it is saved switched off. Switch it on to start it.')
                 else '{}'::jsonb end;
end
$function$;

CREATE OR REPLACE FUNCTION custom.checklist_declare(p_organization_id uuid, p_spec jsonb, p_template_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_why    text;
  v_id     uuid;
  v_spec   jsonb;
  v_steps  uuid;
  v_about  uuid;
  v_trigt  uuid;
  v_t0     timestamptz := clock_timestamp();
begin
  -- THE WALL FIRST, THEN THE SWITCH. Somebody in another organization is told THAT, and is
  -- not told anything at all about whether that organization's store is switched on.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.checklist_declare');
  perform custom.assert_store_door(p_organization_id, 'custom.checklist_declare');
  if p_organization_id is null then
    raise exception 'custom.checklist_declare: organization_id is required - the store is keyed (organization_id, id)'
      using errcode = '22004';
  end if;

  v_spec := coalesce(p_spec, '{}'::jsonb);
  v_why := custom.checklist_refusal(v_spec);
  if v_why is not null then
    raise exception '%', v_why
      using errcode = '23514',
            hint = 'PRODUCTS row 13: a checklist is judged when it is written, so a run of it cannot be half a checklist.';
  end if;

  v_about := (v_spec ->> 'about_table_id')::uuid;
  -- Writing a checklist that runs against a table is a change to how that table is worked, so
  -- it asks the rung a change to that table asks.
  perform custom.assert_client_may_change(p_organization_id, v_about, 'custom.checklist_declare',
                                          'editor'::public.permission_level, 'table');
  if not exists (select 1 from custom.record r
                  where r.organization_id = p_organization_id and r.id = v_about
                    and r.table_id = custom.table_kernel_id() and r.deleted_at is null) then
    raise exception 'That table is not in this organization, so a checklist cannot be about it.'
      using errcode = '23503';
  end if;

  v_steps := custom.checklist_steps_table(p_organization_id);

  v_trigt := nullif(v_spec #>> '{trigger,table_id}', '')::uuid;
  if v_trigt is not null then
    if v_trigt = v_steps then
      raise exception 'A checklist cannot watch the table its own steps live in — every step it made would start another run of it.'
        using errcode = '23514';
    end if;
    perform custom.assert_client_may_change(p_organization_id, v_trigt, 'custom.checklist_declare',
                                            'editor'::public.permission_level, 'table');
    if not exists (select 1 from custom.record r
                    where r.organization_id = p_organization_id and r.id = v_trigt
                      and r.table_id = custom.table_kernel_id() and r.deleted_at is null) then
      raise exception 'That table is not in this organization, so a checklist cannot watch it.'
        using errcode = '23503';
    end if;
  end if;

  if p_template_id is null then
    insert into custom.record (organization_id, table_id, data_class, data)
    values (p_organization_id, null, 'checklist_template', v_spec)
    returning id into v_id;
  else
    perform custom.assert_client_may_change(p_organization_id, p_template_id,
                                            'custom.checklist_declare',
                                            'editor'::public.permission_level, 'checklist');
    if not exists (select 1 from custom.record r
                    where r.organization_id = p_organization_id and r.id = p_template_id
                      and r.data_class = 'checklist_template' and r.deleted_at is null) then
      raise exception 'There is no such checklist in this organization.' using errcode = '02000';
    end if;
    v_id := p_template_id;
    perform custom.record_update(p_organization_id, p_template_id, v_spec, null);
  end if;

  return jsonb_build_object(
    'template_id',    v_id,
    'name',           v_spec ->> 'name',
    'about_table_id', v_about,
    'steps_table_id', v_steps,
    'steps',          jsonb_array_length(v_spec -> 'steps'),
    'roles',          jsonb_array_length(coalesce(v_spec -> 'roles', '[]'::jsonb)),
    'trigger',        coalesce(v_spec -> 'trigger', jsonb_build_object('kind', 'manual')),
    'created',        p_template_id is null,
    'message',        format('%s has %s step%s, and it %s.',
                             v_spec ->> 'name',
                             jsonb_array_length(v_spec -> 'steps'),
                             case when jsonb_array_length(v_spec -> 'steps') = 1 then '' else 's' end,
                             case coalesce(v_spec #>> '{trigger,kind}', 'manual')
                               when 'record_created'  then 'starts on its own whenever a new record arrives'
                               when 'status_reached'  then format('starts on its own when a record reaches %s',
                                                                  v_spec #>> '{trigger,status}')
                               else 'is started by hand' end),
    'ms', round(extract(epoch from (clock_timestamp() - v_t0)) * 1000, 1));
end
$function$;

CREATE OR REPLACE FUNCTION custom.dashboard_declare(p_organization_id uuid, p_table_id uuid, p_name text, p_blocks jsonb DEFAULT '[]'::jsonb, p_presentation jsonb DEFAULT '{}'::jsonb, p_dashboard_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_blocks jsonb := '[]'::jsonb;
  v_name   text;
  v_doc    jsonb;
  v_id     uuid;
  b        jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.dashboard_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.dashboard_declare');

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'A dashboard has to be called something.'
      using errcode = '22004',
            hint = 'SCR-16: the name is what a person clicks to switch between dashboards.';
  end if;

  if p_table_id is null then
    raise exception 'A dashboard has to say what it is a dashboard about.'
      using errcode = '22004',
            hint = 'p_table_id names the Table most of its blocks ask about. A single block may still name another table_id of its own.';
  end if;

  -- SAME RUNG AS A FORM AND A RULE, AND FOR THE SAME REASON: this publishes something
  -- about a Table that everybody in the organization then sees on that Table's own page.
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.dashboard_declare',
                                          'admin'::public.permission_level, 'table');

  if jsonb_typeof(coalesce(p_blocks, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'A dashboard''s blocks are a list.'
      using errcode = '22004',
            hint = 'Send [] for a dashboard with no blocks yet, or a list of block objects.';
  end if;

  for b in select e from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) e loop
    v_blocks := v_blocks || custom.dashboard_block_normalize(p_organization_id, p_table_id, b);
  end loop;

  v_doc := jsonb_build_object(
    'name', v_name,
    'subject_table_id', p_table_id,
    'blocks', v_blocks,
    'presentation', case when jsonb_typeof(coalesce(p_presentation, '{}'::jsonb)) = 'object'
                         then coalesce(p_presentation, '{}'::jsonb) else '{}'::jsonb end);

  if p_dashboard_id is null then
    insert into custom.record (organization_id, table_id, data_class, data)
    values (p_organization_id, custom.presentation_kernel_id(), custom.dashboard_class(), v_doc)
    returning id into v_id;
    return v_id;
  end if;

  -- CHAIR-SEC (2026-10-02): CHANGING A DASHBOARD IS AN EDIT OF THAT DASHBOARD. Admin on the
  -- subject Table (asked above) lets a person put a dashboard ON a Table; it never made every
  -- table admin an editor of every dashboard in the organization. The existing record is asked
  -- by its own id on the one ladder — the creator holds it, a share or an organization admin
  -- grants it — whatever subject the caller names. Measured on the clone as test@test.com (a
  -- member shared admin on one Table): she overwrote the owner's dashboard on it. Now refused.
  perform custom.assert_client_may_change(p_organization_id, p_dashboard_id, 'custom.dashboard_declare',
                                          'editor'::public.permission_level, 'dashboard');

  -- RE-STATING A DASHBOARD, not patching one. The whole document moves at once so a save
  -- that dropped a block cannot half-land, and the version moves so History names who did
  -- it — the same shape custom.form_declare's update arm has.
  update custom.record
     set data = v_doc, updated_at = now(), version = version + 1
   where organization_id = p_organization_id
     and id = p_dashboard_id
     and table_id = custom.presentation_kernel_id()
     and data_class = custom.dashboard_class()
     and deleted_at is null
  returning id into v_id;
  if v_id is null then
    raise exception 'There is no such dashboard in this organization.' using errcode = '23503',
            hint = 'A dashboard id from another organization reads as absent — organizations are hard walls (REC-29).',
            detail = jsonb_build_object('dashboard_id', p_dashboard_id)::text;
  end if;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.doc_template_delete(p_organization_id uuid, p_template_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table uuid;
  v_name  text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.doc_template_delete');

  select (r.data ->> 'renders_table_id')::uuid, r.data ->> 'name'
    into v_table, v_name
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_template_id
     and r.data_class = 'doc_template'
     and r.deleted_at is null;
  if v_table is null then
    raise exception 'There is no such document template in this organization.' using errcode = '02000',
            hint = 'It may already have been removed, or it may belong to another organization - organizations are hard walls (REC-29).',
            detail = jsonb_build_object('template_id', p_template_id)::text;
  end if;

  -- A TEMPLATE IS THE TABLE''S WORDING, so removing it is an edit of the Table, not of a
  -- record. Whoever may add a column may retire a proposal template; whoever may not, may
  -- not - and is told by name which authority it takes.
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.doc_template_delete',
                                          'editor'::public.permission_level, 'table');
  perform custom.assert_store_door(p_organization_id, 'custom.doc_template_delete');

  -- Soft, like every other record. VAL-10: documents ALREADY rendered from it keep their
  -- body, their hash and their seal - a template going away can never invalidate a
  -- signature over bytes that were frozen at render time.
  update custom.record r
     set deleted_at = now(), updated_at = now(), version = r.version + 1
   where r.organization_id = p_organization_id and r.id = p_template_id;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.doc_template_restore(p_organization_id uuid, p_template_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- lane STORE-RESTORE-DOORS. THE UNDO OF custom.doc_template_delete. A template is its Table's
-- wording, so bringing one back is an edit of the Table — editor on it, the rung the removal climbs.
declare
  v_table uuid;
  v_name  text;
  v_at    timestamptz;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.doc_template_restore');

  select nullif(r.data ->> 'renders_table_id', '')::uuid, r.data ->> 'name', r.deleted_at
    into v_table, v_name, v_at
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_template_id
     and r.data_class = 'doc_template';
  if v_table is null then
    raise exception 'There is no such document template in this organization, so nothing was brought back.' using errcode = '02000', hint = 'Organizations are hard walls (REC-29).',
            detail = jsonb_build_object('template_id', p_template_id)::text;
  end if;
  if v_at is null then
    raise exception 'The template "%" was not removed, so there was nothing to bring back.', custom.said(v_name, 'that one')
      using errcode = '02000', hint = 'REC-23: it is already here.';
  end if;
  if not exists (select 1 from custom.record t
                  where t.organization_id = p_organization_id and t.id = v_table
                    and t.table_id = custom.table_kernel_id() and t.deleted_at is null) then
    raise exception 'The template "%" belongs to a table that is archived, so it cannot come back on its own.', custom.said(v_name, 'that one')
      using errcode = '23514', hint = 'Restore the table from Trash first.';
  end if;

  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.doc_template_restore',
                                          'editor'::public.permission_level, 'table');
  perform custom.assert_store_door(p_organization_id, 'custom.doc_template_restore');

  update custom.record r
     set deleted_at = null, updated_at = now(), version = r.version + 1
   where r.organization_id = p_organization_id and r.id = p_template_id
     and r.data_class = 'doc_template' and r.deleted_at = v_at;
  return found;
end
$function$;

CREATE OR REPLACE FUNCTION custom.doc_template_save(p_organization_id uuid, p_table_id uuid, p_name text, p_body text, p_template_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_id      uuid;
  v_bad     record;
  v_tname   text;
  v_ver     integer;
  v_was     uuid;
  v_labels  text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.doc_template_save');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.doc_template_save', 'editor'::public.permission_level, 'table');
  -- THE DOOR. One call to the ONE predicate. This is a SECURITY DEFINER door, so
  -- `current_user` in here is already the definer; `custom.assert_store_door` judges
  -- `custom.caller_role()` — what the caller actually held — and resolves the guard this
  -- file is headed with, custom/system_enabled, through platform.knob_resolve.
  perform custom.assert_store_door(p_organization_id, 'custom.doc_template_save');

  if p_organization_id is null or p_table_id is null then
    raise exception 'custom.doc_template_save: organization_id and the table the template renders are both required'
      using errcode = '22004';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'a document template needs a name - it is what a person picks it by'
      using errcode = '23514', hint = 'REC-68.';
  end if;

  select t.data ->> 'name' into v_tname
    from custom.record t
   where t.organization_id = p_organization_id
     and t.id = p_table_id
     and t.table_id = custom.table_kernel_id()
     and t.deleted_at is null;
  if v_tname is null then
    raise exception 'this template says it renders records of something that is not a table of this organization'
      using errcode = '23503',
            hint = 'REC-68: a template renders the records of ONE Table, and its tokens are that Table''s Fields.';
  end if;

  -- ── REC-68, THE REFUSAL. A token naming no Field is refused AT SAVE, BY NAME. ──────
  -- It names the token it refused and the Fields that ARE available, because a refusal
  -- that does not say what to write instead is a dead end.
  select * into v_bad
    from custom.doc_unresolved_tokens(p_organization_id, p_table_id, p_body)
   order by raw
   limit 1;
  if v_bad.raw is not null then
    select string_agg(format('%s (%s)', f.label, f.id), ', ' order by f.sort, f.key)
      into v_labels
      from custom.field f
     where f.organization_id = p_organization_id
       and f.entity_definition_id = p_table_id;
    raise exception 'the template "%" points at % and %', btrim(p_name), v_bad.raw, v_bad.why
      using errcode = '23503',
            hint = format('REC-68: a token names a Field of %s by its id, never by a name, so renaming a field never breaks a template. The fields you can merge here are: %s.',
                          v_tname, coalesce(v_labels, 'none - this table has declared no fields yet'));
  end if;

  -- ── the positive path: it is a Record, written the way every Record is written ─────
  if p_template_id is null then
    insert into custom.record (organization_id, table_id, data_class, data)
    values (p_organization_id, null, 'doc_template', jsonb_build_object(
      'renders_table_id', p_table_id,
      'name', btrim(p_name),
      'body', coalesce(p_body, ''),
      'template_version', 1))
    returning id into v_id;
    return v_id;
  end if;

  -- REC-68 + VAL-10: EVERY SAVE OF AN EXISTING TEMPLATE IS A NEW TEMPLATE VERSION. A
  -- signature seals a document version (VAL-10), so a template whose body could move under
  -- a sealed document without the version moving would make the seal meaningless.
  select coalesce((r.data ->> 'template_version')::integer, 1),
         nullif(r.data ->> 'renders_table_id', '')::uuid
    into v_ver, v_was
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_template_id
     and r.data_class = 'doc_template' and r.deleted_at is null;
  if v_ver is null then
    raise exception 'there is no such document template in this organization' using errcode = '02000',
            detail = jsonb_build_object('template_id', p_template_id)::text;
  end if;

  -- CHAIR-SEC (2026-10-02): THE TEMPLATE'S OWN TABLE DECIDES WHO REWRITES IT. The rung above is
  -- asked of the Table the CALLER names; an existing template renders the Table IT names, and
  -- custom.doc_template_delete already asks that one. Without this an editor of one Table could
  -- rewrite (and move) any template in the organization by naming her own Table.
  if v_was is distinct from p_table_id then
    perform custom.assert_client_may_change(p_organization_id, v_was, 'custom.doc_template_save',
                                            'editor'::public.permission_level, 'table');
  end if;

  update custom.record r
     set data = r.data
                || jsonb_build_object('renders_table_id', p_table_id,
                                      'name', btrim(p_name),
                                      'body', coalesce(p_body, ''),
                                      'template_version', v_ver + 1)
   where r.organization_id = p_organization_id and r.id = p_template_id
  returning r.id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_import_open(p_organization_id uuid, p_table_id uuid, p_format text DEFAULT 'csv'::text, p_source_name text DEFAULT NULL::text, p_source_columns jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v jsonb;
begin
  -- THE SWITCH, THE WALL, THE RUNG — in this door's own body, by name, before anything else,
  -- because this door is the one a reader audits and the one the census reads.
  perform custom.assert_store_door(p_organization_id, 'custom.io_import_open');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.io_import_open');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.io_import_open',
                                          'editor'::public.permission_level, 'table');

  -- ONE IMPLEMENTATION OF "OPEN AN IMPORT". This door is the older, narrower way in — no file
  -- identity, no duplicate key, no policy — and it stays exactly that so nothing that already
  -- calls it has to change. It asks the same three questions again inside, which is correct:
  -- a door decides for itself.
  v := custom.io_import_begin(p_organization_id, p_table_id, p_format, p_source_name,
                              p_source_columns, null, '{}'::jsonb, null, null, false);
  return (v ->> 'import_id')::uuid;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_delete(p_organization_id uuid, p_record_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row     custom.record%rowtype;
  v_cascade uuid[];
  v_log     uuid;
  v_took    uuid[] := '{}';
  v_child   uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_delete');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.migrate_delete', 'editor'::public.permission_level, 'record');
  -- THE SWITCH. Every line below is behind custom/system_enabled: custom.assert_store_door
  -- resolves that knob and, while it is false, this store takes writes only from the role that
  -- owns custom.record. The switch never removes a check; it closes the door.
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_delete');

  select * into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record here to delete.' using errcode = '02000',
            hint = 'REC-23: a record already deleted is still here and still reversible — custom.record_restore(organization, record) brings it back until its Table''s retention runs out.',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;

  -- THE SAME RULE THE DOOR WILL APPLY, asked not to change anything, so the inverse names
  -- exactly the records the door is about to take. It raises the refusals here too, before
  -- a Migration row exists for a delete that is not going to happen.
  v_cascade := custom.delete_cascade_closure(p_organization_id, p_record_id);

  v_log := history.migration_record(p_organization_id, 'delete', v_row.data_class, p_record_id,
             jsonb_build_object('kind', 'restore', 'record_id', p_record_id::text,
                                'also', to_jsonb(v_cascade)),
             coalesce(p_note, format('deleted with %s record(s) it contained or owned', coalesce(array_length(v_cascade, 1), 0))));

  perform custom.record_delete(p_organization_id, p_record_id);

  foreach v_child in array v_cascade loop
    if exists (select 1 from custom.record r
                where r.organization_id = p_organization_id and r.id = v_child and r.deleted_at is not null) then
      v_took := v_took || v_child;
    end if;
  end loop;

  return jsonb_build_object('verb', 'delete', 'record_id', p_record_id,
                            'migration_id', v_log, 'took_with_it', to_jsonb(v_took),
                            'cascaded', coalesce(array_length(v_took, 1), 0),
                            'reversible_until', 'the end of this table''s retention (REC-23)',
                            'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_extract_parent(p_organization_id uuid, p_id uuid, p_parent_table_id uuid, p_moved_keys text[], p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row    custom.record%rowtype;
  v_parent uuid;
  v_data   jsonb := '{}'::jsonb;
  v_was    uuid;
  v_key    text;
  v_log    uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_extract_parent');
  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_extract_parent', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_extract_parent');
  select * into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record here to extract a parent from.' using errcode = '02000',
            detail = jsonb_build_object('id', p_id)::text;
  end if;
  v_was := nullif(v_row.data ->> 'parent_id', '')::uuid;

  foreach v_key in array coalesce(p_moved_keys, '{}') loop
    if v_row.data ? v_key then
      v_data := v_data || jsonb_build_object(v_key, v_row.data -> v_key);
    end if;
  end loop;

  -- T5: extracting a Person parent from Practitioner Chen COPIES the shared facts up rather
  -- than moving them, because the Practitioner record is still a Practitioner and still has a
  -- phone number. The two Persons that result are two records — which is exactly why the next
  -- verb in T5 is a merge.
  v_parent := custom.record_write(p_organization_id, p_parent_table_id,
                v_data || case when v_was is null then '{}'::jsonb
                               else jsonb_build_object('parent_id', v_was::text) end);

  v_log := history.migration_record(p_organization_id, 'extract_parent', 'record', p_id,
             jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                'patch', jsonb_build_object('parent_id', v_was),
                                'delete_after', v_parent::text),
             coalesce(p_note, format('a parent was extracted above this record as %s', v_parent)));

  perform custom.record_reparent(p_organization_id, p_id, v_parent);

  return jsonb_build_object('verb', 'extract_parent', 'record_id', p_id, 'parent', v_parent,
                            'was_under', v_was, 'migration_id', v_log, 'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_merge(p_organization_id uuid, p_winner_id uuid, p_loser_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_win      custom.record%rowtype;
  v_lose     custom.record%rowtype;
  v_log      uuid;
  v_moved    integer := 0;
  v_alts_n   integer := 0;
  v_copied   integer := 0;
  v_retired_n integer := 0;
  v_retargeted integer := 0;
  v_detached integer := 0;
  v_data     jsonb;
  v_vals     jsonb;
  v_env      jsonb;
  v_alts     jsonb;
  v_retired  jsonb;
  v_key      text;
  v_val      jsonb;
  v_declared text[];
  v_rtype    text;
  v_typefld  text;
  v_after    jsonb;
  v_checked  text[] := '{}';
  a          record;
  v_retargeted_ids uuid[] := '{}';
  v_detached_ids   uuid[] := '{}';
  v_reparented_ids uuid[] := '{}';
  v_win_after      jsonb;
begin
  -- THE CALLER AND THE TWO ROWS, decided on the one ladder — lane REACH's prologue, kept
  -- verbatim: this verb became a client door while DOOR-FIX 2 was landing, and a merge that
  -- skipped the access question would be a door with no lock. Then the switch:
  -- custom.assert_store_door resolves custom/system_enabled and, while it is false, this
  -- store takes writes only from the role that owns custom.record.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_merge');
  perform custom.assert_client_may_change(p_organization_id, p_winner_id, 'custom.migrate_merge', 'editor'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_loser_id, 'custom.migrate_merge', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_merge');

  if p_winner_id = p_loser_id then
    raise exception 'A record cannot be merged into itself.'
      using errcode = '22023', hint = 'REC-21: nothing was changed.';
  end if;

  select * into v_win  from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id and r.deleted_at is null;
  select * into v_lose from custom.record r
   where r.organization_id = p_organization_id and r.id = p_loser_id and r.deleted_at is null;
  if v_win.id is null or v_lose.id is null then
    raise exception 'Both records have to be here to merge them, and % is not.',
                    coalesce(case when v_win.id is null then p_winner_id else p_loser_id end)
      using errcode = '02000';
  end if;

  -- THE INVERSE, BEFORE ANYTHING MOVES: the loser's whole document, so undo can put both
  -- records and both ids back exactly (T5's last sentence). `unalias` is what
  -- history.migration_undo revokes, so the loser's id stops resolving to the winner.
  v_log := history.migration_record(p_organization_id, 'merge', v_lose.data_class, p_loser_id,
             jsonb_build_object('kind', 'restore', 'record_id', p_loser_id::text,
                                'unalias', p_loser_id::text,
                                'document', v_lose.data),
             coalesce(p_note, format('merged into %s', p_winner_id)));

  -- WHICH KEYS MAY CARRY AN ENVELOPE. VAL-1: a declared Field of the winner's table, chosen
  -- by the winner's own type field where its table has one.
  v_typefld := custom.table_type_field(p_organization_id, v_win.table_id);
  if v_typefld is not null then
    v_rtype := v_win.data ->> v_typefld;
  end if;
  select coalesce(array_agg(f.data ->> 'key'), '{}') into v_declared
    from custom.applicable_fields(p_organization_id, v_win.table_id, v_rtype) f;

  v_data    := v_win.data;
  v_retired := coalesce(v_data -> '_retired', '[]'::jsonb);
  if jsonb_typeof(v_retired) <> 'array' then
    v_retired := '[]'::jsonb;
  end if;

  for v_key, v_val in select * from jsonb_each(v_lose.data) loop
    if left(v_key, 1) = '_' or v_key in ('parent_id') then
      continue;
    end if;

    if not (v_data ? v_key) then
      -- The winner did not hold this at all: it simply moves across.
      v_data := v_data || jsonb_build_object(v_key, v_val);
      v_copied := v_copied + 1;
      v_moved := v_moved + 1;
      v_checked := v_checked || v_key;

    elsif (v_data -> v_key) is distinct from v_val then
      if v_key = any (v_declared) then
        -- T5: the two phone numbers become ALTERNATES inside the winner's one document, each
        -- with its source — never a second record, and never a value quietly overwritten.
        -- BUILT, not poked: jsonb_set cannot create `_values` when it is absent, which is how
        -- this value used to disappear while being counted as taken.
        v_vals := coalesce(v_data -> '_values', '{}'::jsonb);
        if jsonb_typeof(v_vals) <> 'object' then
          v_vals := '{}'::jsonb;
        end if;
        v_env := coalesce(v_vals -> v_key, '{}'::jsonb);
        if jsonb_typeof(v_env) <> 'object' then
          v_env := '{}'::jsonb;
        end if;
        v_alts := coalesce(v_env -> 'alternates', '[]'::jsonb);
        if jsonb_typeof(v_alts) <> 'array' then
          v_alts := '[]'::jsonb;
        end if;
        -- VAL-4: THE RANK IS THE ARRIVAL ORDER, which is the only ordering a merge knows. The
        -- winner's own value is the trusted one and holds no rank; the first record merged in
        -- ranks 1, the next 2. Never a score, never a confidence.
        v_alts := v_alts || jsonb_build_array(jsonb_build_object(
                    'value', v_val,
                    'rank', jsonb_array_length(v_alts) + 1,
                    -- The SOURCE, written as a source. custom.intern_provenance interns it to
                    -- a pointer and files the description in _sources; a caller that wrote the
                    -- pointer itself would be naming something this store owns (VAL-1).
                    'src', jsonb_build_object('kind', 'record', 'id', p_loser_id::text)));
        v_env  := v_env  || jsonb_build_object('alternates', v_alts);
        v_vals := v_vals || jsonb_build_object(v_key, v_env);
        v_data := v_data || jsonb_build_object('_values', v_vals);
        v_alts_n := v_alts_n + 1;
        v_moved := v_moved + 1;
        v_checked := v_checked || v_key;
      else
        -- NOT A DECLARED FIELD OF THIS TABLE, so it cannot carry an envelope (VAL-1) and
        -- cannot become an alternate. It is kept with its reason rather than dropped.
        v_retired := v_retired || jsonb_build_object(
          'key', v_key,
          'value', v_val,
          'envelope', v_lose.data -> '_values' -> v_key,
          'reason', format('merged from record %s; "%s" is not a declared field of this table, so its other value is kept here rather than as an alternate (VAL-1)', p_loser_id, v_key),
          'at', to_jsonb(now()));
        v_retired_n := v_retired_n + 1;
        v_moved := v_moved + 1;
      end if;
    end if;
  end loop;

  if jsonb_array_length(v_retired) > 0 then
    v_data := v_data || jsonb_build_object('_retired', v_retired);
  end if;

  perform custom.record_update(p_organization_id, p_winner_id, v_data);

  -- THE READ-BACK. A merge that says it took a value and wrote nothing is the exact defect
  -- this file exists to close, so it is asserted against the stored document rather than
  -- trusted.
  select r.data into v_after from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id;
  foreach v_key in array v_checked loop
    if not (v_after ? v_key) then
      raise exception 'The merge says it took "%" from the other record and the winner does not hold it. Nothing was merged.', v_key
        using errcode = '23514',
              hint = 'T5 / VAL-4: a value taken in a merge is in the winner''s one document — as the value itself, or as a ranked alternate with its source.';
    end if;
  end loop;
  foreach v_key in array v_checked loop
    if (v_win.data ? v_key) and (v_win.data -> v_key) is distinct from (v_lose.data -> v_key)
       and (v_lose.data ? v_key)
       and v_key = any (v_declared)
       and not exists (select 1 from jsonb_array_elements(
                         coalesce(v_after -> '_values' -> v_key -> 'alternates', '[]'::jsonb)) x
                        where x -> 'value' = v_lose.data -> v_key) then
      raise exception 'The merge says "%" had another value on the other record and the winner carries no alternate for it. Nothing was merged.', v_key
        using errcode = '23514',
              hint = 'T5 / VAL-4: the losing value is kept as a ranked alternate with its source, never overwritten and never dropped.';
    end if;
  end loop;

  -- Everything the loser contained now hangs off the winner, or the merge would orphan it —
  -- and, since the delete door honours containment, would take it with the loser.
  -- TABLE-EXPERIENCE (v7 item 3): which children moved is kept, so an undo moves them back.
  with moved as (
    update custom.record r
       set data = r.data || jsonb_build_object('parent_id', p_winner_id::text)
     where r.organization_id = p_organization_id
       and r.deleted_at is null
       and nullif(r.data ->> 'parent_id', '')::uuid = p_loser_id
    returning r.id)
  select coalesce(array_agg(id), '{}') into v_reparented_ids from moved;

  -- WHAT POINTED AT THE LOSER POINTS AT THE WINNER. REC-21's "forever" for relations, not
  -- only for readers who remember to resolve the id.
  for a in
    select x.id, x.source_type, x.source_id, x.role
      from platform.associations x
     where x.organization_id = p_organization_id
       and x.target_id = p_loser_id and x.deleted_at is null
  loop
    if exists (select 1 from platform.associations y
                where y.source_type = a.source_type and y.source_id = a.source_id
                  and y.target_id = p_winner_id and y.role is not distinct from a.role
                  and y.id <> a.id) then
      update platform.associations set deleted_at = now() where id = a.id;
      v_detached := v_detached + 1;
      v_detached_ids := v_detached_ids || a.id;
    else
      update platform.associations set target_id = p_winner_id where id = a.id;
      v_retargeted := v_retargeted + 1;
      v_retargeted_ids := v_retargeted_ids || a.id;
    end if;
  end loop;

  -- REC-21: FOREVER. The alias goes in BEFORE the loser is deleted, so there is no instant in
  -- which the id resolves to nothing. `revoked_at` is cleared, because an id merged again
  -- after an undo resolves again.
  insert into custom.record_alias (organization_id, old_id, new_id, verb, reason, migration_id)
  values (p_organization_id, p_loser_id, p_winner_id, 'merge',
          coalesce(p_note, 'merged'), v_log)
  on conflict (organization_id, old_id) do update
        set new_id = excluded.new_id, verb = excluded.verb,
            reason = excluded.reason, migration_id = excluded.migration_id,
            revoked_at = null;

  perform custom.record_delete(p_organization_id, p_loser_id);

  -- TABLE-EXPERIENCE (v7 item 3) — EVERYTHING THE MERGE DID, FOR ITS UNDO. The loser's own
  -- document was stored before anything moved; what the merge did to the WINNER and to what
  -- pointed at the loser is only known now, so it joins the same inverse. `custom.migrate_undo`
  -- reads `merge_undo`: the winner's keys as they were (put back only while the winner is still
  -- exactly as the merge left it), the links moved to the winner, the duplicate links withdrawn,
  -- and the children re-parented.
  select r.data into v_win_after from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id;
  update history.migration_log l
     set inverse = l.inverse || jsonb_build_object('merge_undo', jsonb_build_object(
           'winner_id', p_winner_id::text,
           'winner_before', (select coalesce(jsonb_object_agg(k, coalesce(v_win.data -> k, 'null'::jsonb)), '{}'::jsonb)
                               from unnest(v_checked || array['_values', '_retired']) k),
           'winner_after', v_win_after,
           'retargeted', to_jsonb(v_retargeted_ids),
           'detached', to_jsonb(v_detached_ids),
           'reparented', to_jsonb(v_reparented_ids)))
   where l.organization_id = p_organization_id and l.id = v_log;

  return jsonb_build_object('verb', 'merge', 'winner', p_winner_id, 'loser', p_loser_id,
                            'migration_id', v_log, 'values_taken', v_moved,
                            'values_copied', v_copied, 'alternates_added', v_alts_n,
                            'values_retired', v_retired_n,
                            'relations_retargeted', v_retargeted,
                            'relations_detached_as_duplicates', v_detached,
                            'resolves_to', custom.resolve_id(p_organization_id, p_loser_id),
                            'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_rename(p_organization_id uuid, p_id uuid, p_to text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row custom.record%rowtype;
  v_key text;
  v_was text;
  v_log uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_rename');
  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_rename', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_rename');
  select * into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record here to rename.' using errcode = '02000',
            detail = jsonb_build_object('id', p_id)::text;
  end if;

  -- What "the name" IS depends on what this row is: a Table and a Field carry `name`/`label`
  -- of their own, and a record is named by its Table's title field (REC-1).
  v_key := case v_row.data_class
             when 'record' then coalesce(custom.table_type_field(p_organization_id, v_row.table_id), null)
             else null end;
  v_key := case when v_row.data_class = 'record'
                then coalesce((select t.data ->> 'title_field' from custom.record t
                                where t.organization_id = p_organization_id and t.id = v_row.table_id), 'name')
                when v_row.data ? 'name'  then 'name'
                when v_row.data ? 'label' then 'label'
                else 'name' end;
  v_was := v_row.data ->> v_key;

  v_log := history.migration_record(p_organization_id, 'rename', v_row.data_class, p_id,
             jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                'patch', jsonb_build_object(v_key, v_was)),
             coalesce(p_note, format('%s renamed from "%s" to "%s"', v_key, coalesce(v_was, 'nothing'), p_to)));
  perform custom.record_update(p_organization_id, p_id, jsonb_build_object(v_key, p_to));

  return jsonb_build_object('verb', 'rename', 'record_id', p_id, 'field', v_key,
                            'was', v_was, 'now', p_to, 'migration_id', v_log, 'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_reparent(p_organization_id uuid, p_id uuid, p_parent_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_was uuid;
  v_log uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_reparent');
  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_reparent', 'editor'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_parent_id, 'custom.migrate_reparent', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_reparent');
  select nullif(r.data ->> 'parent_id', '')::uuid into v_was
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_id and r.deleted_at is null;
  if not found then
    raise exception 'There is no such record here to move.' using errcode = '02000',
            detail = jsonb_build_object('id', p_id)::text;
  end if;

  v_log := history.migration_record(p_organization_id, 'reparent', 'record', p_id,
             jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                'patch', jsonb_build_object('parent_id', v_was)),
             coalesce(p_note, format('moved from %s to %s', coalesce(v_was::text, 'nothing'), coalesce(p_parent_id::text, 'nothing'))));

  -- REC-24: ONE statement, so the containment edge and every Visibility answer that reads it
  -- change in the same commit. There is no window in which the old audience still reaches it.
  perform custom.record_reparent(p_organization_id, p_id, p_parent_id);

  return jsonb_build_object('verb', 'reparent', 'record_id', p_id, 'was', v_was,
                            'now', p_parent_id, 'migration_id', v_log,
                            'atomic_with_visibility', true, 'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_retype(p_organization_id uuid, p_id uuid, p_to text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row     custom.record%rowtype;
  v_log     uuid;
  v_keep    jsonb;
  v_misfit  jsonb := '{}'::jsonb;
  v_ok      text[];
  v_key     text;
  v_to_tbl  uuid;
  v_was     text;
  v_conv    integer;
  v_ret     integer;
begin
  -- THE CALLER AND THE ROW, on the one ladder, exactly as the other verbs ask it — this verb
  -- is executable by `authenticated` and a door that decides nothing is not a door. Then the
  -- switch: custom.assert_store_door resolves custom/system_enabled.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_retype');
  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_retype', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_retype');

  select * into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record here to retype.' using errcode = '02000',
            detail = jsonb_build_object('id', p_id)::text;
  end if;

  -- ── ARM TWO FIRST, because it is the smaller one: a FIELD changes what it behaves as
  --    (FLD-4 / T12). The values already written are CONVERTED where they convert and kept in
  --    `_retired` with their reason where they do not — by the trigger on the Field row, so
  --    this verb and an ordinary write behave identically.
  if v_row.data_class = 'field' then
    v_was := v_row.data ->> 'type';
    if v_was = p_to then
      return jsonb_build_object('verb', 'retype', 'field_id', p_id, 'was', v_was, 'now', p_to,
                                'changed', false, 'at', now());
    end if;
    v_log := history.migration_record(p_organization_id, 'retype', 'field', p_id,
               jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                  'patch', jsonb_build_object('type', v_was)),
               coalesce(p_note, format('%s behaves as %s instead of %s; values that fit are converted and values that do not are kept in _retired with the reason, neither coerced nor deleted (FLD-4)', coalesce(v_row.data ->> 'label', v_row.data ->> 'key'), p_to, v_was)));
    -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-05): THE CHANGE GOES THROUGH THE ONE DOOR THAT SHAPES
    -- A COLUMN. Writing the bare `type` word left a choice column's list and its several-choices switch
    -- on a column that was now Text, and the shape guard refused it ("is not a list, so it has no
    -- choices to take from a table") — the Sheet's Stores → Text could never change a choice column.
    -- custom.field_update builds the whole document for the new kind (list kept, several choices off,
    -- its default carried); its own trigger converts the values and writes the migration row, which
    -- sees this verb's row and does not write a second.
    perform custom.field_update(p_organization_id, p_id,
              jsonb_build_object('type', case p_to when 'boolean' then 'checkbox'
                                                   when 'range' then 'number'
                                                   else p_to end));
    select count(*) filter (where true) into v_ret
      from custom.record x, lateral jsonb_array_elements(coalesce(x.data -> '_retired', '[]'::jsonb)) e
     where x.organization_id = p_organization_id
       and x.table_id = nullif(v_row.data ->> 'entity_definition_id', '')::uuid
       and x.deleted_at is null
       and e ->> 'key' = (v_row.data ->> 'key');
    select count(*) into v_conv
      from custom.record x
     where x.organization_id = p_organization_id
       and x.table_id = nullif(v_row.data ->> 'entity_definition_id', '')::uuid
       and x.deleted_at is null
       and x.data ? (v_row.data ->> 'key');
    return jsonb_build_object('verb', 'retype', 'field_id', p_id, 'was', v_was, 'now', p_to,
                              'changed', true, 'migration_id', v_log,
                              'records_still_holding_a_value', v_conv,
                              'values_in_retired_for_this_field', v_ret,
                              'values', 'converted where they convert; kept in _retired with the reason where they do not (FLD-4 / T12)',
                              'at', now());
  end if;

  -- ── ARM ONE: a RECORD moves to another Table (REC-N-18 / T9). The id does not change, so
  --    every relation to it still resolves — that is the whole point of the verb.
  select t.id into v_to_tbl from custom.record t
   where t.organization_id = p_organization_id and t.data_class = 'table'
     and t.deleted_at is null
     and (t.id = platform.uuid_or_null(p_to) or t.data ->> 'slug' = p_to or t.data ->> 'name' = p_to)
   limit 1;
  if v_to_tbl is null then
    raise exception 'There is no table "%" in this organization to retype it to.', p_to
      using errcode = '02000', hint = 'REC-N-18: name the table by id, slug or name.';
  end if;

  select coalesce(array_agg(f.data ->> 'key'), '{}')
    into v_ok
    from custom.applicable_fields(p_organization_id, v_to_tbl, null) f;

  v_keep := v_row.data;
  for v_key in select jsonb_object_keys(v_row.data) loop
    if left(v_key, 1) = '_' or v_key in ('parent_id') then
      continue;
    end if;
    if not (v_key = any (v_ok)) then
      v_misfit := v_misfit || jsonb_build_object(v_key, v_row.data -> v_key);
      v_keep := v_keep - v_key;
      -- THE ENVELOPE GOES WITH THE VALUE. A record saying where a value it no longer holds
      -- came from is orphan provenance, and W1-VAL refuses it by name — correctly.
      v_keep := case when v_keep ? '_values'
                     then jsonb_set(v_keep, array['_values'], (v_keep -> '_values') - v_key)
                     else v_keep end;
    end if;
  end loop;

  v_log := history.migration_record(p_organization_id, 'retype', 'record', p_id,
             jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                'patch', v_row.data, 'table_id', v_row.table_id::text),
             coalesce(p_note, format('retyped to %s; %s value(s) did not fit and are in History with this reason, neither coerced nor deleted',
                                     coalesce((select t.data ->> 'name' from custom.record t
                                                where t.organization_id = p_organization_id and t.id = v_to_tbl), p_to),
                                     (select count(*) from jsonb_object_keys(v_misfit)))));

  update custom.record r
     set table_id = v_to_tbl, data = v_keep
   where r.organization_id = p_organization_id and r.id = p_id;

  return jsonb_build_object('verb', 'retype', 'record_id', p_id, 'kept_the_id', true,
                            'from_table', v_row.table_id, 'to_table', v_to_tbl,
                            'migration_id', v_log,
                            'misfits', v_misfit,
                            'misfits_are', 'in History with the reason, on migration ' || v_log::text,
                            'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_split(p_organization_id uuid, p_record_id uuid, p_moved_keys text[], p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row  custom.record%rowtype;
  v_new  uuid;
  v_keep jsonb;
  v_side jsonb := '{}'::jsonb;
  v_key  text;
  v_log  uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_split');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.migrate_split', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_split');

  select * into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record here to split.' using errcode = '02000',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;
  if p_moved_keys is null or array_length(p_moved_keys, 1) is null then
    raise exception 'A split has to say what moves to the other side.'
      using errcode = '22004',
            hint = 'REC-22: name the fields that go to the new record. Everything else stays where it is, on the id that everything already points at.';
  end if;

  v_keep := v_row.data;
  foreach v_key in array p_moved_keys loop
    if v_row.data ? v_key then
      v_side := v_side || jsonb_build_object(v_key, v_row.data -> v_key);
      v_keep := v_keep - v_key;
      -- The value's envelope goes with the value. Leaving it behind would be a record
      -- carrying provenance for something it no longer holds.
      v_keep := case when v_keep ? '_values'
                     then jsonb_set(v_keep, array['_values'], (v_keep -> '_values') - v_key)
                     else v_keep end;
    end if;
  end loop;

  -- REC-22: ONE SIDE KEEPS THE ID, and it is the original record — never a new pair of ids
  -- with the old one pointing at one of them, because every relation, bookmark and citation
  -- out there already names it.
  v_new := custom.record_write(p_organization_id, v_row.table_id,
             v_side || jsonb_build_object('parent_id', nullif(v_row.data ->> 'parent_id', '')));

  v_log := history.migration_record(p_organization_id, 'split', v_row.data_class, p_record_id,
             jsonb_build_object('kind', 'patch', 'record_id', p_record_id::text,
                                'patch', v_row.data, 'delete_after', v_new::text),
             coalesce(p_note, format('split %s off into %s', array_to_string(p_moved_keys, ', '), v_new)));

  -- A SPLIT MOVES. `custom.record_update` is `data || patch`, so a shortened document handed
  -- to it removes nothing and the value stays on both sides — measured 2026-09-18. The write
  -- is direct, and every BEFORE trigger on custom.record still runs on it.
  update custom.record r
     set data = v_keep
   where r.organization_id = p_organization_id and r.id = p_record_id;

  -- The NEW side is recorded as having come from the keeper. The keeper's own id is NOT
  -- aliased: `custom.resolve_id` answers with it, because it never stopped being a record.
  insert into custom.record_alias (organization_id, old_id, new_id, verb, reason, migration_id)
  values (p_organization_id, v_new, p_record_id, 'split',
          coalesce(p_note, 'split off from the record that kept the id'), v_log)
  on conflict (organization_id, old_id) do nothing;

  return jsonb_build_object('verb', 'split', 'kept_the_id', p_record_id, 'new_record', v_new,
                            'migration_id', v_log, 'moved', to_jsonb(p_moved_keys),
                            'old_id_resolves_to', custom.resolve_id(p_organization_id, p_record_id),
                            'at', now());
end;
$function$;

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
                                          'editor'::public.permission_level, 'record');
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

CREATE OR REPLACE FUNCTION custom.record_change_many(p_organization_id uuid, p_table_id uuid, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n         integer;
  v_ceiling   integer;
  v_i         integer;
  v_change    jsonb;
  v_op        text;
  v_key       text;
  v_id        uuid;
  v_out       jsonb[];
  v_inserts   jsonb[] := array[]::jsonb[];
  v_insert_at integer[] := array[]::integer[];
  v_new_ids   uuid[];
  v_patches   jsonb := '{}'::jsonb;   -- record id -> the merged patch (one row is updated once)
  v_expected  jsonb := '{}'::jsonb;   -- record id -> the version the caller wrote against
  v_first_at  jsonb := '{}'::jsonb;   -- record id -> the first change (0-based) that named it
  v_versions  jsonb := '{}'::jsonb;   -- record id -> the version the update produced
  v_patch     jsonb;
  v_current   integer;
  v_at        timestamptz;
  v_state     text;
  v_msg       text;
  v_detail    text;
  v_hint      text;
begin
  -- The switch, then the editor rung on the Table — the same two questions custom.record_write_many
  -- asks, once for the batch. Every record is then asked its own rung below, as record_update asks.
  perform custom.assert_store_door(p_organization_id, 'custom.record_change_many');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.record_change_many',
                                          'edit_content'::public.permission_level, 'table');
  -- VISION-REACH W4 (a): the organization's "Agent changes" setting, enforced here (custom._agent_change_gate).
  perform custom._agent_change_gate(p_organization_id, p_table_id, 'custom.record_change_many');

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'custom.record_change_many: the changes must be a list, and they are a %', coalesce(jsonb_typeof(p_changes), 'nothing')
      using errcode = '22023',
            hint = 'Send [{"op":"update","record_id":…,"patch":{…}}, {"op":"archive","record_id":…}, {"op":"insert","data":{…}}]. Nothing was written.';
  end if;
  v_n := jsonb_array_length(p_changes);
  if v_n = 0 then
    return '[]'::jsonb;
  end if;
  v_ceiling := custom.page_ceiling(p_organization_id);
  if v_n > v_ceiling then
    raise exception 'This batch holds % changes, and the store takes at most % in one transaction, so nothing was written rather than part of it.', v_n, v_ceiling
      using errcode = '54000',
            hint = 'Split the changes into batches of ' || v_ceiling || ' or fewer. An organization that genuinely writes bigger batches raises the knob custom/page_size_ceiling.';
  end if;
  v_out := array_fill(null::jsonb, array[v_n]);

  -- ── read the batch: every change is checked for shape before anything is written ──
  for v_i in 0 .. v_n - 1 loop
    v_change := p_changes -> v_i;
    v_op := coalesce(v_change ->> 'op', 'update');
    begin
      if v_op = 'insert' then
        v_inserts := v_inserts || coalesce(v_change -> 'data', '{}'::jsonb);
        v_insert_at := v_insert_at || v_i;
        continue;
      end if;
      if v_op not in ('update', 'archive') then
        raise exception 'custom.record_change_many: "%" is not a change this door makes.', v_op
          using errcode = '22023', hint = 'Each change is an insert, an update or an archive.';
      end if;
      v_id := (v_change ->> 'record_id')::uuid;
      if v_id is null or not exists (
           select 1 from custom.record r
            where r.organization_id = p_organization_id and r.id = v_id
              and r.table_id = p_table_id and r.deleted_at is null) then
        raise exception 'There is no record % in this table any more.', coalesce(v_change ->> 'record_id', '(no id)')
          using errcode = '02000',
                hint = 'It was archived, it belongs to another table, or it never existed here.';
      end if;
      -- The editor rung on THIS record, the question custom.record_update asks first.
      perform custom.assert_client_may_change(p_organization_id, v_id, 'custom.record_change_many', 'edit_content'::public.permission_level, 'record');
      v_key := v_id::text;
      if not (v_first_at ? v_key) then
        v_first_at := v_first_at || jsonb_build_object(v_key, v_i);
      end if;
      if v_op = 'update' then
        v_patch := v_change -> 'patch';
        if v_patch is null or jsonb_typeof(v_patch) <> 'object' then
          raise exception 'custom.record_change_many: the patch must be an object of field key -> value, and it is a %', coalesce(jsonb_typeof(v_patch), 'nothing')
            using errcode = '22023';
        end if;
        -- The envelope key comes off before the merge, exactly as in custom.record_update.
        v_patch := custom._take_op_id(v_patch, 'custom.record_change_many');
        v_patches := v_patches || jsonb_build_object(v_key, coalesce(v_patches -> v_key, '{}'::jsonb) || v_patch);
        if v_change ? 'expected_version' and nullif(v_change ->> 'expected_version', '') is not null then
          v_expected := v_expected || jsonb_build_object(v_key, (v_change ->> 'expected_version')::integer);
        end if;
      end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text,
                              v_detail = pg_exception_detail, v_hint = pg_exception_hint;
      raise exception using errcode = v_state, message = v_msg, detail = coalesce(v_detail, ''),
        hint = format('Nothing in this batch of %s changes was saved: change %s (record %s) was refused, and the batch is one transaction.',
                      v_n, v_i + 1, coalesce(v_change ->> 'record_id', 'new'))
               || coalesce(' ' || nullif(v_hint, ''), '');
    end;
  end loop;

  -- ── 1. new records, in ONE statement through custom.record_write_many ──
  if cardinality(v_inserts) > 0 then
    begin
      v_new_ids := custom.record_write_many(p_organization_id, p_table_id, v_inserts, null);
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text,
                              v_detail = pg_exception_detail, v_hint = pg_exception_hint;
      raise exception using errcode = v_state, message = v_msg, detail = coalesce(v_detail, ''),
        hint = format('Nothing in this batch of %s changes was saved: one of its %s new records was refused, and the batch is one transaction.', v_n, cardinality(v_inserts))
               || coalesce(' ' || nullif(v_hint, ''), '');
    end;
    for v_i in 1 .. cardinality(v_insert_at) loop
      v_out[v_insert_at[v_i] + 1] := jsonb_build_object('op', 'insert', 'id', v_new_ids[v_i]);
    end loop;
  end if;

  -- ── 2. every update in ONE statement: statement triggers (the change notice, the history,
  --      the activity bridge) fire once for the batch; row triggers (validation, the value
  --      envelope, the write door) fire for every row, exactly as for one record ──
  if v_patches <> '{}'::jsonb then
    begin
      with changed as (
        update custom.record r
           set data = r.data || p.value
          from jsonb_each(v_patches) p
         where r.organization_id = p_organization_id
           and r.table_id = p_table_id
           and r.id = p.key::uuid
           and r.deleted_at is null
           and (not (v_expected ? p.key) or r.version = (v_expected ->> p.key)::integer)
        returning r.id, r.version)
      select coalesce(jsonb_object_agg(c.id::text, c.version), '{}'::jsonb) into v_versions from changed c;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text,
                              v_detail = pg_exception_detail, v_hint = pg_exception_hint;
      -- WHICH change? The statement answers for the set; the one-record door answers for a row.
      -- Each update is replayed through custom.record_update (the failed statement is already
      -- rolled back) until one refuses, and THAT refusal is raised with its position.
      for v_key, v_patch in select e.key, e.value from jsonb_each(v_patches) e
                             order by (v_first_at ->> e.key)::integer loop
        begin
          perform custom.record_update(p_organization_id, v_key::uuid, v_patch, (v_expected ->> v_key)::integer);
        exception when others then
          get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text,
                                  v_detail = pg_exception_detail, v_hint = pg_exception_hint;
          raise exception using errcode = v_state, message = v_msg, detail = coalesce(v_detail, ''),
            hint = format('Nothing in this batch of %s changes was saved: change %s (record %s) was refused, and the batch is one transaction.',
                          v_n, (v_first_at ->> v_key)::integer + 1, v_key)
                   || coalesce(' ' || nullif(v_hint, ''), '');
        end;
      end loop;
      raise exception using errcode = v_state, message = v_msg, detail = coalesce(v_detail, ''),
        hint = format('Nothing in this batch of %s changes was saved: the changes were refused together, though none is refused alone.', v_n)
               || coalesce(' ' || nullif(v_hint, ''), '');
    end;

    -- A row the statement did not change was archived meanwhile, or moved past the version the
    -- caller wrote against: the same two answers custom.record_update gives, for that change.
    for v_key in select e.key from jsonb_each(v_patches) e
                  where not (v_versions ? e.key)
                  order by (v_first_at ->> e.key)::integer loop
      select r.version into v_current from custom.record r
       where r.organization_id = p_organization_id and r.id = v_key::uuid and r.deleted_at is null;
      if v_current is null then
        raise exception 'There is no record % in this organization any more - somebody deleted it while you were working on it.', v_key
          using errcode = '02000',
                hint = format('Nothing in this batch of %s changes was saved: change %s was refused, and the batch is one transaction.',
                              v_n, (v_first_at ->> v_key)::integer + 1);
      end if;
      raise exception 'Someone else changed this record while you were working on it. You wrote against version %, and version % is the one that won.',
                      v_expected ->> v_key, v_current
        using errcode = 'PT409',
              detail = jsonb_build_object('expected_version', (v_expected ->> v_key)::integer,
                                          'current_version',  v_current,
                                          'record_id',        v_key)::text,
              hint = format('Nothing in this batch of %s changes was saved: change %s was refused, and the batch is one transaction. Look at what changed and write it again against version %s.',
                            v_n, (v_first_at ->> v_key)::integer + 1, v_current);
    end loop;

    -- The columns the patch named must be the Table's own, the check custom.record_update makes.
    for v_key, v_patch in select e.key, e.value from jsonb_each(v_patches) e loop
      perform custom.assert_columns_are_defined(p_organization_id, v_key::uuid, v_patch);
    end loop;
  end if;

  -- ── 3. archives, one record at a time through custom.record_delete (it cascades by rule) ──
  for v_i in 0 .. v_n - 1 loop
    v_change := p_changes -> v_i;
    v_op := coalesce(v_change ->> 'op', 'update');
    if v_op = 'update' then
      v_key := v_change ->> 'record_id';
      v_out[v_i + 1] := jsonb_build_object('op', 'update', 'id', v_key, 'version', (v_versions ->> lower(v_key))::integer);
    elsif v_op = 'archive' then
      begin
        v_at := custom.record_delete(p_organization_id, (v_change ->> 'record_id')::uuid);
      exception when others then
        get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text,
                                v_detail = pg_exception_detail, v_hint = pg_exception_hint;
        raise exception using errcode = v_state, message = v_msg, detail = coalesce(v_detail, ''),
          hint = format('Nothing in this batch of %s changes was saved: change %s (record %s) was refused, and the batch is one transaction.',
                        v_n, v_i + 1, v_change ->> 'record_id')
                 || coalesce(' ' || nullif(v_hint, ''), '');
      end;
      v_out[v_i + 1] := jsonb_build_object('op', 'archive', 'id', v_change ->> 'record_id', 'archived_at', v_at);
    end if;
  end loop;

  return to_jsonb(v_out);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.record_reparent(p_organization_id uuid, p_record_id uuid, p_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_reparent');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_reparent', 'editor'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.record_reparent');
  if p_organization_id is null or p_record_id is null then
    raise exception 'custom.record_reparent: the organization and the record are required'
      using errcode = '22004';
  end if;
  -- ARGS-RULED (2026-09-21). THE PARENT IS A RECORD YOU MAY OPEN, IN THIS ORGANIZATION.
  -- `parent_id` is a CARRYING edge: `custom.visibility_ancestors` walks it and
  -- `custom.reaches_directly` arm 3 says an ancestor conveys its level to what is inside it. So
  -- this argument decides WHO ELSE can reach the record being moved — and it was never asked
  -- about. A caller could put their record inside a container they cannot see (handing it to
  -- whoever holds that container, and adding a row to a list its owner never added to), or name
  -- an id in another organization entirely and leave a pointer to nothing.
  -- `viewer` and not `editor`: filing something into a container is not changing the container,
  -- and the store already decides changing it separately.
  if p_parent_id is not null then
    perform custom.assert_client_may_open(p_organization_id, p_parent_id, 'custom.record_reparent',
                                          'viewer'::public.permission_level, 'record');
  end if;

  update custom.record r
     set data = case when p_parent_id is null
                     then r.data - 'parent_id'
                     else r.data || jsonb_build_object('parent_id', p_parent_id::text) end
   where r.organization_id = p_organization_id and r.id = p_record_id;
  if not found then
    raise exception 'that record is not in this organization' using errcode = '23503';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.record_update(p_organization_id uuid, p_record_id uuid, p_patch jsonb, p_expected_version integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_new       integer;
  v_current   integer;
  v_contested jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.record_update');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_update', 'edit_content'::public.permission_level, 'record');
  -- VISION-REACH W4 (a): the organization's "Agent changes" setting, enforced here (custom._agent_change_gate).
  perform custom._agent_change_gate(p_organization_id, null, 'custom.record_update', p_record_id);

  if p_organization_id is null or p_record_id is null then
    raise exception 'custom.record_update: organization_id and the record id are both required - the store is keyed (organization_id, id)'
      using errcode = '22004';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'custom.record_update: the patch must be an object of field key -> value, and it is a %', coalesce(jsonb_typeof(p_patch), 'nothing')
      using errcode = '22023';
  end if;

  -- THE ENVELOPE KEY COMES OFF BEFORE THE MERGE. `data || p_patch` would otherwise write it
  -- straight into the record, where it would then be a column nobody declared, forever.
  p_patch := custom._take_op_id(p_patch, 'custom.record_update');
  if p_patch = '{}'::jsonb then
    raise exception 'custom.record_update: the patch is empty once the platform envelope keys are taken off it, so there is nothing to write.'
      using errcode = '22023',
            hint = 'Nothing was written. Send at least one field key -> value beside _op_id.';
  end if;

  -- THE OPT-IN POSTURE, KEPT. A write that declares no base revision behaves exactly as a
  -- direct UPDATE always has: last-write-wins.
  if p_expected_version is null then
    update custom.record
       set data = data || p_patch
     where organization_id = p_organization_id and id = p_record_id and deleted_at is null
    returning version into v_new;
    if v_new is null then
      raise exception 'There is no such record in this organization any more.' using errcode = '02000',
              hint = 'It was deleted, or it never existed here. The store is keyed (organization_id, id), so a record from another organization is not found by this one.',
            detail = jsonb_build_object('record_id', p_record_id)::text;
    end if;
    perform custom.assert_columns_are_defined(p_organization_id, p_record_id, p_patch);
    return v_new;
  end if;

  -- THE COMPARE-AND-SWAP.
  update custom.record
     set data = data || p_patch
   where organization_id = p_organization_id and id = p_record_id and deleted_at is null
     and version = p_expected_version
  returning version into v_new;
  if v_new is not null then
    perform custom.assert_columns_are_defined(p_organization_id, p_record_id, p_patch);
    return v_new;
  end if;

  select r.version into v_current
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  if v_current is null then
    raise exception 'There is no such record in this organization any more - somebody deleted it while you were working on it.' using errcode = '02000',
            hint = 'Nothing was written. The record is gone, so there is nothing to merge into: keep your work somewhere else, or write it as a new record.',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;

  select jsonb_object_agg(k.key, r.data -> k.key) into v_contested
    from custom.record r, lateral jsonb_object_keys(p_patch) k(key)
   where r.organization_id = p_organization_id and r.id = p_record_id;

  raise exception 'Someone else changed this record while you were working on it. You wrote against version %, and version % is the one that won.',
                  p_expected_version, v_current
    using errcode = 'PT409',
          detail = jsonb_build_object('expected_version', p_expected_version,
                                      'current_version',  v_current,
                                      'contested_fields', coalesce(v_contested, '{}'::jsonb))::text,
          hint = format('Nothing was overwritten and nothing was lost - their work is still there and yours is still in your hands. Look at what changed (it is in this error, field by field), decide keep-mine, keep-theirs or merged, and write it again against version %s. Resolution is just another write.', v_current);
end
$function$;

CREATE OR REPLACE FUNCTION custom.record_upsert(p_organization_id uuid, p_table_id uuid, p_key text[], p_data jsonb, p_expected_version integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_rules jsonb;
  v_keys  text[];
  v_key   text;
  v_label text;
  v_text  text;
  v_id    uuid;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.record_upsert');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_upsert');
  if p_table_id is null then
    raise exception 'Say which table to write into.'
      using errcode = '22004', hint = 'Nothing was written.';
  end if;
  -- THE TABLE'S OWN WALL FIRST, as custom.record_write asks it: a Table she may not add records to
  -- is refused here, before its rules or its records are read — the same 42501 an invented id gets.
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.record_upsert',
                                          'edit_content'::public.permission_level, 'table');
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'The values to write must be an object of column key to value.'
      using errcode = '22023', hint = 'Nothing was written.';
  end if;
  select coalesce(array_agg(distinct btrim(k) order by btrim(k)), '{}'::text[]) into v_keys
    from unnest(coalesce(p_key, '{}'::text[])) k
   where nullif(btrim(k), '') is not null;
  if cardinality(v_keys) = 0 then
    raise exception 'Say which column finds the record.'
      using errcode = '22023',
            hint = 'Name the unique column (for example the phone number) that says which record this is. Nothing was written.';
  end if;

  v_rules := custom.table_unique_rule_fields(p_organization_id, p_table_id);

  foreach v_key in array v_keys loop
    select coalesce(nullif(f ->> 'label', ''), v_key) into v_label
      from jsonb_array_elements(v_rules) f
     where f ->> 'key' = v_key
     limit 1;
    if v_label is null then
      select coalesce(nullif(r.data ->> 'label', ''), v_key) into v_label
        from custom.record r
       where r.organization_id = p_organization_id
         and r.table_id = custom.field_kernel_id()
         and r.data_class = 'field'
         and r.deleted_at is null
         and r.data ->> 'entity_definition_id' = p_table_id::text
         and r.data ->> 'key' = v_key
       limit 1;
      raise exception '"%" can''t find a record: it isn''t a unique column.', coalesce(v_label, v_key)
        using errcode = '23514',
              hint = format('Turn on Unique for %s in its column settings, then write again. Nothing was written.', coalesce(v_label, v_key));
    end if;

    v_text := lower(btrim(p_data ->> v_key));
    if v_text is null or v_text = '' then
      raise exception '"%" needs a value: it says which record this is.', v_label
        using errcode = '22023', hint = 'Nothing was written.';
    end if;

    -- THE SAME LOCK custom._unique_rule_holds TAKES for this value: re-entrant in this
    -- transaction, and the one a racing write of the same value waits on.
    perform pg_advisory_xact_lock(
      hashtextextended(p_organization_id::text || '|' || p_table_id::text || '|' || v_key || '|' || v_text, 0));
    v_label := null;
  end loop;

  select x.id into v_id
    from custom.record x
   where x.organization_id = p_organization_id
     and x.table_id = p_table_id
     and x.deleted_at is null
     and not exists (select 1 from unnest(v_keys) k
                      where lower(btrim(x.data ->> k)) is distinct from lower(btrim(p_data ->> k)))
   order by x.created_at, x.id
   limit 1;

  if v_id is not null then
    perform custom.record_update(p_organization_id, v_id, p_data, p_expected_version);
    return v_id;
  end if;

  -- "I EXPECT VERSION N" AND THERE IS NOTHING: the record she read is gone (archived), or never
  -- held this key. Writing a new one would quietly turn an edit into a second record, so it is the
  -- same refusal record_update gives a write that lost — PT409, its DETAIL shape, current_version 0
  -- meaning "no live record" — and nothing is written.
  if p_expected_version is not null then
    raise exception 'The record you were changing is not here any more. You wrote against version %, and no live record holds "%".',
                    p_expected_version,
                    (select string_agg(btrim(p_data ->> k), ', ' order by k) from unnest(v_keys) k)
      using errcode = 'PT409',
            detail = jsonb_build_object('expected_version', p_expected_version,
                                        'current_version',  0,
                                        'contested_fields', '{}'::jsonb)::text,
            hint = 'Nothing was written. Read the table again: if it was archived, restore it; to add it as a new record, write again without a version.';
  end if;
  return custom.record_write(p_organization_id, p_table_id, p_data);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.record_write_graph(p_organization_id uuid, p_table_id uuid, p_parent jsonb, p_edges jsonb DEFAULT '[]'::jsonb, p_children jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_parent_id  uuid;
  v_existing   boolean := false;
  v_kind       text;
  v_table      uuid;
  v_child_ids  uuid[] := '{}'::uuid[];
  v_edge_ids   uuid[] := '{}'::uuid[];
  v_op_id      text;
  v_item       jsonb;
  v_data       jsonb;
  v_ord        integer := 0;
  v_run_rows   jsonb[] := '{}'::jsonb[];
  v_run_ids    uuid[] := '{}'::uuid[];
  v_run_table  uuid;
  v_run_open   boolean := false;
  v_this_table uuid;
  v_children   jsonb[];
  v_n          integer;
  v_edge_id    uuid;
  v_role       text;
  v_targets    jsonb;
  v_relations  integer := 0;
  v_dir        text;
  v_where      text;
  v_state      text;
  v_msg        text;
  v_detail     text;
  v_hint       text;
begin
  -- THE SHAPE IS CHECKED BEFORE ANYTHING IS WRITTEN, because a refusal halfway through a graph
  -- is the one outcome this door exists to make impossible, and a caller that handed in the
  -- wrong shape deserves to be told so before it has paid for a single insert.
  if p_organization_id is null then
    raise exception 'custom.record_write_graph: organization_id is required - the store is keyed (organization_id, id)'
      using errcode = '22004';
  end if;
  -- A PARENT IS EITHER THE DOCUMENT TO MINT OR A REFERENCE TO THE ONE THAT IS ALREADY THERE,
  -- and `_record_id` says which. It is an ENVELOPE key, in the family the store already
  -- reserves (`_op_id`, `_actor`, `_on_behalf_of`; `custom.undeclared_keys` exempts every
  -- `_`-prefixed key), and never `id`, which is an ordinary FIELD of an ordinary document.
  v_kind := coalesce(jsonb_typeof(p_parent), 'null');
  if v_kind <> 'object' then
    raise exception 'custom.record_write_graph: a graph is a PARENT and everything that belongs to it, and no parent document was handed in (got %)', v_kind
      using errcode = '22004',
            hint = 'NOTHING WAS WRITTEN. To MINT the parent, hand it in as one jsonb object, exactly as custom.record_write takes it. To hang these lines on a parent that ALREADY stands, hand in {"_record_id": "<uuid>"}.';
  end if;
  v_existing := nullif(p_parent ->> '_record_id', '') is not null;
  if v_existing then
    -- A REFERENCE IS NOT A DOCUMENT. A caller that handed in both thinks it is minting AND
    -- repairing, and only one of those can happen — so it is told, rather than having one half
    -- of its intention silently dropped.
    if exists (select 1 from jsonb_object_keys(p_parent) k where left(k, 1) <> '_') then
      raise exception 'custom.record_write_graph: the parent names an existing record (_record_id) and also carries the document keys %', (select string_agg(k, ', ' order by k) from jsonb_object_keys(p_parent) k where left(k, 1) <> '_')
        using errcode = '22023',
              hint = 'NOTHING WAS WRITTEN. `_record_id` says "hang these lines on the parent that already stands", so there is no document to write and those keys would be thrown away. Either drop them, or drop `_record_id` and mint a new parent from the whole document.';
    end if;
    begin
      v_parent_id := (p_parent ->> '_record_id')::uuid;
    exception when others then
      raise exception 'custom.record_write_graph: _record_id is %, which is not a record id', left(p_parent ->> '_record_id', 64)
        using errcode = '22004',
              hint = 'NOTHING WAS WRITTEN. `_record_id` is the id of the record these lines belong to; leave the key out entirely to mint a new parent from this document.';
    end;
  else
    v_parent_id := gen_random_uuid();
  end if;
  v_where := case when v_existing then format('the existing parent %s', v_parent_id) else 'the parent record' end;
  if p_edges is not null and jsonb_typeof(p_edges) <> 'array' then
    raise exception 'custom.record_write_graph: p_edges is the list of edges this parent stands on, and this is %', jsonb_typeof(p_edges)
      using errcode = '22023',
            hint = 'NOTHING WAS WRITTEN. One edge is a list of one.';
  end if;
  if p_children is not null and jsonb_typeof(p_children) <> 'array' then
    raise exception 'custom.record_write_graph: p_children is the list of rows that belong to this parent, and this is %', jsonb_typeof(p_children)
      using errcode = '22023',
            hint = 'NOTHING WAS WRITTEN. One child is a list of one.';
  end if;
  if v_existing
     and coalesce(jsonb_array_length(coalesce(p_children, '[]'::jsonb)), 0) = 0
     and coalesce(jsonb_array_length(coalesce(p_edges, '[]'::jsonb)), 0) = 0 then
    raise exception 'custom.record_write_graph: names an existing parent and nothing to hang on it' using errcode = '22004',
            hint = 'NOTHING WAS WRITTEN, and nothing was going to be. The `_record_id` arm exists to give a parent that already stands the lines it never got; a call with no children and no edges would open a transaction, take the parent''s locks and change nothing, which reads to its caller exactly like a graph that landed.',
            detail = jsonb_build_object('parent_id', v_parent_id)::text;
  end if;

  -- THE SWITCH, THEN THE ORGANIZATION, THEN THE TABLE — the same two predicates
  -- `custom.record_write` asks and `custom.record_write_many` asks once for a batch, asked ONCE
  -- here for the whole graph. They are asked BY THIS BODY and not only by the door it calls,
  -- because they are questions about the caller, the organization and the Table, none of which
  -- can change between the parent and child nineteen — and because a door that only ever
  -- decided inside something it calls is a door whose own text says nothing about who may open
  -- it. `custom.record_write_many` asks them again per statement; that is the same two reads,
  -- and the second answer is the one that governs, so nothing here weakens or replaces it.
  perform custom.assert_store_door(p_organization_id, 'custom.record_write_graph');

  v_table := p_table_id;
  if v_existing then
    -- THE PARENT HAS TO REALLY BE THERE, and the answer to "it is not" is the same answer as
    -- "it is not yours" and "it has been archived" — one sqlstate, one sentence. A door that
    -- told those three apart would let a caller learn which record ids exist by trying them.
    select r.table_id into v_table
      from custom.record r
     where r.organization_id = p_organization_id
       and r.id = v_parent_id
       and r.deleted_at is null;
    if not found then
      raise exception 'custom.record_write_graph: there is no such live record you may write to, so there is no parent to hang these lines on' using errcode = '42501',
              hint = 'NOTHING WAS WRITTEN. A record that is not there, one that belongs to another organization and one that has been archived all answer this way on purpose. Check the id, the organization, and whether the parent was archived — an archived parent is restored before its lines are written, never given children while it is away.',
            detail = jsonb_build_object('parent_id', v_parent_id)::text;
    end if;
    -- THE SAME LADDER, ASKED ABOUT THE PARENT ITSELF. Giving a record lines IS changing it, so
    -- it is the editor rung on THAT record — not merely membership of the organization and not
    -- merely the rung on the children's Table. This is `custom.assert_client_may_change`, the
    -- one predicate every structural door in the store asks; `platform.relation_set` asks it
    -- again per field a moment later and the second answer governs, so nothing here replaces or
    -- weakens it. It is asked HERE as well because a refusal after the children are written is
    -- exactly the half-write this door exists to make impossible.
    perform custom.assert_client_may_change(p_organization_id, v_parent_id, 'custom.record_write_graph',
                                            'edit_content'::public.permission_level, 'record');
    -- The children default to the PARENT'S OWN Table when the caller named none, which is the
    -- ordinary repair: the lines of a record live where the record lives.
    v_table := coalesce(p_table_id, v_table);
  end if;
  -- KINDS-GLUE N-C6 (CHAIR-DOORS-2): ADDING a record is the editor rung on the Table, except on a
  -- Table the app keeps for agent outputs, where every member who may see it may add (viewer);
  -- changing a record already there is still decided on that record, so a member edits only her own.
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.record_write_graph',
                                          custom.table_add_rung(p_organization_id, v_table), 'table');

  -- ONE GRAPH IS ONE CLIENT OPERATION, so the parent's op id is the whole graph's op id. Read
  -- here and NOT removed: `custom.record_write_many` lifts it off through `custom._take_op_id`,
  -- which is the one place the envelope key is validated and the one place it is stripped.
  -- On the existing-parent arm there is no parent document to carry it, so it is read off the
  -- FIRST child and handed to all of them — the same rule, from the only row that can hold it.
  if v_existing then
    v_op_id := case when (p_children -> 0 -> 'data') ? '_op_id'
                    then p_children -> 0 -> 'data' ->> '_op_id' else null end;
  else
    v_op_id := case when p_parent ? '_op_id' then p_parent ->> '_op_id' else null end;
  end if;

  begin
    -- ── THE PARENT ────────────────────────────────────────────────────────────────────────
    -- Through the batch door with a batch of one and an id handed in, so the parent's id is
    -- known before its edges are written and every predicate, guard and trigger is the one
    -- `custom.record_write` would have run.
    if not v_existing then
      perform custom.record_write_many(p_organization_id, v_table,
                                       array[p_parent]::jsonb[], array[v_parent_id]::uuid[]);
    end if;

    -- ── THE EDGES THE PARENT STANDS ON ───────────────────────────────────────────────────
    v_ord := 0;
    for v_item in select * from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) loop
      v_ord := v_ord + 1;
      v_where := format('edge %s of %s', v_ord, jsonb_array_length(coalesce(p_edges, '[]'::jsonb)));
      if jsonb_typeof(v_item) <> 'object'
         or nullif(v_item ->> 'entity', '') is null
         or nullif(v_item ->> 'id', '') is null then
        raise exception 'custom.record_write_graph: %s names no entity or no row', v_where
          using errcode = '22004',
                hint = 'An edge is {"entity": <entity token>, "id": <uuid>, "direction": "in"|"out"}. NOTHING WAS WRITTEN.';
      end if;
      v_dir := coalesce(nullif(v_item ->> 'direction', ''), 'in');
      if v_dir not in ('in', 'out') then
        raise exception 'custom.record_write_graph: % says direction %, and an edge points either "in" (that thing produced this record) or "out" (this record points at that thing)', v_where, v_dir
          using errcode = '22023', hint = 'NOTHING WAS WRITTEN.';
      end if;

      -- THE ONE ASSOCIATION WRITER. `public.assoc_add` decides access at BOTH endpoints, derives
      -- the edge's organization from a real endpoint rather than trusting the caller, and revives
      -- a tombstoned edge in place instead of duplicating it. A raw insert here would skip all
      -- three, which is the whole reason the assoc_* family exists.
      if v_dir = 'in' then
        v_edge_id := public.assoc_add(
          p_source_type => v_item ->> 'entity',
          p_source_id   => (v_item ->> 'id')::uuid,
          p_target_type => 'record',
          p_target_id   => v_parent_id,
          p_org_id      => p_organization_id,
          p_label       => nullif(v_item ->> 'label', ''),
          p_metadata    => coalesce(v_item -> 'metadata', '{}'::jsonb),
          p_role        => nullif(v_item ->> 'role', ''),
          p_position    => nullif(v_item ->> 'position', '')::integer);
      else
        v_edge_id := public.assoc_add(
          p_source_type => 'record',
          p_source_id   => v_parent_id,
          p_target_type => v_item ->> 'entity',
          p_target_id   => (v_item ->> 'id')::uuid,
          p_org_id      => p_organization_id,
          p_label       => nullif(v_item ->> 'label', ''),
          p_metadata    => coalesce(v_item -> 'metadata', '{}'::jsonb),
          p_role        => nullif(v_item ->> 'role', ''),
          p_position    => nullif(v_item ->> 'position', '')::integer);
      end if;
      v_edge_ids := v_edge_ids || v_edge_id;
    end loop;

    -- ── THE ROWS THAT BELONG TO THE PARENT ───────────────────────────────────────────────
    select array_agg(e order by n) into v_children
      from jsonb_array_elements(coalesce(p_children, '[]'::jsonb)) with ordinality t(e, n);
    v_n := coalesce(cardinality(v_children), 0);

    if v_n > 0 then
      -- A CHILD THAT NAMES NO FIELD IS REFUSED, and it is refused BEFORE the parent exists
      -- rather than left as a row nothing points at. A graph is a parent and the lines it
      -- promised; a line that cannot say which promise it fills is not one of them.
      for v_ord in 1..v_n loop
        if nullif(v_children[v_ord] ->> 'role', '') is null then
          v_where := format('child %s of %s', v_ord, v_n);
          raise exception 'custom.record_write_graph: % names no field of its parent', v_where
            using errcode = '23514',
                  hint = 'REL-10 / T7: a relation on a record IS a declared field of the parent''s Table, and `role` is that field''s key. Declare the relation field (custom.field_declare) and hand its key in as the child''s `role`. NOTHING WAS WRITTEN.';
        end if;
      end loop;
      for v_ord in 1..v_n loop
        v_item := v_children[v_ord];
        v_where := format('child %s of %s', v_ord, v_n);
        if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item -> 'data') <> 'object' then
          raise exception 'custom.record_write_graph: % carries no document', v_where
            using errcode = '22004',
                  hint = 'A child is {"data": {...}, "table_id": ?, "role": ?, "position": ?}. NOTHING WAS WRITTEN.';
        end if;
        v_this_table := coalesce(nullif(v_item ->> 'table_id', '')::uuid, v_table);
        v_data := v_item -> 'data';
        -- The graph's op id rides every row of the graph: one operation announces itself once,
        -- and `custom.record_write_many` refuses a batch carrying two different ids by name.
        if v_op_id is not null then
          v_data := v_data || jsonb_build_object('_op_id', v_op_id);
        end if;

        -- A CONTIGUOUS RUN OF ONE TABLE IS ONE STATEMENT. The ordinary graph — one parent, N
        -- children of one kind — costs two statements against `custom.record`, not N+1.
        if v_run_open and v_this_table is not distinct from v_run_table then
          v_run_rows := v_run_rows || v_data;
          v_run_ids  := v_run_ids || gen_random_uuid();
        else
          if v_run_open then
            perform custom.record_write_many(p_organization_id, v_run_table, v_run_rows, v_run_ids);
            v_child_ids := v_child_ids || v_run_ids;
          end if;
          v_run_table := v_this_table;
          v_run_rows  := array[v_data]::jsonb[];
          v_run_ids   := array[gen_random_uuid()]::uuid[];
          v_run_open  := true;
        end if;
      end loop;
      if v_run_open then
        perform custom.record_write_many(p_organization_id, v_run_table, v_run_rows, v_run_ids);
        v_child_ids := v_child_ids || v_run_ids;
      end if;

      -- THE PARENT'S OWN RELATION, NAMED BY ITS FIELD — through `platform.relation_set`, the
      -- store's ONE relation writer. Not `public.assoc_add`: an association OUT OF a record
      -- that carries a role and no `relation_field_id` is refused by
      -- `custom._store_relation_edge_names_its_field` (REL-10 / T7, measured on the clone
      -- 2026-09-22), and it is right to refuse — without the field nothing can read what the
      -- relation does when a target is deleted, how many targets it allows, or which tables it
      -- may point at, so the delete rules, the cardinality and the organization wall all
      -- silently do nothing. `relation_set` names the field itself, asks viewer on every target
      -- and editor on the parent, and writes the index into `position` so a parent with TWO
      -- array fields of the same child shape keeps its slots apart (DD-178).
      --
      -- ONE CALL PER FIELD, with that field's children in the order they were handed in.
      for v_role in
        select distinct on (c.role) c.role
          from (select v_children[s] ->> 'role' as role, s
                  from generate_subscripts(v_children, 1) s) c
         where nullif(c.role, '') is not null
         order by c.role, c.s
      loop
        v_where := format('the %I relation from this parent to its children', v_role);
        v_targets := '[]'::jsonb;
        for v_ord in 1..v_n loop
          if nullif(v_children[v_ord] ->> 'role', '') = v_role then
            v_targets := v_targets || jsonb_build_array(
              jsonb_build_object('entity', 'record', 'row_id', v_child_ids[v_ord]::text));
          end if;
        end loop;
        v_relations := v_relations + platform.relation_set(p_organization_id, v_parent_id,
                                                           v_role, v_targets);
      end loop;

    end if;

  exception when others then
    -- ONE REFUSAL REFUSES THE WHOLE GRAPH, BY NAME. The block above is one subtransaction, so
    -- reaching here has already undone the parent, every edge and every child; re-raising
    -- carries that up to the caller's transaction too. The store's OWN sqlstate, message,
    -- detail and hint are carried out whole — a door that re-worded the refusal it caught would
    -- be hiding the one sentence the caller can act on — with the member of the graph that
    -- refused named in front of it, because "a record was refused" is not an answer when
    -- nineteen rows were in flight.
    get stacked diagnostics
      v_state  = returned_sqlstate,
      v_msg    = message_text,
      v_detail = pg_exception_detail,
      v_hint   = pg_exception_hint;
    if v_state = 'PGRST' then
      -- ERRORS-HONEST: a not-found raised by platform.refuse_not_found inside a PostgREST request
      -- arrives here in PostgREST's own shape (the message is the JSON error body). Re-raising it
      -- under errcode PGRST with a plain sentence would be an unreadable fault, so it is unwrapped,
      -- the member of the graph that refused is named in front of it exactly as below, and it is
      -- raised again the one way a not-found is raised.
      perform platform.refuse_not_found(
        format('custom.record_write_graph refused the WHOLE graph on %s: %s', v_where, platform.refusal_message(v_state, v_msg)),
        coalesce(nullif((v_msg::jsonb) ->> 'hint', '') || ' ', '')
          || 'NOTHING WAS WRITTEN — not the parent, not one edge and not one child. A graph is all of it or none of it, which is the only reason this door exists.',
        coalesce(nullif((v_msg::jsonb) ->> 'details', ''), format('%s children and %s edges were in flight under parent %s.',
                                                                  jsonb_array_length(coalesce(p_children, '[]'::jsonb)),
                                                                  jsonb_array_length(coalesce(p_edges, '[]'::jsonb)),
                                                                  v_parent_id)));
    end if;
    raise exception 'custom.record_write_graph refused the WHOLE graph on %: %', v_where, v_msg
      using errcode = v_state,
            detail  = coalesce(nullif(v_detail, ''), format('%s children and %s edges were in flight under parent %s.',
                                                            jsonb_array_length(coalesce(p_children, '[]'::jsonb)),
                                                            jsonb_array_length(coalesce(p_edges, '[]'::jsonb)),
                                                            v_parent_id)),
            hint    = coalesce(nullif(v_hint, ''), '')
                      || case when coalesce(v_hint, '') = '' then '' else ' ' end
                      || 'NOTHING WAS WRITTEN — not the parent, not one edge and not one child. A graph is all of it or none of it, which is the only reason this door exists.';
  end;

  return jsonb_build_object(
    'parent_id',  v_parent_id::text,
    'parent',     case when v_existing then 'existing' else 'minted' end,
    'table_id',   v_table::text,
    'child_ids',  to_jsonb(v_child_ids::text[]),
    'edge_ids',   to_jsonb(v_edge_ids::text[]),
    'children',   coalesce(cardinality(v_child_ids), 0),
    'edges',      coalesce(cardinality(v_edge_ids), 0) + v_relations,
    'relations',  v_relations,
    'how',        case when v_existing
                       then 'the lines a parent that already stands never got — its children and their edges through custom.record_write_many, public.assoc_add and platform.relation_set in ONE transaction, with the editor rung asked about that parent before anything was written. The same doors, every guard, all or nothing.'
                       else 'one parent, its edges and its children through custom.record_write_many, public.assoc_add and platform.relation_set in ONE transaction — the same doors, every guard, all or nothing.' end);
end
$function$;

CREATE OR REPLACE FUNCTION custom.row_template_declare(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_id     uuid := nullif(p_spec ->> 'template_id', '')::uuid;
  v_name   text := nullif(btrim(p_spec ->> 'name'), '');
  v_values jsonb := case when jsonb_typeof(p_spec -> 'values') = 'object' then p_spec -> 'values' end;
  v_body   jsonb := case when jsonb_typeof(p_spec -> 'body') = 'object' then p_spec -> 'body' end;
  v_bad    text;
  v_known  text;
  v_found  uuid;   -- the existing template this call changes, or null for a new one
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.row_template_declare');
  -- EDITOR on the Table: a template is how everyone's new rows start, so it changes the Table.
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.row_template_declare',
                                          'editor'::public.permission_level, 'table');
  perform custom.assert_store_door(p_organization_id, 'custom.row_template_declare');

  if p_table_id is null then
    raise exception 'A row template is a template OF a table — name the table.' using errcode = '22004';
  end if;

  -- NOTION-FIDELITY: a body is a page snapshot {"v": 1, "blocks": [...]}; anything else is refused by name.
  if p_spec ? 'body' and jsonb_typeof(p_spec -> 'body') <> 'null' then
    if v_body is null or (v_body ->> 'v') is distinct from '1' or jsonb_typeof(v_body -> 'blocks') <> 'array' then
      raise exception 'A template body is a page snapshot: {"v": 1, "blocks": [...]}.' using errcode = '22023',
            hint = 'It is the same body a row''s page holds; send it as pages upsert takes it. Nothing was written.';
    end if;
  end if;

  -- Same name on the same Table = that template (a declare is idempotent by name).
  if v_id is null and v_name is not null then
    select sv.id into v_id
      from platform.saved_view sv
     where sv.organization_id = p_organization_id and sv.deleted_at is null
       and sv.surface_key = 'custom/records/template' and sv.subject_id = p_table_id
       and lower(sv.name) = lower(v_name)
     limit 1;
  end if;

  if v_id is not null then
    select sv.id into v_found
      from platform.saved_view sv
     where sv.id = v_id and sv.organization_id = p_organization_id and sv.deleted_at is null
       and sv.surface_key = 'custom/records/template' and sv.subject_id = p_table_id
       for update;
    if v_found is null then
      raise exception 'There is no such row template on this table.' using errcode = '23503',
            detail = jsonb_build_object('template_id', v_id)::text;
    end if;
    -- Archive (never delete): {"template_id": …, "archived": true}.
    if (p_spec -> 'archived') = 'true'::jsonb then
      update platform.saved_view set deleted_at = now() where id = v_found and organization_id = p_organization_id;
      return v_found;
    end if;
  end if;

  if v_name is null and v_found is null then
    raise exception 'A row template needs a name — it is what a person picks it by.' using errcode = '23514';
  end if;
  if v_values is null and v_found is null then
    v_values := '{}'::jsonb;
  end if;

  -- Every value names a column of THIS table, by its key; a misspelling is refused by name.
  if v_values is not null then
    select x.k into v_bad
      from jsonb_object_keys(v_values) x(k)
     where not exists (select 1 from custom.field f
                        where f.organization_id = p_organization_id
                          and f.entity_definition_id = p_table_id and f.key = x.k)
     limit 1;
    if v_bad is not null then
      select string_agg(f.key, ', ' order by f.sort, f.key) into v_known
        from custom.field f
       where f.organization_id = p_organization_id and f.entity_definition_id = p_table_id;
      raise exception 'This table has no column "%", so the template cannot set it.', v_bad
        using errcode = '22023', hint = format('Its columns are: %s. Nothing was written.', coalesce(v_known, 'none'));
    end if;
  end if;

  if v_found is not null then
    update platform.saved_view
       set name = coalesce(v_name, name),
           definition = jsonb_build_object('table_id', p_table_id,
                                           'values', coalesce(v_values, definition -> 'values', '{}'::jsonb))
                        || case when v_body is not null then jsonb_build_object('body', v_body)
                                when definition ? 'body' then jsonb_build_object('body', definition -> 'body')
                                else '{}'::jsonb end,
           updated_at = now(), version = version + 1
     where id = v_found and organization_id = p_organization_id;
    return v_found;
  end if;

  insert into platform.saved_view
    (name, surface_key, subject_id, definition, organization_id, created_by)
  values (v_name, 'custom/records/template', p_table_id,
          jsonb_build_object('table_id', p_table_id, 'values', v_values)
            || case when v_body is not null then jsonb_build_object('body', v_body) else '{}'::jsonb end,
          p_organization_id, custom.query_principal())
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.share_grant(p_organization_id uuid, p_subject_id uuid, p_principal_kind text, p_principal_id uuid, p_level permission_level DEFAULT 'viewer'::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_kind   text := lower(btrim(coalesce(p_principal_kind, '')));
  v_row    custom.record;
  v_word   text;
  v_perm   uuid;
  v_before public.permission_level;
begin
  perform custom.assert_store_door(p_organization_id, 'share_grant');
  -- THE ONE LADDER at the rung whose whole definition is "can change it and decide who else
  -- may". Not `created_by`: VIS-17 has one ladder and `admin` is on it.
  perform custom.assert_client_may_change(p_organization_id, p_subject_id, 'share_grant',
                                          'admin'::public.permission_level, 'record');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_subject_id;
  if not found then
    raise exception 'There is no such record in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_word := case when v_row.table_id = custom.table_kernel_id() then 'table' else 'record' end;

  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;
  -- SHARE-PEOPLE-ONLY (owner ruling, Arman 2026-09-23: access is personal). A share names a
  -- PERSON. An organization is never a grantee here; "Add everyone in <organization>" in the
  -- dialog names each current member instead.
  if v_kind = 'organization' then
    raise exception 'Shares name a person, not an organization.'
      using errcode = '22023',
            hint = 'Name the people. The Share dialog''s "Add everyone in <organization>" lists the organization''s current members and grants each of them by name; people who join later are not included.';
  end if;
  if v_kind not in ('person', 'user') then
    raise exception 'A share names a person, and "%" is not one.', coalesce(p_principal_kind, '<nothing>')
      using errcode = '22023',
            hint = 'Use kind `person` with the person''s id.';
  end if;
  if p_principal_id is null then
    raise exception 'A share has to say WHO it is shared with.' using errcode = '22004';
  end if;

  -- Only a person reaches here (the organization kind was refused above).
  -- VIS-31: a person outside the organization is an EXTERNAL principal, and that lane is off
  -- UNLESS this organization has opened it by declaring a portal and naming this person in
  -- it (PORTAL, 2026-09-20). A portal principal is the one non-member this door will write a
  -- grant for, and it writes exactly the grant the portal's own binding asks for — on the
  -- client's own record, which is the thing every Job and Invoice of theirs hangs off.
  -- Everybody else still gets the refusal below, by name, rather than a grant that confers
  -- nothing.
  -- ACCESS LADDER T-40: a ROW goes to any person; only a whole Table keeps the outside lane.
  if v_word = 'table' and not exists (select 1 from iam.organization_member m
                  where m.organization_id = p_organization_id and m.user_id = p_principal_id)
     and not (coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false)
              and custom.portal_admits(p_organization_id, p_principal_id)) then
    raise exception 'That person is not in this organization, so they cannot be given access to this % yet.', v_word
      using errcode = '42501',
            hint = 'VIS-31 / custom/external_principal_enabled resolves false for this organization: sharing with somebody who has no membership here is the external-principal lane, and it is not open. Invite them to the organization, or - if they are a client rather than a colleague - put them in a portal, which is the act that opens this lane for one organization and names who may come through it.';
  end if;

  -- WHAT WAS HELD BEFORE, read before the write, because the sentence at the bottom says
  -- "Changed from X to Y" and the write is about to make that unreadable.
  select p.permission_level into v_before
    from iam.permissions p
   where p.resource_type = 'record' and p.resource_id = p_subject_id
     and p.granted_to_user_id = p_principal_id;

  -- PORTAL-BIND: THE ONE WRITER. The authority for this call was decided four lines into
  -- this body (`assert_client_may_change` at admin on the subject) and the ownership rung
  -- and the level shape are judged inside the writer, where the other two callers get the
  -- same answers. This door hand-wrote the row until 2026-09-21 and so did
  -- `custom.table_share_outside_accept`, which is two implementations of one write.
  v_perm := custom._share_write_person(p_organization_id, p_subject_id, p_principal_id,
                                       p_level, custom.query_principal());

  -- The history row is already written: `zzz_history_grant_capture` fired inside this same
  -- statement. Nothing here files a second one.
  return jsonb_build_object(
    'shared', true,
    'subject', v_word,
    'permission_id', v_perm,
    'principal_kind', case when v_kind = 'user' then 'person' else v_kind end,
    'principal_id', p_principal_id,
    'level', p_level::text,
    'level_label', iam.level_label(v_word, p_level),
    'was', v_before::text,
    'message', case when v_before is null
                    then format('Shared at %s.', lower(iam.level_label(v_word, p_level)))
                    else format('Changed from %s to %s.', lower(iam.level_label(v_word, v_before)),
                                lower(iam.level_label(v_word, p_level))) end);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_archive(p_organization_id uuid, p_table_id uuid, p_chunk integer DEFAULT 50, p_include_table boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- THE MOST ONE CALL WILL TAKE ON. Not the most a SCREEN should ask for: a client call goes
  -- through PostgREST, which cancels at ~8 s whatever this function would have been happy to
  -- do, so `p_chunk`'s DEFAULT (50) is the honest number and this cap is for a caller with a
  -- real budget.
  c_max     constant integer := 1000;
  v_chunk   integer;
  v_id      uuid;
  v_did     integer := 0;
  v_live    integer;
  v_gone    integer;
  v_name    text;
  v_table   boolean;                   -- is the Table record itself still live?
  v_whole   boolean;                   -- was this call asked to archive the Table too?
  v_done    boolean := false;
  v_table_now boolean := false;      -- did THIS call archive the Table record itself?
  v_event   uuid;                    -- STORE-TAILS-3: the one archive event of this operation
  v_prev_event text;
  -- DATA-V2-BASICS-2: an archive of this table was started and has not finished.
  v_open    boolean := false;
  v_list    uuid;                    -- DATA-V2-BASICS-2: a pick list this table's columns made
  -- THE REVERSIBLE ACTION (2026-10-02): the organization's line above which a screen asks before
  -- archiving this table (knob custom/archive_confirm_over). At or under it a screen archives at once
  -- and announces it with Undo. Answered on every call, the chunk-0 look included.
  v_confirm_over integer;
  -- T2.1 (2026-10-02): WHAT IS BUILT ON THIS TABLE GOES WITH IT, in this same archive event.
  v_built   uuid;
  v_now     timestamptz := now();
  v_on      jsonb := '[]'::jsonb;
  -- CHAIR-ACCESS d (lane 2): a child Table the store names by THIS table's id (a bookings Table's slots)
  v_child   uuid;
  v_child_res jsonb;
  -- TABLE-ACTIONS (2026-10-03): THE LAST STEP IS CHUNKED TOO. What is left of p_chunk after this call's
  -- records is the budget for what is built on the table; nothing new starts once the call has run
  -- for c_pass and done something.
  c_pass    constant interval := interval '1 second';
  v_until   timestamptz := clock_timestamp() + c_pass;
  v_left    integer;
  v_on_did  integer := 0;               -- built-on rows (and child-table passes) THIS call archived
  v_more    boolean := false;           -- something built on the table is left for the next call
  v_n       integer;
  -- DATA-DEFECTS-3: the set-based record phase.
  c_call_rows constant integer := 5000;          -- the most records one call takes on
  c_batch     constant integer := 50;            -- records per set-based step
  c_rows_pass constant interval := interval '2500 milliseconds';  -- the record phase stops starting steps after this
  v_take    integer;
  v_ids     uuid[];
  v_slow    uuid[];
  v_fast    uuid[];
  v_parents uuid[];
  v_skip    boolean;
begin
  -- THE SWITCH, THE WALL, THE RUNG — all three by name, before anything is read or written.
  -- The rung is the one `custom.record_delete` asks of the Table record, asked ONCE here so a
  -- person who may not do this is told before the first row moves rather than after.
  perform custom.assert_store_door(p_organization_id, 'custom.table_archive');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_archive');

  if p_organization_id is null or p_table_id is null then
    raise exception 'Archiving a table needs the organization and the table, and this call does not say which.'
      using errcode = '22004';
  end if;

  select coalesce(nullif(r.data ->> 'name', ''), 'this table'), r.deleted_at is null
    into v_name, v_table
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_table_id
     and r.data_class = 'table';
  if not found then
    raise exception 'There is no such table in this organization, so there is nothing to archive.' using errcode = '02000',
            hint = 'The store is keyed (organization_id, id), so a table of another organization is not found by this one. Nothing was changed.',
            detail = jsonb_build_object('table_id', p_table_id)::text;
  end if;

  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_archive');

  -- LANE 12 P5 (Arman, 2026-10-02: a table the app's code relies on "cannot easily be deleted").
  -- A table whose document carries `code_depends: true` is refused HERE, before the first record
  -- moves — not at the last step, where earlier chunks would already have emptied it. Emptying it
  -- and keeping it (p_include_table = false) is not archiving it, and is unchanged. The one way
  -- through is custom.table_archive_deliberately; custom._code_depends_hold (asked by the
  -- zzz_table_columns_word row trigger) holds every other door.
  if coalesce(p_include_table, true) then
    perform custom._code_depends_refuse(p_table_id,
      (select r.data from custom.record r
        where r.organization_id = p_organization_id and r.id = p_table_id and r.data_class = 'table'),
      'archived');
  end if;

  v_confirm_over := greatest(0,
    (platform.knob_resolve('custom', 'archive_confirm_over', p_organization_id) #>> '{}')::integer);

  v_whole := coalesce(p_include_table, true);
  -- HOW MUCH THIS CALL TAKES ON. 0 means "tell me, change nothing" — which is what a screen
  -- asks before it shows a person a number and a button. Above c_max is clamped rather than
  -- refused, because a caller asking for too much wants the work done, not a lecture; the
  -- answer says what it actually did.
  v_chunk := least(greatest(coalesce(p_chunk, 50), 0), c_max);

  -- STORE-TAILS-3: ONE EVENT FOR THE WHOLE OPERATION. A screen calls this door until `done`;
  -- every call's rows are written to the SAME open event, so the restore brings back the records
  -- chunk one archived together with the columns the last call archived. Opened only when this
  -- call is going to archive something.
  if v_chunk > 0
     and (exists (select 1 from custom.record r
                   where r.organization_id = p_organization_id and r.table_id = p_table_id
                     and r.data_class = 'record' and r.deleted_at is null)
          or (v_whole and v_table)) then
    select m.id into v_event
      from history.migration_log m
     where m.organization_id = p_organization_id
       and m.verb = 'archive'
       and m.target_kind = 'table'
       and m.target_id = p_table_id
       and m.undone_at is null
       and coalesce((m.inverse ->> 'open')::boolean, false)
     order by m.applied_at desc
     limit 1;
    if v_event is null then
      v_event := history.migration_record(p_organization_id, 'archive', 'table', p_table_id,
                   jsonb_build_object('kind', 'restore', 'record_id', p_table_id::text,
                                      'also', '[]'::jsonb, 'took', '[]'::jsonb, 'open', true,
                                      'whole', v_whole),
                   format('STORE-TAILS-3: %s archived as one unit — its records, fields, saved views and rules with it; restoring it brings back exactly this set.', v_name));
    end if;
    v_prev_event := coalesce(current_setting('custom.archive_event', true), '');
    perform set_config('custom.archive_event', v_event::text, true);
  end if;

  if v_chunk > 0 then
    -- SET-BASED (DATA-DEFECTS-3, 2026-10-10). The records no longer go one door-call each. Per row the old
    -- loop paid custom.record_delete's whole delete rule — custom.containment_edges(organization), a scan of
    -- the organization's every containment edge, ~80 ms a row and growing with the organization — plus a
    -- rewrite of the archive event's ever-longer `took` list, and stopped after 1 s, so the client's 20-row
    -- pass archived ~10 rows: a 20-row table took 6 passes, a 162-row table 17. Now, per sub-batch:
    --   · the access question is asked of EVERY row, by the same door as before (assert_client_may_change);
    --   · a row the delete rule could act on — something inbound points at it by a relation, it contains
    --     other records, or tables live in it — still goes through custom.record_delete, exactly as before;
    --   · every other row (the whole of an ordinary table) is archived by ONE update, and the event learns
    --     the batch with ONE write (`also` and `took` carry the same entries record_delete would have written);
    --   · the call works for its own time budget (c_rows_pass), not the client's chunk: `p_chunk` is now the
    --     least this call takes on, so the deployed client's 20-row passes finish a table in one call.
    -- The old 1 s cut-off is gone for records; the call still answers done = false when its budget is spent
    -- and the caller's loop carries on, so nothing a caller relies on changed.
    v_take := least(greatest(v_chunk, c_call_rows), c_call_rows);
    v_until := clock_timestamp() + c_rows_pass;
    select coalesce(array_agg(distinct e.parent_id), '{}') into v_parents
      from custom.containment_edges(p_organization_id) e where e.via = 'contained';
    loop
      exit when v_did >= v_take;
      exit when v_did > 0 and clock_timestamp() > v_until;
      select coalesce(array_agg(s.id order by s.created_at, s.id), '{}') into v_ids
        from (select r.id, r.created_at
                from custom.record r
               where r.organization_id = p_organization_id
                 and r.table_id = p_table_id
                 and r.data_class = 'record'
                 and r.deleted_at is null
               order by r.created_at, r.id
               limit least(c_batch, v_take - v_did)) s;
      exit when cardinality(v_ids) = 0;

      -- Access: the same question record_delete asks, of every row.
      perform custom.assert_client_may_change(p_organization_id, x, 'custom.record_delete') from unnest(v_ids) x;

      -- The rows the delete rule could act on keep the full door.
      select coalesce(array_agg(x), '{}') into v_slow
        from unnest(v_ids) x
       where x = any (v_parents)
          or exists (select 1 from platform.associations a
                      where a.organization_id = p_organization_id and a.target_id = x
                        and a.relation_field_id is not null and a.deleted_at is null)
          or exists (select 1 from custom.home h
                      where h.organization_id = p_organization_id and h.home_record_id = x);
      foreach v_id in array v_slow loop
        if exists (select 1 from custom.record r
                    where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is null) then
          perform custom.record_delete(p_organization_id, v_id);
          v_did := v_did + 1;
        end if;
      end loop;

      -- Everyone else: one update, one note in the event. The row triggers that have nothing to do for this
      -- batch (custom._bulk_rows_skip_trigger_work) are told to stand aside; the approvals they would withdraw
      -- are withdrawn set-wise right after.
      v_skip := custom._bulk_rows_skip_trigger_work(p_organization_id, v_ids, false);
      perform set_config('custom.archive_bulk', case when v_skip then 'on' else 'off' end, true);
      with gone as (
        update custom.record r
           set deleted_at = v_now
         where r.organization_id = p_organization_id
           and r.id = any (v_ids)
           and not (r.id = any (v_slow))
           and r.deleted_at is null
        returning r.id)
      select coalesce(array_agg(g.id order by array_position(v_ids, g.id)), '{}') into v_fast from gone g;
      perform set_config('custom.archive_bulk', 'off', true);
      if v_skip and cardinality(v_fast) > 0 then
        perform set_config('custom.archive_bulk', 'withdraw', true);
        perform custom._withdraw_approvals_for_batch(p_organization_id, v_fast);
        perform set_config('custom.archive_bulk', 'off', true);
      end if;
      v_n := cardinality(v_fast);
      if v_n > 0 then
        v_did := v_did + v_n;
        if v_event is not null then
          update history.migration_log m
             set inverse = m.inverse || jsonb_build_object(
                   'also', coalesce(m.inverse -> 'also', '[]'::jsonb)
                           || (select jsonb_agg(t.x::text order by t.o) from unnest(v_fast) with ordinality as t(x, o)),
                   'took', coalesce(m.inverse -> 'took', '[]'::jsonb)
                           || (select jsonb_agg(jsonb_build_array(t.x::text, v_now) order by t.o)
                                 from unnest(v_fast) with ordinality as t(x, o)))
           where m.organization_id = p_organization_id and m.id = v_event;
        end if;
      end if;
      -- A batch that moved nothing would repeat itself forever.
      exit when v_n = 0 and cardinality(v_slow) = 0;
    end loop;
    -- The tail (what is built on the table, the table itself) gets its own second after the records.
    v_until := clock_timestamp() + c_pass;
  end if;

  select count(*) filter (where r.deleted_at is null),
         count(*) filter (where r.deleted_at is not null)
    into v_live, v_gone
    from custom.record r
   where r.organization_id = p_organization_id
     and r.table_id = p_table_id
     and r.data_class = 'record';

  -- THE TABLE GOES LAST, AND ONLY WHEN IT IS EMPTY — AND ONLY AFTER WHAT IS BUILT ON IT HAS GONE.
  -- … AND ONLY WHEN THIS CALL WAS ASKED TO CHANGE SOMETHING. `p_chunk = 0` means "tell me,
  -- change nothing" (ARGS-RULED-2, 2026-09-23): until this line an empty Table with the table
  -- included was archived by the very call that promised to change nothing.
  --
  -- THE LAST STEP IS CHUNKED TOO (TABLE-ACTIONS, 2026-10-03). It used to take the pick lists, every
  -- dashboard and checklist, every form, inbound address, saved view and portal, every child Table
  -- (looped to its end) AND the Table itself in ONE call; with 5 records left it hit the 8 s signed-in
  -- limit under load, and nothing bounded it but how much happened to be built on the table. Now the
  -- built-on rows go in their own passes, out of the same budget the records use: at most what is
  -- left of `p_chunk` after this call's records, and nothing new is started once the call has run
  -- for c_pass and done something. A pass that stops early answers done = false and the caller's loop
  -- calls again (the contract it already keeps). The Table itself flips only in a pass that found
  -- nothing more built on it and still has time: never after a long one. Every row, in every pass,
  -- goes into the SAME open archive event — the records and dashboards through custom.record_delete
  -- (its `took`), the rest named in its `built_on` with the moment each went — so custom.record_restore
  -- brings back exactly these and never something archived on its own earlier.
  if v_chunk > 0 and v_live = 0 and v_whole and v_table then
    v_left := greatest(coalesce(v_take, v_chunk) - v_did, 50);

    -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-24): ITS PICK LISTS GO WITH IT. Every choice column
    -- makes a list of its own ("Visit Status choices"); archiving the table left all six of them live
    -- in the Tables index. A list that only this table's columns use (live or removed, in use or kept
    -- by a column that became Text) is archived in this same event, so bringing the table back brings
    -- them back. A list another table's column also uses stays.
    for v_list in
      select distinct l.id
        from custom.record f
        cross join lateral (select nullif(f.data -> 'config' ->> 'options_table_id', '')::uuid as id
                            union select nullif(f.data -> 'config' ->> 'list_kept', '')::uuid) l
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and coalesce(f.data_class, '') <> 'kernel'
         and f.data ->> 'entity_definition_id' = p_table_id::text
         and l.id is not null
    loop
      if exists (select 1 from custom.record t
                  where t.organization_id = p_organization_id and t.id = v_list
                    and t.table_id = custom.table_kernel_id() and t.deleted_at is null)
         and not exists (select 1 from custom.record o
                          where o.organization_id = p_organization_id
                            and o.table_id = custom.field_kernel_id()
                            and o.deleted_at is null
                            and o.data ->> 'entity_definition_id' is distinct from p_table_id::text
                            and (o.data -> 'config' ->> 'options_table_id' = v_list::text
                                 or o.data -> 'config' ->> 'list_kept' = v_list::text)) then
        if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        perform custom.record_delete(p_organization_id, v_list);
        v_left := v_left - 1;
        v_on_did := v_on_did + 1;
      end if;
    end loop;

    -- WHAT IS BUILT ON IT GOES WITH IT (handoff T2.1, 2026-10-02: "Restore (or Undo) brings it
    -- back with its forms and dashboards"). Before this a table's forms and booking pages kept
    -- taking submissions into an archived table, its dashboards and saved views stayed listed, and
    -- a portal kept opening onto it.
    --   · dashboards and checklists are store records: through the store's own door, so they join
    --     the event's `took` list like every other row;
    if not v_more then
      for v_built in
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and r.deleted_at is null
           and ((r.data_class = 'dashboard' and r.data ->> 'subject_table_id' = p_table_id::text)
                or (r.data_class in ('checklist_template', 'checklist_run')
                    and r.data ->> 'about_table_id' = p_table_id::text))
         order by r.created_at, r.id
      loop
        if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        perform custom.record_delete(p_organization_id, v_built);
        v_left := v_left - 1;
        v_on_did := v_on_did + 1;
      end loop;
    end if;

    --   · forms and booking pages (custom.anon_form), inbound addresses (custom.anon_inbound),
    --     saved views (platform.saved_view) and portals opened onto it (custom.portal) live outside
    --     the record table, so the event names them in `built_on` with the moment they went. Each
    --     kind is taken at most v_left rows a pass.
    if not v_more and exists (select 1 from custom.anon_form x
                               where x.organization_id = p_organization_id and x.table_id = p_table_id and x.deleted_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update custom.anon_form f set deleted_at = v_now
           where f.organization_id = p_organization_id
             and f.id in (select x.id from custom.anon_form x
                           where x.organization_id = p_organization_id and x.table_id = p_table_id
                             and x.deleted_at is null
                           order by x.id limit v_left)
          returning f.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_form', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;
    if not v_more and exists (select 1 from custom.anon_inbound x
                               where x.organization_id = p_organization_id and x.table_id = p_table_id and x.deleted_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update custom.anon_inbound i set deleted_at = v_now
           where i.organization_id = p_organization_id
             and i.id in (select x.id from custom.anon_inbound x
                           where x.organization_id = p_organization_id and x.table_id = p_table_id
                             and x.deleted_at is null
                           order by x.id limit v_left)
          returning i.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_inbound', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;
    if not v_more and exists (select 1 from platform.saved_view x
                               where x.organization_id = p_organization_id and x.subject_id = p_table_id and x.deleted_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update platform.saved_view v set deleted_at = v_now
           where v.organization_id = p_organization_id
             and v.id in (select x.id from platform.saved_view x
                           where x.organization_id = p_organization_id and x.subject_id = p_table_id
                             and x.deleted_at is null
                           order by x.id limit v_left)
          returning v.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'saved_view', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;
    if not v_more and exists (select 1 from custom.portal x
                               where x.organization_id = p_organization_id and x.client_table_id = p_table_id and x.archived_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update custom.portal p
             set archived_at = v_now, archived_by = custom.query_principal(),
                 archive_reason = 'Its table was archived.'
           where p.organization_id = p_organization_id
             and p.id in (select x.id from custom.portal x
                           where x.organization_id = p_organization_id and x.client_table_id = p_table_id
                             and x.archived_at is null
                           order by x.id limit v_left)
          returning p.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'portal', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;

    --   · CHILD TABLES THE STORE NAMES BY THIS TABLE'S ID (CHAIR-ACCESS d, lane 2 MAKE-HOME): a bookings
    --     Table's slots Table (slug booking_slots_<this table's id without dashes>, made by
    --     custom.booking_declare through custom.work_slots_declare) stayed live when its bookings Table
    --     was archived, still holding and expiring slots for a page that was gone. It goes with its
    --     parent: archived as a whole through this same door (its own event, every chunk, the rung asked
    --     of it by name), and named here in `built_on` (kind table) so custom.record_restore brings it
    --     back with the parent. This is the one pattern by which the store names a child Table after
    --     its parent's id; a second one joins this predicate, never a door of its own. ONE PASS OF THE
    --     CHILD PER PASS OF THE PARENT, out of the parent's budget; the child is named once it is done.
    if not v_more then
      for v_child in
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and r.table_id = custom.table_kernel_id()
           and r.data_class = 'table'
           and r.deleted_at is null
           and r.id <> p_table_id
           and r.data ->> 'slug' = 'booking_slots_' || replace(p_table_id::text, '-', '')
         order by r.created_at, r.id
      loop
        if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        v_child_res := custom.table_archive(p_organization_id, v_child, v_left, true);
        v_n := coalesce((v_child_res ->> 'archived')::integer, 0)
             + coalesce((v_child_res ->> 'built_on_archived')::integer, 0)
             + case when coalesce((v_child_res ->> 'table_archived')::boolean, false) then 1 else 0 end;
        v_left := v_left - greatest(v_n, 1);
        v_on_did := v_on_did + greatest(v_n, 1);
        if coalesce((v_child_res ->> 'done')::boolean, true) then
          v_on := v_on || jsonb_build_object('kind', 'table', 'id', v_child, 'at', v_now);
        else
          v_more := true;
          exit;
        end if;
      end loop;
    end if;

    -- WHAT THIS PASS TOOK OUTSIDE THE RECORD TABLE IS NAMED IN THE EVENT NOW, pass by pass, each
    -- entry with the moment it went (custom.record_restore matches on that moment).
    if jsonb_array_length(v_on) > 0 and v_event is not null then
      update history.migration_log m
         set inverse = m.inverse || jsonb_build_object('built_on', coalesce(m.inverse -> 'built_on', '[]'::jsonb) || v_on)
       where m.organization_id = p_organization_id and m.id = v_event;
    end if;

    -- THE TABLE ITSELF: by now its own cascade is the Fields, the saved views kept as records and the
    -- Rules it carries — tens of rows. It flips in a pass that found nothing more built on it and has
    -- time left (or has done nothing else).
    if not v_more
       and (v_did + v_on_did = 0 or clock_timestamp() <= v_until) then
      perform custom.record_delete(p_organization_id, p_table_id);
      v_table := false;
      v_table_now := true;
    end if;
  end if;

  v_done := v_live = 0 and (not v_whole or not v_table);

  -- STORE-TAILS-3: THE EVENT CLOSES WHEN THE OPERATION IS DONE — the table archived, or (for
  -- "empty it but keep it") every record archived. From then on a restore of the table brings
  -- back exactly what it names, and a later archive is a new event.
  if v_event is not null then
    perform set_config('custom.archive_event', v_prev_event, true);
    if v_done then
      update history.migration_log m
         set inverse = m.inverse || jsonb_build_object(
               'open', false,
               'archived_at', (select to_jsonb(r.deleted_at) from custom.record r
                                where r.organization_id = p_organization_id and r.id = p_table_id))
       where m.organization_id = p_organization_id and m.id = v_event;
    end if;
  end if;

  -- UNDER WAY (DATA-V2-BASICS-2, 2026-09-29). BREAKER-1 B-F13: a reload in the middle of a run showed a
  -- fresh "Archive this table" button, because nothing the page could ask said a run was open. The open
  -- archive event IS that fact; every answer — the chunk-0 look included — now says it.
  v_open := not v_done and exists (
    select 1 from history.migration_log m
     where m.organization_id = p_organization_id
       and m.verb = 'archive' and m.target_kind = 'table' and m.target_id = p_table_id
       and m.undone_at is null
       and coalesce((m.inverse ->> 'open')::boolean, false));

  return jsonb_build_object(
    'table_id',   p_table_id,
    'in_progress', v_open,               -- an earlier run of this archive was started and not finished
    'table_name', v_name,
    'archived',   v_did,                 -- what THIS call archived
    'remaining',  v_live,                -- records still live in this table
    'total',      v_live + v_gone,       -- records this table has ever held
    'archived_total', v_gone,            -- records of this table already archived, all runs
    'table_archived', not v_table,
    'done',       v_done,
    'chunk',      v_chunk,
    'archive_event', v_event,            -- STORE-TAILS-3: what "Bring it back" will restore
    'built_on_archived', v_on_did,      -- TABLE-ACTIONS: what is built on the table THIS call archived
    'confirm_over', v_confirm_over,      -- THE REVERSIBLE ACTION: ask first above this many live records
    'message',    case
      when v_chunk = 0 and v_live > 0 then
        format('%s record%s in %s would be archived. Nothing has been changed yet.',
               v_live, case when v_live = 1 then '' else 's' end, v_name)
      -- SAY WHAT THIS CALL DID (ARGS-RULED-2). An empty Table archived by THIS call used to be
      -- told "is already archived. Nothing was changed." — the opposite of what had happened.
      when v_chunk = 0 and v_whole and v_table then
        format('%s has no records left, so archiving it now would archive the table itself. Nothing has been changed yet.', v_name)
      when v_table_now and v_did = 0 then
        format('%s had no records left to archive, so the table itself is now archived — it can be brought back.', v_name)
      when v_done and v_did = 0 and not v_whole then
        format('Nothing is left to archive in %s. Nothing was changed.', v_name)
      when v_done and v_did = 0 then
        format('%s is already archived. Nothing was changed.', v_name)
      -- WHICH OF THE TWO ACTUALLY HAPPENED. Archiving everything IN a table is not archiving
      -- the table, and a screen that says it is has lied to the person who kept it on purpose.
      when v_done and not v_whole then
        format('%s record%s archived. %s is now empty and still here, and everything in it can be brought back.',
               v_did, case when v_did = 1 then '' else 's' end, v_name)
      when v_done then
        format('%s record%s archived. %s is archived, and everything in it can still be brought back.',
               v_did, case when v_did = 1 then '' else 's' end, v_name)
      -- TABLE-ACTIONS: the records are gone and what is built on the table is going, pass by pass.
      when not v_done and v_live = 0 and v_whole then
        format('%s record%s and %s thing%s built on %s archived. Call again to carry on — the table itself goes last.',
               v_did, case when v_did = 1 then '' else 's' end,
               v_on_did, case when v_on_did = 1 then '' else 's' end, v_name)
      else
        format('%s record%s archived, %s to go in %s. Call again to carry on — it picks up where this left off.',
               v_did, case when v_did = 1 then '' else 's' end, v_live, v_name)
    end);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_decorate(p_organization_id uuid, p_table_id uuid, p_path text[], p_value jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc    jsonb;
  v_value  jsonb;
  v_depth  integer := coalesce(array_length(p_path, 1), 0);
  v_parent text[];
  v_max    integer;
  i        integer;
begin
  -- The decision first: the organization's off switch, the organization wall, then EDITOR on
  -- the Table — the older door's own rung (udt_set_table_style: editor access required).
  perform custom.assert_store_door(p_organization_id, 'custom.table_decorate');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_decorate');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_decorate',
                                          'editor'::public.permission_level, 'table');

  select coalesce(t.data -> 'decorations', '{}'::jsonb) into v_doc
    from custom.record t
   where t.organization_id = p_organization_id
     and t.id = p_table_id
     and t.table_id = custom.table_kernel_id()
     and t.deleted_at is null
   for update;
  if v_doc is null then
    raise exception 'That table is not in this organization, so it has no colors to change.'
      using errcode = '23503',
            hint = 'REC-29: organizations are hard walls. Open the table you meant. Nothing was written.';
  end if;
  if jsonb_typeof(v_doc) <> 'object' then
    v_doc := '{}'::jsonb;
  end if;

  v_value := custom._decorations_check(p_organization_id, p_table_id, p_path, p_value);

  if v_value = 'null'::jsonb then
    -- Delete the leaf, then prune the parents it leaves empty, so the document never grows
    -- `{"cells": {"<record>": {}}}` husks (the older door's own rule).
    v_doc := v_doc #- p_path;
    for i in reverse (v_depth - 1)..1 loop
      v_parent := p_path[1:i];
      if v_doc #> v_parent = '{}'::jsonb then
        v_doc := v_doc #- v_parent;
      end if;
    end loop;
  else
    for i in 1..(v_depth - 1) loop
      v_parent := p_path[1:i];
      if v_doc #> v_parent is null or jsonb_typeof(v_doc #> v_parent) <> 'object' then
        v_doc := jsonb_set(v_doc, v_parent, '{}'::jsonb, true);
      end if;
    end loop;
    v_doc := jsonb_set(v_doc, p_path, v_value, true);
  end if;
  v_doc := v_doc || jsonb_build_object('version', 1);

  v_max := coalesce((platform.knob_resolve('custom', 'decorations_max_bytes', p_organization_id) #>> '{}')::integer, 262144);
  if octet_length(v_doc::text) > v_max then
    raise exception 'This table''s colors would grow past % KB, so this highlight was not added.', v_max / 1024
      using errcode = '54000',
            hint = 'Clear highlights nobody needs any more (write null to them), or color by a column or a rule instead of by hand. The ceiling is the organization knob custom/decorations_max_bytes. Nothing was written.';
  end if;

  update custom.record
     set data = jsonb_set(data, '{decorations}', v_doc, true)
   where organization_id = p_organization_id
     and id = p_table_id
     and table_id = custom.table_kernel_id();

  return v_doc;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_dimensions_set(p_organization_id uuid, p_table_id uuid, p_overrides jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc jsonb;
begin
  -- The decision first: the store's switch, the organization wall, then EDITOR on the Table —
  -- the rung that changes a Table's own settings (custom.table_decorate's rung).
  perform custom.assert_store_door(p_organization_id, 'custom.table_dimensions_set');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_dimensions_set');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_dimensions_set',
                                          'editor'::public.permission_level, 'table');

  v_doc := custom._table_dimensions_check(p_organization_id, p_table_id, p_overrides);

  update custom.record
     set data = case when v_doc is null then data - 'drill' else jsonb_set(data, '{drill}', v_doc, true) end
   where organization_id = p_organization_id
     and id = p_table_id
     and table_id = custom.table_kernel_id()
     and deleted_at is null;
  if not found then
    raise exception 'That table is not in this organization, so its dimensions were not changed.'
      using errcode = '23503', hint = 'Open the table you meant. Nothing was written.';
  end if;

  return custom._table_dimensions_build(p_organization_id, p_table_id, false);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_restore(p_organization_id uuid, p_table_id uuid, p_chunk integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- BRINGING A WHOLE TABLE BACK — ONE PASS OF IT (TABLE-ACTIONS, 2026-10-03). The mirror of
  -- custom.table_archive: custom.record_restore on a Table brought back, in ONE statement, the
  -- Table, its Fields, every record and every row built on it that its archive event took, and
  -- timed out on the clone for "Referral Intake Queue 2026-Q4 (copy 7)". This door does the same
  -- work, scoped to the same one archive event, in passes the caller loops until `done`.
  --
  -- THE TABLE COMES BACK FIRST, with its structure (its Fields, the rules and saved views kept as
  -- records that the event took) in the first pass, all of it or none of it, exactly as
  -- custom.record_restore does it. It cannot come back last: every returning record is judged by
  -- the store's guards against its Table and its Fields, so they must stand before the first
  -- record does. While the run is under way the event is marked `restoring` (a reload, a closed
  -- tab or a deploy mid-run leaves a next call that carries on from exactly there); records come
  -- back in the order they went, then what was built on the Table; the event is marked undone only
  -- when nothing it took is still waiting.
  --
  -- A PASS takes at most p_chunk rows (records, then built-on rows; each child-Table pass counts
  -- what it took) and starts nothing new once it has run for c_pass and done something.
  -- p_chunk = 0 changes nothing and only reports.
  c_max     constant integer := 1000;
  c_pass    constant interval := interval '1 second';
  -- DATA-DEFECTS-4: the record phase works for its own time budget, like custom.table_archive.
  c_rows_pass constant interval := interval '2000 milliseconds';
  c_call_rows constant integer := 5000;
  c_batch     constant integer := 50; 
  v_until   timestamptz := clock_timestamp() + c_pass;
  v_chunk   integer;
  v_left    integer;
  e         history.migration_log;
  v_root_at timestamptz;
  v_name    text;
  v_is_table boolean;
  v_table_now boolean := false;      -- did THIS call bring the Table row itself back?
  m         record;
  a         record;
  v_on      record;
  v_struct  integer := 0;            -- Table, Fields, rules, saved views this call brought back
  v_back    integer := 0;            -- records this call brought back
  v_on_did  integer := 0;            -- built-on rows (and child-Table passes) this call brought back
  v_more    boolean := false;        -- something built on the table waits for the next call
  v_wait    uuid[] := '{}';
  v_again   uuid[];
  v_round   integer := 0;
  v_why     text;
  v_whose   text;
  v_fwait   uuid[] := '{}';
  v_fwhy    text;
  v_fleft   integer := 0;
  v_back_ids uuid[] := '{}';
  v_back_at  timestamptz[] := '{}';
  v_refused_why text;
  v_kept    jsonb;                   -- this event's rows left archived: {id: the store's reason}
  v_kept_all integer := 0;           -- rows left archived across every event this run finished
  v_last_why text;
  v_events  integer := 0;            -- events this call finished
  v_waiting integer := 0;            -- restoring events still open after this call
  v_recs    integer;
  v_on_wait integer;
  v_child_res jsonb;
  v_n       integer;
  v_done    boolean := false;
  v_joined  integer := 0;
  v_ok      boolean;
  v_ids     uuid[];
  v_ats     timestamptz[];
  rb        record;
  v_rows_until timestamptz;
  v_flag_ev jsonb := '{}'::jsonb;    -- this event's rows brought back that no longer meet the rules: {id: why}
  v_flag_out jsonb := '{}'::jsonb;
  v_flag_all jsonb := '{}'::jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_restore');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_restore');
  if p_organization_id is null or p_table_id is null then
    raise exception 'Bringing a table back needs the organization and the table, and this call does not say which.'
      using errcode = '22004';
  end if;

  select coalesce(nullif(r.data ->> 'name', ''), 'this table'), r.deleted_at,
         r.table_id = custom.table_kernel_id() and r.data_class = 'table'
    into v_name, v_root_at, v_is_table
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_table_id;
  if not found or not coalesce(v_is_table, false) then
    raise exception 'There is no such table in this organization, so there is nothing to bring back.' using errcode = '02000',
            hint = 'The store is keyed (organization_id, id), so a table of another organization is not found by this one. Nothing was changed.',
            detail = jsonb_build_object('table_id', p_table_id)::text;
  end if;
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_restore');
  v_chunk := least(greatest(coalesce(p_chunk, 20), 0), c_max);

  -- THE EVENT THE FIRST PASS UNDOES (every later pass works through every open `restoring` event of
  -- this Table, oldest first — a Table archived again mid-restore leaves two): the archive event of the Table while it is archived; once the
  -- first pass has brought the Table back, the event this run marked `restoring`.
  if v_root_at is not null then
    e := custom.archive_event_of(p_organization_id, p_table_id);
  else
    select l.* into e
      from history.migration_log l
     where l.organization_id = p_organization_id
       and l.target_id = p_table_id
       and l.verb = 'archive'
       and l.undone_at is null
       and l.inverse ->> 'kind' = 'restore'
       and coalesce((l.inverse ->> 'restoring')::boolean, false)
     order by l.applied_at desc
     limit 1;
    if e.id is null then
      raise exception 'That table was not archived, so there was nothing to bring back.'
        using errcode = '02000', hint = 'REC-23: it is already here.';
    end if;
  end if;

  -- AN ARCHIVE WITH NO EVENT (made before events existed, or outside the store's doors) names no
  -- records: the record door's own restore brings back the Table and the Fields archived with it.
  if e.id is null then
    if v_chunk > 0 then
      perform custom._record_restore_one(p_organization_id, p_table_id);
    end if;
    return jsonb_build_object(
      'table_id', p_table_id, 'table_name', v_name, 'restored', 0, 'structure_restored', 0,
      'built_on_restored', 0, 'remaining', 0, 'built_on_remaining', 0, 'left', 0,
      'table_restored', v_chunk > 0, 'done', v_chunk > 0, 'chunk', v_chunk, 'archive_event', null,
      'message', case when v_chunk = 0
                      then format('%s would be brought back. Nothing has been changed yet.', v_name)
                      else format('%s is back.', v_name) end);
  end if;


  if v_chunk > 0
     and coalesce(nullif(current_setting('history.mark_at', true), ''), '') <> statement_timestamp()::text then
    -- The History versions this restore writes read "undo of archive" and carry the event's id.
    perform set_config('history.mark_at',   statement_timestamp()::text, true);
    perform set_config('history.mark_id',   e.id::text,                  true);
    perform set_config('history.mark_verb', 'undo of archive',           true);
  end if;

  -- ══ PASS ONE: THE TABLE AND ITS STRUCTURE, all of it or none of it ═════════════════════════
  if v_chunk > 0 and v_root_at is not null then
    update custom.record set deleted_at = null
     where organization_id = p_organization_id and id = p_table_id and deleted_at = v_root_at;
    -- Counted only when THIS call changed the row (a concurrent restore that got there first did it).
    if found then
      v_table_now := true;
      v_struct := 1;
      v_back_ids := array[p_table_id]; v_back_at := array[v_root_at];
    end if;

    -- FIELD-ARCHIVE-CASCADE: the Fields archived at the Table's own moment that the event does not name.
    for m in
      select f.id
        from custom.record f
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and f.data_class <> 'kernel'
         and f.data ->> 'entity_definition_id' = p_table_id::text
         and f.deleted_at = v_root_at
         and not exists (select 1 from jsonb_array_elements(coalesce(e.inverse -> 'took', '[]'::jsonb)) t
                          where t ->> 0 = f.id::text)
       order by f.created_at, f.id
    loop
      perform custom.assert_client_may_change(p_organization_id, m.id, 'custom.table_restore');
      begin
        update custom.record set deleted_at = null
         where organization_id = p_organization_id and id = m.id and deleted_at = v_root_at;
        if found then
          v_struct := v_struct + 1;
          v_back_ids := v_back_ids || m.id; v_back_at := v_back_at || v_root_at;
        end if;
      exception when check_violation or foreign_key_violation or raise_exception
                  or invalid_parameter_value or not_null_violation or unique_violation then
        v_fwait := v_fwait || m.id;
      end;
    end loop;

    -- The structure the event took — tables, then fields, then rules, then saved views — each only
    -- if it still carries this event's moment. One whose own guard refuses it now is asked again
    -- after the rest is back, round by round; one still refused then refuses the whole pass by name.
    for m in
      select t.id, t.at
        from (select (x ->> 0)::uuid as id, (x ->> 1)::timestamptz as at, o
                from jsonb_array_elements(coalesce(e.inverse -> 'took', '[]'::jsonb)) with ordinality as j(x, o)) t
        join custom.record r on r.organization_id = p_organization_id and r.id = t.id
       where t.id <> p_table_id
         and r.deleted_at = t.at
         and (r.table_id in (custom.table_kernel_id(), custom.field_kernel_id(), custom.rule_kernel_id())
              or r.data ? 'layout')
       order by case when r.table_id = custom.table_kernel_id() then 1
                     when r.table_id = custom.field_kernel_id() then 2
                     when r.table_id = custom.rule_kernel_id() then 3
                     else 4 end, t.o
    loop
      perform custom.assert_client_may_change(p_organization_id, m.id, 'custom.table_restore');
      begin
        update custom.record set deleted_at = null
         where organization_id = p_organization_id and id = m.id and deleted_at = m.at;
        if found then
          v_struct := v_struct + 1;
          v_back_ids := v_back_ids || m.id; v_back_at := v_back_at || m.at;
        end if;
      exception when check_violation or foreign_key_violation or raise_exception
                  or invalid_parameter_value or not_null_violation then
        v_wait := v_wait || m.id;
      end;
    end loop;
    while cardinality(v_wait) > 0 loop
      v_round := v_round + 1;
      v_again := '{}';
      for m in select t.id, t.at
                 from (select (x ->> 0)::uuid as id, (x ->> 1)::timestamptz as at, o
                         from jsonb_array_elements(e.inverse -> 'took') with ordinality as j(x, o)) t
                where t.id = any (v_wait)
                order by t.o loop
        begin
          update custom.record set deleted_at = null
           where organization_id = p_organization_id and id = m.id and deleted_at = m.at;
          if found then
            v_struct := v_struct + 1;
            v_back_ids := v_back_ids || m.id; v_back_at := v_back_at || m.at;
          end if;
        exception when check_violation or foreign_key_violation or raise_exception
                    or invalid_parameter_value or not_null_violation then
          get stacked diagnostics v_why = message_text;
          v_again := v_again || m.id;
        end;
      end loop;
      if cardinality(v_again) = cardinality(v_wait) then
        select coalesce(nullif(r.data ->> 'label', ''), nullif(r.data ->> 'name', ''), r.data ->> 'key', r.id::text)
          into v_whose
          from custom.record r where r.organization_id = p_organization_id and r.id = v_wait[1];
        raise exception 'This could not be brought back as it was archived: "%" is refused on its own (%), so nothing was brought back.', v_whose, v_why
          using errcode = '23514',
                hint = 'STORE-TAILS-3: a table comes back with the whole of its structure or none of it. Change what the refusal names (it changed after the archive), then bring it back again.';
      end if;
      v_wait := v_again;
    end loop;

    -- The Fields that waited for the rest of the structure, asked once more; one still refused stays
    -- archived and is named — never a reason to keep the Table itself archived.
    for m in select x.id from unnest(v_fwait) with ordinality as x(id, o) order by x.o loop
      begin
        update custom.record set deleted_at = null
         where organization_id = p_organization_id and id = m.id and deleted_at = v_root_at;
        if found then
          v_struct := v_struct + 1;
          v_back_ids := v_back_ids || m.id; v_back_at := v_back_at || v_root_at;
        end if;
      exception when check_violation or foreign_key_violation or raise_exception
                  or invalid_parameter_value or not_null_violation or unique_violation then
        get stacked diagnostics v_fwhy = message_text;
        v_fleft := v_fleft + 1;
      end;
    end loop;
    if v_fleft > 0 then
      raise notice '%', format('Columns brought back with the table: %s; %s stayed archived (the last said: %s).',
                               greatest(v_struct - 1, 0), v_fleft, v_fwhy);
    end if;

    update history.migration_log l
       set inverse = l.inverse || jsonb_build_object('restoring', true, 'restoring_from', to_jsonb(v_root_at),
                                                     'restoring_since', to_jsonb(now()))
     where l.organization_id = p_organization_id and l.id = e.id;
  end if;



  -- ══ EVERY OPEN `restoring` EVENT OF THIS TABLE, OLDEST FIRST ════════════════════════════════
  -- A Table archived again in the middle of a restore carries two: the first run's rows still
  -- waiting under their own moment, and the second archive's. Each is finished in turn, and the run
  -- is done only when none is open (TABLE-ACTIONS ruling 2, 2026-10-03).
  v_left := case when v_chunk > 0 then c_call_rows else 0 end;
  v_rows_until := clock_timestamp() + c_rows_pass;
  v_recs := 0; v_on_wait := 0;
  <<events>>
  loop
    exit when v_chunk = 0;
    select l.* into e
      from history.migration_log l
     where l.organization_id = p_organization_id
       and l.target_id = p_table_id
       and l.verb = 'archive'
       and l.undone_at is null
       and l.inverse ->> 'kind' = 'restore'
       and coalesce((l.inverse ->> 'restoring')::boolean, false)
     order by l.applied_at asc
     limit 1;
    exit when e.id is null;
    perform set_config('history.mark_id', e.id::text, true);
    v_kept := coalesce(e.inverse -> 'restore_left', '{}'::jsonb);
    if jsonb_typeof(v_kept) <> 'object' then v_kept := '{}'::jsonb; end if;
    v_flag_ev := coalesce(e.inverse -> 'restore_flagged', '{}'::jsonb);
    if jsonb_typeof(v_flag_ev) <> 'object' then v_flag_ev := '{}'::jsonb; end if;
    v_back_ids := '{}'; v_back_at := '{}';

    -- THE RECORDS, in the order they went, now in SET-BASED STEPS (DATA-DEFECTS-4). Per step: the access
    -- question is asked of every row (same door as before); the step is judged once against the table's
    -- CURRENT rules (custom._restore_check: a unique value another row took since holds the row back,
    -- left archived with the store's reason in restore_left; anything else it no longer meets comes back
    -- FLAGGED in restore_flagged — nothing is lost), then brought back by ONE update. The call works for
    -- its own time budget, not the caller's chunk (p_chunk > 0 only means "do work"); `remaining` says
    -- what is left and the caller's loop carries on.
    loop
      exit when v_left < 1;
      if v_struct + v_back + v_on_did > 0 and clock_timestamp() > v_rows_until then
        v_more := true;
        exit;
      end if;
      select coalesce(array_agg(s.id order by s.o), '{}'), coalesce(array_agg(s.at order by s.o), '{}')
        into v_ids, v_ats
        from (select t.id, t.at, t.o
                from (select (x ->> 0)::uuid as id, (x ->> 1)::timestamptz as at, o
                        from jsonb_array_elements(coalesce(e.inverse -> 'took', '[]'::jsonb)) with ordinality as j(x, o)) t
                join custom.record r on r.organization_id = p_organization_id and r.id = t.id
               where t.id <> p_table_id
                 and r.deleted_at = t.at
                 -- a row with no table (a checklist template, a dashboard) is a record here, as in custom.record_restore
                 and (r.table_id is null
                      or r.table_id not in (custom.table_kernel_id(), custom.field_kernel_id(), custom.rule_kernel_id()))
                 and not (r.data ? 'layout')
                 and not (v_kept ? t.id::text)
               order by t.o
               limit least(c_batch, v_left)) s;
      exit when cardinality(v_ids) = 0;
      perform custom.assert_client_may_change(p_organization_id, x, 'custom.table_restore') from unnest(v_ids) x;
      select * into rb from custom._restore_records_batch(p_organization_id, v_ids, v_ats);
      v_back := v_back + coalesce(cardinality(rb.back_ids), 0);
      v_back_ids := v_back_ids || coalesce(rb.back_ids, '{}'); v_back_at := v_back_at || coalesce(rb.back_at, '{}');
      if rb.held <> '{}'::jsonb then
        v_kept := v_kept || rb.held;
        select v into v_last_why from jsonb_each_text(rb.held) as j(k, v) limit 1;
      end if;
      v_flag_ev := v_flag_ev || coalesce(rb.flagged, '{}'::jsonb);
      v_left := v_left - cardinality(v_ids);
    end loop;
    v_until := clock_timestamp() + c_pass;

    -- THE POINTERS THE ARCHIVE TOOK OUT OF OTHER RECORDS GO BACK IN, for every row this pass
    -- brought back (custom.record_restore's own rule: a `set_null` relation's tombstone at this
    -- row's archive moment, the source still here, the column still live, the place still free).
    for a in
      select x.id as edge_id, x.source_id, x.role, x.target_id
        from unnest(v_back_ids, v_back_at) as b(id, at)
        join platform.associations x
          on x.organization_id = p_organization_id
         and x.target_type = 'record' and x.target_id = b.id
         and x.source_type = 'record'
         and x.relation_field_id is not null
         and x.deleted_at = b.at
         and x.deleted_via_type is null
       order by x.created_at
    loop
      if exists (select 1 from custom.record s
                  where s.organization_id = p_organization_id and s.id = a.source_id and s.deleted_at is null)
         and platform.relation_edge_has_a_live_field(p_organization_id,
               (select x.relation_field_id from platform.associations x where x.id = a.edge_id)) then
        update custom.record s
           set data = case
                 when jsonb_typeof(s.data -> a.role) = 'array' then
                   case when s.data -> a.role @> to_jsonb(array[a.target_id::text]) then s.data
                        else jsonb_set(s.data, array[a.role], (s.data -> a.role) || to_jsonb(a.target_id::text)) end
                 when jsonb_typeof(s.data -> a.role) = 'string' then s.data
                 else jsonb_set(s.data, array[a.role],
                                case when coalesce((select (f.data ->> 'multi')::boolean
                                                      from custom.record f
                                                     where f.organization_id = p_organization_id
                                                       and f.id = (select x.relation_field_id from platform.associations x where x.id = a.edge_id)), false)
                                     then jsonb_build_array(a.target_id::text)
                                     else to_jsonb(a.target_id::text) end)
               end
         where s.organization_id = p_organization_id and s.id = a.source_id
           and jsonb_typeof(s.data -> a.role) is distinct from 'string';
        if found then v_joined := v_joined + 1; end if;
      end if;
    end loop;


    -- WHAT WAS BUILT ON THE TABLE, once this event's records are back.
    if not v_more and not exists (
         select 1
           from (select (x ->> 0)::uuid as id, (x ->> 1)::timestamptz as at
                   from jsonb_array_elements(coalesce(e.inverse -> 'took', '[]'::jsonb)) x) t
           join custom.record r on r.organization_id = p_organization_id and r.id = t.id
          where t.id <> p_table_id and r.deleted_at = t.at and not (v_kept ? t.id::text)) then
      for v_on in
        select x ->> 'kind' as kind, (x ->> 'id')::uuid as id, (x ->> 'at')::timestamptz as at
          from jsonb_array_elements(coalesce(e.inverse -> 'built_on', '[]'::jsonb)) x
      loop
        continue when v_kept ? v_on.id::text;
        continue when not case v_on.kind
          when 'anon_form' then exists (select 1 from custom.anon_form x where x.organization_id = p_organization_id and x.id = v_on.id and x.deleted_at = v_on.at)
          when 'anon_inbound' then exists (select 1 from custom.anon_inbound x where x.organization_id = p_organization_id and x.id = v_on.id and x.deleted_at = v_on.at)
          when 'saved_view' then exists (select 1 from platform.saved_view x where x.organization_id = p_organization_id and x.id = v_on.id and x.deleted_at = v_on.at)
          when 'portal' then exists (select 1 from custom.portal x where x.organization_id = p_organization_id and x.id = v_on.id and x.archived_at = v_on.at)
          when 'table' then exists (select 1 from custom.record c where c.organization_id = p_organization_id and c.id = v_on.id and c.data_class = 'table' and c.deleted_at is not null)
                         or exists (select 1 from history.migration_log l where l.organization_id = p_organization_id and l.target_id = v_on.id
                                       and l.verb = 'archive' and l.undone_at is null and coalesce((l.inverse ->> 'restoring')::boolean, false))
          else false end;
        if v_left < 1 or (v_struct + v_back + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        if v_on.kind = 'table' then
          -- A child Table (a bookings Table's slots) comes back through this same door, one pass of
          -- it per pass of the parent, with everything its own archive event took.
          v_child_res := custom.table_restore(p_organization_id, v_on.id, v_left);
          v_n := greatest(coalesce((v_child_res ->> 'restored')::integer, 0)
                          + coalesce((v_child_res ->> 'structure_restored')::integer, 0)
                          + coalesce((v_child_res ->> 'built_on_restored')::integer, 0), 1);
          v_left := v_left - v_n;
          v_on_did := v_on_did + v_n;
          perform set_config('history.mark_id', e.id::text, true);
          if not coalesce((v_child_res ->> 'done')::boolean, true) then
            v_more := true;
            exit;
          end if;
          continue;
        end if;
        begin
          if v_on.kind = 'anon_form' then
            update custom.anon_form set deleted_at = null
             where organization_id = p_organization_id and id = v_on.id and deleted_at = v_on.at;
          elsif v_on.kind = 'anon_inbound' then
            update custom.anon_inbound set deleted_at = null
             where organization_id = p_organization_id and id = v_on.id and deleted_at = v_on.at;
          elsif v_on.kind = 'saved_view' then
            update platform.saved_view set deleted_at = null
             where organization_id = p_organization_id and id = v_on.id and deleted_at = v_on.at;
          elsif v_on.kind = 'portal' then
            update custom.portal set archived_at = null, archived_by = null, archive_reason = null
             where organization_id = p_organization_id and id = v_on.id and archived_at = v_on.at;
          end if;
          if found then v_on_did := v_on_did + 1; end if;
        exception when unique_violation or check_violation then
          get stacked diagnostics v_refused_why = message_text;
          v_kept := v_kept || jsonb_build_object(v_on.id::text, v_refused_why);
          v_last_why := v_refused_why;
        end;
        v_left := v_left - 1;
      end loop;
    end if;

    -- What this event has left archived, carried on it with each row's own reason.
    if v_flag_ev is distinct from coalesce(e.inverse -> 'restore_flagged', '{}'::jsonb) then
      update history.migration_log l
         set inverse = l.inverse || jsonb_build_object('restore_flagged', v_flag_ev)
       where l.organization_id = p_organization_id and l.id = e.id;
    end if;
    v_flag_out := v_flag_out || v_flag_ev;

    if v_kept is distinct from coalesce(e.inverse -> 'restore_left', '{}'::jsonb) then
      update history.migration_log l
         set inverse = l.inverse || jsonb_build_object('restore_left', v_kept)
       where l.organization_id = p_organization_id and l.id = e.id;
    end if;

    -- WHAT IS STILL WAITING in this event (read off the rows themselves).
    select count(*) into v_recs
      from (select (x ->> 0)::uuid as id, (x ->> 1)::timestamptz as at
              from jsonb_array_elements(coalesce(e.inverse -> 'took', '[]'::jsonb)) x) t
      join custom.record r on r.organization_id = p_organization_id and r.id = t.id
     where r.deleted_at = t.at
       and not (v_kept ? t.id::text);
    select count(*) into v_on_wait
      from (select x ->> 'kind' as kind, (x ->> 'id')::uuid as id, (x ->> 'at')::timestamptz as at
              from jsonb_array_elements(coalesce(e.inverse -> 'built_on', '[]'::jsonb)) x) b
     where not (v_kept ? b.id::text)
       and case b.kind
         when 'anon_form' then exists (select 1 from custom.anon_form x where x.organization_id = p_organization_id and x.id = b.id and x.deleted_at = b.at)
         when 'anon_inbound' then exists (select 1 from custom.anon_inbound x where x.organization_id = p_organization_id and x.id = b.id and x.deleted_at = b.at)
         when 'saved_view' then exists (select 1 from platform.saved_view x where x.organization_id = p_organization_id and x.id = b.id and x.deleted_at = b.at)
         when 'portal' then exists (select 1 from custom.portal x where x.organization_id = p_organization_id and x.id = b.id and x.archived_at = b.at)
         when 'table' then exists (select 1 from custom.record c where c.organization_id = p_organization_id and c.id = b.id and c.data_class = 'table' and c.deleted_at is not null)
                        or exists (select 1 from history.migration_log l where l.organization_id = p_organization_id and l.target_id = b.id
                                      and l.verb = 'archive' and l.undone_at is null and coalesce((l.inverse ->> 'restoring')::boolean, false))
         else false end;

    exit events when v_more or v_recs > 0 or v_on_wait > 0;

    -- THIS EVENT IS UNDONE: nothing it took is still waiting. On to the next open one, if any.
    update history.migration_log l
       set undone_at = now(),
           undone_by = coalesce(nullif(current_setting('app.user_id', true), '')::uuid, (select auth.uid())),
           inverse = l.inverse - 'restoring'
     where l.organization_id = p_organization_id and l.id = e.id;
    v_events := v_events + 1;
    v_kept_all := v_kept_all + (select count(*) from jsonb_object_keys(v_kept));
  end loop;

  -- A LOOK (p_chunk = 0) counts what the event would bring back; it changes nothing.
  if v_chunk = 0 then
    v_kept := coalesce(e.inverse -> 'restore_left', '{}'::jsonb);
    if jsonb_typeof(v_kept) <> 'object' then v_kept := '{}'::jsonb; end if;
    select count(*) into v_recs
      from (select (x ->> 0)::uuid as id, (x ->> 1)::timestamptz as at
              from jsonb_array_elements(coalesce(e.inverse -> 'took', '[]'::jsonb)) x) t
      join custom.record r on r.organization_id = p_organization_id and r.id = t.id
     where r.deleted_at = t.at and not (v_kept ? t.id::text);
    select count(*) into v_on_wait from jsonb_array_elements(coalesce(e.inverse -> 'built_on', '[]'::jsonb));
  end if;

  select count(*) into v_waiting
    from history.migration_log l
   where l.organization_id = p_organization_id and l.target_id = p_table_id and l.verb = 'archive'
     and l.undone_at is null and coalesce((l.inverse ->> 'restoring')::boolean, false);
  v_done := v_chunk > 0 and v_waiting = 0
            and not exists (select 1 from custom.record r
                             where r.organization_id = p_organization_id and r.id = p_table_id and r.deleted_at is not null);
  if v_done then
    -- EVERYTHING STILL LEFT ARCHIVED, whichever event of this Table left it (the run may have
    -- finished two): each row named with the store's own reason, only while it is still archived.
    select coalesce(jsonb_object_agg(k.key, k.value), '{}'::jsonb) into v_kept
      from history.migration_log l
      cross join lateral jsonb_each(case when jsonb_typeof(l.inverse -> 'restore_left') = 'object'
                                          then l.inverse -> 'restore_left' else '{}'::jsonb end) k
     where l.organization_id = p_organization_id and l.target_id = p_table_id and l.verb = 'archive'
       and l.undone_at is not null
       -- THIS run's events: finished since its first pass (the latest `restoring_since`), never a
       -- row an earlier, separate restore of this Table left behind.
       and l.undone_at >= coalesce((select max((x.inverse ->> 'restoring_since')::timestamptz)
                                      from history.migration_log x
                                     where x.organization_id = p_organization_id and x.target_id = p_table_id
                                       and x.verb = 'archive'), '-infinity'::timestamptz)
       and exists (select 1 from custom.record r
                    where r.organization_id = p_organization_id and r.id = k.key::uuid and r.deleted_at is not null);
  end if;

  -- Rows that came back flagged: every pass of this restore (the events' own record of it), live rows only.
  select coalesce(jsonb_object_agg(k.key, k.value), '{}'::jsonb) into v_flag_all
    from history.migration_log l
    cross join lateral jsonb_each(case when jsonb_typeof(l.inverse -> 'restore_flagged') = 'object'
                                        then l.inverse -> 'restore_flagged' else '{}'::jsonb end) k
   where l.organization_id = p_organization_id and l.target_id = p_table_id and l.verb = 'archive'
     and l.inverse ? 'restore_flagged'
     and (l.undone_at is null or l.undone_at >= coalesce((select max((x.inverse ->> 'restoring_since')::timestamptz)
                                      from history.migration_log x
                                     where x.organization_id = p_organization_id and x.target_id = p_table_id
                                       and x.verb = 'archive'), '-infinity'::timestamptz))
     and exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = k.key::uuid and r.deleted_at is null);

  return jsonb_build_object(
    'table_id',           p_table_id,
    'table_name',         v_name,
    'restored',           v_back,                -- records THIS call brought back (rows it changed)
    'structure_restored', v_struct,              -- the Table, its Fields, rules and views (first pass)
    'built_on_restored',  v_on_did,              -- what is built on the Table, THIS call
    'remaining',          v_recs,                -- rows of the event being finished still waiting
    'built_on_remaining', v_on_wait,
    'events_open',        v_waiting,             -- restoring events of this Table still open
    'left',               coalesce((select count(*) from jsonb_object_keys(coalesce(v_kept, '{}'::jsonb))), 0),
    'left_ids',           coalesce((select jsonb_agg(k) from jsonb_object_keys(coalesce(v_kept, '{}'::jsonb)) k), '[]'::jsonb),
    'left_reasons',       coalesce(v_kept, '{}'::jsonb),
    'flagged',            (select count(*) from jsonb_object_keys(v_flag_all)),
    'flagged_ids',        coalesce((select jsonb_agg(k) from jsonb_object_keys(v_flag_all) k), '[]'::jsonb),
    'flagged_reasons',    v_flag_all,
    'table_restored',     not exists (select 1 from custom.record r
                                       where r.organization_id = p_organization_id and r.id = p_table_id and r.deleted_at is not null),
    'done',               v_done,
    'chunk',              v_chunk,
    'archive_event',      e.id,
    'message', case
      when v_chunk = 0 then
        format('%s record%s and %s thing%s built on %s would be brought back. Nothing has been changed yet.',
               v_recs, case when v_recs = 1 then '' else 's' end,
               v_on_wait, case when v_on_wait = 1 then '' else 's' end, v_name)
      -- NO "IS BACK" WHILE ROWS STAYED (ruling 1): how many came back and how many stayed, and why.
      when v_done and coalesce((select count(*) from jsonb_object_keys(coalesce(v_kept, '{}'::jsonb))), 0) > 0 then
        format('%s is back, but %s of what it held stayed archived: each is refused on its own now (%s).',
               v_name, (select count(*) from jsonb_object_keys(v_kept)),
               coalesce(v_last_why, (select v from jsonb_each_text(v_kept) as j(k, v) limit 1)))
      when v_done and (select count(*) from jsonb_object_keys(v_flag_all)) > 0 then
        format('%s is back, with everything its archive took; %s of its records no longer meet what the table asks of a record (the first said: %s). They are back, flagged — nothing was dropped.',
               v_name, (select count(*) from jsonb_object_keys(v_flag_all)), (select v from jsonb_each_text(v_flag_all) as j(k, v) limit 1))
      when v_done then format('%s is back, with everything its archive took.', v_name)
      else format('%s is coming back; %s record%s and %s thing%s built on it still to bring back. Call again to carry on.',
                  v_name, v_recs, case when v_recs = 1 then '' else 's' end,
                  v_on_wait, case when v_on_wait = 1 then '' else 's' end)
    end);
end
$function$;

CREATE OR REPLACE FUNCTION custom.table_share_outside_grant(p_organization_id uuid, p_table_id uuid, p_person text, p_level permission_level DEFAULT 'viewer'::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_said  text := btrim(coalesce(p_person, ''));
  v_user  uuid;
  v_mail  text;
  v_row   custom.record;
  v_name  text;
  v_org   text;
  v_mylvl public.permission_level;
  v_perm  uuid;
  v_means text;
  v_who   text;
  v_sent  jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_share_outside_grant');
  perform custom.assert_store_door(p_organization_id, 'custom.table_share_outside_grant');
  perform custom.assert_client_may_change(p_organization_id, p_table_id,
            'custom.table_share_outside_grant', 'admin'::public.permission_level, 'table');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_table_id
     and r.table_id = custom.table_kernel_id() and r.deleted_at is null;
  if not found then
    raise exception 'There is no such table in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_name := coalesce(nullif(v_row.data ->> 'name', ''), 'this table');
  select o.name into v_org from iam.organizations o where o.id = p_organization_id;

  if v_said = '' then
    raise exception 'Say who to share % with: their email address, or their account.', v_name
      using errcode = '22004';
  end if;
  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;

  -- Who they are: an account id, or an email address (an account, or nobody yet).
  if v_said ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select u.id, lower(u.email) into v_user, v_mail from auth.users u where u.id = v_said::uuid;
    if v_user is null then
      raise exception 'There is no account %, so % was not shared.', v_said, v_name
        using errcode = '22023', hint = 'Share with their email address instead; if they have no account yet, they get an invitation.';
    end if;
  else
    v_mail := lower(v_said);
    if position('@' in v_mail) < 2 then
      raise exception 'Share with an email address or an account, and % is neither.', v_said
        using errcode = '22023';
    end if;
    select u.id into v_user from auth.users u where lower(u.email) = v_mail order by u.created_at limit 1;
  end if;

  -- A member of the organization, or an address nobody signed up with: the invite door's own
  -- answer, which makes every one of its checks and says what it did.
  if v_user is null
     or exists (select 1 from iam.organization_member m
                 where m.organization_id = p_organization_id and m.user_id = v_user) then
    return custom.table_share_outside_invite(p_organization_id, p_table_id, v_mail, p_level)
           || jsonb_build_object('person', case when v_user is null then 'no_account' else 'member' end);
  end if;

  -- An account outside the organization: the invite door's rules, then the accept path's row.
  if not coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false) then
    raise exception 'Sharing with people outside % is turned off here, so % cannot be given %.',
      coalesce(v_org, 'this organization'), v_mail, v_name
      using errcode = '42501',
            hint = 'An owner or an administrator of this organization turns it on once, for everybody, in the organization''s settings (custom/external_principal_enabled). Until then, share this table with a colleague inside the organization instead.';
  end if;
  if not custom.may_invite_outside(p_organization_id, p_table_id) then
    raise exception 'You cannot share % with people from outside %.', v_name, coalesce(v_org, 'this organization')
      using errcode = '42501',
            hint = 'Who may do that is this organization''s own setting (custom/outside_invite_who). By default it is an owner or an administrator of the organization, or whoever holds Admin on the table itself.';
  end if;
  v_mylvl := custom.effective_level(custom.query_principal(), p_organization_id, p_table_id, 'record');
  if v_mylvl is null or p_level > v_mylvl then
    raise exception 'You hold % on %, so you cannot give somebody %.',
      coalesce(v_mylvl::text, 'nothing'), v_name, p_level::text
      using errcode = '42501',
            hint = 'Levels go viewer < commenter < editor < admin, and a share never confers more than the person sharing holds.';
  end if;

  v_perm := custom._share_write_person(p_organization_id, p_table_id, v_user, p_level, custom.query_principal());

  select l.means into v_means from custom.share_levels() l where l.level = p_level;
  select coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
                  nullif(btrim(u.email), ''), 'Somebody at ' || coalesce(v_org, 'an organization'))
    into v_who from auth.users u where u.id = custom.query_principal();
  v_sent := communication.notify_from_sql(
    p_organization_id, 'share.table_granted', v_user, v_mail, v_mail,
    jsonb_build_object('grant', jsonb_build_object(
      'table_id', p_table_id, 'organization_id', p_organization_id,
      'table', v_name, 'organization', coalesce(v_org, 'their organization'),
      'level', p_level::text, 'level_label', iam.level_label('table', p_level),
      'means', coalesce(v_means, 'read it'), 'sharer', v_who)),
    '/data/' || p_table_id::text || '?org=' || p_organization_id::text,
    'custom_table', p_table_id,
    'tablegrant:' || p_table_id::text || ':' || v_user::text || ':' || p_level::text);

  return jsonb_build_object(
    'invited', false,
    'granted', true,
    'joined', false,
    'person', 'outside_account',
    'user_id', v_user,
    'email', v_mail,
    'table', v_name,
    'level', p_level::text,
    'level_label', iam.level_label('table', p_level),
    'permission_id', v_perm,
    'notified', v_sent -> 'queued',
    'say', format('%s already has an account, so they were given %s as a %s straight away and told so. They can open it now. They are not in %s — that table is all they see there.',
                  v_mail, v_name, p_level::text, coalesce(v_org, 'this organization')));
end
$function$;

CREATE OR REPLACE FUNCTION custom.table_share_outside_invite(p_organization_id uuid, p_table_id uuid, p_email text, p_level permission_level DEFAULT 'viewer'::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mail  text := lower(btrim(coalesce(p_email, '')));
  v_row   custom.record;
  v_user  uuid;
  v_id    uuid;
  v_name  text;
  v_mylvl public.permission_level;
  v_org   text;
  v_sent  jsonb;
  v_grant jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_share_outside_invite');
  perform custom.assert_store_door(p_organization_id, 'custom.table_share_outside_invite');
  perform custom.assert_client_may_change(p_organization_id, p_table_id,
            'custom.table_share_outside_invite', 'admin'::public.permission_level, 'table');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_table_id
     and r.table_id = custom.table_kernel_id() and r.deleted_at is null;
  if not found then
    raise exception 'There is no such table in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_name := coalesce(nullif(v_row.data ->> 'name', ''), 'this table');
  select o.name into v_org from iam.organizations o where o.id = p_organization_id;

  if position('@' in v_mail) < 2 then
    raise exception 'An invitation needs an email address to send the link to.'
      using errcode = '22004';
  end if;
  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;

  if not coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false) then
    raise exception 'Sharing with people outside % is turned off here, so % cannot be invited to %.',
      coalesce(v_org, 'this organization'), v_mail, v_name
      using errcode = '42501',
            hint = 'An owner or an administrator of this organization turns it on once, for everybody, in the organization''s settings (custom/external_principal_enabled). Until then, share this table with a colleague inside the organization instead.';
  end if;

  if not custom.may_invite_outside(p_organization_id, p_table_id) then
    raise exception 'You cannot invite people from outside % to %.',
      coalesce(v_org, 'this organization'), v_name
      using errcode = '42501',
            hint = 'Who may do that is this organization''s own setting (custom/outside_invite_who). By default it is an owner or an administrator of the organization, or whoever holds Admin on the table itself.';
  end if;

  v_mylvl := custom.effective_level(custom.query_principal(), p_organization_id, p_table_id, 'record');
  if v_mylvl is null or p_level > v_mylvl then
    raise exception 'You hold % on %, so you cannot give somebody %.',
      coalesce(v_mylvl::text, 'nothing'), v_name, p_level::text
      using errcode = '42501',
            hint = 'Levels go viewer < commenter < editor < admin, and a share never confers more than the person sharing holds.';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = v_mail order by u.created_at limit 1;

  -- 🚨 ALREADY INSIDE: DO THE ORDINARY THING (FIX-10C, 2026-09-22).
  -- This used to raise and name `custom.share_grant` at the person. Now it
  -- CALLS it — the same door the people picker uses, which runs the ladder
  -- again on this same subject, so the friendlier answer is two doors agreeing
  -- rather than one being skipped.
  if v_user is not null and exists (select 1 from iam.organization_member m
                                     where m.organization_id = p_organization_id and m.user_id = v_user) then
    v_grant := custom.share_grant(p_organization_id, p_table_id, 'person', v_user, p_level);
    return jsonb_build_object(
      'invited', false,
      'granted', true,
      'invitation_id', null,
      'email', v_mail,
      'table', v_name,
      'level', p_level::text,
      'level_label', iam.level_label('table', p_level),
      'token', null,
      'accept_path', null,
      'delivery', null,
      'expires_at', null,
      'joined', true,
      'grant', v_grant,
      'say', format('%s is already in %s, so they were given %s directly, as a %s. They can open it now — no invitation, no link to follow. They are in the list of everybody who has access, above.',
                    v_mail, coalesce(v_org, 'this organization'), v_name, p_level::text),
      'delivery_say', null);
  end if;

  update iam.invitations
     set role        = p_level::text,
         metadata    = coalesce(metadata, '{}'::jsonb)
                       || jsonb_build_object('level', p_level::text,
                                             'subject', 'custom_table',
                                             'table_name', v_name),
         expires_at  = now() + interval '14 days',
         token       = gen_random_uuid()::text,
         status      = 'pending',
         accepted_at = null,
         invited_user_id = v_user,
         updated_by  = custom.query_principal(),
         updated_at  = now()
   where target_type = 'custom_table'
     and target_id = p_table_id
     and organization_id = p_organization_id
     and lower(email) = v_mail
     and deleted_at is null
     and status <> 'accepted'
  returning id into v_id;

  if v_id is null then
    insert into iam.invitations
      (organization_id, target_type, target_id, email, invited_user_id, role, status,
       expires_at, metadata, created_by, updated_by)
    values
      (p_organization_id, 'custom_table', p_table_id, v_mail, v_user, p_level::text, 'pending',
       now() + interval '14 days',
       jsonb_build_object('level', p_level::text, 'subject', 'custom_table', 'table_name', v_name),
       custom.query_principal(), custom.query_principal())
    returning id into v_id;
  end if;

  -- 🚨 THE HALF THAT WAS MISSING. Same transaction as the invitation: a rolled-back
  -- invite can never have told anybody about access they were not given.
  v_sent := custom._table_share_invite_deliver(v_id);

  return jsonb_build_object(
    'invited', true,
    'granted', false,
    'invitation_id', v_id,
    'email', v_mail,
    'table', v_name,
    'level', p_level::text,
    'level_label', iam.level_label('table', p_level),
    'token', (select i.token from iam.invitations i where i.id = v_id),
    'accept_path', v_sent ->> 'accept_path',
    'delivery', v_sent,
    'expires_at', (select i.expires_at from iam.invitations i where i.id = v_id),
    'joined', false,
    'say', format('%s is invited to %s as a %s. They get access the moment they follow the link and the platform gives them an identity — until then this row holds nothing, and they can see nothing of %s.',
                  v_mail, v_name, p_level::text,
                  coalesce(v_org, 'this organization')),
    'delivery_say', v_sent ->> 'say');
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_sync(p_organization_id uuid, p_home_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_src      jsonb := p_spec -> 'source';
  v_system   text;
  v_table    uuid;
  v_created  boolean := false;
  v_col      text;
  v_key      text;
  v_keys     jsonb := '{}'::jsonb;      -- header -> field key
  v_added    integer := 0;
  v_row      jsonb;
  v_vals     jsonb;
  v_rid      uuid;
  v_ins      integer := 0;
  v_upd      integer := 0;
  v_arch     integer := 0;
  v_seen     text[] := '{}';
  v_max      integer := coalesce((platform.knob_resolve('custom', 'table_sync_rows_max', p_organization_id) #>> '{}')::integer, 20000);
  v_old      record;
  v_have     jsonb;
  v_hit      jsonb;
  v_kept     integer := 0;
  v_cspec    jsonb;
  v_type     text;
  v_restored integer := 0;
  v_total    integer := 0;
  v_warn     jsonb := '[]'::jsonb;
  v_said     text;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_sync');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_sync');

  if jsonb_typeof(v_src) is distinct from 'object' or nullif(v_src ->> 'provider', '') is null
     or nullif(v_src ->> 'external_id', '') is null then
    raise exception 'A synced table says where it comes from: a provider and the source''s own id.'
      using errcode = '22023', hint = 'spec.source = {"provider": "google_sheets", "external_id": "<sheet id>", "tab_id": "<tab>"}. Nothing was written.';
  end if;
  if jsonb_typeof(p_spec -> 'columns') is distinct from 'array' or jsonb_array_length(p_spec -> 'columns') = 0 then
    raise exception 'A synced table needs the source''s columns.' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_spec -> 'rows', '[]'::jsonb)) > v_max then
    raise exception 'This refresh carries % rows; one refresh carries at most %.', jsonb_array_length(p_spec -> 'rows'), v_max
      using errcode = '54000', hint = 'Refresh in parts. The ceiling is the organization knob custom/table_sync_rows_max. Nothing was written.';
  end if;
  v_system := format('sync:%s:%s:%s', v_src ->> 'provider', v_src ->> 'external_id', coalesce(v_src ->> 'tab_id', ''));

  -- AN OUTSIDE DATABASE IS SYNCED BY THE SERVER ONLY (lane VISION-REACH wave 3). Its rows come from
  -- a connection held sealed in the vault, read by the server; a client sending them would be
  -- writing "outside" values of its own choosing into columns nobody may edit. A sheet tab is still
  -- synced from a client (records grid.ts sheetSyncSpec), so this is the postgres provider only.
  if v_src ->> 'provider' = 'postgres' and platform.is_client_channel() then
    raise exception 'A table synced from an outside database is refreshed by AI Matrx, not from here.'
      using errcode = '42501', hint = 'Press Refresh on the table. Nothing was written.';
  end if;
  -- ONE SYNC OF ONE SOURCE AT A TIME: two people opening the table together must not both add the
  -- same new rows (this door looks rows up, then writes them).
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || '|' || v_system, 0));

  -- 1 — the Table, found again by its source.
  select t.id into v_table from custom.record t
   where t.organization_id = p_organization_id and t.table_id = custom.table_kernel_id()
     and t.data_class = 'table' and t.deleted_at is null
     and t.data -> 'sync_source' ->> 'provider' = v_src ->> 'provider'
     and t.data -> 'sync_source' ->> 'external_id' = v_src ->> 'external_id'
     and coalesce(t.data -> 'sync_source' ->> 'tab_id', '') = coalesce(v_src ->> 'tab_id', '')
   limit 1;
  if v_table is null then
    -- a column is its name, or {name, type, config} (VISION-REACH wave 3: an outside database's types)
    v_key := regexp_replace(lower(btrim(coalesce(p_spec -> 'columns' -> 0 ->> 'name', p_spec -> 'columns' ->> 0))), '[^a-z0-9]+', '_', 'g');
    v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');
    if v_key !~ '^[a-z]' then v_key := 'f_' || v_key; end if;
    v_key := left(v_key, 48);
    v_table := custom.table_declare(p_organization_id, jsonb_build_object(
      'name', coalesce(nullif(btrim(p_spec ->> 'table_name'), ''), 'Synced sheet'),
      'slug', 'sync_' || left(md5(v_system), 12),
      'type', 'entity', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted',
      'label_singular', 'Row', 'label_plural', 'Rows', 'title_field', v_key,
      'agent_writable', true, 'retention_days', 3650,
      'default_sort', jsonb_build_array(jsonb_build_object('field', v_key, 'direction', 'asc')),
      'parent_id', p_home_id::text,
      'fields', jsonb_build_array(jsonb_build_object('name', v_key))));
    v_created := true;
  else
    perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.table_sync',
                                            'editor'::public.permission_level, 'table');
  end if;
  update custom.record set data = jsonb_set(data, '{sync_source}',
      -- LANE SYNC-AIRTABLE: what a PERSON set on the table (auto-refresh, write-back, who it runs as)
      -- survives a refresh whose source does not carry it.
      coalesce((select jsonb_object_agg(k, data -> 'sync_source' -> k)
                  from unnest(array['auto_refresh', 'write_back', 'set_by']) k
                 where data -> 'sync_source' ? k and not v_src ? k), '{}'::jsonb) || v_src, true)
   where organization_id = p_organization_id and id = v_table and table_id = custom.table_kernel_id();
  -- THE ONE WRITER OF SYNCED COLUMNS. custom._field_write_door refuses every other change to a Field
  -- with source 'synced' and every new row of a synced Table; this door's own writes to THIS Table
  -- pass. Transaction-local, set here and cleared before returning; set_config is no client door.
  perform set_config('app.table_sync_writing', v_table::text, true);

  -- 2 — the source's columns. A column the person added here is never touched.
  for v_cspec in select e from jsonb_array_elements(p_spec -> 'columns') e loop
    -- A column is its name (a sheet) or {name, type, config} (an outside database): number, datetime and
    -- boolean keep their type so the store can add, sort and date them; anything else is text.
    v_col := case when jsonb_typeof(v_cspec) = 'object' then v_cspec ->> 'name' else v_cspec #>> '{}' end;
    v_type := case when jsonb_typeof(v_cspec) = 'object' and v_cspec ->> 'type' in ('number', 'datetime', 'boolean')
                   then v_cspec ->> 'type' else 'text' end;
    v_key := regexp_replace(lower(btrim(v_col)), '[^a-z0-9]+', '_', 'g');
    v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');
    if v_key !~ '^[a-z]' then v_key := 'f_' || v_key; end if;
    v_key := left(v_key, 48);
    v_keys := v_keys || jsonb_build_object(v_col, v_key);
    if not exists (select 1 from custom.record f
                    where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                      and f.data_class = 'field' and f.deleted_at is null
                      and f.data ->> 'entity_definition_id' = v_table::text and f.data ->> 'key' = v_key
                      and not coalesce((f.data ->> 'declared_with_table')::boolean, false)) then
      perform custom.field_declare(p_organization_id, v_table, jsonb_build_object(
        'key', v_key, 'label', btrim(v_col), 'type', v_type, 'source', 'synced')
        || case when jsonb_typeof(v_cspec -> 'config') = 'object'
                then jsonb_build_object('config', v_cspec -> 'config') else '{}'::jsonb end);
      v_added := v_added + 1;
    end if;
  end loop;

  -- 3 — every row, found again by its reference (read once: a lookup per row is quadratic). The
  --     reference is the server's: one key column is its own text, a composite key is a JSON array
  --     of its parts (aidream services/external_databases row_ref), so ('x|y','z') and ('x','y|z')
  --     are two rows.
  select coalesce(jsonb_object_agg(q.ref, jsonb_build_object('id', q.id, 'archived', q.archived)), '{}'::jsonb)
    into v_have
    from (select distinct on (r.metadata ->> 'source_id') r.metadata ->> 'source_id' as ref, r.id,
                 (r.deleted_at is not null) as archived
            from custom.record r
           where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
             and r.metadata ->> 'source_system' = v_system
           order by r.metadata ->> 'source_id', r.deleted_at nulls first, r.created_at) q;
  for v_row in select e from jsonb_array_elements(coalesce(p_spec -> 'rows', '[]'::jsonb)) e loop
    if nullif(v_row ->> 'ref', '') is null then
      raise exception 'A synced row says which row of the source it is.' using errcode = '22023',
        hint = 'rows[].ref is the source''s own row reference. Nothing was written.';
    end if;
    if (v_row ->> 'ref') = any (v_seen) then
      -- TWO OUTSIDE ROWS WITH ONE REFERENCE cannot both be one row here: the first is kept and
      -- the person is told (nothing fails silently). With a collision-free reference this names
      -- a real duplicate in the outside table, which is theirs to look at.
      v_warn := v_warn || to_jsonb(format('Two outside rows share the reference %s; only the first was synced.', v_row ->> 'ref'));
      continue;
    end if;
    v_seen := v_seen || (v_row ->> 'ref');
    select coalesce(jsonb_object_agg(v_keys ->> k, x.v), '{}'::jsonb) into v_vals
      from jsonb_each(coalesce(v_row -> 'values', '{}'::jsonb)) x(k, v)
     where v_keys ? x.k;
    v_hit := v_have -> (v_row ->> 'ref');
    v_rid := (v_hit ->> 'id')::uuid;
    if v_rid is not null and (v_hit ->> 'archived')::boolean then
      -- A REFRESH REPAIRS (lane VISION-REACH wave 3, verifier 2026-10-03). A row archived here that
      -- the outside table still holds is brought back and given the outside values: the outside
      -- table is the one truth about which rows exist, and deleting here is refused anyway
      -- (custom.record_delete). It was "archived stays archived", which left a hidden row that
      -- no Refresh would ever mend. A restore the store refuses is SAID, never swallowed.
      begin
        perform custom.record_restore(p_organization_id, v_rid);
        perform custom.record_update(p_organization_id, v_rid, v_vals);
        v_have := v_have || jsonb_build_object(v_row ->> 'ref', jsonb_build_object('id', v_rid, 'archived', false));
        v_restored := v_restored + 1;
      exception when others then
        get stacked diagnostics v_said = message_text;
        v_warn := v_warn || to_jsonb(format('The outside row %s is archived here and could not be brought back: %s', v_row ->> 'ref', v_said));
        v_kept := v_kept + 1;
      end;
    elsif v_rid is null then
      v_rid := custom.record_write(p_organization_id, v_table, v_vals);
      update custom.record set metadata = coalesce(metadata, '{}'::jsonb)
                                          || jsonb_build_object('source_system', v_system, 'source_id', v_row ->> 'ref')
       where organization_id = p_organization_id and id = v_rid;
      v_have := v_have || jsonb_build_object(v_row ->> 'ref', jsonb_build_object('id', v_rid, 'archived', false));
      v_ins := v_ins + 1;
    else
      perform custom.record_update(p_organization_id, v_rid, v_vals);
      v_upd := v_upd + 1;
    end if;
  end loop;

  -- 4 — a row gone from the source is ARCHIVED, never destroyed: somebody may have written a
  --     note against it, and custom.record_restore brings it back.
  for v_old in
    select r.id from custom.record r
     where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
       and r.deleted_at is null and r.metadata ->> 'source_system' = v_system
       and not ((r.metadata ->> 'source_id') = any (v_seen))
  loop
    perform custom.record_delete(p_organization_id, v_old.id);
    v_arch := v_arch + 1;
  end loop;

  perform set_config('app.table_sync_writing', '', true);
  -- HONEST COUNTS: what is live here now, and everything this refresh could not reconcile.
  select count(*) into v_total from custom.record r
   where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
     and r.deleted_at is null and r.metadata ->> 'source_system' = v_system;
  return jsonb_build_object('table_id', v_table, 'created', v_created, 'fields_added', v_added,
    'rows_inserted', v_ins, 'rows_updated', v_upd, 'rows_archived', v_arch, 'rows_restored', v_restored,
    'rows_kept_archived', v_kept, 'rows_total', v_total, 'warnings', v_warn,
    'source_system', v_system);
end
$function$;

CREATE OR REPLACE FUNCTION custom.table_sync_settings_set(p_organization_id uuid, p_table_id uuid, p_settings jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_src  jsonb;
  v_auto text := p_settings ->> 'auto_refresh';
  v_who  uuid := custom.query_principal();
begin
  -- LANE SYNC-AIRTABLE: the sync knobs of one synced table (auto-refresh; write-back for a connected sheet).
  perform custom.assert_store_door(p_organization_id, 'custom.table_sync_settings_set');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_sync_settings_set');
  select t.data -> 'sync_source' into v_src from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if jsonb_typeof(v_src) is distinct from 'object' then
    raise exception 'This table is not synced from anywhere.' using errcode = '22023';
  end if;
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_sync_settings_set',
                                          'editor'::public.permission_level, 'table');
  if v_auto is not null then
    if v_auto not in ('off', 'hourly', 'daily', 'on_change') then
      raise exception 'Auto-refresh is off, hourly, daily or on_change, not "%".', v_auto using errcode = '22023';
    end if;
    if v_auto = 'on_change' and v_src ->> 'provider' <> 'matrx_view' then
      raise exception 'Only a table synced from another table refreshes on change; pick hourly or daily.' using errcode = '22023';
    end if;
    v_src := v_src || jsonb_build_object('auto_refresh', v_auto);
  end if;
  if p_settings ? 'write_back' then
    if v_src ->> 'provider' <> 'google_sheets' or coalesce(v_src ->> 'access', '') = 'link' then
      raise exception 'Only a sheet synced through a connected Google account can take edits back.' using errcode = '22023';
    end if;
    v_src := v_src || jsonb_build_object('write_back', coalesce((p_settings ->> 'write_back')::boolean, false));
  end if;
  if v_who is not null then v_src := v_src || jsonb_build_object('set_by', v_who); end if;
  update custom.record set data = jsonb_set(data, '{sync_source}', v_src, true)
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();
  return v_src;
end
$function$;

CREATE OR REPLACE FUNCTION custom.view_declare(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_dup uuid;
  v_id      uuid := nullif(p_spec ->> 'view_id', '')::uuid;
  v_name    text := nullif(btrim(p_spec ->> 'name'), '');
  v_filters jsonb := case when jsonb_typeof(p_spec -> 'filters') = 'object'
                          then p_spec -> 'filters' else '{}'::jsonb end;
  -- What the caller sent as the definition. Never the table and never the filters (both have
  -- their own place above), and never the hand-set order (custom.view_record_order_set's).
  v_in      jsonb := coalesce(case when jsonb_typeof(p_spec -> 'definition') = 'object'
                                   then (p_spec -> 'definition') - 'table_id'::text - 'filters'::text
                                        - 'order'::text
                              end, '{}'::jsonb);
  v_row     record;
  v_stray   text;
  v_def     jsonb;
  v_cleared text[];
  v_set     jsonb;
  v_keys    jsonb;
  v_levels  integer;
  v_old     jsonb := '{}'::jsonb;
  -- VIEW-SWITCH: whether the view being written IS the table's default (its designation).
  v_was_default boolean := false;
  -- VIEWS-AIRTABLE: locked / personal
  v_locked  boolean := false;
  v_is_mine boolean := false;
  v_editor  boolean := true;
  -- ORDER-FIX: the one order word a caller may send. A hand-set order is written by placing
  -- the rows (custom.view_record_order_set); a caller may only turn it off ("sorted").
  v_order_in text := case when jsonb_typeof(p_spec -> 'definition') = 'object'
                          then nullif(p_spec -> 'definition' ->> 'order', '') end;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.view_declare');
  perform custom.assert_store_door(p_organization_id, 'custom.view_declare');
  -- VIEWER, not editor. Writing down a question about a Table is not changing it.
  perform custom.assert_client_may_open(p_organization_id, p_table_id, 'custom.view_declare');

  if p_table_id is null then
    raise exception 'A saved view is a view OF something — name the table.'
      using errcode = '22004';
  end if;

  -- ── NOTION-SMALL-4 (law 4): A KEY THIS DOOR DOES NOT READ IS REFUSED BY NAME, NEVER DROPPED. The
  -- door reads exactly four top-level keys (view_id, name, filters, definition); everything a view
  -- keeps (where, sorts, layout, group_field...) lives INSIDE definition. A top-level  used to
  -- be ignored without a word and the person's filter simply never stuck.
  if jsonb_typeof(p_spec) is distinct from 'object' then
    raise exception 'A saved view is asked for as an object: {name, filters, definition}.'
      using errcode = '22023', hint = 'Nothing was written.';
  end if;
  if exists (select 1 from jsonb_object_keys(p_spec) k
              where k not in ('view_id', 'name', 'filters', 'definition')) then
    select k into v_stray from jsonb_object_keys(p_spec) k
     where k not in ('view_id', 'name', 'filters', 'definition') order by k limit 1;
    raise exception 'A saved view is asked for as {name, filters, definition}, and "%" is not one of those, so it was not saved.', v_stray
      using errcode = '22023',
            hint = case when exists (select 1 from custom.view_keys() r where r.path = v_stray)
                        then format('"%s" is a setting of the view: send it inside definition, as definition.%s. Nothing was written.', v_stray, v_stray)
                        else 'The settings a view keeps are listed by custom.view_keys() and go inside definition. Nothing was written.' end;
  end if;

  -- ── ORDER-FIX: A VIEW'S ORDER IS ITS SORT OR ITS HAND-SET ORDER, NEVER BOTH. A caller may say
  -- "sorted" (stop using the hand-set order); "manual" is written only by placing the rows.
  if v_order_in is not null and v_order_in <> 'sorted' then
    raise exception 'A view is put in a hand-set order by placing its rows, not by naming the word "%".', v_order_in
      using errcode = '22023',
            hint = 'Place the rows with custom.view_record_order_set; send order "sorted" (or a sort) to go back to a sort. Nothing was written.';
  end if;

  -- ── GRID-PRIMITIVES G7: `layout` IS THE VIEW'S KIND; THE GRID'S CHOICES ARE `grid`. A settings
  -- OBJECT sent as `layout` (G1's shape) is moved under `grid` rather than refused.
  if jsonb_typeof(v_in -> 'layout') = 'object' then
    v_in := (v_in - 'layout'::text)
            || jsonb_build_object('grid', coalesce(case when jsonb_typeof(v_in -> 'grid') = 'object'
                                                        then v_in -> 'grid' end, '{}'::jsonb)
                                          || (v_in -> 'layout'));
  end if;

  -- A key sent as JSON null means "clear it"; every other key sent replaces that one key.
  select coalesce(array_agg(e.key) filter (where jsonb_typeof(e.value) = 'null'), '{}'::text[]),
         coalesce(jsonb_object_agg(e.key, e.value) filter (where jsonb_typeof(e.value) <> 'null'), '{}'::jsonb)
    into v_cleared, v_set
    from jsonb_each(v_in) e;

  -- ── S1-PRIME VIEW-KEYS: A KEY CLEARED MUST BE A KEY. Clearing a setting no view has is the same
  -- misspelling as setting one.
  if exists (select 1 from unnest(v_cleared) c(k)
              where not exists (select 1 from custom.view_keys() r where r.path = c.k)) then
    raise exception 'A saved view has no setting called "%", so there is nothing to clear.',
                    (select c.k from unnest(v_cleared) c(k)
                      where not exists (select 1 from custom.view_keys() r where r.path = c.k) limit 1)
      using errcode = '22023', hint = 'The settings a view keeps are listed by custom.view_keys(). Nothing was written.';
  end if;

  -- ONE HIDDEN-COLUMN LIST. A caller that names hidden columns by Field ID (`hidden_fields`, the
  -- mover's shape) has them written where the grid and the gallery read them —
  -- `presentation.hiddenFields`, by Field KEY; the ids stay only as provenance under
  -- `moved_from.hidden_fields` when the view was moved in. Two lists of one thing drift.
  if jsonb_typeof(v_set -> 'hidden_fields') = 'array' then
    select coalesce(jsonb_agg(distinct f.data ->> 'key'), '[]'::jsonb) into v_keys
      from jsonb_array_elements_text(v_set -> 'hidden_fields') x(fid)
      join custom.record f
        on f.organization_id = p_organization_id and f.id = platform.uuid_or_null(x.fid)
       and f.data_class = 'field' and f.data ->> 'key' is not null
       and f.data ->> 'entity_definition_id' = p_table_id::text;
    if jsonb_typeof(v_set -> 'moved_from') = 'object' then
      v_set := jsonb_set(v_set, '{moved_from,hidden_fields}', v_set -> 'hidden_fields', true);
    end if;
    v_set := jsonb_set(v_set - 'hidden_fields'::text, '{presentation}',
                       coalesce(case when jsonb_typeof(v_set -> 'presentation') = 'object'
                                     then v_set -> 'presentation' end, '{}'::jsonb)
                       || jsonb_build_object('hiddenFields', v_keys), true);
  end if;

  if v_id is not null then
    select sv.* into v_row
      from platform.saved_view sv
     where sv.id = v_id and sv.organization_id = p_organization_id and sv.deleted_at is null
       and sv.surface_key = 'custom/records'
       and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id
       for update;
    if v_row.id is null then
      raise exception 'There is no such saved view here.' using errcode = '23503',
              hint = 'It may have been removed, it may be a view of another table, or it may belong to another organization — organizations are hard walls (REC-29).',
            detail = jsonb_build_object('id', v_id)::text;
    end if;
    v_old := coalesce(v_row.definition, '{}'::jsonb);
  end if;

  -- ── S1-PRIME VIEW-KEYS: EVERY KEY SENT IS JUDGED BY THE REGISTRY, AND THE FILTER BY THE ONE
  -- COMPILER, BEFORE ANYTHING IS WRITTEN. `moved_from` is the server's and is not judged here.
  v_set := (custom.view_keys_check(p_organization_id, p_table_id, v_set - 'moved_from'::text,
                                   v_old))
           || coalesce(case when v_set ? 'moved_from' then jsonb_build_object('moved_from', v_set -> 'moved_from') end, '{}'::jsonb);
  -- ── VIEW-SWITCH-NOT-DESIGNATION (VERIFIER-21, 2026-09-25): LOOKING AT A TABLE IS NOT DECIDING
  -- HOW IT OPENS. The table's default view — its `is_default` and its `layout` — is the
  -- table's DESIGNATION: how it opens for everyone. It is changed by one deliberate act, by someone
  -- who may edit the table: `custom.view_designate`. This door (VIEWER on the table) keeps every
  -- other setting of every view, but never the designation, so pressing Kanban or Calendar can
  -- never again open a member's table in the owner's last look.
  if v_id is not null then
    v_was_default := coalesce(v_row.is_default, false) or (v_old -> 'is_default') = 'true'::jsonb;
    if v_was_default
       and ((v_set ? 'layout' and (v_set ->> 'layout') is distinct from coalesce(v_old ->> 'layout', 'grid'))
            or 'layout' = any(v_cleared)) then
      raise exception 'Looking at this table as a % does not change how it opens for everyone, so it was not saved onto its default view.',
                      coalesce(v_set ->> 'layout', 'grid')
        using errcode = '22023',
              hint = 'The table''s default layout is changed only by "Make this the default" (custom.view_designate), by someone who can edit the table. Nothing was written.';
    end if;
    if (v_set ? 'is_default' and (v_set -> 'is_default') is distinct from to_jsonb(v_was_default))
       or ('is_default' = any(v_cleared) and v_was_default) then
      raise exception 'Which view a table opens on is chosen with "Make this the default", not by saving a view.'
        using errcode = '22023',
              hint = 'Use custom.view_designate, by someone who can edit the table. Nothing was written.';
    end if;
  elsif (v_set -> 'is_default') = 'true'::jsonb
        and exists (select 1 from platform.saved_view sv
                     where sv.organization_id = p_organization_id and sv.deleted_at is null
                       and sv.surface_key = 'custom/records'
                       and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id
                       and (sv.is_default or (sv.definition -> 'is_default') = 'true'::jsonb)) then
    raise exception 'This table already has a default view, so a new view cannot be saved as it.'
      using errcode = '22023',
            hint = 'Save the view, then use "Make this the default" (custom.view_designate), by someone who can edit the table. Nothing was written.';
  end if;

  -- ── VIEW-LOOK (VERIFIER-23 item 1, 2026-09-25): A LOOK IS YOURS UNTIL YOU SAVE IT. A saved view
  -- is how everybody who opens it sees the table; choosing a board's grouping, a calendar's date
  -- field, a sort, a filter, a hidden column or a width while looking is the person's OWN look
  -- (custom.view_look_set) until someone who may EDIT the table saves it onto the view. So a
  -- change to a view that already exists needs editor on the table — or the view is the caller's
  -- own and is not the table's default. Saving a NEW view is unchanged (viewer).
  if v_id is not null then
    if not custom.query_is_store_owner()
       and custom.query_principal() is not null
       and not (v_row.created_by is not distinct from custom.query_principal() and not v_was_default)
       and not custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'editor'::public.permission_level) then
      raise exception 'Only someone who can edit this table saves a change onto its view "%" for everyone, so your change was not saved onto it.', v_row.name
        using errcode = '42501',
              hint = 'Your own look at this view is kept for you alone (custom.view_look_set) and "Reset to view" returns to it; someone who can edit the table presses "Save to view". Nothing was written.';
    end if;
  end if;

  -- ── VIEWS-AIRTABLE (2026-10-10): LOCKED AND PERSONAL VIEWS. A locked view is saved over only by someone who
  -- can EDIT the table (a personal look at it stays the person's own: custom.view_look_set). A view turns
  -- Personal (only its creator lists it) or Collaborative (everyone with the table) by its creator or an editor.
  if v_id is not null then
    v_locked  := (v_old -> 'presentation' ->> 'locked') = 'true';
    v_is_mine := v_row.created_by is not distinct from custom.query_principal();
    v_editor  := custom.query_is_store_owner() or custom.query_principal() is null
                 or custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'editor'::public.permission_level);
    if v_locked and not v_editor then
      raise exception 'The view "%" is locked, so it was not changed. Someone who can edit this table can unlock it.', v_row.name
        using errcode = '42501',
              hint = 'Your own look at it is kept for you alone (custom.view_look_set); an editor of the table unlocks the view. Nothing was written.';
    end if;
    if (v_set ? 'personal' or 'personal' = any(v_cleared)) and not v_editor and not v_is_mine then
      raise exception 'Only the person who made the view "%" or someone who can edit this table changes whether it is personal.', v_row.name
        using errcode = '42501', hint = 'Nothing was written.';
    end if;
  end if;
  if (v_set -> 'personal') = 'true'::jsonb
     and ((v_set -> 'is_default') = 'true'::jsonb or v_was_default or (v_old -> 'is_default') = 'true'::jsonb) then
    raise exception 'A table opens on a view everyone can see, so the default view cannot be personal.'
      using errcode = '22023', hint = 'Make the view collaborative first. Nothing was written.';
  end if;

  -- VIEWS-AIRTABLE-LOCKER: locking a view is an editor's act, so nobody can lock themselves out of a view they then cannot unlock.
  if (v_set -> 'presentation' ->> 'locked') = 'true'
     and not (custom.query_is_store_owner() or custom.query_principal() is null
              or custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'editor'::public.permission_level)) then
    raise exception 'Only someone who can edit this table locks a view.'
      using errcode = '42501', hint = 'Nothing was written.';
  end if;

  -- `filters` is the FLAT map the digests and the notifier read (custom.agg_view_admits); a Rule
  -- expression there would be refused by name the first time a subscription asks it, so it is
  -- refused here, with where it belongs.
  if p_spec ? 'filters' and v_filters <> '{}'::jsonb then
    if custom.filter_is_rule(v_filters) then
      raise exception 'A view''s filters are the flat Field-to-value map, and this is a Rule expression.'
        using errcode = '22023', hint = 'Send a nested question as definition.where (S2-PRIME); the digests and the notifier read filters. Nothing was written.';
    end if;
    perform custom.record_filter_sql(p_organization_id, p_table_id, v_filters);
  end if;

  if v_id is not null then
    -- MERGE. What the caller did not send stays exactly as it was.
    v_def := coalesce(v_row.definition, '{}'::jsonb);
    v_set := v_set - 'moved_from'::text;
    v_cleared := array_remove(v_cleared, 'moved_from');
    if jsonb_typeof(v_set -> 'grid') = 'object' and jsonb_typeof(v_def -> 'grid') = 'object' then
      v_set := jsonb_set(v_set, '{grid}', (v_def -> 'grid') || (v_set -> 'grid'));
    end if;
    v_def := (v_def - v_cleared) || v_set;
    if p_spec ? 'filters' then
      v_def := jsonb_set(v_def, '{filters}', v_filters, true);
    end if;
    -- The table is the view's for life.
    v_def := jsonb_set(v_def, '{table_id}', to_jsonb(p_table_id), true);
    if not (v_def ? 'filters') then
      v_def := jsonb_set(v_def, '{filters}', '{}'::jsonb, true);
    end if;
    if v_def ? 'grid' then
      v_def := jsonb_set(v_def, '{grid}', custom.grid_layout_check(v_def -> 'grid', 'view'));
    end if;
  else
    -- THE ONE SHAPE THE NOTIFIER READS. `custom.agg_view_admits` and
    -- `custom.agg_view_admits_state` both take `{"table_id": …, "filters": {…}}`, so a
    -- view saved here needs no translation before a subscription can be written over it.
    -- THE CASTS ARE NOT DECORATION (42725 without them: `jsonb - text` vs `jsonb - text[]`).
    v_def := jsonb_build_object('table_id', p_table_id, 'filters', v_filters) || v_set;
    if v_def ? 'grid' then
      v_def := jsonb_set(v_def, '{grid}', custom.grid_layout_check(v_def -> 'grid', 'view'));
    end if;
  end if;

  -- ── ORDER-FIX: CHOOSING A SORT REPLACES THE HAND-SET ORDER (Airtable's rule: a manual order is
  -- one of a view's sorts, and picking a column sort replaces it). The positions stay on the
  -- view's row, so placing the rows again starts from the order the person last kept.
  if v_def ->> 'order' = 'manual'
     and (v_order_in = 'sorted'
          or (jsonb_typeof(v_set -> 'sorts') = 'array' and jsonb_array_length(v_set -> 'sorts') > 0)) then
    v_def := jsonb_set(v_def, '{order}', '"sorted"'::jsonb, true);
  end if;

  -- ── S1-PRIME VIEW-KEYS: THE KEYS THAT MUST AGREE, ASKED OF THE VIEW AS IT WILL BE STORED.
  if nullif(v_def ->> 'swimlane_field', '') is not null
     and v_def ->> 'swimlane_field' = v_def ->> 'group_field' then
    raise exception 'The swimlanes and the columns are both %, so every lane would hold one column.', v_def ->> 'swimlane_field'
      using errcode = '22023', hint = 'A swimlane cuts the board by a second field. Nothing was written.';
  end if;
  v_levels := case when jsonb_typeof(v_def -> 'presentation' -> 'grouping') = 'object'
                   then 1 + coalesce(case when jsonb_typeof(v_def -> 'presentation' -> 'grouping' -> 'then') = 'array'
                                          then jsonb_array_length(v_def -> 'presentation' -> 'grouping' -> 'then') end, 0)
                   else 0 end;
  if v_levels > 3 then
    raise exception 'A view groups at most three levels deep, and this one would group %.', v_levels
      using errcode = '22023', hint = 'Nothing was written.';
  end if;

  if v_id is not null then
    update platform.saved_view
       set name = coalesce(v_name, name), definition = v_def, updated_at = now(), version = version + 1
     where id = v_id and organization_id = p_organization_id;
    return v_id;
  end if;

  -- MAKE-VIEWDUP: declaring the same view again (same table, same name, same definition apart from
  -- which view is the default) answers the live one already there instead of storing a copy; a
  -- template installed twice into a reused table keeps one "Approval board", not four.
  select sv.id into v_dup from platform.saved_view sv
   where sv.organization_id = p_organization_id and sv.deleted_at is null
     and sv.surface_key = 'custom/records'
     and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id
     and sv.name = coalesce(v_name, 'Saved view')
     and (coalesce((sv.definition ->> 'personal')::boolean, false) = false or sv.created_by is not distinct from custom.query_principal())
     and (sv.definition - 'is_default'::text) = (v_def - 'is_default'::text)
   order by sv.created_at limit 1;
  if v_dup is not null then
    return v_dup;
  end if;

  insert into platform.saved_view
    (name, surface_key, subject_id, definition, organization_id, created_by, visibility)
  values (coalesce(v_name, 'Saved view'), 'custom/records', p_table_id, v_def, p_organization_id,
          custom.query_principal(), 'internal'::platform.visibility)
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.view_designate(p_organization_id uuid, p_table_id uuid, p_view_id uuid, p_layout text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row record;
  v_set jsonb := '{}'::jsonb;
  v_me  uuid := custom.query_principal();
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.view_designate');
  perform custom.assert_store_door(p_organization_id, 'custom.view_designate');
  -- EDITOR, not viewer: how a table opens is how it opens for everyone who can open it.
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.view_designate',
                                          'editor'::public.permission_level, 'table');

  if p_table_id is null or p_view_id is null then
    raise exception 'Name the table and the view that should be its default.'
      using errcode = '22004';
  end if;

  select sv.* into v_row
    from platform.saved_view sv
   where sv.id = p_view_id and sv.organization_id = p_organization_id and sv.deleted_at is null
     and sv.surface_key = 'custom/records'
     and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id
     for update;
  if v_row.id is null then
    raise exception 'There is no such saved view here.' using errcode = '23503',
            hint = 'It may have been removed, it may be a view of another table, or it may belong to another organization — organizations are hard walls (REC-29).',
            detail = jsonb_build_object('view_id', p_view_id)::text;
  end if;

  if (v_row.definition ->> 'personal') = 'true' then
    raise exception 'A table opens on a view everyone can see, so a personal view cannot be its default.'
      using errcode = '22023', hint = 'Make the view collaborative first. Nothing was written.';
  end if;

  -- The layout is a view setting like any other, judged by the one registry (grid, kanban,
  -- calendar, gallery, sheet; anything else refused by name).
  if nullif(btrim(p_layout), '') is not null then
    v_set := custom.view_keys_check(p_organization_id, p_table_id,
                                    jsonb_build_object('layout', btrim(p_layout)),
                                    coalesce(v_row.definition, '{}'::jsonb));
  end if;

  -- ONE DEFAULT PER TABLE: every other default view of this table stops being it.
  update platform.saved_view sv
     set is_default = false,
         definition = jsonb_set(coalesce(sv.definition, '{}'::jsonb), '{is_default}', 'false'::jsonb, true),
         updated_at = now(), updated_by = coalesce(v_me, sv.updated_by), version = sv.version + 1
   where sv.organization_id = p_organization_id and sv.deleted_at is null
     and sv.surface_key = 'custom/records'
     and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id
     and sv.id <> p_view_id
     and (sv.is_default or (sv.definition -> 'is_default') = 'true'::jsonb);

  update platform.saved_view sv
     set is_default = true,
         definition = coalesce(sv.definition, '{}'::jsonb)
                      || jsonb_build_object('is_default', true, 'table_id', p_table_id)
                      || v_set,
         updated_at = now(), updated_by = coalesce(v_me, sv.updated_by), version = sv.version + 1
   where sv.id = p_view_id and sv.organization_id = p_organization_id;
  return p_view_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.work_template_declare(p_organization_id uuid, p_name text, p_graph jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_id   uuid;
  v_node jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.work_template_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_template_declare');
  if p_organization_id is null then
    raise exception 'custom.work_template_declare: organization_id is required - the store is keyed (organization_id, id)'
      using errcode = '22004';
  end if;

  -- A template NAMES the tables it will write into. Declaring one against a table this
  -- person cannot change would be a way to hand somebody else a change they never asked
  -- for, so every table in the graph is decided here, at the rung writing it takes.
  if jsonb_typeof(coalesce(p_graph, '{}'::jsonb) -> 'nodes') = 'array' then
    for v_node in select e from jsonb_array_elements(p_graph -> 'nodes') e loop
      if (v_node ->> 'table') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        perform custom.assert_client_may_change(p_organization_id, (v_node ->> 'table')::uuid,
                                                'custom.work_template_declare',
                                                'editor'::public.permission_level, 'table');
      end if;
    end loop;
  end if;

  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'work_template',
          jsonb_build_object('name', coalesce(nullif(btrim(p_name), ''), 'Template'),
                             'graph', coalesce(p_graph, '{}'::jsonb)))
  returning id into v_id;
  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.grant_org_availability(p_resource_type text, p_resource_id uuid, p_target_org_id uuid, p_permission_level text DEFAULT 'viewer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_resolved record; v_owner_col text; v_owner_id uuid; v_new_id uuid;
  v_members_can_add boolean; v_requires_approval boolean; v_default_perm permission_level;
  v_is_admin boolean; v_status text := 'active'; v_level text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  BEGIN SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
  v_owner_col := public.shareable_owner_column(v_resolved.schema_name, v_resolved.table_name, v_resolved.owner_column);
  EXECUTE format('SELECT %I FROM %I.%I WHERE %I = $1', v_owner_col, v_resolved.schema_name, v_resolved.table_name, v_resolved.id_column)
    INTO v_owner_id USING p_resource_id;
  IF NOT public.shareable_resource_exists(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource not found');
  END IF;
  IF NOT public.may_manage_sharing(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You need Admin on this to decide who else may see it. Ask whoever holds it, or an owner of the organization.');
  END IF;
  IF v_resolved.schema_name = 'custom' THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Shares name a person, not an organization. A table in the record store is shared with people by name.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM iam.organization_member WHERE organization_id=p_target_org_id AND user_id=v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found or you are not a member'); END IF;
  SELECT members_can_add, needs_approval, default_permission
    INTO v_members_can_add, v_requires_approval, v_default_perm
    FROM platform.org_module_config
   WHERE organization_id = p_target_org_id AND module_token = v_resolved.resource_type;
  v_members_can_add   := COALESCE(v_members_can_add, true);
  v_requires_approval := COALESCE(v_requires_approval, false);
  v_level := COALESCE(p_permission_level, v_default_perm::text, 'viewer');
  IF v_level NOT IN ('viewer', 'commenter', 'edit_content', 'editor', 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level'); END IF;
  SELECT EXISTS (SELECT 1 FROM iam.organization_member WHERE organization_id=p_target_org_id AND user_id=v_uid AND role IN ('owner','admin')) INTO v_is_admin;
  IF NOT v_members_can_add AND NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Members cannot add this kind to the organization'); END IF;
  IF v_requires_approval AND NOT v_is_admin THEN v_status := 'pending'; END IF;
  IF EXISTS (SELECT 1 FROM iam.permissions WHERE resource_type=v_resolved.resource_type AND resource_id=p_resource_id AND granted_to_organization_id=p_target_org_id AND status <> 'archived') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization already has access'); END IF;
  PERFORM iam._org_availability_arm();
  -- A grant removed earlier is kept as the record (T-32g); making it available again reopens that row.
  UPDATE iam.permissions
     SET status = v_status, permission_level = v_level::permission_level, created_by = v_uid,
         granted_via = 'availability', expires_at = NULL, reviewed_by = NULL, reviewed_at = NULL
   WHERE resource_type=v_resolved.resource_type AND resource_id=p_resource_id
     AND granted_to_organization_id=p_target_org_id AND status = 'archived'
  RETURNING id INTO v_new_id;
  IF v_new_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true,
      'message', CASE WHEN v_status='pending' THEN 'Shared — pending admin approval' ELSE 'Available to everyone in the organization' END,
      'permission_id', v_new_id, 'status', v_status, 'permission_level', v_level, 'resource_type', v_resolved.resource_type);
  END IF;
  INSERT INTO iam.permissions (resource_type, resource_id, granted_to_organization_id, permission_level, created_by, status, granted_via)
  VALUES (v_resolved.resource_type, p_resource_id, p_target_org_id, v_level::permission_level, v_uid, v_status, 'availability')
  RETURNING id INTO v_new_id;
  RETURN jsonb_build_object('success', true,
    'message', CASE WHEN v_status='pending' THEN 'Shared — pending admin approval' ELSE 'Available to everyone in the organization' END,
    'permission_id', v_new_id, 'status', v_status, 'permission_level', v_level, 'resource_type', v_resolved.resource_type);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $function$;

CREATE OR REPLACE FUNCTION iam._guard_edit_content_structure()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_token text := TG_ARGV[0];
  v_cols  text[] := string_to_array(TG_ARGV[1], ',');
  v_old   jsonb := to_jsonb(OLD);
  v_new   jsonb := to_jsonb(NEW);
  v_uid   uuid;
  v_col   text;
begin
  if current_user <> 'authenticated' then return NEW; end if;
  v_uid := coalesce(nullif(current_setting('app.user_id', true), '')::uuid, (select auth.uid()));
  if v_uid is null then return NEW; end if;
  if (v_old ->> 'created_by') is not null and (v_old ->> 'created_by')::uuid = v_uid then return NEW; end if;
  foreach v_col in array v_cols loop
    if (v_new -> v_col) is not distinct from (v_old -> v_col) then continue; end if;
    if coalesce(iam.has_access(v_token, (v_old ->> 'id')::uuid, 'editor'::public.permission_level), false)
       or coalesce(public.is_platform_admin(), false) then
      return NEW;
    end if;
    raise exception using
      errcode = '42501',
      message = format('Edit-content access does not include changing "%s" on this %s.', v_col, v_token),
      detail  = format('"%s" is part of how this %s is organised, shared or published, not its content.', v_col, v_token),
      hint    = 'Ask the owner to make this change, or ask them for editor access to this item.';
  end loop;
  return NEW;
end
$function$;

CREATE OR REPLACE FUNCTION iam.content_levels()
 RETURNS TABLE(level permission_level, ordinal integer, noun text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  return query
    select e.enumlabel::text::public.permission_level,
           row_number() over (order by e.enumsortorder)::integer,
           case e.enumlabel
             when 'viewer'    then 'can read it'
             when 'commenter' then 'can read it and say something about it'
             when 'edit_content' then 'can change the content, not the structure or the sharing'
             when 'editor'    then 'can change it'
             when 'admin'     then 'can change it and decide who else may'
           end
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'permission_level'
     order by e.enumsortorder;
end
$function$;

CREATE OR REPLACE FUNCTION iam.permission_means(p_level permission_level)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_level
           when 'viewer' then 'can open and read it'
           when 'commenter' then 'can read and comment on it'
           when 'edit_content' then 'can read and change the content, not the structure or the sharing'
           when 'editor' then 'can read and change it'
           when 'admin' then 'can read, change and share it'
         end
$function$;

CREATE OR REPLACE FUNCTION iam.share_with_person(p_resource_type text, p_resource_id uuid, p_target_user_id uuid, p_level permission_level, p_actor uuid, p_restore_removed boolean DEFAULT true, p_basis text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_exact boolean DEFAULT false, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resolved record;
  v_type     text := p_resource_type;
  v_row      iam.permissions;
  v_id       uuid;
  v_level    public.permission_level;
  v_expires  timestamptz;
begin
  if p_actor is null and p_basis is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;
  if p_level is null then
    return jsonb_build_object('success', false, 'error', 'Invalid permission level');
  end if;
  if p_target_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Say which person to share with.');
  end if;

  if p_basis is null then
    begin
      select * into strict v_resolved from public.resolve_shareable_resource(p_resource_type);
    exception when others then
      return jsonb_build_object('success', false, 'error', sqlerrm);
    end;
    v_type := v_resolved.resource_type;

    if not public.shareable_resource_exists(v_type, p_resource_id) then
      return jsonb_build_object('success', false, 'error', 'Resource not found');
    end if;
    if not iam.may_manage_sharing_as(p_actor, v_type, p_resource_id) then
      return jsonb_build_object('success', false, 'error',
        'You need Admin on this to decide who else may see it. Ask whoever holds it, or an owner of the organization.');
    end if;

    -- SCHEMA `custom` KEEPS ITS OWN DOOR (the store switch, VIS-31's external principal, VIS-34's
    -- both-sides wall). That door judges the signed-in caller, so it is only reached by one. It
    -- writes its row back through this function with p_basis = 'record_store'.
    if v_resolved.schema_name = 'custom' then
      if p_actor is distinct from (select auth.uid()) then
        return jsonb_build_object('success', false, 'error',
          'A record in a table is shared by a signed-in person from the table itself; it cannot be shared on someone''s behalf.');
      end if;
      return public.store_door_share(v_type, p_resource_id, 'person', p_target_user_id, p_level::text);
    end if;
  end if;

  insert into iam.permissions
    (resource_type, resource_id, granted_to_user_id, permission_level, created_by, granted_via, status,
     expires_at, review_note)
  values (v_type, p_resource_id, p_target_user_id, p_level, p_actor, 'share', 'active',
          p_expires_at, p_note)
  on conflict (resource_type, resource_id, granted_to_user_id) do nothing
  returning id into v_id;
  if v_id is not null then
    return jsonb_build_object('success', true, 'outcome', 'shared', 'message', 'Successfully shared with user',
      'permission_id', v_id, 'permission_level', p_level::text, 'resource_type', v_type);
  end if;

  select * into v_row from iam.permissions p
   where p.resource_type = v_type and p.resource_id = p_resource_id and p.granted_to_user_id = p_target_user_id
   for update;

  -- A live grant: raise (or, for a rule that owns the level, set exactly).
  -- A removed grant a timed door reopened (reviewed_by kept) is still removed to everyone else.
  if v_row.status = 'active' and v_row.reviewed_by is not null and not p_restore_removed then
    return jsonb_build_object('success', false, 'outcome', 'removed', 'permission_id', v_row.id,
      'resource_type', v_type, 'person', p_target_user_id,
      'error', 'This person''s access was removed earlier, so it is not given back automatically. Share with them directly to give it back.');
  end if;

  if v_row.status = 'active' and (v_row.expires_at is null or v_row.expires_at > now()) then
    if p_exact then
      v_level := p_level;
      v_expires := p_expires_at;
    else
      v_level := greatest(v_row.permission_level, p_level);
      v_expires := case when v_row.expires_at is null or p_expires_at is null then null
                        else greatest(v_row.expires_at, p_expires_at) end;
    end if;
    if v_level = v_row.permission_level and v_expires is not distinct from v_row.expires_at then
      return jsonb_build_object('success', true, 'outcome', 'unchanged',
        'message', format('They already have %s access.', v_row.permission_level::text),
        'permission_id', v_row.id, 'permission_level', v_row.permission_level::text, 'resource_type', v_type);
    end if;
    update iam.permissions set permission_level = v_level, expires_at = v_expires where id = v_row.id;
    return jsonb_build_object('success', true,
      'outcome', case when v_level > v_row.permission_level then 'raised' else 'changed' end,
      'message', format('Changed from %s to %s.', v_row.permission_level::text, v_level::text),
      'permission_id', v_row.id, 'permission_level', v_level::text, 'resource_type', v_type);
  end if;

  -- A lapsed grant (its time ran out) or one that ended with its basis: given again.
  if (v_row.status = 'active' and v_row.reviewed_by is null)
     or (v_row.status = 'archived' and v_row.reviewed_by is null) then
    update iam.permissions
       set status = 'active', permission_level = p_level, expires_at = p_expires_at,
           created_by = coalesce(p_actor, created_by), granted_via = 'share',
           review_note = coalesce(p_note, review_note), reviewed_by = null, reviewed_at = null
     where id = v_row.id;
    return jsonb_build_object('success', true, 'outcome', 'shared', 'message', 'Successfully shared with user',
      'permission_id', v_row.id, 'permission_level', p_level::text, 'resource_type', v_type);
  end if;

  -- REMOVED by a person: only a deliberate share by someone allowed to share gives it back.
  if v_row.status in ('archived', 'active') and p_restore_removed then
    update iam.permissions
       set status = 'active', permission_level = p_level, expires_at = p_expires_at,
           created_by = p_actor, granted_via = 'share',
           reviewed_by = case when p_basis is not null and p_expires_at is not null then reviewed_by end,
           reviewed_at = case when p_basis is not null and p_expires_at is not null then reviewed_at end
     where id = v_row.id;
    return jsonb_build_object('success', true, 'outcome', 'restored', 'message', 'Access given back',
      'permission_id', v_row.id, 'permission_level', p_level::text, 'resource_type', v_type);
  end if;

  return jsonb_build_object('success', false, 'outcome', 'removed', 'permission_id', v_row.id,
    'resource_type', v_type, 'person', p_target_user_id,
    'error', case v_row.status
      when 'pending'  then 'This person''s access is waiting for review, so it is not changed here.'
      when 'rejected' then 'This person''s access was declined in review, so it is not given here.'
      else 'This person''s access was removed earlier, so it is not given back automatically. Share with them directly to give it back.'
    end);
end;
$function$;

CREATE OR REPLACE FUNCTION public.move_file(p_file_id uuid, p_new_parent_folder_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_owner uuid; v_name text; v_old_path text; v_folder_path text;
        v_folder_owner uuid; v_folder_org uuid; v_file_org uuid; v_new_path text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden: not authorized to move file %', p_file_id USING ERRCODE='42501';
  END IF;

  SELECT created_by, file_name, file_path, organization_id
    INTO v_owner, v_name, v_old_path, v_file_org
    FROM files.files WHERE id = p_file_id AND deleted_at IS NULL;
  IF v_owner IS NULL THEN
    perform platform.refuse_not_found(format('file %s not found', p_file_id));
  END IF;

  IF p_new_parent_folder_id IS NULL THEN
    v_folder_path := '';
    v_folder_org  := v_file_org;
  ELSE
    SELECT created_by, folder_path, organization_id
      INTO v_folder_owner, v_folder_path, v_folder_org
      FROM files.folders WHERE id = p_new_parent_folder_id AND deleted_at IS NULL;
    IF v_folder_owner IS NULL THEN
      perform platform.refuse_not_found(format('folder %s not found', p_new_parent_folder_id));
    END IF;
    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_new_parent_folder_id, 'editor') THEN
      RAISE EXCEPTION 'forbidden: not authorized to move into folder %', p_new_parent_folder_id
        USING ERRCODE='42501';
    END IF;
    v_folder_path := trim(both '/' from coalesce(v_folder_path, ''));
  END IF;

  IF v_folder_org IS DISTINCT FROM v_file_org THEN
    RAISE EXCEPTION 'cross-organization move refused: file % belongs to organization %, folder % to organization %',
      p_file_id, v_file_org, p_new_parent_folder_id, v_folder_org USING ERRCODE='42501';
  END IF;

  v_new_path := CASE WHEN v_folder_path = '' THEN v_name ELSE v_folder_path || '/' || v_name END;
  -- Announce the primitive to files.guard_rename_path_columns (migration 038),
  -- transaction-local and scoped to THIS row, then withdraw it immediately so a
  -- later hand UPDATE in the same transaction is still refused.
  PERFORM set_config('matrx.rename_primitive', p_file_id::text, true);
  UPDATE files.files
     SET parent_folder_id = p_new_parent_folder_id,
         file_path        = v_new_path,
         updated_at       = now()
   WHERE id = p_file_id;

  PERFORM set_config('matrx.rename_primitive', '', true);

  RETURN jsonb_build_object('file_id', p_file_id, 'old_path', v_old_path,
                            'new_path', v_new_path, 'folder_id', p_new_parent_folder_id);
END; $function$;

CREATE OR REPLACE FUNCTION public.rename_file(p_file_id uuid, p_new_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_owner uuid; v_old_path text; v_parent uuid; v_new_path text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden: not authorized to rename file %', p_file_id USING ERRCODE='42501';
  END IF;
  SELECT created_by, file_path, parent_folder_id INTO v_owner, v_old_path, v_parent
    FROM files.files WHERE id = p_file_id AND deleted_at IS NULL;
  IF v_owner IS NULL THEN
    perform platform.refuse_not_found(format('file %s not found', p_file_id));
  END IF;

  p_new_name := files.assert_safe_file_name(p_new_name);

  v_new_path := CASE WHEN position('/' in v_old_path) = 0 THEN p_new_name
                     ELSE regexp_replace(v_old_path, '[^/]+$', '') || p_new_name END;
  -- Announce the primitive to files.guard_rename_path_columns (migration 038),
  -- transaction-local and scoped to THIS row, then withdraw it immediately so a
  -- later hand UPDATE in the same transaction is still refused.
  PERFORM set_config('matrx.rename_primitive', p_file_id::text, true);
  UPDATE files.files
     SET file_name = p_new_name, file_path = v_new_path, updated_at = now()
   WHERE id = p_file_id;
  PERFORM set_config('matrx.rename_primitive', '', true);                       -- 23505 propagates: the caller gets 409
  RETURN jsonb_build_object('file_id', p_file_id, 'old_path', v_old_path,
                            'new_path', v_new_path, 'file_name', p_new_name);
END; $function$;

CREATE OR REPLACE FUNCTION public.rename_folder(p_folder_id uuid, p_new_path text, p_new_parent_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_owner UUID;
    v_old_path TEXT;
    v_new_name TEXT;
    v_descendants_files INT;
    v_descendants_folders INT;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'editor') THEN
        raise exception 'forbidden: not authorized to rename folder' using ERRCODE = '42501',
            detail = jsonb_build_object('folder_id', p_folder_id)::text;
    END IF;
    IF p_new_parent_id IS NOT NULL AND auth.uid() IS NOT NULL
       AND NOT iam.has_access('folder', p_new_parent_id, 'editor') THEN
        raise exception 'forbidden: not authorized to move into this folder' using ERRCODE = '42501',
            detail = jsonb_build_object('new_parent_id', p_new_parent_id)::text;
    END IF;
    SELECT created_by, folder_path INTO v_owner, v_old_path
      FROM files.folders WHERE id = p_folder_id AND deleted_at IS NULL;
    IF v_owner IS NULL THEN
        perform platform.refuse_not_found(format('folder %s not found', p_folder_id));
    END IF;

    p_new_path := trim(both '/' from p_new_path);
    v_new_name := split_part(p_new_path, '/', GREATEST(array_length(string_to_array(p_new_path, '/'), 1), 1));

    UPDATE files.folders
       SET folder_path = p_new_path,
           folder_name = v_new_name,
           parent_id   = COALESCE(p_new_parent_id, parent_id),
           updated_at  = now()
     WHERE id = p_folder_id;

    UPDATE files.folders
       SET folder_path = p_new_path || substring(folder_path FROM length(v_old_path) + 1),
           updated_at  = now()
     WHERE created_by = v_owner
       AND folder_path LIKE v_old_path || '/%'
       AND deleted_at IS NULL;
    GET DIAGNOSTICS v_descendants_folders = ROW_COUNT;

    PERFORM set_config('matrx.rename_primitive', 'subtree', true);
    UPDATE files.files
       SET file_path  = p_new_path || substring(file_path FROM length(v_old_path) + 1),
           updated_at = now()
     WHERE created_by = v_owner
       AND file_path LIKE v_old_path || '/%'
       AND deleted_at IS NULL;
    GET DIAGNOSTICS v_descendants_files = ROW_COUNT;
    PERFORM set_config('matrx.rename_primitive', '', true);

    RETURN jsonb_build_object(
        'old_path', v_old_path,
        'new_path', p_new_path,
        'descendant_folders', v_descendants_folders,
        'descendant_files', v_descendants_files
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_file(p_file_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_ok BOOLEAN := false;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
        raise exception 'forbidden: not authorized to restore file' using ERRCODE = '42501',
            detail = jsonb_build_object('file_id', p_file_id)::text;
    END IF;
    UPDATE files.files SET deleted_at = NULL
     WHERE id = p_file_id AND deleted_at IS NOT NULL
    RETURNING true INTO v_ok;
    RETURN COALESCE(v_ok, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_folder(p_folder_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_folders INT;
    v_files INT;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'editor') THEN
        raise exception 'forbidden: not authorized to restore folder' using ERRCODE = '42501',
            detail = jsonb_build_object('folder_id', p_folder_id)::text;
    END IF;
    WITH RECURSIVE descendants AS (
        SELECT id FROM files.folders WHERE id = p_folder_id
        UNION ALL
        SELECT d.id FROM files.folders d JOIN descendants ds ON d.parent_id = ds.id
    ),
    restored_folders AS (
        UPDATE files.folders SET deleted_at = NULL
         WHERE id IN (SELECT id FROM descendants) AND deleted_at IS NOT NULL
        RETURNING id
    ),
    restored_files AS (
        UPDATE files.files SET deleted_at = NULL
         WHERE parent_folder_id IN (SELECT id FROM restored_folders) AND deleted_at IS NOT NULL
        RETURNING id
    )
    SELECT (SELECT count(*) FROM restored_folders), (SELECT count(*) FROM restored_files)
    INTO v_folders, v_files;
    RETURN jsonb_build_object('folders', v_folders, 'files', v_files);
END;
$function$;

CREATE OR REPLACE FUNCTION public.share_resource_with_user(p_resource_type text, p_resource_id uuid, p_target_user_id uuid, p_permission_level text DEFAULT 'viewer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Not authenticated'); end if;
  if p_permission_level is null or p_permission_level not in ('viewer', 'commenter', 'edit_content', 'editor', 'admin') then
    return jsonb_build_object('success', false, 'error', 'Invalid permission level');
  end if;
  return iam.share_with_person(p_resource_type, p_resource_id, p_target_user_id,
                               p_permission_level::public.permission_level, v_uid, true);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.share_with_audience(p_kind text, p_source_id uuid, p_level text, p_exclude text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_level is null or p_level not in ('viewer', 'commenter', 'edit_content', 'editor', 'admin') then
    raise exception 'A Permission is viewer, commenter, editor or admin (got "%").', coalesce(p_level, 'nothing')
      using errcode = '22023';
  end if;
  return iam._share_with_audience(p_kind, p_source_id, p_level::public.permission_level,
                                  auth.uid(), coalesce(p_exclude, '{}'), 'person');
end;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_file(p_file_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_ok BOOLEAN := false;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
        raise exception 'forbidden: not authorized to delete file' using ERRCODE = '42501',
            detail = jsonb_build_object('file_id', p_file_id)::text;
    END IF;
    UPDATE files.files SET deleted_at = now()
     WHERE id = p_file_id AND deleted_at IS NULL
    RETURNING true INTO v_ok;
    IF v_ok THEN
        UPDATE platform.share_links SET is_active = false
         WHERE resource_type = 'file' AND resource_id = p_file_id;
    END IF;
    RETURN COALESCE(v_ok, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_folder(p_folder_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_owner UUID;
    v_folders INT;
    v_files INT;
    v_links INT;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'editor') THEN
        raise exception 'forbidden: not authorized to delete folder' using ERRCODE = '42501',
            detail = jsonb_build_object('folder_id', p_folder_id)::text;
    END IF;
    SELECT created_by INTO v_owner FROM files.folders WHERE id = p_folder_id AND deleted_at IS NULL;
    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('folders', 0, 'files', 0, 'links', 0);
    END IF;

    WITH RECURSIVE descendants AS (
        SELECT id FROM files.folders WHERE id = p_folder_id
        UNION ALL
        SELECT d.id
          FROM files.folders d
          JOIN descendants ds ON d.parent_id = ds.id
         WHERE d.deleted_at IS NULL
    ),
    deleted_folders AS (
        UPDATE files.folders
           SET deleted_at = now()
         WHERE id IN (SELECT id FROM descendants)
           AND deleted_at IS NULL
        RETURNING id
    ),
    deleted_files AS (
        UPDATE files.files
           SET deleted_at = now()
         WHERE parent_folder_id IN (SELECT id FROM deleted_folders)
           AND deleted_at IS NULL
        RETURNING id
    ),
    deactivated_links AS (
        UPDATE platform.share_links
           SET is_active = false
         WHERE (resource_type = 'folder' AND resource_id IN (SELECT id FROM deleted_folders))
            OR (resource_type = 'file'   AND resource_id IN (SELECT id FROM deleted_files))
        RETURNING id
    )
    SELECT
        (SELECT count(*) FROM deleted_folders),
        (SELECT count(*) FROM deleted_files),
        (SELECT count(*) FROM deactivated_links)
    INTO v_folders, v_files, v_links;

    RETURN jsonb_build_object('folders', v_folders, 'files', v_files, 'links', v_links);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_permission_level(p_resource_type text, p_resource_id uuid, p_target_user_id uuid DEFAULT NULL::uuid, p_target_org_id uuid DEFAULT NULL::uuid, p_new_level text DEFAULT 'viewer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_resolved record;
  v_updated  int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_new_level NOT IN ('viewer', 'commenter', 'edit_content', 'editor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level');
  END IF;
  IF p_target_user_id IS NULL AND p_target_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must specify target user or organization');
  END IF;
  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;

  IF NOT public.may_manage_sharing(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You need Admin on this to decide who else may see it. Ask whoever holds it, or an owner of the organization.');
  END IF;
  IF v_resolved.schema_name = 'custom' THEN
    RETURN public.store_door_share(v_resolved.resource_type, p_resource_id,
             CASE WHEN p_target_org_id IS NOT NULL THEN 'organization' ELSE 'person' END,
             COALESCE(p_target_org_id, p_target_user_id), p_new_level);
  END IF;

  UPDATE iam.permissions
     SET permission_level = p_new_level::permission_level
   WHERE resource_type = v_resolved.resource_type
     AND resource_id   = p_resource_id
     AND (
       (p_target_user_id IS NOT NULL AND granted_to_user_id        = p_target_user_id)
       OR
       (p_target_org_id  IS NOT NULL AND granted_to_organization_id = p_target_org_id)
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching permission found');
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Permission level updated to ' || p_new_level);
END;
$function$;

drop trigger if exists _a000_edit_content_is_editor on iam.permissions;
drop trigger if exists _a000_edit_content_is_editor on platform.share_links;
drop function if exists iam._edit_content_is_editor();
update iam.permissions set permission_level = 'edit_content' where id in ('11e79108-2858-440b-a1a3-26cae9819f61','1dbcf399-140d-4113-9525-1618a6684b82','1dfbda89-e435-49d7-94ab-85526ee55879','1f26ca16-eb13-4088-b5a0-dd4ae9f9c335','2a37a31b-5b2c-4e10-843d-e3b08f339235','4973f7ca-282e-4349-a0ea-9412bccf2c25','530ffb13-2d28-4e58-b311-3520b7aa739e','60277e13-1b8d-4aa6-a2b0-7621162536ce','70157d4f-a994-4368-9287-0614a95b88aa','707634f4-5419-40fb-9b3d-791c681be296','71caa56a-ff01-4c5c-a3d0-7007318e3715','744eff82-237d-48e3-8a4f-de43ff4360b0','7961a95d-3b7f-4f3d-857e-bac7a85be0ea','83698960-1bab-4268-9221-7dffe94203c5','8895c52a-b2cf-4d7b-afbd-29052d0142cb','9e168a9b-a138-4d10-99bb-0aadbe3c87b0','ae567a22-9809-4491-8605-f70f464b323b','b6e454ea-63a7-4bf6-b8bc-be93e00c43d3','b7c27786-676a-45f5-825e-a35635496d47','bdf0f794-1570-4151-ab43-8420ec9211a3','be2a88d9-94a7-4718-babf-6b6ec9beb207','c440ed26-38e9-49de-a412-d1db3dfac7bc','c780a4bd-9e0e-4baa-804e-36950bf4bd03','cd0aa1b6-92b5-4d78-ab78-5e33cc5361c4','d5a8f30a-b281-4d72-9791-457cd9c74328','dc06aa9e-57bc-4b62-ab8b-7d3e9d1a4b79','e1ae0c5a-a599-4317-aca8-1d4331f721c0','e2b04d1f-1c0e-43db-91c7-8b8a61f14f80');
drop function if exists iam.may_grant_as(uuid, text, uuid, public.permission_level, text, uuid);
drop function if exists iam.holds_level_as(uuid, text, uuid, public.permission_level);
delete from platform.feature_knob where feature = 'access.sharing' and key in ('editor_may_share','outside_org_min_level','confidential_min_level');
delete from platform.client_callable_door where schema_name = 'iam' and function_name in ('may_grant_as', 'holds_level_as');

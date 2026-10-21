-- chair-step: re-records 11 live function bodies byte-for-byte (based-on verified); the only DELETEs are inside those plpgsql bodies, so executing it changes nothing live.
-- based-on: public.admin_update_app_config(text, integer, text, jsonb, timestamp with time zone) d73af6b190db391102f81397f858ac5cebd46d5f534706f849e233f57b5bc478
-- based-on: public.admin_upsert_assist_producer_policy(text, text, text, text, text, text, boolean, boolean, text, integer, integer, text, text, jsonb, text, integer) afb8b20a68f5c6c3fecc111deb84c10313f8ae93e566ba499c469c59b61f1d23
-- based-on: public.admin_upsert_catalog_entry(text, text, text, integer, jsonb, text, text, bigint, text, boolean, integer, text, timestamp with time zone) c2150c02c01c979784be12f7e58188e2d48ac5482f7f55bedfd40c0ee3fa206b
-- based-on: communication.register_voice_call_interaction(uuid, uuid, uuid, uuid, text, text, text, text, text, text, text, timestamp with time zone) 7e220540d2f49859e0bd3d60b9a47d97a79cec914e46104fbce63725c8fe2cd6
-- based-on: content.univer_save(uuid, integer, jsonb, text, text, bigint, text) 1bc48dfd340f790b814666849fbc07a60e8b0aebffecd29b7177caff06bb782c
-- based-on: content.version_restore(uuid, integer, integer) 06bfc1a2d9e37ba0fb5a81a0dc79968ddf3e6bc0bdeaf40691d2b63bfb65e21a
-- based-on: custom.has_visibility_at(uuid, text, uuid, permission_level, uuid, bigint) 8bfd71dcd45959b7923c3284e477aacb23d5292be236dc0d1c66e94b7b45dc79
-- based-on: custom.table_move(uuid, uuid, integer) edb4decf37443fa7c1de487eaf011a515355f5266aaa6efbdabeb02496ac2b6a
-- based-on: custom.whole_value_complete(uuid, uuid, text, uuid) 199bf0f99be5c89f04e76571744ce1d4a26e60f43f28100217a52522a6135476
-- based-on: public.move_site_to_organization(uuid, uuid, integer, text) 1cf43b1ccd32b790cafebf6183cf5618beef9ca1c27527518d9a284e073fca99
-- based-on: web.brand_archive(uuid) b70bf15e628897f3b47cde0d8d531727e540dc2e7e877f9d77caf0c3c325198c
--
-- Deliberate refusals raise PT409, never 40001 — this repo's capture of the live fix of 2026-10-21.
--
-- Every body below is pg_get_functiondef() read from the live database on 2026-10-21,
-- byte-for-byte, so applying this file changes nothing live; it exists so a replay of
-- migrations/ ends on what live runs. The earlier files that defined these functions with
-- errcode '40001' are applied history and stay unedited; this file supersedes them.
--
-- Why: PostgREST retries any transaction failing with 40001 (serialization_failure) or 40P01
-- (deadlock_detected) with no limit, so a function that raises one on purpose (a stale write)
-- loops inside PostgREST; on 2026-10-21 that froze Postgres (22 requests -> 49,619 calls).
-- Live, aidream's event trigger platform._no_retried_refusal_code refuses such a function;
-- aidream's 20261022160000 captures the same bodies plus that trigger.
--
-- Guard: scripts/__tests__/no-deliberate-retried-refusal-code.test.ts.

-- public.admin_update_app_config (live, verbatim)
CREATE OR REPLACE FUNCTION public.admin_update_app_config(p_app text, p_schema_version integer, p_min_supported_app_version text, p_config jsonb, p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS app_config
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing public.app_config;
  updated  public.app_config;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RAISE EXCEPTION 'config must be a JSON object' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('app_config:' || p_app));

  SELECT * INTO existing FROM public.app_config WHERE app = p_app;

  IF p_expected_updated_at IS NOT NULL
     AND FOUND
     AND existing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Conflict: row for % changed since it was loaded (now %). Reload and re-apply.',
      p_app, existing.updated_at
      USING ERRCODE = 'PT409';
  END IF;

  IF FOUND THEN
    INSERT INTO public.app_config_history
      (app, schema_version, min_supported_app_version, config, changed_by)
    VALUES
      (existing.app, existing.schema_version, existing.min_supported_app_version,
       existing.config, (select auth.uid()));
  END IF;

  -- organization_id: public.app_config is platform/system config (schema-versioned
  -- app settings, not org data). It belongs to the ratified platform tenant,
  -- looked up via public.system_org_id('system') (iam.system_orgs key='system').
  -- May never be defaulted or resolver-chosen (Data Doctrine, 2026-09-19).
  INSERT INTO public.app_config AS ac
    (app, organization_id, schema_version, min_supported_app_version, config, updated_at, updated_by)
  VALUES
    (p_app, public.system_org_id('system'), p_schema_version, p_min_supported_app_version, p_config, now(), (select auth.uid()))
  ON CONFLICT (app) DO UPDATE
    SET schema_version            = EXCLUDED.schema_version,
        min_supported_app_version = EXCLUDED.min_supported_app_version,
        config                    = EXCLUDED.config,
        updated_at                = now(),
        updated_by                = (select auth.uid())
  RETURNING * INTO updated;

  RETURN updated;
END;
$function$;

-- public.admin_upsert_assist_producer_policy (live, verbatim)
CREATE OR REPLACE FUNCTION public.admin_upsert_assist_producer_policy(p_source_pattern text, p_match_kind text, p_display_name text, p_feature_key text, p_disposition text, p_audit_status text, p_production_enabled boolean, p_presentation_enabled boolean, p_cost_class text, p_max_pending_per_user integer, p_max_presented_per_cycle integer, p_working_message text, p_rationale text, p_config jsonb, p_reason text, p_expected_version integer DEFAULT NULL::integer)
 RETURNS platform.assist_producer_policy
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_before platform.assist_producer_policy;
  v_after platform.assist_producer_policy;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A change reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_before
    FROM platform.assist_producer_policy
   WHERE source_pattern = p_source_pattern AND match_kind = p_match_kind
   FOR UPDATE;

  IF FOUND AND p_expected_version IS NOT NULL AND v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'Assist producer policy changed since it was loaded'
      USING ERRCODE = 'PT409';
  END IF;

  -- organization_id: platform.assist_producer_policy governs the AI-assist
  -- production/presentation policy platform-wide (super-admin only), not org
  -- data. Belongs to the ratified platform tenant via
  -- public.system_org_id('system'). Never defaulted or resolver-chosen
  -- (Data Doctrine, 2026-09-19).
  INSERT INTO platform.assist_producer_policy AS policy (
    source_pattern, match_kind, display_name, feature_key, disposition,
    audit_status, production_enabled, presentation_enabled, cost_class,
    max_pending_per_user, max_presented_per_cycle, working_message, rationale,
    config, created_by, updated_by, organization_id
  ) VALUES (
    p_source_pattern, p_match_kind, p_display_name, p_feature_key, p_disposition,
    p_audit_status, p_production_enabled, p_presentation_enabled, p_cost_class,
    p_max_pending_per_user, p_max_presented_per_cycle, p_working_message,
    p_rationale, COALESCE(p_config, '{}'::jsonb), (select auth.uid()), (select auth.uid()),
    public.system_org_id('system')
  )
  ON CONFLICT (source_pattern, match_kind) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    feature_key = EXCLUDED.feature_key,
    disposition = EXCLUDED.disposition,
    audit_status = EXCLUDED.audit_status,
    production_enabled = EXCLUDED.production_enabled,
    presentation_enabled = EXCLUDED.presentation_enabled,
    cost_class = EXCLUDED.cost_class,
    max_pending_per_user = EXCLUDED.max_pending_per_user,
    max_presented_per_cycle = EXCLUDED.max_presented_per_cycle,
    working_message = EXCLUDED.working_message,
    rationale = EXCLUDED.rationale,
    config = EXCLUDED.config,
    updated_at = now(),
    updated_by = (select auth.uid()),
    version = policy.version + 1
  RETURNING * INTO v_after;

  INSERT INTO platform.assist_producer_policy_history (
    policy_id, source_pattern, match_kind, before, after, reason, changed_by
  ) VALUES (
    v_after.id, v_after.source_pattern, v_after.match_kind,
    CASE WHEN v_before.id IS NULL THEN NULL ELSE to_jsonb(v_before) END,
    to_jsonb(v_after), p_reason, (select auth.uid())
  );

  RETURN v_after;
END;
$function$;

-- public.admin_upsert_catalog_entry (live, verbatim)
CREATE OR REPLACE FUNCTION public.admin_upsert_catalog_entry(p_app text, p_kind text, p_key text, p_schema_version integer, p_payload jsonb, p_artifact_url text DEFAULT NULL::text, p_artifact_sha256 text DEFAULT NULL::text, p_artifact_size_bytes bigint DEFAULT NULL::bigint, p_min_app_version text DEFAULT NULL::text, p_is_active boolean DEFAULT false, p_sort_order integer DEFAULT 0, p_notes text DEFAULT NULL::text, p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS catalog_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing public.catalog_entries;
  updated  public.catalog_entries;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('catalog:' || p_app || ':' || p_kind || ':' || p_key));

  SELECT * INTO existing FROM public.catalog_entries
   WHERE app = p_app AND kind = p_kind AND key = p_key;

  IF p_expected_updated_at IS NOT NULL
     AND FOUND
     AND existing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Conflict: entry %/%/% changed since it was loaded (now %). Reload and re-apply.',
      p_app, p_kind, p_key, existing.updated_at
      USING ERRCODE = 'PT409';
  END IF;

  IF FOUND THEN
    INSERT INTO public.catalog_entries_history
      (entry_id, app, kind, key, schema_version, payload, artifact_url,
       artifact_sha256, artifact_size_bytes, min_app_version, is_active,
       sort_order, notes, op, changed_by)
    VALUES
      (existing.id, existing.app, existing.kind, existing.key,
       existing.schema_version, existing.payload, existing.artifact_url,
       existing.artifact_sha256, existing.artifact_size_bytes,
       existing.min_app_version, existing.is_active, existing.sort_order,
       existing.notes, 'update', (select auth.uid()));
  END IF;

  -- organization_id: public.catalog_entries is a platform-wide app catalog
  -- (keyed app/kind/key, super-admin only), not org data. Belongs to the
  -- ratified platform tenant via public.system_org_id('system'). Never
  -- defaulted or resolver-chosen (Data Doctrine, 2026-09-19).
  INSERT INTO public.catalog_entries AS ce
    (app, organization_id, kind, key, schema_version, payload, artifact_url, artifact_sha256,
     artifact_size_bytes, min_app_version, is_active, sort_order, notes,
     updated_at, updated_by)
  VALUES
    (p_app, public.system_org_id('system'), p_kind, p_key, p_schema_version, p_payload, p_artifact_url,
     p_artifact_sha256, p_artifact_size_bytes, p_min_app_version, p_is_active,
     p_sort_order, p_notes, now(), (select auth.uid()))
  ON CONFLICT (app, kind, key) DO UPDATE
    SET schema_version      = EXCLUDED.schema_version,
        payload             = EXCLUDED.payload,
        artifact_url        = EXCLUDED.artifact_url,
        artifact_sha256     = EXCLUDED.artifact_sha256,
        artifact_size_bytes = EXCLUDED.artifact_size_bytes,
        min_app_version     = EXCLUDED.min_app_version,
        is_active           = EXCLUDED.is_active,
        sort_order          = EXCLUDED.sort_order,
        notes               = EXCLUDED.notes,
        updated_at          = now(),
        updated_by          = (select auth.uid()),
        -- Saving an archived key brings it back (delete means archive).
        deleted_at          = NULL
  RETURNING * INTO updated;

  RETURN updated;
END;
$function$;

-- communication.register_voice_call_interaction (live, verbatim)
CREATE OR REPLACE FUNCTION communication.register_voice_call_interaction(p_party_id uuid, p_contact_point_id uuid, p_organization_id uuid, p_recording_owner_id uuid, p_direction text, p_provider text, p_provider_account_id text, p_provider_call_id text, p_program_key text, p_from_address text, p_to_address text, p_occurred_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(interaction_id uuid, disposition text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_interaction crm.interaction%rowtype;
  v_contact_party_id uuid;
  v_contact_org_id uuid;
  v_event_key text;
begin
  if nullif(btrim(p_provider), '') is null
     or nullif(btrim(p_provider_account_id), '') is null
     or nullif(btrim(p_provider_call_id), '') is null
     or nullif(btrim(p_program_key), '') is null then
    raise exception 'Voice provider identity and program key are required'
      using errcode = '22023';
  end if;
  if p_direction not in ('inbound', 'outbound') then
    raise exception 'Unsupported voice direction: %', p_direction using errcode = '22023';
  end if;
  if not exists (
    select 1 from crm.party p
    where p.id = p_party_id
      and p.organization_id = p_organization_id
      and p.deleted_at is null
  ) then
    raise exception 'Voice party does not belong to the call organization'
      using errcode = '23503';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = p_recording_owner_id
  ) then
    raise exception 'Voice recording owner does not exist' using errcode = '23503';
  end if;
  if not iam.is_org_member(p_recording_owner_id, p_organization_id) then
    raise exception 'Voice recording owner is not a member of the call organization'
      using errcode = '42501';
  end if;
  if p_contact_point_id is not null then
    select cp.party_id, cp.organization_id
      into v_contact_party_id, v_contact_org_id
    from crm.party_contact_point cp
    where cp.id = p_contact_point_id and cp.deleted_at is null;
    if v_contact_party_id is distinct from p_party_id
       or v_contact_org_id is distinct from p_organization_id then
      raise exception 'Voice contact point does not belong to the exact party and organization'
        using errcode = '23503';
    end if;
  end if;

  select i.* into v_interaction
  from crm.interaction i
  where i.channel_code = 'call'
    and i.provider = p_provider
    and i.provider_account_id = p_provider_account_id
    and i.provider_interaction_id = p_provider_call_id
    and i.deleted_at is null
  for update;

  if found then
    if v_interaction.party_id is distinct from p_party_id
       or v_interaction.organization_id is distinct from p_organization_id
       or v_interaction.recording_owner_id is distinct from p_recording_owner_id
       or v_interaction.program_key is distinct from p_program_key
       or v_interaction.contact_point_id is distinct from p_contact_point_id
       or v_interaction.direction is distinct from p_direction
       or v_interaction.attributes ->> 'from_address' is distinct from p_from_address
       or v_interaction.attributes ->> 'to_address' is distinct from p_to_address then
      raise exception 'Voice call identity is already bound to different canonical context'
        using errcode = '23505';
    end if;
    return query select v_interaction.id, 'replay'::text;
    return;
  end if;

  insert into crm.interaction (
    party_id,
    contact_point_id,
    direction,
    channel_code,
    status,
    occurred_at,
    subject,
    thread_key,
    attributes,
    organization_id,
    created_by,
    provider,
    provider_account_id,
    provider_interaction_id,
    provider_status,
    provider_status_sequence,
    provider_status_at,
    program_key,
    recording_owner_id
  ) values (
    p_party_id,
    p_contact_point_id,
    p_direction,
    'call',
    'in_progress',
    coalesce(p_occurred_at, now()),
    'AI Matrx voice call',
    concat_ws(':', 'voice', p_provider, p_provider_account_id, p_provider_call_id),
    jsonb_build_object(
      'from_address', p_from_address,
      'to_address', p_to_address
    ),
    p_organization_id,
    null,
    p_provider,
    p_provider_account_id,
    p_provider_call_id,
    'initiated',
    -1,
    coalesce(p_occurred_at, now()),
    p_program_key,
    p_recording_owner_id
  )
  on conflict (provider, provider_account_id, provider_interaction_id)
    where channel_code = 'call' and deleted_at is null
  do nothing
  returning * into v_interaction;

  if not found then
    select i.* into v_interaction
    from crm.interaction i
    where i.channel_code = 'call'
      and i.provider = p_provider
      and i.provider_account_id = p_provider_account_id
      and i.provider_interaction_id = p_provider_call_id
      and i.deleted_at is null
    for update;
    if not found then
      raise exception 'Voice call identity conflict could not be correlated'
        using errcode = 'PT409';
    end if;
    if v_interaction.party_id is distinct from p_party_id
       or v_interaction.organization_id is distinct from p_organization_id
       or v_interaction.recording_owner_id is distinct from p_recording_owner_id
       or v_interaction.program_key is distinct from p_program_key
       or v_interaction.contact_point_id is distinct from p_contact_point_id
       or v_interaction.direction is distinct from p_direction
       or v_interaction.attributes ->> 'from_address' is distinct from p_from_address
       or v_interaction.attributes ->> 'to_address' is distinct from p_to_address then
      raise exception 'Voice call identity is already bound to different canonical context'
        using errcode = '23505';
    end if;
    return query select v_interaction.id, 'replay'::text;
    return;
  end if;

  v_event_key := concat_ws(
    ':', p_provider, 'voice-call', p_provider_account_id, p_provider_call_id, 'registered'
  );
  insert into platform.activity_log (
    organization_id, entity_type, entity_id, action, actor_id, occurred_at, metadata
  ) values (
    p_organization_id,
    'crm_interaction',
    v_interaction.id,
    'voice.call.registered',
    null,
    coalesce(p_occurred_at, now()),
    jsonb_build_object(
      'provider', p_provider,
      'provider_account_id', p_provider_account_id,
      'provider_call_id', p_provider_call_id,
      'provider_event_key', v_event_key,
      'program_key', p_program_key,
      'direction', p_direction
    )
  );

  return query select v_interaction.id, 'created'::text;
end;
$function$;

-- content.univer_save (live, verbatim)
CREATE OR REPLACE FUNCTION content.univer_save(p_document_id uuid, p_expected_version integer, p_snapshot jsonb, p_projection text, p_origin text DEFAULT 'manual'::text, p_collab_rev bigint DEFAULT NULL::bigint, p_state_hash text DEFAULT NULL::text)
 RETURNS content.document
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc  content.document;
  v_row  content.document;
  v_hash text;
  v_room boolean;
  v_verdict text;
begin
  if coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon')
     and not iam.has_access('document', p_document_id, 'editor') then
    raise exception using errcode = '42501',
      message = 'You cannot edit this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  select * into v_doc from content.document d where d.id = p_document_id and d.deleted_at is null for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'You cannot edit this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  if v_doc.format <> 'univer' then
    raise exception using errcode = '22023',
      message = format('content.univer_save saves Univer documents only; this one is %s.', v_doc.format),
      hint = 'Update content.document.body with guardedUpdate on version.';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception using errcode = '22023',
      message = 'The snapshot must be a Univer document object.',
      hint = 'Send the IDocumentData object the Univer editor produced.';
  end if;
  if coalesce(p_origin, '') not in ('manual', 'autosave', 'agent', 'import', 'sync', 'restore', 'system') then
    raise exception using errcode = '22023',
      message = format('Unknown save origin %s.', coalesce(p_origin, 'NULL')),
      hint = 'Use manual, autosave, agent, import, sync, restore or system.';
  end if;

  v_room := exists (select 1 from content.collab_room r where r.room_id = p_document_id);
  if v_room then
    -- COLLAB-DESIGN §7.3: with a co-editing room the rev-and-hash rule replaces p_expected_version.
    -- The verdict locks the checkpoint row (never the room's head row) until this transaction ends.
    v_verdict := content._collab_cp_verdict(p_document_id, p_collab_rev, p_state_hash);
    if v_verdict = 'same' then
      return v_doc;   -- equal rev, equal hash: this content is already the checkpoint
    elsif v_verdict <> 'advanced' then
      raise exception using errcode = 'PT409', detail = 'collab_' || v_verdict,
        message = case v_verdict
          when 'stale' then 'A newer co-edited version of this document is already saved.'
          when 'hash_mismatch' then 'Another editor saved different content at the same point; reload this document.'
          when 'ahead_of_head' then 'This save names a change the document has not committed.'
          else 'This document is co-edited; a save must carry its rev and state hash.' end,
        hint = 'Reload the document from its checkpoint and the change log.';
    end if;
  elsif p_expected_version is null or v_doc.version <> p_expected_version then
    raise exception using errcode = 'PT409',
      message = format('This document changed since you loaded it (you had version %s; it is now %s).', p_expected_version, v_doc.version),
      hint = 'Reload it, re-apply your edit, and save again.';
  end if;

  v_hash := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  if v_hash = v_doc.payload_hash and coalesce(p_projection, '') = v_doc.body then
    if v_room then
      perform content._collab_cp_write(p_document_id, p_collab_rev, v_doc.content_version::text, p_state_hash);
    end if;
    return v_doc;   -- nothing changed; no version, no payload
  end if;

  perform set_config('content.univer_save_doc', p_document_id::text, true);
  update content.document d
     set body = coalesce(p_projection, ''),
         payload_hash = v_hash,
         last_origin = p_origin
   where d.id = p_document_id
  returning * into v_row;
  perform set_config('content.univer_save_doc', '', true);

  if v_row.content_version <> v_doc.content_version then
    insert into content.univer_payload (organization_id, created_by, document_id, content_version, snapshot)
    values (v_row.organization_id, v_row.updated_by, v_row.id, v_row.content_version, p_snapshot);
  end if;
  if v_room then
    perform content._collab_cp_write(p_document_id, p_collab_rev, v_row.content_version::text, p_state_hash);
  end if;
  return v_row;
end;
$function$;

-- content.version_restore (live, verbatim)
CREATE OR REPLACE FUNCTION content.version_restore(p_document_id uuid, p_content_version integer, p_expected_version integer)
 RETURNS content.document
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc      content.document;
  v_ver      content.document_version;
  v_body     text;
  v_snapshot jsonb;
  v_row      content.document;
begin
  if coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon')
     and not iam.has_access('document', p_document_id, 'editor') then
    raise exception using errcode = '42501',
      message = 'You cannot edit this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  select * into v_doc from content.document d where d.id = p_document_id and d.deleted_at is null for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'You cannot edit this document, or it does not exist.',
      hint = 'Ask its owner for editor access.';
  end if;
  if exists (select 1 from content.collab_room r where r.room_id = p_document_id) then
    raise exception using errcode = 'PT409',
      message = 'This document is open for live co-editing, so a version cannot be restored behind the editors.',
      detail = 'collab_room_restore',
      hint = 'Restore it from the document''s History in the editor, which replaces the live copy through collab_replace.';
  end if;
  if p_expected_version is null or v_doc.version <> p_expected_version then
    raise exception using errcode = 'PT409',
      message = format('This document changed since you loaded it (you had version %s; it is now %s).', p_expected_version, v_doc.version),
      hint = 'Reload it and choose the version to restore again.';
  end if;
  select * into v_ver from content.document_version v
   where v.document_id = p_document_id and v.content_version = p_content_version;
  if not found then
    raise exception using errcode = '22023',
      message = format('Version %s of this document does not exist.', p_content_version),
      hint = 'Pick a version listed in content.document_version for this document.';
  end if;
  select v.body into v_body from content.document_version v
   where v.document_id = p_document_id and v.content_version = v_ver.body_content_version
     and v.change_kind = 'content';
  if v_body is null then
    raise exception using errcode = '22023',
      message = format('Version %s holds no body to restore.', p_content_version),
      hint = 'Pick a version whose change_kind is content.';
  end if;

  if v_doc.format = 'univer' or v_ver.format = 'univer' then
    select u.snapshot into v_snapshot from content.univer_payload u
     where u.document_id = p_document_id and u.content_version = v_ver.body_content_version;
    if v_snapshot is null then
      raise exception using errcode = '22023',
        message = format('Version %s has no Univer payload to restore.', p_content_version),
        hint = 'Pick a Univer version saved through content.univer_save.';
    end if;
    perform set_config('content.univer_save_doc', p_document_id::text, true);
  end if;

  update content.document d
     set title = v_ver.title,
         summary = v_ver.summary,
         format = v_ver.format,
         body = v_body,
         payload_hash = case when v_ver.format = 'univer' then v_ver.payload_hash end,
         last_origin = 'restore'
   where d.id = p_document_id
  returning * into v_row;
  perform set_config('content.univer_save_doc', '', true);

  if v_snapshot is not null and v_row.content_version <> v_doc.content_version then
    insert into content.univer_payload (organization_id, created_by, document_id, content_version, snapshot)
    values (v_row.organization_id, v_row.updated_by, v_row.id, v_row.content_version, v_snapshot);
  end if;
  return v_row;
end;
$function$;

-- custom.has_visibility_at (live, verbatim)
CREATE OR REPLACE FUNCTION custom.has_visibility_at(p_user_id uuid, p_type text, p_id uuid, p_required permission_level DEFAULT 'viewer'::permission_level, p_organization_id uuid DEFAULT NULL::uuid, p_min_version bigint DEFAULT NULL::bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_current bigint;
begin
  if p_min_version is not null and p_organization_id is not null then
    select v.version into v_current
    from custom.organization_visibility_version v
    where v.organization_id = p_organization_id;
    v_current := coalesce(v_current, 1);
    if v_current < p_min_version then
      -- The reader has already observed a write this snapshot cannot see. Fail toward the reader's
      -- own view rather than serving a state they have moved past. Asymmetric ON PURPOSE (VIS-15):
      -- briefly hiding something just gained is fine; returning something just lost is not.
      raise exception
        'custom.has_visibility_at: STALE SNAPSHOT — organization % is at visibility version %, the '
        'reader carries %. Refusing to answer from a snapshot older than a write this reader has '
        'already observed. Retry on a fresher connection.',
        p_organization_id, v_current, p_min_version
        using errcode = 'PT409';
    end if;
  end if;

  return custom.has_visibility(p_user_id, p_type, p_id, p_required);
end;
$function$;

-- custom.table_move (live, verbatim)
CREATE OR REPLACE FUNCTION custom.table_move(p_table_id uuid, p_to_organization_id uuid, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me      uuid := custom.query_principal();
  v_opens   jsonb;
  v_plan    jsonb;
  v_from    uuid;
  v_id      uuid;
  v_to_name text;
  v_dest    jsonb;
  v_tables  uuid[];
  v_fields  uuid[];
  v_recs    uuid[];
  v_others  uuid[];
  v_all     uuid[];
  v_rows    uuid[];
  v_forms   uuid[];
  v_pending uuid[];
  v_ids     uuid[];
  v_home_from uuid;
  v_home_to   uuid;
  v_n       bigint;
  v_wave    integer := 0;
  v_moved   jsonb := '{}'::jsonb;
  v_version integer;
  v_events  bigint;
  v_made_home boolean := false;
  v_prev_batch text;
  v_edges   jsonb;
begin
  if v_me is null then
    raise exception 'Sign in to move a table.' using errcode = '42501';
  end if;
  if p_table_id is null or p_to_organization_id is null then
    raise exception 'Say which table to move and which organization it goes to.' using errcode = '22004';
  end if;

  v_opens := custom.where_id_opens(p_table_id);
  if v_opens is null or v_opens ->> 'kind' is distinct from 'table' then
    raise exception 'That table is not one you have been given, so nothing moved.'
      using errcode = '42501',
            hint = 'The store says the same for a table you may not open and one that does not exist.';
  end if;
  v_from := (v_opens ->> 'organization_id')::uuid;
  v_id   := (v_opens ->> 'resolved_id')::uuid;
  -- THE DECISION, IN THIS BODY (lane SUITE-HEALTH-2): the organization wall of the Table's own
  -- organization, asked here and not only inside custom.where_id_opens. The row half — who may
  -- move it (its maker, or an owner or admin) — is custom._table_move_plan's may_move below.
  perform custom.assert_client_may_reach(v_from, 'custom.table_move');

  v_plan := custom._table_move_plan(v_id, p_to_organization_id, v_me);

  if not coalesce((v_plan ->> 'may_move')::boolean, false) then
    raise exception '%', v_plan ->> 'why_not' using errcode = '42501';
  end if;
  if p_to_organization_id = v_from then
    raise exception '% is already in %.', v_plan #>> '{table,name}', v_plan #>> '{organization,name}'
      using errcode = '22023';
  end if;
  select d into v_dest from jsonb_array_elements(v_plan -> 'destinations') d
   where d ->> 'id' = p_to_organization_id::text;
  if v_dest is null then
    raise exception 'You are not a member of that organization, so % cannot go there.', v_plan #>> '{table,name}'
      using errcode = '42501',
            hint = 'A table moves only into an organization you belong to.';
  end if;
  v_to_name := v_dest ->> 'name';
  if not coalesce((v_dest ->> 'ok')::boolean, false) then
    raise exception '%', v_dest ->> 'why' using errcode = '55000';
  end if;
  -- THE SWITCH, IN THIS BODY (lane SUITE-HEALTH-2): the rows are written into the destination, so
  -- the destination's store is asked in the store's own words. A destination the plan passed as
  -- ok already has its store open, so this refuses nobody the plan admitted.
  perform custom.assert_store_door(p_to_organization_id, 'custom.table_move');
  if jsonb_array_length(v_plan -> 'held_by') > 0 then
    raise exception '%', v_plan -> 'held_by' ->> 0
      using errcode = '55000',
            detail = (v_plan -> 'held_by')::text,
            hint = format('Nothing moved. %s stays in %s until this is sorted.',
                          v_plan #>> '{table,name}', v_plan #>> '{organization,name}');
  end if;
  v_version := (v_plan #>> '{table,version}')::integer;
  if p_expected_version is not null and p_expected_version <> v_version then
    raise exception 'Someone changed % while you were deciding. Look again, then move it.', v_plan #>> '{table,name}'
      using errcode = 'PT409';
  end if;

  select array(select (x #>> '{}')::uuid from jsonb_array_elements(v_plan #> '{_carry,tables}') x)  into v_tables;
  select array(select (x #>> '{}')::uuid from jsonb_array_elements(v_plan #> '{_carry,fields}') x)  into v_fields;
  select array(select (x #>> '{}')::uuid from jsonb_array_elements(v_plan #> '{_carry,records}') x) into v_recs;
  select array(select (x #>> '{}')::uuid from jsonb_array_elements(v_plan #> '{_carry,others}') x)  into v_others;
  v_all  := v_tables || v_fields || v_recs || v_others;
  v_rows := v_tables || v_recs;

  -- THE ORGANIZATION'S OWN RECORD, on both sides (asked here: custom.organization_home_id is
  -- G11's and its inverse removes it — check:inverses-leave-the-ground-standing, clause d).
  v_home_from := (select h.id from custom.record h
                   where h.organization_id = v_from and h.table_id = custom.organization_kernel_id()
                     and h.deleted_at is null order by h.created_at, h.id limit 1);
  v_home_to   := (select h.id from custom.record h
                   where h.organization_id = p_to_organization_id and h.table_id = custom.organization_kernel_id()
                     and h.deleted_at is null order by h.created_at, h.id limit 1);

  -- A TABLE HAS TO LIVE SOMEWHERE, AND WHERE IT LIVES IN THE DESTINATION IS THE STORE'S FACT, NOT
  -- THE PERSON'S (MOVE-AND-OUTSIDER, VERIFIER-19 finding 1). A table the app made sits in its own
  -- Home record ("<name> Home"), which stays where it is; a table in the source organization's
  -- record goes to the destination's record; so the moved Table is always put in the destination
  -- organization's own record. An organization the store never gave one (G11 made the Home
  -- optional at provision) gets it here, named after the organization, in the same transaction:
  -- a person is never refused for a fact the store owns. The answer says it was made.
  if v_home_to is null then
    insert into custom.record (organization_id, table_id, data)
    values (p_to_organization_id, custom.organization_kernel_id(),
            jsonb_build_object('name', coalesce(nullif(btrim(v_to_name), ''), 'Organization')))
    returning id into v_home_to;
    v_made_home := true;
  end if;

  -- THE MARK custom._store_door reads: this transaction moves rows out of v_from. Cleared below.
  perform set_config('custom.table_move_from', v_from::text, true);
  -- ONE ACCESS REFRESH FOR THE MOVED SET (AT-SLOW-2). Every edge below is put to sleep and woken again with its ends where they
  -- were; each of those writes used to re-derive access for its edge, twice an edge. 'move' tells the edge trigger that this body
  -- refreshes, once and as a set, every edge that starts or ends at a moved row (after the loop and the re-filing below).
  v_prev_batch := coalesce(current_setting('platform.reachability_batch', true), '');
  perform set_config('platform.reachability_batch', 'move', true);

  -- IN CONTAINMENT ORDER (SC-1-TAILS). The containment guard and the wall judge every row as it
  -- lands, so a row moves only once everything it points at that is ALSO moving has moved: its
  -- container (parent_id), its Table (table_id), the Table its Field belongs to. The Table first,
  -- then its Fields and rows, then the Tables inside those rows, then theirs — one statement a
  -- wave. The moved Table itself is re-homed under the new organization's own record (or at its
  -- top); a row whose container moves with it keeps its container.
  v_pending := v_tables || v_fields || v_recs;
  loop
    v_wave := v_wave + 1;
    select coalesce(array_agg(x.id), array[]::uuid[]) into v_ids
      from custom.record x
     where x.organization_id = v_from
       and x.id = any (v_pending)
       and not exists (
             select 1 from custom.record p
              where p.organization_id = v_from
                and p.id = any (v_pending)
                and p.id <> x.id
                and (   p.id = x.table_id
                     or p.id = nullif(x.data ->> 'entity_definition_id', '')::uuid
                     -- a Field waits on the Tables it points at when they move too (the wall judges it)
                     or (x.table_id = custom.field_kernel_id()
                         and (p.id = nullif(x.data ->> 'relation_target', '')::uuid
                              or p.id = nullif(x.data -> 'config' ->> 'options_table_id', '')::uuid))
                     or (x.id <> v_id and p.id = custom.containment_parent(x.data))
                     -- a row is judged against its Table's Fields, so they land first
                     or (x.table_id <> custom.field_kernel_id()
                         and p.table_id = custom.field_kernel_id()
                         and p.data ->> 'entity_definition_id' = x.table_id::text)));
    exit when coalesce(array_length(v_ids, 1), 0) = 0;

    -- THE EDGES OF THIS WAVE'S ROWS GO FIRST, AND ASLEEP. A row that lands in the new organization
    -- re-states its relation edges there (custom._relation_associations, as an INSERT), and an
    -- edge still filed under the old organization would be judged there against a Field that has
    -- already left (platform.enforce_relation_edge: "there is no field … in this organization").
    -- So each live edge starting at a row of this wave is re-filed under the new organization
    -- while retired and marked as this move's (the edge contract does not judge a retired row);
    -- the row's own trigger wakes the ones its value still states, and the sweep after the loop
    -- wakes the rest. An edge that was already retired is re-filed as it is.
    update platform.associations a
       set organization_id  = p_to_organization_id,
           deleted_at       = coalesce(a.deleted_at, now()),
           deleted_via_type = case when a.deleted_at is null then 'table_move' else a.deleted_via_type end,
           deleted_via_id   = case when a.deleted_at is null then v_id else a.deleted_via_id end
     where a.organization_id = v_from
       and a.source_type = 'record' and a.source_id = any (v_ids)
       and a.relation_field_id is not null;

    update custom.record x
       set organization_id = p_to_organization_id,
           data = case
                    when x.id <> v_id then x.data
                    when custom.containment_parent(x.data) = any (v_all) then x.data
                    else jsonb_set(x.data, '{parent_id}', to_jsonb(v_home_to::text)) end
     where x.organization_id = v_from
       and x.id = any (v_ids);
    get diagnostics v_n = row_count;
    exit when v_n = 0;
    v_pending := array(select p.id from custom.record p
                        where p.organization_id = v_from and p.id = any (v_pending));
    exit when coalesce(array_length(v_pending, 1), 0) = 0;
    if v_wave > 64 then exit; end if;
  end loop;
  -- The edges this move put to sleep and no row's trigger woke: woken, in the new organization.
  update platform.associations a
     set deleted_at = null, deleted_via_type = null, deleted_via_id = null
   where a.organization_id = p_to_organization_id
     and a.deleted_via_type = 'table_move' and a.deleted_via_id = v_id
     and a.deleted_at is not null;
  if coalesce(array_length(v_pending, 1), 0) > 0 then
    raise exception 'Some of what % carries points at itself in a circle, so nothing moved.', v_plan #>> '{table,name}'
      using errcode = '55000',
            hint = 'REC-8: containment is a tree. The store found rows that wait on each other; report this with the table''s name.';
  end if;
  v_moved := v_moved || jsonb_build_object(
    'tables',  (select count(*) from custom.record t where t.organization_id = p_to_organization_id and t.id = any (v_tables)),
    'fields',  coalesce(array_length(v_fields, 1), 0),
    'records', coalesce(array_length(v_recs, 1), 0),
    'waves',   v_wave,
    'home',    jsonb_build_object('id', v_home_to, 'made', v_made_home));

  update custom.record x set organization_id = p_to_organization_id
   where x.organization_id = v_from and x.id = any (v_others);
  get diagnostics v_n = row_count; v_moved := v_moved || jsonb_build_object('with_it', v_n);
  perform set_config('custom.table_move_from', '', true);

  -- What hangs off its rows, keyed by the Table or by one of its rows.
  update custom.io_comment c set organization_id = p_to_organization_id
   where c.organization_id = v_from and (c.table_id = any (v_tables) or c.record_id = any (v_rows));
  -- RC-A2e: record comments live in platform.comments (entity_type 'record'); they follow too.
  update platform.comments c set organization_id = p_to_organization_id
   where c.organization_id = v_from and c.entity_type = 'record' and c.entity_id = any (v_rows);
  update custom.io_import i set organization_id = p_to_organization_id
   where i.organization_id = v_from and i.table_id = any (v_tables);
  update custom.io_outbox o set organization_id = p_to_organization_id
   where o.organization_id = v_from and (o.table_id = any (v_tables) or o.record_id = any (v_rows));
  update custom.agent_table_origin a set organization_id = p_to_organization_id
   where a.organization_id = v_from and a.table_id = any (v_tables);
  update custom.doc_render d set organization_id = p_to_organization_id
   where d.organization_id = v_from and (d.table_id = any (v_tables) or d.record_id = any (v_rows));
  update custom.doc_signature s set organization_id = p_to_organization_id
   where s.organization_id = v_from and s.record_id = any (v_rows);
  update custom.external_link l set organization_id = p_to_organization_id
   where l.organization_id = v_from and l.record_id = any (v_rows);
  select coalesce(array_agg(f.id), array[]::uuid[]) into v_forms
    from custom.anon_form f where f.organization_id = v_from and f.table_id = any (v_tables);
  update custom.anon_form f set organization_id = p_to_organization_id
   where f.organization_id = v_from and f.id = any (v_forms);
  update custom.anon_inbound i set organization_id = p_to_organization_id
   where i.organization_id = v_from and i.table_id = any (v_tables);
  update custom.anon_submission s set organization_id = p_to_organization_id
   where s.organization_id = v_from and (s.table_id = any (v_tables) or s.form_id = any (v_forms));
  update custom.anon_replay s set organization_id = p_to_organization_id
   where s.organization_id = v_from and s.table_id = any (v_tables);
  update custom.anon_token k set organization_id = p_to_organization_id
   where k.organization_id = v_from and (k.form_id = any (v_forms) or k.record_id = any (v_rows));
  update custom.anon_hit h set organization_id = p_to_organization_id
   where h.organization_id = v_from and h.form_id = any (v_forms);
  update custom.anon_form_draft d set organization_id = p_to_organization_id
   where d.organization_id = v_from and d.form_id = any (v_forms);
  update custom.record_alias a set organization_id = p_to_organization_id
   where a.organization_id = v_from and a.new_id = any (v_all);
  update platform.saved_view v set organization_id = p_to_organization_id
   where v.organization_id = v_from and v.subject_id = any (v_tables);
  -- AN EDGE IS FILED UNDER THE ORGANIZATION OF THE ROW IT STARTS AT (REL-12). One that starts at
  -- a moving row goes with it; one that starts at a row that stays and points at a moving row
  -- stays, and holds its value across the wall the plan already found open. An edge from
  -- something that is not a record (a file, a note) naming a moving row goes with the row, as
  -- before.
  update platform.associations a set organization_id = p_to_organization_id
   where a.organization_id = v_from
     and ((a.source_type = 'record' and a.source_id = any (v_all))
          or (a.source_type <> 'record' and a.target_type = 'record' and a.target_id = any (v_all)));

  -- THE ONE REFRESH: every edge at a moved row, live or not (a removed edge narrows access and is refreshed too), each distinct
  -- container once; then the campaign marking the per-edge trigger keeps for a live campaign edge, as one statement.
  perform set_config('platform.reachability_batch', v_prev_batch, true);
  select coalesce(jsonb_agg(jsonb_build_object('source_type', e.source_type, 'source_id', e.source_id,
                                               'target_type', e.target_type, 'target_id', e.target_id, 'label', e.label)), '[]'::jsonb)
    into v_edges
    from (select a.source_type, a.source_id, a.target_type, a.target_id, a.label
            from platform.associations a where a.source_type = 'record' and a.source_id = any (v_all)
          union
          select a.source_type, a.source_id, a.target_type, a.target_id, a.label
            from platform.associations a where a.target_type = 'record' and a.target_id = any (v_all)) e;
  perform platform._reachability_touch_edges(v_edges);
  if platform.relations_are_on(p_to_organization_id) then
    update platform.reachability r
       set origin = 'campaign'
      from platform.associations a
     where a.source_type = 'record' and a.source_id = any (v_all)
       and a.origin = 'campaign' and a.deleted_at is null
       and r.origin is distinct from 'campaign'
       and ((r.container_type = a.source_type and r.container_id = a.source_id and r.item_type = a.target_type and r.item_id = a.target_id)
         or (r.container_type = a.target_type and r.container_id = a.target_id and r.item_type = a.source_type and r.item_id = a.source_id));
  end if;

  -- ITS HISTORY GOES WITH IT. A version is the history OF A ROW; the row now answers in the new
  -- organization, so "who changed this and when" must still answer there.
  update history.row_versions v set organization_id = p_to_organization_id
   where v.entity_type = 'custom.record' and v.organization_id = v_from and v.row_id = any (v_all);

  -- THE MOVE ITSELF IS A VERSION OF EACH TABLE IT CARRIED. The store's capture triggers pair old
  -- and new rows by (organization, id), so a row that changed organization is not paired by
  -- them; this writes the one version per Table that says what happened, who did it, from where.
  insert into history.row_versions
         (entity_type, row_id, organization_id, version, operation, row_data, actor_id, actor_tier,
          migration_id, operation_name)
  select 'custom.record', t.id, t.organization_id, t.version, 'UPDATE',
         to_jsonb(t) || jsonb_build_object('moved_from_organization_id', v_from,
                                           'moved_with_table_id', case when t.id <> v_id then v_id end),
         v_me, platform.actor_tier(), null, 'table_move'
    from custom.record t
   where t.organization_id = p_to_organization_id and t.id = any (v_tables) and t.data_class = 'table';

  -- A MOVE IS A CHANGE EVENT (SC-1-TAILS). The capture triggers pair by (organization, id) and so
  -- see nothing here; the door writes the pair itself, on the store's one outbox, so matrx-local's
  -- sync, pg_notify('records_changed') and the realtime broadcast learn of it in this transaction:
  -- every live row it moved is `deleted` where it was and `created` where it is. Written AFTER the
  -- outbox re-key above, so these rows are never re-keyed themselves.
  insert into custom.io_outbox (organization_id, event_key, record_id, table_id, operation,
                                changed_field_ids, actor, dedupe_key, op_id)
  select side.org, 'records.changed', x.id, x.table_id, side.op, '[]'::jsonb,
         jsonb_build_object(
           'user_id',   v_me,
           'role',      custom.caller_role()::text,
           'tier',      coalesce(platform.declared_actor_tier(), platform.actor_tier()),
           'declared',  'table_move',
           'moved_table_id', v_id,
           'moved_from_organization_id', v_from,
           'moved_to_organization_id', p_to_organization_id),
         side.org::text || ':' || x.id::text || ':' || coalesce(x.version, 0)::text || ':' || side.op
           || ':table_move:' || txid_current()::text,
         nullif(current_setting('custom.op_id', true), '')::uuid
    from custom.record x
   cross join (values (v_from, 'deleted'), (p_to_organization_id, 'created')) side(org, op)
   where x.organization_id = p_to_organization_id and x.id = any (v_all) and x.deleted_at is null
   order by side.op desc, x.id
  on conflict do nothing;
  get diagnostics v_events = row_count;
  v_moved := v_moved || jsonb_build_object('events', v_events);

  -- What the visibility cache remembers about these rows was worked out in the old organization.
  -- It is a cache (VIS-7): emptied for them, it is rebuilt on the next read. (Not
  -- custom.bump_epoch: W2-EPOCH's inverse removes it — check:inverses-leave-the-ground-standing.)
  delete from custom.visibility_cache c
   where c.item_id = any (v_all) or c.container_id = any (v_all);

  return jsonb_build_object(
    'moved', true,
    'table', v_plan -> 'table',
    'from',  v_plan -> 'organization',
    'to',    jsonb_build_object('id', p_to_organization_id, 'name', v_to_name),
    'carried', v_moved,
    'path',  '/data/' || v_id::text);
end;
$function$;

-- custom.whole_value_complete (live, verbatim)
CREATE OR REPLACE FUNCTION custom.whole_value_complete(p_organization_id uuid, p_record_id uuid, p_field_key text, p_file_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_p           custom.whole_value_parked%rowtype;
  v_file        record;
  v_file_record uuid;
  v_current     jsonb;
  v_source      jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.whole_value_complete');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.whole_value_complete');

  if p_organization_id is null or p_record_id is null or p_file_id is null
     or nullif(btrim(coalesce(p_field_key, '')), '') is null then
    raise exception 'custom.whole_value_complete needs the organization, the record, the field and the file.'
      using errcode = '22004';
  end if;

  select * into v_p
    from custom.whole_value_parked
   where organization_id = p_organization_id and record_id = p_record_id and field_key = p_field_key
   for update;
  if v_p.id is null then
    raise exception 'Nothing of % on this record is waiting for its file, so there is nothing to complete.', p_field_key
      using errcode = 'P0002',
            hint = 'The whole text may already be in its file (the follower completes a browser''s write within seconds). Read the record again.';
  end if;

  select f.id, f.organization_id, f.created_by, f.checksum, f.deleted_at
    into v_file
    from files.files f
   where f.id = p_file_id;
  if v_file.id is null or v_file.deleted_at is not null then
    raise exception 'That file is not there, so the whole text of % has nowhere to live. Nothing was changed.', p_field_key using errcode = '23503',
            detail = jsonb_build_object('file_id', p_file_id)::text;
  end if;
  if v_file.organization_id is distinct from p_organization_id then
    raise exception 'That file belongs to another organization, so % of this record may not point at it. Nothing was changed.', p_field_key using errcode = '42501',
            detail = jsonb_build_object('file_id', p_file_id)::text;
  end if;
  if v_file.checksum is distinct from v_p.sha256 then
    raise exception 'That file does not hold the text that was saved in % (its SHA-256 differs), so the cell was not pointed at it. Nothing was changed.', p_field_key using errcode = '23514',
            detail = jsonb_build_object('file_id', p_file_id)::text;
  end if;
  if v_p.owner_id is not null and v_file.created_by is distinct from v_p.owner_id then
    raise exception 'That file is not owned by the person who owns this record, so % may not point at it. Nothing was changed.', p_field_key using errcode = '42501',
            detail = jsonb_build_object('file_id', p_file_id)::text;
  end if;

  v_current := (select r.data from custom.record r
                 where r.organization_id = p_organization_id and r.id = p_record_id);
  if v_current is null
     or v_current -> '_values' -> p_field_key ->> 'src' is distinct from v_p.pointer
     or v_current -> '_sources' -> v_p.pointer ->> 'sha256' is distinct from v_p.sha256 then
    raise exception 'The cell % of this record no longer points at the text that is waiting, so its file was not attached. Nothing was changed.', p_field_key
      using errcode = 'PT409';
  end if;

  v_file_record := custom.relation_kernel_record(p_organization_id, custom.file_kernel_id(), p_file_id);
  if v_file_record is null then
    raise exception 'That file could not be given a File record in this organization. Nothing was changed.' using errcode = '23503',
            detail = jsonb_build_object('file_id', p_file_id)::text;
  end if;
  -- T-13: the file's record takes its access from the record that carries the value (Shown to / Published to the web).
  update custom.record f
     set created_by = coalesce(f.created_by, v_p.owner_id),
         published_to_web = s.published_to_web,
         shown_to = coalesce(f.shown_to, s.shown_to)
    from custom.record s
   where s.organization_id = p_organization_id and s.id = p_record_id
     and f.organization_id = p_organization_id and f.id = v_file_record
     and ((f.created_by is null and v_p.owner_id is not null)
          or f.published_to_web is distinct from s.published_to_web
          or (f.shown_to is null and s.shown_to is not null));

  v_source := ((v_current -> '_sources' -> v_p.pointer) - 'pending')
              || jsonb_build_object('file_id', p_file_id, 'file_record', v_file_record);
  update custom.record
     set data = jsonb_set(data, array['_sources', v_p.pointer], v_source) || '{"_actor": "system"}'::jsonb
   where organization_id = p_organization_id and id = p_record_id;

  perform set_config('app.actor_system', 'matrx_records.big_values', true);
  insert into platform.associations
         (source_type, source_id, target_type, target_id, organization_id, role, label,
          metadata, created_by, origin, updated_by_tier)
  values ('record', p_record_id, 'record', v_file_record, p_organization_id, 'references', p_field_key,
          jsonb_build_object('whole_value_of', p_field_key, 'version', v_p.value_version), v_p.owner_id,
          'matrx_records.big_values', 'code')
  on conflict (source_type, source_id, target_type, target_id, role) do nothing;

  delete from custom.whole_value_parked where id = v_p.id;
  return v_source || jsonb_build_object('pointer', v_p.pointer, 'version', v_p.value_version, 'key', p_field_key);
end;
$function$;

-- public.move_site_to_organization (live, verbatim)
CREATE OR REPLACE FUNCTION public.move_site_to_organization(p_site_id uuid, p_target_organization_id uuid, p_expected_version integer DEFAULT NULL::integer, p_brand_action text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_is_super boolean;
  v_site record;
  v_target record;
  v_source_name text;
  v_rows bigint;
  v_moved jsonb := '[]'::jsonb;
  v_preserved jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_brand record;
  v_brand_organization_name text;
  v_brand_action text;
  v_brand_strays bigint;
  v_brand_outcome jsonb := null;
  v_carry jsonb;
begin
  if v_uid is null then
    raise exception using errcode = '42501',
      message = 'Sign in to move a site between organizations.';
  end if;
  if p_brand_action is not null and p_brand_action not in ('move_brand', 'detach', 'keep') then
    raise exception using errcode = '22023',
      message = format('Unknown brand action "%s".', p_brand_action),
      hint = 'Use move_brand, detach, or keep.';
  end if;
  v_is_super := coalesce(public.is_super_admin_for(v_uid), false);

  -- Lock the site for the whole move so a concurrent rename/delete cannot
  -- interleave. SECURITY DEFINER bypasses RLS, so every check below is ours.
  select s.id, s.name, s.domain, s.organization_id, s.created_by, s.version,
         s.deleted_at, s.brand_id
    into v_site
  from web.site s
  where s.id = p_site_id
  for update;

  if v_site.id is null then
    perform platform.refuse_not_found('That site does not exist.');
  end if;

  -- Same answer for "hidden from you" as the rest of the platform gives, so a
  -- caller who cannot see the site learns nothing about it.
  if not (v_is_super
          or v_site.created_by = v_uid
          or iam.has_access_for(v_uid, 'web_site', p_site_id, 'viewer')) then
    perform platform.refuse_not_found('That site does not exist.');
  end if;

  if v_site.deleted_at is not null then
    raise exception using errcode = '55000',
      message = 'This site is in the trash. Restore it before moving it to another organization.';
  end if;

  -- ADMIN on the site, not editor: re-homing decides who can reach every row
  -- under it (THE GOVERNANCE-COLUMN TIER).
  if not (v_is_super
          or v_site.created_by = v_uid
          or iam.has_access_for(v_uid, 'web_site', p_site_id, 'admin')) then
    raise exception using errcode = '42501',
      message = format('Moving %s to another organization requires owner or admin access to the site.', v_site.name),
      detail  = 'Edit access is not enough: the move changes who can reach the site and all of its data.',
      hint    = 'Ask the site owner to move it, or request admin access to it first.';
  end if;

  if p_expected_version is not null and v_site.version is distinct from p_expected_version then
    raise exception using errcode = 'PT409',
      message = 'This site changed while you were looking at it. Reload and try the move again.';
  end if;

  select o.id, o.name into v_target
  from iam.organizations o
  where o.id = p_target_organization_id;

  if v_target.id is null then
    perform platform.refuse_not_found('That organization does not exist.');
  end if;

  -- Placing a site in an org is membership-gated everywhere else (web.site's
  -- std_insert policy is iam.has_org_access(organization_id)); the destination
  -- bar here is the same one, no tighter.
  if not (v_is_super or iam.has_org_access_for(v_uid, p_target_organization_id)) then
    raise exception using errcode = '42501',
      message = format('You are not a member of %s, so you cannot move a site into it.', v_target.name),
      hint    = 'Ask an owner of that organization to invite you first.';
  end if;

  select o.name into v_source_name from iam.organizations o where o.id = v_site.organization_id;

  -- ------------------------------------------------------- the brand's fate
  -- Resolved BEFORE the same-organization fast path as well as before a move.
  -- A site can already be in its intended organization while its parent brand
  -- is stranded elsewhere; returning early in that state preserves the exact
  -- containment access hole this RPC exists to close.
  -- A site with no brand still reads v_brand below; give it a shape first.
  select null::uuid as id, null::text as name, null::uuid as organization_id into v_brand;
  if v_site.brand_id is not null then
    select b.id, b.name, b.organization_id into v_brand
    from web.brand b where b.id = v_site.brand_id;
    select o.name into v_brand_organization_name
    from iam.organizations o where o.id = v_brand.organization_id;
  end if;

  if v_brand.id is not null and v_brand.organization_id is distinct from p_target_organization_id then
    v_brand_action := p_brand_action;

    if v_brand_action is null then
      raise exception using errcode = '22023',
        message = format('%s belongs to the brand "%s", which stays in %s.',
                         v_site.name, v_brand.name,
                         coalesce(v_brand_organization_name, 'another organization')),
        detail  = 'A brand conveys access to every site inside it, so leaving it behind '
               || 'lets members of the old organization keep reading this site.',
        hint    = 'Choose: move the brand too, detach this site from the brand, or '
               || 'knowingly keep the brand where it is.';
    end if;

    if v_brand_action = 'move_brand' then
      -- Moving a brand moves what it conveys. If it still holds sites that are
      -- not going along, this would hand the destination org access to them.
      select count(*) into v_brand_strays
      from web.site s
      where s.brand_id = v_brand.id
        and s.id <> p_site_id
        and s.deleted_at is null
        and s.organization_id is distinct from p_target_organization_id;

      if v_brand_strays > 0 then
        raise exception using errcode = '22023',
          message = format('"%s" still has %s other site(s) outside %s, so the brand cannot move with this one.',
                           v_brand.name, v_brand_strays, v_target.name),
          detail  = 'Moving the brand would give the destination organization access to those sites too.',
          hint    = 'Move those sites first, or detach this site from the brand instead.';
      end if;

      update web.brand
         set organization_id = p_target_organization_id,
             updated_by = v_uid,
             updated_at = now()
       where id = v_brand.id;
      v_brand_outcome := jsonb_build_object('action', 'moved', 'id', v_brand.id, 'name', v_brand.name);

    elsif v_brand_action = 'detach' then
      update web.site set brand_id = null where id = p_site_id;
      v_brand_outcome := jsonb_build_object('action', 'detached', 'id', v_brand.id, 'name', v_brand.name);

    else
      v_brand_outcome := jsonb_build_object(
        'action', 'kept',
        'id', v_brand.id,
        'name', v_brand.name,
        'organization_id', v_brand.organization_id,
        'warning', format('Members of %s can still reach this site through the brand "%s".',
                          coalesce(v_source_name, 'the previous organization'), v_brand.name));
    end if;
  end if;

  if v_site.organization_id = p_target_organization_id then
    return jsonb_build_object(
      'moved', false,
      'reason', case
                  when v_brand_outcome is null then 'already_there'
                  when v_brand_outcome ->> 'action' = 'kept' then 'brand_kept'
                  else 'brand_reconciled'
                end,
      'site_id', p_site_id,
      'site_name', v_site.name,
      'organization_id', p_target_organization_id,
      'organization_name', v_target.name,
      'moved_tables', case when v_brand_outcome is null
                                  or v_brand_outcome ->> 'action' = 'kept'
                           then '[]'::jsonb
                           else jsonb_build_array(
                             jsonb_build_object('table', 'web.brand', 'rows', 1)) end,
      'preserved_tables', '[]'::jsonb,
      'rows_moved', case when v_brand_outcome is null
                               or v_brand_outcome ->> 'action' = 'kept'
                         then 0 else 1 end,
      'brand', v_brand_outcome
    );
  end if;

  -- THE SITE ROW MOVES FIRST, and that is not a style choice:
  -- web.enforce_site_component_organization() is a BEFORE INSERT/UPDATE trigger
  -- on the web.* children that REJECTS any child whose organization_id differs
  -- from its parent site's. Touch a child while the site still points at the
  -- old org and the move dies with 23514. Atomicity does not depend on the
  -- order — every statement below is in this one transaction, so a failure
  -- anywhere rolls the site row back with it.
  update web.site
     set organization_id = p_target_organization_id,
         updated_by = v_uid,
         updated_at = now()
   where id = p_site_id;
  v_total := 1;
  v_moved := jsonb_build_array(jsonb_build_object('table', 'web.site', 'rows', 1));

  -- ---------------------------------------------------------------- children
  -- Every row under the site follows it, parents before children, along the platform parent
  -- registry (MKT-158). A child that cannot follow fails the whole move; nothing is left behind.
  -- The crawl's stored artifacts (page bodies, markdown, screenshots) are the site's: they move
  -- first, so the snapshots and screenshots that name them can follow.
  set constraints web.snapshot_body_file_org_fkey, web.snapshot_markdown_file_org_fkey,
                  web.screenshot_file_org_fkey deferred;
  update files.files f
     set organization_id = p_target_organization_id
   where f.organization_id is distinct from p_target_organization_id
     and f.id in (select x.body_file_id from web.snapshot x where x.site_id = p_site_id
                  union select x.markdown_file_id from web.snapshot x where x.site_id = p_site_id
                  union select x.file_id from web.screenshot x where x.site_id = p_site_id);
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    v_moved := v_moved || jsonb_build_object('table', 'files.files', 'rows', v_rows);
    v_total := v_total + v_rows;
  end if;

  v_carry := platform.carry_children_to_organization('web.site'::regclass, p_site_id, p_target_organization_id);
  v_moved := v_moved || (v_carry -> 'moved_tables');
  v_total := v_total + (v_carry ->> 'rows_moved')::bigint;

  return jsonb_build_object(
    'moved', true,
    'site_id', p_site_id,
    'site_name', v_site.name,
    'site_domain', v_site.domain,
    'from_organization_id', v_site.organization_id,
    'from_organization_name', v_source_name,
    'organization_id', p_target_organization_id,
    'organization_name', v_target.name,
    'moved_tables', v_moved,
    'preserved_tables', v_preserved,
    'rows_moved', v_total,
    'brand', v_brand_outcome
  );
end;
$function$;

-- web.brand_archive (live, verbatim)
CREATE OR REPLACE FUNCTION web.brand_archive(p_brand_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_counts jsonb := web.brand_archive_preview(p_brand_id);
  v_prev jsonb;
  v_done jsonb;
begin
  v_prev := platform.change_records('delete', 'web_brand', array[p_brand_id]);
  v_done := platform.change_records('delete', 'web_brand', array[p_brand_id], null, null, '{}'::jsonb, false, v_prev ->> 'fingerprint');
  if v_done ->> 'status' is distinct from 'done' then
    raise exception using errcode = 'PT409', message = coalesce(v_done ->> 'message', 'The brand changed while it was being archived. Try again.');
  end if;
  return v_counts || jsonb_build_object('archived', true, 'plan_id', v_done ->> 'plan_id', 'kept_in_use', v_done -> 'kept_in_use',
    'archived_at', (select b.deleted_at from web.brand b where b.id = p_brand_id));
end $function$;


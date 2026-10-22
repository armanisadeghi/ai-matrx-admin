-- INVERSE of migrations/campaign/20261021110000_fixture_purge_a_a_fixture_purge_removes_immutable_rows.sql (lane FIXTURE-PURGE): restores the nine rule bodies, drops the helper.
-- chair-step: restores nine function bodies and drops one function.
-- ground-standing-ok: c (admin._support_session_events_append_only IS run by live trigger _support_session_events_append_only on admin.support_session_events, created outside the migration tree; verified in pg_trigger)
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION content._document_version_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if content._capture_bypassed() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    if current_user in ('authenticated', 'anon') then
      raise exception using
        errcode = '42501',
        message = 'Versions are written by the database when a document changes; they cannot be inserted directly.',
        hint = 'Edit content.document; to go back to an old version call content.version_restore(document_id, content_version, expected_version).';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if current_user in ('authenticated', 'anon') then
      raise exception using
        errcode = '42501',
        message = 'A version is a permanent record; it cannot be deleted by hand.',
        hint = 'Autosave versions are thinned by the platform; to discard a document, move it to the trash.';
    end if;
    return old;
  end if;
  if (new.organization_id, new.created_by, new.created_at, new.document_id, new.content_version,
      new.change_kind, new.title, new.summary, new.format, new.body, new.body_content_version,
      new.content_hash, new.payload_hash, new.document_type_id, new.visibility_at_capture,
      new.data_class_at_capture, new.folder_id_at_capture, new.archived_at_capture,
      new.deleted_at_capture, new.sealed_at_capture, new.origin, new.actor_id, new.actor_tier,
      new.device_id, new.conversation_id, new.source_ref, new.custom_fields)
     is distinct from
     (old.organization_id, old.created_by, old.created_at, old.document_id, old.content_version,
      old.change_kind, old.title, old.summary, old.format, old.body, old.body_content_version,
      old.content_hash, old.payload_hash, old.document_type_id, old.visibility_at_capture,
      old.data_class_at_capture, old.folder_id_at_capture, old.archived_at_capture,
      old.deleted_at_capture, old.sealed_at_capture, old.origin, old.actor_id, old.actor_tier,
      old.device_id, old.conversation_id, old.source_ref, old.custom_fields) then
    raise exception using
      errcode = '42501',
      message = 'A version is a record of what the document said; only its label and note can change.',
      hint = 'Edit the document itself to change its content; set label or note on this version.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION content._space_payload_insert_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if content._capture_bypassed() then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    raise exception using
      errcode = '42501',
      message = 'A Space payload is never overwritten; every save mints a new content version.',
      hint = 'Save through content.space_save(document_id, expected_version, snapshot, title, projection).';
  end if;
  if current_user in ('authenticated', 'anon') then
    raise exception using
      errcode = '42501',
      message = 'Space payloads are written only by content.space_save.',
      hint = 'Call content.space_save(document_id, expected_version, snapshot, title, projection).';
  end if;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION content._univer_payload_insert_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if content._capture_bypassed() then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    raise exception using
      errcode = '42501',
      message = 'A Univer payload is never overwritten; every save mints a new content version.',
      hint = 'Save through content.univer_save(document_id, expected_version, snapshot, projection).';
  end if;
  if current_user in ('authenticated', 'anon') then
    raise exception using
      errcode = '42501',
      message = 'Univer payloads are written only by content.univer_save.',
      hint = 'Call content.univer_save(document_id, expected_version, snapshot, projection).';
  end if;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION admin._support_session_events_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  raise exception 'Support session events are append-only' using errcode = '42501';
end $function$;

CREATE OR REPLACE FUNCTION browser._action_event_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if current_user = 'service_role' then return coalesce(NEW, OLD); end if;
  raise exception using
    errcode = '42501',
    message = 'Browser action events are an append-only record and cannot be changed or removed.';
end $function$;

CREATE OR REPLACE FUNCTION esign._guard_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'esign.%: the event ledger is append-only — % is refused', tg_table_name, tg_op
    using errcode = '42501';
end $function$;

CREATE OR REPLACE FUNCTION web.reject_crawl_fact_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
     AND (to_jsonb(OLD) - 'deleted_at') = (to_jsonb(NEW) - 'deleted_at') THEN
    RETURN NEW;
  END IF;

  -- A fact follows its site to another organization (MKT-158); the site guard pins the target.
  IF TG_OP = 'UPDATE' AND platform.org_follow_only(to_jsonb(OLD), to_jsonb(NEW)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'web.% is append-only; insert a new fact instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$function$;

CREATE OR REPLACE FUNCTION web.reject_immutable_fact_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
     AND (to_jsonb(OLD) - 'deleted_at') = (to_jsonb(NEW) - 'deleted_at') THEN
    RETURN NEW;
  END IF;

  -- A fact follows its site to another organization (MKT-158); the site guard pins the target.
  IF TG_OP = 'UPDATE' AND platform.org_follow_only(to_jsonb(OLD), to_jsonb(NEW)) THEN
    RETURN NEW;
  END IF;

  -- A snapshot names the Source it landed as (1274); nothing else about the fact may change.
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'snapshot'
     AND (to_jsonb(OLD) - 'processed_document_id') = (to_jsonb(NEW) - 'processed_document_id') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'link_edge' THEN
    IF NEW.id = OLD.id
       AND NEW.organization_id = OLD.organization_id
       AND NEW.site_id = OLD.site_id
       AND NEW.snapshot_id = OLD.snapshot_id
       AND NEW.source_page_id = OLD.source_page_id
       AND NEW.target_url = OLD.target_url
       AND NEW.is_internal = OLD.is_internal
       AND NEW.rel IS NOT DISTINCT FROM OLD.rel
       AND NEW.anchor_text IS NOT DISTINCT FROM OLD.anchor_text
       AND NEW.position IS NOT DISTINCT FROM OLD.position
       AND NEW.created_at = OLD.created_at
       AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
       AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
       AND NEW.metadata = OLD.metadata
    THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'web.% is immutable; append a new row instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$function$;

CREATE OR REPLACE FUNCTION workflow.reject_plan_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    raise exception 'workflow.plan_event is append-only: % is forbidden for this event', TG_OP using ERRCODE = '55000',
            detail = jsonb_build_object('id', OLD.id)::text;
END;
$function$;


DROP FUNCTION IF EXISTS iam.fixture_purge_allows(text, jsonb, jsonb);

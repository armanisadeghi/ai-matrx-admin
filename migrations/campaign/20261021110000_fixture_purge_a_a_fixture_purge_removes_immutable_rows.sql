-- additive: yes
-- lane: FIXTURE-PURGE
-- Inverse: migrations/inverse/20261021110000_fixture_purge_a_a_fixture_purge_removes_immutable_rows_down.sql
-- Adds iam.fixture_purge_allows (read-only helper) and a guarded early exit in nine append-only / immutable row rules.
-- Nothing is dropped, revoked or deleted. Every real edit still refuses exactly as before.
-- based-on: content._document_version_immutable() 01a35d94da503c2ad1a62d14cb43e5c9bb88a0f8717b13727fe1a51e6358e20c
-- based-on: content._space_payload_insert_only() 02254cea182aef509a22a96f508c734159ca1da669d845de4bf07f5d9b84156c
-- based-on: content._univer_payload_insert_only() 728d437d93bef40884cd16104ba01f1dcadd966b4377484305a28c73a9117500
-- based-on: admin._support_session_events_append_only() 474c6c8e25c60e0b1374d4279ff1a97280b9d34ab7eb349e9f61316cd7efeb2f
-- based-on: browser._action_event_append_only() 576ca077a8268320c325272580b3a19db65d7055753ce65526f2c076c5e773f6
-- based-on: esign._guard_append_only() 58c783ed9d9e97c683c1d63bc222f0baf7622a1a010e97ab26de3654d8befb52
-- based-on: web.reject_crawl_fact_mutation() f79b4dd1701e3907c76367662cdad6ebb8724dcd876dee2d16e2a18a3626508f
-- based-on: web.reject_immutable_fact_mutation() 89b7ab8d610c6d345df6f85b5d9b0589ac8973027166356b9999d0aae95c96c2
-- based-on: workflow.reject_plan_event_mutation() c3ee8e3359e2d3892d77a32ca2b1e8b40470858080fff701ddb2889b9ad5139a
--
-- FIXTURE-PURGE. A test person who used Spaces "Add a sample" could not be deleted: the sweeper clears the person's
-- document versions and Space payloads, and the rule that keeps versions unchangeable refused. The same refusal sits
-- on the other append-only records. The exemption is the existing purge marker: iam.arm_fixture_delete (definer;
-- refuses anyone not tagged app_metadata.test_fixture) sets the transaction-local iam.fixture_delete_ids. The helper
-- honours it ONLY for the postgres session (server lane; authenticated/anon/service sessions never qualify),
-- and only (a) DELETE of a row that names an armed fixture as creator/actor, or (b) an UPDATE whose every change
-- sets a person key that held an armed fixture to NULL. No client-settable flag.
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION iam.fixture_purge_allows(p_op text, p_old jsonb, p_new jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_armed text[] := string_to_array(coalesce(current_setting('iam.fixture_delete_ids', true), ''), ',');
  k text;
begin
  if session_user <> 'postgres' or coalesce(array_length(v_armed, 1), 0) = 0 or v_armed = array['']::text[] then
    return false;
  end if;
  if p_op = 'DELETE' then
    return exists (
      select 1 from unnest(array['created_by', 'actor_id', 'actor_user_id', 'admin_user_id', 'target_user_id']) key
       where p_old ->> key = any(v_armed));
  end if;
  if p_op = 'UPDATE' and p_new is not null then
    for k in select n.key from jsonb_each(p_new) n where n.value is distinct from p_old -> n.key loop
      if not (p_old ->> k = any(v_armed) and p_new -> k = 'null'::jsonb) then
        return false;
      end if;
    end loop;
    return p_new is distinct from p_old;
  end if;
  return false;
end
$function$;
COMMENT ON FUNCTION iam.fixture_purge_allows(text, jsonb, jsonb) IS 'FIXTURE-PURGE: true only inside a postgres-session transaction armed by iam.arm_fixture_delete, for a DELETE of an armed fixture''s own row or an UPDATE that only nulls an armed fixture''s person key. Called by the immutable-record row rules.';

CREATE OR REPLACE FUNCTION content._document_version_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
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

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
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

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
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

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'Support session events are append-only' using errcode = '42501';
end $function$;

CREATE OR REPLACE FUNCTION browser._action_event_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
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

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'esign.%: the event ledger is append-only — % is refused', tg_table_name, tg_op
    using errcode = '42501';
end $function$;

CREATE OR REPLACE FUNCTION web.reject_crawl_fact_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
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

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
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

  -- FIXTURE PURGE (lane FIXTURE-PURGE): the sweeper's server lane, armed by iam.arm_fixture_delete for a tagged
  -- fixture, may delete the fixture's OWN rows and unlink its person keys. Every real edit still refuses.
  if tg_op <> 'INSERT' and iam.fixture_purge_allows(tg_op, to_jsonb(old), case when tg_op = 'UPDATE' then to_jsonb(new) end) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
    raise exception 'workflow.plan_event is append-only: % is forbidden for this event', TG_OP using ERRCODE = '55000',
            detail = jsonb_build_object('id', OLD.id)::text;
END;
$function$;

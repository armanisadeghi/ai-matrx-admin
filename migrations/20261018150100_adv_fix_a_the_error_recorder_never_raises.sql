-- lane: ADV-FIX-A
-- lock: ops
-- based-on: ops.record_system_error(jsonb) 3782a4291f6c31324ef5e8ff5dc82bd4d22180f879fc794144c2c9ca074ff539
--
-- ADV-FIX-A (ADV-1 F5) - THE ERROR RECORDER NEVER RAISES. W1-STORE's body still cast organization_id,
-- occurred_in_organization_id, user_id and id with ::uuid BEFORE its protected block, so one non-uuid text in an
-- error report raised 22P02 and aborted the caller's whole transaction (the row rides the caller's connection inside
-- a matrx_orm transaction). Every conversion of the caller's text (those four, conversation_id, agent_id, created_by
-- and occurred_at) now runs inside a protected block: a value that does not convert is stored as null and kept, as
-- written, in context.unconvertible.<key>; the error itself is still recorded. The stand-in row keeps the signed-in
-- sender (created_by = auth.uid() when that person exists) as the body before W1-STORE did.
CREATE OR REPLACE FUNCTION ops.record_system_error(p_error jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_e    jsonb := coalesce(p_error, '{}'::jsonb);
  v_uid  uuid := auth.uid();
  v_user uuid;
  v_org  uuid;
  v_oin  uuid;
  v_ctx  jsonb;
  v_id   uuid;
  v_why  text;
  v_sys  uuid;
  v_app  text;
  v_given uuid;
  v_conv  uuid;
  v_agent uuid;
  v_by    uuid;
  v_at    timestamptz;
  v_bad   jsonb := '{}'::jsonb;
  c_uuid  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  k       text;
begin
  -- ADV-FIX-A 3: EVERY conversion of the caller's text happens here, protected, and never raises. A value that is not
  -- a uuid (or not a time) is stored as null and kept, as written, in context.unconvertible.<key>; the error itself is
  -- still recorded, and a caller's transaction is never aborted by the recorder.
  begin
    v_ctx := case when jsonb_typeof(v_e->'context') = 'object' then v_e->'context' else '{}'::jsonb end;
    foreach k in array array['organization_id', 'occurred_in_organization_id', 'user_id', 'id', 'conversation_id', 'agent_id', 'created_by'] loop
      if nullif(v_e->>k, '') is not null and not ((v_e->>k) ~ c_uuid) then
        v_bad := v_bad || jsonb_build_object(k, left(v_e->>k, 200));
      end if;
    end loop;
    if nullif(v_e->>'occurred_at', '') is not null then
      begin
        v_at := (v_e->>'occurred_at')::timestamptz;
      exception when others then
        v_bad := v_bad || jsonb_build_object('occurred_at', left(v_e->>'occurred_at', 200));
      end;
    end if;
    if v_bad <> '{}'::jsonb then
      v_ctx := v_ctx || jsonb_build_object('unconvertible', v_bad);
    end if;
    select s.organization_id into v_sys from iam.system_orgs s where s.key = 'system';
    v_org   := case when not v_bad ? 'organization_id' then nullif(v_e->>'organization_id', '')::uuid end;
    v_oin   := coalesce(case when not v_bad ? 'occurred_in_organization_id' then nullif(v_e->>'occurred_in_organization_id', '')::uuid end, v_org);
    if v_oin = v_sys then v_oin := null; end if;
    v_user  := case when not v_bad ? 'user_id' then nullif(v_e->>'user_id', '')::uuid end;
    v_conv  := case when not v_bad ? 'conversation_id' then nullif(v_e->>'conversation_id', '')::uuid end;
    v_agent := case when not v_bad ? 'agent_id' then nullif(v_e->>'agent_id', '')::uuid end;
    v_by    := case when not v_bad ? 'created_by' then nullif(v_e->>'created_by', '')::uuid end;
    v_given := case when not v_bad ? 'id' then nullif(v_e->>'id', '')::uuid end;
  exception when others then
    v_ctx := coalesce(v_ctx, '{}'::jsonb) || jsonb_build_object('unconvertible_refusal', sqlstate || ': ' || sqlerrm);
  end;
  if v_uid is not null and v_user is not null and v_user is distinct from v_uid then
    v_ctx := v_ctx || jsonb_build_object('declared_user_id', v_user);
    v_user := v_uid;
  end if;
  -- A reference that points at nothing is stored as null and NOTED, never refused.
  if v_user is not null and not exists (select 1 from iam.users u where u.id = v_user) then
    v_ctx := v_ctx || jsonb_build_object('unknown_user_id', v_user);
    v_user := null;
  end if;
  if v_oin is not null and not exists (select 1 from iam.organizations o where o.id = v_oin) then
    v_ctx := v_ctx || jsonb_build_object('unknown_organization_id', v_oin);
    v_oin := null;
  end if;
  v_app := v_e->>'source_app';
  if v_app in ('claude-code', 'codex', 'cursor', 'vscode') then
    v_ctx := v_ctx || jsonb_build_object('refused_source_app', v_app);
    v_app := null;
  end if;
  v_given := coalesce(v_given, gen_random_uuid());
  if exists (select 1 from ops.system_error x where x.id = v_given) then
    v_ctx := v_ctx || jsonb_build_object('original_id', v_given);
    v_given := gen_random_uuid();
  end if;
  begin
    insert into ops.system_error (id, kind, request_id, user_id, conversation_id, agent_id, source_app, route,
                                  error_type, error_text, traceback, payload, context, occurred_at,
                                  organization_id, occurred_in_organization_id, created_by, metadata, source_feature)
    values (v_given,
            coalesce(nullif(v_e->>'kind', ''), 'unclassified'),
            v_e->>'request_id', v_user,
            v_conv, v_agent,
            v_app, v_e->>'route', v_e->>'error_type',
            coalesce(nullif(v_e->>'error_text', ''), '(no message)'),
            v_e->>'traceback', v_e->'payload', v_ctx,
            coalesce(v_at, now()),
            v_sys, v_oin,
            coalesce(v_by, v_uid, v_user),
            case when jsonb_typeof(v_e->'metadata') = 'object' then v_e->'metadata' else '{}'::jsonb end,
            v_e->>'source_feature')
    returning id into v_id;
  exception when others then
    v_why := sqlstate || ': ' || sqlerrm;
    begin
      insert into ops.system_error (kind, error_type, error_text, source_app, source_feature, route, context, organization_id,
                                    occurred_in_organization_id, created_by)
      values ('system_error_write_refused', 'record_system_error',
              'An error could not be recorded as written (' || v_why || '). What it said is kept in context.original.',
              'database', 'provenance', 'ops.record_system_error',
              jsonb_build_object('original', v_e, 'refusal', v_why),
              v_sys, v_oin, (select u.id from iam.users u where u.id = v_uid))
      returning id into v_id;
    exception when others then
      raise warning 'ops.record_system_error could not store even the stand-in row: %: %', sqlstate, sqlerrm;
      v_id := null;
    end;
  end;
  return v_id;
end $function$;

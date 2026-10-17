-- inverse of 20261018010000_w1store_a_the_error_recorder_never_refuses.sql
-- lane: W1-STORE
-- lock: ops
CREATE OR REPLACE FUNCTION ops.record_system_error(p_error jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$;
declare
  v_e    jsonb := coalesce(p_error, '{}'::jsonb);
  v_uid  uuid := auth.uid();
  v_user uuid;
  v_org  uuid;
  v_ctx  jsonb;
  v_id   uuid;
  v_why  text;
  v_sys  uuid;
begin
  select s.organization_id into v_sys from iam.system_orgs s where s.key = 'system';
  v_org  := coalesce(nullif(v_e->>'occurred_in_organization_id', '')::uuid, nullif(v_e->>'organization_id', '')::uuid);
  if v_org = v_sys then v_org := null; end if;
  v_user := nullif(v_e->>'user_id', '')::uuid;
  v_ctx  := case when jsonb_typeof(v_e->'context') = 'object' then v_e->'context' else '{}'::jsonb end;
  if v_uid is not null and v_user is not null and v_user is distinct from v_uid then
    v_ctx := v_ctx || jsonb_build_object('declared_user_id', v_user);
    v_user := v_uid;
  end if;
  begin
    insert into ops.system_error (id, kind, request_id, user_id, conversation_id, agent_id, source_app, route,
                                  error_type, error_text, traceback, payload, context, occurred_at,
                                  organization_id, occurred_in_organization_id, created_by, metadata, source_feature)
    values (coalesce(nullif(v_e->>'id', '')::uuid, gen_random_uuid()),
            coalesce(nullif(v_e->>'kind', ''), 'unclassified'),
            v_e->>'request_id', v_user,
            nullif(v_e->>'conversation_id', '')::uuid, nullif(v_e->>'agent_id', '')::uuid,
            v_e->>'source_app', v_e->>'route', v_e->>'error_type',
            coalesce(nullif(v_e->>'error_text', ''), '(no message)'),
            v_e->>'traceback', v_e->'payload', v_ctx,
            coalesce(nullif(v_e->>'occurred_at', '')::timestamptz, now()),
            v_sys, v_org,
            coalesce(nullif(v_e->>'created_by', '')::uuid, v_uid, v_user),
            case when jsonb_typeof(v_e->'metadata') = 'object' then v_e->'metadata' else '{}'::jsonb end,
            v_e->>'source_feature')
    returning id into v_id;
  exception when others then
    v_why := sqlstate || ': ' || sqlerrm;
    insert into ops.system_error (kind, error_type, error_text, source_app, source_feature, route, context, organization_id,
                                  occurred_in_organization_id, created_by)
    values ('system_error_write_refused', 'record_system_error',
            'An error could not be recorded as written (' || v_why || '). What it said is kept in context.original.',
            'database', 'provenance', 'ops.record_system_error',
            jsonb_build_object('original', v_e, 'refusal', v_why),
            v_sys, v_org, v_uid)
    returning id into v_id;
  end;
  return v_id;
end $function$;

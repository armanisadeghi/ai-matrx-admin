-- chair-step: undo ADV-FIX-A's error-recorder fix: restore the W1-STORE body of ops.record_system_error
-- inverse of 20261018150100_adv_fix_a_the_error_recorder_never_raises.sql
-- lane: ADV-FIX-A
-- lock: ops
-- based-on: ops.record_system_error(jsonb) 7e8b09ac5e7285bc177ebacc8b5a883d4957570e58507fc2cb22ccc331dcc51b
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
begin
  select s.organization_id into v_sys from iam.system_orgs s where s.key = 'system';
  v_org  := nullif(v_e->>'organization_id', '')::uuid;
  v_oin  := coalesce(nullif(v_e->>'occurred_in_organization_id', '')::uuid, v_org);
  if v_oin = v_sys then v_oin := null; end if;
  v_user := nullif(v_e->>'user_id', '')::uuid;
  v_ctx  := case when jsonb_typeof(v_e->'context') = 'object' then v_e->'context' else '{}'::jsonb end;
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
  v_given := coalesce(nullif(v_e->>'id', '')::uuid, gen_random_uuid());
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
            nullif(v_e->>'conversation_id', '')::uuid, nullif(v_e->>'agent_id', '')::uuid,
            v_app, v_e->>'route', v_e->>'error_type',
            coalesce(nullif(v_e->>'error_text', ''), '(no message)'),
            v_e->>'traceback', v_e->'payload', v_ctx,
            coalesce(nullif(v_e->>'occurred_at', '')::timestamptz, now()),
            v_sys, v_oin,
            coalesce(nullif(v_e->>'created_by', '')::uuid, v_uid, v_user),
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
              v_sys, v_oin, null)
      returning id into v_id;
    exception when others then
      raise warning 'ops.record_system_error could not store even the stand-in row: %: %', sqlstate, sqlerrm;
      v_id := null;
    end;
  end;
  return v_id;
end $function$;

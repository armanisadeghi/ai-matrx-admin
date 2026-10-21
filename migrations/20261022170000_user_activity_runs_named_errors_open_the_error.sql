-- based-on: admin._user_activity_run(uuid, timestamp with time zone, integer) e14e000c1fb8119272ed30457365a44360999f5ea7287d16ef646b23eea44ce0
-- based-on: admin._user_activity_error(uuid, timestamp with time zone, integer) 3698477e54d99ecacdcb465fb8111f087f0caca006a0c0d6fd9c6fff08b80c91
-- Activity: a workflow run row is titled with its workflow's name (titles only, no content); an error row's
-- door is the error record itself (app_log Peek), with the owning conversation as a secondary door.

create or replace function admin._user_activity_run(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select u.at, u.item from (
      (select r.created_at as at,
              admin._user_activity_item(r.created_at, 'run', 'agent:' || r.id::text,
                'Agent job',
                replace(r.kind, '_', ' ') || ' · ' || r.status,
                r.created_by,
                jsonb_build_object('type', 'agent_run', 'id', r.id)) as item
         from chat.agent_run r
        where r.created_by = p_user and r.created_at <= p_before and r.deleted_at is null
        order by r.created_at desc
        limit p_limit)
      union all
      (select w.created_at,
              admin._user_activity_item(w.created_at, 'run', 'workflow:' || w.id::text,
                coalesce(nullif(btrim(d.name), ''), 'Workflow run'),
                w.status,
                w.created_by,
                jsonb_build_object('type', 'workflow_run', 'id', w.id))
         from workflow.run w
         left join workflow.definition d on d.id = w.definition_id
        where w.created_by = p_user and w.created_at <= p_before and w.deleted_at is null
        order by w.created_at desc
        limit p_limit)
    ) u
    order by u.at desc
    limit p_limit
  ) s
$$;

create or replace function admin._user_activity_error(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select l.ts as at,
           admin._user_activity_item(l.ts, 'error', l.id::text,
             coalesce(nullif(l.exc_type, ''), 'Error') || coalesce(' · ' || nullif(l.feature, ''), ''),
             l.route,
             l.user_id,
             jsonb_build_object('type', 'app_log', 'id', l.id, 'conversation_id', l.conversation_id)) as item
      from ops.app_log l
     where l.user_id = p_user and l.level_no >= 40 and l.ts <= p_before
     order by l.ts desc
     limit p_limit
  ) s
$$;

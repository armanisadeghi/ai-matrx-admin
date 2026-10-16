-- Applied 2026-10-16 via Supabase MCP.
-- plan.brief_run_history: the content-plan page's brief-run history in ONE call,
-- replacing GET /content-plan/nodes/{id}/brief-runs (server-as-db-calls register).
-- SECURITY INVOKER: row security decides what the caller may read, exactly as the
-- server's per-row loads did. Same filters as the server: live edges
-- (source plan_node, target agent_run, role ai_run, node's organization), live runs
-- of kind content_plan.brief, newest first, 25 max.
create or replace function plan.brief_run_history(p_node_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_node plan.node;
  v_current text;
begin
  select * into v_node from plan.node where id = p_node_id and deleted_at is null;
  if not found then
    raise exception 'Plan node % not found.', p_node_id using errcode = 'P0002';
  end if;
  v_current := v_node.metadata -> 'ai_brief_draft' ->> 'run_id';
  return jsonb_build_object(
    'node_id', p_node_id,
    'runs', coalesce((
      select jsonb_agg(x.j order by x.created_at desc) from (
        select r.created_at,
          jsonb_build_object(
            'run_id', r.id::text,
            'status', coalesce(r.status::text, ''),
            'created_at', to_json(r.created_at) #>> '{}',
            'model_id', case when jsonb_typeof(r.result) = 'object' then r.result ->> 'model_id' end,
            'agent_id', case when jsonb_typeof(r.result) = 'object' then r.result ->> 'agent_id' end,
            'brief_line_count', case when jsonb_typeof(r.result -> 'brief') = 'array'
                                     then jsonb_array_length(r.result -> 'brief') else 0 end,
            'angle', coalesce(case when jsonb_typeof(r.result) = 'object' then r.result ->> 'angle' end, ''),
            'is_current', v_current is not null and v_current <> '' and r.id::text = v_current,
            'error', coalesce(case when jsonb_typeof(r.error) = 'object' then r.error ->> 'message' end, '')
          ) as j
        from platform.associations a
        join chat.agent_run r on r.id = a.target_id
        where a.source_type = 'plan_node'
          and a.source_id = p_node_id
          and a.organization_id = v_node.organization_id
          and a.target_type = 'agent_run'
          and a.role = 'ai_run'
          and a.deleted_at is null
          and r.deleted_at is null
          and r.kind = 'content_plan.brief'
        order by r.created_at desc
        limit 25
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function plan.brief_run_history(uuid) from public, anon;
grant execute on function plan.brief_run_history(uuid) to authenticated;

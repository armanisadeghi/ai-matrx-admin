-- Applied 2026-10-16 via Supabase MCP.
-- plan.site_ai_runs / plan.site_ai_run: the content-plan site's AI run history and one
-- run opened in full, replacing GET /content-plan/sites/{id}/ai-runs and
-- /ai-runs/{run_id} (server-as-db-calls register). SECURITY INVOKER: row security
-- decides what the caller reads. Same filters as the server: live edges (source
-- web_site, target agent_run, role ai_run, the site's organization), live runs,
-- newest first, 100 max; node routes from live plan.node rows of the site.
create or replace function plan._ai_run_kind_label(p_kind text)
returns text language sql immutable set search_path = '' as $$
  select case p_kind
    when 'content_plan.brief' then 'Page brief'
    when 'content_plan.deepen' then 'Page deepen'
    when 'content_plan.generate' then 'Plan generation'
    when 'content_plan.keyword_strategy' then 'Keyword strategy'
    when 'content_plan.entity_attach' then 'Entity attachments'
    when 'content_plan.review' then 'Plan review'
    when 'content_plan.p3_family' then 'Page family comparison'
    when 'content_plan.p4_write' then 'Page content written'
    when 'content_plan.p5_review' then 'Page review + fact-check'
    else p_kind end
$$;

create or replace function plan._ai_run_headline(p_kind text, p_result jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  r jsonb := case when jsonb_typeof(p_result) = 'object' then p_result else '{}'::jsonb end;
  n int; m int; parts text[];
begin
  if p_kind = 'content_plan.brief' then
    n := case when jsonb_typeof(r -> 'brief') = 'array' then jsonb_array_length(r -> 'brief') else 0 end;
    return n || ' brief line(s)' || case when coalesce(r ->> 'angle', '') <> '' then ' — ' || (r ->> 'angle') else '' end;
  elsif p_kind = 'content_plan.deepen' then
    n := case when jsonb_typeof(r -> 'brief') = 'array' then jsonb_array_length(r -> 'brief') else 0 end;
    parts := array[n || ' brief line(s)'];
    if jsonb_typeof(r -> 'sources') = 'array' and jsonb_array_length(r -> 'sources') > 0 then
      parts := parts || (jsonb_array_length(r -> 'sources') || ' source(s)');
    end if;
    if jsonb_typeof(r -> 'primary_keyword_set') = 'string' and (r ->> 'primary_keyword_set') <> '' then
      parts := parts || ('keyword “' || (r ->> 'primary_keyword_set') || '”');
    end if;
    return array_to_string(parts, ', ');
  elsif p_kind = 'content_plan.generate' then
    n := case when jsonb_typeof(r -> 'nodes') = 'array' then jsonb_array_length(r -> 'nodes') else 0 end;
    return n || ' page(s) merged' || case when jsonb_typeof(r -> 'applied') = 'object' and r -> 'applied' <> '{}'::jsonb
                                          then ' (applied)' else ' (preview only)' end;
  elsif p_kind = 'content_plan.keyword_strategy' then
    n := case when jsonb_typeof(r -> 'assignments') = 'array' then jsonb_array_length(r -> 'assignments') else 0 end;
    return n || ' page assignment(s)';
  elsif p_kind = 'content_plan.entity_attach' then
    n := case when jsonb_typeof(r -> 'attachments') = 'array' then jsonb_array_length(r -> 'attachments') else 0 end;
    m := case when jsonb_typeof(r -> 'missing_entities') = 'array' then jsonb_array_length(r -> 'missing_entities') else 0 end;
    return n || ' attachment(s)' || case when m > 0 then ', ' || m || ' roster gap(s)' else '' end;
  elsif p_kind = 'content_plan.review' then
    n := case when jsonb_typeof(r -> 'findings') = 'array' then jsonb_array_length(r -> 'findings') else 0 end;
    return n || ' finding(s)';
  end if;
  return '';
end $$;

create or replace function plan.site_ai_runs(p_site_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from web.site where id = p_site_id and deleted_at is null;
  if not found then
    raise exception 'Site % not found.', p_site_id using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'site_id', p_site_id,
    'runs', coalesce((
      select jsonb_agg(x.j order by x.created_at desc) from (
        select r.created_at,
          jsonb_build_object(
            'run_id', r.id::text,
            'kind', coalesce(r.kind::text, ''),
            'kind_label', plan._ai_run_kind_label(coalesce(r.kind::text, '')),
            'status', coalesce(r.status::text, ''),
            'created_at', to_json(r.created_at) #>> '{}',
            'node_id', case when jsonb_typeof(r.request -> 'node_id') = 'string' then r.request ->> 'node_id' end,
            'node_route', coalesce((
              select n.route::text from plan.node n
              where n.site_id = p_site_id and n.deleted_at is null
                and jsonb_typeof(r.request -> 'node_id') = 'string'
                and n.id::text = r.request ->> 'node_id'), ''),
            'model_id', case when jsonb_typeof(r.result) = 'object' and coalesce(r.result ->> 'model_id', '') <> ''
                             and jsonb_typeof(r.result -> 'model_id') = 'string' then r.result ->> 'model_id' end,
            'headline', plan._ai_run_headline(coalesce(r.kind::text, ''), r.result),
            'total_cost', coalesce(r.total_cost, 0)::float8,
            'error', coalesce(case when jsonb_typeof(r.error) = 'object' then r.error ->> 'message' end, '')
          ) as j
        from platform.associations a
        join chat.agent_run r on r.id = a.target_id
        where a.source_type = 'web_site'
          and a.source_id = p_site_id
          and a.organization_id = v_org
          and a.target_type = 'agent_run'
          and a.role = 'ai_run'
          and a.deleted_at is null
          and r.deleted_at is null
        order by r.created_at desc
        limit 100
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function plan.site_ai_run(p_site_id uuid, p_run_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  r chat.agent_run;
begin
  select organization_id into v_org from web.site where id = p_site_id and deleted_at is null;
  if not found then
    raise exception 'Site % not found.', p_site_id using errcode = 'P0002';
  end if;
  select * into r from chat.agent_run where id = p_run_id and deleted_at is null;
  if not found then
    raise exception 'AI run % not found.', p_run_id using errcode = 'P0002';
  end if;
  if r.organization_id is distinct from v_org then
    raise exception 'That run belongs to a different organization.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'run_id', r.id::text,
    'kind', coalesce(r.kind::text, ''),
    'kind_label', plan._ai_run_kind_label(coalesce(r.kind::text, '')),
    'status', coalesce(r.status::text, ''),
    'created_at', to_json(r.created_at) #>> '{}',
    'node_id', case when jsonb_typeof(r.request -> 'node_id') = 'string' then r.request ->> 'node_id' end,
    'total_cost', coalesce(r.total_cost, 0)::float8,
    'request', case when jsonb_typeof(r.request) = 'object' then r.request else '{}'::jsonb end,
    'result', case when jsonb_typeof(r.result) = 'object' then r.result else '{}'::jsonb end,
    'error', case when jsonb_typeof(r.error) = 'object' then r.error else '{}'::jsonb end
  );
end;
$$;

revoke all on function plan.site_ai_runs(uuid), plan.site_ai_run(uuid, uuid) from public, anon;
grant execute on function plan.site_ai_runs(uuid), plan.site_ai_run(uuid, uuid) to authenticated;
revoke all on function plan._ai_run_kind_label(text), plan._ai_run_headline(text, jsonb) from public, anon;
grant execute on function plan._ai_run_kind_label(text), plan._ai_run_headline(text, jsonb) to authenticated;

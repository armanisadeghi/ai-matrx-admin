-- Applied 2026-10-16 via Supabase MCP.
-- plan.restore_brief_run: make a past brief run the node's current proposal again, in ONE
-- call, replacing POST /content-plan/nodes/{id}/brief-runs/restore (server-as-db-calls
-- register). SECURITY INVOKER: the same row policies govern the node write. Same checks and
-- the same write as the server: the node and run are live, the run is a content_plan.brief
-- run of the node's organization with a non-empty brief; the run's result becomes
-- metadata.ai_brief_draft with run_id = the run and accepted_at cleared. Nothing is destroyed.
create or replace function plan.restore_brief_run(p_node_id uuid, p_run_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_node plan.node;
  v_run chat.agent_run;
  v_draft jsonb;
begin
  select * into v_node from plan.node where id = p_node_id and deleted_at is null;
  if not found then
    raise exception 'Plan node % not found.', p_node_id using errcode = 'P0002';
  end if;
  select * into v_run from chat.agent_run
   where id = p_run_id and deleted_at is null and kind = 'content_plan.brief';
  if not found then
    raise exception 'Brief run % not found.', p_run_id using errcode = 'P0002';
  end if;
  if v_run.organization_id is distinct from v_node.organization_id then
    raise exception 'That run belongs to a different organization.' using errcode = '42501';
  end if;
  if jsonb_typeof(v_run.result) <> 'object'
     or jsonb_typeof(v_run.result -> 'brief') <> 'array'
     or jsonb_array_length(v_run.result -> 'brief') = 0 then
    raise exception 'That run produced no brief to restore.' using errcode = '22023';
  end if;
  -- BriefDraft's own defaults first (the server validated through that model), then the run's
  -- result, then the two fields restoring sets.
  v_draft := jsonb_build_object(
      'brief', '[]'::jsonb, 'angle', '', 'must_not_cover', '[]'::jsonb, 'concerns', '[]'::jsonb,
      'suggested_word_count', null, 'agent_id', null, 'model_id', null, 'generated_at', '',
      'run_id', null, 'accepted_at', null, 'writing_check', null)
    || v_run.result
    || jsonb_build_object('run_id', v_run.id::text, 'accepted_at', null);
  update plan.node
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{ai_brief_draft}', v_draft)
   where id = p_node_id;
  return jsonb_build_object('node_id', p_node_id, 'brief', v_draft -> 'brief');
end;
$$;

revoke all on function plan.restore_brief_run(uuid, uuid) from public, anon;
grant execute on function plan.restore_brief_run(uuid, uuid) to authenticated;

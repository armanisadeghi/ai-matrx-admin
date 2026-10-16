-- based-on: plan.restore_brief_run(uuid, uuid) 604939aa8a5c22840cb5b17be13fe70aa6389e7c5f8eabf1e7646466147031c6
-- plan.restore_brief_run, review fixes: (1) the node UPDATE runs under RLS std_update, so a caller
-- without edit rights updates 0 rows; that used to return the draft as if it had worked. It now
-- raises (42501) and the UI shows the message. (2) Only the server's BriefDraft fields are copied
-- from the run's result (aidream services/content_plan/brief_writer.py BriefDraft) - no stray keys.
-- (3) mandate_key keeps BriefDraft's default 'content_plan.brief_writer'.
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
  v_draft := jsonb_build_object(
      'brief', '[]'::jsonb, 'angle', '', 'must_not_cover', '[]'::jsonb, 'concerns', '[]'::jsonb,
      'suggested_word_count', null, 'mandate_key', 'content_plan.brief_writer',
      'agent_id', null, 'model_id', null, 'generated_at', '',
      'run_id', null, 'accepted_at', null, 'writing_check', null)
    || coalesce((
         select jsonb_object_agg(e.key, e.value)
           from jsonb_each(v_run.result) e
          where e.key in ('brief', 'angle', 'must_not_cover', 'concerns', 'suggested_word_count',
                          'mandate_key', 'agent_id', 'model_id', 'generated_at', 'run_id',
                          'accepted_at', 'writing_check')
       ), '{}'::jsonb)
    || jsonb_build_object('run_id', v_run.id::text, 'accepted_at', null);
  update plan.node
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{ai_brief_draft}', v_draft)
   where id = p_node_id;
  if not found then
    raise exception 'You do not have permission to edit this plan node, so the brief was not restored.'
      using errcode = '42501';
  end if;
  return jsonb_build_object('node_id', p_node_id, 'brief', v_draft -> 'brief');
end;
$$;
-- CREATE OR REPLACE keeps the existing grants (authenticated only), so none are restated here.

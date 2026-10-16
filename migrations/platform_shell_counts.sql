-- FIRST-PAINT CONTRACT V9-V12: the header's background counts as ONE tiny read after the page settles.
-- Applied via Supabase MCP 2026-10-16 (platform_shell_counts), then replaced the same day
-- (platform_shell_counts_per_section) so ONE failing count blanks only its own section: each
-- section runs in its own BEGIN…EXCEPTION block and answers null, with the reason under
-- `errors.<section>`. SECURITY INVOKER: every table read runs under the caller's own RLS; the
-- definer doors it composes resolve the caller by auth.uid().
-- based-on: platform.shell_counts() 12ab7ae21e4178e997653264ea34e5b5d7f1dd8cd6886cc2cbb704ed39cd2319
create or replace function platform.shell_counts()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_inbox jsonb;
  v_work jsonb;
  v_assists jsonb;
  v_needs jsonb;
  v_kg jsonb;
  v_errors jsonb := '{}'::jsonb;
begin
  begin
    v_inbox := (select to_jsonb(s) from communication.my_inbox_summary() s limit 1);
    -- No summary row is a real answer (nothing to count), not a failure.
    v_inbox := coalesce(v_inbox, '{}'::jsonb);
  exception when others then
    v_inbox := null;
    v_errors := v_errors || jsonb_build_object('inbox', sqlerrm);
  end;

  begin
    v_work := coalesce((select jsonb_agg(jsonb_build_object(
                'organization_id', w.organization_id, 'organization_name', w.organization_name,
                'waiting', w.waiting, 'snoozed', w.snoozed, 'cleared', w.cleared,
                'overdue', w.overdue, 'oldest_waiting_at', w.oldest_waiting_at))
              from custom.inbox_counts(null) w), '[]'::jsonb);
  exception when others then
    v_work := null;
    v_errors := v_errors || jsonb_build_object('work', sqlerrm);
  end;

  begin
    v_assists := to_jsonb((select count(*)::int from platform.list_my_presentable_assists(200)));
  exception when others then
    v_assists := null;
    v_errors := v_errors || jsonb_build_object('assists', sqlerrm);
  end;

  begin
    v_needs := to_jsonb((select count(*)::int from media.capture_handoff h
                          where h.status in ('waiting', 'needs_drive') and h.deleted_at is null));
  exception when others then
    v_needs := null;
    v_errors := v_errors || jsonb_build_object('needs_you', sqlerrm);
  end;

  begin
    v_kg := to_jsonb((select (select count(*) from rag.scope_association_suggestions a
                               where a.deleted_at is null and a.created_by = (select auth.uid()) and a.status = 'pending')
                           + (select count(*) from rag.scope_item_value_suggestions v
                               where v.deleted_at is null and v.created_by = (select auth.uid()) and v.status = 'pending'))::int);
  exception when others then
    v_kg := null;
    v_errors := v_errors || jsonb_build_object('kg_pending', sqlerrm);
  end;

  return jsonb_build_object(
    'inbox', v_inbox,
    'work', v_work,
    'assists', v_assists,
    'needs_you', v_needs,
    'kg_pending', v_kg,
    'errors', v_errors
  );
end;
$$;

revoke all on function platform.shell_counts() from public, anon;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers, identity_argtypes, refusal_only)
values
  ('platform', 'shell_counts', '', 'first-paint-fetch-contract V9-V12',
   'Signed-in door for the shell header counts (inbox, record-store work, assists, needs-you, KG suggestions) in one read after the page settles. SECURITY INVOKER: each table read runs under the caller RLS and the composed definer doors resolve the caller by auth.uid(). Read-only; anon holds no EXECUTE.',
   'auth.uid()', false, true, '{}', false)
on conflict do nothing;

grant execute on function platform.shell_counts() to authenticated;

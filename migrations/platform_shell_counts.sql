-- FIRST-PAINT CONTRACT V9-V12: the header's background counts as ONE tiny read after the page settles.
-- Applied via Supabase MCP 2026-10-16 (platform_shell_counts). SECURITY INVOKER: every table read runs
-- under the caller's own RLS; the definer doors it composes resolve the caller by auth.uid().
create or replace function platform.shell_counts()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'inbox', (select to_jsonb(s) from communication.my_inbox_summary() s limit 1),
    'work', coalesce((select jsonb_agg(jsonb_build_object(
              'organization_id', w.organization_id, 'organization_name', w.organization_name,
              'waiting', w.waiting, 'snoozed', w.snoozed, 'cleared', w.cleared,
              'overdue', w.overdue, 'oldest_waiting_at', w.oldest_waiting_at))
            from custom.inbox_counts(null) w), '[]'::jsonb),
    'assists', (select count(*)::int from platform.list_my_presentable_assists(200)),
    'needs_you', (select count(*)::int from media.capture_handoff h
                   where h.status in ('waiting', 'needs_drive') and h.deleted_at is null),
    'kg_pending', (select (select count(*) from rag.scope_association_suggestions a
                            where a.deleted_at is null and a.created_by = (select auth.uid()) and a.status = 'pending')
                        + (select count(*) from rag.scope_item_value_suggestions v
                            where v.deleted_at is null and v.created_by = (select auth.uid()) and v.status = 'pending'))::int
  );
$$;

revoke all on function platform.shell_counts() from public, anon;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers, identity_argtypes, refusal_only)
values
  ('platform', 'shell_counts', '', 'first-paint-fetch-contract V9-V12',
   'Signed-in door for the shell header counts (inbox, record-store work, assists, needs-you, KG suggestions) in one read after the page settles. SECURITY INVOKER: each table read runs under the caller RLS and the composed definer doors resolve the caller by auth.uid(). Read-only; anon holds no EXECUTE.',
   'auth.uid()', false, true, '{}', false);

grant execute on function platform.shell_counts() to authenticated;

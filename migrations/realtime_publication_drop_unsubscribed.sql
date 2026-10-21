-- Lane C (2026-10-21): drop the 11 tables that no client subscribes to from
-- supabase_realtime. Census: `pnpm check:realtime-publication --list` (AST
-- resolver over matrx-frontend + aidream/apps/shared) plus rg over matrx-extend
-- and matrx-local found no postgres_changes binding on any of them. Every
-- published table's change is JSON-serialised by wal2json and run through
-- realtime.apply_rls on every Realtime poll, subscriber or not.
-- Re-add a table here only together with the code that subscribes to it
-- (the guard fails when a subscribed table is missing from the publication).
do $$
declare
  t text;
begin
  foreach t in array array[
    'api.html_extractions',
    'chat.agent_memory',
    'deprecated.working_documents',
    'docproc.page_extraction_runs',
    'docproc.processed_documents',
    'files.entities',
    'files.overrides',
    'interview.decision_interview',
    'workbench.presentation',
    'workbench.udt_documents',
    'workbench.udt_workbooks'
  ] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname || '.' || tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table %s', t);
    end if;
  end loop;
end;
$$;

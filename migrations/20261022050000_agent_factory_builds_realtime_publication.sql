-- 20261022050000_agent_factory_builds_realtime_publication.sql
--
-- Agent Studio rebuild, lane 3B-fix. The Agent Factory list of OLD pipeline builds (the rows of
-- `runtime.global_execution` with type = 'agent_factory_build') used to refresh on a 5 s timer while
-- any build ran. Lane 3B deleted the timer; the list now follows INSERT/UPDATE on those rows through
-- the canonical realtime channel (filter type=eq.agent_factory_build). The table was not in the
-- `supabase_realtime` publication, so that binding would reach SUBSCRIBED and deliver nothing (the
-- realtime skill's publication rule).
--
-- Same shape as 20261021220000_agent_tests_realtime_publication.sql: idempotent via
-- pg_publication_tables (ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS).
--
-- REPLICA IDENTITY stays as it is (default). The publication is whole-table (no column list, no row
-- filter) -- a column-list publication broke full-identity updates on 2026-10-10. The handler reads
-- `new` only and treats every event as a hint to re-read. RLS on the table gates delivery to the
-- platform-admin seat that can read it.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'runtime'
      and tablename = 'global_execution'
  ) then
    alter publication supabase_realtime add table runtime.global_execution;
  end if;
end $$;

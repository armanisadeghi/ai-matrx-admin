-- 20261022060000_agent_factory_builds_realtime_publication_drop.sql
-- chair-step: drops one table from the realtime publication; the delivery was lossy and the table is hot
--
-- Agent Studio rebuild, lane 3B-revert. Takes `runtime.global_execution` back OUT of the
-- `supabase_realtime` publication (added by 20261022050000_agent_factory_builds_realtime_publication.sql).
-- On production the old-build list's channel got no frame within 30 s and the table is hot (~10 000 rows
-- a day), so the publication only added WAL-decoding load. The old builds go away when the doors swap;
-- the list keeps its Refresh button and its focus/reconnect re-read, and the single-build view follows
-- its execution events stream.
--
-- Idempotent via pg_publication_tables (ALTER PUBLICATION ... DROP TABLE has no IF EXISTS).

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'runtime'
      and tablename = 'global_execution'
  ) then
    alter publication supabase_realtime drop table runtime.global_execution;
  end if;
end $$;

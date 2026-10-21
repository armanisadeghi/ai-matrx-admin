-- 20261021220000_agent_tests_realtime_publication.sql
--
-- Agent Studio rebuild, Lane 4B. The test-run page and the Studio's Cases and
-- Battle tabs stop polling and stop following a hand-made stream: counts come
-- from UPDATE on `agent.test_run` (filter id=eq.<run>) and per-result verdicts
-- from INSERT/UPDATE on `agent.test_result` (filter test_run_id=eq.<run>).
-- Neither table was in the `supabase_realtime` publication, so those bindings
-- would reach SUBSCRIBED and deliver nothing (the realtime skill's Rule 5).
--
-- Same shape as meet_realtime_publication.sql: idempotent via pg_publication_tables
-- (ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS).
--
-- REPLICA IDENTITY stays as it is (default). The publication is a whole-table one
-- (no column list, no row filter) -- a column-list publication broke full-identity
-- updates on 2026-10-10. Every handler here reads `new` only. RLS on both tables
-- gates delivery to the rows the caller may read.

do $$
declare
  t text;
begin
  foreach t in array array['test_run', 'test_result'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'agent'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table agent.%I', t);
    end if;
  end loop;
end $$;

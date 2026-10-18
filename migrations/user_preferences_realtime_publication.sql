-- user_preferences_realtime_publication.sql
--
-- Arman 2026-10-17, "Update only on change": the person's saved preferences stop being re-read every 60 s and
-- instead arrive live. `PreferencesLiveSync` (lib/redux/preferences) opens a postgres_changes binding on
-- users.user_preferences filtered to the person's own row; a table outside the `supabase_realtime`
-- publication joins, says SUBSCRIBED and delivers nothing forever (the supabase-realtime skill's publication
-- rule, Rule 5). Same shape as users.user_memory (realtime_publication_workbench_notes.sql precedent).
--
-- REPLICA IDENTITY stays DEFAULT: the binding listens to UPDATE only and reads the NEW record's `version`;
-- nothing consumes old-row data. No column list on the publication (a column list breaks updates under FULL).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'users'
      and tablename = 'user_preferences'
  ) then
    alter publication supabase_realtime add table users.user_preferences;
  end if;
end $$;

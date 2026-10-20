-- chair-step: lane ACCESS-BATCH-AGREE - adds one partial btree index on ops.app_log (created_by, created_at desc) where created_by is not null, built CONCURRENTLY so no write waits. Its only DROP is 'drop index concurrently if exists' of this same name, so a rerun rebuilds an INVALID leftover of a cancelled build. No data is touched.
-- lane: ACCESS-BATCH-AGREE
-- AUTOCOMMIT FILE: CREATE INDEX CONCURRENTLY cannot run inside a transaction; apply statement by statement.
-- Inverse: migrations/inverse/20261021270100_accessbatchagree_b_app_log_is_found_by_who_made_it_down.sql
--
-- THE DEFECT. The link picker lists an app_log kind (no title column) by what the person made, newest first:
-- `where t.id = any(granted) or t.created_by = me ... order by t.created_at desc limit 200`. ops.app_log (5.7 M rows,
-- 2.5 GB) had no index on created_by, so every search read the whole table and the 8 s limit cut it.
drop index concurrently if exists ops.app_log_created_by_created_at_idx;
create index concurrently app_log_created_by_created_at_idx
  on ops.app_log (created_by, created_at desc)
  where created_by is not null;

do $check$
begin
  if not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_index i on i.indexrelid = c.oid
                  where c.relname = 'app_log_created_by_created_at_idx' and c.relnamespace = 'ops'::regnamespace
                    and i.indisvalid and i.indisready) then
    raise exception 'accessbatchagree_b index not valid: app_log_created_by_created_at_idx - re-run the file';
  end if;
end
$check$;

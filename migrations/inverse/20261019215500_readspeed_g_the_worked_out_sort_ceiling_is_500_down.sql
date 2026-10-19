-- target: branch,production
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.computed_sort_ceiling() e20b9174a519e5074c7b523f5c5cffa39a4fa424e091ae4e55f7f17fe4757baf
-- Inverse of READ-SPEED g: the ceiling back at 1,000.

create or replace function custom.computed_sort_ceiling()
 returns integer
 language sql
 immutable parallel safe
 set search_path to 'pg_catalog'
as $function$
  -- READ-SPEED f: the most matching records a sort by a worked-out column works out (each one's value is worked out
  -- once per read). Measured 2026-10-19: ~4-8 ms a record for a roll-up or a formula over roll-ups on live.
  select 1000;
$function$;

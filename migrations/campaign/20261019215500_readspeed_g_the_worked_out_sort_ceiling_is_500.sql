-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.computed_sort_ceiling() b47fd2d85bf450b68b05d376adefabad77b1ce17f1b165226bb2324ec89f90ef
--
-- READ-SPEED g — THE WORKED-OUT SORT CEILING IS 500 MATCHING RECORDS, NOT 1,000.
-- Measured live after READ-SPEED f: working out one roll-up / formula-over-roll-up column costs ~12-19 ms a record
-- on a small table under today's load (fixed cost included). 1,000 records could pass the 8 s statement timeout
-- and end in "That took too long"; 500 keeps a sorted read inside it with room, and above it the sentence names the
-- count. Inverse: migrations/inverse/20261019215500_readspeed_g_the_worked_out_sort_ceiling_is_500_down.sql

create or replace function custom.computed_sort_ceiling()
 returns integer
 language sql
 immutable parallel safe
 set search_path to 'pg_catalog'
as $function$
  -- READ-SPEED f/g: the most matching records a sort by a worked-out column works out (each one's value is worked
  -- out once per read). Measured 2026-10-19: ~12-19 ms a record for a roll-up or a formula over roll-ups on live.
  select 500;
$function$;

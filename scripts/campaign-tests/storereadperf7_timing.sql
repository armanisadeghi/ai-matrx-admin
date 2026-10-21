-- LANE STORE-READ-PERF-7 — THE TIMING of custom.table_row_counts for one person, every organization she
-- reaches, the way `table list` asks it (one call per organization, every live Table of it). Read-only:
-- it writes nothing until the second half, where pg_current_xact_id() turns every statement memo OFF to
-- time the per-Table path in the same snapshot; it ends in ROLLBACK.
--
--   psql "$CLONE_DATABASE_URL" -X -v email=admin@admin.com -f scripts/campaign-tests/storereadperf7_timing.sql
--
-- Run it BEFORE the file is applied (the old body; both halves are then the per-Table path) and AFTER
-- (first half: one walk for the admitted Tables; second half: the per-Table path). Function-level time
-- comes from pg_stat_xact_user_functions when track_functions may be set (superuser); otherwise only the
-- wall-clock per statement (\timing) is reported.
\set ON_ERROR_STOP 1
\timing on
create temp table if not exists p7t_orgs as
  select t.organization_id as org, array_agg(t.id order by t.id) as tables
    from custom.record t
    join iam.organizations o on o.id = t.organization_id and o.archived_at is null
    join iam.organization_member m on m.organization_id = t.organization_id
    join auth.users u on u.id = m.user_id and u.email = :'email'
   where t.table_id = custom.table_kernel_id() and t.data_class = 'table' and t.deleted_at is null
   group by 1;
select count(*) as organizations, sum(cardinality(tables)) as tables from p7t_orgs;
select set_config('request.jwt.claims',
                  json_build_object('sub', (select id from auth.users where email = :'email'),
                                    'role', 'authenticated')::text, false) is not null as seated;

begin isolation level repeatable read;
set local statement_timeout = 0;
do $$ begin perform set_config('track_functions', 'all', true);
exception when others then raise notice 'track_functions not settable here: wall-clock only'; end $$;

\echo '=== memos ON (nothing written): the way table list asks'
select format('select %L as org, count(*) as tables, sum(visible_rows) as rows from custom.table_row_counts(%L, %L::uuid[]);',
              org, org, tables)
  from p7t_orgs order by cardinality(tables) desc \gexec
select clock_timestamp() as on_done;

\echo '=== function profile, memos ON'
select funcid::regprocedure as fn, calls, round(total_time::numeric, 1) as total_ms, round(self_time::numeric, 1) as self_ms
  from pg_stat_xact_user_functions order by total_time desc limit 15;

select pg_current_xact_id() is not null as memos_now_off;
\echo '=== memos OFF (the per-Table path)'
select format('select %L as org, count(*) as tables, sum(visible_rows) as rows from custom.table_row_counts(%L, %L::uuid[]);',
              org, org, tables)
  from p7t_orgs order by cardinality(tables) desc \gexec

\echo '=== function profile, cumulative (ON + OFF)'
select funcid::regprocedure as fn, calls, round(total_time::numeric, 1) as total_ms, round(self_time::numeric, 1) as self_ms
  from pg_stat_xact_user_functions order by total_time desc limit 15;
rollback;

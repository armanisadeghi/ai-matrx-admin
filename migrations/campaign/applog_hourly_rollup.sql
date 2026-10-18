-- chair-step: lane APPLOG-ROLLUP — the structured log's hourly summary (Arman approved the rollup and both schedules
-- 2026-10-17 in the tables/drill session). It CREATES one server-only table ops._app_log_hourly (row security on, no
-- client grant), its watermark ops._app_log_hourly_watermark, one server-only rebuild function
-- ops.app_log_hourly_refresh(p_from, p_to), the drill setting drill.app_log.stale_after_minutes, registers both tables
-- as System machinery (tokens app_log_hourly, app_log_hourly_watermark), and schedules two pg_cron jobs:
-- ops-app-log-hourly-recent (*/10, the last 48 hours) and ops-app-log-hourly-nightly (40 9 * * * UTC = 02:40 PT, the
-- last 35 days). A copy of the usage summary's pattern (runtime._ai_usage_hourly, drillusage_*.sql, drillledger_*.sql).
-- ops.app_log is read under ACCESS SHARE only.
-- lane: APPLOG-ROLLUP
-- lock: platform
--
-- THE GRAIN: one row per UTC hour x every Dimension of app_log.drill.ts (level, feature, route, logger_name,
-- exc_type, host_role, classified) x user_id (the mine lane and "people") x request_id ("requests"), with `lines`
-- = the log lines in it. Keeping request_id and user_id as key columns makes BOTH distinct counts exact over any
-- set of summary rows (count(distinct) of a key column), so every Measure of the definition is answered exactly
-- for complete hours. The hour column is named created_at (the hour's start, UTC) so the summary and the raw
-- table (the records behind a number) carry the same column names, as the drill door requires.

begin;

create table ops._app_log_hourly (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null,
  level        text,
  feature      text,
  route        text,
  logger_name  text,
  exc_type     text,
  host_role    text,
  classified   boolean,
  user_id      uuid,
  request_id   text,
  lines        bigint      not null,
  refreshed_at timestamptz not null default now(),
  constraint _app_log_hourly_created_at_is_an_hour check (created_at = date_trunc('hour', created_at, 'UTC'))
);
-- one row per group, ever (a double count cannot be stored), and time-led so the opening questions read the index
create unique index _app_log_hourly_group_uidx on ops._app_log_hourly
  (created_at, level, feature, route, logger_name, exc_type, host_role, classified, user_id, request_id)
  include (lines) nulls not distinct;
create index _app_log_hourly_user_created_at_idx on ops._app_log_hourly (user_id, created_at);
revoke all on ops._app_log_hourly from public, anon, authenticated;
grant select on ops._app_log_hourly to service_role;

comment on table ops._app_log_hourly is
  'APPLOG-ROLLUP: ops.app_log counted per UTC hour by level, feature, route, logger, exception kind, host role, classified, person and request — the fact of the declared drill definition app_log for hour grain and coarser (the raw table stays the records). Server-only: rebuilt by ops.app_log_hourly_refresh (pg_cron ops-app-log-hourly-recent and ops-app-log-hourly-nightly); read only through platform.drill_ask.';
comment on column ops._app_log_hourly.created_at is 'The UTC hour (its start) the log lines were written in.';
comment on column ops._app_log_hourly.lines is 'Log lines in this hour with exactly these values.';

create table ops._app_log_hourly_watermark (
  singleton    boolean     primary key default true check (singleton),
  covered_from timestamptz not null,
  covered_to   timestamptz not null,
  refreshed_at timestamptz not null default now(),
  constraint _app_log_hourly_watermark_is_a_range check (covered_from < covered_to)
);
revoke all on ops._app_log_hourly_watermark from public, anon, authenticated;
grant select on ops._app_log_hourly_watermark to service_role;
comment on table ops._app_log_hourly_watermark is
  'One row: how far ops._app_log_hourly has counted (the drill answer''s as_of). Written only by ops.app_log_hourly_refresh.';

insert into platform.entity_types (
  token, schema_name, table_name, label, base_tier, is_versioned, has_soft_delete, is_active,
  notes, is_listed, is_component, is_module, rls_variant, reference_pickable, audit_class,
  audit_class_reason, relation_kind, data_class, data_class_reason, default_list_scope,
  origin, type, type_reason, agent_writable, allow_preview, table_ref
)
values
(
  'app_log_hourly', 'ops', '_app_log_hourly', 'Structured logs by hour', 1, false, false, true,
  'Hourly summary of ops.app_log; the fact of the declared drill definition app_log.',
  false, false, false, 'system', false, 'machinery',
  'A derived summary rebuilt from ops.app_log by ops.app_log_hourly_refresh; never written by a person or a client.',
  'table', 'organization',
  'System machinery with no client lane; read only through the drill door''s definer step with each lane''s rule compiled in.',
  'organization', 'standard', 'system',
  'Lane APPLOG-ROLLUP: the structured log''s semantic-layer summary (Arman 2026-10-17).',
  false, false, 'ops._app_log_hourly'::regclass
),
(
  'app_log_hourly_watermark', 'ops', '_app_log_hourly_watermark', 'Structured logs counted through', 1, false, false, true,
  'One row: how far the hourly structured-log summary has counted (the drill answer''s as_of).',
  false, false, false, 'system', false, 'machinery',
  'Written only by ops.app_log_hourly_refresh when a rebuild reaches now; never written by a person or a client.',
  'table', 'organization',
  'System machinery with no client lane; read only by the drill door''s definer step.',
  'organization', 'standard', 'system',
  'Lane APPLOG-ROLLUP: the freshness watermark of the app_log summary.',
  false, false, 'ops._app_log_hourly_watermark'::regclass
)
on conflict (token) do nothing;

-- THE REBUILD: every hour of [p_from, p_to) re-counted from ops.app_log, idempotent (delete + insert under one lock).
create or replace function ops.app_log_hourly_refresh(p_from timestamptz, p_to timestamptz)
returns bigint
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_from  timestamptz := date_trunc('hour', p_from, 'UTC');
  v_to    timestamptz := date_trunc('hour', p_to, 'UTC') + case when p_to = date_trunc('hour', p_to, 'UTC') then interval '0' else interval '1 hour' end;
  v_reach boolean;
  v_cut   timestamptz;
  v_prev  record;
  v_n     bigint;
begin
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'app_log_hourly_refresh: the window must be a non-empty [from, to) range' using errcode = '22023';
  end if;
  -- ONE REBUILD AT A TIME: the recent job queues behind the nightly 35-day rebuild instead of double counting.
  perform pg_advisory_xact_lock(hashtextextended('ops._app_log_hourly', 0));

  -- A rebuild that reaches now makes the summary exact up to this instant and says so; it first reaches back to
  -- where the summary last counted through, so counted hours stay unbroken. One that does not reach now never
  -- counts past covered_to, so no hour holds a line the answer's as_of does not cover.
  select covered_from, covered_to into v_prev from ops._app_log_hourly_watermark where singleton;
  v_cut := clock_timestamp();
  v_reach := v_to > v_cut;
  if v_reach then
    if v_prev.covered_to is not null and v_prev.covered_to < v_from then
      v_from := date_trunc('hour', v_prev.covered_to, 'UTC');
    end if;
  else
    v_cut := least(v_to, coalesce(v_prev.covered_to, v_to));
  end if;

  delete from ops._app_log_hourly where created_at >= v_from and created_at < v_to;
  insert into ops._app_log_hourly (
    created_at, level, feature, route, logger_name, exc_type, host_role, classified, user_id, request_id, lines, refreshed_at)
  select date_trunc('hour', l.created_at, 'UTC'), l.level, l.feature, l.route, l.logger_name, l.exc_type, l.host_role,
         l.classified, l.user_id, l.request_id, count(*), now()
    from ops.app_log l
   where l.created_at >= v_from and l.created_at < v_cut
   group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10;
  get diagnostics v_n = row_count;

  if v_reach then
    insert into ops._app_log_hourly_watermark as w (singleton, covered_from, covered_to, refreshed_at)
    values (true, v_from, v_cut, clock_timestamp())
    on conflict (singleton) do update
       set covered_from = case when w.covered_to >= excluded.covered_from then least(w.covered_from, excluded.covered_from)
                               else excluded.covered_from end,
           covered_to   = excluded.covered_to,
           refreshed_at = excluded.refreshed_at;
  end if;
  return v_n;
end
$function$;
revoke all on function ops.app_log_hourly_refresh(timestamptz, timestamptz) from public, anon, authenticated;
comment on function ops.app_log_hourly_refresh(timestamptz, timestamptz) is
  'APPLOG-ROLLUP: rebuilds every UTC hour of [p_from, p_to) of ops._app_log_hourly from ops.app_log (idempotent; one rebuild at a time). Called by pg_cron ops-app-log-hourly-recent (*/10, last 48 h) and ops-app-log-hourly-nightly (09:40 UTC, last 35 days).';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, signed_in_callers, non_client_lane, anonymous_callers)
values ('ops', 'app_log_hourly_refresh', 'p_from timestamp with time zone, p_to timestamp with time zone', array['1184', '1184'],
  'Takes no entity id; rebuilds hours of the derived structured-log summary from ops.app_log.',
  'migrations/campaign/applog_hourly_rollup.sql (lane APPLOG-ROLLUP)', false,
  'server_only: called only by the pg_cron jobs ops-app-log-hourly-recent and ops-app-log-hourly-nightly; it takes no entity id and rewrites only the derived summary ops._app_log_hourly.', false)
on conflict (schema_name, function_name, identity_argtypes) do nothing;

insert into platform.feature_knob (feature, key, label, description, basis, value_type, value, default_value, min_value, max_value, unit, set_by, delegable, propagation, overridable_by, override_direction)
values ('drill.app_log', 'stale_after_minutes', 'Log summary counted-through age before the screen says the schedule is behind',
  'How old the structured-log summary''s "as of" may be before the logs explorer says, in words, that the schedule is behind. The summary is rebuilt every 10 minutes, so 20 minutes is two missed runs. Nothing is recounted silently.',
  'Arman 2026-10-17 (tables/drill session): the app_log hourly summary on a 10-minute schedule; two missed runs of slack, as drill.usage.stale_after_minutes.',
  'integer', '20'::jsonb, '20'::jsonb, 1, 1440, 'minutes', 'agent', true, 'next_load', array['organization', 'user'], 'any')
on conflict do nothing;

alter table ops._app_log_hourly_watermark enable row level security;
alter table ops._app_log_hourly enable row level security;

commit;

-- THE FILL and THE SCHEDULES (run after the commit, each its own statement):
--   select ops.app_log_hourly_refresh(now() - interval '35 days', now());
--   select cron.schedule('ops-app-log-hourly-recent', '*/10 * * * *',
--     $$SET statement_timeout = '5min'; SET lock_timeout = '2min'; SELECT ops.app_log_hourly_refresh(now() - interval '48 hours', now());$$);
--   select cron.schedule('ops-app-log-hourly-nightly', '40 9 * * *',
--     $$SET statement_timeout = '20min'; SET lock_timeout = '2min'; SELECT ops.app_log_hourly_refresh(now() - interval '35 days', now());$$);

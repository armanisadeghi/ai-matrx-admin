-- chair-step: lane DRILL-ENGINE (2026-10-18) — structured_logs' Requests exact where it can be: a per-hour total
-- ops._app_log_requests_hourly (distinct requests per UTC hour over every line, and per person for the mine lane),
-- registered as token app_log_requests_hourly (System machinery, no client grant), filled by the EXISTING rebuild
-- ops.app_log_hourly_refresh (no new schedule) and back-filled over the summary's whole range. APPLIED LIVE 2026-10-18.
-- lane: DRILL-ENGINE
-- lock: platform
-- based-on: ops.app_log_hourly_refresh(timestamp with time zone,timestamp with time zone) 13ef88634dcecc040fbb8f78f77450a8b4ed36f2b767b2ab66e273f0c90699d2

create table ops._app_log_requests_hourly (
  created_at   timestamptz not null,
  everyone     boolean     not null,
  user_id      uuid,
  requests     bigint      not null,
  refreshed_at timestamptz not null default now(),
  constraint _app_log_requests_hourly_created_at_is_an_hour check (created_at = date_trunc('hour', created_at, 'UTC')),
  constraint _app_log_requests_hourly_everyone_has_no_person check (not everyone or user_id is null)
);
create unique index _app_log_requests_hourly_uidx on ops._app_log_requests_hourly (created_at, everyone, user_id)
  include (requests) nulls not distinct;
create index _app_log_requests_hourly_user_idx on ops._app_log_requests_hourly (user_id, created_at) include (requests) where not everyone;
alter table ops._app_log_requests_hourly enable row level security;
revoke all on ops._app_log_requests_hourly from public, anon, authenticated;
grant select on ops._app_log_requests_hourly to service_role;
comment on table ops._app_log_requests_hourly is
  'DRILL-ENGINE: the distinct requests of each UTC hour of ops.app_log — over every line (everyone) and over each person''s lines — so structured_logs'' ungrouped Requests is exact to the hour (the measure''s exact.per_hour). Server-only; rebuilt by ops.app_log_hourly_refresh beside ops._app_log_hourly.';

insert into platform.entity_types (
  token, schema_name, table_name, label, base_tier, is_versioned, has_soft_delete, is_active,
  notes, is_listed, is_component, is_module, rls_variant, reference_pickable, audit_class,
  audit_class_reason, relation_kind, data_class, data_class_reason, default_list_scope,
  origin, type, type_reason, agent_writable, allow_preview, table_ref
)
values (
  'app_log_requests_hourly', 'ops', '_app_log_requests_hourly', 'Structured log requests by hour', 1, false, false, true,
  'Distinct requests per hour of ops.app_log (everyone and per person); the per-hour total behind structured_logs Requests.',
  false, false, false, 'system', false, 'machinery',
  'A derived summary rebuilt from ops.app_log by ops.app_log_hourly_refresh; never written by a person or a client.',
  'table', 'organization',
  'System machinery with no client lane; read only through the drill door''s definer step with each lane''s rule compiled in.',
  'organization', 'standard', 'system',
  'Lane DRILL-ENGINE: exact-to-the-hour Requests for the structured log (2026-10-18).',
  false, false, 'ops._app_log_requests_hourly'::regclass
)
on conflict (token) do nothing;

CREATE OR REPLACE FUNCTION ops.app_log_hourly_refresh(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET work_mem TO '256MB'
AS $function$
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
  -- requests: the distinct requests among this hour-and-group's lines (a request spanning hours or groups counts in each)
  insert into ops._app_log_hourly (
    created_at, level, feature, route, logger_name, exc_type, host_role, classified, user_id, lines, requests, refreshed_at)
  select date_trunc('hour', l.created_at, 'UTC'), l.level, l.feature, l.route, l.logger_name, l.exc_type, l.host_role,
         l.classified, l.user_id, count(*), count(distinct l.request_id), now()
    from ops.app_log l
   where l.created_at >= v_from and l.created_at < v_cut
   group by 1, 2, 3, 4, 5, 6, 7, 8, 9;
  get diagnostics v_n = row_count;
  -- (lane DRILL-ENGINE, 2026-10-18) THE PER-HOUR TOTAL: the distinct requests of each hour over every line
  -- (everyone) and over each person's lines (the mine lane), so an ungrouped Requests is exact to the hour
  delete from ops._app_log_requests_hourly where created_at >= v_from and created_at < v_to;
  insert into ops._app_log_requests_hourly (created_at, everyone, user_id, requests, refreshed_at)
  select date_trunc('hour', l.created_at, 'UTC'), grouping(l.user_id) = 1, l.user_id, count(distinct l.request_id), now()
    from ops.app_log l
   where l.created_at >= v_from and l.created_at < v_cut
   group by grouping sets ((date_trunc('hour', l.created_at, 'UTC')), (date_trunc('hour', l.created_at, 'UTC'), l.user_id));

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

-- fill: the same range the summary already covers, through the one rebuild (both tables, one lock)
select ops.app_log_hourly_refresh(w.covered_from, now()) from ops._app_log_hourly_watermark w where w.singleton;

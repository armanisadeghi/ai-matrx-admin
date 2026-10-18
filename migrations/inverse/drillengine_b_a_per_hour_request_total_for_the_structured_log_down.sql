-- chair-step: the inverse of migrations/campaign/drillengine_b_a_per_hour_request_total_for_the_structured_log.sql (lane DRILL-ENGINE) — puts the rebuild back as it was and drops the per-hour request total. No person's data is touched.
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
delete from platform.entity_types where token = 'app_log_requests_hourly';
drop table ops._app_log_requests_hourly;

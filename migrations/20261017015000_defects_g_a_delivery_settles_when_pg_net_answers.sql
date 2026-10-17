-- lock: custom
-- lane: DEFECTS
-- chair-step: replaces one live function body (custom.automation_delivery_tick), adds custom._automation_delivery_settle and one AFTER INSERT trigger on net._http_response (pg_net's own answer table), and unschedules the pg_cron job custom-automation-delivery-tick (no new schedule without the owner's approval).
-- based-on: custom.automation_delivery_tick() 900b6625edf4580237bb985217c1232c532dc43b14f2d33569d7e1b3168351d7
--
-- DEFECTS 3, follow-up - a Slack / webhook step settles the moment pg_net writes its answer, not on a schedule.
-- pg_net writes a row into net._http_response for every request, a timeout or an unreachable host included,
-- so the trigger is the whole mechanism; custom.automation_delivery_tick stays as a call for settling by hand.
-- The trigger can never fail pg_net's worker: every error is caught, recorded through ops.record_system_error,
-- and the trigger always returns.

CREATE FUNCTION custom._automation_delivery_settle(p_request_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
-- Settles ONE queued delivery: rewrites its step of the run as Sent (status code) or Failed (code, timeout or pg_net's
-- error) and fails the run on a failure; a request with no answer yet (called by hand) settles as never answered.
-- Answers false when nothing was queued under this id.
declare
  q       record;
  v_run   uuid;
  d       jsonb;
  v_steps jsonb;
  v_i     integer;
  v_ok    boolean;
  v_say   text;
  v_what  text;
begin
  select dq.*, r.id as resp_id, r.status_code, r.timed_out, r.error_msg into q
    from custom.automation_delivery dq
    left join net._http_response r on r.id = dq.request_id
   where dq.request_id = p_request_id;
  if not found then return false; end if;
  v_what := case q.kind when 'slack' then 'Slack' else coalesce(q.url_host, 'the address') end;
  v_ok := q.resp_id is not null and coalesce(q.timed_out, false) = false and q.error_msg is null
          and q.status_code between 200 and 299;
  v_say := case
    when v_ok then format('%s answered %s.', case q.kind when 'slack' then 'Sent to Slack; Slack' else 'Sent the webhook; ' || v_what end, q.status_code)
    when q.resp_id is null then format('Not delivered: %s never answered.', v_what)
    when q.timed_out then format('Not delivered: %s did not answer in time.', v_what)
    when q.error_msg is not null then format('Not delivered to %s: %s', v_what, left(q.error_msg, 200))
    else format('Not delivered: %s answered %s.', v_what, q.status_code) end;

  select x.id, x.data into v_run, d
    from custom.record x
   where x.organization_id = q.organization_id and x.data_class = 'automation_run' and x.deleted_at is null
     and x.created_at >= q.created_at - interval '1 day'
     and x.data -> 'steps' @> jsonb_build_array(jsonb_build_object('request_id', q.request_id))
   order by x.created_at desc
   limit 1
   for update;
  if v_run is not null then
    v_steps := d -> 'steps';
    select (o.n - 1)::integer into v_i from jsonb_array_elements(v_steps) with ordinality o(e, n)
     where (o.e ->> 'request_id')::bigint = q.request_id limit 1;
    v_steps := jsonb_set(v_steps, array[v_i::text],
                 (v_steps -> v_i) || jsonb_build_object('status', case when v_ok then 'done' else 'failed' end,
                   'delivery', case when v_ok then 'sent' else 'failed' end,
                   'status_code', to_jsonb(q.status_code), 'says', v_say));
    d := d || jsonb_build_object('steps', v_steps);
    if not v_ok and coalesce(d ->> 'status', '') <> 'failed' then
      d := d || jsonb_build_object('status', 'failed', 'says', format('Step %s: %s', q.step_n, v_say));
    end if;
    update custom.record set data = d where id = v_run;
  end if;
  delete from custom.automation_delivery where request_id = q.request_id;
  return true;
end
$function$;
revoke all on function custom._automation_delivery_settle(bigint) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION custom.automation_delivery_tick()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
-- Settling BY HAND (no schedule calls this any more): every queued delivery whose answer is in, or that has waited
-- 10 minutes for one. The trigger on net._http_response settles each delivery as its answer lands.
declare
  v_id bigint;
  v_n  integer := 0;
begin
  for v_id in
    select dq.request_id
      from custom.automation_delivery dq
      left join net._http_response r on r.id = dq.request_id
     where r.id is not null or dq.created_at < now() - interval '10 minutes'
     order by dq.request_id
     limit 500
  loop
    if custom._automation_delivery_settle(v_id) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end
$function$;

CREATE FUNCTION custom._automation_delivery_on_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- AFTER INSERT on net._http_response. Settles only an answer to a queued automation delivery; never fails pg_net.
begin
  begin
    if exists (select 1 from custom.automation_delivery where request_id = new.id) then
      perform custom._automation_delivery_settle(new.id);
    end if;
  exception when others then
    begin
      perform ops.record_system_error(jsonb_build_object(
        'kind', 'automation_delivery_settle_failed',
        'error_type', 'automation_delivery_settle',
        'error_text', format('An automation''s Slack / webhook answer (pg_net request %s) could not be written onto its run: %s', new.id, sqlerrm),
        'source_app', 'database',
        'source_feature', 'custom.automations',
        'route', 'custom._automation_delivery_on_response',
        'context', jsonb_build_object('request_id', new.id, 'sqlstate', sqlstate, 'status_code', new.status_code)));
    exception when others then
      raise warning 'custom._automation_delivery_on_response: request % not settled and not recorded: %', new.id, sqlerrm;
    end;
  end;
  return null;
end
$function$;
revoke all on function custom._automation_delivery_on_response() from public, anon, authenticated;

create trigger automation_delivery_settles after insert on net._http_response
  for each row execute function custom._automation_delivery_on_response();

select cron.unschedule('custom-automation-delivery-tick')
 where exists (select 1 from cron.job where jobname = 'custom-automation-delivery-tick');

-- inverse of 20261017015000_defects_g_a_delivery_settles_when_pg_net_answers.sql
-- lane: DEFECTS
-- lock: custom
drop trigger if exists automation_delivery_settles on net._http_response;
drop function if exists custom._automation_delivery_on_response();
CREATE OR REPLACE FUNCTION custom.automation_delivery_tick()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
-- Runs as its caller: pg_cron's postgres job (no client may call it). DEFECTS 3: settle every queued Slack / webhook step whose answer has arrived (or that waited 10 minutes for one).
declare
  q       record;
  v_run   uuid;
  d       jsonb;
  v_steps jsonb;
  v_i     integer;
  v_ok    boolean;
  v_say   text;
  v_what  text;
  v_n     integer := 0;
begin
  for q in
    select dq.*, r.id as resp_id, r.status_code, r.timed_out, r.error_msg
      from custom.automation_delivery dq
      left join net._http_response r on r.id = dq.request_id
     where r.id is not null or dq.created_at < now() - interval '10 minutes'
     order by dq.request_id
     limit 500
  loop
    v_what := case q.kind when 'slack' then 'Slack' else coalesce(q.url_host, 'the address') end;
    v_ok := q.resp_id is not null and coalesce(q.timed_out, false) = false and q.error_msg is null
            and q.status_code between 200 and 299;
    v_say := case
      when v_ok then format('%s answered %s.', case q.kind when 'slack' then 'Sent to Slack; Slack' else 'Sent the webhook; ' || v_what end, q.status_code)
      when q.resp_id is null then format('Not delivered: %s never answered (waited 10 minutes).', v_what)
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
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$function$

;
drop function if exists custom._automation_delivery_settle(bigint);
select cron.schedule('custom-automation-delivery-tick', '* * * * *', 'select custom.automation_delivery_tick();');

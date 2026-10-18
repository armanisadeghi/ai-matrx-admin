-- DRILL-ENGINE (2026-10-18) — the shared drill compiler, for all 19 declared definitions and custom Tables:
--   W. a window the door does not read is REFUSED in words naming the accepted shape (never answered all-time);
--   H. a window whose edges are not on the hour, asked of an hourly summary, SAYS it was counted in whole hours —
--      and the hours it names are the hours it counted (equal to the raw table over that span);
--   R. structured_logs' Requests: ungrouped = the per-hour total rollup (exact to the hour); grouped and ≤ 24 h =
--      the raw lines through the covering index (exact); grouped and longer = per hour and group, and said.
-- (migrations/campaign/drillengine_*.sql)
--
-- Plain SQL (no psql meta-commands), everything rolled back; run on live as admin@admin.com's seat:
--   psql "$DATABASE_URL" -X -f scripts/campaign-tests/drillengine_window_and_hours_red_green.sql
-- RED before the migrations (W1–W6, H1, H3, R1–R3 fail), GREEN after. The last statement lists every check.

begin isolation level repeatable read;
set local statement_timeout = '300s';
create temp table dek (n serial, name text, ok boolean, detail text) on commit drop;
grant all on dek to authenticated;
grant usage on sequence dek_n_seq to authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '87a6e699-3622-4869-8843-d0867456c0dd', 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true),
       set_config('matrx.admin_lane', 'on', true);

do $$
declare
  c_org  constant uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  c_logs constant jsonb := '{"kind":"entity","token":"structured_logs"}';
  c_tab  constant jsonb := '{"kind":"table","id":"f241b763-8e1d-4aac-afc3-7e69a8712a4f"}';
  c_torg constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  v_bad  jsonb;
  v_name text;
  v_msg  text;
  v_says text;
  v_n    numeric;
  v_raw  numeric;
  v_wf   timestamptz := date_trunc('hour', now() - interval '30 hours', 'UTC') + interval '30 minutes';
  v_wt   timestamptz := date_trunc('hour', now() - interval '30 hours', 'UTC') + interval '5 hours 30 minutes';
begin
  execute 'set local role authenticated';

  -- ── W. every window shape the door does not read is refused, in words naming {"key", "preset"} / from / to
  for v_name, v_bad in select * from (values
      ('W1 since/until',        jsonb_build_object('since', now() - interval '1 day', 'until', now())),
      ('W2 last',               '{"last":"24 hours"}'::jsonb),
      ('W3 at',                 jsonb_build_object('at', jsonb_build_object('from', now() - interval '1 day'))),
      ('W4 dimension+from/to',  jsonb_build_object('dimension', 'created_at', 'from', now() - interval '1 day', 'to', now())),
      ('W5 a string',           '"24h"'::jsonb)) t(a, b) loop
    v_msg := null;
    begin
      perform 1 from platform.drill_ask(c_org, c_logs, jsonb_build_object('lane', 'platform', 'by', '[]'::jsonb, 'window', v_bad));
    exception when others then v_msg := sqlerrm;
    end;
    insert into dek(name, ok, detail) values (v_name || ' refused naming the shape',
      v_msg is not null and v_msg like '%"key"%' and v_msg like '%preset%' and v_msg like '%from%', coalesce(v_msg, 'answered (all-time)'));
  end loop;
  -- W6 the same on a custom Table's records (drill_rows) and its count (drill_ask)
  v_msg := null;
  begin
    perform platform.drill_rows(c_torg, c_tab, jsonb_build_object('window', jsonb_build_object('since', now() - interval '1 day')));
  exception when others then v_msg := sqlerrm;
  end;
  insert into dek(name, ok, detail) values ('W6 custom Table records: unknown window key refused',
    v_msg is not null and v_msg like '%"key"%', coalesce(v_msg, 'listed (window ignored)'));
  v_msg := null;
  begin
    perform 1 from platform.drill_ask(c_torg, c_tab, jsonb_build_object('window', jsonb_build_object('last', '24 hours')));
  exception when others then v_msg := sqlerrm;
  end;
  insert into dek(name, ok, detail) values ('W7 custom Table count: unknown window key refused',
    v_msg is not null and v_msg like '%"key"%', coalesce(v_msg, 'answered (all-time)'));
  -- W8 the accepted shapes still answer
  begin
    perform 1 from platform.drill_ask(c_org, c_logs, '{"lane":"platform","by":["level"],"window":{"key":"created_at","preset":"24h"}}');
    perform 1 from platform.drill_ask(c_org, c_logs, jsonb_build_object('lane', 'platform', 'by', '["level"]'::jsonb, 'window', jsonb_build_object('from', now() - interval '1 day', 'to', now())));
    perform 1 from platform.drill_ask(c_org, '{"kind":"entity","token":"system_errors"}', '{"lane":"platform","window":{"preset":"7d"}}');
    insert into dek(name, ok) values ('W8 key+preset and from/to still answer', true);
  exception when others then insert into dek(name, ok, detail) values ('W8 key+preset and from/to still answer', false, sqlerrm);
  end;

  -- ── H. an hourly summary, a window inside the hours: said, and the hours said are the hours counted
  select says, (measures ->> 'count')::numeric into v_says, v_n
    from platform.drill_ask(c_org, c_logs, jsonb_build_object('lane', 'platform', 'show', '["count"]'::jsonb, 'window', jsonb_build_object('from', v_wf, 'to', v_wt)))
   where kind = 'total';
  select count(*) into v_raw from ops.app_log
   where created_at >= v_wf - interval '30 minutes' + interval '1 hour' and created_at < v_wt - interval '30 minutes' + interval '1 hour';
  insert into dek(name, ok, detail) values ('H1 structured_logs 00:30-05:30 says whole hours',
    coalesce(v_says, '') like '%whole hours%' and v_says like '%' || to_char((v_wf + interval '30 minutes') at time zone 'UTC', 'HH24:MI') || '%', coalesce(v_says, 'no says'));
  insert into dek(name, ok, detail) values ('H2 the hours said are the hours counted (= raw lines)', v_n = v_raw, format('drill %s, raw over the said hours %s', v_n, v_raw));
  select says into v_says from platform.drill_ask(c_org, '{"kind":"entity","token":"ai_usage"}',
      jsonb_build_object('lane', 'platform', 'window', jsonb_build_object('from', v_wf, 'to', v_wt))) where kind = 'total';
  insert into dek(name, ok, detail) values ('H3 ai_usage summary says whole hours too', coalesce(v_says, '') like '%whole hours%', coalesce(v_says, 'no says'));
  select says into v_says from platform.drill_ask(c_org, c_logs,
      jsonb_build_object('lane', 'platform', 'window', jsonb_build_object('from', v_wf - interval '30 minutes', 'to', v_wt - interval '30 minutes'))) where kind = 'total';
  insert into dek(name, ok, detail) values ('H4 edges on the hour say nothing of hours', coalesce(v_says, '') not like '%whole hours%', coalesce(v_says, 'no says'));
  select says into v_says from platform.drill_ask(c_org, '{"kind":"entity","token":"system_errors"}',
      jsonb_build_object('lane', 'platform', 'window', jsonb_build_object('from', v_wf, 'to', v_wt))) where kind = 'total';
  insert into dek(name, ok, detail) values ('H5 a raw (not summary) definition says nothing of hours', coalesce(v_says, '') not like '%whole hours%', coalesce(v_says, 'no says'));

  -- ── R. structured_logs' Requests: exact where it can be, said where it cannot
  declare
    c_me  constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
    v_hto timestamptz := date_trunc('hour', now() - interval '1 hour', 'UTC');
    v_hfr timestamptz := date_trunc('hour', now() - interval '1 hour', 'UTC') - interval '7 days';
    v_rf  timestamptz := now() - interval '6 hours';
    v_rt  timestamptz := now();
    v_bad int;
  begin
    -- R1 ungrouped, 7 days of whole hours, platform: = the sum over hours of each hour's distinct requests
    select (measures ->> 'requests')::numeric, says into v_n, v_says from platform.drill_ask(c_org, c_logs,
        jsonb_build_object('lane', 'platform', 'by', '[]'::jsonb, 'show', '["count","requests"]'::jsonb, 'window', jsonb_build_object('from', v_hfr, 'to', v_hto)))
     where kind = 'total';
    select coalesce(sum(c), 0) into v_raw from (select count(distinct request_id) c from ops.app_log
      where created_at >= v_hfr and created_at < v_hto group by date_trunc('hour', created_at, 'UTC')) h;
    insert into dek(name, ok, detail) values ('R1 ungrouped Requests (7 d, platform) exact to the hour', v_n = v_raw, format('drill %s, raw per-hour %s; says %s', v_n, v_raw, coalesce(v_says, '-')));
    -- R2 the mine lane, the same
    perform set_config('matrx.admin_lane', 'off', true);   -- inside the admin apps an admin never counts as herself
    select (measures ->> 'requests')::numeric into v_n from platform.drill_ask(c_org, c_logs,
        jsonb_build_object('lane', 'mine', 'by', '[]'::jsonb, 'show', '["requests"]'::jsonb, 'window', jsonb_build_object('from', v_hfr, 'to', v_hto)))
     where kind = 'total';
    select coalesce(sum(c), 0) into v_raw from (select count(distinct request_id) c from ops.app_log
      where user_id = c_me and created_at >= v_hfr and created_at < v_hto group by date_trunc('hour', created_at, 'UTC')) h;
    perform set_config('matrx.admin_lane', 'on', true);
    insert into dek(name, ok, detail) values ('R2 ungrouped Requests (7 d, mine) exact to the hour', v_n = v_raw, format('drill %s, raw per-hour %s', v_n, v_raw));
    -- R3 grouped by level, 6 hours: every group's Requests and Log lines = the raw distinct count
    select count(*) into v_bad from (select * from platform.drill_ask(c_org, c_logs,
        jsonb_build_object('lane', 'platform', 'by', '["level"]'::jsonb, 'show', '["count","requests"]'::jsonb, 'window', jsonb_build_object('from', v_rf, 'to', v_rt)))
        where kind = 'group') a
      full join (select level, count(*) n, count(distinct request_id) r from ops.app_log where created_at >= v_rf and created_at < v_rt group by level) b
        on coalesce(b.level, '') = coalesce(a.groups ->> 'level', '')
     where (a.measures ->> 'requests')::numeric is distinct from b.r or (a.measures ->> 'count')::numeric is distinct from b.n;
    select (measures ->> 'requests')::numeric into v_n from platform.drill_ask(c_org, c_logs,
        jsonb_build_object('lane', 'platform', 'by', '["level"]'::jsonb, 'show', '["requests"]'::jsonb, 'window', jsonb_build_object('from', v_rf, 'to', v_rt)))
     where kind = 'total';
    select count(distinct request_id) into v_raw from ops.app_log where created_at >= v_rf and created_at < v_rt;
    insert into dek(name, ok, detail) values ('R3 grouped Requests (6 h) exact per group and total', v_bad = 0 and v_n = v_raw, format('%s mismatched groups; total drill %s raw %s', v_bad, v_n, v_raw));
    -- R4 grouped over 7 days: not exact, and said
    select says into v_says from platform.drill_ask(c_org, c_logs,
        jsonb_build_object('lane', 'platform', 'by', '["level"]'::jsonb, 'show', '["requests"]'::jsonb, 'window', '{"preset":"7d"}'::jsonb))
     where kind = 'total';
    insert into dek(name, ok, detail) values ('R4 grouped Requests (7 d) says not exact', coalesce(v_says, '') like '%not exact%', coalesce(v_says, 'no says'));
  end;
end $$;

select n, name, ok, detail from dek order by n;
select count(*) filter (where not ok) as failing, count(*) as checks from dek;
rollback;

-- AT-AUTO2 (2026-10-15) — Airtable automations v2 on the live store, proven in ONE rolled-back transaction.
-- THE USE CASE. Rosa runs a wholesale bakery supply. Her shop posts each new order to an inbound webhook. She wants:
--   * the webhook to create the order                                   (webhook trigger, add_row with tokens)
--   * the customer found by email                                         (find → {{step1.first.tier}})
--   * VIP customers announced in Slack, everyone else thanked by email   (if / else)
--   * one Order Lines row per line item                                  (for_each over {{trigger.body.lines}})
--   * a script to work out the discount, written back on the order       (script waits → server → resume → update)
--   * a bad payload to fail loudly and tell her                           (failed-run notice)
--   * every save kept as a version she can restore                        (revisions)
--   * a "every 15 minutes" schedule saved switched off                    (no blind paid automations)
-- RED before atauto2_a: part 1 fails ("webhook" is not a trigger). GREEN after it.
-- Run: uv run python <q.py> this-file (owner connection; the caller wraps it and ROLLS BACK).
do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_home uuid; t_cust uuid; t_ord uuid; t_line uuid;
  f_cname uuid; f_cemail uuid; f_tier uuid; f_ocust uuid; f_total uuid; f_status uuid; f_disc uuid;
  f_lorder uuid; f_lsku uuid; f_lqty uuid; f_lprice uuid;
  v_res jsonb; a_hook uuid; v_secret text; v_run uuid; v_row jsonb; v_claim jsonb; v_order uuid; v_n integer;
  a_bad uuid; a_sched uuid; v_revs jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/atauto2', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Rosa Wholesale ' || substr(v_org::text, 1, 8), 'rosa-wholesale-' || substr(v_org::text, 1, 8), 'RW', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'atauto2 fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;

  t_cust := custom.table_declare(v_org, jsonb_build_object('name', 'Customers', 'slug', 'customers', 'type', 'entity',
    'label_singular', 'Customer', 'label_plural', 'Customers', 'title_field', 'name', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted', 'agent_writable', true, 'retention_days', 3650,
    'default_sort', jsonb_build_array(jsonb_build_object('field', 'name', 'direction', 'asc')), 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'name'))));
  f_cname  := custom.field_declare(v_org, t_cust, jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'sort', 10));
  f_cemail := custom.field_declare(v_org, t_cust, jsonb_build_object('key', 'email', 'label', 'Email', 'type', 'text', 'sort', 20));
  f_tier   := custom.field_declare(v_org, t_cust, jsonb_build_object('key', 'tier', 'label', 'Tier', 'type', 'select', 'sort', 30,
                'options', jsonb_build_array('VIP', 'Standard')));
  t_ord := custom.table_declare(v_org, jsonb_build_object('name', 'Wholesale Orders', 'slug', 'wholesale_orders', 'type', 'entity',
    'label_singular', 'Order', 'label_plural', 'Orders', 'title_field', 'customer', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted', 'agent_writable', true, 'retention_days', 3650,
    'default_sort', jsonb_build_array(jsonb_build_object('field', 'customer', 'direction', 'asc')), 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'customer'))));
  f_ocust  := custom.field_declare(v_org, t_ord, jsonb_build_object('key', 'customer', 'label', 'Customer', 'type', 'text', 'sort', 10));
  f_total  := custom.field_declare(v_org, t_ord, jsonb_build_object('key', 'total', 'label', 'Total', 'type', 'number', 'sort', 20));
  f_status := custom.field_declare(v_org, t_ord, jsonb_build_object('key', 'status', 'label', 'Status', 'type', 'text', 'sort', 30));
  f_disc   := custom.field_declare(v_org, t_ord, jsonb_build_object('key', 'discount', 'label', 'Discount', 'type', 'number', 'sort', 40));
  t_line := custom.table_declare(v_org, jsonb_build_object('name', 'Order Lines', 'slug', 'order_lines', 'type', 'entity',
    'label_singular', 'Line', 'label_plural', 'Lines', 'title_field', 'sku', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted', 'agent_writable', true, 'retention_days', 3650,
    'default_sort', jsonb_build_array(jsonb_build_object('field', 'sku', 'direction', 'asc')), 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'sku'))));
  f_lorder := custom.field_declare(v_org, t_line, jsonb_build_object('key', 'order_ref', 'label', 'Order', 'type', 'text', 'sort', 10));
  f_lsku   := custom.field_declare(v_org, t_line, jsonb_build_object('key', 'sku', 'label', 'SKU', 'type', 'text', 'sort', 20));
  f_lqty   := custom.field_declare(v_org, t_line, jsonb_build_object('key', 'qty', 'label', 'Qty', 'type', 'number', 'sort', 30));
  f_lprice := custom.field_declare(v_org, t_line, jsonb_build_object('key', 'price', 'label', 'Price', 'type', 'number', 'sort', 40));

  perform set_config('role', 'authenticated', true);
  perform custom.record_write(v_org, t_cust, jsonb_build_object('name', 'Hearth & Crumb', 'email', 'buyer@hearthcrumb.test', 'tier', 'VIP'));
  perform custom.record_write(v_org, t_cust, jsonb_build_object('name', 'Corner Deli', 'email', 'orders@cornerdeli.test', 'tier', 'Standard'));

  -- ══ 1 — THE WHOLESALE PIPELINE IS ACCEPTED (webhook trigger, find, add_row with tokens, if/else, for_each, script, update)
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'New wholesale order',
    'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(
      jsonb_build_object('do', 'find', 'table_id', t_cust, 'limit', 1,
        'where', jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', f_cemail),
                   jsonb_build_object('const', '{{trigger.body.customer_email}}')))),
      jsonb_build_object('do', 'add_row', 'table_id', t_ord, 'values', jsonb_build_object(
        f_ocust, '{{trigger.body.customer_email}}', f_total, '{{trigger.body.total}}', f_status, 'New')),
      jsonb_build_object('do', 'if', 'branches', jsonb_build_array(jsonb_build_object('label', 'VIP',
          'when', jsonb_build_object('all', jsonb_build_array(jsonb_build_object('value', '{{step1.first.tier}}', 'is', 'equals', 'to', 'VIP'))),
          'actions', jsonb_build_array(jsonb_build_object('do', 'slack', 'url', 'https://hooks.slack.com/services/T000/B000/atauto2',
            'text', 'VIP order from {{step1.first.name}}: {{trigger.body.total}}')))),
        'else', jsonb_build_array(jsonb_build_object('do', 'email', 'to', jsonb_build_object('address', '{{trigger.body.customer_email}}'),
            'subject', 'Thanks for your order', 'body', 'We received your order of {{trigger.body.total}}.'))),
      jsonb_build_object('do', 'for_each', 'list', '{{trigger.body.lines}}', 'actions', jsonb_build_array(
        jsonb_build_object('do', 'add_row', 'table_id', t_line, 'values', jsonb_build_object(
          f_lorder, '{{step2.record_id}}', f_lsku, '{{item.sku}}', f_lqty, '{{item.qty}}', f_lprice, '{{item.price}}')))),
      jsonb_build_object('do', 'script', 'inputs', jsonb_build_object('lines', '{{trigger.body.lines}}', 'tier', '{{step1.first.tier}}'),
        'code', 'const t = input.lines.reduce((s, l) => s + l.qty * l.price, 0); output.set("discount", String(input.tier).toLowerCase() === "vip" ? 10 : (t > 500 ? 5 : 0));'),
      jsonb_build_object('do', 'update', 'table_id', t_ord, 'record', '{{step2.record_id}}',
        'values', jsonb_build_object(f_disc, '{{step8.output.discount}}')))));
  if not coalesce((v_res ->> 'ok')::boolean, false) then raise exception '1a: the pipeline was refused: %', v_res; end if;
  a_hook := (v_res ->> 'automation_id')::uuid;
  if coalesce((v_res ->> 'enabled')::boolean, true) is distinct from true then raise exception '1b: a webhook pipeline with a script on no time was saved off: %', v_res; end if;
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Bad set', 'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(jsonb_build_object('do', 'set', 'values', jsonb_build_object(f_status, 'x')))));
  if coalesce((v_res ->> 'ok')::boolean, false) or v_res -> '_errors' ->> 'actions.0' not like '%no triggering row%' then
    raise exception '1d: "set" on a webhook was stored: %', v_res; end if;
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Bad branch', 'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(jsonb_build_object('do', 'if', 'branches', jsonb_build_array(jsonb_build_object('when', jsonb_build_object('all', jsonb_build_array(jsonb_build_object('value', 'a', 'is', 'resembles'))), 'actions', '[]'::jsonb))))));
  if coalesce((v_res ->> 'ok')::boolean, false) or v_res -> '_errors' -> 'actions.0.branches.0.when' is null then
    raise exception '1e: a branch with an unknown comparison was stored: %', v_res; end if;

  -- ══ 2 — THE WEBHOOK RUNS IT (as the backend), VIP PATH, LINES, AND THE RUN WAITS AT THE SCRIPT
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select x ->> 'webhook_secret' into v_secret from custom.record t, jsonb_array_elements(t.data -> 'automations') x
   where t.id = t_ord and x ->> 'id' = a_hook::text;
  if coalesce(length(v_secret), 0) < 64 then raise exception '1c: no webhook secret was made: %', v_secret; end if;
  v_res := custom.automation_webhook_receive(a_hook, 'wrong-secret', '{}'::jsonb);
  if (v_res ->> 'http')::integer <> 404 then raise exception '2a: a wrong secret was not refused like an unknown hook: %', v_res; end if;
  v_res := custom.automation_webhook_receive(a_hook, v_secret, jsonb_build_object('customer_email', 'buyer@hearthcrumb.test', 'total', 640,
             'lines', jsonb_build_array(jsonb_build_object('sku', 'RYE-10', 'qty', 20, 'price', 12),
                                        jsonb_build_object('sku', 'SOUR-5', 'qty', 40, 'price', 10))));
  if (v_res ->> 'http')::integer <> 200 or v_res ->> 'status' <> 'waiting' then raise exception '2b: the webhook run did not reach the script: %', v_res; end if;
  v_run := (v_res ->> 'run_id')::uuid;
  select data into v_row from custom.record where id = v_run;
  if v_row -> 'pending' ->> 'do' <> 'script' or (v_row -> 'pending' ->> 'n')::integer <> 8 then raise exception '2c: pending is not step 8 script: %', v_row -> 'pending'; end if;
  if v_row -> 'pending' -> 'act' -> 'inputs' -> 'lines' -> 1 ->> 'sku' <> 'SOUR-5' or v_row -> 'pending' -> 'act' -> 'inputs' ->> 'tier' not in ('VIP', 'vip') then
    raise exception '2d: the script inputs were not resolved: %', v_row -> 'pending' -> 'act' -> 'inputs'; end if;
  if not exists (select 1 from jsonb_array_elements(v_row -> 'steps') e where e ->> 'do' = 'slack' and e ->> 'status' = 'done')
     or exists (select 1 from jsonb_array_elements(v_row -> 'steps') e where e ->> 'do' = 'email') then
    raise exception '2e: the VIP path was not the one taken: %', v_row -> 'steps'; end if;
  select count(*) into v_n from custom.record r where r.organization_id = v_org and r.table_id = t_line and r.deleted_at is null;
  if v_n <> 2 then raise exception '2f: % order lines, expected 2', v_n; end if;
  select r.id into v_order from custom.record r where r.organization_id = v_org and r.table_id = t_ord and r.data ->> 'customer' = 'buyer@hearthcrumb.test';
  if v_order is null or (select count(*) from custom.record r where r.table_id = t_line and r.data ->> 'order_ref' = v_order::text) <> 2 then
    raise exception '2g: the lines do not carry the new order id %', v_order; end if;

  -- ══ 3 — THE SERVER CLAIMS THE SCRIPT, ANSWERS, THE RUN CARRIES ON FROM STEP 9
  v_claim := custom.automation_claim_pending('atauto2-proof', 50, 120);
  if not exists (select 1 from jsonb_array_elements(v_claim) e where e ->> 'run_id' = v_run::text) then raise exception '3a: the run was not claimed: %', v_claim; end if;
  v_res := custom.automation_resume(v_run, jsonb_build_object('discount', 10), null, '["total 640"]'::jsonb);
  if v_res ->> 'status' <> 'ran' then raise exception '3b: the run did not finish after the script: %', v_res; end if;
  if (select (r.data ->> 'discount')::numeric from custom.record r where r.id = v_order) is distinct from 10 then
    raise exception '3c: step 9 did not write the script''s discount: %', (select data from custom.record where id = v_order); end if;
  select data into v_row from custom.record where id = v_run;
  if v_row ? 'state' or v_row ? 'pending' or not exists (select 1 from jsonb_array_elements(v_row -> 'steps') e
       where e ->> 'do' = 'script' and e ->> 'status' = 'done' and e -> 'logs' ->> 0 = 'total 640') then
    raise exception '3d: the finished run kept its state or lost the script log: %', v_row; end if;

  -- ══ 4 — THE STANDARD PATH SENDS THE EMAIL INSTEAD
  v_res := custom.automation_webhook_receive(a_hook, v_secret, jsonb_build_object('customer_email', 'orders@cornerdeli.test', 'total', 90,
             'lines', jsonb_build_array(jsonb_build_object('sku', 'BAG-1', 'qty', 3, 'price', 30))));
  select data into v_row from custom.record where id = (v_res ->> 'run_id')::uuid;
  if not exists (select 1 from jsonb_array_elements(v_row -> 'steps') e where e ->> 'do' = 'if' and e ->> 'says' like '%otherwise%')
     or exists (select 1 from jsonb_array_elements(v_row -> 'steps') e where e ->> 'do' = 'slack') then
    raise exception '4a: the else path was not taken: %', v_row -> 'steps'; end if;

  -- ══ 5 — A BAD PAYLOAD FAILS AND TELLS THE OWNER, OPENING THE RUN
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Lines only', 'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(jsonb_build_object('do', 'for_each', 'list', '{{trigger.body.lines}}', 'actions', jsonb_build_array(
        jsonb_build_object('do', 'archive', 'record', '{{item.id}}'))))));
  a_bad := (v_res ->> 'automation_id')::uuid;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select x ->> 'webhook_secret' into v_secret from custom.record t, jsonb_array_elements(t.data -> 'automations') x
   where t.id = t_ord and x ->> 'id' = a_bad::text;
  v_res := custom.automation_webhook_receive(a_bad, v_secret, jsonb_build_object('lines', 'not a list'));
  if v_res ->> 'status' <> 'failed' then raise exception '5a: a non-list did not fail the run: %', v_res; end if;
  if not exists (select 1 from communication.notification n where n.dedupe_key = 'automation-failed:' || (v_res ->> 'run_id') || ':in_app'
                   and n.deep_link like '%run=' || (v_res ->> 'run_id') || '%') then
    raise exception '5b: the owner was not told, opening the run'; end if;

  -- ══ 6 — VERSIONS, AND RESTORING ONE
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Lines only (renamed)', 'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(jsonb_build_object('do', 'archive', 'record', '{{trigger.body.id}}'))), a_bad);
  v_revs := custom.automation_revisions(v_org, a_bad) -> 'revisions';
  if jsonb_array_length(v_revs) <> 2 or v_revs -> 0 -> 'spec' ->> 'name' <> 'Lines only (renamed)' then raise exception '6a: versions: %', v_revs; end if;
  v_res := custom.automation_revision_restore(v_org, a_bad, (v_revs -> 1 ->> 'revision_id')::uuid);
  if v_res -> 'spec' ->> 'name' <> 'Lines only' or jsonb_array_length(custom.automation_revisions(v_org, a_bad) -> 'revisions') <> 3 then
    raise exception '6b: restore did not bring the first version back as a new save: %', v_res; end if;

  -- ══ 7 — EVERY 15 MINUTES IS SAVED SWITCHED OFF; THE CLOCK RUNS IT ONCE PER SLOT WHEN ON
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Quarter-hourly stock check',
    'trigger', jsonb_build_object('on', 'schedule', 'every', 'minutes', 'minutes', 15),
    'actions', jsonb_build_array(jsonb_build_object('do', 'add_row', 'table_id', t_line, 'values', jsonb_build_object(f_lsku, 'CHECK')))));
  if not coalesce((v_res ->> 'ok')::boolean, false) or coalesce((v_res ->> 'enabled')::boolean, true) then raise exception '7a: not saved off: %', v_res; end if;
  a_sched := (v_res ->> 'automation_id')::uuid;
  perform custom.automation_set_enabled(v_org, a_sched, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  update custom.record set data = jsonb_set(data, '{automations}', (select jsonb_agg(case when x ->> 'id' = a_sched::text
           then x || jsonb_build_object('updated_at', now() - interval '1 hour', 'created_at', now() - interval '1 hour') else x end)
           from jsonb_array_elements(data -> 'automations') x)) where id = t_ord;
  v_n := custom._automation_time_item(v_org, t_ord, (select x from custom.record t, jsonb_array_elements(t.data -> 'automations') x
           where t.id = t_ord and x ->> 'id' = a_sched::text), now());
  v_n := v_n + custom._automation_time_item(v_org, t_ord, (select x from custom.record t, jsonb_array_elements(t.data -> 'automations') x
           where t.id = t_ord and x ->> 'id' = a_sched::text), now());
  if v_n <> 1 then raise exception '7b: the 15-minute slot ran % times, expected once', v_n; end if;

  raise notice 'ATAUTO2 GREEN: webhook pipeline (find, if/else, for_each, script wait/resume, update), failed-run notice, versions, 15-minute schedule';
end
$t$;

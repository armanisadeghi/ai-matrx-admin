-- AT-AUTO3 (2026-10-15) — find reads choice LABELS; the server runs an agent (mandate), an email and a text. ONE rolled-back transaction.
-- THE USE CASE. Rosa's shop posts an order. She finds the customer by email, has an agent write a thank-you using the
-- customer's name, and records it on the order. The customer's Tier is a choice: a later step must read "VIP", not a key.
-- RED before atauto3_a: part 1 reads the stored key, part 2 refuses "run_mandate". GREEN after it.
-- Run: python3 q.py this-file   (owner connection, rolls back)
-- ORG-CLEANUP (2026-10-18): the suite only asserts, so it builds inside one transaction and leaves nothing.
begin;
do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_home uuid; t_cust uuid; t_ord uuid;
  f_cname uuid; f_cemail uuid; f_tier uuid; f_ocust uuid; f_status uuid;
  f_btn uuid; a_btn uuid; v_rec uuid; v_res jsonb; a_hook uuid; a_two uuid; v_secret text; v_run uuid; v_row jsonb; v_vals jsonb; v_claim jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/atauto3', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Rosa Wholesale ' || substr(v_org::text, 1, 8), 'rosa-wholesale-' || substr(v_org::text, 1, 8), 'RW', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'atauto3 fixture');
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
  f_status := custom.field_declare(v_org, t_ord, jsonb_build_object('key', 'status', 'label', 'Status', 'type', 'text', 'sort', 30));
  perform set_config('role', 'authenticated', true);
  perform custom.record_write(v_org, t_cust, jsonb_build_object('name', 'Hearth & Crumb', 'email', 'buyer@hearthcrumb.test', 'tier', 'VIP'));

  -- ══ 1 — A FIND ANSWERS THE LABEL: the order's Status is written from {{step1.first.tier}} and must read VIP.
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Tier onto order',
    'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(
      jsonb_build_object('do', 'find', 'table_id', t_cust, 'limit', 1,
        'where', jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', f_cemail), jsonb_build_object('const', '{{trigger.body.email}}')))),
      jsonb_build_object('do', 'add_row', 'table_id', t_ord, 'values', jsonb_build_object(f_ocust, '{{step1.first.name}}', f_status, '{{step1.first.tier}}')))));
  if not coalesce((v_res ->> 'ok')::boolean, false) then raise exception '1a: refused: %', v_res; end if;
  a_hook := (v_res ->> 'automation_id')::uuid;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select x ->> 'webhook_secret' into v_secret from custom.record t, jsonb_array_elements(t.data -> 'automations') x where t.id = t_ord and x ->> 'id' = a_hook::text;
  v_res := custom.automation_webhook_receive(a_hook, v_secret, jsonb_build_object('email', 'buyer@hearthcrumb.test'));
  if v_res ->> 'status' <> 'ran' then raise exception '1b: the run did not finish: %', v_res; end if;
  select custom.record_values(v_org, r.id) into v_vals from custom.record r where r.table_id = t_ord and r.data_class = 'record' and r.deleted_at is null order by r.created_at desc limit 1;
  if v_vals ->> 'status' is distinct from 'VIP' then raise exception '1c: a later step read % instead of the label VIP', v_vals ->> 'status'; end if;

  -- ══ 2 — AN AGENT, AN EMAIL AND A TEXT ARE SERVER STEPS: accepted, the run waits, the answer is a token for the next step.
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Thank the buyer',
    'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(
      jsonb_build_object('do', 'find', 'table_id', t_cust, 'limit', 1,
        'where', jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', f_cemail), jsonb_build_object('const', '{{trigger.body.email}}')))),
      jsonb_build_object('do', 'run_mandate', 'mandate_key', 'marketing.thank_you_note', 'variables', jsonb_build_object('customer_name', '{{step1.first.name}}')),
      jsonb_build_object('do', 'gmail', 'to', '{{trigger.body.email}}', 'subject', 'Thank you', 'body', '{{step2.output.text}}'),
      jsonb_build_object('do', 'sms', 'to', '{{trigger.body.phone}}', 'message', '{{step2.output.text}}'),
      jsonb_build_object('do', 'add_row', 'table_id', t_ord, 'values', jsonb_build_object(f_ocust, '{{step1.first.name}}', f_status, '{{step2.output.text}}')))));
  if not coalesce((v_res ->> 'ok')::boolean, false) then raise exception '2a: refused: %', v_res; end if;
  a_two := (v_res ->> 'automation_id')::uuid;
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Bad mail', 'trigger', jsonb_build_object('on', 'webhook'),
    'actions', jsonb_build_array(jsonb_build_object('do', 'gmail', 'subject', 'x', 'body', 'y'))));
  if coalesce((v_res ->> 'ok')::boolean, false) then raise exception '2b: an email with no recipient was stored'; end if;
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Nightly text', 'trigger', jsonb_build_object('on', 'schedule', 'every', 'day', 'at', '09:00'),
    'actions', jsonb_build_array(jsonb_build_object('do', 'sms', 'to', '+15555550100', 'message', 'hi'))));
  if coalesce((v_res ->> 'enabled')::boolean, true) is not false then raise exception '2c: a text on a schedule was saved on: %', v_res; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select x ->> 'webhook_secret' into v_secret from custom.record t, jsonb_array_elements(t.data -> 'automations') x where t.id = t_ord and x ->> 'id' = a_two::text;
  v_res := custom.automation_webhook_receive(a_two, v_secret, jsonb_build_object('email', 'buyer@hearthcrumb.test', 'phone', '+15555550100'));
  if v_res ->> 'status' <> 'waiting' then raise exception '2d: the run did not wait for the agent: %', v_res; end if;
  v_run := (v_res ->> 'run_id')::uuid;
  v_claim := custom.automation_claim_pending('atauto3-test', 5, 60);
  select e into v_row from jsonb_array_elements(v_claim) e where e ->> 'run_id' = v_run::text;
  if v_row -> 'pending' ->> 'do' <> 'run_mandate' or v_row -> 'pending' -> 'act' -> 'variables' ->> 'customer_name' <> 'Hearth & Crumb' then
    raise exception '2e: the claim did not carry the agent step with its variable filled from step 1: %', v_row; end if;
  v_res := custom.automation_resume(v_run, jsonb_build_object('text', 'Dear Hearth & Crumb, thank you.'), null, '[]'::jsonb);
  if v_res ->> 'status' <> 'waiting' then raise exception '2f: after the agent the run should wait at the email: %', v_res; end if;
  v_claim := custom.automation_claim_pending('atauto3-test', 5, 60);
  select e into v_row from jsonb_array_elements(v_claim) e where e ->> 'run_id' = v_run::text;
  if v_row -> 'pending' ->> 'do' <> 'gmail' or v_row -> 'pending' -> 'act' ->> 'body' <> 'Dear Hearth & Crumb, thank you.' then
    raise exception '2g: the email did not read the agent''s answer as a token: %', v_row; end if;
  v_res := custom.automation_resume(v_run, jsonb_build_object('sent', true), null, '[]'::jsonb);
  v_claim := custom.automation_claim_pending('atauto3-test', 5, 60);
  select e into v_row from jsonb_array_elements(v_claim) e where e ->> 'run_id' = v_run::text;
  if v_row -> 'pending' ->> 'do' <> 'sms' then raise exception '2h: expected the text step: %', v_row; end if;
  v_res := custom.automation_resume(v_run, jsonb_build_object('sent', true), null, '[]'::jsonb);
  if v_res ->> 'status' <> 'ran' then raise exception '2i: the run did not finish: %', v_res; end if;
  if not exists (select 1 from custom.record r where r.table_id = t_ord and r.data_class = 'record' and r.deleted_at is null
                  and custom.record_values(v_org, r.id) ->> 'status' = 'Dear Hearth & Crumb, thank you.') then
    raise exception '2j: no order got the agent answer'; end if;
  -- ══ 3 — A BUTTON RUNS A SCRIPT DIRECTLY: pressing "Work out discount" on a row starts the script automation, which waits for the server.
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);
  f_btn := custom.field_declare(v_org, t_ord, jsonb_build_object('key', 'discount_btn', 'label', 'Work out discount', 'type', 'button', 'sort', 50));
  perform custom.field_update(v_org, f_btn, jsonb_build_object('button', jsonb_build_object('label', 'Work out discount')));
  v_res := custom.automation_declare(v_org, t_ord, jsonb_build_object('name', 'Discount script', 'trigger', jsonb_build_object('on', 'button_pressed', 'field', f_btn),
    'actions', jsonb_build_array(jsonb_build_object('do', 'script', 'inputs', jsonb_build_object('status', '{{trigger.status}}'),
      'code', 'output.set("discount", 10);'))));
  if not coalesce((v_res ->> 'ok')::boolean, false) then raise exception '3a: refused: %', v_res; end if;
  execute 'reset role';
  select r.id into v_rec from custom.record r where r.table_id = t_ord and r.data_class = 'record' and r.deleted_at is null limit 1;
  perform set_config('role', 'authenticated', true);
  v_res := custom.button_press(v_org, v_rec, f_btn);
  if v_res ->> 'status' <> 'waiting' then raise exception '3b: the press did not start the script: %', v_res; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  v_claim := custom.automation_claim_pending('atauto3-test', 5, 60);
  select e into v_row from jsonb_array_elements(v_claim) e where e ->> 'run_id' = v_res ->> 'run_id';
  if v_row -> 'pending' ->> 'do' <> 'script' then raise exception '3c: the server did not get the script from the button: %', v_row; end if;
  raise notice 'ATAUTO3 GREEN';
end
$t$;
rollback;

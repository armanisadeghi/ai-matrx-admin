-- LANE CLOSE-AGENT — CD-AGENT-12 (VISION §4.6): an AI column a person sets to refill on its own is woken by the store's
-- own 5-minute tick once a day, and nothing else is. RED before 20261021180000_closeagent_b (the declare drops
-- auto_refill and custom.enrich_refill_due_tick does not exist), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: the "address" column of admin@admin.com's disposable table "CL Clients 9ta" (lane CLOSE-LINK), walk organization.
do $t$
declare
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_field constant uuid := '99b8e5fb-1b38-4352-a90c-05e42d2accfe';
  v jsonb; v_msg text; v_cfg jsonb; v_tick jsonb;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('app.actor_tier', 'user', true);

  -- 1. Without a number of days, refilling on its own is refused in a sentence.
  v_msg := null;
  begin
    perform custom.enrich_declare(c_org, c_field, '{"instruction":"Write the city this client is in, from their name.","inputs":["name"],"enabled":true,"auto_refill":true}');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null or v_msg not like 'A column refills on its own only when%' then raise exception '1: wrong answer: %', v_msg; end if;

  -- 2. An agent cannot turn it on.
  perform set_config('app.actor_tier', 'agent', true);
  v_msg := null;
  begin
    perform custom.enrich_declare(c_org, c_field, '{"instruction":"Write the city this client is in, from their name.","inputs":["name"],"enabled":true,"review_interval_days":7,"auto_refill":true}');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null or v_msg not like 'Only a person can set a column to refill%' then raise exception '2: wrong answer: %', v_msg; end if;
  perform set_config('app.actor_tier', 'user', true);

  -- 3. Every 7 days, switched off: the sentence says it waits for Fill, and the tick leaves it alone.
  v := custom.enrich_declare(c_org, c_field, '{"instruction":"Write the city this client is in, from their name.","inputs":["name"],"enabled":true,"review_interval_days":7}');
  if v ->> 'says' not like '%when somebody presses Fill%' then raise exception '3: the sentence claims more than happens: %', v ->> 'says'; end if;
  v_tick := custom.enrich_refill_due_tick();
  select f.data -> 'source_config' into v_cfg from custom.record f where f.id = c_field;
  if v_cfg ? 'refill_due_at' then raise exception '3: a column nobody set to refill was stamped'; end if;

  -- 4. The person turns it on: kept, named, and the sentence says it refills on its own.
  v := custom.enrich_declare(c_org, c_field, '{"auto_refill":true}');
  select f.data -> 'source_config' into v_cfg from custom.record f where f.id = c_field;
  if coalesce((v_cfg ->> 'auto_refill')::boolean, false) is not true then raise exception '4: auto_refill was not kept: %', v_cfg; end if;
  if v_cfg ->> 'auto_refill_by' is distinct from '87a6e699-3622-4869-8843-d0867456c0dd' then raise exception '4: it does not name the person: %', v_cfg; end if;
  if v ->> 'says' not like '%on its own 7 days after%' then raise exception '4: wrong sentence: %', v ->> 'says'; end if;
  if (v_cfg ->> 'review_interval_days')::int is distinct from 7 then raise exception '4: the interval was lost: %', v_cfg; end if;

  -- 5. The tick stamps it once, and not again the same day.
  v_tick := custom.enrich_refill_due_tick();
  select f.data -> 'source_config' into v_cfg from custom.record f where f.id = c_field;
  if nullif(v_cfg ->> 'refill_due_at', '') is null then raise exception '5: the tick did not stamp the opted-in column (%)', v_tick; end if;
  v_tick := custom.enrich_refill_due_tick();
  if exists (select 1 from custom.record f where f.id = c_field and (f.data -> 'source_config' ->> 'refill_due_at') is distinct from (v_cfg ->> 'refill_due_at')) then
    raise exception '5: stamped twice in one day';
  end if;

  -- 6. Re-declaring something else keeps the switch; the time tick itself carries the refills.
  v := custom.enrich_declare(c_org, c_field, '{"confidence_floor":0.5}');
  select f.data -> 'source_config' into v_cfg from custom.record f where f.id = c_field;
  if coalesce((v_cfg ->> 'auto_refill')::boolean, false) is not true then raise exception '6: another change dropped the switch'; end if;
  v_tick := custom.automation_time_tick();
  if not (v_tick ? 'ai_refills') then raise exception '6: the time tick does not run the refills: %', v_tick; end if;

  -- 7. Off is off.
  v := custom.enrich_declare(c_org, c_field, '{"auto_refill":false}');
  select f.data -> 'source_config' into v_cfg from custom.record f where f.id = c_field;
  if v_cfg ? 'auto_refill' or v_cfg ? 'refill_due_at' then raise exception '7: turning it off left %', v_cfg; end if;
  raise notice 'closeagent_auto_refill: all 7 checks passed';
end
$t$;

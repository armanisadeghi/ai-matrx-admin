-- LANE TABLE-CREATE-SPEED (item 2) - ONE OUTBOX INSERT IS NOT PLANNED OVER EVERY PARTITION OF custom.record.
-- migrations/campaign/tablecreatespeed_b_the_outbox_insert_plans_one_partition.sql. Before it, a cold-plan insert into
-- custom.io_outbox spent 268-320 ms in zz_gridprim_record_events_s_i (planning seven EXISTS subplans over 16 partitions);
-- after it, 1-10 ms. Two checks, ONE transaction, ROLLBACK:
--   1. speed: DISCARD PLANS, then one insert shaped like custom.io_record_changed's, three times; the activity trigger's
--      best cold time must be under 60 ms (before: never under 250 ms).
--   2. parity: the per-event context filter selects exactly the events the old CASE selected, over the last 3,000 events.
-- Run from the repo root:  ~/lane-resume/rso3/psql.sh -f scripts/campaign-tests/tablecreatespeed_b_the_outbox_insert_plans_one_partition.sql
\set ON_ERROR_STOP on
\timing off
\set suite 'tablecreatespeed_b_the_outbox_insert_plans_one_partition.sql'
\set requires 'function:custom._record_events_to_activity|function:custom._context_side_effects'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';
discard plans;
do $t$
declare
  v_org uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';  -- admin@admin.com's AI Matrx organization (big: the real cost)
  v_rid uuid; v_tid uuid; v_plan jsonb; v_ms numeric; v_best numeric := 1e9; i int; v_trig jsonb;
begin
  select r.id, r.table_id into v_rid, v_tid from custom.record r
   where r.organization_id = v_org and r.deleted_at is null
     and r.table_id not in ('11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002')
   limit 1;
  for i in 1..3 loop
    discard plans;
    execute format($q$explain (analyze, timing, format json) insert into custom.io_outbox
      (organization_id, event_key, record_id, table_id, operation, changed_field_ids, actor, dedupe_key, metadata)
      values (%L, 'records.changed', %L, %L, 'updated', '[]'::jsonb, '{}'::jsonb, %L, '{"change":{"kind":"update"}}'::jsonb)$q$,
      v_org, v_rid, v_tid, 'tcs-test:' || gen_random_uuid()) into v_plan;
    select (t ->> 'Time')::numeric into v_ms
      from jsonb_array_elements(v_plan -> 0 -> 'Triggers') t where t ->> 'Trigger Name' = 'zz_gridprim_record_events_s_i';
    raise notice 'cold insert %: activity trigger % ms, whole insert % ms', i, v_ms, v_plan -> 0 ->> 'Execution Time';
    v_best := least(v_best, coalesce(v_ms, 0));
  end loop;
  if v_best >= 60 then
    raise exception 'FAIL speed: a cold-plan outbox insert spent % ms (best of 3) in zz_gridprim_record_events_s_i; it must be under 60 ms', v_best;
  end if;
  raise notice 'PASS speed: activity trigger best cold % ms', v_best;
end $t$;

-- 2. parity of the context filter: old one-statement CASE vs the per-event lookups, over recent events.
do $t$
declare
  c_tk constant uuid := '11111111-0000-4000-8000-000000000001';
  c_fk constant uuid := '11111111-0000-4000-8000-000000000002';
  e record; v_key text; v_new boolean; v_old boolean; v_n int := 0; v_hit int := 0;
begin
  for e in select distinct o.organization_id as org, o.record_id as id, o.table_id
             from (select * from custom.io_outbox where event_key = 'records.changed' and table_id is not null
                    order by created_at desc limit 3000) o
  loop
    v_n := v_n + 1;
    select case
             when e.table_id = c_tk then
               not exists (select 1 from custom.record t where t.organization_id = e.org and t.id = e.id)
               or exists (select 1 from custom.record t where t.organization_id = e.org and t.id = e.id and t.data ->> 'kept_for' = 'context')
             when e.table_id = c_fk then
               exists (select 1 from custom.record f
                         join custom.record t on t.organization_id = f.organization_id
                                             and t.id = (case when (f.data ->> 'entity_definition_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (f.data ->> 'entity_definition_id')::uuid end)
                                             and t.table_id = c_tk and t.data ->> 'kept_for' = 'context'
                        where f.organization_id = e.org and f.id = e.id)
             else
               exists (select 1 from custom.record t where t.organization_id = e.org and t.id = e.table_id and t.table_id = c_tk and t.data ->> 'kept_for' = 'context')
           end into v_old;
    v_new := true;
    if e.table_id = c_tk then
      select t.data ->> 'kept_for' into v_key from custom.record t where t.organization_id = e.org and t.id = e.id;
      if found and v_key is distinct from 'context' then v_new := false; end if;
    elsif e.table_id = c_fk then
      select f.data ->> 'entity_definition_id' into v_key from custom.record f where f.organization_id = e.org and f.id = e.id;
      if not found or v_key is null or v_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_new := false;
      elsif not exists (select 1 from custom.record t where t.organization_id = e.org and t.id = v_key::uuid
                          and t.table_id = c_tk and t.data ->> 'kept_for' = 'context') then v_new := false; end if;
    else
      v_new := exists (select 1 from custom.record t where t.organization_id = e.org and t.id = e.table_id and t.table_id = c_tk and t.data ->> 'kept_for' = 'context');
    end if;
    if v_new is distinct from v_old then
      raise exception 'FAIL parity: event % (table %) old filter % new filter %', e.id, e.table_id, v_old, v_new;
    end if;
    if v_old then v_hit := v_hit + 1; end if;
  end loop;
  raise notice 'PASS parity: % events, % selected by both filters', v_n, v_hit;
end $t$;
rollback;

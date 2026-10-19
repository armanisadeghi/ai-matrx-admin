-- lane: AT-FIX-G3
-- Replaces one function (custom.agg_subscription_tick) and adds one partial index (custom.record, rule rows that carry a subscription). No schedule is added or changed. Inverse: migrations/inverse/atfixg3_the_instant_notice_tick_reads_only_what_a_subscription_can_use_down.sql
-- based-on: custom.agg_subscription_tick(interval) 738acf2a06e30d6309c4529969833dc23f32e943142a7c761891cf54d9188b3f
--
-- WHY THE INSTANT HALF TIMED OUT AT 30 s (measured 2026-10-19, EXPLAIN + clock per call)
-- The tick looped over EVERY record changed in the window and, for each one, ran custom.agg_subscription_fire_entered,
-- which re-reads the organization's subscriptions (~10 ms: a bitmap scan over every `rule` row of the partition),
-- then checks each subscribed view. An organization with NO instant subscription still paid ~10 ms per changed
-- record (one org changes ~600-1900 records per 15 minutes under test traffic), and a record in a table no
-- subscribed view watches paid it too. 15 ms x ~2000 records = the 30 s statement timeout.
-- THE FIX, three parts, none changing who is told:
--   1. The subscriptions are read ONCE per organization, not once per record; an organization with none is skipped.
--   2. Only records in a table some subscribed view watches are visited (a view admits only records of its own table;
--      agg_view_admits returns false for any other), so the rest were never able to notify anybody.
--   3. The subscription read is an index lookup (partial index below) instead of a partition scan, and the whole pass
--      has a 4 s budget: past it the tick stops, SAYS SO in a warning with how many records it left, and the next
--      tick (5 min later, window 15 min, delivery keyed per event so a re-read sends nothing twice) picks them up.

create index if not exists record_subscription_rule_idx
  on custom.record (organization_id)
  where data_class = 'rule' and deleted_at is null and data ? 'subscription';

create or replace function custom.agg_subscription_tick(p_window interval default '00:15:00'::interval)
 returns integer
 language plpgsql
 set search_path to 'pg_catalog'
as $function$
declare
  o        record;
  e        record;
  v_since  timestamptz := now() - greatest(coalesce(p_window, interval '15 minutes'), interval '1 minute');
  v_start  timestamptz := clock_timestamp();
  v_budget constant interval := interval '4 seconds';
  v_tables uuid[];
  v_n      integer := 0;
  v_left   integer := 0;
  v_over   boolean := false;
begin
  for o in
    select d.organization_id
      from (select distinct ob.organization_id
              from custom.io_outbox ob
             where ob.created_at > v_since and ob.deleted_at is null and ob.event_key = 'records.changed') d
     where exists (select 1
                     from custom.agg_subscriptions(d.organization_id, null, 'instant') s
                    where s.saved_view_id is not null and s.recipient_user_id is not null)
  loop
    begin
      -- The tables the organization's subscribed views watch. A view admits only a record of its own table.
      select coalesce(array_agg(distinct nullif(sv.definition ->> 'table_id', '')::uuid), '{}'::uuid[])
        into v_tables
        from custom.agg_subscriptions(o.organization_id, null, 'instant') s
        join platform.saved_view sv
          on sv.id = s.saved_view_id and sv.organization_id = o.organization_id and sv.deleted_at is null
       where s.recipient_user_id is not null;

      -- IT DOES NOT CLAIM THE OUTBOX. `consumed_at` is ONE column and ONE consumer,
      -- so a notifier that drained it would silently starve every import, export
      -- and webhook consumer of the same feed. Re-reading the same window is free:
      -- custom.agg_deliver's dedupe key is a UNIQUE constraint, so the second read
      -- of an event sends nothing.
      for e in
        select ob.record_id, ob.table_id
          from custom.io_outbox ob
         where ob.organization_id = o.organization_id
           and ob.created_at > v_since and ob.deleted_at is null
           and ob.event_key = 'records.changed'
           and (ob.table_id is null or ob.table_id = any (v_tables))
         group by ob.record_id, ob.table_id
         order by max(ob.created_at) desc
      loop
        if v_over or clock_timestamp() - v_start > v_budget then
          v_over := true;
          v_left := v_left + 1;
          continue;
        end if;
        v_n := v_n + custom.agg_subscription_fire_entered(o.organization_id, e.record_id,
                                                          e.table_id, v_since);
      end loop;
    exception
      when insufficient_privilege or foreign_key_violation then
        -- One organization with the store switched off, or a view somebody deleted
        -- mid-tick. Skipped, said out loud, and every other organization still told.
        raise warning 'custom.agg_subscription_tick: organization % skipped — %', o.organization_id, sqlerrm;
    end;
  end loop;
  if v_over then
    raise warning 'custom.agg_subscription_tick: stopped at the % s budget with % record(s) not yet read; the next tick reads them',
      extract(epoch from v_budget), v_left;
  end if;
  return v_n;
end;
$function$;

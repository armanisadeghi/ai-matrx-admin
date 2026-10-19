-- chair-step: puts custom.agg_subscription_tick back to the per-record pass that timed out at 30 s under load, and drops the partial index on rule rows.
-- based-on: custom.agg_subscription_tick(interval) <the hash of the new body; take it with pnpm db:based-on custom.agg_subscription_tick before applying>
create or replace function custom.agg_subscription_tick(p_window interval default '00:15:00'::interval)
 returns integer
 language plpgsql
 set search_path to 'pg_catalog'
as $function$
declare
  o       record;
  e       record;
  v_since timestamptz := now() - greatest(coalesce(p_window, interval '15 minutes'), interval '1 minute');
  v_n     integer := 0;
begin
  for o in
    select distinct ob.organization_id
      from custom.io_outbox ob
     where ob.created_at > v_since and ob.deleted_at is null and ob.event_key = 'records.changed'
  loop
    begin
      for e in
        select ob.record_id, ob.table_id
          from custom.io_outbox ob
         where ob.organization_id = o.organization_id
           and ob.created_at > v_since and ob.deleted_at is null
           and ob.event_key = 'records.changed'
         group by ob.record_id, ob.table_id
      loop
        v_n := v_n + custom.agg_subscription_fire_entered(o.organization_id, e.record_id,
                                                          e.table_id, v_since);
      end loop;
    exception
      when insufficient_privilege or foreign_key_violation then
        raise warning 'custom.agg_subscription_tick: organization % skipped — %', o.organization_id, sqlerrm;
    end;
  end loop;
  return v_n;
end;
$function$;
drop index if exists custom.record_subscription_rule_idx;

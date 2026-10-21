-- chair-step: already applied on live 2026-10-21 21:59:28Z through direct SQL (Arman's direct-DB ruling) with these exact statement bytes; non-additive only because it replaces five live function bodies (REVOKE on the new helper, DELETE inside the hand-back bodies). Ledgered with --mark-applied, never executed by a runner.
-- THE DRAIN READS FROM THE CONSUMED MARK (2026-10-21).
--
-- WHY: every records_changed drain pass asked custom.io_outbox_pending_organizations which
-- organizations had work, and it answered by anti-joining the whole outbox history (~1.1M rows,
-- 1.7 GB) against custom.io_outbox_consumption (~1.3M rows). Measured on live over 5.7 h: 8,234
-- calls at 3.3 s = 27% of ALL database time; the per-organization claim (record_changes_drain ->
-- _io_outbox_claim) cost another 0.9 s a call for the same reason. The cost grew with history,
-- forever, on a platform with five people.
--
-- WHAT: each consumer row (custom.io_outbox_consumer) carries consumed_before: every live outbox
-- row of its event key created before that instant is consumed. Every pending read starts at
-- greatest(starts_at, consumed_before), so its cost is the rows since the mark, not the history.
--   * custom._io_outbox_advance_mark moves the mark, under the consumer row's lock, to the first
--     unconsumed row — never past the start of the oldest open transaction, because created_at is
--     that transaction's now() and its rows only become visible when it commits.
--   * custom.io_outbox_pending_organizations advances the mark, then reads after it (VOLATILE now:
--     it writes the mark).
--   * custom._io_outbox_claim and custom.io_outbox_backlog read after the mark.
--   * custom.io_outbox_release_claimed and custom.io_outbox_rearm, which hand consumed events
--     back, first lower the mark to the oldest event they hand back (same row lock), so a handed
--     back event is always found again.
-- Delivery is unchanged: at-least-once, per-organization order (created_at, id), a failed page
-- handed back and redelivered on the next pass.
--
-- Guard: aidream tests/test_record_changes_consumed_mark_live.py.
-- based-on: custom.io_outbox_pending_organizations(text, text) 9079c2e9489f95f3689818dd162cd6944620d3dc9e3eb4f869405fa051741000
-- based-on: custom._io_outbox_claim(uuid, text, text, integer) 6eb01e44e6b37188aa1088f894105dcca9ddfe259294e657d4d078bccc31c727
-- based-on: custom.io_outbox_backlog(text, text, interval) b72b0939cf2aa8e7620b2bd746ce816615e8f8292c39dc20f7a2afe481760aa8
-- based-on: custom.io_outbox_release_claimed(uuid, text, uuid[]) ea77db2d211ba2f8710d7984a54759978bc63412545f93ef844aa8b2f70b26c5
-- based-on: custom.io_outbox_rearm(uuid, text) d5ee020548bc155eecdd806565d9bd2bd497c926977d69b3d98b9ef92a92e12a

set local lock_timeout = '3s';

alter table custom.io_outbox_consumer add column if not exists consumed_before timestamptz;
comment on column custom.io_outbox_consumer.consumed_before is
  'The consumed mark: every live custom.io_outbox row of this event key created before this instant is consumed by this consumer. Moved forward only by custom._io_outbox_advance_mark; lowered by custom.io_outbox_release_claimed / custom.io_outbox_rearm when they hand events back. Null = starts_at.';

CREATE OR REPLACE FUNCTION custom._io_outbox_advance_mark(p_consumer text, p_event_key text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_from timestamptz;
  v_first timestamptz;
  v_horizon timestamptz;
  v_mark timestamptz;
begin
  -- The consumer row's lock orders this against every hand-back (release_claimed / rearm lower the
  -- mark under the same lock). Under READ COMMITTED each statement below takes a fresh snapshot
  -- AFTER the lock, so a hand-back that committed first is seen.
  execute 'select greatest(s.starts_at, coalesce(s.consumed_before, s.starts_at))
             from custom.io_outbox_consumer s
            where s.consumer = $1 and s.event_key = $2
            for update'
     into v_from using p_consumer, p_event_key;
  if v_from is null then
    return null;
  end if;
  execute 'select o.created_at
             from custom.io_outbox o
            where o.event_key = $2 and o.deleted_at is null and o.created_at >= $3
              and not exists (select 1 from custom.io_outbox_consumption c
                               where c.event_id = o.id and c.consumer = $1)
            order by o.created_at
            limit 1'
     into v_first using p_consumer, p_event_key, v_from;
  -- created_at is the writing transaction's now(): a transaction still open may yet commit rows
  -- stamped with its start. The mark never passes the oldest open transaction (idle-in-transaction
  -- is cut at 2 min on this database, so the lag is bounded).
  select min(a.xact_start) into v_horizon
    from pg_catalog.pg_stat_activity a
   where a.xact_start is not null
     and a.backend_type not in ('autovacuum worker', 'autovacuum launcher', 'walsender');
  v_mark := least(coalesce(v_first, 'infinity'::timestamptz), coalesce(v_horizon, now()), now());
  if v_mark > v_from then
    execute 'update custom.io_outbox_consumer set consumed_before = $3
              where consumer = $1 and event_key = $2'
      using p_consumer, p_event_key, v_mark;
    v_from := v_mark;
  end if;
  return v_from;
end;
$function$;
revoke all on function custom._io_outbox_advance_mark(text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function custom._io_outbox_advance_mark(text, text) from anon, authenticated';
  end if;
end $$;

CREATE OR REPLACE FUNCTION custom.io_outbox_pending_organizations(p_consumer text, p_event_key text)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_from timestamptz;
begin
  perform custom._io_outbox_server_only('custom.io_outbox_pending_organizations');
  if custom.io_outbox_per_consumer() then
    -- THE CONSUMED MARK: read only what came after it, never the whole history.
    v_from := custom._io_outbox_advance_mark(p_consumer, p_event_key);
    if v_from is null then
      return;  -- not subscribed: nothing is pending for it
    end if;
    return query execute
      'select distinct o.organization_id
         from custom.io_outbox o
        where o.event_key = $2 and o.deleted_at is null and o.created_at >= $3
          and not exists (select 1 from custom.io_outbox_consumption c
                           where c.event_id = o.id and c.consumer = $1)'
      using p_consumer, p_event_key, v_from;
    return;
  end if;
  return query
  select distinct o.organization_id from custom.io_outbox o
   where o.event_key = p_event_key and o.consumed_at is null and o.deleted_at is null;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._io_outbox_claim(p_organization_id uuid, p_consumer text, p_event_key text, p_limit integer)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_start timestamptz;
begin
  if not custom.io_outbox_per_consumer() then
    raise exception 'custom._io_outbox_claim: per-consumer consumption is not installed on this database yet (custom.io_outbox_consumption). Until it is, drain with custom.io_outbox_drain.'
      using errcode = '55000';
  end if;
  if coalesce(btrim(p_consumer), '') = '' then
    raise exception 'name the consumer. Two consumers draining one organization must be tellable apart, and an unnamed claim is an unrecoverable one.'
      using errcode = '22004';
  end if;
  -- THE CONSUMED MARK: everything before it is consumed, so the claim reads from it.
  execute 'select greatest(s.starts_at, coalesce(s.consumed_before, s.starts_at)) from custom.io_outbox_consumer s where s.consumer = $1 and s.event_key = $2'
     into v_start using p_consumer, p_event_key;
  if v_start is null then
    -- A FIRST DRAIN SUBSCRIBES, OUT LOUD. Every caller of the one generic drain keeps working the
    -- moment Part B lands; the consumer sees events from this transaction's start on, never a
    -- backlog it never asked for. custom.io_outbox_subscribe is the deliberate way to say it first.
    execute 'insert into custom.io_outbox_consumer (consumer, event_key) values ($1, $2)
             on conflict (consumer, event_key) do nothing'
      using p_consumer, p_event_key;
    execute 'select greatest(s.starts_at, coalesce(s.consumed_before, s.starts_at)) from custom.io_outbox_consumer s where s.consumer = $1 and s.event_key = $2'
       into v_start using p_consumer, p_event_key;
    raise warning '[record.changed] "%" was not subscribed to "%" events; it is now, from % on. Subscribe a consumer once with custom.io_outbox_subscribe to say so deliberately.',
      p_consumer, p_event_key, v_start;
  end if;

  return query execute
    'with picked as (
       select o.id
         from custom.io_outbox o
        where o.organization_id = $1
          and o.event_key = $3
          and o.deleted_at is null
          and o.created_at >= $5
          and not exists (select 1 from custom.io_outbox_consumption c
                           where c.event_id = o.id and c.consumer = $2)
        order by o.created_at, o.id
        limit $4)
     insert into custom.io_outbox_consumption (event_id, consumer, organization_id)
     select p.id, $2, $1 from picked p
     on conflict do nothing
     returning event_id'
    using p_organization_id, p_consumer, p_event_key,
          custom.page_size(p_organization_id, 'custom.io_outbox_drain', p_limit, 100, 1000), v_start;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_outbox_backlog(p_consumer text, p_event_key text, p_older_than interval DEFAULT '00:00:00'::interval)
 RETURNS TABLE(organization_id uuid, waiting bigint, oldest timestamp with time zone, last_carried timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_from timestamptz;
begin
  perform custom._io_outbox_server_only('custom.io_outbox_backlog');
  if custom.io_outbox_per_consumer() then
    -- THE CONSUMED MARK: the backlog is what came after it.
    execute 'select greatest(s.starts_at, coalesce(s.consumed_before, s.starts_at)) from custom.io_outbox_consumer s where s.consumer = $1 and s.event_key = $2'
       into v_from using p_consumer, p_event_key;
    if v_from is null then
      return;
    end if;
    return query execute
      'select o.organization_id, count(*)::bigint, min(o.created_at),
              (select max(c.consumed_at) from custom.io_outbox_consumption c
                where c.consumer = $1 and c.organization_id = o.organization_id)
         from custom.io_outbox o
        where o.event_key = $2 and o.deleted_at is null and o.created_at >= $4
          and o.created_at < now() - $3
          and not exists (select 1 from custom.io_outbox_consumption c
                           where c.event_id = o.id and c.consumer = $1)
        group by o.organization_id'
      using p_consumer, p_event_key, coalesce(p_older_than, interval '0 seconds'), v_from;
    return;
  end if;
  return query
  select o.organization_id, count(*)::bigint, min(o.created_at),
         (select max(x.consumed_at) from custom.io_outbox x
           where x.event_key = p_event_key and x.organization_id = o.organization_id)
    from custom.io_outbox o
   where o.event_key = p_event_key and o.consumed_at is null and o.deleted_at is null
     and o.created_at < now() - coalesce(p_older_than, interval '0 seconds')
   group by o.organization_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_outbox_release_claimed(p_organization_id uuid, p_consumer text, p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_n integer;
begin
  perform custom._io_outbox_server_only('custom.io_outbox_release_claimed');
  if coalesce(btrim(p_consumer), '') = '' then
    raise exception 'custom.io_outbox_release_claimed: name the consumer whose claims are handed back.' using errcode = '22004';
  end if;
  if custom.io_outbox_per_consumer() then
    -- Lower the consumed mark to the oldest handed-back event FIRST: the update takes the consumer
    -- row's lock, which custom._io_outbox_advance_mark waits on, so the mark can never pass them.
    execute 'update custom.io_outbox_consumer s set consumed_before = r.oldest
               from (select o.event_key, min(o.created_at) as oldest from custom.io_outbox o
                      where o.organization_id = $1 and o.id = any($3) group by o.event_key) r
              where s.consumer = $2 and s.event_key = r.event_key
                and s.consumed_before > r.oldest'
      using p_organization_id, p_consumer, coalesce(p_ids, '{}'::uuid[]);
    execute 'delete from custom.io_outbox_consumption c
              where c.organization_id = $1 and c.consumer = $2 and c.event_id = any($3)'
      using p_organization_id, p_consumer, coalesce(p_ids, '{}'::uuid[]);
  else
    update custom.io_outbox o
       set consumed_at = null, consumer = null
     where o.organization_id = p_organization_id
       and o.id = any(coalesce(p_ids, '{}'::uuid[]))
       and o.consumer = p_consumer;
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_outbox_rearm(p_organization_id uuid, p_dedupe_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if not custom.io_outbox_per_consumer() then
    return;
  end if;
  -- Re-arming hands the event back to every consumer: lower each consumer's mark to it first
  -- (same lock order as custom.io_outbox_release_claimed).
  execute 'update custom.io_outbox_consumer s set consumed_before = o.created_at
             from custom.io_outbox o
            where o.organization_id = $1 and o.dedupe_key = $2 and o.deleted_at is null
              and s.event_key = o.event_key and s.consumed_before > o.created_at'
    using p_organization_id, p_dedupe_key;
  execute 'delete from custom.io_outbox_consumption c using custom.io_outbox o
            where o.organization_id = $1 and o.dedupe_key = $2 and o.deleted_at is null and c.event_id = o.id'
    using p_organization_id, p_dedupe_key;
end;
$function$;

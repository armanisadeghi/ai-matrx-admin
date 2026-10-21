-- based-on: custom.inbox_remind_tick() c3a6fe4200971c0bccd1917ca9a5df9e78afb0b79f3e1cd72a29fce6739289a6
--
-- DB LANE A (2026-10-21): THE REMINDER TICK FINDS ASSIGNED RECORDS THROUGH THE INDEX.
--
-- custom.inbox_remind_tick (pg_cron, every 5 minutes) spent 672 s in the census window, mean 10.8 s. Its
-- "assignees of open work" branch read every live record in custom.record (561k rows, 8.5 s) because
-- `nullif(data ->> 'assignee', '') is not null` is not something the planner can match to an index.
-- `data ->> 'assignee' <> ''` is the same test (null and '' both fail it) and implies the partial
-- predicate of record_assignee_live_idx (migrations/dblanea_inbox_indexes_on_record.sql): 67 ms, same
-- rows (md5 of every (record, person) pair identical before and after). Nothing else in the body moves.
CREATE OR REPLACE FUNCTION custom.inbox_remind_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_now      timestamptz := custom._inbox_now();
  p          record;
  x          record;
  v_days     integer;
  v_id       uuid;
  v_reminded integer := 0;
  v_back     integer := 0;
  v_ch       text;                  -- STORE-TAILS-3: the channel being written
begin
  -- WHO MIGHT BE OWED SOMETHING: approvers of a pending ask at least a day old, assignees of open
  -- work untouched for at least a day, and anybody whose snooze has come due. Each is then asked
  -- through custom._inbox_items — the SAME predicate their inbox and badge read — so a reminder
  -- is never about something they cannot see, have cleared, or have snoozed.
  for p in
    select distinct c.organization_id, c.user_id from (
      select a.organization_id, ap.user_id
        from custom.record a
        cross join lateral custom.work_approval_approvers(a.organization_id,
                     nullif(a.data ->> 'subject_id', '')::uuid,
                     nullif(a.data ->> 'approver_id', '')::uuid) ap
       where a.data_class = 'work_approval' and a.deleted_at is null
         and coalesce(a.data ->> 'state', 'pending') = 'pending'
         and a.created_at < v_now - interval '1 day'
      union
      select r.organization_id,
             case when pr.data ->> 'user_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then (pr.data ->> 'user_id')::uuid end
        from custom.record r
        join custom.record pr
          on pr.organization_id = r.organization_id
         and pr.id = platform.uuid_or_null(r.data ->> 'assignee')
         and pr.table_id = custom.person_kernel_id()
       where r.data_class = 'record' and r.deleted_at is null
         -- DB LANE A (2026-10-21): the same test as nullif(...) is not null, written as a strict
         -- operator so the planner proves record_assignee_live_idx's predicate (8.5 s -> 67 ms).
         and r.data ->> 'assignee' <> ''
         and r.updated_at < v_now - interval '1 day'
      union
      select s.organization_id, s.person_id
        from custom.inbox_item_state s
       where s.snoozed_until is not null and s.snoozed_until <= v_now and s.woke_at is null
    ) c
    -- AN ARCHIVED ORGANIZATION IS NEVER REMINDED: nobody works there any more, and its leftover
    -- asks would otherwise nag everybody who ever belonged to it (54 such reminders were measured
    -- on production, in 14 archived organizations, before the first run of the tick).
    join iam.organizations g on g.id = c.organization_id and g.archived_at is null
    where c.user_id is not null
  loop
    begin
      v_days := coalesce((platform.knob_resolve('custom', 'inbox_reminder_after_days', p.organization_id) #>> '{}')::integer, 3);
      for x in
        select * from custom._inbox_items(p.organization_id, p.user_id, false) i
         where i.inbox_state = 'waiting'
           and ((i.snoozed_until is not null and i.snoozed_until <= v_now and i.woke_at is null)
                or (i.reminded_at is null and v_days > 0 and i.at < v_now - make_interval(days => v_days)))
      loop
        if x.snoozed_until is not null and x.snoozed_until <= v_now and x.woke_at is null then
          -- A SNOOZE THAT CAME DUE says so once. It counts as the item's reminder.
          -- STORE-TAILS-3: every channel the person has on for this kind of notice (in the app and,
          -- by default, by email); `custom.agg_deliver` asks their switch and writes each one.
          foreach v_ch in array array['in_app', 'email'] loop
            v_id := custom.agg_deliver(p.organization_id, null, x.item_id, v_ch, p.user_id,
                      'custom.inbox.snooze_ended',
                      format('Back in your inbox: %s', x.title),
                      'You snoozed this until now. It is at the top of your inbox.',
                      jsonb_build_object('source', 'inbox', 'reason', 'snooze_ended', 'item_id', x.item_id,
                                         'kind', x.kind, 'table_id', x.table_id, 'snoozed_until', x.snoozed_until),
                      format('inbox:%s:back:%s', p.user_id, extract(epoch from x.snoozed_until)::bigint));
            if v_id is not null then
              update communication.notification n
                 set deep_link = case when v_ch = 'in_app' then coalesce(n.deep_link, '/o/' || coalesce(x.subject_id, x.item_id)::text)
                                      else '/o/' || coalesce(x.subject_id, x.item_id)::text end
               where n.id = v_id and n.organization_id = p.organization_id and n.status in ('pending', 'render_pending');
            end if;
          end loop;
          update custom.inbox_item_state s
             set woke_at = v_now, reminded_at = coalesce(s.reminded_at, v_now), updated_at = now()
           where s.organization_id = p.organization_id and s.person_id = p.user_id and s.item_id = x.item_id;
          v_back := v_back + 1;
        else
          -- ONE REMINDER, EVER, per person and item: the stamp here and the notification's unique
          -- dedupe key both say so.
          foreach v_ch in array array['in_app', 'email'] loop
            v_id := custom.agg_deliver(p.organization_id, null, x.item_id, v_ch, p.user_id,
                      'custom.inbox.reminder',
                      format('Still waiting on you: %s', x.title),
                      case when x.kind = 'assignment'
                           then format('Assigned to you in %s and untouched for %s days. Open your inbox to finish it, snooze it, or clear it.',
                                       coalesce(x.table_name, 'a table'), v_days)
                           else format('%s asked %s days ago. Approve or decline it in your inbox, or snooze it until you can.',
                                       coalesce(x.requested_by_name, 'Somebody'), v_days) end,
                      jsonb_build_object('source', 'inbox', 'reason', 'reminder', 'item_id', x.item_id,
                                         'kind', x.kind, 'table_id', x.table_id, 'after_days', v_days),
                      format('inbox:%s:reminder', p.user_id));
            if v_id is not null then
              update communication.notification n
                 set deep_link = case when v_ch = 'in_app' then coalesce(n.deep_link, '/o/' || coalesce(x.subject_id, x.item_id)::text)
                                      else '/o/' || coalesce(x.subject_id, x.item_id)::text end
               where n.id = v_id and n.organization_id = p.organization_id and n.status in ('pending', 'render_pending');
            end if;
          end loop;
          insert into custom.inbox_item_state as s (organization_id, person_id, item_id, reminded_at, updated_at)
          values (p.organization_id, p.user_id, x.item_id, v_now, now())
          on conflict (organization_id, person_id, item_id)
          do update set reminded_at = coalesce(s.reminded_at, excluded.reminded_at), updated_at = now();
          v_reminded := v_reminded + 1;
        end if;
      end loop;
    exception when others then
      -- ONE ORGANIZATION'S TROUBLE NEVER STOPS EVERYBODY ELSE'S REMINDERS — and it is loud.
      raise warning 'custom.inbox_remind_tick: organization % person %: % (%)', p.organization_id, p.user_id, sqlerrm, sqlstate;
    end;
  end loop;
  return jsonb_build_object('reminded', v_reminded, 'back', v_back, 'at', v_now);
end
$function$;

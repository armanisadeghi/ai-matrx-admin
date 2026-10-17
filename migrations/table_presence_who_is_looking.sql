-- table_presence_who_is_looking (AIRTABLE-PARITY row 183)
--
-- Who else is looking at this table right now: PRESENCE on a private topic per Table,
-- `custom:table-presence:<table_id>`. It is deliberately NOT the records topic `custom:table:<id>`:
-- that topic carries database-written notices and has no INSERT policy on purpose (no browser may
-- assert that someone else's records moved). Presence needs the browser to TRACK, i.e. an INSERT
-- on realtime.messages, so it gets its own prefix and its own narrow INSERT policy:
--   * extension = 'presence' only - a browser still cannot BROADCAST on any topic;
--   * only topics whose prefix ends in `-presence` - the records topic and every other notice
--     topic stay unforgeable;
--   * admission is the SAME question the table's live notices ask (custom.realtime_topic_admits,
--     i.e. custom.assert_may_know_table) - a person who may not know the table cannot join, see
--     the roster or announce themselves on it.
-- The payload is a roster entry (display name, avatar url, the cell the person has selected);
-- never a value of the table.

set local lock_timeout = '2s';

create or replace function custom.realtime_presence_topic_admits(p_topic text)
returns boolean
language plpgsql
stable
set search_path to 'pg_catalog'
as $fn$
begin
  -- THE GRAMMAR: custom:table-presence:<uuid>, nothing else.
  if p_topic is null
     or p_topic !~ '^custom:table-presence:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  -- The records topic's own question, about the same table: one ladder, no second opinion.
  return custom.realtime_topic_admits('custom:table:' || substring(p_topic from 23));
end;
$fn$;
comment on function custom.realtime_presence_topic_admits(text) is
  'Admission for the private presence topic custom:table-presence:<table_id>: exactly the people custom.realtime_topic_admits admits for custom:table:<table_id>. Called by platform.realtime_topic_admits through platform.realtime_topic_prefix.';


insert into platform.realtime_topic_prefix (prefix, admits_fn, description)
values ('custom:table-presence', 'custom.realtime_presence_topic_admits(text)'::regprocedure,
        'One private PRESENCE topic per Table in the record store: who is looking at it right now (name, avatar, selected cell). The payload is a roster entry, never a value. Admission is the same ladder as the Table''s live-notice topic.')
on conflict (prefix) do update
   set admits_fn = excluded.admits_fn, description = excluded.description;

create policy platform_presence_topics_admit_their_own
  on realtime.messages
  for insert
  to authenticated
  with check (
    extension = 'presence'
    and realtime.topic() like '%-presence:%'
    and coalesce((platform.knob_resolve('platform', 'realtime_broadcast_enabled', null) #>> '{}')::boolean, false)
    and platform.realtime_topic_admits(realtime.topic())
  );

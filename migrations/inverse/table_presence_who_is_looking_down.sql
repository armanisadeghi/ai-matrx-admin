-- chair-step: inverse of table_presence_who_is_looking.sql - removes the presence INSERT policy, the `custom:table-presence` topic prefix and its admission function; the table toolbar stops showing who else is looking.

set local lock_timeout = '2s';

drop policy if exists platform_presence_topics_admit_their_own on realtime.messages;
delete from platform.realtime_topic_prefix where prefix = 'custom:table-presence';
drop function if exists custom.realtime_presence_topic_admits(text);

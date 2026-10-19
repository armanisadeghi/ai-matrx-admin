-- chair-step: removes everything migrations/campaign/atfixg2_follow_a_record.sql added (two triggers, six functions, the follow table and the notice kind). Follows people set are lost.
drop trigger if exists zzzz_record_follow_changed_s_i on custom.io_outbox;
drop trigger if exists zz_record_follow_commented on platform.comments;
drop function if exists custom._record_follow_changed_stmt();
drop function if exists custom._record_follow_commented();
drop function if exists custom._record_follow_notify(uuid, uuid, uuid, uuid, text, text, text, text, uuid[]);
delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('record_follow_set', 'record_followers');
drop function if exists custom.record_follow_set(uuid, uuid, boolean);
drop function if exists custom.record_followers(uuid, uuid);
drop table if exists custom.record_follow;
delete from communication.notification_event_type where event_key = 'custom.record.follow';

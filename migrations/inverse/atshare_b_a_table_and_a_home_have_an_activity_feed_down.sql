-- INVERSE of migrations/campaign/atshare_b_a_table_and_a_home_have_an_activity_feed.sql
-- lane: AT-SHARE
drop function if exists custom.base_activity(uuid, uuid, integer, bigint);
delete from platform.client_callable_door where declared_by = 'atshare_b_a_table_and_a_home_have_an_activity_feed.sql';

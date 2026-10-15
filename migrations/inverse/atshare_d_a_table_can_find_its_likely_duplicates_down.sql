-- INVERSE of migrations/campaign/atshare_d_a_table_can_find_its_likely_duplicates.sql
-- lane: AT-SHARE
drop function if exists custom.find_duplicates(uuid, uuid, text[], integer);
delete from platform.client_callable_door where declared_by = 'atshare_d_a_table_can_find_its_likely_duplicates.sql';

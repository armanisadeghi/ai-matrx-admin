-- chair-step: withdraw COPY-EXTRAS: drops custom.copy_table_extras, its helper custom._point_at_copies and the door row.
-- lock: custom,platform
-- Inverse of 20261020000000_copyextras_a_one_function_copies_a_tables_automations_and_pages.sql.
set local lock_timeout = '3s';
set local statement_timeout = '60s';

delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'copy_table_extras';
drop function if exists custom.copy_table_extras(uuid, jsonb);
drop function if exists custom._point_at_copies(jsonb, jsonb);

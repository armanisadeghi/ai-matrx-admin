-- Inverse of 20261021236000_closelink_f_a_tables_homes_are_named (lane CLOSE-LINK): the door and its declaration removed.
set lock_timeout = '3s';
set statement_timeout = '120s';
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'table_homes_named';
drop function if exists custom.table_homes_named(uuid, uuid);

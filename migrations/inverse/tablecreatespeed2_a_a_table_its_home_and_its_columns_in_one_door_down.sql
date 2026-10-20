-- INVERSE of migrations/campaign/tablecreatespeed2_a_a_table_its_home_and_its_columns_in_one_door.sql (lane TABLE-CREATE-SPEED-2).
-- chair-step: revokes the grant, deletes the declaration row, drops the function.
-- lock: custom
REVOKE EXECUTE ON FUNCTION custom.table_create(uuid, jsonb, jsonb) FROM authenticated;
DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name = 'table_create';
DROP FUNCTION custom.table_create(uuid, jsonb, jsonb);

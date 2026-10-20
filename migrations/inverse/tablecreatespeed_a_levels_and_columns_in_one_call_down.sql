-- INVERSE of migrations/campaign/tablecreatespeed_a_levels_and_columns_in_one_call.sql (lane TABLE-CREATE-SPEED).
-- chair-step: revokes the two grants, deletes the two declaration rows, drops the two functions.
-- lock: custom
REVOKE EXECUTE ON FUNCTION custom.my_levels_across(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION custom.field_declare_many(uuid, uuid, jsonb) FROM authenticated;
DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name IN ('my_levels_across', 'field_declare_many');
DROP FUNCTION custom.my_levels_across(jsonb);
DROP FUNCTION custom.field_declare_many(uuid, uuid, jsonb);

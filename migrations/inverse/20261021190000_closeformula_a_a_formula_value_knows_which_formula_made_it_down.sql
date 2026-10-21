-- INVERSE of migrations/campaign/20261021190000_closeformula_a_a_formula_value_knows_which_formula_made_it.sql (lane CLOSE-FORMULA):
-- the formula history door, its registration and its helper gone. Nothing else was touched by the forward file.
-- chair-step: drops a function.
-- lock: custom
set lock_timeout = '3s';
set statement_timeout = '60s';
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'formula_history';
drop function if exists custom.formula_history(uuid, uuid, text, integer);
drop function if exists custom._formula_value_then(uuid, uuid, jsonb, jsonb);

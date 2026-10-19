-- lane: AT-FIX-G1b
-- inverse of: migrations/campaign/atg1b_a_an_interface_draws_its_charts_for_outsiders.sql
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'interface_chart';
drop function if exists custom.interface_chart(uuid, text);

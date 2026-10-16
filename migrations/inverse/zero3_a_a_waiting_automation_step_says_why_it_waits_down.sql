delete from platform.client_callable_door where schema_name='custom' and function_name='automation_note';
drop function if exists custom.automation_note(uuid, text);

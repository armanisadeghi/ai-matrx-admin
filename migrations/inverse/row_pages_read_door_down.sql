-- Inverse of campaign/row_pages_read_door.sql: the door and its registration gone.
delete from platform.client_callable_door where schema_name = 'content' and function_name = 'row_page_for';
drop function if exists content.row_page_for(uuid);
NOTIFY pgrst, 'reload schema';

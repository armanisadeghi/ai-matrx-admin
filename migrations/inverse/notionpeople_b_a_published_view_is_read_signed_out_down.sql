-- INVERSE of migrations/campaign/notionpeople_b_a_published_view_is_read_signed_out.sql
-- lane: NOTION-PEOPLE
drop function if exists custom.published_view_read(text);
delete from platform.client_callable_door where declared_by = 'notionpeople_b_a_published_view_is_read_signed_out.sql';

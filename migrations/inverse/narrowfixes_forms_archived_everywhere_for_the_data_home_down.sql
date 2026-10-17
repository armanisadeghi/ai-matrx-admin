-- undo narrowfixes_forms_archived_everywhere_for_the_data_home.sql: removes the door row and drops
-- custom.forms_archived_everywhere(). Nothing else is affected; the Data home's Archived filter then lists no forms.
delete from platform.client_callable_door
 where declared_by = 'narrowfixes_forms_archived_everywhere_for_the_data_home.sql';
drop function if exists custom.forms_archived_everywhere();

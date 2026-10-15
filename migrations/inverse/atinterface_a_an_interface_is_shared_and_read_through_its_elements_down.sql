-- INVERSE of migrations/campaign/atinterface_a_an_interface_is_shared_and_read_through_its_elements.sql
-- lane: AT-INTERFACE
-- Interfaces stay as dashboard records (presentation.kind = interface); members still open them through custom.dashboards.
-- People who are not members of the organization lose their way in.
drop function if exists custom.interface_rows(uuid, text, uuid, integer, integer);
drop function if exists custom.interface_read(uuid);
delete from platform.client_callable_door where declared_by = 'atinterface_a_an_interface_is_shared_and_read_through_its_elements.sql';
select custom.reopen_declared_doors();

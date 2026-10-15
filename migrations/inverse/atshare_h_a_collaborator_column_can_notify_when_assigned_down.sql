-- INVERSE of atshare_h. Automations made by the door stay (they are the person's, archived from the automations list).
-- lane: AT-SHARE
drop function if exists custom.field_notify_on_assign(uuid, uuid, boolean);
delete from platform.client_callable_door where declared_by = 'atshare_h_a_collaborator_column_can_notify_when_assigned.sql';

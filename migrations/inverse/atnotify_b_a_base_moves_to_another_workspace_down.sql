-- INVERSE of atnotify_b_a_base_moves_to_another_workspace.sql. A base already moved stays where it went (move it back with the same door before running this).
drop function if exists custom.base_move(uuid, uuid);
delete from platform.client_callable_door where declared_by = 'atnotify_b_a_base_moves_to_another_workspace.sql';

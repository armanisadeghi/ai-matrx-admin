-- INVERSE of migrations/campaign/instanceofpage_a_which_install_made_this_page.sql (lane INSTANCE-OF-PAGE): the door, its registration and the index gone.
-- chair-step: drops a function.
-- lock: custom
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'template_instance_of_page';
drop function if exists custom.template_instance_of_page(uuid, uuid);
drop index if exists custom.template_install_made_gin_idx;

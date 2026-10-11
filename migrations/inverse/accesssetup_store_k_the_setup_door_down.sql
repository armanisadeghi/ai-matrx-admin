-- chair-step: inverse of accesssetup_store_k — drops the setup door, its preview/read/revert, the two helpers and the admin_widened event; existing scoped setup rows stay (written rows are data).
-- lane: access-store
-- lock: custom,iam

delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('table_access_setup', 'table_access_setup_preview', 'table_access_setup_set', 'table_access_setup_revert', '_store_cells_in', '_store_reach');
drop function if exists custom.table_access_setup_revert(uuid, uuid);
drop function if exists custom.table_access_setup_set(uuid, jsonb, jsonb, text);
drop function if exists custom.table_access_setup_preview(uuid, jsonb, jsonb);
drop function if exists custom.table_access_setup(uuid);
drop function if exists custom._store_reach(jsonb, uuid, uuid, permission_level, text);
drop function if exists custom._store_cells_in(jsonb, uuid, text, text);
update communication.notification_event_type set deleted_at = now() where event_key = 'custom.table_access.admin_widened' and deleted_at is null;

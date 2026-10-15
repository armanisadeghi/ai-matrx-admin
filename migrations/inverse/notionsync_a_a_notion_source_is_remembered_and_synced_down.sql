-- chair-step: withdraw Notion sync (NOTION-SYNC): drops the four users.notion_sync_source* functions, their four client-door rows and the users.notion_sync_source table (every remembered Notion source ends; imported tables and pages keep all their rows).
-- lock: platform
set local lock_timeout = '4s';
delete from platform.client_callable_door where schema_name = 'users' and function_name in ('notion_sync_source_save','notion_sync_source_finish','notion_sync_source_read','notion_sync_sources_for');
drop function if exists users.notion_sync_sources_for(text);
drop function if exists users.notion_sync_source_read(uuid, uuid, uuid);
drop function if exists users.notion_sync_source_finish(uuid, timestamptz, timestamptz, jsonb);
drop function if exists users.notion_sync_source_save(uuid, text, text, text, uuid, uuid, uuid, text, text);
drop table if exists users.notion_sync_source;

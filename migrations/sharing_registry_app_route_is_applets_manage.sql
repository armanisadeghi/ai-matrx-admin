-- sharing_registry_app_route_is_applets_manage.sql
--
-- `platform.shareable_resource_registry` row `app` still advertised `/agent-apps/{id}` after the
-- applets rename (0fe00f4889 moved the route to `/applets/manage/<id>`; `/agent-apps/:id/*` survives
-- only as a permanent redirect in next.config.js). The TS mirror (registry.ts, now package data in
-- @ai-matrx/sharing) already says `/applets/manage/{id}`; the DB is the truth the snapshot mirrors, so
-- the row moves to the route the app actually serves.
--
-- Idempotent: a value-set UPDATE keyed on resource_type.

update platform.shareable_resource_registry
   set url_path_template = '/applets/manage/{id}'
 where resource_type = 'app'
   and url_path_template is distinct from '/applets/manage/{id}';

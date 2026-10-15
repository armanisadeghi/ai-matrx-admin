-- lane: NOTION-PEOPLE
-- lock: custom
-- scope: EXECUTE on custom.published_view_read(text) for service_role only (the /v/<address> route's identity). Nothing else changes.
-- inverse: migrations/inverse/notionpeople_c_a_published_view_read_is_the_servers_to_call_down.sql
--
-- notionpeople_b made the door server_only; custom.reopen_declared_doors() then left no grant at all,
-- so the route's service-role call was refused (42501). The server is the one caller its door row names.
grant execute on function custom.published_view_read(text) to service_role;

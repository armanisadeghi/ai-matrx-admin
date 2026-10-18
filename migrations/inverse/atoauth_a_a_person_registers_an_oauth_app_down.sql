-- INVERSE of atoauth_a_a_person_registers_an_oauth_app.sql. The Supabase OAuth clients the registered apps made stay in
-- auth.oauth_clients; delete them through Supabase's admin API first if they should stop working.
delete from platform.client_callable_door where declared_by = 'migrations/atoauth_a_a_person_registers_an_oauth_app.sql (lane AT-OAUTH)';
drop function if exists iam.oauth_app_scopes(uuid);
drop function if exists iam.oauth_app_consent(uuid);
drop function if exists iam.oauth_app_list();
drop table if exists iam.oauth_app;

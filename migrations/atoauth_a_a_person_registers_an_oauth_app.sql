-- additive: yes
-- AT-OAUTH / Airtable parity "Personal access tokens / OAuth apps". A person registers an OAuth app that other people can
-- authorize against AI Matrx (Supabase's own OAuth 2.1 server, already on: auth.oauth_clients). The client itself is made by
-- aidream through Supabase's admin API (the secret is shown once and never stored here); this table remembers WHO owns it
-- and WHICH data scopes it asked for, because Supabase's OAuth server only knows openid/email/profile/phone.
-- The aidream Tables API reads iam.oauth_app_scopes(client_id) off a verified token's client_id and admits only what the app
-- declared, under the authorizing person's own access. Tokens of clients NOT in this table (the MCP clients, first-party apps)
-- are untouched. Inverse: migrations/inverse/atoauth_a_a_person_registers_an_oauth_app_down.sql

create table iam.oauth_app (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  owner_id uuid not null references iam.users(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 10),
  scopes text[] not null check (cardinality(scopes) >= 1 and scopes <@ array[
    'data.records:read', 'data.records:write', 'schema.bases:read', 'schema.bases:write']::text[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
comment on table iam.oauth_app is 'An OAuth app a person registered (client in auth.oauth_clients) and the data scopes it declared. Written only by aidream (server pool); read by its owner through iam.oauth_app_list and by an authorizing person through iam.oauth_app_consent.';
create index oauth_app_owner_idx on iam.oauth_app (owner_id) where archived_at is null;

alter table iam.oauth_app enable row level security;
revoke all on iam.oauth_app from anon, authenticated;
insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref, type)
values ('iam_oauth_app', 'iam', 'oauth_app', 'OAuth app', 'machinery',
        'Register of person-owned OAuth clients and their declared scopes; written only by aidream, read by people only through iam.oauth_app_list / iam.oauth_app_consent.',
        'iam.oauth_app'::regclass, 'system')
on conflict (token) do nothing;

-- The owner's own apps (never the secret: it is not stored anywhere on our side).
create function iam.oauth_app_list()
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'client_id', a.client_id, 'name', a.name, 'redirect_uris', to_jsonb(a.redirect_uris),
           'scopes', to_jsonb(a.scopes), 'created_at', a.created_at
         ) order by a.created_at desc), '[]'::jsonb)
    from iam.oauth_app a
   where auth.uid() is not null and a.owner_id = auth.uid() and a.archived_at is null;
$function$;

-- What the consent screen says about an app: its name and the data scopes it asked for. Null for a client that is not a
-- registered app (the screen then shows only Supabase's own scopes, as today).
create function iam.oauth_app_consent(p_client_id uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
  select jsonb_build_object('name', a.name, 'scopes', to_jsonb(a.scopes))
    from iam.oauth_app a
   where auth.uid() is not null and a.client_id = p_client_id and a.archived_at is null;
$function$;

-- Server lane: the Tables API asks which scopes a verified token's client_id holds.
-- null = not a registered app (nothing changes for it); [] = the app was archived (refused).
create function iam.oauth_app_scopes(p_client_id uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
  select case when a.archived_at is null then to_jsonb(a.scopes) else '[]'::jsonb end
    from iam.oauth_app a
   where a.client_id = p_client_id;
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   non_client_lane, anonymous_callers, signed_in_callers)
values
  ('iam', 'oauth_app_list', '', array[]::oid[],
   'migrations/atoauth_a_a_person_registers_an_oauth_app.sql (lane AT-OAUTH)',
   'The signed-in person''s own registered OAuth apps (name, client id, redirect addresses, scopes); never a secret, nobody else''s.',
   null, false, true),
  ('iam', 'oauth_app_consent', 'p_client_id uuid', array['uuid'::regtype::oid],
   'migrations/atoauth_a_a_person_registers_an_oauth_app.sql (lane AT-OAUTH)',
   'The consent screen names the app a signed-in person is about to authorize and the data scopes it asked for; answers only the name and scopes, never the owner or redirect addresses.',
   null, false, true),
  ('iam', 'oauth_app_scopes', 'p_client_id uuid', array['uuid'::regtype::oid],
   'migrations/atoauth_a_a_person_registers_an_oauth_app.sql (lane AT-OAUTH)',
   'p_client_id is read off a verified access token; answers the scopes that registered app declared (or null). It names no person and no record.',
   'server_only: the aidream Tables API reads it on the server pool to admit an OAuth app only to what it declared; no client needs it.',
   false, false);

grant execute on function iam.oauth_app_list() to authenticated;
grant execute on function iam.oauth_app_consent(uuid) to authenticated;
grant execute on function iam.oauth_app_scopes(uuid) to service_role;

-- chair-step: CREATES one new table users.notion_sync_source through platform.create_entity_table (organization data class, soft delete on, RLS by iam.apply_rls; its policies take the supautils ACCESS EXCLUSIVE set on auth/storage/realtime until COMMIT, about 1.5 s), REVOKEs INSERT/UPDATE/DELETE on it from anon and authenticated (the doors write it), adds four service_role-only functions and four platform.client_callable_door rows declaring them non-client. No existing function, policy, grant or row is touched. Inverse: migrations/inverse/notionsync_a_a_notion_source_is_remembered_and_synced_down.sql.
-- additive: yes
-- guard: custom/system_enabled
-- lock: platform
-- lane: NOTION-SYNC
--
-- A NOTION DATABASE OR PAGE KEEPS ITS SOURCE. The Notion importer (aidream services/notion_import) writes
-- rows keyed by the "Notion ID" column and pages keyed `notion:<page id>`; nothing remembered WHERE the
-- table came from, who set it up, how far it was last synced, or what the last sync did. This is that:
--
--   users.notion_sync_source        one row per (organization, kind, Notion id): kind 'database' (table_id is
--                                    the AI Matrx table) or 'page' (space_id is the Space); set_by is the person
--                                    unattended syncs and webhooks run as (the synced_tables rule); the vault
--                                    item/field that holds the integration token (never the token); notion_cursor
--                                    (the Notion last_edited_time watermark the next pull asks past), synced_at
--                                    (when WE finished writing: a row of ours edited after it is "ours changed");
--                                    last_report (rows added/updated/archived, conflicts, notices).
--   users.notion_sync_source_save   register / re-register a source (service_role only; aidream is the writer)
--   users.notion_sync_source_finish stamp a finished sync with its cursor, time and report
--   users.notion_sync_source_read   the source of ONE table or space, with its report
--   users.notion_sync_sources_for   every source of one Notion id (what a webhook event is routed by)
-- The sync itself reuses the importer's walker and writer; this adds no parallel sync framework.

do $ns$
begin
  if to_regclass('users.notion_sync_source') is null then
    perform platform.create_entity_table(
      p_schema => 'users', p_table => 'notion_sync_source',
      p_token => 'users_notion_sync_source', p_label => 'Notion sync source',
      p_fields => array[
        'kind text NOT NULL CHECK (kind in (''database'', ''page''))',
        'notion_id text NOT NULL',
        'title text',
        'table_id uuid',
        'space_id uuid',
        'set_by uuid NOT NULL',
        'credential_item_id text',
        'credential_field_id text',
        'notion_cursor timestamptz',
        'synced_at timestamptz',
        'last_report jsonb'
      ],
      p_variant => 'entity',
      p_versioned => false, p_soft_delete => true,
      p_visibility => 'internal',
      p_category => false, p_listed => false, p_org_default => false, p_gin_jsonb => false,
      p_parents => array[]::text[],
      p_data_class => 'organization'::platform.data_class,
      p_default_list_scope => 'organization'::platform.list_scope);
  end if;
end
$ns$;

create unique index if not exists notion_sync_source_one_per_notion_id
  on users.notion_sync_source (organization_id, kind, notion_id) where deleted_at is null;
create index if not exists notion_sync_source_by_notion_id on users.notion_sync_source (notion_id) where deleted_at is null;
create index if not exists notion_sync_source_by_table on users.notion_sync_source (organization_id, table_id) where table_id is not null and deleted_at is null;

revoke insert, update, delete, truncate on users.notion_sync_source from anon, authenticated;

create or replace function users.notion_sync_source_save(
  p_organization_id uuid, p_kind text, p_notion_id text, p_title text, p_table_id uuid, p_space_id uuid,
  p_set_by uuid, p_credential_item_id text, p_credential_field_id text)
 returns uuid
 language plpgsql security definer
 set search_path to 'pg_catalog'
as $function$
declare v_id uuid;
begin
  if p_kind not in ('database', 'page') then raise exception 'A Notion source is a database or a page.' using errcode = '22023'; end if;
  select id into v_id from users.notion_sync_source
   where organization_id = p_organization_id and kind = p_kind and notion_id = p_notion_id and deleted_at is null;
  if v_id is null then
    insert into users.notion_sync_source (organization_id, kind, notion_id, title, table_id, space_id, set_by, credential_item_id, credential_field_id, created_by, updated_by)
    values (p_organization_id, p_kind, p_notion_id, p_title, p_table_id, p_space_id, p_set_by, p_credential_item_id, p_credential_field_id, p_set_by, p_set_by)
    returning id into v_id;
  else
    update users.notion_sync_source
       set title = coalesce(p_title, title), table_id = coalesce(p_table_id, table_id), space_id = coalesce(p_space_id, space_id),
           set_by = p_set_by, credential_item_id = coalesce(p_credential_item_id, credential_item_id),
           credential_field_id = coalesce(p_credential_field_id, credential_field_id), updated_by = p_set_by, updated_at = now()
     where id = v_id;
  end if;
  return v_id;
end
$function$;

create or replace function users.notion_sync_source_finish(p_id uuid, p_cursor timestamptz, p_synced_at timestamptz, p_report jsonb)
 returns void
 language plpgsql security definer
 set search_path to 'pg_catalog'
as $function$
begin
  update users.notion_sync_source
     set notion_cursor = coalesce(p_cursor, notion_cursor), synced_at = p_synced_at, last_report = p_report, updated_at = now()
   where id = p_id and deleted_at is null;
end
$function$;

create or replace function users.notion_sync_source_read(p_organization_id uuid, p_table_id uuid, p_space_id uuid)
 returns jsonb
 language sql security definer stable
 set search_path to 'pg_catalog'
as $function$
  select to_jsonb(s) - 'created_by' - 'updated_by' - 'deleted_at' - 'metadata' - 'shown_to'
    from (select id, organization_id, kind, notion_id, title, table_id, space_id, set_by, credential_item_id, credential_field_id,
                 notion_cursor, synced_at, last_report
            from users.notion_sync_source
           where organization_id = p_organization_id and deleted_at is null
             and ((p_table_id is not null and table_id = p_table_id) or (p_space_id is not null and space_id = p_space_id))
           order by updated_at desc limit 1) s
$function$;

create or replace function users.notion_sync_sources_for(p_notion_id text)
 returns jsonb
 language sql security definer stable
 set search_path to 'pg_catalog'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'organization_id', organization_id, 'kind', kind, 'notion_id', notion_id,
                                               'table_id', table_id, 'space_id', space_id, 'set_by', set_by,
                                               'credential_item_id', credential_item_id, 'credential_field_id', credential_field_id,
                                               'notion_cursor', notion_cursor, 'synced_at', synced_at)), '[]'::jsonb)
    from users.notion_sync_source where notion_id = p_notion_id and deleted_at is null
$function$;

revoke all on function users.notion_sync_source_save(uuid, text, text, text, uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function users.notion_sync_source_finish(uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function users.notion_sync_source_read(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function users.notion_sync_sources_for(text) from public, anon, authenticated;
grant execute on function users.notion_sync_source_save(uuid, text, text, text, uuid, uuid, uuid, text, text) to service_role;
grant execute on function users.notion_sync_source_finish(uuid, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function users.notion_sync_source_read(uuid, uuid, uuid) to service_role;
grant execute on function users.notion_sync_sources_for(text) to service_role;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
 ('users', 'notion_sync_source_save', 'p_organization_id uuid, p_kind text, p_notion_id text, p_title text, p_table_id uuid, p_space_id uuid, p_set_by uuid, p_credential_item_id text, p_credential_field_id text',
  array['uuid'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid],
  'service_role only: it names set_by, the person unattended syncs run as, so a browser must never be able to pick it.',
  'notionsync_a_a_notion_source_is_remembered_and_synced.sql', 'aidream (services/notion_import/sync.py) is the only writer, after it has checked the signed-in person can change the table.', false, false),
 ('users', 'notion_sync_source_finish', 'p_id uuid, p_cursor timestamp with time zone, p_synced_at timestamp with time zone, p_report jsonb',
  array['uuid'::regtype::oid, 'timestamptz'::regtype::oid, 'timestamptz'::regtype::oid, 'jsonb'::regtype::oid],
  'service_role only: stamps a finished sync; a browser must not move the cursor.',
  'notionsync_a_a_notion_source_is_remembered_and_synced.sql', 'aidream sync run and the webhook-driven run are the only callers.', false, false),
 ('users', 'notion_sync_source_read', 'p_organization_id uuid, p_table_id uuid, p_space_id uuid',
  array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid],
  'service_role only: aidream reads a source after proving the caller can open the table; it answers no credential value, only the vault item id.',
  'notionsync_a_a_notion_source_is_remembered_and_synced.sql', 'aidream GET /notion-import/sync/{table} is the transport.', false, false),
 ('users', 'notion_sync_sources_for', 'p_notion_id text',
  array['text'::regtype::oid],
  'service_role only: routes a signed Notion webhook event to every table that follows that Notion id, across organizations, so it can never be a signed-in door.',
  'notionsync_a_a_notion_source_is_remembered_and_synced.sql', 'The signed webhook receiver in aidream is the only caller; the Notion signature is the credential.', false, false)
on conflict do nothing;

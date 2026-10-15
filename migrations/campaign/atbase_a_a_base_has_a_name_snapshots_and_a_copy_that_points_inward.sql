-- chair-step: CREATES custom.base ("Base", the identity of a Home's group of tables) and custom.base_snapshot ("Base snapshot") through platform.create_entity_table (organization data class, soft delete, RLS by iam.apply_rls), widens custom.synced_source.source_kind with airtable_base and google_sheets, writes the retention policy row for snapshots, and adds ONE client door custom.base_copy_finish with its platform.client_callable_door row and argument rulings. Inverse: db/migrations/inverse/inv_atbase_a_a_base_has_a_name_snapshots_and_a_copy_that_points_inward.sql.
-- guard: custom/system_enabled
-- lock: custom
-- lane: AT-BASE
--
-- BASE. A Home (an organization, project or record that tables live under: custom.table.home_id) is also a Base
-- when it has a row in custom.base: its name, icon, color and description. One live base per (organization, home).
-- No door: the table is an entity table, so people read and write it through row security like every other.
--   home_id      the Home record this base is the identity of (custom.record id).
--   name/icon/color/description   the identity a Base page shows.
--   template     where it began: blank, a template's name, "described" (made by the Ask agent), "airtable", "duplicate".
--   snapshot_schedule  {"enabled": false, "every": "weekly"}: born OFF; a person turns it on. The schedule is a setting here;
--                      the platform scheduler runs it (nothing runs it until a person enables it).
--
-- BASE SNAPSHOT. A snapshot is the base's tables copied, with records, by the ONE copy engine (custom.table_duplicate,
-- in passes), kept out of every list (kept_for 'snapshot'); this row names them. RESTORE is a duplicate of those copies
-- into a NEW base: nothing is ever overwritten.
--   base_id         the custom.base row.     label  what the person called it, or the time.
--   origin          manual | schedule.       tables [{"table_id": <source>, "snapshot_table_id": <copy>, "name": …, "records": n}]
--   expires_at      when retention lets it go: the retention policy row below purges it that many days after it is trashed.
--
-- THE COPY'S LAST STEP. custom.table_duplicate copies one table; a column that links to ANOTHER table still points at the
-- original. custom.base_copy_finish(p_organization_id, p_pairs {old table id: its copy's id}) re-points, inside the copy,
-- every link column's target and every link cell whose row was copied too. It only touches tables this person copied
-- (history.migration_log, verb duplicate, by this person, duplicated_from = the old id).

set local lock_timeout = '3s';
set local statement_timeout = '60s';

alter table custom.synced_source drop constraint synced_source_source_kind_check;
alter table custom.synced_source add constraint synced_source_source_kind_check check (source_kind = any (array[
  'notion_database','notion_page','notion_mapped','gmail','search','scraper','connector','airtable_base','google_sheets']::text[]));

set local check_function_bodies = off;

create function custom.base_copy_finish(p_organization_id uuid, p_pairs jsonb)
 returns jsonb
 language plpgsql security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_me uuid := custom.query_principal();
  v_old text;
  v_new uuid;
  v_fields integer := 0;
  v_cells integer := 0;
  v_n integer;
  f record;
  r record;
  v_val jsonb;
  v_next jsonb;
  v_key text;
  v_item jsonb;
  v_out jsonb;
  v_target text;
  v_target_copy uuid;
  v_nid uuid;
begin
  if v_me is null then raise exception 'Sign in to finish a base copy.' using errcode = '42501'; end if;
  if p_organization_id is null or p_pairs is null or jsonb_typeof(p_pairs) <> 'object' then
    raise exception 'Say the organization and which tables were copied.' using errcode = '22004';
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.base_copy_finish');
  perform custom.assert_store_door(p_organization_id, 'custom.base_copy_finish');
  if not iam.is_org_member(v_me, p_organization_id) then
    raise exception 'You are not a member of that organization.' using errcode = '42501';
  end if;
  for v_old, v_new in select k, (v #>> '{}')::uuid from jsonb_each(p_pairs) e(k, v) loop
    if not exists (select 1 from history.migration_log m
                    where m.organization_id = p_organization_id and m.verb = 'duplicate' and m.target_kind = 'table'
                      and m.target_id = v_new and m.inverse ->> 'by' = v_me::text and m.inverse ->> 'duplicated_from' = v_old) then
      raise exception 'That table is not a copy you made, so its links were left alone.' using errcode = '42501';
    end if;
  end loop;

  -- 1. the link columns of every copy: their target moves to the target's copy
  for f in
    select fr.id, fr.data from custom.record fr
     where fr.organization_id = p_organization_id and fr.table_id = custom.field_kernel_id() and fr.data_class <> 'kernel'
       and fr.deleted_at is null
       and fr.data ->> 'entity_definition_id' in (select (v #>> '{}') from jsonb_each(p_pairs) e(k, v))
       and p_pairs ? (fr.data ->> 'relation_target')
  loop
    update custom.record set data = jsonb_set(data, '{relation_target}', p_pairs -> (f.data ->> 'relation_target'))
     where id = f.id and organization_id = p_organization_id;
    v_fields := v_fields + 1;
  end loop;

  -- 2. the link cells: a row id the far copy also holds becomes that copy's row id (custom._duplicate_id, never stored)
  for f in
    select (fr.data ->> 'entity_definition_id')::uuid as table_id, fr.data ->> 'key' as key, fr.data ->> 'relation_target' as target
      from custom.record fr
     where fr.organization_id = p_organization_id and fr.table_id = custom.field_kernel_id() and fr.data_class <> 'kernel'
       and fr.deleted_at is null and fr.data ->> 'relation_target' is not null
       and fr.data ->> 'entity_definition_id' in (select (v #>> '{}') from jsonb_each(p_pairs) e(k, v))
       and exists (select 1 from jsonb_each(p_pairs) e(k, v) where (v #>> '{}') = fr.data ->> 'relation_target')
  loop
    -- f.target is already the far COPY's id after step 1
    v_target_copy := f.target::uuid;
    for r in
      select rec.id, rec.data -> f.key as val from custom.record rec
       where rec.organization_id = p_organization_id and rec.table_id = f.table_id and rec.deleted_at is null
         and rec.data ? f.key and jsonb_typeof(rec.data -> f.key) in ('string', 'array')
    loop
      v_val := r.val;
      if jsonb_typeof(v_val) = 'string' then
        v_nid := custom._duplicate_id(v_target_copy, (v_val #>> '{}')::uuid);
        if exists (select 1 from custom.record t where t.organization_id = p_organization_id and t.table_id = v_target_copy and t.id = v_nid) then
          v_next := to_jsonb(v_nid::text);
        else
          v_next := v_val;
        end if;
      else
        v_next := '[]'::jsonb;
        for v_item in select x from jsonb_array_elements(v_val) x loop
          if jsonb_typeof(v_item) = 'string' and (v_item #>> '{}') ~ '^[0-9a-f-]{36}$' then
            v_nid := custom._duplicate_id(v_target_copy, (v_item #>> '{}')::uuid);
            v_next := v_next || to_jsonb(case when exists (select 1 from custom.record t where t.organization_id = p_organization_id
                                                             and t.table_id = v_target_copy and t.id = v_nid)
                                              then v_nid::text else (v_item #>> '{}') end);
          else
            v_next := v_next || v_item;
          end if;
        end loop;
      end if;
      if v_next is distinct from v_val then
        update custom.record set data = jsonb_set(data, array[f.key], v_next) where id = r.id and organization_id = p_organization_id;
        v_cells := v_cells + 1;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('relinked_columns', v_fields, 'relinked_cells', v_cells);
end
$function$;

-- grants are the door row's: platform.reopen_declared_doors opens exactly the lanes it declares.

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
 ('custom', 'base_copy_finish', 'p_organization_id uuid, p_pairs jsonb',
  array['uuid'::regtype::oid, 'jsonb'::regtype::oid],
  'the last step of "Duplicate base": a person who copied tables inside one base points the copies at each other. Reads and writes only tables this person copied (the migration log says so).',
  'atbase_a_a_base_has_a_name_snapshots_and_a_copy_that_points_inward.sql',
  null, true, false,
  jsonb_build_object('version', 1, 'declared_by', 'atbase_a_a_base_has_a_name_snapshots_and_a_copy_that_points_inward.sql',
    'declared_at', '2026-10-15 lane AT-BASE, read from the body',
    'arguments', jsonb_build_object(
      'p_organization_id', jsonb_build_object('position', 1, 'type', 'uuid', 'entity', 'organization', 'optional', false,
        'check', 'the caller must be a member (iam.is_org_member) and the store door open for it, else 42501',
        'null_rule', jsonb_build_object('means', 'refused, 22004'),
        'foreign', jsonb_build_object('note', 'a stranger organization answers 42501, the same as an organization that does not exist', 'same_as_invented', true),
        'verified', 'pending: rolled-back proof (draft)'),
      'p_pairs', jsonb_build_object('position', 2, 'type', 'jsonb', 'entity', 'custom_record', 'optional', false,
        'check', 'an object {old table id: its copy''s id}; every pair must be a copy THIS person made by custom.table_duplicate from that old table (history.migration_log), else 42501 and nothing changes',
        'null_rule', jsonb_build_object('means', 'refused, 22004'),
        'foreign', jsonb_build_object('note', 'a table id that is not this person''s copy is refused with the same sentence whether it exists or not', 'same_as_invented', true),
        'verified', 'pending: rolled-back proof (draft)'))));

-- Born in `users`, moved to `custom` in the same transaction (the provisioner's door re-open in `custom` is cancelled by
-- ops.auth_lock_watchdog; see syncedsrc_a). SET SCHEMA is catalogue-only.
-- ── the two entity tables ────────────────────────────────────────────────────────────────────

select platform.create_entity_table(
  p_schema => 'users', p_table => 'base', p_token => 'custom_base', p_label => 'Base',
  p_fields => array[
    'home_id uuid NOT NULL',
    'name text NOT NULL',
    'icon text',
    'color text',
    'description text',
    'template text',
    'snapshot_schedule jsonb NOT NULL DEFAULT ''{"enabled": false, "every": "weekly"}''::jsonb'
  ],
  p_variant => 'entity', p_versioned => false, p_soft_delete => true,
  p_visibility => 'internal', p_category => false, p_listed => false, p_org_default => false, p_gin_jsonb => false,
  p_parents => array[]::text[],
  p_data_class => 'organization'::platform.data_class,
  p_default_list_scope => 'organization'::platform.list_scope);
alter table users.base set schema custom;
create unique index base_one_per_home on custom.base (organization_id, home_id) where deleted_at is null;

select platform.create_entity_table(
  p_schema => 'users', p_table => 'base_snapshot', p_token => 'custom_base_snapshot', p_label => 'Base snapshot',
  p_fields => array[
    'base_id uuid NOT NULL REFERENCES custom.base(id)',
    'label text NOT NULL',
    'origin text NOT NULL DEFAULT ''manual'' CHECK (origin in (''manual'', ''schedule''))',
    'tables jsonb NOT NULL DEFAULT ''[]''::jsonb',
    'expires_at timestamptz'
  ],
  p_variant => 'entity', p_versioned => false, p_soft_delete => true,
  p_visibility => 'internal', p_category => false, p_listed => false, p_org_default => false, p_gin_jsonb => false,
  p_parents => array[]::text[],
  p_data_class => 'organization'::platform.data_class,
  p_default_list_scope => 'organization'::platform.list_scope);
alter table users.base_snapshot set schema custom;
create index base_snapshot_by_base on custom.base_snapshot (base_id, organization_id);

-- RETENTION: a snapshot a person trashed is purged 90 days later; the policy row is the rule, there is no purge job here.
insert into platform.retention_policy (organization_id, scope, entity_token, trigger_kind, mode, retention_days, archive_tier, legal_hold, priority, enabled, label, description, basis, set_by, review_due)
values ('39c38960-d30c-4840-b0c1-c9960de95582', 'entity', 'custom_base_snapshot', 'soft_deleted', 'purge', 90, 'instant', false, 0, true, 'Base snapshot retention',
        'Purges a base snapshot 90 days after it was trashed; a snapshot is a copy of a base, so the copy it names is trashed with it.',
        'Agent-set (lane AT-BASE, 2026-10-15): Airtable keeps snapshots for a similar span; a trashed snapshot stays restorable for a quarter.', 'agent', '2026-12-15');

-- based-on: custom.table_sync(uuid, uuid, jsonb) f2ab1e2a1e2d5288c8a6582218ae65c4638578f6a0c7f30610fec8b505844061
-- A SYNCED TABLE'S REFRESH NEVER ARCHIVES THE TABLE UNASKED (review 7 of the archive door, B-I1).
--
-- custom.table_sync (Google Sheets, CSV links, outside Postgres, view copies through custom.table_copy_sync, and the
-- scheduled refresh) archived every row its source no longer listed, with no second layer: a sheet whose data rows
-- were cleared archived the whole table on the next hourly refresh. Its archive step now decides through
-- custom.archive_guard_decide (aidream db/migrations/1499 — the ONE rule every sync archives by, with the knobs
-- records.mapped_sync/max_archive_share and archive_window_hours) and keeps the hold and the archive history on the
-- table's sync_source. Everything else the body did is unchanged (live body read 2026-10-19, hash above).
--
-- custom.archive_hold_answer is the person's answer from the table bar, for every synced table:
--   'keep'    remembered per held fingerprint on the table (sync_source.archive_kept) and on its custom.synced_source
--             rows (last_report.archive_kept, kept by synced_source_finish), so every device agrees and a later,
--             different hold still asks;
--   'archive' (a table_sync table) records the yes for exactly those rows (sync_source.archive_yes); the next refresh,
--             which the bar runs at once, archives them, and spends the yes.

CREATE OR REPLACE FUNCTION custom.table_sync(p_organization_id uuid, p_home_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_src      jsonb := p_spec -> 'source';
  v_system   text;
  v_table    uuid;
  v_created  boolean := false;
  v_col      text;
  v_key      text;
  v_keys     jsonb := '{}'::jsonb;      -- header -> field key
  v_added    integer := 0;
  v_row      jsonb;
  v_vals     jsonb;
  v_rid      uuid;
  v_ins      integer := 0;
  v_upd      integer := 0;
  v_arch     integer := 0;
  v_seen     text[] := '{}';
  v_max      integer := coalesce((platform.knob_resolve('custom', 'table_sync_rows_max', p_organization_id) #>> '{}')::integer, 20000);
  v_old      record;
  v_have     jsonb;
  v_hit      jsonb;
  v_kept     integer := 0;
  v_cspec    jsonb;
  v_type     text;
  v_restored integer := 0;
  v_total    integer := 0;
  v_warn     jsonb := '[]'::jsonb;
  v_said     text;
  -- THE ARCHIVE GUARD (aidream migration 1499, custom.archive_guard_decide): the rule every sync archives by.
  v_live_before integer := 0;
  v_gone_ids    uuid[] := '{}';
  v_gone_refs   text[] := '{}';
  v_guard       jsonb;
  v_log         jsonb;
  v_prev        jsonb;
  v_held        integer := 0;
  v_token       text;
  v_across      boolean := false;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_sync');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_sync');

  if jsonb_typeof(v_src) is distinct from 'object' or nullif(v_src ->> 'provider', '') is null
     or nullif(v_src ->> 'external_id', '') is null then
    raise exception 'A synced table says where it comes from: a provider and the source''s own id.'
      using errcode = '22023', hint = 'spec.source = {"provider": "google_sheets", "external_id": "<sheet id>", "tab_id": "<tab>"}. Nothing was written.';
  end if;
  if jsonb_typeof(p_spec -> 'columns') is distinct from 'array' or jsonb_array_length(p_spec -> 'columns') = 0 then
    raise exception 'A synced table needs the source''s columns.' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_spec -> 'rows', '[]'::jsonb)) > v_max then
    raise exception 'This refresh carries % rows; one refresh carries at most %.', jsonb_array_length(p_spec -> 'rows'), v_max
      using errcode = '54000', hint = 'Refresh in parts. The ceiling is the organization knob custom/table_sync_rows_max. Nothing was written.';
  end if;
  -- What the archive guard keeps on the table is the server's, never the caller's: a spec cannot carry it.
  v_src := v_src - 'archive_log' - 'archive_kept' - 'archive_yes' - 'archive_held' - 'archive_confirm' - 'archive_across_runs';
  v_system := format('sync:%s:%s:%s', v_src ->> 'provider', v_src ->> 'external_id', coalesce(v_src ->> 'tab_id', ''));

  -- AN OUTSIDE DATABASE IS SYNCED BY THE SERVER ONLY (lane VISION-REACH wave 3). Its rows come from
  -- a connection held sealed in the vault, read by the server; a client sending them would be
  -- writing "outside" values of its own choosing into columns nobody may edit. A sheet tab is still
  -- synced from a client (records grid.ts sheetSyncSpec), so this is the postgres provider only.
  if v_src ->> 'provider' = 'postgres' and platform.is_client_channel() then
    raise exception 'A table synced from an outside database is refreshed by AI Matrx, not from here.'
      using errcode = '42501', hint = 'Press Refresh on the table. Nothing was written.';
  end if;
  -- ONE SYNC OF ONE SOURCE AT A TIME: two people opening the table together must not both add the
  -- same new rows (this door looks rows up, then writes them).
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || '|' || v_system, 0));

  -- 1 — the Table, found again by its source.
  select t.id into v_table from custom.record t
   where t.organization_id = p_organization_id and t.table_id = custom.table_kernel_id()
     and t.data_class = 'table' and t.deleted_at is null
     and t.data -> 'sync_source' ->> 'provider' = v_src ->> 'provider'
     and t.data -> 'sync_source' ->> 'external_id' = v_src ->> 'external_id'
     and coalesce(t.data -> 'sync_source' ->> 'tab_id', '') = coalesce(v_src ->> 'tab_id', '')
   limit 1;
  if v_table is null then
    -- a column is its name, or {name, type, config} (VISION-REACH wave 3: an outside database's types)
    v_key := regexp_replace(lower(btrim(coalesce(p_spec -> 'columns' -> 0 ->> 'name', p_spec -> 'columns' ->> 0))), '[^a-z0-9]+', '_', 'g');
    v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');
    if v_key !~ '^[a-z]' then v_key := 'f_' || v_key; end if;
    v_key := left(v_key, 48);
    v_table := custom.table_declare(p_organization_id, jsonb_build_object(
      'name', coalesce(nullif(btrim(p_spec ->> 'table_name'), ''), 'Synced sheet'),
      'slug', 'sync_' || left(md5(v_system), 12),
      'type', 'entity', 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted',
      'label_singular', 'Row', 'label_plural', 'Rows', 'title_field', v_key,
      'agent_writable', true, 'retention_days', 3650,
      'default_sort', jsonb_build_array(jsonb_build_object('field', v_key, 'direction', 'asc')),
      'parent_id', p_home_id::text,
      'fields', jsonb_build_array(jsonb_build_object('name', v_key))));
    v_created := true;
  else
    perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.table_sync',
                                            'admin'::public.permission_level, 'table');
  end if;
  update custom.record set data = jsonb_set(data, '{sync_source}',
      -- LANE SYNC-AIRTABLE: what a PERSON set on the table (auto-refresh, write-back, who it runs as)
      -- survives a refresh whose source does not carry it.
      coalesce((select jsonb_object_agg(k, data -> 'sync_source' -> k)
                  from unnest(array['auto_refresh', 'write_back', 'set_by', 'archive_log', 'archive_kept', 'archive_yes',
                                    'archive_held', 'archive_confirm', 'archive_across_runs']) k
                 where data -> 'sync_source' ? k and not v_src ? k), '{}'::jsonb) || v_src, true)
   where organization_id = p_organization_id and id = v_table and table_id = custom.table_kernel_id();
  -- THE ONE WRITER OF SYNCED COLUMNS. custom._field_write_door refuses every other change to a Field
  -- with source 'synced' and every new row of a synced Table; this door's own writes to THIS Table
  -- pass. Transaction-local, set here and cleared before returning; set_config is no client door.
  perform set_config('app.table_sync_writing', v_table::text, true);

  -- 2 — the source's columns. A column the person added here is never touched.
  for v_cspec in select e from jsonb_array_elements(p_spec -> 'columns') e loop
    -- A column is its name (a sheet) or {name, type, config} (an outside database): number, datetime and
    -- boolean keep their type so the store can add, sort and date them; anything else is text.
    v_col := case when jsonb_typeof(v_cspec) = 'object' then v_cspec ->> 'name' else v_cspec #>> '{}' end;
    v_type := case when jsonb_typeof(v_cspec) = 'object' and v_cspec ->> 'type' in ('number', 'datetime', 'boolean')
                   then v_cspec ->> 'type' else 'text' end;
    v_key := regexp_replace(lower(btrim(v_col)), '[^a-z0-9]+', '_', 'g');
    v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');
    if v_key !~ '^[a-z]' then v_key := 'f_' || v_key; end if;
    v_key := left(v_key, 48);
    v_keys := v_keys || jsonb_build_object(v_col, v_key);
    if not exists (select 1 from custom.record f
                    where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                      and f.data_class = 'field' and f.deleted_at is null
                      and f.data ->> 'entity_definition_id' = v_table::text and f.data ->> 'key' = v_key
                      and not coalesce((f.data ->> 'declared_with_table')::boolean, false)) then
      perform custom.field_declare(p_organization_id, v_table, jsonb_build_object(
        'key', v_key, 'label', btrim(v_col), 'type', v_type, 'source', 'synced')
        || case when jsonb_typeof(v_cspec -> 'config') = 'object'
                then jsonb_build_object('config', v_cspec -> 'config') else '{}'::jsonb end);
      v_added := v_added + 1;
    end if;
  end loop;

  -- 3 — every row, found again by its reference (read once: a lookup per row is quadratic). The
  --     reference is the server's: one key column is its own text, a composite key is a JSON array
  --     of its parts (aidream services/external_databases row_ref), so ('x|y','z') and ('x','y|z')
  --     are two rows.
  -- the rows this table held from the source BEFORE this refresh wrote anything: what the archive guard decides from
  select count(*) into v_live_before from custom.record r
   where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
     and r.deleted_at is null and r.metadata ->> 'source_system' = v_system;
  select coalesce(jsonb_object_agg(q.ref, jsonb_build_object('id', q.id, 'archived', q.archived)), '{}'::jsonb)
    into v_have
    from (select distinct on (r.metadata ->> 'source_id') r.metadata ->> 'source_id' as ref, r.id,
                 (r.deleted_at is not null) as archived
            from custom.record r
           where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
             and r.metadata ->> 'source_system' = v_system
           order by r.metadata ->> 'source_id', r.deleted_at nulls first, r.created_at) q;
  for v_row in select e from jsonb_array_elements(coalesce(p_spec -> 'rows', '[]'::jsonb)) e loop
    if nullif(v_row ->> 'ref', '') is null then
      raise exception 'A synced row says which row of the source it is.' using errcode = '22023',
        hint = 'rows[].ref is the source''s own row reference. Nothing was written.';
    end if;
    if (v_row ->> 'ref') = any (v_seen) then
      -- TWO OUTSIDE ROWS WITH ONE REFERENCE cannot both be one row here: the first is kept and
      -- the person is told (nothing fails silently). With a collision-free reference this names
      -- a real duplicate in the outside table, which is theirs to look at.
      v_warn := v_warn || to_jsonb(format('Two outside rows share the reference %s; only the first was synced.', v_row ->> 'ref'));
      continue;
    end if;
    v_seen := v_seen || (v_row ->> 'ref');
    select coalesce(jsonb_object_agg(v_keys ->> k, x.v), '{}'::jsonb) into v_vals
      from jsonb_each(coalesce(v_row -> 'values', '{}'::jsonb)) x(k, v)
     where v_keys ? x.k;
    v_hit := v_have -> (v_row ->> 'ref');
    v_rid := (v_hit ->> 'id')::uuid;
    if v_rid is not null and (v_hit ->> 'archived')::boolean then
      -- A REFRESH REPAIRS (lane VISION-REACH wave 3, verifier 2026-10-03). A row archived here that
      -- the outside table still holds is brought back and given the outside values: the outside
      -- table is the one truth about which rows exist, and deleting here is refused anyway
      -- (custom.record_delete). It was "archived stays archived", which left a hidden row that
      -- no Refresh would ever mend. A restore the store refuses is SAID, never swallowed.
      begin
        perform custom.record_restore(p_organization_id, v_rid);
        perform custom.record_update(p_organization_id, v_rid, v_vals);
        v_have := v_have || jsonb_build_object(v_row ->> 'ref', jsonb_build_object('id', v_rid, 'archived', false));
        v_restored := v_restored + 1;
      exception when others then
        get stacked diagnostics v_said = message_text;
        v_warn := v_warn || to_jsonb(format('The outside row %s is archived here and could not be brought back: %s', v_row ->> 'ref', v_said));
        v_kept := v_kept + 1;
      end;
    elsif v_rid is null then
      v_rid := custom.record_write(p_organization_id, v_table, v_vals);
      update custom.record set metadata = coalesce(metadata, '{}'::jsonb)
                                          || jsonb_build_object('source_system', v_system, 'source_id', v_row ->> 'ref')
       where organization_id = p_organization_id and id = v_rid;
      v_have := v_have || jsonb_build_object(v_row ->> 'ref', jsonb_build_object('id', v_rid, 'archived', false));
      v_ins := v_ins + 1;
    else
      perform custom.record_update(p_organization_id, v_rid, v_vals);
      v_upd := v_upd + 1;
    end if;
  end loop;

  -- 4 — a row gone from the source is ARCHIVED, never destroyed: somebody may have written a
  --     note against it, and custom.record_restore brings it back.
  --     THE SECOND LAYER (review 7, B-I1): a sheet whose rows were cleared, a fresh copy, an outside table read
  --     mid-reload answers with few or no rows. More than the share of this table (or all of it, or that much over the
  --     window's earlier refreshes) is HELD — nothing archived — until the person's yes names exactly these rows:
  --     spec.confirm_archive, or sync_source.archive_yes set by custom.archive_hold_answer. The rule is
  --     custom.archive_guard_decide, the same one aidream's syncs use. This refresh already holds the per-source lock.
  select coalesce(array_agg(r.id order by r.id), '{}'), coalesce(array_agg(r.metadata ->> 'source_id'), '{}')
    into v_gone_ids, v_gone_refs
    from custom.record r
   where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
     and r.deleted_at is null and r.metadata ->> 'source_system' = v_system
     and not ((r.metadata ->> 'source_id') = any (v_seen));
  select t.data -> 'sync_source' into v_prev from custom.record t
   where t.organization_id = p_organization_id and t.id = v_table and t.table_id = custom.table_kernel_id();
  v_log := case when jsonb_typeof(v_prev -> 'archive_log') = 'array' then v_prev -> 'archive_log' else '[]'::jsonb end;
  v_guard := custom.archive_guard_decide(p_organization_id, v_live_before, v_gone_refs,
               nullif(concat_ws(',', nullif(p_spec ->> 'confirm_archive', ''), nullif(v_prev ->> 'archive_yes', '')), ''),
               v_log, now());
  v_held := coalesce((v_guard ->> 'held')::integer, 0);
  if v_held > 0 then
    v_token := v_guard ->> 'confirm';
    v_across := coalesce((v_guard ->> 'across_runs')::boolean, false);
  else
    for v_old in select unnest(v_gone_ids) as id loop
      perform custom.record_delete(p_organization_id, v_old.id);
      v_arch := v_arch + 1;
    end loop;
    if v_arch > 0 then
      v_log := custom.archive_guard_log_add(v_log, jsonb_build_object('at', now(), 'archived', v_arch,
                 'live_before', v_live_before, 'confirmed', coalesce((v_guard ->> 'confirmed')::boolean, false)),
                 p_organization_id, now());
    end if;
  end if;
  -- the hold (or its absence) and the history stay on the table, so the bar asks after a reload and every device agrees
  update custom.record set data = jsonb_set(data, '{sync_source}',
      (coalesce(data -> 'sync_source', '{}'::jsonb) - 'archive_yes' - 'archive_held' - 'archive_confirm' - 'archive_across_runs')
      || jsonb_build_object('archive_log', v_log)
      || case when v_held > 0 then jsonb_build_object('archive_held', v_held, 'archive_confirm', v_token,
                                                     'archive_across_runs', v_across) else '{}'::jsonb end, true)
   where organization_id = p_organization_id and id = v_table and table_id = custom.table_kernel_id();

  perform set_config('app.table_sync_writing', '', true);
  -- HONEST COUNTS: what is live here now, and everything this refresh could not reconcile.
  select count(*) into v_total from custom.record r
   where r.organization_id = p_organization_id and r.table_id = v_table and r.data_class = 'record'
     and r.deleted_at is null and r.metadata ->> 'source_system' = v_system;
  return jsonb_build_object('table_id', v_table, 'created', v_created, 'fields_added', v_added,
    'rows_inserted', v_ins, 'rows_updated', v_upd, 'rows_archived', v_arch, 'rows_restored', v_restored,
    'rows_kept_archived', v_kept, 'rows_total', v_total, 'warnings', v_warn,
    'source_system', v_system, 'rows_held', v_held, 'archive_confirm', v_token, 'archive_across_runs', v_across);
end
$function$
;

create or replace function custom.archive_hold_answer(p_organization_id uuid, p_table_id uuid, p_answer text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_src     jsonb;
  v_sources integer := 0;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.archive_hold_answer');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.archive_hold_answer');
  if p_answer is null or p_answer not in ('keep', 'archive') then
    raise exception 'The answer to a held archive is keep or archive, not "%".', p_answer using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null or p_token !~ '^\d+:[0-9a-f]{12}$' then
    raise exception 'The answer names the held rows by their confirmation (count:fingerprint).' using errcode = '22023';
  end if;
  select t.data -> 'sync_source' into v_src from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if not found then
    raise exception 'There is no table with that id here.' using errcode = '22023';
  end if;
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.archive_hold_answer',
                                          'editor'::public.permission_level, 'table');
  if jsonb_typeof(v_src) = 'object' then
    update custom.record set data = jsonb_set(data, '{sync_source}', v_src || case p_answer
             when 'keep' then jsonb_build_object('archive_kept', p_token)
             else jsonb_build_object('archive_yes', p_token) end, true)
     where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();
  end if;
  if p_answer = 'keep' then
    update custom.synced_source set last_report = coalesce(last_report, '{}'::jsonb) || jsonb_build_object('archive_kept', p_token),
                                    updated_at = now()
     where organization_id = p_organization_id and target = p_table_id and deleted_at is null;
    get diagnostics v_sources = row_count;
  elsif jsonb_typeof(v_src) is distinct from 'object' then
    raise exception 'This table archives through its own Sync now; press Archive there.' using errcode = '22023';
  end if;
  return jsonb_build_object('answer', p_answer, 'token', p_token, 'table', jsonb_typeof(v_src) = 'object', 'sources', v_sources);
end
$function$;

comment on function custom.archive_hold_answer(uuid, uuid, text, text) is
  'The person''s answer to a held archive of a synced table (review 7): keep is remembered per fingerprint on the table '
  'and its synced sources; archive records the yes the next custom.table_sync spends.';

insert into platform.client_callable_door (
  schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane,
  signed_in_callers, anonymous_callers, argument_rules
)
select 'custom', 'archive_hold_answer', 'p_organization_id uuid, p_table_id uuid, p_answer text, p_token text',
       array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid]::oid[],
       'p_organization_id is checked by custom.assert_store_door and custom.assert_client_may_reach first; p_table_id must be a live Table of that organization and is asked custom.assert_client_may_change at editor before anything is written. Only sync_source.archive_kept / archive_yes on that table and last_report.archive_kept on its own synced sources change.',
       '20261019130000_a_synced_table_refresh_never_archives_the_table_unasked.sql', null, true, false,
       jsonb_build_object('version', 1, 'declared_at', '2026-10-19 archive guard review 7',
         'declared_by', '20261019130000_a_synced_table_refresh_never_archives_the_table_unasked.sql',
         'arguments', jsonb_build_object(
           'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'entity', 'organization',
             'check', 'this body decides it with custom.assert_store_door(arg1), custom.assert_client_may_reach(arg1) — the organization wall — a non-member is refused before anything is read, and that call stands before every other use of this argument in the body.',
             'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
             'verified', '2026-10-19 archive guard review 7 — written with this body'),
           'p_table_id', jsonb_build_object('type', 'uuid', 'position', 2, 'entity', 'custom_record',
             'check', 'looked up only inside arg1 as a live Table; then custom.assert_client_may_change(arg1, arg2, editor) before any write.',
             'foreign', jsonb_build_object('sqlstate', '22023', 'same_as_invented', true),
             'verified', '2026-10-19 archive guard review 7 — written with this body')))
where not exists (select 1 from platform.client_callable_door d
                   where d.schema_name = 'custom' and d.function_name = 'archive_hold_answer');

grant execute on function custom.archive_hold_answer(uuid, uuid, text, text) to authenticated, service_role;

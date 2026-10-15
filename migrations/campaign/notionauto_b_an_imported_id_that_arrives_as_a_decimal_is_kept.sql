-- target: branch,production
-- additive: yes
-- NOTION-AUTO (2026-10-14), part b — AN IMPORTED ID THAT ARRIVES AS 10.0 IS KEPT AS 10.
-- MEASURED through the Notion importer (live, admin): a Launch Posts export's IDs 10..40 came out 1..4. The
-- importer's number parser hands a column 10.0, so the stash custom.field_make_automatic makes
-- (whole-number values only) skipped every row. The door now accepts a whole number written as 10.0 and sets it aside
-- as the integer 10. Replaces the body of custom.field_make_automatic only (the one notionauto_a file created).
-- Inverse: migrations/inverse/notionauto_b_an_imported_id_that_arrives_as_a_decimal_is_kept_down.sql
-- guard: custom/system_enabled
-- lock: custom
-- lane: NOTION-AUTO
-- based-on: custom.field_make_automatic(uuid, uuid, text) d3d282829daf929bc2365d1bf601f637c8ff79dd22cd0c6c25b2fa4a3e5aeb51

create or replace function custom.field_make_automatic(p_organization_id uuid, p_field_id uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_field   jsonb;
  v_table   uuid;
  v_key     text;
  v_kind    text := lower(btrim(coalesce(p_kind, '')));
  v_was_gun text := nullif(current_setting('app.relabel_keeps_updated_at', true), '');
  r         record;
  v_ts      timestamptz;
  v_raw     text;
  v_kept    integer := 0;
  v_left    integer := 0;
  v_back    jsonb := '{}'::jsonb;
  v_imported integer := 0;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.field_make_automatic');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_make_automatic');
  v_kind := case v_kind when 'created' then 'created_time' when 'last_edited_time' then 'modified_time'
                        when 'last_modified_time' then 'modified_time' when 'modified' then 'modified_time'
                        when 'last_edited_by' then 'modified_by' when 'last_modified_by' then 'modified_by'
                        when 'auto_number' then 'autonumber' when 'unique_id' then 'autonumber' else v_kind end;
  if v_kind not in ('autonumber', 'created_time', 'modified_time', 'created_by', 'modified_by') then
    raise exception '"%" is not a column that fills itself in.', coalesce(p_kind, '')
      using errcode = '23514', hint = 'Say autonumber, created_time, modified_time, created_by or modified_by. Nothing was changed.';
  end if;
  select f.data, (f.data ->> 'entity_definition_id')::uuid into v_field, v_table
    from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_field is null then
    raise exception 'That column is not a column of this organization.'
      using errcode = '23503', hint = 'Nothing was changed.';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.field_make_automatic',
                                          'editor'::public.permission_level, 'table');
  v_key := v_field ->> 'key';
  if custom.field_kind_of(v_field) = v_kind then
    return jsonb_build_object('field_id', p_field_id, 'kind', v_kind, 'changed', false,
      'says', 'That column already fills itself in that way; nothing was changed.');
  end if;
  if coalesce(v_field -> 'config' ->> 'system', '') <> '' or custom.parity_type(v_field) in ('lookup', 'rollup', 'formula', 'count') then
    raise exception '"%" is already worked out by the store, so it cannot be converted.',
                    coalesce(nullif(v_field ->> 'label', ''), v_key)
      using errcode = '23514', hint = 'Add a new column of that kind instead. Nothing was changed.';
  end if;

  -- Converting a column is not an edit of any record: updated_at stays where it was (and a
  -- Last edited time column takes its value from the old column below).
  perform set_config('app.relabel_keeps_updated_at', 'on', true);

  -- The two stamps live on the record itself: the old column's value moves there, the key leaves
  -- the record. A value that is not a moment stays in the record, and the retype below sets it
  -- aside in `_retired`, neither coerced nor lost.
  if v_kind in ('created_time', 'modified_time') then
    for r in
      select x.id, x.data from custom.record x
       where x.organization_id = p_organization_id and x.table_id = v_table
         and x.data_class = 'record' and x.data ? v_key
    loop
      v_raw := case jsonb_typeof(r.data -> v_key)
                 when 'object' then r.data -> v_key ->> 'start'
                 when 'string' then r.data ->> v_key
                 else null end;
      v_ts := null;
      begin
        v_ts := v_raw::timestamptz;
      exception when others then
        v_ts := null;
      end;
      if v_ts is null then
        v_left := v_left + 1;
        continue;
      end if;
      if v_kind = 'created_time' then
        update custom.record
           set created_at = v_ts,
               data = case when jsonb_typeof(data -> '_values') = 'object'
                           then jsonb_set(data - v_key, '{_values}', (data -> '_values') - v_key) else data - v_key end
         where organization_id = p_organization_id and id = r.id;
      else
        update custom.record
           set updated_at = v_ts,
               data = case when jsonb_typeof(data -> '_values') = 'object'
                           then jsonb_set(data - v_key, '{_values}', (data -> '_values') - v_key) else data - v_key end
         where organization_id = p_organization_id and id = r.id;
      end if;
      v_kept := v_kept + 1;
    end loop;
  end if;

  -- An ID keeps its number: the retype numbers every record in the same write that sets its old
  -- value aside, so the whole-number value is set aside FIRST, where custom._fx_autonumber finds it.
  if v_kind = 'autonumber' then
    update custom.record x
       set data = x.data || jsonb_build_object('_retired',
             (case when jsonb_typeof(x.data -> '_retired') = 'array' then x.data -> '_retired' else '[]'::jsonb end)
             || jsonb_build_object('key', v_key, 'label', v_field ->> 'label', 'value', to_jsonb(trunc((x.data ->> v_key)::numeric)::bigint),
                  'reason', 'this was the number the record already had when its column became an automatic ID', 'at', to_jsonb(now())))
     where x.organization_id = p_organization_id and x.table_id = v_table and x.data_class = 'record'
       and jsonb_typeof(x.data -> v_key) in ('number', 'string')
       and (x.data ->> v_key) ~ '^[0-9]{1,18}(\.0+)?$';
  end if;

  -- The column itself: the same door a person's retype uses, so every guard it passes, this passes.
  perform custom.field_update(p_organization_id, p_field_id, jsonb_build_object('type', v_kind));

  if v_kind = 'autonumber' then
    -- Each record takes the whole number its old column held; the rest are numbered after them.
    v_back := custom.autonumber_backfill(p_organization_id, p_field_id);
    select count(*) into v_imported
      from custom.record x
     where x.organization_id = p_organization_id and x.table_id = v_table and x.data_class = 'record'
       and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(x.data -> '_retired') = 'array' then x.data -> '_retired' else '[]'::jsonb end) e
                    where e ->> 'key' = v_key and (e ->> 'value') = (x.data -> '_derived' -> v_key ->> 'value'));
    v_kept := v_imported;
  elsif v_kind in ('created_by', 'modified_by') then
    select count(*) into v_kept
      from custom.record x
     where x.organization_id = p_organization_id and x.table_id = v_table and x.data_class = 'record'
       and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(x.data -> '_retired') = 'array' then x.data -> '_retired' else '[]'::jsonb end) e
                    where e ->> 'key' = v_key);
  end if;

  perform set_config('app.relabel_keeps_updated_at', coalesce(v_was_gun, ''), true);
  return jsonb_build_object('field_id', p_field_id, 'kind', v_kind, 'changed', true, 'kept', v_kept,
    'left_as_they_were', v_left, 'highest', v_back -> 'highest',
    'says', format('%s record(s) kept the value the old column held; the column now fills itself in%s.', v_kept,
      case v_kind when 'autonumber' then format(', and the next new record gets %s', coalesce((v_back ->> 'highest')::numeric, 0) + 1)
                  when 'created_time' then ' and stays as it was written'
                  when 'modified_time' then ' and moves when a record is edited'
                  else ' and names the real person from now on' end));
end
$fn$;

comment on function custom.field_make_automatic(uuid, uuid, text) is
  'NOTION-AUTO: turn a plain column into autonumber / created_time / modified_time / created_by / modified_by IN PLACE, keeping each record''s value (an ID kept as its number, a time moved onto the record''s own created / updated stamp, a person kept for Created by / Last changed by until a real user writes). Editor on the Table. Notion''s Created time, Last edited time, Created by, Last edited by and unique ID columns.';

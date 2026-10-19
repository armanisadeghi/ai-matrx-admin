-- INVERSE of migrations/20261020020000_cfwrite_b_a_custom_value_never_needs_the_tables_update_grant.sql (lane CF-WRITE-2): puts custom.entity_row_write and custom.entity_record_read back, takes custom.entity_custom_value_apply and its door row away, and un-registers hr_pay_period as a link target. No one's data is touched (a custom value already saved stays).
-- chair-step: restores function bodies, drops one function, deletes one door row and one association-type row.
-- lock: custom
-- based-on: custom.entity_row_write(uuid, text, uuid, jsonb, jsonb, integer, boolean) 1491247d15aa1df16fb4c4170ecd613f3e59a834146e21a0b73f3e8019774fbb
-- based-on: custom.entity_record_read(uuid, text, uuid) b98bd30c6e66dba9a571eac56d454abec6cfe80b878179a0c7d8bfe4d06dcb02
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION custom.entity_row_write(p_organization_id uuid, p_token text, p_record_id uuid, p_columns jsonb DEFAULT '{}'::jsonb, p_custom jsonb DEFAULT '{}'::jsonb, p_expected_version integer DEFAULT NULL::integer, p_archive boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  t        record;
  v_reg    record;
  v_row    jsonb;
  v_org    uuid;
  v_sets   text[] := '{}';
  v_args   jsonb := '[]'::jsonb;
  v_key    text;
  v_clear  text[] := '{}';
  v_patch  jsonb := '{}'::jsonb;
  v_n      int;
  v_where  text;
  v_has_ver boolean;
  v_cols   jsonb := coalesce(p_columns, '{}'::jsonb);
  v_custom jsonb := coalesce(p_custom, '{}'::jsonb);
  v_cf     jsonb;
  v_same   boolean := true;
  v_level  public.permission_level;
  v_mask   jsonb;
  v_vis    text[];
  v_decl   text[];
  v_out    jsonb;
  v_title  text;
  v_ins_cols text[];
  v_ins_vals text[];
  v_new    uuid;
  v_cur    integer;
  v_readable text;
begin
  -- the client wall is asked of an organization the call names; a change by id needs none
  if p_organization_id is not null or p_record_id is null then
    perform custom.assert_entity_door(p_organization_id, 'custom.entity_row_write');
  end if;
  select * into t from platform.entity_table(p_token);
  perform custom.assert_entity_is_organization_scoped(t.token, t.label, t.has_organization);
  select f.api_reach, f.api_writable_columns, f.create_via into v_reg from platform.api_facts(p_token) f;

  -- (How far the Table API reaches a table is the API's own question, answered before it calls
  -- this door. This door is the store's: the app's Custom fields section writes through it too.)
  if jsonb_typeof(v_cols) <> 'object' or jsonb_typeof(v_custom) <> 'object' then
    raise exception 'A write names its columns and values as {"name": value}.' using errcode = '22023';
  end if;
  -- ENTITY-DOORS-EVERY-TABLE (2026-10-18): this door writes real columns on every registered table; a
  -- custom value is asked of the custom-fields door, which refuses a table that takes none in its own words.
  if v_custom <> '{}'::jsonb then
    perform custom.entity_table(p_token);
  end if;
  -- CHAIR-ENTITY-BLOCKS: a lookup column (table_api/standard_tables) is changed by its word — a deal's
  -- stage by its name — and kept as the id that word names, read as the person.
  v_cols := platform._drill_words_in(p_token, v_cols, 'values');
  if p_record_id is null then
    if coalesce(v_reg.create_via, 'refuse') <> 'insert' then
      raise exception 'New % records are added in AI Matrx, which checks for duplicates.', t.label
        using errcode = '0A000', hint = 'This API changes records that already exist.';
    end if;
    -- CHAIR-ENTITY-BLOCKS-3: A NEW ROW OF A TOKEN WHOSE API FACTS SAY create_via = 'insert' is ONE
    -- INSERT AS HER, so the table's own insert rule decides (created_by is her sign-in, the
    -- organization is the one the call names and one she acts in). Only the API's writable columns.
    if auth.uid() is null then
      raise exception 'A new % needs a signed-in person.', t.label using errcode = '42501';
    end if;
    if p_organization_id is null then
      raise exception 'Name the organization this new % belongs to.', t.label using errcode = '22004';
    end if;
    if not iam.has_org_access(p_organization_id) then
      raise exception 'That is not an organization you can add a % to.', t.label using errcode = '42501';
    end if;
    v_title := (select e.title_column from platform.entity_types e where e.token = p_token);
    if v_title is not null and btrim(coalesce(v_cols ->> v_title, '')) = '' then
      raise exception 'A new % needs a name.', t.label using errcode = '22004',
        hint = format('Send "%s".', v_title);
    end if;
    v_ins_cols := array['organization_id'];
    v_ins_vals := array['$1'];
    if platform._drill_column(t.schema_name, t.table_name, 'created_by') is not null then
      v_ins_cols := v_ins_cols || 'created_by'::text;
      v_ins_vals := v_ins_vals || 'auth.uid()'::text;
    end if;
    for v_key in select k from jsonb_object_keys(v_cols) k loop
      if not (v_key = any (coalesce(v_reg.api_writable_columns, '{}'::text[]))) then
        raise exception '"%" cannot be set through the API.', v_key
          using errcode = '42501', hint = 'Set it in AI Matrx. Nothing was written.';
      end if;
      continue when jsonb_typeof(v_cols -> v_key) = 'null';
      v_ins_cols := v_ins_cols || v_key;
      v_ins_vals := v_ins_vals || format('($2->>%L)::%s', v_key,
                      (select format_type(a.atttypid, a.atttypmod) from pg_attribute a
                        where a.attrelid = format('%I.%I', t.schema_name, t.table_name)::regclass and a.attname = v_key));
    end loop;
    select coalesce(jsonb_object_agg(k, v_custom -> k), '{}'::jsonb) into v_patch
      from jsonb_object_keys(v_custom) k where jsonb_typeof(v_custom -> k) <> 'null';
    if exists (select 1 from jsonb_object_keys(v_patch) k where left(k, 1) = '_') then
      raise exception 'A key starting with "_" is kept by the store itself, so it cannot be written. Nothing was written.'
        using errcode = '22023';
    end if;
    if v_patch <> '{}'::jsonb then
      v_ins_cols := v_ins_cols || 'custom_fields'::text;
      v_ins_vals := v_ins_vals || '$3'::text;
    end if;
    execute format('insert into %I.%I (%s) values (%s) returning id', t.schema_name, t.table_name,
                   (select string_agg(format('%I', c), ', ' order by o) from unnest(v_ins_cols) with ordinality u(c, o)),
                   array_to_string(v_ins_vals, ', '))
      into v_new using p_organization_id, v_cols, v_patch;
    return jsonb_build_object('id', v_new, 'organization_id', p_organization_id, 'token', t.token, 'created', true);
  end if;

  -- the row, as she may read it: its own organization, never one a caller supplies
  -- ONLY THE COLUMNS SHE MAY READ (as custom.entity_record_read does): `to_jsonb(x)` names every column, so a
  -- table that grants its readers some columns, not all (crm.sending_identity), refused the whole write with
  -- "permission denied" before it looked at the value. A column she may not select is simply not in the row.
  select string_agg(format('x.%I', a.attname), ', ' order by a.attnum)
    into v_readable
    from pg_attribute a
   where a.attrelid = format('%I.%I', t.schema_name, t.table_name)::regclass
     and a.attnum > 0 and not a.attisdropped
     and has_column_privilege(a.attrelid, a.attnum, 'SELECT');
  if v_readable is null then
    raise exception 'There is no % you can open with that id.', t.label using errcode = '02000';
  end if;
  execute format('select to_jsonb(r) from (select %s from %I.%I x where x.id = $1) r', v_readable, t.schema_name, t.table_name)
    into v_row using p_record_id;
  v_cf := case when jsonb_typeof(v_row -> 'custom_fields') = 'object' then v_row -> 'custom_fields' else '{}'::jsonb end;
  v_row := v_row - 'custom_fields';
  if v_row is null then
    raise exception 'There is no % you can open with that id.', t.label using errcode = '02000';
  end if;
  v_org := (v_row ->> 'organization_id')::uuid;
  if p_organization_id is not null and v_org is distinct from p_organization_id then
    raise exception 'This % belongs to another organization, not to the one this call names.', t.label
      using errcode = '42501', hint = 'Leave the organization out, or name the one the record belongs to.';
  end if;

  -- real columns: only the ones the registry lists for the API
  for v_key in select k from jsonb_object_keys(v_cols) k loop
    if not (v_key = any (coalesce(v_reg.api_writable_columns, '{}'::text[]))) then
      raise exception '"%" cannot be changed through the API.', v_key
        using errcode = '42501', hint = 'Change it in AI Matrx. Nothing was written.';
    end if;
    v_sets := v_sets || format('%I = ($2->>%s)::%s', v_key, jsonb_array_length(v_args),
                               (select format_type(a.atttypid, a.atttypmod) from pg_attribute a
                                 where a.attrelid = format('%I.%I', t.schema_name, t.table_name)::regclass and a.attname = v_key));
    v_args := v_args || jsonb_build_array(v_cols -> v_key);
  end loop;

  -- custom values: a key set to null clears it (and its envelope); the author is the session's
  select string_agg(format('"%s"', k), ', ' order by k) into v_key
    from jsonb_object_keys(v_custom) k where left(k, 1) = '_';
  if v_key is not null then
    raise exception '% % kept by the store itself, so it cannot be written. Nothing was written.', v_key,
      case when position(',' in v_key) > 0 then 'are' else 'is' end
      using errcode = '22023', hint = 'Who changed a value comes from your sign-in; send only the fields you are setting.';
  end if;
  for v_key in select k from jsonb_object_keys(v_custom) k loop
    if jsonb_typeof(v_custom -> v_key) = 'null' then
      v_clear := v_clear || v_key;
    else
      v_patch := v_patch || jsonb_build_object(v_key, v_custom -> v_key);
    end if;
  end loop;
  if cardinality(v_clear) > 0 or v_patch <> '{}'::jsonb then
    v_sets := v_sets || ('custom_fields = (case when cardinality($3::text[]) > 0 then jsonb_set(coalesce(case when jsonb_typeof(custom_fields) = ''object'' then custom_fields end, ''{}''::jsonb) - $3::text[], ''{_values}'', coalesce(custom_fields -> ''_values'', ''{}''::jsonb) - $3::text[]) '
                         || 'else coalesce(case when jsonb_typeof(custom_fields) = ''object'' then custom_fields end, ''{}''::jsonb) end) || $4');
  end if;

  if p_archive is not null then
    if not t.has_deleted_at then
      raise exception '% records are never archived.', t.label using errcode = '0A000';
    end if;
    v_sets := v_sets || case when p_archive then 'deleted_at = coalesce(deleted_at, now())' else 'deleted_at = null' end;
  end if;
  if cardinality(v_sets) = 0 then
    raise exception 'Send at least one value to change.' using errcode = '22023';
  end if;

  v_has_ver := v_row ? 'version';
  if p_expected_version is not null and v_has_ver and (v_row ->> 'version')::integer is distinct from p_expected_version then
    raise exception 'Someone changed this % since you read it (it is at version %, and you sent %). Nothing was written.',
      t.label, v_row ->> 'version', p_expected_version
      using errcode = 'PT409', hint = 'Read it again, then send your change with the new version.';
  end if;
  -- A CHANGE THAT CHANGES NOTHING WRITES NOTHING: the version does not move and no history is made.
  select v_same and coalesce(bool_and((v_cf -> k) is not distinct from (v_patch -> k)), true) into v_same from jsonb_object_keys(v_patch) k;
  select v_same and coalesce(bool_and(not (v_cf ? k)), true) into v_same from unnest(v_clear) k;
  select v_same and coalesce(bool_and((v_row -> k) is not distinct from (v_cols -> k)), true) into v_same from jsonb_object_keys(v_cols) k;
  if p_archive is not null and ((v_row ->> 'deleted_at') is not null) is distinct from p_archive then
    v_same := false;
  end if;
  if not v_same then
  v_where := 'x.id = $1';
  if p_expected_version is not null then
    if not v_has_ver then
      raise exception '% records carry no version, so expected_version cannot be checked.', t.label using errcode = '22023';
    end if;
    v_where := v_where || ' and x.version = $5';
  end if;
  -- LANE7-W4B[h1]: AN HR ROW is changed through HR's own edit rule — the write gate that gates
  -- hr_employee_update today asks the signed-in person and arms this statement; with no subject
  -- employee nothing is armed and HR's guard refuses exactly as before.
  -- A CUSTOM-VALUE-ONLY WRITE ON A ROW WITH NO SUBJECT EMPLOYEE (a pay period, a pay group) is decided by the
  -- same access ladder every table uses (editor on the row), asked inside the gate; a write that also
  -- changes a real column stays HR's own guard's to decide.
  if t.schema_name = 'hr' then
    perform hr.custom_fields_write_gate(v_org, p_token, p_record_id, (v_cols = '{}'::jsonb and p_archive is null));
  end if;
  execute format('update %I.%I x set %s where %s', t.schema_name, t.table_name, array_to_string(v_sets, ', '), v_where)
    using p_record_id, v_args, v_clear, v_patch, p_expected_version;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    -- AP-3 (2026-10-06): A LOST RACE IS A STALE WRITE, NOT A REFUSAL. Another writer may have committed
    -- between the read above and this UPDATE, so the row's version is read again, in a fresh statement.
    if p_expected_version is not null then
      execute format('select x.version from %I.%I x where x.id = $1', t.schema_name, t.table_name)
        into v_cur using p_record_id;
      if v_cur is distinct from p_expected_version and v_cur is not null then
        raise exception 'Someone changed this % since you read it (it is at version %, and you sent %). Nothing was written.',
          t.label, v_cur, p_expected_version
          using errcode = 'PT409', hint = 'Read it again, then send your change with the new version.';
      end if;
    end if;
    raise exception 'You can see this %, but it is not yours to change.', t.label
      using errcode = '42501', hint = 'It takes edit access, or a share of this record with you. Nothing was written.';
  end if;
  end if;   -- (a change that changes nothing skipped the UPDATE above)

  -- WHAT THIS DOOR ANSWERS: the row and its custom values AS SHE MAY READ THEM — through
  -- custom.entity_read_mask and custom.mask_document, exactly as custom.entity_record_read
  -- answers (a field she may not read is null, with its withheld notice). The mask is asked in
  -- the row's own organization; for a row shared with her from an organization she is not a
  -- member of, that door has no answer for her, so no values are returned (`custom` absent) and
  -- the caller reads the row back through a read door.
  v_out := jsonb_build_object('id', p_record_id, 'organization_id', v_org, 'token', t.token)
           || case when v_same then '{"unchanged": true}'::jsonb else '{}'::jsonb end;
  if v_org is not null and t.custom_fields_enabled and t.has_custom_fields and iam.has_org_access(v_org) then
    execute format('select x.custom_fields from %I.%I x where x.id = $1', t.schema_name, t.table_name)
      into v_cf using p_record_id;
    if v_cf is null or jsonb_typeof(v_cf) <> 'object' then v_cf := '{}'::jsonb; end if;
    v_level := custom.entity_seat_level(v_org, p_token, p_record_id);
    v_mask  := custom.entity_read_mask(v_org, p_token, v_level, 'read');
    select coalesce(array_agg(x), '{}'::text[]) into v_vis  from jsonb_array_elements_text(v_mask -> 'visible') x;
    select coalesce(array_agg(x), '{}'::text[]) into v_decl from jsonb_array_elements_text(v_mask -> 'declared') x;
    v_out := v_out || jsonb_build_object('custom',
      custom.mask_document(v_cf - '_values' - '_retired', v_vis, v_mask -> 'notices', false, '{}'::jsonb, v_decl));
  end if;
  return v_out;
end
$function$;

CREATE OR REPLACE FUNCTION custom.entity_record_read(p_organization_id uuid, p_token text, p_record_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  t          record;
  v_row      jsonb;
  v_doc      jsonb;
  v_fields   jsonb;
  v_level    public.permission_level;
  v_mask     jsonb;
  v_visible  text[];
  v_declared text[];
  v_hidden   text[];
  v_excluded text[];
  v_written  jsonb;
  v_prot     jsonb;   -- LANE7-W4A[r1]: this row's protected values, for this person
  v_cols     text;
begin
  perform custom.assert_entity_door(p_organization_id, 'custom.entity_record_read');
  select * into t from custom.entity_table(p_token);
  perform custom.assert_entity_is_organization_scoped(t.token, t.label, t.has_organization);

  -- ONLY THE COLUMNS THIS PERSON MAY READ (lane 7 W5). `to_jsonb(x)` names every column, so a
  -- table that grants its readers some columns, not all (files.files: 36 of 37), refused the whole
  -- read with "permission denied for table files" and the custom-fields section could not open.
  -- A column the person may not select is simply not in the row; the predicate columns (id,
  -- organization_id) are read by the WHERE, which needs no select grant beyond what RLS allows.
  select string_agg(format('x.%I', a.attname), ', ' order by a.attnum)
    into v_cols
    from pg_attribute a
   where a.attrelid = format('%I.%I', t.schema_name, t.table_name)::regclass
     and a.attnum > 0 and not a.attisdropped
     and has_column_privilege(a.attrelid, a.attnum, 'SELECT');

  if v_cols is null then
    raise exception 'There is no % you can open with that id in this organization.', t.label
      using errcode = '02000',
            hint = 'DOOR-1: this person may read no column of this table.';
  end if;

  execute format('select to_jsonb(r) from (select %s from %I.%I x where x.id = $1 and x.organization_id = $2) r',
                 v_cols, t.schema_name, t.table_name)
    into v_row using p_record_id, p_organization_id;

  if v_row is null then
    raise exception 'There is no % you can open with that id in this organization.', t.label
      using errcode = '02000',
            hint = 'DOOR-1: this door reads the row as YOU, through the table''s own access rules - so a row somebody has not shared with you is the same answer as a row that is not there. Ask whoever holds it to share it with you.';
  end if;

  v_doc := v_row -> 'custom_fields';
  if v_doc is null or jsonb_typeof(v_doc) <> 'object' then v_doc := '{}'::jsonb; end if;

  -- THE ONE FACT, asked at the rung this person holds on this row.
  v_level := custom.entity_seat_level(p_organization_id, p_token, p_record_id);
  v_mask  := custom.entity_read_mask(p_organization_id, p_token, v_level, 'read');
  select coalesce(array_agg(x), '{}'::text[]) into v_visible  from jsonb_array_elements_text(v_mask -> 'visible') x;
  select coalesce(array_agg(x), '{}'::text[]) into v_declared from jsonb_array_elements_text(v_mask -> 'declared') x;
  select coalesce(array_agg(x), '{}'::text[]) into v_hidden   from jsonb_object_keys(v_mask -> 'notices') x;
  select coalesce(array_agg(x), '{}'::text[]) into v_excluded from jsonb_array_elements_text(v_mask -> 'excluded') x;
  -- LANE7-W4A[r2]: PROTECTED VALUES live beside the row. The ones this person's field rule admits are
  -- read (and audited by the rule); every other one is withheld with the store's notice.
  -- (Asked only when the table has a protected field: a table without one reads exactly as before.)
  if exists (select 1 from custom.entity_fields(p_organization_id, p_token) pf
              where (nullif(pf.data ->> 'table_token', '') is not null and coalesce(pf.data ->> 'sensitivity', 'internal') in ('confidential', 'restricted'))) then
    if has_function_privilege('custom.protected_values(uuid,text,uuid)', 'execute') then
      v_prot := custom.protected_values(p_organization_id, p_token, p_record_id);
    else
      -- a seat the read door is not open to is told each value is withheld, never an error
      select jsonb_build_object('keys', coalesce(jsonb_agg(pf.data ->> 'key'), '[]'::jsonb), 'values', '{}'::jsonb,
                                'written', '{}'::jsonb,
                                'hidden', coalesce(jsonb_object_agg(pf.data ->> 'key', jsonb_build_object('reason', pf.data ->> 'sensitivity', 'needs', 'one of the people it names',
                                    'says', format('Only the people it names can read %s.', coalesce(nullif(pf.data ->> 'label', ''), pf.data ->> 'key')))), '{}'::jsonb))
        into v_prot
        from custom.entity_fields(p_organization_id, p_token) pf
       where (nullif(pf.data ->> 'table_token', '') is not null and coalesce(pf.data ->> 'sensitivity', 'internal') in ('confidential', 'restricted')) and pf.data ->> 'key' is not null;
    end if;
  end if;
  if v_prot is not null then
    v_doc := v_doc || (v_prot -> 'values');
    if (v_prot -> 'written') <> '{}'::jsonb then
      v_doc := jsonb_set(v_doc, '{_values}',
                 coalesce(case when jsonb_typeof(v_doc -> '_values') = 'object' then v_doc -> '_values' end, '{}'::jsonb)
                 || (v_prot -> 'written'));
    end if;
    select coalesce(array_agg(x), '{}'::text[]) into v_visible from unnest(v_visible) x
     where not ((v_prot -> 'keys') ? x);
    v_visible := v_visible || array(select k from jsonb_array_elements_text(v_prot -> 'keys') k
                                     where not ((v_prot -> 'hidden') ? k));
    v_mask := jsonb_set(v_mask, '{notices}',
                ((v_mask -> 'notices') - array(select jsonb_array_elements_text(v_prot -> 'keys'))) || (v_prot -> 'hidden'));
    select coalesce(array_agg(x), '{}'::text[]) into v_hidden from jsonb_object_keys(v_mask -> 'notices') x;
  end if;

  -- The envelope of a withheld value (who wrote it, its earlier versions) is withheld with it.
  v_written := case when jsonb_typeof(v_doc -> '_values') = 'object' then v_doc -> '_values' else '{}'::jsonb end;
  v_written := v_written - v_hidden;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
           'type', f.data ->> 'type', 'parity_type', f.data ->> 'parity_type',
           'format', f.data ->> 'format', 'unit', f.data ->> 'unit',
           'multi', f.data -> 'multi', 'required', f.data -> 'required', 'sort', f.data -> 'sort',
           'sensitivity', f.data ->> 'sensitivity',
           'options_table_id', f.data -> 'config' ->> 'options_table_id',
           'relation_target', f.data ->> 'relation_target',
           'value',   case when (f.data ->> 'key') = any (v_visible) then v_doc -> (f.data ->> 'key') end,
           'written', case when (f.data ->> 'key') = any (v_visible) then v_doc -> '_values' -> (f.data ->> 'key') end,
           'hidden',  v_mask -> 'notices' -> (f.data ->> 'key')))), '[]'::jsonb)
    into v_fields
    from custom.entity_fields(p_organization_id, p_token) f;

  return jsonb_build_object(
    'token', t.token, 'label', t.label, 'type', t.type, 'id', p_record_id,
    'organization_id', p_organization_id,
    'title', case when t.title_column is not null then v_row ->> t.title_column end,
    'columns', (v_row - 'custom_fields') - v_excluded,
    'custom', custom.mask_document(v_doc - '_values' - '_retired', v_visible, v_mask -> 'notices',
                                   false, '{}'::jsonb, v_declared),
    'custom_written', v_written,
    'fields', v_fields,
    'live', (v_row ->> 'deleted_at') is null);
end
$function$;

DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name = 'entity_custom_value_apply';
UPDATE platform.client_callable_door
   SET reason = replace(reason, ' CF-WRITE-2: a custom-value-only write the table''s own update rule cannot say yes to (no grant on the column, or the row rule filters the row) is handed to custom.entity_custom_value_apply when the access ladder says this person may edit the row; it changes only custom_fields.', '')
 WHERE schema_name = 'custom' AND function_name = 'entity_row_write';
DROP FUNCTION IF EXISTS custom.entity_custom_value_apply(uuid, text, uuid, text[], jsonb, integer);
DELETE FROM platform.association_types WHERE source_type = 'record' AND target_type = 'hr_pay_period';

-- INVERSE of migrations/20261020030000_cfwrite_c_a_may_edit_asks_the_gate_the_write_uses.sql (lane CF-WRITE-3): puts custom.entity_record_read and hr.custom_fields_write_gate back, drops hr.custom_fields_may_write and its door row.
-- chair-step: restores function bodies, drops one function, deletes one door row.
-- lock: custom
-- based-on: custom.entity_record_read(uuid, text, uuid) b54e708feb57420b7406b06ada7f51e98795d7e05b364d16642d4982971dbf6e
-- based-on: hr.custom_fields_write_gate(uuid, text, uuid, boolean) a7db13f115220df7a9202fe5d5520a6acd5584a3316ed235656cae0b4e5ae21d
set local lock_timeout = '3s';

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
    'live', (v_row ->> 'deleted_at') is null,
    -- CF-WRITE-2: whether the access ladder lets THIS person save a custom value on THIS record (editor on it, or
    -- admin of its organization) - the one fact the section reads to show its values read-only, with the reason.
    'may_edit', coalesce(v_level in ('editor'::public.permission_level, 'admin'::public.permission_level), false));
end
$function$;

CREATE OR REPLACE FUNCTION hr.custom_fields_write_gate(p_organization_id uuid, p_token text, p_row_id uuid, p_custom_only boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare
  v_emp  uuid;
  v_org  uuid;
  v_gate jsonb;
  v_semp uuid;
begin
  if auth.uid() is null then
    return false;   -- no person to ask; HR's guard decides as it always has
  end if;
  select s.employee_id, s.organization_id into v_emp, v_org from hr.custom_field_subject(p_token, p_row_id) s;
  if v_emp is null then
    -- NO SUBJECT EMPLOYEE (a pay period, a pay group): HR's employee gate has no one to ask. A write that
    -- changes ONLY custom values is decided by the access ladder every table uses - the person must hold
    -- editor on this very row (or admin of its organization) - and then arms the one statement that asks.
    -- A write that also touches a real column is not armed: HR's guard refuses it exactly as before.
    if p_custom_only
       and p_organization_id is not null
       and (iam.has_org_admin(p_organization_id) or iam.has_access(p_token, p_row_id, 'editor'::public.permission_level)) then
      perform hr.arm_write();
      return true;
    end if;
    return false;
  end if;
  if v_org is distinct from p_organization_id then
    return false;
  end if;
  select g.gate, g.subject_employment into v_gate, v_semp
    from hr._l1_subject_write_gate(v_org, 'identity.write', v_emp, p_token, 'update', 'operational') g;
  if v_gate is not null then
    raise exception 'Changing this record''s fields takes HR''s edit access for this employee. Nothing was written.'
      using errcode = '42501', hint = 'An HR admin for this employee can change them.';
  end if;
  perform hr.arm_write();
  return true;
end
$function$;

DELETE FROM platform.client_callable_door WHERE schema_name = 'hr' AND function_name = 'custom_fields_may_write';
UPDATE platform.client_callable_door SET reason = replace(reason, ' CF-WRITE-3: the decision is hr.custom_fields_may_write, the same answer custom.entity_record_read gives as may_edit.', '')
 WHERE schema_name = 'hr' AND function_name = 'custom_fields_write_gate';
DROP FUNCTION hr.custom_fields_may_write(uuid, text, uuid, boolean);

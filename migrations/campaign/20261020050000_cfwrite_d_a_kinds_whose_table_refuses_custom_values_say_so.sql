-- additive: yes
-- Two columns on platform.entity_types (both defaulted), five registry rows set, one function body. Nothing is dropped, revoked or deleted.
-- lane: CF-WRITE-4
-- lock: custom
-- Inverse: migrations/inverse/20261020050000_cfwrite_d_a_kinds_whose_table_refuses_custom_values_say_so_down.sql
-- based-on: custom.entity_record_read(uuid, text, uuid) b54e708feb57420b7406b06ada7f51e98795d7e05b364d16642d4982971dbf6e
--
-- CF-WRITE-4 - A KIND WHOSE TABLE REFUSES EVERY CUSTOM-VALUE WRITE SAYS SO ON THE REGISTRY.
-- document_version, univer_payload, web_crawl_url, esign_envelope_signer and seo_site_offering_value refuse a custom-value
-- write by their own row rule whoever the person is, yet may_edit read true (the access ladder). The registry now carries
-- platform.entity_types.custom_values_locked (+ custom_values_locked_reason); custom.entity_record_read answers
-- may_edit=false and may_edit_reason for any kind that declares it. A future locked kind is one UPDATE, not code.
set local lock_timeout = '3s';

ALTER TABLE platform.entity_types
  ADD COLUMN IF NOT EXISTS custom_values_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_values_locked_reason text;
ALTER TABLE platform.entity_types DROP CONSTRAINT IF EXISTS entity_types_custom_values_locked_has_reason;
ALTER TABLE platform.entity_types ADD CONSTRAINT entity_types_custom_values_locked_has_reason
  CHECK (NOT custom_values_locked OR nullif(btrim(custom_values_locked_reason), '') IS NOT NULL);
COMMENT ON COLUMN platform.entity_types.custom_values_locked IS 'True when this kind''s table refuses every custom-value write whoever the person is (append-only, versioned, locked after signing). custom.entity_record_read then answers may_edit=false with custom_values_locked_reason. CF-WRITE-4.';
COMMENT ON COLUMN platform.entity_types.custom_values_locked_reason IS 'The words shown beside a read-only custom-fields section for a locked kind. Required when custom_values_locked.';

UPDATE platform.entity_types SET custom_values_locked = true, custom_values_locked_reason = v.reason
  FROM (VALUES
    ('document_version', 'This record is locked once saved. Only its label and note can change.'),
    ('univer_payload', 'This record is locked once saved. A new save makes a new version.'),
    ('web_crawl_url', 'This record is locked once saved. Crawl results are append-only.'),
    ('esign_envelope_signer', 'This record is locked once the person has signed.'),
    ('seo_site_offering_value', 'This record is locked while the site has not selected this offering.')
  ) v(token, reason)
 WHERE platform.entity_types.token = v.token;

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
    -- CF-WRITE-3: an HR row's answer is ASKED OF THE SAME FUNCTION THE WRITE GATE ASKS (hr.custom_fields_may_write),
    -- so the control is enabled exactly when the write would be taken. Every other kind: the access ladder, as before.
    -- CF-WRITE-4: a kind whose table refuses every custom-value write whoever the person is (append-only, versioned, locked
    -- after signing) declares it on the registry (platform.entity_types.custom_values_locked + _reason); the answer is then
    -- false with that reason, for everyone. Nothing here names a kind.
    'may_edit', case when coalesce(t.custom_values_locked, false) then false
                     when t.schema_name = 'hr'
                     then coalesce(hr.custom_fields_may_write(p_organization_id, p_token, p_record_id, true), false)
                     else coalesce(v_level in ('editor'::public.permission_level, 'admin'::public.permission_level), false) end,
    'may_edit_reason', case when coalesce(t.custom_values_locked, false) then t.custom_values_locked_reason end);
end
$function$;

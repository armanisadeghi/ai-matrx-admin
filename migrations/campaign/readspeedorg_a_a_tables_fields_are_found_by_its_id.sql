-- additive: yes
-- adds one partial btree index to each of the sixteen partitions of custom.record (field-kernel rows only), built CONCURRENTLY so no write waits for them. Nothing is dropped, altered or rewritten; no data, function, policy or grant is touched.
-- lane: READ-SPEED-ORG
-- lock: custom
-- AUTOCOMMIT FILE: CREATE INDEX CONCURRENTLY cannot run inside a transaction; apply statement by statement.
--
-- READ-SPEED-ORG — A TABLE'S FIELDS ARE FOUND BY ITS ID, NEVER BY READING EVERY FIELD OF THE ORGANIZATION.
--
-- About 80 live functions find a table's Fields with `(f.data ->> 'entity_definition_id')::uuid = <table id>`
-- (custom.applicable_fields, custom.read_mask_for, iam.visible_field_ids, custom.choice_field_map,
-- custom.record_filter_sql, custom.agg_field_value_sql, the write door custom._field_write_door, ...). The
-- installspeed3 index keys the TEXT (data ->> 'entity_definition_id'), so the uuid cast never matches it: every
-- one of those questions read every Field record of the organization. A small table's page read therefore cost
-- what the ORGANIZATION holds (measured 2026-10-19: a 10-row probe read 41 ms in the near-empty Template sweep org
-- and ~125 ms once 15,000 Field records were added; applicable_fields 1.2 -> 13.6 ms, read_mask_for ~0 -> 25 ms,
-- iam.visible_field_ids 4 -> 17 ms self).
--
-- This keys the uuid itself, so every one of those callers is answered by index, unchanged. All 129,246 live Field
-- values were checked canonical uuids on 2026-10-19, and _field_write_door already casts the value on every write,
-- so the index refuses nothing that is not already refused.
--   record_fieldkernel_def_uuid_rp_NN  (organization_id, (data ->> 'entity_definition_id')::uuid)
--
-- INVERSE: migrations/inverse/readspeedorg_a_a_tables_fields_are_found_by_its_id_down.sql

create index concurrently if not exists record_fieldkernel_def_uuid_rp_00
  on custom.record_p00 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_01
  on custom.record_p01 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_02
  on custom.record_p02 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_03
  on custom.record_p03 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_04
  on custom.record_p04 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_05
  on custom.record_p05 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_06
  on custom.record_p06 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_07
  on custom.record_p07 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_08
  on custom.record_p08 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_09
  on custom.record_p09 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_10
  on custom.record_p10 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_11
  on custom.record_p11 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_12
  on custom.record_p12 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_13
  on custom.record_p13 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_14
  on custom.record_p14 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

create index concurrently if not exists record_fieldkernel_def_uuid_rp_15
  on custom.record_p15 (organization_id, ((data ->> 'entity_definition_id')::uuid))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid;

do $check$
declare v_bad text;
begin
  select string_agg(w.n, ', ') into v_bad
    from (values
    ('record_fieldkernel_def_uuid_rp_00'),
    ('record_fieldkernel_def_uuid_rp_01'),
    ('record_fieldkernel_def_uuid_rp_02'),
    ('record_fieldkernel_def_uuid_rp_03'),
    ('record_fieldkernel_def_uuid_rp_04'),
    ('record_fieldkernel_def_uuid_rp_05'),
    ('record_fieldkernel_def_uuid_rp_06'),
    ('record_fieldkernel_def_uuid_rp_07'),
    ('record_fieldkernel_def_uuid_rp_08'),
    ('record_fieldkernel_def_uuid_rp_09'),
    ('record_fieldkernel_def_uuid_rp_10'),
    ('record_fieldkernel_def_uuid_rp_11'),
    ('record_fieldkernel_def_uuid_rp_12'),
    ('record_fieldkernel_def_uuid_rp_13'),
    ('record_fieldkernel_def_uuid_rp_14'),
    ('record_fieldkernel_def_uuid_rp_15')) w(n)
    left join pg_catalog.pg_class c
      on c.relname = w.n and c.relkind = 'i'
     and c.relnamespace = 'custom'::regnamespace
    left join pg_catalog.pg_index i on i.indexrelid = c.oid
   where i.indisvalid is not true or i.indisready is not true;
  if v_bad is not null then
    raise exception 'readspeedorg_a indexes not valid: % — the named index is invalid; remove it by hand and re-run the file', v_bad;
  end if;
end
$check$;

-- chair-step: replaces the body of custom._computed_mark, whose existing hard-delete cleanup is a DELETE of kept rows (unchanged; chair authorized, READ-SPEED-5)
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-5
-- lock: custom
-- based-on: custom._computed_mark(uuid, uuid[], uuid[]) 72c92c0c4188d36858f46ba4e451e921113e1c769220a8871294619f8c9d9228
--
-- READ-SPEED-5 b — A RECORD WRITE FINDS ITS LINKED RECORDS BY INDEX. custom._computed_mark walked the links of a
-- written record with `source_id = any (...)` and no source_type, so the source side could not use
-- idx_assoc_source (source_type, source_id) and scanned (live: ~70 ms per step, up to three steps per write).
-- Both directions now name the record type on both ends (an edge between two records is the only edge a kept value
-- follows). Inverse: migrations/inverse/20261021240100_readspeed5_b_a_record_write_finds_its_linked_records_by_index_down.sql
CREATE OR REPLACE FUNCTION custom._computed_mark(p_org uuid, p_ids uuid[], p_hard_deleted uuid[] DEFAULT '{}'::uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_all      uuid[] := coalesce(p_ids, '{}');
  v_frontier uuid[] := coalesce(p_ids, '{}');
  v_next     uuid[];
  v_elig     uuid[];
  v_depth    integer := 0;
  v_n        integer;
begin
  if p_org is null then
    return 0;
  end if;
  if cardinality(p_hard_deleted) > 0 then
    delete from custom.record_computed where record_id = any (p_hard_deleted);
  end if;
  -- READ-SPEED-5 a: the whole organization is already waiting to be marked; nothing kept is served until it is
  if exists (select 1 from custom.computed_org_mark m where m.organization_id = p_org) then
    return 0;
  end if;
  -- READ-SPEED-5 a: the Tables whose values are kept are the ones with kept rows (custom.record_computed_table_idx).
  -- Working them out from every column of the organization cost ~650 ms on every record write; an organization-wide
  -- mark (a column or Table write) brings a newly eligible Table in.
  if not exists (select 1 from custom.record_computed rc where rc.organization_id = p_org) then
    return 0;
  end if;
  -- READ-SPEED-5 b: both directions name source_type and target_type, so each is one probe of
  -- idx_assoc_source / idx_assoc_target (the source side had no leading column: ~70 ms per step)
  while v_depth < 3 and cardinality(v_frontier) > 0 and cardinality(v_all) <= 5000 loop
    select coalesce(array_agg(distinct n.id), '{}') into v_next from (
      select a.target_id id from platform.associations a
       where a.source_type = 'record' and a.source_id = any (v_frontier) and a.organization_id = p_org and a.target_type = 'record'
      union
      select a.source_id from platform.associations a
       where a.target_type = 'record' and a.target_id = any (v_frontier) and a.organization_id = p_org and a.source_type = 'record') n
     where n.id is not null and not (n.id = any (v_all));
    v_all := v_all || v_next;
    -- only records whose own worked-out values can change carry the change on
    select coalesce(array_agg(r.id), '{}') into v_frontier from custom.record r
     where r.organization_id = p_org and r.id = any (v_next) and exists (select 1 from custom.record_computed k where k.organization_id = p_org and k.table_id = r.table_id);
    v_depth := v_depth + 1;
  end loop;
  if cardinality(v_all) > 5000 then
    perform custom._computed_mark_org(p_org);
    return -1;
  end if;
  insert into custom.record_computed as rc (record_id, organization_id, table_id, vals, stale, gen)
  select r.id, r.organization_id, r.table_id, null, true, 1
    from custom.record r
   where r.organization_id = p_org and r.id = any (v_all) and exists (select 1 from custom.record_computed k where k.organization_id = p_org and k.table_id = r.table_id) and r.data_class = 'record'
   order by r.id
  on conflict (record_id) do update set stale = true, gen = rc.gen + 1;
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

-- chair-step: the inverse of READ-SPEED-6 a — every Field or Table write marks the whole organization again
-- lane: READ-SPEED-6
-- allows: revoke custom
-- based-on: custom._computed_mark_org(uuid) d530cdfac0abc7ccbcdb3ea8005645b019f38092cb186d1abe49e58b3dcded8c
-- based-on: custom._computed_apply_org_mark(uuid) 6278d8d6bc1e3040f5aa0643cdcbb9c2869ecd7a13fb0b3a395c9a9a418e6f2e
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) c332158eb9da7dfafae4abe1c3d871356b797da1fe11b942af4623fdb86ad905
-- based-on: custom._computed_mark(uuid, uuid[], uuid[]) 96c2d221a78374f6a71c1836f398382cbc4f40bd78addd6b688552a7db0c3734
-- based-on: custom.computed_refresh(uuid, integer) f8073f4148897332c3f59994334cb458a4caa4c34a2dc2e01c7e6d8bf84ad674
-- based-on: custom._computed_stale_stmt() 3e792101191c54fe698c7a0555fbb27f092816c00517c31233153d1e47de79db
-- Inverse of migrations/campaign/20261022240000_readspeed6_a_a_column_write_holds_only_the_tables_it_feeds.sql: the READ-SPEED-5 a bodies, back as they were.
CREATE OR REPLACE FUNCTION custom._computed_mark_org(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_seen text := coalesce(current_setting('mx.computed_org_marked', true), '');
  v_tag  text := pg_current_xact_id()::text || ':' || p_org::text;
begin
  -- READ-SPEED-5 a: A COLUMN OR TABLE WRITE ONLY LEAVES A MARK (one row, once per transaction per organization, no
  -- lock on anything another write holds). Every kept value of the organization stops being served at once
  -- (custom._computed_reader_ok); the next view applies it (custom._computed_apply_org_mark) and refreshes.
  if p_org is null or position(v_tag in v_seen) > 0 then
    return;
  end if;
  insert into custom.computed_org_mark (organization_id) values (p_org);
  perform set_config('mx.computed_org_marked', right(v_seen, 4000) || ' ' || v_tag, true);
end;
$function$;

CREATE OR REPLACE FUNCTION custom._computed_apply_org_mark(p_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n integer;
begin
  -- one applier per organization at a time; the others leave it to that one
  if not pg_try_advisory_xact_lock(hashtext('custom.computed_org_mark:' || p_org::text)) then
    return false;
  end if;
  -- only marks already committed are taken; a write still in flight leaves its mark for the next view
  with gone as (delete from custom.computed_org_mark m where m.organization_id = p_org returning 1)
  select count(*) into v_n from gone;
  if v_n = 0 then
    return false;
  end if;
  update custom.record_computed set stale = true, gen = gen + 1 where organization_id = p_org;
  insert into custom.record_computed as rc (record_id, organization_id, table_id, vals, stale, gen)
  select r.id, r.organization_id, r.table_id, null, true, 1
    from custom.record r
   where r.organization_id = p_org and r.data_class = 'record' and r.deleted_at is null
     and r.table_id in (select distinct (f.data ->> 'entity_definition_id')::uuid from custom.record f
                         where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                           and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
                           and coalesce(f.data ->> 'compute_on', '') = 'read')
  on conflict (record_id) do nothing;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._computed_reader_ok(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk  text;
  v_raw text;
  v_ok  boolean;
begin
  if coalesce(current_setting('mx.computed_store', true), '') = 'off' then
    return false;
  end if;
  if not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  -- READ-SPEED-5 a: a column or Table write is waiting to be applied in this organization
  if exists (select 1 from custom.computed_org_mark m where m.organization_id = p_org) then
    return false;
  end if;
  -- served only once writes keep them current (the write triggers); mx.computed_store = force serves anyway (proofs)
  -- READ-SPEED-5 c: the hold of READ-SPEED-4 d is released — custom.computed_refresh works for a signed-in caller
  if coalesce(current_setting('mx.computed_store', true), '') <> 'force'
     and not exists (select 1 from pg_trigger where tgrelid = 'custom.record'::regclass and tgname = 'zzzzzz_computed_stale_u') then
    return false;
  end if;
  if p_me is null then
    return true;
  end if;
  v_mk := 'custom.computed_reader_ok:' || p_me::text || ':' || p_org::text || ':' || p_table::text;
  v_raw := platform.memo_k_get(v_mk);
  if v_raw is not null then
    return v_raw = 't';
  end if;
  -- the kept judgement, while no access changed and for 5 minutes; else judged here, exactly
  select j.ok into v_ok from custom.computed_reader_judgement j
   where j.reader_id = p_me and j.organization_id = p_org and j.table_id = p_table
     and j.versions = custom._access_versions(p_org) and j.judged_at > now() - interval '5 minutes';
  if v_ok is null then
    v_ok := custom._computed_reader_judge(p_me, p_org, p_table);
  end if;
  perform platform.memo_k_put(v_mk, case when v_ok then 't' else 'f' end);
  return v_ok;
end;
$function$;

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

CREATE OR REPLACE FUNCTION custom.computed_refresh(p_table_id uuid, p_max_rows integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org  uuid := custom._computed_door_org(p_table_id);
  v_me   uuid := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  v_ids  uuid[];
  v_left integer;
begin
  -- the ladder was asked once, above (the caller may read the Table); the reader's judgement is kept
  perform custom._computed_warm(v_me, v_org, p_table_id);
  -- a column or Table write left a mark: this call applies it (every kept value of the organization stale) and stops,
  -- so the transaction stays short; the work-out is the next call's
  if exists (select 1 from custom.computed_org_mark m where m.organization_id = v_org)
     and custom._computed_apply_org_mark(v_org) then
    select count(*) into v_left from custom.record_computed rc
     where rc.organization_id = v_org and rc.table_id = p_table_id and rc.stale;
    return greatest(v_left, 1);
  end if;
  select coalesce(array_agg(x.record_id), '{}') into v_ids from (
    select rc.record_id from custom.record_computed rc
     where rc.organization_id = v_org and rc.table_id = p_table_id and rc.stale
     limit least(greatest(coalesce(p_max_rows, 200), 1), 500)
       for update of rc skip locked) x;  -- a row a write is marking, or another refresh holds, waits for the next view
  if cardinality(v_ids) > 0 then
    perform custom._computed_compute(v_org, p_table_id, v_ids);
  end if;
  select count(*) into v_left from custom.record_computed rc
   where rc.organization_id = v_org and rc.table_id = p_table_id and rc.stale;
  return v_left;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._computed_stale_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c record;
  v_kernel uuid[];
begin
  -- Each branch names only the transition tables its operation has (an INSERT has no old_rows, a DELETE no new_rows).
  -- READ-SPEED-5 a: only a column, Table, rule, relation or kernel row (never a run, a dashboard or a template).
  -- A changed column, Table, relation or rule: the whole organization's kept values are stale, and who sees what may
  -- have moved (masks, confidentiality, archive of a Table).
  if tg_op = 'INSERT' then
    select coalesce(array_agg(distinct n.organization_id), '{}') into v_kernel from new_rows n
     where n.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id());
  elsif tg_op = 'UPDATE' then
    select coalesce(array_agg(distinct n.organization_id), '{}') into v_kernel from new_rows n
     where (n.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))
       and exists (select 1 from old_rows o where o.id = n.id and o.organization_id = n.organization_id
                    and (o.data is distinct from n.data or o.deleted_at is distinct from n.deleted_at));
  else
    select coalesce(array_agg(distinct o.organization_id), '{}') into v_kernel from old_rows o
     where o.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or o.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id());
  end if;
  for c in select unnest(v_kernel) org loop
    perform custom._computed_mark_org(c.org);
    perform custom._access_version_bump(c.org);
  end loop;

  if tg_op = 'INSERT' then
    for c in
      with ch as (select n.organization_id org, n.id, n.data nd, null::jsonb od from new_rows n where n.data_class = 'record')
      select ch.org, array_agg(distinct ch.id) || coalesce((
             select array_agg(distinct (x #>> '{}')::uuid)
               from ch c2
               cross join lateral jsonb_each(coalesce(c2.nd, '{}') || coalesce(c2.od, '{}')) kv
               cross join lateral jsonb_array_elements(case when jsonb_typeof(kv.value) = 'array' then kv.value
                                                           when jsonb_typeof(kv.value) = 'string' then jsonb_build_array(kv.value)
                                                           else '[]'::jsonb end) x
              where c2.org = ch.org
                and jsonb_typeof(x) = 'string'
                and (x #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), '{}') ids, '{}'::uuid[] gone
        from ch where not (ch.org = any (v_kernel)) group by ch.org
    loop
      perform custom._computed_mark(c.org, c.ids, c.gone);
    end loop;
  elsif tg_op = 'UPDATE' then
    -- an archive or restore moves who sees what (one bump per organization per transaction)
    for c in select distinct n.organization_id org from new_rows n join old_rows o on o.id = n.id and o.organization_id = n.organization_id
              where o.deleted_at is distinct from n.deleted_at loop
      perform custom._access_version_bump(c.org);
    end loop;
    for c in
      with ch as (select n.organization_id org, n.id, n.data nd, o.data od from new_rows n join old_rows o on o.id = n.id and o.organization_id = n.organization_id where (n.data_class = 'record' or o.data_class = 'record') and (o.data is distinct from n.data or o.deleted_at is distinct from n.deleted_at or o.table_id is distinct from n.table_id))
      select ch.org, array_agg(distinct ch.id) || coalesce((
             select array_agg(distinct (x #>> '{}')::uuid)
               from ch c2
               cross join lateral jsonb_each(coalesce(c2.nd, '{}') || coalesce(c2.od, '{}')) kv
               cross join lateral jsonb_array_elements(case when jsonb_typeof(kv.value) = 'array' then kv.value
                                                           when jsonb_typeof(kv.value) = 'string' then jsonb_build_array(kv.value)
                                                           else '[]'::jsonb end) x
              where c2.org = ch.org
                and jsonb_typeof(x) = 'string'
                and (x #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), '{}') ids, '{}'::uuid[] gone
        from ch where not (ch.org = any (v_kernel)) group by ch.org
    loop
      perform custom._computed_mark(c.org, c.ids, c.gone);
    end loop;
  else
    for c in
      with ch as (select o.organization_id org, o.id, null::jsonb nd, o.data od from old_rows o where o.data_class = 'record')
      select ch.org, array_agg(distinct ch.id) || coalesce((
             select array_agg(distinct (x #>> '{}')::uuid)
               from ch c2
               cross join lateral jsonb_each(coalesce(c2.nd, '{}') || coalesce(c2.od, '{}')) kv
               cross join lateral jsonb_array_elements(case when jsonb_typeof(kv.value) = 'array' then kv.value
                                                           when jsonb_typeof(kv.value) = 'string' then jsonb_build_array(kv.value)
                                                           else '[]'::jsonb end) x
              where c2.org = ch.org
                and jsonb_typeof(x) = 'string'
                and (x #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), '{}') ids, array_agg(distinct ch.id) gone
        from ch where not (ch.org = any (v_kernel)) group by ch.org
    loop
      perform custom._computed_mark(c.org, c.ids, c.gone);
    end loop;
  end if;
  return null;
end;
$function$;

drop function if exists custom._computed_marked(uuid, uuid);
drop function if exists custom._computed_mark_tables(uuid, uuid[]);
drop index if exists custom.computed_org_mark_org_table;
alter table custom.computed_org_mark drop column if exists table_id;

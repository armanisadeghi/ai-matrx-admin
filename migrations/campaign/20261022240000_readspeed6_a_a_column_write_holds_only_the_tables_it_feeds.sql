-- chair-step: replaces the computed-store mark functions and their statement trigger body in place (the DELETE is inside the mark applier, as READ-SPEED-5 a); no trigger is dropped, the mark table only gains a nullable column
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-6
-- lock: custom
-- allows: revoke custom
-- based-on: custom._computed_mark_org(uuid) c359d820daf52e4aaf5ea2ed72a3d246f2921ab2bba785b2c4d249916f06ae3d
-- based-on: custom._computed_apply_org_mark(uuid) 134df9d66e691274d5d46adcec190d8be618e34a6664cec48c9ce888b1798f97
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) beb6ed4778977ce374b020772149b7408d3c9613a624ef79ffe712f0139c0505
-- based-on: custom._computed_mark(uuid, uuid[], uuid[]) a2f52806d68c7eddee25ba636313cfa24cab953a1ed0e9ad358a3b0cfee9926c
-- based-on: custom.computed_refresh(uuid, integer) 7cb42b7858ef2214517c4d6b8fef4e8c66754e04753563e17d8c8bc122c07b09
-- based-on: custom._computed_stale_stmt() 5e586012da6343fb8991e3f0871a816c8742855f48ca8208d1020621bda741e2
--
-- READ-SPEED-6 a — A COLUMN OR TABLE WRITE HOLDS ONLY THE TABLES WHOSE KEPT VALUES COME FROM IT; THE REFRESH DOOR
-- NEVER ANSWERS 0 WHILE ONE OF ITS MARKS WAITS.
-- READ-SPEED-5 a made a Field or Table write leave one organization mark, and while any mark waited nothing kept was
-- served anywhere in the organization. Now the mark names the Table written (a Field: the Table it belongs to; a
-- Table: itself), and a Table is held only while a mark waits on a Table its worked-out values come from — itself,
-- or one its roll-ups and lookups read through (custom._computed_component). Applying the marks stales only those
-- Tables. A rule, relation or kernel write still marks the whole organization (a mark with no Table).
-- The door (custom.computed_refresh(table, max)) answered 0 when another call held the organization's apply lock, so
-- the client stopped calling while the mark still waited; it now answers at least 1 while such a mark waits.
-- Inverse: migrations/inverse/20261022240000_readspeed6_a_a_column_write_holds_only_the_tables_it_feeds_down.sql
-- 1. A mark names the Table it came from (null: the whole organization — a rule, relation or kernel write).
alter table custom.computed_org_mark add column if not exists table_id uuid;
create index if not exists computed_org_mark_org_table on custom.computed_org_mark (organization_id, table_id);

-- 2. A Field or Table write marks only its own Table (once per transaction per Table).
CREATE FUNCTION custom._computed_mark_tables(p_org uuid, p_tables uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_seen text := coalesce(current_setting('mx.computed_org_marked', true), '');
  v_x    text := pg_current_xact_id()::text;
  v_t    uuid;
begin
  -- READ-SPEED-6 a: A COLUMN OR TABLE WRITE MARKS ITS OWN TABLE. The Tables whose kept values come from it (itself, and
  -- every Table with a roll-up or lookup over it: custom._computed_component) stop being served; every other Table of the
  -- organization keeps serving (custom._computed_marked). The next view applies it (custom._computed_apply_org_mark).
  if p_org is null then
    return;
  end if;
  if position(v_x || ':' || p_org::text || ':*' in v_seen) > 0 then
    return;  -- the whole organization is already marked in this transaction
  end if;
  for v_t in select distinct u from unnest(coalesce(p_tables, '{}')) u where u is not null loop
    continue when position(v_x || ':' || p_org::text || ':' || v_t::text in v_seen) > 0;
    insert into custom.computed_org_mark (organization_id, table_id) values (p_org, v_t);
    v_seen := right(v_seen, 4000) || ' ' || v_x || ':' || p_org::text || ':' || v_t::text;
  end loop;
  perform set_config('mx.computed_org_marked', v_seen, true);
end;
$function$;
revoke all on function custom._computed_mark_tables(uuid, uuid[]) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION custom._computed_mark_org(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_seen text := coalesce(current_setting('mx.computed_org_marked', true), '');
  v_tag  text := pg_current_xact_id()::text || ':' || p_org::text || ':*';
begin
  -- READ-SPEED-5 a / READ-SPEED-6 a: a rule, relation or kernel write (or a record write reaching over 5,000 records)
  -- marks the WHOLE organization: one row with no Table, once per transaction per organization.
  if p_org is null or position(v_tag in v_seen) > 0 then
    return;
  end if;
  insert into custom.computed_org_mark (organization_id, table_id) values (p_org, null);
  perform set_config('mx.computed_org_marked', right(v_seen, 4000) || ' ' || v_tag, true);
end;
$function$;

-- 3. Is a mark waiting that this Table's kept values come from?
CREATE FUNCTION custom._computed_marked(p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- READ-SPEED-6 a: a whole-organization mark, or a mark on any Table this Table's worked-out values come from
  if not exists (select 1 from custom.computed_org_mark m where m.organization_id = p_org) then
    return false;
  end if;
  return exists (select 1 from custom.computed_org_mark m
                  where m.organization_id = p_org
                    and (m.table_id is null or m.table_id = any (custom._computed_component(p_org, p_table))));
end;
$function$;
revoke all on function custom._computed_marked(uuid, uuid) from public, anon, authenticated;

-- 4. Applying the marks stales only the Tables they reach.
CREATE OR REPLACE FUNCTION custom._computed_apply_org_mark(p_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_marks  uuid[];
  v_whole  boolean;
  v_hit    uuid[];
begin
  -- one applier per organization at a time; the others leave it to that one
  if not pg_try_advisory_xact_lock(hashtext('custom.computed_org_mark:' || p_org::text)) then
    return false;
  end if;
  -- only marks already committed are taken; a write still in flight leaves its mark for the next view
  with gone as (delete from custom.computed_org_mark m where m.organization_id = p_org returning m.table_id)
  select array_agg(distinct g.table_id) filter (where g.table_id is not null), bool_or(g.table_id is null)
    into v_marks, v_whole from gone g;
  if v_whole is null then
    return false;
  end if;
  if v_whole then
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
  end if;
  -- READ-SPEED-6 a: the Tables reached are the kept or keepable Tables whose worked-out values come from a marked Table
  select coalesce(array_agg(t.tid), '{}') into v_hit from (
    select distinct rc.table_id tid from custom.record_computed rc where rc.organization_id = p_org
    union
    select distinct (f.data ->> 'entity_definition_id')::uuid from custom.record f
     where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
       and coalesce(f.data ->> 'compute_on', '') = 'read'
       and (f.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') t
   where t.tid is not null and custom._computed_component(p_org, t.tid) && v_marks;
  if cardinality(v_hit) = 0 then
    return true;
  end if;
  update custom.record_computed set stale = true, gen = gen + 1 where organization_id = p_org and table_id = any (v_hit);
  insert into custom.record_computed as rc (record_id, organization_id, table_id, vals, stale, gen)
  select r.id, r.organization_id, r.table_id, null, true, 1
    from custom.record r
   where r.organization_id = p_org and r.table_id = any (v_hit) and r.data_class = 'record' and r.deleted_at is null
     and custom._computed_eligible(p_org, r.table_id)
  on conflict (record_id) do nothing;
  return true;
end;
$function$;

-- 5. The reader check asks only the marks this Table's values come from.
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
  -- READ-SPEED-6 a: a column or Table write this Table's values come from is waiting to be applied
  if custom._computed_marked(p_org, p_table) then
    return false;
  end if;
  -- served only once writes keep them current (the write triggers); mx.computed_store = force serves anyway (proofs)
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
  -- READ-SPEED-5 a / READ-SPEED-6 a: the whole organization is already waiting to be marked (a mark with no Table);
  -- nothing kept is served there until it is. A mark on one Table leaves this write to mark its own records.
  if exists (select 1 from custom.computed_org_mark m where m.organization_id = p_org and m.table_id is null) then
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
  -- READ-SPEED-6 a: only a mark this Table's values come from; READ-SPEED-6 b: while one waits the answer is never 0 —
  -- another call holding the organization's apply lock, or a mark not yet taken, still leaves work for the next call
  if custom._computed_marked(v_org, p_table_id) then
    perform custom._computed_apply_org_mark(v_org);
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
  v_marks  jsonb;
begin
  -- Each branch names only the transition tables its operation has (an INSERT has no old_rows, a DELETE no new_rows).
  -- READ-SPEED-5 a: only a column, Table, rule, relation or kernel row (never a run, a dashboard or a template).
  -- READ-SPEED-6 a: A Field or Table write marks ITS OWN TABLE (a Field: the Table it belongs to, before and after; a
  -- Table: itself); only the Tables whose kept values come from it stop being served. A rule, relation or kernel write
  -- (or a Field naming no Table) still marks the whole organization. Who sees what may have moved either way: the
  -- organization's access version moves.
  if tg_op = 'INSERT' then
    select coalesce(jsonb_agg(distinct jsonb_build_object('o', k.org, 't', k.tab)), '[]'::jsonb) into v_marks
      from (select n.organization_id org, case when (n.data_class = 'field' or n.table_id = custom.field_kernel_id())
                             and (n.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                            then (n.data ->> 'entity_definition_id')::uuid
                            when n.data_class = 'table' or n.table_id = custom.table_kernel_id() then n.id end tab from new_rows n where (n.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))) k;
  elsif tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(distinct jsonb_build_object('o', k.org, 't', k.tab)), '[]'::jsonb) into v_marks
      from (select n.organization_id org, case when (n.data_class = 'field' or n.table_id = custom.field_kernel_id())
                             and (n.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                            then (n.data ->> 'entity_definition_id')::uuid
                            when n.data_class = 'table' or n.table_id = custom.table_kernel_id() then n.id end tab from new_rows n where (n.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))
                     and exists (select 1 from old_rows o2 where o2.id = n.id and o2.organization_id = n.organization_id
                                  and (o2.data is distinct from n.data or o2.deleted_at is distinct from n.deleted_at))
            union all
            select o.organization_id org, case when (o.data_class = 'field' or o.table_id = custom.field_kernel_id())
                             and (o.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                            then (o.data ->> 'entity_definition_id')::uuid
                            when o.data_class = 'table' or o.table_id = custom.table_kernel_id() then o.id end tab from old_rows o where (o.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or o.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))
                     and exists (select 1 from new_rows n2 where n2.id = o.id and n2.organization_id = o.organization_id
                                  and (o.data is distinct from n2.data or o.deleted_at is distinct from n2.deleted_at))) k;
  else
    select coalesce(jsonb_agg(distinct jsonb_build_object('o', k.org, 't', k.tab)), '[]'::jsonb) into v_marks
      from (select o.organization_id org, case when (o.data_class = 'field' or o.table_id = custom.field_kernel_id())
                             and (o.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                            then (o.data ->> 'entity_definition_id')::uuid
                            when o.data_class = 'table' or o.table_id = custom.table_kernel_id() then o.id end tab from old_rows o where (o.data_class in ('field', 'table', 'rule', 'relation', 'kernel', 'merge_field') or o.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))) k;
  end if;
  select coalesce(array_agg(distinct (e ->> 'o')::uuid), '{}') into v_kernel
    from jsonb_array_elements(v_marks) e where e ->> 't' is null and e ->> 'o' is not null;
  for c in select (e ->> 'o')::uuid org, array_agg(distinct (e ->> 't')::uuid) filter (where e ->> 't' is not null) tabs
             from jsonb_array_elements(v_marks) e where e ->> 'o' is not null group by 1 loop
    if c.org = any (v_kernel) then
      perform custom._computed_mark_org(c.org);
    else
      perform custom._computed_mark_tables(c.org, c.tabs);
    end if;
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

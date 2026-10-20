-- chair-step: drops the READ-SPEED-5 a compute lane and organization marks and restores the READ-SPEED-4 bodies (run the b inverse first)
-- lane: READ-SPEED-5
-- allows: revoke custom
-- based-on: custom._not_a_member_refusal(text, uuid) b5467f960617782393dc72c0b80ebad245d6de29bbf0c5714f77eaa63a9eba19
-- based-on: custom.computed_refresh(uuid, integer) 7cb42b7858ef2214517c4d6b8fef4e8c66754e04753563e17d8c8bc122c07b09
-- based-on: custom.computed_refresh(uuid, uuid, uuid[]) a03c6661b96f55afa2f78cbbc9c4df3468ed139af00292cdc4b61cc5557297da
-- based-on: custom._computed_stale_stmt() 5e586012da6343fb8991e3f0871a816c8742855f48ca8208d1020621bda741e2
-- based-on: custom._computed_mark(uuid, uuid[], uuid[]) 72c92c0c4188d36858f46ba4e451e921113e1c769220a8871294619f8c9d9228
-- based-on: custom._computed_mark_org(uuid) c359d820daf52e4aaf5ea2ed72a3d246f2921ab2bba785b2c4d249916f06ae3d
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) 4f473a7eda104c5e83aa8a69aa518b826eefaf1b2dbc5730de842913e58cdc62
-- Inverse of migrations/campaign/20261021240000_readspeed5_a_the_refresh_door_works_out_values_in_the_compute_lane.sql.
-- After it every signed-in refresh refuses again and every column write marks the whole organization inside the write.
CREATE OR REPLACE FUNCTION custom._not_a_member_refusal(p_door text, p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- HONEST-REFUSALS: a person who HAS a membership row on an organization that is ARCHIVED is not "not a
  -- member": the archive closed the organization (iam.has_org_access_for), the membership is kept so a
  -- restore gives everything back. She is told that, who can restore it, and the door that does.
  -- A non-member (or a null organization) meets the old sentence, word for word, below.
  if p_organization_id is not null and exists (
       select 1
         from iam.organization_member m
         join iam.organizations o on o.id = m.organization_id and o.archived_at is not null
        where m.organization_id = p_organization_id and m.user_id = (select auth.uid())) then
    raise exception '%',
      case when custom._door_action_words(p_door) is null
           then 'This organization is archived, so there is nothing for you to do there until an owner restores it.'
           else format('This organization is archived, so %s is not possible there until an owner restores it.', lower(left(custom._door_action_words(p_door), 1)) || substr(custom._door_action_words(p_door), 2)) end
      using errcode = '42501',
            detail = 'organization_archived:' || p_organization_id::text,
            hint = 'Restore door: iam.organization_restore(p_org, p_confirm_name). Only an owner of the organization, or a super admin, can restore it; then every door works there again.';
  end if;
  perform custom._not_a_member_refusal(p_door);
end
$function$;

CREATE OR REPLACE FUNCTION custom.computed_refresh(p_table_id uuid, p_max_rows integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org    uuid := custom._computed_door_org(p_table_id);
  v_me     uuid := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  v_claims text := current_setting('request.jwt.claims', true);
  v_ids    uuid[];
  v_left   integer;
begin
  perform custom._computed_warm(v_me, v_org, p_table_id);
  select coalesce(array_agg(x.record_id), '{}') into v_ids from (
    select rc.record_id from custom.record_computed rc
     where rc.organization_id = v_org and rc.table_id = p_table_id and rc.stale
     limit least(greatest(coalesce(p_max_rows, 200), 1), 500)) x;
  if cardinality(v_ids) > 0 then
    -- worked out in the server lane (nothing hidden, the same for every reader), then the caller's claims return
    perform set_config('request.jwt.claims', '', true);
    begin
      perform custom.computed_refresh(v_org, p_table_id, v_ids);
    exception when others then
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      raise;
    end;
    perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  end if;
  select count(*) into v_left from custom.record_computed rc
   where rc.organization_id = v_org and rc.table_id = p_table_id and rc.stale;
  return v_left;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.computed_refresh(p_org uuid, p_table uuid, p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_claims text := current_setting('request.jwt.claims', true);
  v_gen    jsonb;
  v_row    custom.record;
  v_vals   jsonb;
  v_ids    uuid[];
  v_n      integer := 0;
begin
  if nullif(v_claims, '') is not null then
    raise exception 'custom.computed_refresh runs in the server lane only.' using errcode = '42501';
  end if;
  -- gone, archived or moved records keep nothing; neither does a Table that may not keep values
  delete from custom.record_computed rc
   where rc.record_id = any (p_ids)
     and (not custom._computed_eligible(p_org, p_table)
          or not exists (select 1 from custom.record r where r.organization_id = p_org and r.id = rc.record_id
                            and r.table_id = p_table and r.deleted_at is null and r.data_class = 'record'));
  if not custom._computed_eligible(p_org, p_table) then
    return 0;
  end if;
  select coalesce(array_agg(r.id), '{}') into v_ids from custom.record r
   where r.organization_id = p_org and r.table_id = p_table and r.id = any (p_ids)
     and r.deleted_at is null and r.data_class = 'record';
  if cardinality(v_ids) = 0 then
    return 0;
  end if;
  select coalesce(jsonb_object_agg(rc.record_id::text, rc.gen), '{}') into v_gen
    from custom.record_computed rc where rc.record_id = any (v_ids);
  if cardinality(v_ids) > 1 and coalesce(current_setting('mx.page_prefetch', true), '') <> 'off' then
    perform custom._page_derived_prefetch(p_org, p_table, v_ids);
  end if;
  for v_row in select * from custom.record r where r.organization_id = p_org and r.id = any (v_ids) order by r.id loop
    v_vals := custom._computed_vals(v_row);
    insert into custom.record_computed as rc (record_id, organization_id, table_id, vals, stale, gen, computed_at)
    values (v_row.id, p_org, p_table, v_vals, false, 0, clock_timestamp())
    on conflict (record_id) do update
       set vals = excluded.vals, table_id = excluded.table_id, computed_at = excluded.computed_at,
           stale = rc.gen is distinct from (v_gen ->> v_row.id::text)::bigint;
    v_n := v_n + 1;
  end loop;
  return v_n;
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
  -- A changed column, Table, relation or rule: the whole organization's kept values are stale, and who sees what may
  -- have moved (masks, confidentiality, archive of a Table).
  if tg_op = 'INSERT' then
    select coalesce(array_agg(distinct n.organization_id), '{}') into v_kernel from new_rows n
     where n.data_class is distinct from 'record' or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id());
  elsif tg_op = 'UPDATE' then
    select coalesce(array_agg(distinct n.organization_id), '{}') into v_kernel from new_rows n
     where (n.data_class is distinct from 'record' or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))
       and exists (select 1 from old_rows o where o.id = n.id and o.organization_id = n.organization_id
                    and (o.data is distinct from n.data or o.deleted_at is distinct from n.deleted_at));
  else
    select coalesce(array_agg(distinct o.organization_id), '{}') into v_kernel from old_rows o
     where o.data_class is distinct from 'record' or o.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id());
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
  -- the Tables of this organization whose values may be kept
  select coalesce(array_agg(t.tid), '{}') into v_elig
    from (select distinct (f.data ->> 'entity_definition_id')::uuid tid from custom.record f
           where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
             and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
             and coalesce(f.data ->> 'compute_on', '') = 'read') t
   where custom._computed_eligible(p_org, t.tid);
  if cardinality(v_elig) = 0 then
    return 0;
  end if;
  while v_depth < 3 and cardinality(v_frontier) > 0 and cardinality(v_all) <= 5000 loop
    select coalesce(array_agg(distinct n.id), '{}') into v_next from (
      select a.target_id id from platform.associations a
       where a.organization_id = p_org and a.source_id = any (v_frontier) and a.target_type = 'record'
      union
      select a.source_id from platform.associations a
       where a.organization_id = p_org and a.target_id = any (v_frontier) and a.target_type = 'record') n
     where n.id is not null and not (n.id = any (v_all));
    v_all := v_all || v_next;
    -- only records whose own worked-out values can change carry the change on
    select coalesce(array_agg(r.id), '{}') into v_frontier from custom.record r
     where r.organization_id = p_org and r.id = any (v_next) and r.table_id = any (v_elig);
    v_depth := v_depth + 1;
  end loop;
  if cardinality(v_all) > 5000 then
    perform custom._computed_mark_org(p_org);
    return -1;
  end if;
  insert into custom.record_computed as rc (record_id, organization_id, table_id, vals, stale, gen)
  select r.id, r.organization_id, r.table_id, null, true, 1
    from custom.record r
   where r.organization_id = p_org and r.id = any (v_all) and r.table_id = any (v_elig) and r.data_class = 'record'
   order by r.id
  on conflict (record_id) do update set stale = true, gen = rc.gen + 1;
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._computed_mark_org(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
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
  -- served only once writes keep them current (the write triggers); mx.computed_store = force serves anyway (proofs)
  -- HELD (READ-SPEED-4 d): nothing kept is served until custom.computed_refresh works for a signed-in caller;
  -- mx.computed_store = force serves anyway (proofs only)
  if coalesce(current_setting('mx.computed_store', true), '') <> 'force' then
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
REVOKE ALL ON FUNCTION custom._computed_reader_ok(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name = '_computed_compute';
DROP FUNCTION custom._computed_compute(uuid, uuid, uuid[]);
DROP FUNCTION custom._in_compute_lane();
DROP FUNCTION custom._computed_apply_org_mark(uuid);
DELETE FROM platform.entity_types WHERE token = 'computed_org_mark';
DROP TABLE custom.computed_org_mark;

-- chair-step: registers its new machinery table in platform.entity_types (the provision guard requires it in the same transaction); replaces the body of the statement trigger function custom._computed_stale_stmt (chair authorized, READ-SPEED-5)
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-5
-- lock: custom
-- allows: revoke custom
-- based-on: custom._not_a_member_refusal(text, uuid) 6c7c77f955b34ee4237a1b482939e2924930aea3238d5f214bb009c874bc1470
-- based-on: custom.computed_refresh(uuid, integer) 92d5d212070bf9c24faf1800e2e57265da431c6deb1b8fcd7fda9e3a2bbc8215
-- based-on: custom.computed_refresh(uuid, uuid, uuid[]) a21fea98514adb044d0dab10ed5f8f493e2f425a8fdc04a45786707177ed1fba
-- based-on: custom._computed_stale_stmt() 1b02e482e2d5184eae2a738ded094984b824e80e0cb45679f119c3661a857a9e
-- based-on: custom._computed_mark(uuid, uuid[], uuid[]) 1b28df7d4883c18f82d1ae9cf709bb66697e7a0b8ba6ed7a54a70937b2a5ff75
-- based-on: custom._computed_mark_org(uuid) b87ef4c7342f670cdae999da306d96baf9e698a9ab098d5d0a2d67f6a021a412
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) f92d4abd71ce3039a684715924254e971185954e32fc9f3d1514e3942322fc73
--
-- READ-SPEED-5 a — THE REFRESH DOOR NEVER RERUNS THE CLIENT-CHECKED READ PATH (chair ruling R1).
--  * custom.computed_refresh(p_table_id, p_max_rows) and custom.computed_warm(p_table_id) ask the ladder ONCE at the
--    door (custom._computed_door_org: the caller may read the Table), then hand the work to
--    custom._computed_compute(org, table, ids): SECURITY DEFINER, no client grant, declared server_only.
--  * custom._computed_compute is the one home of the work-out: it clears the claims for its own length, so the shared
--    engine (custom._computed_vals -> custom.record_values_step, the page read's own formula, roll-up and lookup
--    engine, with custom._page_derived_prefetch for the set) answers with nothing hidden, the same for every reader.
--    The values are worked out first and written in one statement, so the statement memo the prefetch fills is still
--    the one the per-row engine reads.
--  * No GUC marker: the engine's one wall (custom.assert_client_may_reach -> custom._not_a_member_refusal) admits the
--    compute lane only when PostgreSQL's own call stack shows custom._computed_compute running as the store's owner
--    with no claims (custom._in_compute_lane, the pattern of content._write_came_through).
--  * custom.computed_refresh(org, table, ids) (the drain's server-lane entry) now hands to the same home.
--  * WRITES STOP PAYING FOR THE WHOLE ORGANIZATION. A column, Table, rule or relation write used to mark every kept row
--    of the organization stale inside the write (live: a Field edit 340 -> 1052 ms, a Field archive 127 -> 764 ms, and
--    waits past 20 s on rows another write held). It now leaves one row in custom.computed_org_mark (no lock on
--    anything another write holds); while it exists nothing kept is served in that organization
--    (custom._computed_reader_ok), and the next view's refresh applies it (custom._computed_apply_org_mark).
--    Runs, dashboards, templates and other non-column rows no longer mark anything.
-- Before: every signed-in call refused ("You are not a member of that organization"). After: refreshed.
-- Inverse: migrations/inverse/20261021240000_readspeed5_a_the_refresh_door_works_out_values_in_the_compute_lane_down.sql

CREATE TABLE custom.computed_org_mark (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  marked_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX computed_org_mark_org ON custom.computed_org_mark (organization_id);
ALTER TABLE custom.computed_org_mark ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON custom.computed_org_mark FROM PUBLIC, anon, authenticated;
INSERT INTO platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
VALUES ('computed_org_mark', 'custom', 'computed_org_mark', 'Computed Organization Mark', 'machinery',
        'machinery: one row per column, Table, rule or relation write (once per transaction per organization) saying every kept worked-out value of that organization is out of date; read by custom._computed_reader_ok, taken by custom._computed_apply_org_mark; RLS on, no grants to anon or authenticated; schema custom is CLOSED',
        'custom.computed_org_mark'::regclass);
COMMENT ON TABLE custom.computed_org_mark IS
  'READ-SPEED-5 a: a pending organization-wide stale mark. While any row exists for an organization nothing kept is served there; the next view applies it.';

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

CREATE FUNCTION custom._computed_apply_org_mark(p_org uuid)
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
REVOKE ALL ON FUNCTION custom._computed_apply_org_mark(uuid) FROM PUBLIC, anon, authenticated;

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

CREATE FUNCTION custom._in_compute_lane()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ctx text;
begin
  if nullif(btrim(coalesce(current_setting('request.jwt.claims', true), '')), '') is not null then
    return false;
  end if;
  if current_user <> (select pg_get_userbyid(c.relowner) from pg_class c where c.oid = 'custom.record'::regclass) then
    return false;
  end if;
  -- PostgreSQL writes this stack; no caller can.
  get diagnostics v_ctx = pg_context;
  return coalesce(v_ctx, '') ~ '(^|\n)PL/pgSQL function custom\._computed_compute\(uuid,uuid,uuid\[\]\) line [0-9]+ at ';
end;
$function$;
REVOKE ALL ON FUNCTION custom._in_compute_lane() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION custom._computed_compute(p_org uuid, p_table uuid, p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_claims text := current_setting('request.jwt.claims', true);
  v_gen    jsonb;
  v_row    custom.record;
  v_ids    uuid[];
  v_done   uuid[] := '{}';
  v_vals   jsonb[] := '{}';
  v_n      integer := 0;
begin
  -- the compute lane: nobody's claims for this function's length, so nothing is hidden (custom._in_compute_lane)
  perform set_config('request.jwt.claims', '', true);
  begin
    -- gone, archived or moved records keep nothing; neither does a Table that may not keep values
    delete from custom.record_computed rc
     where rc.record_id = any (p_ids)
       and (not custom._computed_eligible(p_org, p_table)
            or not exists (select 1 from custom.record r where r.organization_id = p_org and r.id = rc.record_id
                              and r.table_id = p_table and r.deleted_at is null and r.data_class = 'record'));
    if custom._computed_eligible(p_org, p_table) then
      select coalesce(array_agg(r.id), '{}') into v_ids from custom.record r
       where r.organization_id = p_org and r.table_id = p_table and r.id = any (p_ids)
         and r.deleted_at is null and r.data_class = 'record';
      if cardinality(v_ids) > 0 then
        select coalesce(jsonb_object_agg(rc.record_id::text, rc.gen), '{}') into v_gen
          from custom.record_computed rc where rc.record_id = any (v_ids);
        if cardinality(v_ids) > 1 and coalesce(current_setting('mx.page_prefetch', true), '') <> 'off' then
          perform custom._page_derived_prefetch(p_org, p_table, v_ids);
        end if;
        -- worked out first, written once: a write between the prefetch and the engine would change the memo's stamp
        for v_row in select * from custom.record r where r.organization_id = p_org and r.id = any (v_ids) order by r.id loop
          v_done := v_done || v_row.id;
          v_vals := v_vals || custom._computed_vals(v_row);
        end loop;
        insert into custom.record_computed as rc (record_id, organization_id, table_id, vals, stale, gen, computed_at)
        select x.id, p_org, p_table, x.vals, false, 0, clock_timestamp()
          from unnest(v_done, v_vals) as x(id, vals)
        on conflict (record_id) do update
           set vals = excluded.vals, table_id = excluded.table_id, computed_at = excluded.computed_at,
               stale = rc.gen is distinct from (v_gen ->> excluded.record_id::text)::bigint;
        v_n := cardinality(v_done);
      end if;
    end if;
  exception when others then
    perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    raise;
  end;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  return v_n;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_compute(uuid, uuid, uuid[]) FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
SELECT d.* FROM (VALUES
  ('custom', '_computed_compute', 'p_org uuid, p_table uuid, p_ids uuid[]', ARRAY['uuid'::regtype, 'uuid'::regtype, 'uuid[]'::regtype]::oid[],
   'Works out and keeps the roll-up, lookup and formula values of the named records of one Table, with nothing hidden. Not a door: it makes no access decision.',
   'migrations/campaign/20261021240000_readspeed5_a_the_refresh_door_works_out_values_in_the_compute_lane.sql (READ-SPEED-5)',
   'server_only: no client grant. Reached only from custom.computed_refresh(p_table_id, p_max_rows), which asked the access ladder for the caller on the Table first, and from custom.computed_refresh(org, table, ids), the server lane''s drain.',
   false, false)
) AS d(schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door c WHERE c.schema_name = d.schema_name AND c.function_name = d.function_name AND c.identity_argtypes = d.identity_argtypes);

CREATE OR REPLACE FUNCTION custom.computed_refresh(p_org uuid, p_table uuid, p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null then
    raise exception 'custom.computed_refresh runs in the server lane only.' using errcode = '42501';
  end if;
  return custom._computed_compute(p_org, p_table, p_ids);
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

CREATE OR REPLACE FUNCTION custom._not_a_member_refusal(p_door text, p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- READ-SPEED-5 a: THE COMPUTE LANE. Inside custom._computed_compute (SECURITY DEFINER, no client grant, reached only
  -- from the doors custom.computed_refresh / custom.computed_warm after they asked the ladder) nobody's claims are set,
  -- so the engine works the values out with nothing hidden. That is not a member being refused: the reach is
  -- admitted for this statement (the same memo the wall itself writes) and the wall stays exactly as it was for
  -- every other caller. custom._in_compute_lane reads the call stack PostgreSQL writes; no caller can write it.
  if custom._in_compute_lane() then
    perform platform.memo_k_put('w:r:' || coalesce(p_organization_id::text, '-'), '1');
    return;
  end if;
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

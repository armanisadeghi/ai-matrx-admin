-- chair-step: registers its new machinery table in platform.entity_types (the provision guard requires it in the same transaction); statement triggers on custom.record, platform.associations and the access tables (chair authorized, READ-SPEED-4)
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-4
-- lock: custom
-- allows: revoke custom
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) 9159b151b78474754607336059aff3fbf8b75332e0912485409bab5fc9298a79
--
-- READ-SPEED-4 b — WRITES MARK KEPT VALUES STALE; A VIEW REFRESHES THEM; THE READER CHECK IS KEPT (chair rulings R1', R2').
-- Needs READ-SPEED-3 a and c.
--  * FRESHNESS. Statement triggers on custom.record and platform.associations only MARK the affected kept values stale
--    (custom._computed_stale_stmt / _computed_assoc_stmt). The stale flag is the queue. Readers work stale rows out
--    at read, so an answer is never wrong.
--  * custom.computed_refresh(p_table_id, p_max_rows) — the client calls it, without waiting, after a page read:
--    for a reader who may read the Table it works out up to p_max_rows stale values in the server lane and answers
--    how many are left. It also keeps the reader's judgement (below).
--  * THE READER CHECK IS KEPT. custom.computed_reader_judgement holds, per (reader, organization, Table), whether the
--    reader sees every row and every column the kept values come from, stamped with the organization's and the
--    platform's access version. Written only by custom.computed_refresh and custom.computed_warm (VOLATILE doors);
--    STABLE reads only read it, and an entry is honoured only while both versions are unchanged and for 5 minutes.
--  * ACCESS VERSIONS. Every access-changing write bumps a version once per transaction (custom._access_version_bump):
--    the organization's for Field, Table, rule and relation rows, and record archive/restore; the platform
--    row (organization 00000000-...) for grants, memberships, teams, shares, interfaces, access setup, carrying rules
--    and knob overrides. Guard: scripts/campaign-tests/readspeed4_d_every_access_door_bumps_the_version.sql.
--  * THE COLUMN CHECK reads only the columns the kept values come from (roll-up and lookup of/filter/via keys,
--    formula inputs, and the worked-out columns themselves), one iam.may_touch_field each, not the whole mask.
-- The triggers that call these are READ-SPEED-4 c (20261020240110_readspeed4_c_the_write_triggers); until it lands nothing kept is served.
-- Inverse: migrations/inverse/20261020240100_readspeed4_b_writes_mark_stale_views_refresh_reader_check_kept_down.sql

-- ── ACCESS VERSIONS ─────────────────────────────────────────────────────────────────────────────────────────
-- One counter per organization (and one for the whole platform, organization 00000000-...), moved once per writing
-- transaction by every door that changes who sees what. (Its own table: T-13 retires the older word for this.)
CREATE TABLE custom.access_version (
  organization_id uuid PRIMARY KEY,
  version         bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  bumped_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE custom.access_version ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON custom.access_version FROM PUBLIC, anon, authenticated;
INSERT INTO platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
VALUES ('access_version', 'custom', 'access_version', 'Access Version', 'machinery',
        'machinery: a counter per organization (and one for the platform) moved once per transaction by every write that changes who sees what; read by custom._access_versions to honour kept reader judgements; RLS on, no grants to anon or authenticated; schema custom is CLOSED',
        'custom.access_version'::regclass);

CREATE FUNCTION custom._access_version_bump(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_seen text := coalesce(current_setting('mx.access_bumped', true), '');
  v_tag  text := pg_current_xact_id()::text || ':' || coalesce(p_org, '00000000-0000-0000-0000-000000000000'::uuid)::text;
begin
  -- once per transaction per organization: what a reader sees changes at commit, so one bump is enough
  if position(v_tag in v_seen) > 0 then
    return;
  end if;
  insert into custom.access_version as v (organization_id, version, bumped_at)
  values (coalesce(p_org, '00000000-0000-0000-0000-000000000000'::uuid), 2, now())
  on conflict (organization_id) do update set version = v.version + 1, bumped_at = now();
  perform set_config('mx.access_bumped', right(v_seen, 4000) || ' ' || v_tag, true);
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_version_bump(uuid) FROM PUBLIC, anon, authenticated;

-- A write to an access table: the platform version moves (who may see what, anywhere).
CREATE FUNCTION custom._access_version_bump_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  perform custom._access_version_bump(null);
  return null;
end;
$function$;

-- The two versions a judgement is stamped with: the organization's and the platform's.
CREATE FUNCTION custom._access_versions(p_org uuid)
 RETURNS bigint[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select array[coalesce((select v.version from custom.access_version v where v.organization_id = p_org), 1),
               coalesce((select v.version from custom.access_version v
                          where v.organization_id = '00000000-0000-0000-0000-000000000000'::uuid), 1)]
$function$;
REVOKE ALL ON FUNCTION custom._access_versions(uuid) FROM PUBLIC, anon, authenticated;

-- ── THE KEPT READER JUDGEMENT ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE custom.computed_reader_judgement (
  reader_id       uuid NOT NULL,
  organization_id uuid NOT NULL,
  table_id        uuid NOT NULL,
  versions        bigint[] NOT NULL,
  ok              boolean NOT NULL,
  judged_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reader_id, organization_id, table_id)
);
ALTER TABLE custom.computed_reader_judgement ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON custom.computed_reader_judgement FROM PUBLIC, anon, authenticated;
INSERT INTO platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
VALUES ('computed_reader_judgement', 'custom', 'computed_reader_judgement', 'Computed Reader Judgement', 'machinery',
        'machinery: whether a reader may be served kept worked-out values of a Table, stamped with the access versions; written by custom.computed_refresh / custom.computed_warm, read by SECURITY DEFINER read doors; RLS on, no grants to anon or authenticated; schema custom is CLOSED',
        'custom.computed_reader_judgement'::regclass);
COMMENT ON TABLE custom.computed_reader_judgement IS
  'READ-SPEED-4: the kept answer of custom._computed_reader_judge per (reader, organization, Table), honoured while custom._access_versions is unchanged and for 5 minutes.';

-- The slow, exact judgement: the reader sees every row of every Table the kept values come from, and every column
-- they are worked out from.
CREATE FUNCTION custom._computed_reader_judge(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_comp  uuid[] := custom._computed_component(p_org, p_table);
  v_t     uuid;
  v_all   boolean;
  v_level public.permission_level;
  c       record;
begin
  foreach v_t in array v_comp loop
    select s.o_all_visible into v_all from custom.visible_set(p_me, p_org, v_t, 'viewer'::public.permission_level) s;
    if not coalesce(v_all, false) then
      return false;
    end if;
  end loop;
  for c in
    with f as (
      select f.id, f.data, (f.data ->> 'entity_definition_id')::uuid tid
        from custom.record f
       where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = any (v_comp)),
    k as (
      select f.data -> 'config' ->> 'of' k from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select f.data -> 'config' ->> 'via' from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select jsonb_object_keys(case when jsonb_typeof(f.data -> 'config' -> 'filter') = 'object'
                                          then f.data -> 'config' -> 'filter' else '{}'::jsonb end)
              from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select jsonb_array_elements_text(case when jsonb_typeof(f.data -> 'depends_on') = 'array'
                                                  then f.data -> 'depends_on' else '[]'::jsonb end) from f),
    ids as (
      select (x #>> '{}') id from f cross join lateral jsonb_path_query(coalesce(f.data -> 'config' -> 'expr', 'null'::jsonb), 'strict $.**.field') x
       where custom.parity_type(f.data) = 'formula' and jsonb_typeof(x) = 'string')
    select f.id, f.tid from f
     where f.data ->> 'key' in (select k from k where k is not null)
        or f.id::text in (select id from ids)
        or custom.parity_type(f.data) in ('rollup', 'lookup', 'formula')
     order by f.tid
  loop
    v_level := custom.effective_level(p_me, p_org, c.tid);
    if not coalesce(iam.may_touch_field(p_me, c.id, p_org, v_level, 'read'), false) then
      return false;
    end if;
  end loop;
  return true;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_reader_judge(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Judge and keep. Versions are read BEFORE judging, so a change that commits meanwhile always invalidates.
CREATE FUNCTION custom._computed_warm(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ver bigint[] := custom._access_versions(p_org);
  v_ok  boolean;
begin
  if p_me is null or not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  v_ok := custom._computed_reader_judge(p_me, p_org, p_table);
  insert into custom.computed_reader_judgement as j (reader_id, organization_id, table_id, versions, ok, judged_at)
  values (p_me, p_org, p_table, v_ver, v_ok, now())
  on conflict (reader_id, organization_id, table_id) do update set versions = excluded.versions, ok = excluded.ok, judged_at = excluded.judged_at;
  return v_ok;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_warm(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

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
REVOKE ALL ON FUNCTION custom._computed_reader_ok(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── THE CLIENT'S DOORS ──────────────────────────────────────────────────────────────────────────────────────
-- The Table's organization, when the caller may read the Table; else refused in a sentence.
CREATE FUNCTION custom._computed_door_org(p_table uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me  uuid := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
  v_org uuid;
begin
  select t.organization_id into v_org from custom.record t
   where t.id = p_table and t.data_class = 'table' and t.deleted_at is null;
  if v_me is null or v_org is null or custom.effective_level(v_me, v_org, p_table) is null then
    raise exception 'That table is not open to you.' using errcode = '42501';
  end if;
  return v_org;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_door_org(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION custom.computed_warm(p_table_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 VOLATILE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org uuid := custom._computed_door_org(p_table_id);
begin
  return custom._computed_warm((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid, v_org, p_table_id);
end;
$function$;

CREATE FUNCTION custom.computed_refresh(p_table_id uuid, p_max_rows integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 VOLATILE
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

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
SELECT d.* FROM (VALUES
  ('custom', 'computed_refresh', 'p_table_id uuid, p_max_rows integer', ARRAY['uuid'::regtype, 'integer'::regtype]::oid[],
   'Works out again up to p_max_rows kept roll-up, lookup and formula values of one Table that writes marked stale, and answers how many are left. SECURITY DEFINER, but it first asks the access ladder (custom.effective_level for auth.uid() on the Table) and refuses in a sentence a caller who may not read it. The values are worked out in the server lane and are the same for every reader; who may be SERVED them is judged per reader at read (custom._computed_reader_ok). It writes only custom.record_computed and custom.computed_reader_judgement.',
   'migrations/campaign/20261020240100_readspeed4_b_writes_mark_stale_views_refresh_reader_check_kept.sql (READ-SPEED-4)',
   NULL::text, true, false,
   '{"version": 1, "arguments": {"p_table_id": {"type": "uuid", "position": 1, "optional": false, "null_rule": {}, "foreign": {"bounded": true, "note": "Judged by the access ladder on the Table itself."}}, "p_max_rows": {"type": "integer", "position": 2, "optional": true, "null_rule": {"means": "200"}, "foreign": {"not_an_id": true}}}}'::jsonb),
  ('custom', 'computed_warm', 'p_table_id uuid', ARRAY['uuid'::regtype]::oid[],
   'Judges and keeps whether the caller may be served kept worked-out values of one Table (sees every row and column they come from). SECURITY DEFINER, but it first asks the access ladder (custom.effective_level for auth.uid() on the Table) and refuses a caller who may not read it. It writes only the caller''s own row of custom.computed_reader_judgement and answers true or false.',
   'migrations/campaign/20261020240100_readspeed4_b_writes_mark_stale_views_refresh_reader_check_kept.sql (READ-SPEED-4)',
   NULL::text, true, false,
   '{"version": 1, "arguments": {"p_table_id": {"type": "uuid", "position": 1, "optional": false, "null_rule": {}, "foreign": {"bounded": true, "note": "Judged by the access ladder on the Table itself."}}}}'::jsonb)
) d(schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
 WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door c WHERE c.schema_name = d.schema_name AND c.function_name = d.function_name AND c.identity_argtypes = d.identity_argtypes);
GRANT EXECUTE ON FUNCTION custom.computed_refresh(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION custom.computed_warm(uuid) TO authenticated, service_role;

-- ── WRITES MARK STALE ───────────────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION custom._computed_stale_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c record;
  v_kernel uuid[];
begin
  -- a changed column, Table, relation or rule: the whole organization's kept values are stale
  if tg_op = 'DELETE' then
    select coalesce(array_agg(distinct o.organization_id), '{}') into v_kernel from old_rows o
     where o.data_class is distinct from 'record' or o.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id());
  else
    select coalesce(array_agg(distinct n.organization_id), '{}') into v_kernel from new_rows n
     where (n.data_class is distinct from 'record' or n.table_id in (custom.field_kernel_id(), custom.table_kernel_id(), custom.rule_kernel_id(), custom.merge_field_kernel_id()))
       and (tg_op = 'INSERT' or exists (select 1 from old_rows o where o.id = n.id and o.organization_id = n.organization_id
                                          and (o.data is distinct from n.data or o.deleted_at is distinct from n.deleted_at)));
  end if;
  for c in select unnest(v_kernel) org loop
    perform custom._computed_mark_org(c.org);
    perform custom._access_version_bump(c.org);
  end loop;
  -- who may see what moved: an archive or restore (one bump per organization per transaction)
  if tg_op = 'UPDATE' then
    for c in select distinct n.organization_id org from new_rows n join old_rows o on o.id = n.id and o.organization_id = n.organization_id
              where o.deleted_at is distinct from n.deleted_at loop
      perform custom._access_version_bump(c.org);
    end loop;
  end if;

  for c in
    with ch as (
      select n.organization_id org, n.id, n.data nd, null::jsonb od from new_rows n
       where tg_op = 'INSERT' and n.data_class = 'record'
      union all
      select n.organization_id, n.id, n.data, o.data from new_rows n join old_rows o on o.id = n.id and o.organization_id = n.organization_id
       where tg_op = 'UPDATE' and (n.data_class = 'record' or o.data_class = 'record')
         and (o.data is distinct from n.data or o.deleted_at is distinct from n.deleted_at or o.table_id is distinct from n.table_id)
      union all
      select o.organization_id, o.id, null, o.data from old_rows o where tg_op = 'DELETE' and o.data_class = 'record')
    select ch.org,
           array_agg(distinct ch.id) || coalesce((
             select array_agg(distinct (x #>> '{}')::uuid)
               from ch c2
               cross join lateral jsonb_each(coalesce(c2.nd, '{}') || coalesce(c2.od, '{}')) kv
               cross join lateral jsonb_array_elements(case when jsonb_typeof(kv.value) = 'array' then kv.value
                                                           when jsonb_typeof(kv.value) = 'string' then jsonb_build_array(kv.value)
                                                           else '[]'::jsonb end) x
              where c2.org = ch.org
                and jsonb_typeof(x) = 'string'
                and (x #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), '{}') ids,
           case when tg_op = 'DELETE' then array_agg(distinct ch.id) else '{}'::uuid[] end gone
      from ch
     where not (ch.org = any (v_kernel))
     group by ch.org
  loop
    perform custom._computed_mark(c.org, c.ids, c.gone);
  end loop;
  return null;
end;
$function$;



CREATE FUNCTION custom._computed_assoc_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare c record;
begin
  for c in
    select x.org, array_agg(distinct x.id) ids from (
      select n.organization_id org, n.source_id id from new_rows n where tg_op <> 'DELETE' and n.target_type = 'record'
      union all select n.organization_id, n.target_id from new_rows n where tg_op <> 'DELETE' and n.target_type = 'record'
      union all select o.organization_id, o.source_id from old_rows o where tg_op <> 'INSERT' and o.target_type = 'record'
      union all select o.organization_id, o.target_id from old_rows o where tg_op <> 'INSERT' and o.target_type = 'record') x
     where x.org is not null and x.id is not null
     group by x.org
  loop
    perform custom._computed_mark(c.org, c.ids);
  end loop;
  -- an edge in a carrying role changes who sees what
  for c in
    select distinct x.org from (
      select n.organization_id org, n.role from new_rows n where tg_op <> 'DELETE'
      union all select o.organization_id, o.role from old_rows o where tg_op <> 'INSERT') x
     where x.org is not null and exists (select 1 from custom.carrying_rule cr where cr.is_active and cr.role = x.role)
  loop
    perform custom._access_version_bump(c.org);
  end loop;
  return null;
end;
$function$;

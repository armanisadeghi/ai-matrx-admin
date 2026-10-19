-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-3
-- lock: custom
-- allows: revoke custom
-- based-on: custom.read_records_by_ids(uuid, uuid, uuid[], boolean) 78e8ed135bad40b98b27a4b056f6d43e78263630e7e5d7db7b02e31eb8983b30
-- based-on: custom.read_records_page(uuid, uuid, jsonb, text, jsonb, uuid, boolean, integer, integer, text) c1aa444c7a6196092ff84ccc063801ea4d6a1239234a48483e189c812fa04e25
--
-- READ-SPEED-3 a — WORKED-OUT VALUES ARE KEPT, AND KEPT CURRENT ON WRITE (what Airtable does).
--
-- WHY. Working roll-ups, lookups and formulas out at read time hit its limit: a 50-row page took 1-2.4 s under load
-- and a roll-up sort over 1,000 rows 6-20 s (so sorts stopped at 500 matches). Measured in READ-SPEED-2.
--
-- THE STORE. custom.record_computed keeps, per record, exactly what custom.record_values_step adds for its read-time
-- columns (and their _errors), worked out in the server lane (nothing hidden): custom.computed_refresh.
--  * A write marks stale: the record, the records linked to it (platform.associations, and the links its old and new
--    document name), and on through records whose own worked-out values can change, three links deep
--    (custom._computed_mark; statement triggers on custom.record and platform.associations). A changed column, Table,
--    relation or rule marks the whole organization (custom._computed_mark_org). Over 5,000 records: the organization.
--  * The refresh job (pg_cron every 10 s, scheduled by READ-SPEED-3 b: custom.computed_refresh_drain) works stale records out again, a Table at a
--    time, 50 per batch; a refresh clears stale only if no write marked the row again meanwhile (gen).
--    Progress: custom.computed_refresh_progress(organization).
--  * Reads: custom.read_records_by_ids serves kept values for every current row; custom.read_records_page sorts by
--    them, and only rows still to be worked out count against custom.computed_sort_ceiling(). A stale or missing row
--    is worked out at read exactly as before, so a read right after a write is already right.
--  * THE READER'S MASK. Kept values are served only to a reader who sees every row and every column of every Table
--    joined to this one (custom._computed_reader_ok: visible_set all-visible and a full read mask on each). Anyone
--    else is worked out at read exactly as before, so a kept value never shows anything the read-time path would not.
--  * Not kept: a Table joined to any worked-out column that reads the clock (NOW, TODAY, TONOW, FROMNOW).
-- Switch for the proofs: mx.computed_store = off (the read-time path exactly as before).
-- PROOF: ~/lane-resume/reports/READ-SPEED-3.md (identical output on every computed table admin@admin.com reads;
-- guards scripts/campaign-tests/readspeed3_{a,b,c}_*.sql).
-- The write triggers on custom.record are READ-SPEED-3 b (window-class); until it lands nothing kept is served.
-- Inverse: migrations/inverse/20261019240000_readspeed3_a_worked_out_values_are_kept_and_kept_current_down.sql

-- ── THE STORE ────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE custom.record_computed (
  record_id       uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  table_id        uuid NOT NULL,
  vals            jsonb,                          -- the read-time computed part of the record's document; null = not storable
  stale           boolean NOT NULL DEFAULT true,
  gen             bigint NOT NULL DEFAULT 0,      -- bumped by every stale mark; a refresh clears stale only if unchanged
  computed_at     timestamptz
);
CREATE INDEX record_computed_table_idx ON custom.record_computed (organization_id, table_id);
CREATE INDEX record_computed_stale_idx ON custom.record_computed (organization_id, table_id) WHERE stale;
ALTER TABLE custom.record_computed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON custom.record_computed FROM PUBLIC, anon, authenticated;
INSERT INTO platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
VALUES ('record_computed', 'custom', 'record_computed', 'Record Computed Values', 'machinery',
        'machinery: kept worked-out values of custom.record, written by the refresh job and read only by SECURITY DEFINER read doors; RLS on, no grants to anon or authenticated; schema custom is CLOSED',
        'custom.record_computed'::regclass);
COMMENT ON TABLE custom.record_computed IS
  'READ-SPEED-3: each record''s worked-out roll-up, lookup and formula values, kept current on write (stale marks + custom.computed_refresh_drain). Served only to a reader who sees every row and column they derive from (custom._computed_reader_ok); everyone else is worked out at read as before.';

-- The Tables joined to this one through relation columns, either direction, transitively (itself included).
CREATE FUNCTION custom._computed_component(p_org uuid, p_table uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk  text := 'custom.computed_component:' || p_org::text || ':' || p_table::text;
  v_raw text := platform.memo_k_get(v_mk);
  v     uuid[];
begin
  if v_raw is not null then
    return v_raw::uuid[];
  end if;
  with recursive e as (
    select f.data ->> 'entity_definition_id' as a, t.t as b
      from custom.record f
      cross join lateral (
        select f.data ->> 'relation_target' as t
        union
        select jsonb_array_elements_text(case when jsonb_typeof(f.data -> 'config' -> 'target_tables') = 'array'
                                              then f.data -> 'config' -> 'target_tables' else '[]'::jsonb end)) t
     where f.organization_id = p_org
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and f.data ->> 'type' = 'relation'
       and t.t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and (f.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  u as (select a, b from e union select b, a from e),
  c(t) as (select p_table::text union select u.b from c join u on u.a = c.t)
  select array_agg(c.t::uuid order by c.t) into v from c;
  perform platform.memo_k_put(v_mk, v::text);
  return v;
end;
$function$;

-- THE COLUMNS THAT READ THE CLOCK, and every column worked out from one of them (NOW / TODAY / TONOW / FROMNOW
-- change without a write): these are never served kept; the read works them out as before. Conservative: a formula
-- is tainted when its declaration names a tainted column of its Table (by id or key), a roll-up or lookup when its
-- declaration names the key of any tainted column of the Tables joined to it. Answer: {Table id: [keys]}.
CREATE FUNCTION custom._computed_tainted(p_org uuid, p_table uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk  text := 'custom.computed_tainted:' || p_org::text || ':' || p_table::text;
  v_raw text := platform.memo_k_get(v_mk);
  v_f   jsonb;
  v_t   jsonb := '[]'::jsonb;     -- [{t, k, id}]
  v_out jsonb;
  v_grew boolean := true;
  v_i   integer := 0;
begin
  if v_raw is not null then
    return v_raw::jsonb;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', f.data ->> 'entity_definition_id', 'k', f.data ->> 'key', 'id', f.id::text,
                    'p', custom.parity_type(f.data), 'x', f.data::text,
                    'v', f.data::text ~ '"fx\.(now|today|tonow|fromnow)"')), '[]'::jsonb)
    into v_f
    from custom.record f
   where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
     and (f.data ->> 'entity_definition_id') = any (custom._computed_component(p_org, p_table)::text[])
     and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
     and coalesce(f.data ->> 'compute_on', '') = 'read';
  select coalesce(jsonb_agg(jsonb_build_object('t', e ->> 't', 'k', e ->> 'k', 'id', e ->> 'id')), '[]'::jsonb) into v_t
    from jsonb_array_elements(v_f) e where (e ->> 'v')::boolean;
  while v_grew and v_i < 20 and jsonb_array_length(v_t) > 0 loop
    v_i := v_i + 1;
    select coalesce(jsonb_agg(jsonb_build_object('t', e ->> 't', 'k', e ->> 'k', 'id', e ->> 'id')), '[]'::jsonb) into v_out
      from jsonb_array_elements(v_f) e
     where not exists (select 1 from jsonb_array_elements(v_t) g where g ->> 'id' = e ->> 'id')
       and exists (select 1 from jsonb_array_elements(v_t) g
                    where case when e ->> 'p' = 'formula'
                               then g ->> 't' = e ->> 't'
                                    and (strpos(e ->> 'x', '"' || (g ->> 'id') || '"') > 0 or strpos(e ->> 'x', '"' || (g ->> 'k') || '"') > 0)
                               else strpos(e ->> 'x', '"' || (g ->> 'k') || '"') > 0 end);
    v_grew := jsonb_array_length(v_out) > 0;
    v_t := v_t || v_out;
  end loop;
  select coalesce(jsonb_object_agg(x.t, x.ks), '{}'::jsonb) into v_out
    from (select g ->> 't' t, jsonb_agg(distinct g ->> 'k') ks from jsonb_array_elements(v_t) g group by 1) x;
  perform platform.memo_k_put(v_mk, v_out::text);
  return v_out;
end;
$function$;

-- A Table's worked-out values may be kept when it has a read-time worked-out column that does not read the clock.
CREATE FUNCTION custom._computed_eligible(p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk  text := 'custom.computed_eligible:' || p_org::text || ':' || p_table::text;
  v_raw text := platform.memo_k_get(v_mk);
  v     boolean;
begin
  if v_raw is not null then
    return v_raw = 't';
  end if;
  v := exists (select 1 from custom.record f
                where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                  and f.data ->> 'entity_definition_id' = p_table::text
                  and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
                  and coalesce(f.data ->> 'compute_on', '') = 'read'
                  and not coalesce(custom._computed_tainted(p_org, p_table) -> p_table::text, '[]'::jsonb) ? (f.data ->> 'key'));
  perform platform.memo_k_put(v_mk, case when v then 't' else 'f' end);
  return v;
end;
$function$;

-- May this reader be served kept values of this Table? Only when they see EVERY row and EVERY column of every Table
-- the values are worked out from (the kept values were worked out with nothing hidden). Anyone else: worked out at
-- read, exactly as before, so the store never shows a reader anything the read-time path would not.
CREATE FUNCTION custom._computed_reader_ok(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk    text;
  v_raw   text;
  v_t     uuid;
  v_all   boolean;
  v_level public.permission_level;
  v_mask  jsonb;
  v_ok    boolean := true;
begin
  if coalesce(current_setting('mx.computed_store', true), '') = 'off' then
    return false;
  end if;
  if not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  -- served only once writes keep them current (the write triggers, READ-SPEED-3 b, a window-class change);
  -- mx.computed_store = force serves them anyway, for the proofs only
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
  foreach v_t in array custom._computed_component(p_org, p_table) loop
    select s.o_all_visible into v_all from custom.visible_set(p_me, p_org, v_t, 'viewer'::public.permission_level) s;
    if not coalesce(v_all, false) then
      v_ok := false; exit;
    end if;
    v_level := custom.effective_level(p_me, p_org, v_t);
    v_mask := custom.read_mask_for(p_me, p_org, v_t, v_level, 'read');
    if exists (select 1 from jsonb_object_keys(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
                where not (coalesce(v_mask -> 'visible', '[]'::jsonb) ? k)) then
      v_ok := false; exit;
    end if;
  end loop;
  perform platform.memo_k_put(v_mk, case when v_ok then 't' else 'f' end);
  return v_ok;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_reader_ok(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The kept part of one record: exactly what custom.record_values_step adds for its read-time columns (and their
-- `_errors`), worked out in the server lane (no reader: nothing hidden). Null when it cannot be worked out.
CREATE FUNCTION custom._computed_vals(p_row custom.record, p_cache jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc   jsonb;
  v_tf    text;
  v_rtype text;
  v_out   jsonb;
begin
  begin
    select s.o_doc into v_doc from custom.record_values_step(p_row, p_cache) s;
    v_tf := custom.table_type_field(p_row.organization_id, p_row.table_id);
    if v_tf is not null then
      v_rtype := p_row.data ->> v_tf;
    end if;
    select coalesce(jsonb_object_agg(a.data ->> 'key', coalesce(v_doc -> (a.data ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
      into v_out
      from custom.applicable_fields(p_row.organization_id, p_row.table_id, v_rtype) a
     where custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
       and coalesce(a.data ->> 'compute_on', '') = 'read';
    if v_doc ? '_errors' then
      v_out := v_out || jsonb_build_object('_errors', v_doc -> '_errors');
    end if;
  exception when others then
    v_out := null;
  end;
  return v_out;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_vals(custom.record, jsonb) FROM PUBLIC, anon, authenticated;

-- Work out and keep these records' values (server lane only: the owner of the store; cron / migrations).
CREATE FUNCTION custom.computed_refresh(p_org uuid, p_table uuid, p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 VOLATILE
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
REVOKE ALL ON FUNCTION custom.computed_refresh(uuid, uuid, uuid[]) FROM PUBLIC, anon, authenticated;

-- Mark records (and everything worked out from them, three links deep) stale. Called by the write triggers.
CREATE FUNCTION custom._computed_mark(p_org uuid, p_ids uuid[], p_hard_deleted uuid[] DEFAULT '{}')
 RETURNS integer
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
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
REVOKE ALL ON FUNCTION custom._computed_mark(uuid, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;

-- Every kept value of an organization is stale (a column, Table, relation or rule changed); records of Tables that
-- may now keep values and keep none yet are queued too.
CREATE FUNCTION custom._computed_mark_org(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
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
REVOKE ALL ON FUNCTION custom._computed_mark_org(uuid) FROM PUBLIC, anon, authenticated;






-- THE REFRESH JOB: stale records, a Table at a time, 50 per call, for up to p_ms milliseconds. Run by pg_cron every
-- 10 seconds; one runner at a time (advisory lock).
CREATE FUNCTION custom.computed_refresh_drain(p_ms integer DEFAULT 8000)
 RETURNS integer
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t0 timestamptz := clock_timestamp();
  v_n  integer := 0;
  c    record;
begin
  if not pg_try_advisory_xact_lock(hashtext('custom.computed_refresh_drain')) then
    return 0;
  end if;
  loop
    select rc.organization_id org, rc.table_id tid into c
      from custom.record_computed rc where rc.stale order by rc.gen desc limit 1;
    exit when c.org is null;
    v_n := v_n + custom.computed_refresh(c.org, c.tid,
             array(select rc.record_id from custom.record_computed rc
                    where rc.organization_id = c.org and rc.table_id = c.tid and rc.stale limit 50));
    exit when clock_timestamp() - v_t0 > make_interval(secs => p_ms / 1000.0);
  end loop;
  return v_n;
end;
$function$;
REVOKE ALL ON FUNCTION custom.computed_refresh_drain(integer) FROM PUBLIC, anon, authenticated;

-- Progress of an organization's refresh (kept, still refreshing).
CREATE FUNCTION custom.computed_refresh_progress(p_org uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select jsonb_build_object('kept', count(*) filter (where not stale), 'refreshing', count(*) filter (where stale))
    from custom.record_computed where organization_id = p_org
$function$;

-- The value a sort reads for a worked-out column: the kept value when it is current, else worked out as before.
CREATE FUNCTION custom._computed_sort_value(p_org uuid, p_id uuid, p_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case when rc.record_id is not null and not rc.stale and rc.vals is not null then rc.vals -> p_key
              else custom.record_value_one(p_org, p_id, p_key) end
    from (select 1) o left join custom.record_computed rc on rc.record_id = p_id
$function$;
REVOKE ALL ON FUNCTION custom._computed_sort_value(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION custom.read_records_by_ids(p_organization_id uuid, p_table_id uuid, p_record_ids uuid[], p_by_id boolean DEFAULT false)
 RETURNS TABLE(id uuid, document jsonb, level permission_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me       uuid := auth.uid();
  v_rec      record;
  v_set      record;
  v_mask     jsonb;
  v_visible  text[];
  v_declared text[];
  v_rv       text[];
  v_reveals  jsonb;    -- ACCESS-SETUP §12.1: the Table setup's row-scoped read cells for this reader, asked once per call   -- ACCESS-SETUP §12.1: this row's visible keys (row-scoped parts revealed)
  v_n        integer := coalesce(cardinality(p_record_ids), 0);
  v_rows     custom.record[];
  v_row      custom.record;
  v_levels   jsonb;
  v_cache    jsonb := '{}'::jsonb;
  v_vs       record;
  v_cr       jsonb;
  v_world_def boolean := false;
  v_seen     uuid[];  -- PERF-FIX-5
  v_mask_ready boolean := false;  -- HOT-DOORS-2
  v_mask_lvl   text;
  v_store      jsonb;    -- READ-SPEED-3: this page's kept worked-out values, {record id: values}
  v_fresh_ids  uuid[];
  v_tdefs      jsonb;    -- READ-SPEED-3: this Table's columns that read the clock, {key: declaration}: worked out now
  v_kept       jsonb;
  v_kplain     jsonb;
  v_tk         text;
  v_try        jsonb;
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- CHAIR-WORLD-LANE-2: the wall first (as custom.assert_may_know_table asks it), then — for a person it admitted
  -- ONLY through the world lane — the one other way through: every row asked for is a definition row of a Public
  -- Table of this organization (the Table record itself, one of its Fields, or a choice of one of its Fields).
  -- Anything else, and every other person, meets custom.assert_may_know_table exactly as before.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_by_ids');
  v_world_def := custom.world_reader_reads_public_definition(p_organization_id, p_table_id, p_record_ids);
  if not v_world_def then
    perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_by_ids');
  end if;

  -- NOTHING ASKED FOR IS NOT AN ERROR — it is an empty answer, and it costs nothing.
  if v_n = 0 then
    return;
  end if;

  -- THE SAME CEILING THE PAGE DOORS DECLARE, and it refuses above it by name rather than
  -- handing back a short list the caller cannot tell from a complete one.
  perform custom.page_size(p_organization_id, 'custom.read_records_by_ids', v_n, 200);

  -- STEP 1, ONCE: THE ONE LADDER decides WHICH rows. Identical call, identical arguments to
  -- the page door's. This is the question that must never be asked twice in two ways.
  -- PERF-FIX-5 (2026-10-08). A READ OF N IDS ASKS ABOUT THOSE N ROWS, NOT ABOUT THE WHOLE TABLE. On the Table kernel
  -- (the Table's own row, which every table page reads) custom.visible_set answers by walking the one ladder over EVERY live
  -- Table of the organization, to return one. Its kernel branch hands back nothing but "every Table is seen" or the seen list
  -- (no class, no granted answer), so the rows asked for are visible when she created them or when custom.tables_seen_among
  -- - the very walk the set builds its list from, here for these ids only, asked through iam.has_access_for_many first -
  -- sees them. Only where visible_set does not stop (an archived organization, a registered FK containment parent for record)
  -- and for a person admitted through the world lane; everything else, every other Table, asks visible_set as before.
  -- mx.read_by_ids_set = off: the whole set, as before (the proofs compare both on one snapshot).
  if p_table_id = custom.table_kernel_id()
     and not v_world_def
     and coalesce(current_setting('mx.read_by_ids_set', true), '') <> 'off'
     and not exists (select 1 from platform.entity_relationships er
                      where er.child_type = 'record' and er.kind in ('composition', 'containment'))
     and not exists (select 1 from iam.organizations o
                      where o.id = p_organization_id and o.archived_at is not null) then
    select coalesce(array_agg(g.id), '{}'::uuid[]) into v_seen
      from custom.tables_seen_among(v_me, array[p_organization_id], p_record_ids) g
     where g.seen and g.organization_id = p_organization_id;
    select false as o_all_visible, '{}'::platform.visibility[] as o_true_visibility, '{}'::uuid[] as o_granted_all,
           '{}'::uuid[] as o_granted_visible, v_seen as o_carried_visible, 0 as o_ladder_calls,
           false as o_fallback, null::text as o_note
      into v_set;
  else
    v_set := custom.visible_set(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level);
  end if;

  if v_set.o_fallback then
    raise notice '%', v_set.o_note;
  end if;

  -- STORE-READ-PERF-2: the rows first, in the door's own order, so the ladder can be asked about
  -- the whole set at once (custom.levels_of) instead of once per row inside custom.read_mask.
  select coalesce(array_agg(r order by r.created_at desc, r.id), '{}'::custom.record[]) into v_rows
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = p_table_id
       and r.deleted_at is null
       and r.id = any (p_record_ids)
       and ( case
               -- CHAIR-WORLD-LANE-2: definition rows of a Public Table, every one checked above, read at viewer.
               when v_world_def then
                 true
               -- The ladder could not answer in a bounded way, so each row is asked directly —
               -- `read_records`' fallback arm, and the same single call.
               when v_set.o_fallback then
                 custom.has_visibility(v_me, 'record', custom.record_org_hint(r.id, r.organization_id), 'viewer')
               -- Every live row of this Table is hers.
               when v_set.o_all_visible then
                 true
               -- A class she holds, WITH EXCEPTIONS: a granted id is never answered by its
               -- class (VIS-19), and containment only ever adds (VIS-6).
               when coalesce(array_length(v_set.o_true_visibility, 1), 0) > 0 then
                 ( r.created_by = v_me
                   or (r.visibility = any (v_set.o_true_visibility)
                       and not (r.id = any (v_set.o_granted_all)))
                   or r.id = any (v_set.o_granted_visible)
                   or r.id = any (v_set.o_carried_visible) )
               -- Nothing by class — `shared_only`, or a Table nobody shared with her.
               else
                 ( r.created_by = v_me
                   or r.id = any (v_set.o_granted_visible)
                   or r.id = any (v_set.o_carried_visible) )
             end )
  ;
  -- HOT-DOORS-3 (2026-10-08): every row here is a row of p_organization_id, so the levels are read in it
  -- (custom.levels_of, handed the organization in the statement memo: same answers, one partition). mx.read_page_set = off: as before.
  if coalesce(current_setting('mx.read_page_set', true), '') = 'off' then
    v_levels := custom.levels_of(v_me, (select array_agg(x.id) from unnest(v_rows) x));
  else
    perform platform.memo_k_put('custom.levels_of_org', p_organization_id::text);
    v_levels := custom.levels_of(v_me, (select array_agg(x.id) from unnest(v_rows) x));
    perform platform.memo_k_put('custom.levels_of_org', '');
  end if;

  -- READ-SPEED-2: the page's roll-ups and lookups, worked out for every row at once (each row is one this reader
  -- may open: the visible set above chose it). The loop below reads them from the statement memo.
  -- READ-SPEED-3: KEPT VALUES. A reader who sees every row and column the Table's worked-out values come from
  -- (custom._computed_reader_ok) is served the kept values of every current row (custom.record_computed); a stale,
  -- missing or unkeepable row, and every other reader, is worked out below exactly as before.
  if not v_world_def and cardinality(v_rows) > 0
     and custom._computed_reader_ok(v_me, p_organization_id, p_table_id) then
    select coalesce(jsonb_object_agg(rc.record_id::text, rc.vals), '{}'::jsonb) into v_store
      from custom.record_computed rc
     where rc.record_id = any (select x.id from unnest(v_rows) x)
       and rc.organization_id = p_organization_id and rc.table_id = p_table_id
       and not rc.stale and rc.vals is not null;
    select coalesce(jsonb_object_agg(f.data ->> 'key', f.data), '{}'::jsonb) into v_tdefs
      from custom.record f
     where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and f.data ->> 'entity_definition_id' = p_table_id::text
       and custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
       and coalesce(f.data ->> 'compute_on', '') = 'read'
       and coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? (f.data ->> 'key');
  end if;
  select coalesce(array_agg(x.id), '{}') into v_fresh_ids from unnest(v_rows) x
   where v_store is null or not (v_store ? x.id::text);
  if not v_world_def and cardinality(v_fresh_ids) > 1 then
    perform custom._page_derived_prefetch(p_organization_id, p_table_id, v_fresh_ids);
  end if;
  foreach v_row in array v_rows
  loop
    if v_store is not null and v_store ? v_row.id::text then
      -- custom.record_values_step's document, its read-time columns (and their _errors) taken from the store
      v_kplain := (v_row.data - '_computed' - '_retired' - '_values' - '_sources' - '_derived')
             || case when v_row.data ? '_computed' then custom.computed_block(v_row.data -> '_computed') else '{}'::jsonb end
             || case when v_row.data ? '_derived' then custom.computed_block(v_row.data -> '_derived') else '{}'::jsonb end;
      v_kept := v_store -> v_row.id::text;
      -- a column that reads the clock is worked out now, exactly as custom.record_values_step works it out
      for v_tk in select k from jsonb_object_keys(coalesce(v_tdefs, '{}'::jsonb)) k loop
        continue when not (v_kept ? v_tk);
        v_try := custom._derived_attempt(p_organization_id, v_row.id, v_tdefs -> v_tk, v_kplain);
        v_kept := (v_kept - '_errors') || jsonb_build_object(v_tk, v_try -> 'v')
                  || case when (coalesce(v_kept -> '_errors', '{}'::jsonb) - v_tk)
                                || case when v_try ? 'e' then jsonb_build_object(v_tk, v_try -> 'e') else '{}'::jsonb end = '{}'::jsonb
                          then '{}'::jsonb
                          else jsonb_build_object('_errors', (coalesce(v_kept -> '_errors', '{}'::jsonb) - v_tk)
                                || case when v_try ? 'e' then jsonb_build_object(v_tk, v_try -> 'e') else '{}'::jsonb end) end;
      end loop;
      select v_kplain || v_kept as o_doc, v_cache as o_cache into v_vs;
    else
      select * into v_vs from custom.record_values_step(v_row, v_cache);
      v_cache := v_vs.o_cache;
    end if;
    if v_cr is null then
      v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
    end if;
    -- STEP 2, PER ROW: THE ONE MASK decides which FIELDS of it she may see, at the level she
    -- holds ON THIS RECORD. The same call `custom.read_record` makes for its one row.
    -- The row is in p_organization_id and p_table_id (the query above says so), which is the
    -- organization and Table custom.read_mask took the mask in; the rung is the set's answer.
    -- HOT-DOORS-2 (2026-10-08): THE FIELD QUESTION ONCE PER LEVEL, NOT ONCE PER ROW. The mask depends on the
    -- table, the reader and the level only; a page of 50 rows at one level asked it 50 times (0.6 ms each,
    -- 29 ms of a page). The rows are the same; a row at another level asks again.
    if not v_mask_ready
       or v_mask_lvl is distinct from (case when v_world_def then 'viewer' else (v_levels -> v_row.id::text ->> 'l') end) then
      v_mask_lvl := case when v_world_def then 'viewer' else (v_levels -> v_row.id::text ->> 'l') end;
      v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id,
                                     case when v_world_def then 'viewer'::public.permission_level
                                          else (v_levels -> v_row.id::text ->> 'l')::public.permission_level end, 'read');
      -- DOOR-N-5: id-keyed on request means EVERY declared Field's key, as the page doors do.
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
        from jsonb_array_elements(v_mask -> 'visible') x;
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared
        from jsonb_array_elements(v_mask -> 'declared') x;
      v_mask_ready := true;
    end if;

    id := v_row.id;
    if v_reveals is null then v_reveals := custom._store_row_reveals(v_me, p_table_id); end if;
    v_rv := case when jsonb_array_length(v_reveals) = 0 then v_visible
                 else custom.store_row_visible_with(v_reveals, v_me, v_row, v_visible) end;
    document := custom.choice_render_with(p_organization_id, p_table_id,
                  custom.mask_document(v_vs.o_doc, v_rv, v_mask -> 'notices', p_by_id,
                                       v_mask -> 'all_key_ids', v_declared), v_cr);
    -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
    document := custom.with_whole_value_pointers(document, v_row.data -> '_values', v_row.data -> '_sources', v_rv, p_by_id, v_mask -> 'all_key_ids');
    -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
    document := custom.with_retired(document, v_row.data -> '_retired', v_rv, v_declared);
    level := (v_mask ->> 'level')::public.permission_level;
    return next;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION custom.read_records_page(p_organization_id uuid, p_table_id uuid, p_filter jsonb DEFAULT '{}'::jsonb, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT '[]'::jsonb, p_view_id uuid DEFAULT NULL::uuid, p_by_id boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_time_zone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me        uuid := auth.uid();
  v_level     public.permission_level;
  v_mask      jsonb;
  v_visible   text[];
  v_computed  text[];
  v_choices   jsonb;
  v_limit     integer;
  v_offset    integer := greatest(coalesce(p_offset, 0), 0);
  v_where     text;
  v_order     text := '';
  v_term      text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort      jsonb;
  v_key       text;
  v_dir       text;
  v_as        text;
  v_expr      text;
  v_labels    jsonb;
  v_view      record;
  v_positions jsonb := null;
  v_total     bigint;
  v_ids       uuid[];
  v_rows      jsonb;
  v_ignored   jsonb := '[]'::jsonb;
  v_plain     boolean;   -- CHAIR-ACCESS b: a page that asks nothing of the rows' values
  -- HOT-DOORS-3 (2026-10-08)
  v_new       boolean := coalesce(current_setting('mx.read_page_set', true), '') <> 'off';
  v_ctx       jsonb;
  v_listed    text;
  v_ksel      text := '';
  v_kord      text := '';
  v_ki        integer := 0;
  v_locked    bigint := 0;  -- WALK-FIXES D8
  v_pcm       text;         -- HOT-DOORS-4
  v_csort_n   bigint;       -- READ-SPEED f
  v_cv        text;
  v_cstore    boolean;      -- READ-SPEED-3: the kept values may answer this reader's sort
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- THE ORGANIZATION WALL, THEN THE TABLE — the same two questions, in the same order, that
  -- custom.read_records_matching asks on its first lines.
  -- HOT-DOORS-4 (2026-10-08): one cached plan per statement of this call (partitions pruned at run time) instead of
  -- a custom plan per call; put back when it returns. A plan choice, never an answer.
  if iam.kernel_batch_on(v_me) then
    v_pcm := pg_catalog.current_setting('plan_cache_mode');
    perform pg_catalog.set_config('plan_cache_mode', 'force_generic_plan', true);
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_page');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_page');
  v_limit := custom.page_size(p_organization_id, 'custom.read_records_page', p_limit, 50);

  -- The field question, once: which columns this reader may see (search and sort read ONLY these).
  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  -- READ-SPEED f (2026-10-19): THE WORKED-OUT COLUMNS — formulas, roll-ups and lookups, worked out on read or kept
  -- at write. A sort by one of them sorts by its worked-out value (custom.record_value_one: exactly the value the
  -- page shows), never by the document key, which holds nothing for them.
  -- READ-SPEED-ORG (2026-10-19): ONE INDEX PROBE PER COLUMN OF THIS TABLE, never the organization's every Field.
  -- As a join under the generic plan this read every Field record of the organization (13,210 in the test admin's)
  -- and asked custom.parity_type of each: ~280 ms of a 10-row page, growing with the organization, not the table.
  select coalesce(array_agg(k.key), '{}'::text[]) into v_computed
    from jsonb_each_text(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
   where custom.parity_type((select f.data from custom.record f
                              where f.organization_id = p_organization_id and f.id = k.value::uuid
                                and f.table_id = custom.field_kernel_id())) in ('lookup', 'rollup', 'formula');
  v_choices := coalesce(custom.choice_field_map(p_organization_id, p_table_id), '{}'::jsonb);

  -- ── the rows this reader may see that answer the question ──
  -- CHAIR-ACCESS b: on a PLAIN page (no search, no filter, no sort, no view) a row of a Confidential
  -- Table this person may not open, but which is listed for her ("Shown to"), is a row of the page
  -- too - as its HEADER only, {id, exists: true, submitted_at} (HR proof gap 4). Never when the page
  -- asks a question of the rows: a search hit, a filter match or a sort position on a row she may
  -- not read would say something about its values.
  v_plain := v_term is null
             and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb
             and (p_sort is null or jsonb_typeof(p_sort) <> 'array' or jsonb_array_length(p_sort) = 0)
             and p_view_id is null;
  -- HOT-DOORS-3 (2026-10-08): THE LIST FILTER IN THE SAME PASS AS THE PAGE. custom.listed_predicate_sql asks
  -- "is it listed for her" as `r.id in (select from custom.query_visible_ids(..))`: a second walk of the whole
  -- Table (25,000 rows through the "shown to" filter, then hashed) before the page's own walk. For one ordinary
  -- Table that list is, row for row, the rows the open predicate admits (custom.visible_set's answer, the same
  -- memoised answer custom.visible_predicate_sql reads) that are live, not quarantined and "shown to" her
  -- (platform.shown_to_lists with custom._record_shown_to_ctx for this organization and Table); the page's own
  -- WHERE already says live, not quarantined, this organization and this Table. So the page asks
  -- custom.visible_predicate_sql for the open predicate WITH the "shown to" filter (the context handed over in
  -- the statement memo around that one call: 'custom.visible_predicate_listed:<person>:<organization>:<Table>'),
  -- both are asked on the page's one walk, and the context is worked out once for both arms. The Table kernel
  -- (its list has memo branches of its own) and a principal that is not the session's person (the builder
  -- refuses that by name) still go through custom.listed_predicate_sql. mx.read_page_set = off: the page
  -- exactly as before (the proofs compare both on one snapshot).
  if v_new and p_table_id is not null and p_table_id is distinct from custom.table_kernel_id()
     and custom.query_principal() is not distinct from v_me then
    v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);
    perform platform.memo_k_put('custom.visible_predicate_listed:' || v_me::text || ':' || p_organization_id::text
                                || ':' || p_table_id::text, v_ctx::text);
    v_listed := custom.visible_predicate_sql(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level, 'r');
    perform platform.memo_k_put('custom.visible_predicate_listed:' || v_me::text || ':' || p_organization_id::text
                                || ':' || p_table_id::text, '');
  else
    v_listed := custom.listed_predicate_sql(v_me, p_organization_id, p_table_id,
                                            'viewer'::public.permission_level, 'r');
    if v_new and v_plain then
      v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);
    end if;
  end if;
  v_where := format($w$
      from custom.record r
     where r.organization_id = %L::uuid
       and r.table_id = %L::uuid
       and r.deleted_at is null
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and ((%s) or (%s))
       and %s$w$,
    p_organization_id, p_table_id,
    v_listed,
    case when v_plain
         -- (the second argument of shown_to_lists is the row column T-13 retires - a legacy fallback
         -- for rows with no shown_to; this door never read it and does not start now: null)
         then format('custom.confidential_header(%L::uuid, r.id) is not null and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
                     v_me, v_me, coalesce(v_ctx, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)))
         else 'false' end,
    custom.record_filter_sql(p_organization_id, p_table_id,
      case when custom.filter_is_rule(coalesce(p_filter, '{}'::jsonb)) then p_filter
           else custom.choice_filter_normalize(v_choices, coalesce(p_filter, '{}'::jsonb)) end));

  -- ── the search: THE ONE SHARED PREDICATE (CHAIR-GRID). custom.record_search_sql is this door's own older
  -- ILIKE over the visible columns and the choice words, plus the typed matches (a date as a person writes
  -- it, a phone by its digits, an amount as the grid shows it), judged for this reader. custom.record_aggregate
  -- asks the same function with the same arguments, so a footer counts exactly the rows this page shows.
  if v_term is not null then
    v_where := v_where || ' and ' || custom.record_search_sql(p_organization_id, p_table_id, p_search, 'r', p_time_zone);
  end if;

  -- ── the order ──
  if p_sort is not null and jsonb_typeof(p_sort) = 'array' and jsonb_array_length(p_sort) > 0 then
    for v_sort in select s from jsonb_array_elements(p_sort) s loop
      v_key := v_sort ->> 'field';
      v_dir := case when lower(coalesce(v_sort ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end;
      v_as  := lower(coalesce(v_sort ->> 'as', 'text'));
      -- MONITOR-TRIAGE (2026-10-01): a sort on a column this reader cannot see — removed, or masked
      -- from their seat — is SKIPPED and named in `sort_ignored`, never a refused page. Ordering by
      -- it would leak the masked values' order, so it is not applied; the rest of the sort stands.
      if v_key is null or not (v_key = any (v_visible)) then
        v_ignored := v_ignored || to_jsonb(coalesce(v_key, ''));
        continue;
      end if;
      if v_key = any (v_computed) then
        -- READ-SPEED f: SORT BY A WORKED-OUT COLUMN (Airtable and Notion do). Every matching row's value is worked out
        -- once (in the matches, beside its id), then ordered like a plain column: a number as a number, a date as its
        -- ISO text, anything else as its lower-cased words, empty last in both directions. Worked out for every
        -- match, so it is bounded: above custom.computed_sort_ceiling() matches it refuses by name, never times out.
        if v_cstore is null then
          v_cstore := custom._computed_reader_ok(v_me, p_organization_id, p_table_id);
        end if;
        -- READ-SPEED-3: with kept values only the rows still to be worked out count against the ceiling.
        if v_csort_n is null and v_cstore
           and not (coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? v_key) then
          execute 'select count(*) ' || v_where
               || ' and not exists (select 1 from custom.record_computed rc where rc.record_id = r.id and not rc.stale and rc.vals is not null)'
             into v_csort_n;
          if v_csort_n > custom.computed_sort_ceiling() then
            raise exception 'Sorting by "%" works out its value for every matching record, and % records match (the most is %).', v_key, v_csort_n, custom.computed_sort_ceiling()
              using errcode = '54000',
                    hint = 'Filter or search down to fewer records, or sort by a stored column. Nothing was read.';
          end if;
        end if;
        if v_csort_n is null then
          execute 'select count(*) ' || v_where into v_csort_n;   -- (v_where already carries the search)
          if v_csort_n > custom.computed_sort_ceiling() then
            raise exception 'Sorting by "%" works out its value for every matching record, and % records match (the most is %).', v_key, v_csort_n, custom.computed_sort_ceiling()
              using errcode = '54000',
                    hint = 'Filter or search down to fewer records, or sort by a stored column. Nothing was read.';
          end if;
        end if;
        v_ki := v_ki + 1;
        v_cv := case when v_cstore and not (coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? v_key)
                     then format('custom._computed_sort_value(%L::uuid, r.id, %L)', p_organization_id, v_key)
                     else format('custom.record_value_one(%L::uuid, r.id, %L)', p_organization_id, v_key) end;
        v_ksel := v_ksel || ', ' || v_cv || ' as k' || v_ki;
        if v_as in ('number', 'integer') then
          v_kord := v_kord || format('custom._sort_number(m.k%s) %s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_number(%s) %s nulls last, ', v_cv, v_dir);
        elsif v_as in ('date', 'datetime') then
          v_kord := v_kord || format('custom._sort_date(m.k%s) %s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_date(%s) %s nulls last, ', v_cv, v_dir);
        else
          -- Asked as words (the default): a worked-out number still sorts as a number, then words as words.
          v_kord := v_kord || format('custom._sort_number(m.k%1$s) %2$s nulls last, custom._sort_text(m.k%1$s) %2$s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_number(%1$s) %2$s nulls last, custom._sort_text(%1$s) %2$s nulls last, ', v_cv, v_dir);
        end if;
        continue;
      end if;
      if v_choices ? v_key then
        select coalesce(jsonb_object_agg(o.key, o.value ->> 'label'), '{}'::jsonb) into v_labels
          from jsonb_each(coalesce(v_choices -> v_key -> 'options', '{}'::jsonb)) o;
        v_expr := format('lower(coalesce(%L::jsonb ->> (r.data ->> %L), r.data ->> %L))', v_labels, v_key, v_key);
      elsif v_as in ('number', 'integer') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^-?[0-9]+\.?[0-9]*$' then (r.data ->> %L)::numeric end$x$, v_key, v_key);
      elsif v_as in ('date', 'datetime') then
        -- An ISO date or instant sorts as its own text; anything else is not a date and sorts last.
        v_expr := format($x$case when (r.data ->> %L) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (r.data ->> %L) end$x$, v_key, v_key);
      else
        v_expr := format('lower(r.data ->> %L)', v_key);
      end if;
      v_order := v_order || v_expr || ' ' || v_dir || ' nulls last, ';
      -- HOT-DOORS-3: the same key, kept beside the id so the page can be taken from the matches without
      -- numbering all of them.
      v_ki := v_ki + 1;
      v_ksel := v_ksel || ', ' || v_expr || ' as k' || v_ki;
      v_kord := v_kord || 'm.k' || v_ki || ' ' || v_dir || ' nulls last, ';
    end loop;
    -- Every key skipped: the read door's own order, exactly as if no sort was asked.
    if v_order = '' then
      v_ksel := ', r.created_at as k0';
      v_kord := 'm.k0 desc, m.id';
    else
      v_kord := v_kord || 'm.id';
    end if;
    v_order := case when v_order = '' then 'r.created_at desc, r.id' else v_order || 'r.id' end;
  elsif p_view_id is not null then
    select sv.* into v_view from platform.saved_view sv
     where sv.id = p_view_id and sv.organization_id = p_organization_id
       and sv.surface_key = 'custom/records' and sv.deleted_at is null
       and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id;
    if v_view.id is null then
      raise exception 'There is no such saved view on this table.' using errcode = '23503',
              hint = 'It may have been removed, or it may belong to another table or organization. Nothing was read.',
            detail = jsonb_build_object('view_id', p_view_id)::text;
    end if;
    if v_view.definition ->> 'order' is distinct from 'manual' then
      raise exception 'This view is ordered by its sort, not by hand.' using errcode = '22023',
        hint = 'Ask for its sort in p_sort instead of naming the view. Nothing was read.';
    end if;
    v_positions := coalesce(v_view.metadata -> 'record_positions', '{}'::jsonb);
    v_order := '($1 ->> r.id::text)::numeric nulls last, r.created_at, r.id';
    v_ksel := ', ($1 ->> r.id::text)::numeric as k1, r.created_at as k2';
    v_kord := 'm.k1 nulls last, m.k2, m.id';
  else
    -- No question about order: the read door's own order.
    v_order := 'r.created_at desc, r.id';
    v_ksel := ', r.created_at as k0';
    v_kord := 'm.k0 desc, m.id';
  end if;

  -- HOT-DOORS (2026-10-08): THE COUNT AND THE PAGE IN ONE PASS. The rows the page may show are found once
  -- (every predicate above, the visible-set walk inside it included) and both the total and this page's ids
  -- are read from that one set. Asked as two statements, custom.query_visible_ids walked the whole Table
  -- twice per page (a 25,000-row Table: 2 x 25,000 rows through the "shown to" filter). Same total, same
  -- ids in the same order. mx.read_page_one_pass = off: the two statements as before (the proofs compare
  -- both on one snapshot).
  if v_new and coalesce(current_setting('mx.read_page_one_pass', true), '') <> 'off' then
    -- HOT-DOORS-3 (2026-10-08): ONLY THE PAGE IS SORTED. The matches are found once, each with the keys it is
    -- ordered by; the total counts them and the page is the first v_limit after v_offset in that order (a
    -- top-N sort), instead of numbering every match with row_number() (a full sort of all 25,000) to keep
    -- 50. Every order ends in the row's id, so the order is total and the page holds the same ids in the
    -- same order.
    execute format('with m as materialized (select r.id%s %s) '
                   'select (select count(*) from m), '
                   'array(select m.id from m order by %s limit %s offset %s)',
                   v_ksel, v_where, v_kord, v_limit, v_offset)
       into v_total, v_ids
      using v_positions;
    if cardinality(v_ids) = 0 then
      v_ids := null;
    end if;
  elsif coalesce(current_setting('mx.read_page_one_pass', true), '') = 'off' then
    execute 'select count(*) ' || v_where into v_total;

    execute format('select array_agg(q.id order by q.n) from (select r.id, row_number() over (order by %s) as n %s order by n limit %s offset %s) q',
                   v_order, v_where, v_limit, v_offset)
       into v_ids
      using v_positions;
  else
    execute format('with m as materialized (select r.id, row_number() over (order by %s) as n %s) '
                   'select (select count(*) from m), '
                   '(select array_agg(q.id order by q.n) from (select m.id, m.n from m order by m.n limit %s offset %s) q)',
                   v_order, v_where, v_limit, v_offset)
       into v_total, v_ids
      using v_positions;
  end if;

  if v_ids is null then
    v_rows := '[]'::jsonb;
  else
    -- CHAIR-ACCESS b: an id the read door does not open is a header row (a Confidential row this
    -- person is not named on); an id that is neither is simply not a row of the page.
    if v_new then
      -- HOT-DOORS-3: the header is asked only of an id the read door did not open. Asked through a lateral join
      -- it was asked of every id of the page and thrown away (the planner flattens the lateral: 50 calls,
      -- ~26 ms); a scalar subquery in the CASE arm runs only when that arm is reached. Same rows.
      select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
        into v_rows
        from (select o.n,
                     case when d.id is not null
                          then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level)
                          -- (the header from a function scan: read once; a subquery column was written out twice)
                          else (select jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null)
                                  from custom.confidential_header(v_me, o.rid) h(hdr)
                                 where h.hdr is not null) end as row
                from unnest(v_ids) with ordinality o(rid, n)
                left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, coalesce(p_by_id, false)) d on d.id = o.rid
              -- (offset 0: the row is built once; flattened, the CASE was written out twice, in the list and the filter)
              offset 0) x
       where x.row is not null;
    else
    select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
      into v_rows
      from (select o.n,
                   case when d.id is not null
                        then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level)
                        when h.hdr is not null
                        then jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null) end as row
              from unnest(v_ids) with ordinality o(rid, n)
              left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, coalesce(p_by_id, false)) d on d.id = o.rid
              left join lateral (select custom.confidential_header(v_me, o.rid) as hdr) h on d.id is null) x
     where x.row is not null;
    end if;
  end if;

  -- WALK-FIXES D8 (2026-10-08): A SORTED PAGE OF THE WHOLE TABLE COUNTS WHAT IT LEAVES OUT. A sort places
  -- no header row (a position would say something about a value), so a Confidential table with a default
  -- sort answered a member "0 rows" where the plain page says "4 you can't open". The NUMBER of those rows
  -- says nothing about their values — the plain page shows them — so a sort-only page answers it as
  -- `locked`. Asked only on a Confidential or Private table; any other answer is unchanged.
  if not v_plain and v_term is null and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb and p_view_id is null
     and exists (select 1 from custom.record t where t.organization_id = p_organization_id and t.id = p_table_id
                    and t.data ->> 'level' in ('confidential', 'private')) then
    execute format($l$
      select count(*) from custom.record r
       where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null
         and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
         and not coalesce((%s), false)
         and custom.confidential_header(%L::uuid, r.id) is not null
         and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)$l$,
      p_organization_id, p_table_id, v_listed, v_me, v_me,
      coalesce(v_ctx, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)))
      into v_locked;
  end if;

  if v_pcm is not null then
    perform pg_catalog.set_config('plan_cache_mode', v_pcm, true);
  end if;
  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'rows', v_rows,
                            'sort_ignored', v_ignored)
         || case when v_locked > 0 then jsonb_build_object('locked', v_locked) else '{}'::jsonb end;
end;
$function$
;

-- THE BACKFILL is READ-SPEED-3 b's last statement (it queues every record); until then a script drains by hand.

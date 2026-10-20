-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-5
-- lock: custom
-- allows: revoke custom
-- based-on: custom._not_a_member_refusal(text, uuid) 6c7c77f955b34ee4237a1b482939e2924930aea3238d5f214bb009c874bc1470
-- based-on: custom.computed_refresh(uuid, integer) 92d5d212070bf9c24faf1800e2e57265da431c6deb1b8fcd7fda9e3a2bbc8215
-- based-on: custom.computed_refresh(uuid, uuid, uuid[]) a21fea98514adb044d0dab10ed5f8f493e2f425a8fdc04a45786707177ed1fba
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
-- Before: every signed-in call refused ("You are not a member of that organization"). After: refreshed.
-- Inverse: migrations/inverse/20261021240000_readspeed5_a_the_refresh_door_works_out_values_in_the_compute_lane_down.sql

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

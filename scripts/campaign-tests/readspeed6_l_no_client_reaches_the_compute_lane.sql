-- READ-SPEED-6 l — NO CLIENT REACHES THE COMPUTE LANE (chair ruling 2026-10-19 on custom._in_compute_lane).
--
-- The compute lane is custom._computed_compute: it clears the caller's claims for its own length so the shared engine
-- sees every row, and custom._not_a_member_refusal admits a claim-less caller only when custom._in_compute_lane() finds
-- that function's frame on PostgreSQL's own call stack, running as the store owner. This suite proves no client door
-- leads there: no client role may EXECUTE the lane (or the claim-less refresh and drain), a signed-in or anonymous
-- caller who tries is refused, the lane check answers false for a client even with its claims cleared, the only
-- functions that call the lane are the three known ones and the only client door among them asks the ladder first,
-- and no client role can create a function anywhere (so nothing a client writes can stand on that stack as the owner).
-- RED when any of these fails; GREEN otherwise. Main database, read-only: every probe is rolled back.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed6_l_no_client_reaches_the_compute_lane.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '50s';

do $t$
declare
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_fail text[] := '{}';
  v_fn   text;
  v_role text;
  v_ok   boolean;
  v_callers text[];
begin
  -- 1. no client role holds EXECUTE on the lane, the claim-less refresh, the drain or the mark applier
  foreach v_fn in array array['custom._computed_compute(uuid,uuid,uuid[])', 'custom.computed_refresh(uuid,uuid,uuid[])',
                              'custom.computed_refresh_drain(integer)', 'custom._computed_apply_org_mark(uuid)',
                              'custom._computed_mark_tables(uuid,uuid[])', 'custom._in_compute_lane()'] loop
    foreach v_role in array array['anon', 'authenticated', 'public'] loop
      if (v_role = 'public' and exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                         where p.oid = v_fn::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE'))
         or (v_role <> 'public' and has_function_privilege(v_role, v_fn, 'EXECUTE')) then
        v_fail := v_fail || format('%s may EXECUTE %s', v_role, v_fn);
      end if;
    end loop;
  end loop;

  -- 2. a signed-in caller who calls the lane is refused (and so is anon)
  foreach v_role in array array['authenticated', 'anon'] loop
    begin
      perform set_config('request.jwt.claims', case when v_role = 'anon' then '{"role":"anon"}' else c_admin end, true);
      perform set_config('role', v_role, true);
      perform custom._computed_compute('884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f', '28e2af9e-ddab-4f02-adea-b3387916c5d4', '{}');
      v_fail := v_fail || format('%s called custom._computed_compute', v_role);
    exception when insufficient_privilege then null;
    end;
    perform set_config('role', 'postgres', true);
  end loop;

  -- 3. the lane check answers false for a client, with its claims and with them cleared
  perform set_config('request.jwt.claims', c_admin, true);
  if custom._in_compute_lane() then v_fail := v_fail || 'the lane check passed with claims'::text; end if;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'authenticated', true);
  begin
    v_ok := custom._in_compute_lane();
    if v_ok then v_fail := v_fail || 'the lane check passed for authenticated with claims cleared'::text; end if;
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'postgres', true);
  -- even the owner outside the lane's frame is not in the lane
  if custom._in_compute_lane() then v_fail := v_fail || 'the lane check passed for the owner outside custom._computed_compute'::text; end if;

  -- 4. the only functions that call the lane are the known three; the only client door among them asks the ladder first
  select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') into v_callers
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema') and p.prokind = 'f'
     and p.oid <> 'custom._computed_compute(uuid,uuid,uuid[])'::regprocedure
     and p.oid <> 'custom._in_compute_lane()'::regprocedure
     and pg_get_functiondef(p.oid) ~ 'custom\._computed_compute\(';
  if not (v_callers <@ array['custom.computed_refresh(uuid,integer)', 'custom.computed_refresh(uuid,uuid,uuid[])',
                             'custom.computed_refresh_drain(integer)']::text[]) then
    v_fail := v_fail || format('unexpected callers of the lane: %s', v_callers);
  end if;
  if pg_get_functiondef('custom.computed_refresh(uuid,integer)'::regprocedure) !~ 'v_org\s+uuid := custom\._computed_door_org\(p_table_id\)' then
    v_fail := v_fail || 'the client refresh door no longer asks the ladder (custom._computed_door_org) before anything else'::text;
  end if;
  if pg_get_functiondef('custom.computed_refresh(uuid,uuid,uuid[])'::regprocedure) !~ 'runs in the server lane only' then
    v_fail := v_fail || 'the claim-less refresh no longer refuses a caller with claims'::text;
  end if;
  -- the client door refuses a Table the caller cannot see, and a caller with no one signed in
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  begin
    perform custom.computed_refresh('00000000-0000-0000-0000-000000000001'::uuid, 1);
    v_fail := v_fail || 'the refresh door answered for a Table that does not exist'::text;
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform custom.computed_refresh('28e2af9e-ddab-4f02-adea-b3387916c5d4'::uuid, 1);
    v_fail := v_fail || 'the refresh door answered a caller with no one signed in'::text;
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'postgres', true);

  -- 5. no client role can create a function in any schema
  select coalesce(array_agg(format('%s on %s', r, n.nspname)), '{}') into v_callers
    from pg_namespace n cross join unnest(array['anon', 'authenticated']) r
   where n.nspname not like 'pg\_%' and n.nspname <> 'information_schema' and has_schema_privilege(r, n.oid, 'CREATE');
  if cardinality(v_callers) > 0 then
    v_fail := v_fail || format('a client role may create objects: %s', v_callers);
  end if;

  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — no client role reaches custom._computed_compute or passes custom._in_compute_lane()';
end
$t$;

rollback;

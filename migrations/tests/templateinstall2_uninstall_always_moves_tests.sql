-- ============================================================
-- TEMPLATE-INSTALL-2 - an uninstall always moves, a table archives in passes, a caller-chosen install id is one install.
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file.sql   (as the login role; it signs in as admin@admin.com inside the txn)
-- Everything is rolled back at the end; it installs a real template copy into the test admin's organization and removes it again.
-- Red before 20261020030000 (a table with several fields flipped in ONE call; a budget-0 uninstall never moved) and before
-- 20261020031000 (a client-chosen install id was refused), green after.
-- ============================================================
begin;
-- the whole file is one session; the doors set their own 90 s, the test's loops may run longer than a client call
set local statement_timeout = '600s';
-- phase A (owner): the template and the ids this test uses
select set_config('ti2.tpl', (select t.id::text from custom.template t where t.catalogue_id = 'SP0215' and t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ti2.iid', gen_random_uuid()::text, true),
       set_config('ti2.iid2', gen_random_uuid()::text, true),
       set_config('ti2.claims', json_build_object('sub', (select u.id from auth.users u where u.email = 'admin@admin.com'), 'role', 'authenticated')::text, true);
select set_config('request.jwt.claims', current_setting('ti2.claims'), true);

-- phase B (signed in as the test admin): a copy, finished in one transaction
set local role authenticated;
do $$
declare v_r jsonb; v_n integer;
begin
  if nullif(current_setting('ti2.tpl'), '') is null then raise exception 'TEST SETUP: template SP0215 (Home Inventory) is not in the catalogue'; end if;
  v_r := custom.template_install_fresh('5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ti2.tpl')::uuid, 'TI2 test copy', null, 600000);
  perform set_config('ti2.iid', v_r ->> 'install_id', true);
  for v_n in 1..6 loop
    exit when (v_r ->> 'done')::boolean;
    v_r := custom.template_install_fresh('5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ti2.tpl')::uuid, 'TI2 test copy',
                                         current_setting('ti2.iid')::uuid, 600000);
  end loop;
  if not coalesce((v_r ->> 'done')::boolean, false) then
    raise exception 'TEST SETUP: the copy did not finish: %', v_r ->> 'refusal';
  end if;
end
$$;
reset role;

-- phase C (owner): a table of the copy that holds several fields
select set_config('ti2.table', (select (x ->> 'id') from custom.template_install i, jsonb_array_elements(i.made) x
                                  where i.id = current_setting('ti2.iid')::uuid and x ->> 'kind' = 'table'
                                    and (select count(*) from custom.table_contents(i.organization_id, (x ->> 'id')::uuid) c where c.kind = 'field') >= 3
                                  limit 1), true);

set local role authenticated;
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_t uuid := nullif(current_setting('ti2.table'), '')::uuid;
  v_r jsonb; v_n integer;
begin
  if v_t is null then raise exception 'TEST SETUP: the copy has no table with three fields'; end if;
  -- 1. THE TABLE ARCHIVES IN PASSES: with the pass window at 0, one call must not take a table that holds several fields whole.
  perform set_config('custom.archive_pass_ms', '0', true);
  -- its records first (the table kept), so the next call finds nothing but what the table itself holds
  loop
    v_r := custom.table_archive(c_org, v_t, 10, false);
    exit when coalesce((v_r ->> 'done')::boolean, false);
  end loop;
  v_r := custom.table_archive(c_org, v_t, 10, true);
  if coalesce((v_r ->> 'table_archived')::boolean, false) then
    raise exception 'RED 1: one table_archive call archived the table together with all its fields; a call must stop after a step when its window is spent';
  end if;
  v_n := 1;
  while not coalesce((v_r ->> 'done')::boolean, false) loop
    v_n := v_n + 1;
    if v_n > 60 then raise exception 'RED 1c: the table is still not archived after 60 calls: %', v_r ->> 'message'; end if;
    v_r := custom.table_archive(c_org, v_t, 10, true);
  end loop;
  if v_n < 3 then raise exception 'RED 1d: archived in % call(s); with the window at 0 it takes one step per call', v_n; end if;

  -- 2. AN UNINSTALL ALWAYS MOVES: a budget of 0 used to start no step at all; now each call takes one and the uninstall ends.
  v_n := 0;
  loop
    v_n := v_n + 1;
    if v_n > 120 then raise exception 'RED 2: the uninstall is still not done after 120 calls (a call that moves nothing)'; end if;
    v_r := custom.template_uninstall(c_org, current_setting('ti2.iid')::uuid, 0);
    if v_r -> 'refusal' is not null and jsonb_typeof(v_r -> 'refusal') <> 'null' then
      raise exception 'RED 2b: the uninstall refused: %', v_r -> 'refusal';
    end if;
    exit when (v_r ->> 'done')::boolean;
  end loop;
  perform set_config('ti2.calls', v_n::text, true);
end
$$;
reset role;

-- phase F (owner): nothing of the copy's tables or Home is live
do $$
begin
  if (select count(*) from custom.template_install i, jsonb_array_elements(i.made) x, custom.record r
       where i.id = current_setting('ti2.iid')::uuid and x ->> 'kind' in ('table', 'record')
         and r.id = (x ->> 'id')::uuid and r.organization_id = i.organization_id and r.deleted_at is null) > 0 then
    raise exception 'RED 2c: a table or Home of the copy is still live after the uninstall said done';
  end if;
  raise notice 'TEMPLATE-INSTALL-2 uninstall tests passed (% uninstall calls)', current_setting('ti2.calls');
end
$$;
rollback;

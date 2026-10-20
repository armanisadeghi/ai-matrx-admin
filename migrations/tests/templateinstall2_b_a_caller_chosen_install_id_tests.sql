-- ============================================================
-- TEMPLATE-INSTALL-2 b - a caller-chosen install id is one install (same id, same install: running, done, never a second copy).
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file.sql   (signs in as admin@admin.com inside the txn; rolled back at the end)
-- Red before 20261020031000: the first call with an id the door had not made raised "There is no such fresh install".
-- The concurrent half (two connections) is migrations/tests/templateinstall2_b_concurrent_install_id_test.py.
-- ============================================================
begin;
-- the whole file is one session; the doors set their own 90 s, the test's loops may run longer than a client call
set local statement_timeout = '600s';
select set_config('ti2.tpl', (select t.id::text from custom.template t where t.catalogue_id = 'SP0215' and t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ti2.id', gen_random_uuid()::text, true),
       set_config('ti2.foreign', (select i.id::text from custom.template_install i where i.organization_id <> '5dc930e9-bd65-44a1-8369-af773f6e1a5b' limit 1), true),
       set_config('request.jwt.claims', json_build_object('sub', (select u.id from auth.users u where u.email = 'admin@admin.com'), 'role', 'authenticated')::text, true);
select set_config('ti2.before', (select count(*) from custom.template_install i where i.organization_id = '5dc930e9-bd65-44a1-8369-af773f6e1a5b' and i.catalogue_id = 'SP0215' and i.state <> 'uninstalled')::text, true);
set local role authenticated;
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_id  uuid := current_setting('ti2.id')::uuid;
  v_tpl uuid := current_setting('ti2.tpl')::uuid;
  v_a jsonb; v_b jsonb; v_c jsonb; v_d jsonb;
  v_n integer;
  v_code text;
begin
  -- the first call carries an id nobody has used: the copy is made under THAT id (budget 0: it stops at once, still installing)
  v_a := custom.template_install_fresh(c_org, v_tpl, 'TI2b copy', v_id, 0);
  if (v_a ->> 'install_id')::uuid is distinct from v_id then
    raise exception 'RED b1: the copy was not made under the caller-chosen id: % vs %', v_a ->> 'install_id', v_id;
  end if;
  -- a refresh before any answer: the same id again is the same install, still running
  v_b := custom.template_install_fresh(c_org, v_tpl, 'TI2b copy', v_id, 0);
  if (v_b ->> 'install_id')::uuid is distinct from v_id then raise exception 'RED b2: a repeat call made another install: %', v_b ->> 'install_id'; end if;
  -- finish it, then call once more with the same id: answered 'already' with the same install
  for v_n in 1..8 loop
    exit when (v_b ->> 'done')::boolean;
    v_b := custom.template_install_fresh(c_org, v_tpl, 'TI2b copy', v_id, 600000);
  end loop;
  if not coalesce((v_b ->> 'done')::boolean, false) then raise exception 'TEST SETUP: the copy did not finish: %', v_b ->> 'refusal'; end if;
  v_c := custom.template_install_fresh(c_org, v_tpl, 'TI2b copy', v_id, 4000);
  if (v_c ->> 'install_id')::uuid is distinct from v_id or not coalesce((v_c ->> 'already')::boolean, false) then
    raise exception 'RED b3: a repeat of a finished install did not come back as the same install: %', v_c - 'made' - 'host' - 'show';
  end if;

  -- an id that belongs to another organization's install is refused by name
  begin
    perform custom.template_install_fresh(c_org, v_tpl, 'TI2b foreign', current_setting('ti2.foreign')::uuid, 0);
    raise exception 'RED b5: an id owned by another organization was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end
$$;
reset role;
do $$
declare v_n integer := (select count(*) from custom.template_install i where i.organization_id = '5dc930e9-bd65-44a1-8369-af773f6e1a5b' and i.catalogue_id = 'SP0215' and i.state <> 'uninstalled');
begin
  if v_n <> current_setting('ti2.before')::integer + 1 then
    raise exception 'RED b4: % live copies before, % after; the same id must make exactly one', current_setting('ti2.before'), v_n;
  end if;
  raise notice 'TEMPLATE-INSTALL-2 b install-id tests passed';
end
$$;
rollback;

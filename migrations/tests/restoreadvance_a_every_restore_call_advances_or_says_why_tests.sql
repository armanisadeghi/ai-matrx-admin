-- ============================================================
-- RESTORE-ADVANCE a - every custom.template_restore call either brings something back or answers a refusal; it never
-- answers "keep going" having moved nothing (ADVERSARIAL-8 F2: SP0521 stuck at "Restoring ... 1/36", 0 moved in 2 x 5 min).
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file.sql   (signs in as admin@admin.com inside the txn; rolled back at the end)
-- Light: no real copy is restored; two install rows are inserted inside the txn (rolled back). Budget 0 stands in for a
-- first item whose refusal spends the whole budget under load.
-- Red before restoreadvance_a: the refused first item ended the call on the budget, so the answer was not done, had no
-- refusal and nothing came back (b1), and a copy whose only item is refused answered "keep going" (b2).
-- ============================================================
begin;
set local statement_timeout = '30s';
select set_config('ra.admin', (select u.id::text from auth.users u where u.email = 'admin@admin.com'), true),
       set_config('ra.tpl', (select t.id::text from custom.template t where t.retired_at is null order by t.template_version desc limit 1), true),
       set_config('ra.inst1', gen_random_uuid()::text, true),
       set_config('ra.inst2', gen_random_uuid()::text, true),
       set_config('ra.inst3', gen_random_uuid()::text, true);
-- archived is newest-first, restore runs oldest-first: the missing page (always refused) is tried before the table (comes back).
insert into custom.template_install (id, organization_id, template_id, catalogue_id, template_version, state, install_day, timezone,
                                     installed_by, uninstalled_at, archived)
values (current_setting('ra.inst1')::uuid, '5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ra.tpl')::uuid, 'RA-TEST-1', 1,
        'uninstalled', current_date, 'UTC', current_setting('ra.admin')::uuid, now(),
        jsonb_build_array(jsonb_build_object('kind', 'table', 'id', gen_random_uuid(), 'title', 'RA comes back'),
                          jsonb_build_object('kind', 'page', 'id', gen_random_uuid(), 'title', 'RA refused page'))),
       (current_setting('ra.inst2')::uuid, '5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ra.tpl')::uuid, 'RA-TEST-2', 1,
        'uninstalled', current_date, 'UTC', current_setting('ra.admin')::uuid, now(),
        jsonb_build_array(jsonb_build_object('kind', 'page', 'id', gen_random_uuid(), 'title', 'RA refused page'))),
       (current_setting('ra.inst3')::uuid, '5dc930e9-bd65-44a1-8369-af773f6e1a5b', current_setting('ra.tpl')::uuid, 'RA-TEST-3', 1,
        'uninstalled', current_date, 'UTC', current_setting('ra.admin')::uuid, now(),
        jsonb_build_array(jsonb_build_object('kind', 'mystery', 'id', gen_random_uuid(), 'title', 'RA unknown kind')));
select set_config('request.jwt.claims', json_build_object('sub', current_setting('ra.admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_a jsonb;
begin
  -- 1. a refused first item never stops the call before the item after it is tried: the table comes back
  v_a := custom.template_restore(c_org, current_setting('ra.inst1')::uuid, 0);
  if jsonb_array_length(v_a -> 'archived') <> 1 then
    raise exception 'RED b1: the call brought nothing back (archived % of 2, refusal %, done %)',
      jsonb_array_length(v_a -> 'archived'), v_a -> 'refusal', v_a -> 'done';
  end if;
  if v_a -> 'archived' -> 0 ->> 'title' <> 'RA refused page' then
    raise exception 'RED b1b: the item left is not the refused one: %', v_a -> 'archived';
  end if;
  -- 1b. the next call moves nothing (only the refused page is left): it answers why, never "keep going"
  v_a := custom.template_restore(c_org, current_setting('ra.inst1')::uuid, 0);
  if coalesce((v_a ->> 'done')::boolean, false) or v_a -> 'refusal' is null or jsonb_typeof(v_a -> 'refusal') = 'null' then
    raise exception 'RED b1c: a restore call that moved nothing answered without a refusal: %', v_a;
  end if;
  -- 2. a call that moves nothing always refuses, whatever the budget
  v_a := custom.template_restore(c_org, current_setting('ra.inst2')::uuid, 0);
  if not coalesce((v_a ->> 'done')::boolean, false)
     and (v_a -> 'refusal' is null or jsonb_typeof(v_a -> 'refusal') = 'null' or coalesce(v_a -> 'refusal' ->> 'message', '') = '') then
    raise exception 'RED b2: a restore call that moved nothing answered "keep going" (archived %, refusal %)',
      jsonb_array_length(v_a -> 'archived'), v_a -> 'refusal';
  end if;
  if not coalesce((v_a -> 'refusal' ->> 'stalled')::boolean, false) then
    raise exception 'RED b2b: a call that moved nothing is not marked stalled: %', v_a -> 'refusal';
  end if;
  -- 2b (restoreadvance_b). every item was tried, so it is a dead end: nothing is left untried for a later call
  if (v_a -> 'refusal' ->> 'untried') is distinct from '0' then
    raise exception 'RED b2c: a dead-end refusal does not say untried = 0: %', v_a -> 'refusal';
  end if;
  -- 3 (restoreadvance_c). nothing is counted as brought back that was not: an unknown kind is refused by name
  v_a := custom.template_restore(c_org, current_setting('ra.inst3')::uuid, 0);
  if coalesce((v_a ->> 'done')::boolean, false) or coalesce(v_a -> 'refusal' ->> 'message', '') not like 'Restore does not know how to bring back "RA unknown kind"%' then
    raise exception 'RED c1: an item restore cannot bring back was counted as restored: %', v_a;
  end if;
  raise notice 'GREEN restoreadvance_a: every restore call advances or refuses (b1, b2, b2c, c1)';
end $$;
rollback;

-- AT-NOTIFY-MOVE task 2 / "Move base between workspaces" — custom.base_move. BEGIN … ROLLBACK: three fixture organizations,
-- a base with two tables (rows + an automation) and nothing it makes outlives the run.
begin;
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_home uuid; v_base uuid := gen_random_uuid(); v_t1 uuid; v_t2 uuid; v_f uuid; v_r uuid; v_out jsonb; v_n integer; v_org uuid; v_state text; v_auto jsonb;
begin
  if (select email from auth.users where id = c_test) <> 'test@test.com' then raise exception 'the test seat is not test@test.com'; end if;
  perform set_config('app.actor_system', 'campaign.atnotify.basemove', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  foreach v_org in array array[v_a, v_b, v_c] loop
    insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-NOTIFY-MOVE Fixture', 'atm-' || substr(v_org::text,1,8), 'ATM', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-NOTIFY-MOVE fixture');
  end loop;
  -- test@test.com is an ordinary member of A and B, and nothing in C.
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_a, 'organization', v_a, c_test, 'member', 'active');
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_b, 'organization', v_b, c_test, 'member', 'active');
  insert into custom.record (organization_id, table_id, data) values (v_a, null, jsonb_build_object('name','Move Me Home')) returning id into v_home;
  insert into custom.base (id, home_id, name, organization_id, created_by) values (v_base, v_home, 'Move Me', v_a, c_admin);
  perform set_config('role','authenticated', true);
  v_t1 := custom.table_declare(v_a, jsonb_build_object('name','Chores','slug','chores','type','entity','display','list','label_singular','Chore','label_plural','Chores',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'),jsonb_build_object('name','owner','type','member'))));
  v_t2 := custom.table_declare(v_a, jsonb_build_object('name','Rooms','slug','rooms','type','entity','display','list','label_singular','Room','label_plural','Rooms',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_r := custom.record_write(v_a, v_t1, jsonb_build_object('title','Sweep'));
  perform custom.record_write(v_a, v_t2, jsonb_build_object('title','Kitchen'));
  perform set_config('role','postgres', true);
  select f.id into v_f from custom.record f where f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_t1::text and f.data ->> 'key' = 'owner';
  perform set_config('role','authenticated', true);
  perform custom.field_notify_on_assign(v_a, v_f, true);

  -- CLAUSE 1 — a member who is not admin on the Home is refused.
  perform set_config('request.jwt.claims', c_test_j, true);
  begin
    perform custom.base_move(v_home, v_b);
    raise exception 'CLAUSE 1 FAILED: a non-admin moved the base';
  exception when sqlstate '42501' then
    raise notice 'CLAUSE 1 OK: non-admin refused (%)', left(sqlerrm, 80);
  end;

  -- CLAUSE 2 — an admin is refused a workspace they do not belong to.
  perform set_config('request.jwt.claims', c_admin_j, true);
  begin
    -- c_admin is a member of C in this fixture, so drop that seat to prove the wall.
    perform set_config('role','postgres', true);
    delete from iam.memberships where organization_id = v_c and user_id = c_admin;
    perform set_config('role','authenticated', true);
    perform custom.base_move(v_home, v_c);
    raise exception 'CLAUSE 2 FAILED: moved into a workspace the caller is not in';
  exception when sqlstate '42501' then
    raise notice 'CLAUSE 2 OK: non-member of target refused (%)', left(sqlerrm, 80);
  end;

  -- CLAUSE 3 — the admin moves the whole base into B.
  v_out := custom.base_move(v_home, v_b);
  perform set_config('role','postgres', true);
  select count(*) into v_n from custom.record where id in (v_home, v_t1, v_t2) and organization_id = v_b;
  if v_n <> 3 then raise exception 'CLAUSE 3 FAILED: only % of Home + 2 tables are in B (%)', v_n, v_out; end if;
  if (select organization_id from custom.base where id = v_base) <> v_b then raise exception 'CLAUSE 3 FAILED: the base row stayed in A'; end if;
  select count(*) into v_n from custom.record where organization_id = v_a and (id in (v_home, v_t1, v_t2) or custom.containment_parent(data) = v_home);
  if v_n <> 0 then raise exception 'CLAUSE 3 FAILED: % row(s) of the base were left in A', v_n; end if;
  select count(*) into v_n from custom.record t where t.organization_id = v_b and t.data_class = 'table' and custom.containment_parent(t.data) = v_home;
  if v_n <> 2 then raise exception 'CLAUSE 3 FAILED: % table(s) under the Home in B, wanted 2', v_n; end if;
  select count(*) into v_n from custom.record r where r.organization_id = v_b and r.table_id in (v_t1, v_t2) and r.data_class = 'record';
  if v_n <> 2 then raise exception 'CLAUSE 3 FAILED: % record(s) in B, wanted 2', v_n; end if;
  select count(*) into v_n from custom.record t, jsonb_array_elements(t.data -> 'automations') e
   where t.id = v_t1 and t.organization_id = v_b and (e ->> 'archived_at') is null;
  if v_n < 2 then raise exception 'CLAUSE 3 FAILED: % automation(s) travelled with the table, wanted 2', v_n; end if;
  raise notice 'CLAUSE 3 OK: Home, base row, 2 tables, 2 records and % automations are in B, none left in A', v_n;
  raise notice 'AT-NOTIFY-MOVE base move GREEN';
end;
$green$;
rollback;

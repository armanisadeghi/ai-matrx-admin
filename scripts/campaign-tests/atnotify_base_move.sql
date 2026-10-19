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
  v_h2 uuid; v_h3 uuid; v_h4 uuid; v_u1 uuid; v_tk uuid; v_pj uuid; v_ot uuid; v_tr uuid; v_pr uuid; v_ff uuid; v_msg text;
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

  -- The base is now in B. Clauses A-C. (admin is a member of A and B.)
  -- CLAUSE A — a base nobody named (a Home with a table, NO custom.base row) moves B -> A.
  perform set_config('role','postgres', true);
  insert into custom.record (organization_id, table_id, data) values (v_b, null, jsonb_build_object('name','Unnamed Home')) returning id into v_h2;
  perform set_config('role','authenticated', true);
  v_u1 := custom.table_declare(v_b, jsonb_build_object('name','Unnamed Notes','slug','unnamed_notes','type','entity','display','list','label_singular','Note','label_plural','Unnamed Notes',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_h2::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  perform custom.record_write(v_b, v_u1, jsonb_build_object('title','n1'));
  perform custom.base_move(v_h2, v_a);
  perform set_config('role','postgres', true);
  if exists (select 1 from custom.base where home_id = v_h2) then raise exception 'CLAUSE A FAILED: a base row appeared for the unnamed base'; end if;
  select count(*) into v_n from custom.record where organization_id = v_a and id in (v_h2, v_u1);
  if v_n <> 2 then raise exception 'CLAUSE A FAILED: only % of Home + table are in A', v_n; end if;
  select count(*) into v_n from custom.record r where r.organization_id = v_a and r.table_id = v_u1 and r.data_class = 'record';
  if v_n <> 1 then raise exception 'CLAUSE A FAILED: % row(s) of the table in A, wanted 1', v_n; end if;
  raise notice 'CLAUSE A OK: an unnamed base (Home + table + row) moved B -> A';

  -- CLAUSE B — a base whose tables link to each other moves, links intact.
  insert into custom.record (organization_id, table_id, data) values (v_b, null, jsonb_build_object('name','Linked Home')) returning id into v_h3;
  perform set_config('role','authenticated', true);
  v_tk := custom.table_declare(v_b, jsonb_build_object('name','LTasks','slug','ltasks','type','entity','display','list','label_singular','Task','label_plural','LTasks',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_h3::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_pj := custom.table_declare(v_b, jsonb_build_object('name','LProjects','slug','lprojects','type','entity','display','list','label_singular','Project','label_plural','LProjects',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_h3::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_ff := custom.field_declare(v_b, v_tk, jsonb_build_object('key','project','label','Project','type','relation','multi',false,'relation_target',v_pj,'relation_max',1,'on_target_delete','restrict'));
  v_tr := custom.record_write(v_b, v_tk, jsonb_build_object('title','t1'));
  v_pr := custom.record_write(v_b, v_pj, jsonb_build_object('title','p1'));
  perform platform.relation_set(v_b, v_tr, 'project', jsonb_build_array(v_pr::text));
  v_out := custom.base_move(v_h3, v_a);
  perform set_config('role','postgres', true);
  select count(*) into v_n from custom.record where organization_id = v_a and id in (v_h3, v_tk, v_pj, v_tr, v_pr, v_ff);
  if v_n <> 6 then raise exception 'CLAUSE B FAILED: only % of Home, 2 tables, 2 rows, the column are in A (%)', v_n, v_out; end if;
  select count(*) into v_n from platform.associations a where a.source_id = v_tr and a.target_id = v_pr and a.deleted_at is null
     and a.relation_field_id = v_ff and a.organization_id = v_a;
  if v_n <> 1 then raise exception 'CLAUSE B FAILED: the Task->Project link did not survive in A (% live edges)', v_n; end if;
  select count(*) into v_n from custom.record t where t.organization_id = v_a and t.data_class = 'table' and custom.containment_parent(t.data) = v_h3;
  if v_n <> 2 then raise exception 'CLAUSE B FAILED: % table(s) under the Home in A, wanted 2', v_n; end if;
  raise notice 'CLAUSE B OK: a base with an internal relation moved with its link intact';

  -- CLAUSE C — the Move Me base (in B, tables Chores + Rooms) gets a column linking to a table OUTSIDE it: refused, naming that table, nothing moves.
  insert into custom.record (organization_id, table_id, data) values (v_b, null, jsonb_build_object('name','Out Home')) returning id into v_h4;
  perform set_config('role','authenticated', true);
  v_ot := custom.table_declare(v_b, jsonb_build_object('name','Outside Clients','slug','outside_clients','type','entity','display','list','label_singular','Client','label_plural','Outside Clients',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_h4::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  perform custom.field_declare(v_b, v_t1, jsonb_build_object('key','client','label','Client','type','relation','multi',false,'relation_target',v_ot,'relation_max',1,'on_target_delete','restrict'));
  begin
    perform custom.base_move(v_home, v_a);
    raise exception 'CLAUSE C FAILED: a base linked to an outside table moved';
  exception when sqlstate '55000' then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%Outside Clients%' then raise exception 'CLAUSE C FAILED: the refusal does not name the outside table: %', v_msg; end if;
    raise notice 'CLAUSE C OK: refused (%)', v_msg;
  end;
  perform set_config('role','postgres', true);
  select count(*) into v_n from custom.record where organization_id = v_b and id in (v_home, v_t1, v_t2);
  if v_n <> 3 then raise exception 'CLAUSE C FAILED: the refused base is no longer whole in B (% of 3)', v_n; end if;
  raise notice 'AT-NOTIFY-MOVE base move GREEN';
end;
$green$;
rollback;

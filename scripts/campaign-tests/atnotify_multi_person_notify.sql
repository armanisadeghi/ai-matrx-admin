-- AT-NOTIFY-MOVE task 1 / "Collaborator (user) notify" — MANY PEOPLE IN ONE CELL. Seat: admin@admin.com (owner) assigns test@test.com in a Person
-- column and test@test.com's notice is filed. Runs inside BEGIN … ROLLBACK: nothing it makes outlives the run (the
-- fixture organization, the table, the rows and the queued notices all roll back; no SMS channel is on records.changed).
-- RED half inside the same run: before the switch is on, an assignment files NO notice (clause 1), so a green clause 2/3
-- cannot be a notice something else filed.
begin;
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_two   constant uuid := '929274b1-a889-41ee-8a7f-dbaec7b0ee54';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_f uuid; v_r2 uuid; v_r3 uuid; v_n2 integer;  v_out jsonb; v_n integer; v_body text;
begin
  if (select email from auth.users where id = c_test) <> 'test@test.com' then raise exception 'the test seat is not test@test.com'; end if;
  perform set_config('app.actor_system', 'campaign.atshare_b.notify', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SHARE-B Notify Fixture', 'atb-notify-' || substr(v_org::text,1,8), 'ATB', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_test, 'member', 'active');
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_two, 'member', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE-B fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATB Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Chores','slug','chores','type','entity','display','list','label_singular','Chore','label_plural','Chores',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'),jsonb_build_object('name','owner','type','member','multi',true))));
  perform set_config('role','postgres', true);
  select f.id into v_f from custom.record f where f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_t::text and f.data ->> 'key' = 'owner';
  perform set_config('role','authenticated', true);

  v_out := custom.field_notify_on_assign(v_org, v_f, true);
  if not (v_out->>'notify_on_assign')::boolean then raise exception 'CLAUSE 1 FAILED (switch): %', v_out; end if;

  -- CLAUSE 1 — a NEW record with TWO people in one cell tells each of them, once.
  v_r2 := custom.record_write(v_org, v_t, jsonb_build_object('title','Two on the job','owner',jsonb_build_array(c_test::text, c_two::text)));
  perform set_config('role','postgres', true);
  select count(*) into v_n from communication.notification n where n.organization_id = v_org and n.recipient_user_id = c_test and n.channel = 'in_app' and n.target_id = v_r2;
  select count(*) into v_n2 from communication.notification n where n.organization_id = v_org and n.recipient_user_id = c_two and n.channel = 'in_app' and n.target_id = v_r2;
  if v_n <> 1 or v_n2 <> 1 then raise exception 'CLAUSE 1 FAILED: new record % gave test@test.com % and the second member % in-app notice(s) (want 1 and 1); runs: %', v_r2, v_n, v_n2,
     (select string_agg(r.data ->> 'status' || ': ' || coalesce(r.data ->> 'says',''), ' / ') from custom.record r where r.organization_id = v_org and r.data_class = 'automation_run'); end if;
  raise notice 'CLAUSE 1 OK: new record %, one in-app notice each (1 and 1)', v_r2;
  perform set_config('role','authenticated', true);

  -- CLAUSE 2 — an edit that ADDS a second person tells only the person newly added.
  v_r3 := custom.record_write(v_org, v_t, jsonb_build_object('title','One then two','owner',jsonb_build_array(c_test::text)));
  perform custom.record_update(v_org, v_r3, jsonb_build_object('owner', jsonb_build_array(c_test::text, c_two::text)), null);
  perform set_config('role','postgres', true);
  select count(*) into v_n from communication.notification n where n.organization_id = v_org and n.recipient_user_id = c_test and n.channel = 'in_app' and n.target_id = v_r3;
  select count(*) into v_n2 from communication.notification n where n.organization_id = v_org and n.recipient_user_id = c_two and n.channel = 'in_app' and n.target_id = v_r3;
  if v_n <> 1 or v_n2 <> 1 then raise exception 'CLAUSE 2 FAILED: record % gave test@test.com % and the added member % in-app notice(s) (want 1 and 1)', v_r3, v_n, v_n2; end if;
  raise notice 'CLAUSE 2 OK: edit added one person, test@test.com still 1 notice, new person 1';
  select count(*) into v_n from communication.notification n where n.organization_id = v_org and n.channel = 'sms';
  if v_n <> 0 then raise exception 'SMS FOUND: %', v_n; end if;
  raise notice 'AT-NOTIFY-MOVE multi-person notify GREEN (no SMS queued)';
end;
$green$;
rollback;

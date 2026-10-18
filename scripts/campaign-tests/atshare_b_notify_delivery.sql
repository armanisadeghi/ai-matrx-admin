-- AT-SHARE-B / "Collaborator (user) notify" — DELIVERY. Seat: admin@admin.com (owner) assigns test@test.com in a Person
-- column and test@test.com's notice is filed. Runs inside BEGIN … ROLLBACK: nothing it makes outlives the run (the
-- fixture organization, the table, the rows and the queued notices all roll back; no SMS channel is on records.changed).
-- RED half inside the same run: before the switch is on, an assignment files NO notice (clause 1), so a green clause 2/3
-- cannot be a notice something else filed.
begin;
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_f uuid; v_r1 uuid; v_r2 uuid; v_r3 uuid; v_out jsonb; v_n integer; v_body text;
begin
  if (select email from auth.users where id = c_test) <> 'test@test.com' then raise exception 'the test seat is not test@test.com'; end if;
  perform set_config('app.actor_system', 'campaign.atshare_b.notify', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SHARE-B Notify Fixture', 'atb-notify-' || substr(v_org::text,1,8), 'ATB', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_test, 'member', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE-B fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATB Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Chores','slug','chores','type','entity','display','list','label_singular','Chore','label_plural','Chores',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'),jsonb_build_object('name','owner','type','member'))));
  perform set_config('role','postgres', true);
  select f.id into v_f from custom.record f where f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_t::text and f.data ->> 'key' = 'owner';
  perform set_config('role','authenticated', true);

  -- CLAUSE 1 (RED half) — switch off: assigning test@test.com files no notice.
  v_r1 := custom.record_write(v_org, v_t, jsonb_build_object('title','Before the switch','owner',c_test::text));
  perform set_config('role','postgres', true);
  select count(*) into v_n from communication.notification n where n.organization_id = v_org and n.recipient_user_id = c_test;
  if v_n <> 0 then raise exception 'CLAUSE 1 FAILED: % notice(s) with the switch off', v_n; end if;
  raise notice 'CLAUSE 1 OK: switch off, record % assigned, 0 notices', v_r1;
  perform set_config('role','authenticated', true);

  -- CLAUSE 2 — switch on, a NEW record with test@test.com in the column files their in-app notice about that record.
  v_out := custom.field_notify_on_assign(v_org, v_f, true);
  if not (v_out->>'notify_on_assign')::boolean then raise exception 'CLAUSE 2 FAILED (switch): %', v_out; end if;
  v_r2 := custom.record_write(v_org, v_t, jsonb_build_object('title','Water the plants','owner',c_test::text));
  perform set_config('role','postgres', true);
  select count(*), max(n.body) into v_n, v_body from communication.notification n
   where n.organization_id = v_org and n.recipient_user_id = c_test and n.channel = 'in_app' and n.target_id = v_r2;
  if v_n < 1 then raise exception 'CLAUSE 2 FAILED: no in-app notice for test@test.com on the new record % (write said %)', v_r2, v_out; end if;
  raise notice 'CLAUSE 2 OK: new record %, % in-app notice(s): %', v_r2, v_n, v_body;
  perform set_config('role','authenticated', true);

  -- CLAUSE 3 — an EXISTING record edited to put test@test.com in the column files their notice too.
  v_r3 := custom.record_write(v_org, v_t, jsonb_build_object('title','Take out the bins'));
  v_out := custom.record_update(v_org, v_r3, jsonb_build_object('owner', c_test::text), null);
  perform set_config('role','postgres', true);
  select count(*) into v_n from communication.notification n
   where n.organization_id = v_org and n.recipient_user_id = c_test and n.channel = 'in_app' and n.target_id = v_r3;
  if v_n < 1 then raise exception 'CLAUSE 3 FAILED: no notice after assigning on an existing record % (update said %)', v_r3, v_out; end if;
  raise notice 'CLAUSE 3 OK: edited record %, % in-app notice(s)', v_r3, v_n;
  select count(*) into v_n from communication.notification n where n.organization_id = v_org and n.channel = 'sms';
  if v_n <> 0 then raise exception 'SMS FOUND: %', v_n; end if;
  raise notice 'AT-SHARE-B notify delivery GREEN (no SMS queued)';
end;
$green$;
rollback;

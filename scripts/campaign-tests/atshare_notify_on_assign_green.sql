-- AT-SHARE / row 4 — COLLABORATOR "NOTIFY WHEN ASSIGNED". Seat: admin@admin.com (owner), who assigns test@test.com (the Collaborator). RED: before the migration the door is absent.
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_mara  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_f uuid; v_note uuid; v_r uuid; v_out jsonb; v_msg text; v_n integer; v_cfg jsonb;
begin
  perform set_config('app.actor_system', 'campaign.atshare.assign', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SHARE Assign Fixture', 'at-assign-fixture-' || substr(v_org::text,1,8), 'ATN', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_mara, 'member', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATN Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Chores','slug','chores','type','entity','display','list','label_singular','Chore','label_plural','Chores',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'),jsonb_build_object('name','owner','type','member'),jsonb_build_object('name','note'))));
  perform set_config('role','postgres', true);
  select f.id into v_f from custom.record f where f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_t::text and f.data ->> 'key' = 'owner';
  select f.id into v_note from custom.record f where f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_t::text and f.data ->> 'key' = 'note';
  perform set_config('role','authenticated', true);
  -- CLAUSE 1 — switch it on: two automations stand, remembered on the column.
  v_out := custom.field_notify_on_assign(v_org, v_f, true);
  if not coalesce((v_out->>'notify_on_assign')::boolean,false) or jsonb_array_length(v_out->'automation_ids') <> 2 then raise exception 'CLAUSE 1 FAILED: %', v_out; end if;
  raise notice 'CLAUSE 1 OK: %', v_out->>'says';
  -- CLAUSE 2 — switching on again changes nothing.
  v_out := custom.field_notify_on_assign(v_org, v_f, true);
  if (v_out->>'changed')::boolean then raise exception 'CLAUSE 2 FAILED: made duplicates: %', v_out; end if;
  raise notice 'CLAUSE 2 OK: idempotent';
  -- CLAUSE 3 — a column that is not people is refused.
  begin
    perform custom.field_notify_on_assign(v_org, v_note, true);
    raise exception 'CLAUSE 3 FAILED: a text column was accepted';
  exception when invalid_parameter_value then get stacked diagnostics v_msg = message_text; raise notice 'CLAUSE 3 OK: %', v_msg;
  end;
  -- CLAUSE 4 — the state reads back, and a viewer-level read does not change anything.
  v_out := custom.field_notify_on_assign(v_org, v_f, null);
  if not (v_out->>'notify_on_assign')::boolean or jsonb_array_length(v_out->'automation_ids') <> 2 then raise exception 'CLAUSE 4 FAILED: %', v_out; end if;
  raise notice 'CLAUSE 4 OK: state reads on, two automations';
  -- CLAUSE 5 — off archives them.
  v_out := custom.field_notify_on_assign(v_org, v_f, false);
  if (custom.field_notify_on_assign(v_org, v_f, null)->>'notify_on_assign')::boolean then raise exception 'CLAUSE 5 FAILED: still on after off'; end if;
  if (v_out->>'notify_on_assign')::boolean or jsonb_array_length(v_out->'automation_ids') <> 0 then raise exception 'CLAUSE 5 FAILED: %', v_out; end if;
  raise notice 'CLAUSE 5 OK: %', v_out->>'says';
  raise notice 'AT-SHARE notify-on-assign GREEN';
end;
$green$;

-- LANE W2-A 2 - A BUTTON ADDS A ROW, PREFILLED FROM THE PRESSED ONE, IN THIS TABLE OR ANOTHER. Seat: admin@admin.com, own fixture org, rolled back.
-- RED before 20261018054000_w2a_e_a_button_adds_a_row_prefilled_from_this_one.sql: R1 fails (do add_row refused as a button setting).
begin;
set local statement_timeout = '30s';
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid := gen_random_uuid(); v_home uuid; v_cust uuid; v_jobs uuid; v_r uuid; v_btn uuid; v_same uuid; v_out jsonb; v_vals jsonb;
  spec jsonb := jsonb_build_object('type','entity','display','list','ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'title_field','title','default_sort','[]'::jsonb);
begin
  perform set_config('app.actor_system', 'campaign.w2a.add_row', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'W2-A Button Fixture', 'w2a-btn-' || substr(v_org::text,1,8), 'WAB', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'W2-A fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','WAB Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_jobs := custom.table_declare(v_org, spec || jsonb_build_object('name','Jobs','slug','jobs','label_singular','Job','label_plural','Jobs','parent_id',v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name','title'), jsonb_build_object('name','phone'), jsonb_build_object('name','from_row'))));
  v_cust := custom.table_declare(v_org, spec || jsonb_build_object('name','Customers','slug','customers','label_singular','Customer','label_plural','Customers','parent_id',v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name','title'), jsonb_build_object('name','phone'), jsonb_build_object('name','new_job','type','button'), jsonb_build_object('name','copy_me','type','button'))));
  execute 'reset role';
  select id into v_btn from custom.record where organization_id = v_org and table_id = custom.field_kernel_id() and deleted_at is null and data ->> 'entity_definition_id' = v_cust::text and data ->> 'key' = 'new_job';
  select id into v_same from custom.record where organization_id = v_org and table_id = custom.field_kernel_id() and deleted_at is null and data ->> 'entity_definition_id' = v_cust::text and data ->> 'key' = 'copy_me';
  perform set_config('role','authenticated', true);
  -- R1 the button settings take add_row (another table, and this table)
  perform custom.field_update(v_org, v_btn, jsonb_build_object('button', jsonb_build_object('label','New job','do','add_row','table_id',v_jobs::text,
            'prefill', jsonb_build_object('title','title','phone','phone','from_row','@row'))));
  perform custom.field_update(v_org, v_same, jsonb_build_object('button', jsonb_build_object('label','Copy','do','add_row','prefill', jsonb_build_object('title','title'))));
  raise notice 'R1 PASS - add_row stored on both buttons';
  -- R2 a press on a customer makes a job prefilled from it, through the create door, and answers its id
  v_r := custom.record_write(v_org, v_cust, jsonb_build_object('title','Hollis','phone','555-0101'));
  v_out := custom.button_press(v_org, v_r, v_btn);
  if v_out ->> 'do' <> 'add_row' or (v_out ->> 'table_id')::uuid <> v_jobs or v_out ->> 'record_id' is null then raise exception 'R2 RED: %', v_out; end if;
  execute 'reset role';
  v_vals := custom.record_values(v_org, (v_out ->> 'record_id')::uuid);
  if v_vals ->> 'title' <> 'Hollis' or v_vals ->> 'phone' <> '555-0101' or v_vals ->> 'from_row' <> v_r::text then raise exception 'R2 RED: the job holds %', v_vals; end if;
  raise notice 'R2 PASS - a job in the linked table, prefilled: %', v_vals;
  perform set_config('role','authenticated', true);
  -- R3 with no table_id the row lands in this table
  v_out := custom.button_press(v_org, v_r, v_same);
  execute 'reset role';
  if (v_out ->> 'table_id')::uuid <> v_cust or custom.record_values(v_org, (v_out ->> 'record_id')::uuid) ->> 'title' <> 'Hollis' then raise exception 'R3 RED: %', v_out; end if;
  raise notice 'R3 PASS - a copy in this table';
  perform set_config('role','authenticated', true);
  -- R4 a prefill that is not a map is refused by name
  begin perform custom.field_update(v_org, v_same, jsonb_build_object('button', jsonb_build_object('label','Bad','do','add_row','prefill','title')));
    raise exception 'R4 RED: a string prefill was stored';
  exception when check_violation then raise notice 'R4 PASS - %', sqlerrm; end;
  raise notice 'GREEN R1-R4: a button adds a row prefilled from the pressed one';
end
$t$;
rollback;

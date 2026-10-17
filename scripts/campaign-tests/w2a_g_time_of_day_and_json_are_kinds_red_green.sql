-- LANE W2-A 1 - A TIME OF DAY AND A JSON VALUE ARE COLUMN KINDS. Seat: admin@admin.com, own fixture org, rolled back.
-- RED before 20261018056000_w2a_g_time_of_day_and_json_are_kinds.sql: R1 fails (field_kinds publishes neither).
begin;
set local statement_timeout = '30s';
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_r uuid; v_vals jsonb; v_sorted text; v jsonb;
begin
  if (select count(*) from custom.field_kinds() where kind in ('time', 'json')) <> 2 then raise exception 'R1 RED: custom.field_kinds() publishes no time / json kind'; end if;
  raise notice 'R1 PASS - field_kinds publishes time and json';
  perform set_config('app.actor_system', 'campaign.w2a.time_json', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'W2-A Kinds Fixture', 'w2a-kinds-' || substr(v_org::text,1,8), 'WAK', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'W2-A fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','WAK Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Shifts','slug','shifts','type','entity','display','list','label_singular','Shift','label_plural','Shifts',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  perform custom.field_declare(v_org, v_t, jsonb_build_object('key','opens','label','Opens','type','time'));
  perform custom.field_declare(v_org, v_t, jsonb_build_object('key','meta','label','Meta','type','json'));
  -- R2 a time and a JSON value are written and read back as themselves
  v_r := custom.record_write(v_org, v_t, jsonb_build_object('title','Early','opens','09:30','meta', jsonb_build_object('tags', jsonb_build_array('a','b'), 'n', 2)));
  perform custom.record_write(v_org, v_t, jsonb_build_object('title','Late','opens','17:45','meta', jsonb_build_array(1, 2)));
  perform custom.record_write(v_org, v_t, jsonb_build_object('title','Mid','opens','09:30:15','meta', 'true'::jsonb));
  execute 'reset role';
  v_vals := custom.record_values(v_org, v_r);
  if v_vals -> 'opens' is distinct from '"09:30"'::jsonb or v_vals -> 'meta' -> 'tags' is distinct from '["a","b"]'::jsonb then raise exception 'R2 RED: read back %', v_vals; end if;
  if (select custom.field_kind_of(data) from custom.record where organization_id = v_org and table_id = custom.field_kernel_id() and data ->> 'key' = 'opens') <> 'time'
     or (select custom.field_kind_of(data) from custom.record where organization_id = v_org and table_id = custom.field_kernel_id() and data ->> 'key' = 'meta') <> 'json' then
    raise exception 'R2 RED: the columns do not read back as time / json'; end if;
  raise notice 'R2 PASS - written and read back: %', v_vals;
  -- R3 the stored text sorts as the time (zero-padded 24-hour)
  select string_agg(custom.record_values(v_org, r.id) ->> 'opens', ' < ' order by custom.record_values(v_org, r.id) ->> 'opens') into v_sorted
    from custom.record r where r.organization_id = v_org and r.table_id = v_t and r.deleted_at is null and r.data_class = 'record';
  if v_sorted <> '09:30 < 09:30:15 < 17:45' then raise exception 'R3 RED: sorted as %', v_sorted; end if;
  raise notice 'R3 PASS - sorts as time: %', v_sorted;
  -- R4 a value that is not a time of day is refused by name
  perform set_config('role','authenticated', true);
  begin perform custom.record_write(v_org, v_t, jsonb_build_object('title','Bad','opens','25:00')); raise exception 'R4 RED: 25:00 was kept';
  exception when check_violation then raise notice 'R4 PASS - %', sqlerrm; end;
  begin perform custom.record_write(v_org, v_t, jsonb_build_object('title','Bad','opens','half nine')); raise exception 'R4 RED: words were kept';
  exception when check_violation then raise notice 'R4 PASS - %', sqlerrm; end;
  execute 'reset role';
  -- R5 formulas read a time of day
  v := custom.formula_eval(null::uuid, (custom._fxp_level(custom._fxp_tokens('HOUR("09:30") & "|" & MINUTE("17:45:10") & "|" & SECOND("17:45:10") & "|" & SECOND("09:30")'), 0, 0)) -> 'n', '{}'::jsonb, '{}'::jsonb);
  if v #>> '{}' <> '9|45|10|0' then raise exception 'R5 RED: formulas read %', v; end if;
  raise notice 'GREEN R1-R5: time of day and JSON are kinds (formulas read %)', v #>> '{}';
end
$t$;
rollback;

-- LANE W2-A 4 - A LAST CHANGED TIME COLUMN IS LIMITED TO CHOSEN FIELDS THROUGH custom.field_update. Seat: admin@admin.com, own fixture org, rolled back.
-- RED before 20261018053000_w2a_d_a_last_changed_column_watches_chosen_fields.sql: R1 fails (the door refused only_fields by name).
begin;
set local statement_timeout = '30s';
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_r uuid; v_f uuid; v_title uuid; v_doc jsonb;
begin
  perform set_config('app.actor_system', 'campaign.w2a.only_fields', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'W2-A Watch Fixture', 'w2a-watch-' || substr(v_org::text,1,8), 'WAW', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'W2-A fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','WAW Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Tasks','slug','tasks','type','entity','display','list','label_singular','Task','label_plural','Tasks',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'), jsonb_build_object('name','owner_note'), jsonb_build_object('name','title_change','type','modified_time'))));
  execute 'reset role'; -- the suite reads the field ids itself; the doors below run as the person
  select id into v_f from custom.record where organization_id = v_org and table_id = custom.field_kernel_id() and deleted_at is null and data ->> 'entity_definition_id' = v_t::text and data ->> 'key' = 'title_change';
  select id into v_title from custom.record where organization_id = v_org and table_id = custom.field_kernel_id() and deleted_at is null and data ->> 'entity_definition_id' = v_t::text and data ->> 'key' = 'title';
  perform set_config('role','authenticated', true);
  -- R1 the door takes the list
  perform custom.field_update(v_org, v_f, jsonb_build_object('only_fields', jsonb_build_array('title')));
  execute 'reset role';
  if (select data #> '{config,only_fields}' from custom.record where id = v_f) is distinct from '["title"]'::jsonb then raise exception 'R1 RED: only_fields not stored'; end if;
  raise notice 'R1 PASS - field_update stored only_fields ["title"]';
  perform set_config('role','authenticated', true);
  -- R2 the stamp follows only the watched field: an unwatched write leaves it blank, a watched write fills it
  v_r := custom.record_write(v_org, v_t, jsonb_build_object('owner_note', 'first'));
  select document into v_doc from custom.read_records(v_org, v_t, false, 10, 0) limit 1;
  if v_doc ->> 'title_change' is not null then raise exception 'R2 RED: the column followed an unwatched field: %', v_doc; end if;
  perform custom.record_update(v_org, v_r, jsonb_build_object('title', 'Pack boxes'), null);
  select document into v_doc from custom.read_records(v_org, v_t, false, 10, 0) limit 1;
  if v_doc ->> 'title_change' is null then raise exception 'R2 RED: the watched write left the column blank: %', v_doc; end if;
  raise notice 'R2 PASS - unwatched write blank, watched write %', v_doc ->> 'title_change';
  -- R3 a key the table does not have, and a column that is not a last changed time, are refused by name
  begin perform custom.field_update(v_org, v_f, jsonb_build_object('only_fields', jsonb_build_array('nope')));
    raise exception 'R3 RED: an unknown key was stored';
  exception when check_violation then raise notice 'R3 PASS - unknown key refused: %', sqlerrm; end;
  begin perform custom.field_update(v_org, v_title, jsonb_build_object('only_fields', jsonb_build_array('owner_note')));
    raise exception 'R3 RED: a text column took only_fields';
  exception when check_violation then raise notice 'R3 PASS - a text column refuses: %', sqlerrm; end;
  -- R4 null takes the limit away
  perform custom.field_update(v_org, v_f, jsonb_build_object('only_fields', null));
  execute 'reset role';
  if (select data -> 'config' ? 'only_fields' from custom.record where id = v_f) then raise exception 'R4 RED: null kept the limit'; end if;
  raise notice 'GREEN R1-R4: a last changed time column watches the fields chosen through field_update';
end
$t$;
rollback;

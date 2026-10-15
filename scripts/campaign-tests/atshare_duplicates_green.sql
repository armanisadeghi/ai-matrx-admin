-- AT-SHARE / row 4 — DEDUPE FINDER (custom.find_duplicates). Seats: admin@admin.com (owner), test@test.com (a viewer: refused). RED: before the migration the door is absent.
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_mara  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_mara_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_out jsonb; v_msg text;
begin
  perform set_config('app.actor_system', 'campaign.atshare.dupes', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SHARE Dupes Fixture', 'at-dupes-fixture-' || substr(v_org::text,1,8), 'ATD', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATD Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Contacts','slug','contacts','type','entity','display','list','label_singular','Contact','label_plural','Contacts',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','name','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','name'),jsonb_build_object('name','email'),jsonb_build_object('name','city'))));
  perform custom.record_write(v_org, v_t, jsonb_build_object('name','Ana Ruiz','email','ana@cafe.example','city','Ojai'));
  perform custom.record_write(v_org, v_t, jsonb_build_object('name','Ana  Ruiz ','email','ANA@cafe.example ','city','Ventura'));
  perform custom.record_write(v_org, v_t, jsonb_build_object('name','Joe Park','email','joe@pier.example','city','Ojai'));
  perform custom.record_write(v_org, v_t, jsonb_build_object('name','Mia Lee','email','','city','Ojai'));
  perform custom.record_write(v_org, v_t, jsonb_build_object('name','Mia Lee','email','','city','Ojai'));

  v_out := custom.find_duplicates(v_org, v_t, array['email'], 50);
  if jsonb_array_length(v_out->'groups') <> 1 or (v_out->'groups'->0->>'size')::int <> 2 then raise exception 'CLAUSE 1 FAILED (same email, case/space ignored; blanks never match): %', v_out; end if;
  raise notice 'CLAUSE 1 OK: one pair found by email (blank emails never match)';
  v_out := custom.find_duplicates(v_org, v_t, array['name','city'], 50);
  if jsonb_array_length(v_out->'groups') <> 1 or v_out->'groups'->0->'members'->0->>'title' <> 'Mia Lee' then raise exception 'CLAUSE 2 FAILED (all chosen fields must match): %', v_out; end if;
  raise notice 'CLAUSE 2 OK: every chosen field must match';
  begin
    perform custom.find_duplicates(v_org, v_t, array[]::text[], 50);
    raise exception 'CLAUSE 3 FAILED: no field chosen was accepted';
  exception when invalid_parameter_value then raise notice 'CLAUSE 3 OK: choose a field';
  end;
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.share_grant(v_org, v_t, 'person', c_mara, 'viewer'::public.permission_level);
  perform set_config('request.jwt.claims', c_mara_j, true);
  begin
    perform custom.find_duplicates(v_org, v_t, array['email'], 50);
    raise exception 'CLAUSE 4 FAILED: a viewer ran the finder';
  exception when insufficient_privilege then get stacked diagnostics v_msg = message_text; raise notice 'CLAUSE 4 OK: %', v_msg;
  end;
  raise notice 'AT-SHARE row 4 (dedupe finder) GREEN';
end;
$green$;

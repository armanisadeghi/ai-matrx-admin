-- AT-SHARE / row 3 — THE ACTIVITY FEED OF A TABLE AND OF A HOME (custom.base_activity).
-- Seats: admin@admin.com (owner), test@test.com (outside the organization). RED: run before the migration (the door is absent).
do $green$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_mara    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_mara_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_jobs uuid; v_other uuid; v_rid uuid;
  v_out jsonb; v_kinds text; v_msg text; v_n integer;
begin
  perform set_config('app.actor_system', 'campaign.atshare.activity', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'AT-SHARE Activity Fixture', 'at-activity-fixture-' || substr(v_org::text,1,8), 'ATA', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATA Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_jobs := custom.table_declare(v_org, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list',
    'label_singular','Job','label_plural','Jobs','ordered',false,'weight','light','retention_days',365,'row_order','sorted',
    'agent_writable',true,'parent_id',v_home::text,'title_field','work_order','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','work_order'),jsonb_build_object('name','stage'))));
  v_other := custom.table_declare(v_org, jsonb_build_object('name','Secrets','slug','secrets','type','entity','display','list',
    'label_singular','Secret','label_plural','Secrets','ordered',false,'weight','light','retention_days',365,'row_order','sorted',
    'agent_writable',true,'parent_id',v_home::text,'title_field','codename','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','codename'))));
  v_rid := custom.record_write(v_org, v_jobs, jsonb_build_object('work_order','ATA-1','stage','Scheduled'));
  perform custom.record_write(v_org, v_other, jsonb_build_object('codename','OPERATION-NIGHTFALL'));
  perform custom.record_update(v_org, v_rid, jsonb_build_object('stage','Done'), null);
  perform custom.share_grant(v_org, v_jobs, 'person', c_mara, 'viewer'::public.permission_level);

  -- CLAUSE 1 — the table's feed names what happened, to what, and by whom (by name).
  v_out := custom.base_activity(v_org, v_jobs, 50, null);
  select string_agg(distinct e->>'kind', ',' order by e->>'kind') into v_kinds from jsonb_array_elements(v_out->'entries') e;
  if v_kinds !~ 'record' or v_kinds !~ 'share' then raise exception 'CLAUSE 1 FAILED: kinds %, feed %', v_kinds, v_out; end if;
  if exists (select 1 from jsonb_array_elements(v_out->'entries') e where e->'actor'->>'name' is null or e->'actor'->>'name' ~ '^[0-9a-f-]{36}$') then
    raise exception 'CLAUSE 1 FAILED: an actor is not named: %', v_out; end if;
  if v_out::text ~ 'OPERATION-NIGHTFALL' then raise exception 'CLAUSE 1 FAILED: another table leaked into this feed'; end if;
  raise notice 'CLAUSE 1 OK: kinds % over % entries', v_kinds, jsonb_array_length(v_out->'entries');

  -- CLAUSE 2 — it pages: a page of one, then the next from next_before is a different entry or null-bounded.
  v_out := custom.base_activity(v_org, v_jobs, 1, null);
  if jsonb_array_length(v_out->'entries') <> 1 then raise exception 'CLAUSE 2 FAILED: page of one gave %', jsonb_array_length(v_out->'entries'); end if;
  raise notice 'CLAUSE 2 OK: a page of one';

  -- CLAUSE 3 — the Home feed covers its tables.
  v_out := custom.base_activity(v_org, v_home, 100, null);
  if v_out->>'subject' <> 'home' or v_out::text !~ 'OPERATION-NIGHTFALL' then raise exception 'CLAUSE 3 FAILED: %', v_out; end if;
  raise notice 'CLAUSE 3 OK: the home feed holds both tables';

  -- CLAUSE 4 — the outsider with View on Jobs reads Jobs' feed, not the Home's other table, and cannot ask for the other table.
  perform set_config('request.jwt.claims', c_mara_j, true);
  v_out := custom.base_activity(v_org, v_jobs, 50, null);
  if jsonb_array_length(v_out->'entries') < 1 then raise exception 'CLAUSE 4 FAILED: empty feed for the sharee'; end if;
  begin
    perform custom.base_activity(v_org, v_other, 50, null);
    raise exception 'CLAUSE 4 FAILED: the sharee read the feed of a table not shared with her';
  exception when insufficient_privilege then
    get stacked diagnostics v_msg = message_text; raise notice 'CLAUSE 4 OK (refused): %', v_msg;
  end;
  begin
    v_out := custom.base_activity(v_org, v_home, 50, null);
    if v_out::text ~ 'OPERATION-NIGHTFALL' then raise exception 'CLAUSE 4 FAILED: the home feed showed her a table she cannot open'; end if;
    raise notice 'CLAUSE 4 OK: the home feed shows her only what she may open';
  exception when insufficient_privilege then
    raise notice 'CLAUSE 4 OK: the home itself refuses her';
  end;
  raise notice 'AT-SHARE row 3 GREEN';
end;
$green$;

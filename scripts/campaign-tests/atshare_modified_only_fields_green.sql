-- AT-SHARE / row 4 — "Last modified time" LIMITED TO CHOSEN FIELDS. Seat: admin@admin.com. RED: before the migration the column follows the whole record.
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_r uuid; v_doc jsonb;
  v_changed_before text; v_changed_after text; v_all_before text; v_all_after text;
begin
  perform set_config('app.actor_system', 'campaign.atshare.modonly', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SHARE Modified Fixture', 'at-mod-fixture-' || substr(v_org::text,1,8), 'ATM', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATM Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Tasks','slug','tasks','type','entity','display','list','label_singular','Task','label_plural','Tasks',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'),jsonb_build_object('name','owner_note'),
       jsonb_build_object('name','any_change','type','modified_time'),
       jsonb_build_object('name','title_change','type','modified_time','config',jsonb_build_object('only_fields', jsonb_build_array('title'))))));
  v_r := custom.record_write(v_org, v_t, jsonb_build_object('title','Pack boxes','owner_note','first'));
  select document into v_doc from custom.read_records(v_org, v_t, false, 10, 0) limit 1;
  v_changed_before := v_doc ->> 'title_change'; v_all_before := v_doc ->> 'any_change';
  if v_changed_before is null then raise exception 'CLAUSE 0 FAILED: the limited column is blank on a record whose title was written: %', v_doc; end if;
  perform pg_sleep(0.2);
  -- CLAUSE 1 — editing a field the column does NOT watch leaves it where it was; the unlimited column moves.
  perform custom.record_update(v_org, v_r, jsonb_build_object('owner_note','second'), null);
  select document into v_doc from custom.read_records(v_org, v_t, false, 10, 0) limit 1;
  v_changed_after := v_doc ->> 'title_change'; v_all_after := v_doc ->> 'any_change';
  if v_changed_after is distinct from v_changed_before then raise exception 'CLAUSE 1 FAILED: the limited column moved on an unwatched edit: % -> %', v_changed_before, v_changed_after; end if;
  if v_all_after is not distinct from v_all_before then raise exception 'CLAUSE 1 FAILED: the unlimited column did not move: %', v_all_after; end if;
  raise notice 'CLAUSE 1 OK: unwatched edit leaves the limited column at %, the unlimited one moved % -> %', v_changed_after, v_all_before, v_all_after;
  perform pg_sleep(0.2);
  -- CLAUSE 2 — editing a watched field moves it.
  perform custom.record_update(v_org, v_r, jsonb_build_object('title','Pack the boxes'), null);
  select document into v_doc from custom.read_records(v_org, v_t, false, 10, 0) limit 1;
  if v_doc ->> 'title_change' is not distinct from v_changed_before then raise exception 'CLAUSE 2 FAILED: the limited column did not move on a watched edit: %', v_doc ->> 'title_change'; end if;
  raise notice 'CLAUSE 2 OK: watched edit moved it to %', v_doc ->> 'title_change';
  raise notice 'AT-SHARE modified-time-only-these-fields GREEN';
end;
$green$;

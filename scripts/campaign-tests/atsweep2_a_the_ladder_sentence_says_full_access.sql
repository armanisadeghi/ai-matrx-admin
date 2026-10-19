-- AT-SWEEP-2: the shared ladder refusal (custom.assert_client_may_change) names levels in the share screen's words (View access / Comment access / Edit access / Full access), message AND hint. begin..rollback, fixture orgs, nothing persists.
-- (AT-SWEEP-3 changed the sentence's wording: it now names the action, not the door.) RED before atsweep2_a ("needs the admin level"); GREEN after.
begin;
do $g$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_org uuid;
  v_home uuid; v_t1 uuid; v_r uuid; v_out jsonb; v_n integer; v_msg text; v_hint text;
begin
  perform set_config('app.actor_system', 'campaign.atreviewfix', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  foreach v_org in array array[v_a, v_b] loop
    insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'ATREVFIX Fixture', 'atrevfix-' || substr(v_org::text,1,8), 'ATR', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'ATREVFIX fixture');
  end loop;
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_a, 'organization', v_a, c_test, 'member', 'active');
  insert into custom.record (organization_id, table_id, data) values (v_a, null, jsonb_build_object('name','Move Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t1 := custom.table_declare(v_a, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list','label_singular','Job','label_plural','Jobs',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_r := custom.record_write(v_a, v_t1, jsonb_build_object('title','Job one'));
  perform custom.share_grant(v_a, v_t1, 'user', c_test, 'viewer');

  perform set_config('request.jwt.claims', c_test_j, true);
  begin
    perform custom.field_declare(v_a, v_t1, jsonb_build_object('label', 'Gate Code', 'key', 'gate_code', 'type', 'text'));
    raise exception 'RED: a viewer declared a column';
  exception when insufficient_privilege then
    v_msg := sqlerrm; get stacked diagnostics v_hint = pg_exception_hint;
  end;
  if v_msg ~* '(admin|viewer|editor|commenter) level' or v_hint ~* '(admin|viewer|editor|commenter) level|an admin of this|< admin' then
    raise exception 'RED: the refusal still uses the ladder''s raw level words: % | %', v_msg, v_hint;
  end if;
  if v_msg not like 'Changing a column needs Full access; you have View access on this table.' or v_hint not like '%View < Comment < Edit < Full access%' or v_hint not like '%someone with Full access%' then
    raise exception 'RED: the refusal does not read in the share screen''s words: % | %', v_msg, v_hint;
  end if;
  raise notice 'GREEN: % | %', v_msg, v_hint;
end
$g$;
rollback;

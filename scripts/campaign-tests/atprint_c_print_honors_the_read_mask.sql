-- AT-REVIEWFIX C1: Print with layout honors the read mask (run inside begin..rollback; fixture orgs, nothing persists).
-- RED before atprint_c (the Viewer printed the Tax ID); GREEN after.
begin;
do $g$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_org uuid;
  v_home uuid; v_t1 uuid; v_f uuid; v_r uuid; v_out jsonb; v_n integer; v_d uuid; v_fid uuid; v_rid uuid; v_body text; v_tpl uuid; v_msg text; v_lvl text; v_vis boolean; v_txt text; v_admin_out text; v_view_out text;
begin
  perform set_config('app.actor_system', 'campaign.atrev1', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  foreach v_org in array array[v_a, v_b] loop
    insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'ATREV1 Fixture', 'atrev-' || substr(v_org::text,1,8), 'ATR', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'ATREV1 fixture');
  end loop;
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_a, 'organization', v_a, c_test, 'member', 'active');
  insert into custom.record (organization_id, table_id, data) values (v_a, null, jsonb_build_object('name','Attack Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t1 := custom.table_declare(v_a, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list','label_singular','Job','label_plural','Jobs',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'),jsonb_build_object('name','stage'))));

  perform custom.field_declare(v_a, v_t1, jsonb_build_object('label','Tax ID','key','ssn','plain','text','sensitivity','confidential'));
  perform set_config('role','postgres', true);
  select f.id into v_fid from custom.record f where f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_t1::text and f.data ->> 'key' = 'ssn';
  perform set_config('role','authenticated', true);
  v_r := custom.record_write(v_a, v_t1, jsonb_build_object('title','Pat','stage','new','ssn','123-45-6789'));
  v_tpl := custom.doc_template_save(v_a, v_t1, 'Slip', 'Name {{field:'||v_fid::text||'}}', null);
  raise notice 'tpl %', v_tpl;
  perform custom.share_grant(v_a, v_t1, 'user', c_test, 'viewer');
  v_admin_out := custom.doc_render_body(v_a, v_tpl, v_r);
  perform set_config('request.jwt.claims', c_test_j, true);
  v_view_out := custom.doc_render_body(v_a, v_tpl, v_r);
  raise notice 'admin render: %  | viewer render: %', v_admin_out, v_view_out;
  if v_admin_out is distinct from 'Name 123-45-6789' then raise exception 'RED: the admin print lost the Tax ID they may see: %', v_admin_out; end if;
  if v_view_out like '%%123-45-6789%%' then raise exception 'RED: a Viewer printed the confidential Tax ID the grid hides: %', v_view_out; end if;
  if v_view_out is distinct from 'Name ' then raise exception 'RED: the viewer print is not "Name ": %', v_view_out; end if;
  perform set_config('role','postgres', true);
  if exists (select 1 from custom.doors_not_masking_fields() d where d.function_name = 'doc_render_body') then
    raise exception 'RED: custom.doors_not_masking_fields() still lists doc_render_body';
  end if;
  raise notice 'GREEN: the viewer prints "Name " (Tax ID withheld), the admin prints the Tax ID, the mask guard no longer lists doc_render_body';
end $g$;
rollback;

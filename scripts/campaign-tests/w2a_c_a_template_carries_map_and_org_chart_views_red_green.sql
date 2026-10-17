-- LANE W2-A 6 - A TEMPLATE SAVED FROM TABLES CARRIES A MAP AND AN ORG CHART VIEW. Seat: admin@admin.com, own fixture org, rolled back.
-- RED before 20261018052000_w2a_c_a_template_carries_map_and_org_chart_views.sql: R1 fails (both views left out with a note).
begin;
set local statement_timeout = '30s';
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_out jsonb; v_map jsonb; v_chart jsonb;
begin
  perform set_config('app.actor_system', 'campaign.w2a.template_views', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'W2-A Template Fixture', 'w2a-tpl-' || substr(v_org::text,1,8), 'WAT', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'W2-A fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','W2T Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','People','slug','people','type','entity','display','list','label_singular','Person','label_plural','People',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'), jsonb_build_object('name','office'), jsonb_build_object('name','manager'))));
  perform custom.view_declare(v_org, v_t, jsonb_build_object('name','Grid','definition',jsonb_build_object('layout','grid')));
  perform custom.view_declare(v_org, v_t, jsonb_build_object('name','Offices','definition',jsonb_build_object('layout','map','map_field','office')));
  perform custom.view_declare(v_org, v_t, jsonb_build_object('name','Who reports to whom','definition',jsonb_build_object('layout','orgchart','parent_field','manager')));
  v_out := custom.template_from_tables(v_org, array[v_t]);
  select v into v_map from jsonb_array_elements(v_out #> '{spec,views}') v where v ->> 'kind' = 'map';
  select v into v_chart from jsonb_array_elements(v_out #> '{spec,views}') v where v ->> 'kind' = 'orgchart';
  if v_map is null or v_chart is null then raise exception 'R1 RED: map % / org chart % left out; notes %', v_map, v_chart, v_out -> 'notes'; end if;
  if v_map ->> 'mapField' is distinct from 'office' then raise exception 'R2 RED: the map view lost its place field: %', v_map; end if;
  if v_chart ->> 'parentField' is distinct from 'manager' then raise exception 'R2 RED: the org chart lost its reports-to field: %', v_chart; end if;
  raise notice 'GREEN R1-R2: the template carries the map (mapField office) and the org chart (parentField manager)';
end
$t$;
rollback;

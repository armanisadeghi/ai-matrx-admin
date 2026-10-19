-- AT-SLOW: a two-table linked base (3 Tasks -> 3 Projects) moves in under 2 s, and the move plan's crossing check reads the moving rows' edges only.
-- Run: python3 scripts/campaign-tests/viewlink_run.py scripts/campaign-tests/atslow_a_base_move_timing.sql   (one transaction, always rolled back)
begin;
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_org uuid;
  v_h3 uuid; v_tk uuid; v_pj uuid; v_ff uuid; v_tr uuid; v_pr uuid; t0 timestamptz; i int;
begin
  perform set_config('app.actor_system', 'campaign.atslow.time', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  foreach v_org in array array[v_a, v_b] loop
    insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SLOW Fixture', 'ats-' || substr(v_org::text,1,8), 'ATS', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SLOW fixture');
  end loop;
  insert into custom.record (organization_id, table_id, data) values (v_b, null, jsonb_build_object('name','Linked Home')) returning id into v_h3;
  perform set_config('role','authenticated', true);
  v_tk := custom.table_declare(v_b, jsonb_build_object('name','LTasks','slug','ltasks','type','entity','display','list','label_singular','Task','label_plural','LTasks',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_h3::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_pj := custom.table_declare(v_b, jsonb_build_object('name','LProjects','slug','lprojects','type','entity','display','list','label_singular','Project','label_plural','LProjects',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_h3::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_ff := custom.field_declare(v_b, v_tk, jsonb_build_object('key','project','label','Project','type','relation','multi',false,'relation_target',v_pj,'relation_max',1,'on_target_delete','restrict'));
  for i in 1..3 loop
    v_tr := custom.record_write(v_b, v_tk, jsonb_build_object('title','t'||i));
    v_pr := custom.record_write(v_b, v_pj, jsonb_build_object('title','p'||i));
    perform platform.relation_set(v_b, v_tr, 'project', jsonb_build_array(v_pr::text));
  end loop;
  perform set_config('atslow.home', v_h3::text, false);
  perform set_config('atslow.to', v_a::text, false);
  t0 := clock_timestamp();
  perform custom.base_move(v_h3, v_a);
  raise notice 'BASE_MOVE ms=%', round(extract(epoch from clock_timestamp()-t0)*1000);
  if clock_timestamp()-t0 > interval '2 s' then raise exception 'TIMING FAILED: base_move took % ms (budget 2000)', round(extract(epoch from clock_timestamp()-t0)*1000); end if;
  if (select count(*) from custom.record where organization_id = v_a and id in (v_h3, v_tk, v_pj, v_ff)) <> 4 then raise exception 'MOVE FAILED: the base is not whole in the destination'; end if;
  if (select count(*) from platform.associations a where a.organization_id = v_a and a.relation_field_id = v_ff and a.deleted_at is null) <> 3 then raise exception 'MOVE FAILED: links did not survive'; end if;
  raise notice 'AT-SLOW base move timing GREEN';
end $t$;
rollback;

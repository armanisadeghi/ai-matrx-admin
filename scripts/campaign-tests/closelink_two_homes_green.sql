-- LANE CLOSE-LINK — CD-LINK-10 (acceptance test 10, "Two Homes, one Table"): "A principal shared on X alone sees X's
-- risks, cannot tell Y's risks exist, and cannot see that a Table called Incident exists, nor its Fields."
-- RED before 20261021236000_closelink_f (custom.table_homes_named is missing), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file>
-- Fixture: a fresh organization made inside the transaction (admin@admin.com its owner). test@test.com ("Dana") is an
-- OUTSIDER shared on Project X alone (a member opens every internal record of her organization: the access ladder).
do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_dana    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_dana_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_hq uuid; v_proj uuid; v_x uuid; v_y uuid; v_risk uuid; v_inc uuid; v_r1 uuid; v_r2 uuid; v_i1 uuid;
  v_rows jsonb; v_ids uuid[]; v_sees boolean; v_msg text;
begin
  perform set_config('app.actor_system', 'campaign-test/closelink_two_homes', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Saltmarsh Civil Engineering', 'saltmarsh-civil-' || substr(v_org::text, 1, 8), 'SCE', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values
    (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values
    ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'closelink_two_homes');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, '{"name":"Saltmarsh HQ"}'::jsonb) returning id into v_hq;

  perform set_config('role', 'authenticated', true);
  v_proj := custom.table_declare(v_org, jsonb_build_object('name','Projects','slug','cl2_projects','type','entity','label_singular','Project','label_plural','Projects','title_field','name','display','page','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',30,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_hq::text));
  v_x := custom.record_write(v_org, v_proj, jsonb_build_object('name','Seawall repair','parent_id', v_hq::text));
  v_y := custom.record_write(v_org, v_proj, jsonb_build_object('name','Pier 9 rebuild','parent_id', v_hq::text));
  -- Risk declared ONCE, living in both projects
  v_risk := custom.table_declare(v_org, jsonb_build_object('name','Risks','slug','cl2_risks','type','entity','label_singular','Risk','label_plural','Risks','title_field','title','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',30,'fields',jsonb_build_array(jsonb_build_object('name','title')),'parent_id',v_hq::text));
  perform custom.home_add(v_org, v_risk, v_x);
  perform custom.home_add(v_org, v_risk, v_y);
  -- Incident lives in Y alone
  v_inc := custom.table_declare(v_org, jsonb_build_object('name','Incident','slug','cl2_incident','type','entity','label_singular','Incident','label_plural','Incidents','title_field','title','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',30,'fields',jsonb_build_array(jsonb_build_object('name','title')),'parent_id',v_y::text));
  v_r1 := custom.record_write(v_org, v_risk, jsonb_build_object('title','Storm surge overtops the wall','parent_id', v_x::text));
  v_r2 := custom.record_write(v_org, v_risk, jsonb_build_object('title','Pile driver noise permit','parent_id', v_y::text));
  v_i1 := custom.record_write(v_org, v_inc,  jsonb_build_object('title','Crane swing near-miss','parent_id', v_y::text));

  -- the admin reads the table at both homes
  if not exists (select 1 from custom.query_table_homes(v_org, v_risk) h where h = v_x)
     or not exists (select 1 from custom.query_table_homes(v_org, v_risk) h where h = v_y) then
    raise exception '0: Risks does not live in both projects';
  end if;

  -- the admin reads where Risks lives, named (custom.table_homes_named, Table settings "Lives in")
  if (select string_agg(h.name, ' | ' order by h.declared desc, h.name) from custom.table_homes_named(v_org, v_risk) h)
     is distinct from 'Saltmarsh HQ | Pier 9 rebuild | Seawall repair' then
    raise exception '0b: Lives in reads %', (select string_agg(h.name, ' | ' order by h.declared desc, h.name) from custom.table_homes_named(v_org, v_risk) h);
  end if;

  -- share Project X alone with Dana
  perform custom.share_grant(v_org, v_x, 'user', c_dana, 'viewer'::public.permission_level);

  perform set_config('request.jwt.claims', c_dana_j, true);
  if custom.query_can_see(v_org, v_r1, 'viewer') is not true then raise exception '1: Dana does not see X''s risk'; end if;
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_r2, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '2: Dana can see Y''s risk'; end if;
  if custom.query_can_see(v_org, v_risk, 'viewer') is not true then raise exception '3: Dana cannot see that the Risks table exists'; end if;
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_inc, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '4: Dana can tell that the Incident table exists'; end if;
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_i1, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '5: Dana can see an incident'; end if;
  -- "All risks" across every home, as Dana: only X's
  v_rows := custom.read_records_page(v_org, v_risk);
  select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_ids from jsonb_array_elements(coalesce(v_rows -> 'rows', '[]'::jsonb)) r;
  if not (v_r1 = any (v_ids)) or v_r2 = any (v_ids) then raise exception '6: All risks as Dana holds %', v_ids; end if;
  -- the Incident table's fields are not hers to read
  v_msg := null;
  begin perform custom.applicable_fields(v_org, v_inc, null); exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '7: Dana read the Incident table''s fields'; end if;
  raise notice 'PASS all: Dana sees X''s risk (%), not Y''s, Risks yes, Incident no (%)', array_length(v_ids, 1), left(v_msg, 90);
end
$t$;

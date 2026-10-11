-- Proof: an org owner appoints an HR holder over employments created by someone else.
-- Runs inside one DO block and always ends in a RAISE, so everything rolls back (well under 10 s).
-- Org: admin's Workspace (884d1ce8...). Owner: admin@admin.com (87a6e699...). "Someone else": 20149d3f...
do $proof$
declare
  v_org uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f'; v_owner uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_other uuid := '20149d3f-6572-4263-b43c-7e52f0e42058'; v_emp uuid; v_res jsonb; v_err text;
  v_before int; v_after int; v_dg int; v_out text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  select id into v_emp from hr.employment where organization_id = v_org and deleted_at is null order by created_at limit 1;
  perform hr.arm_write();
  update hr.employment set created_by = v_other where organization_id = v_org;
  select count(*) into v_before from iam.permissions p where p.resource_type='hr_employment'
     and p.resource_id in (select id from hr.employment where organization_id = v_org) and p.status='active';
  begin
    v_res := public.hr_role_assign(v_emp, 'hr_admin', 'org', null, '{}'::uuid[], current_date, null, 'proof');
    v_err := 'OK ' || v_res::text;
  exception when others then v_err := 'ERR ' || sqlerrm; end;
  select count(*) into v_after from iam.permissions p where p.resource_type='hr_employment'
     and p.resource_id in (select id from hr.employment where organization_id = v_org) and p.status='active';
  select count(*) into v_dg from hr.derived_grant where organization_id = v_org and resource_type='hr_employment';
  raise exception 'PROOF perms_before=% perms_after=% derived_grant_rows=% result=%', v_before, v_after, v_dg, v_err;
end $proof$;

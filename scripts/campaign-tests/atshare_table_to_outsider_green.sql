-- AT-SHARE / row 1 — A WHOLE TABLE IS SHARED WITH SOMEONE OUTSIDE THE ORGANIZATION, THROUGH custom.share_grant.
-- Seats: admin@admin.com (owner) and test@test.com (NOT a member of the organization built here).
-- RED: run alone against the old body (share_grant refuses a Table for a non-member).
-- GREEN: run after migrations/campaign/atshare_a_a_whole_table_can_be_shared_outside_the_organization.sql.
-- Plain SQL, no psql meta commands: run with scripts/campaign-tests/viewlink_run.py (one transaction, always rolled back).
do $green$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_mara    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_mara_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_jobs uuid; v_inv uuid;
  v_out jsonb; v_rows integer; v_msg text; v_level text;
begin
  perform set_config('app.actor_system', 'campaign.atshare.green', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'AT-SHARE Fixture Plumbing', 'at-share-fixture-' || substr(v_org::text,1,8), 'ATS', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATS Home')) returning id into v_home;
  if exists (select 1 from iam.organization_member m where m.organization_id = v_org and m.user_id = c_mara) then
    raise exception 'SETUP FAILED: the outsider is a member';
  end if;
  perform set_config('role','authenticated', true);
  v_jobs := custom.table_declare(v_org, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list',
    'label_singular','Job','label_plural','Jobs','ordered',false,'weight','light','retention_days',365,'row_order','sorted',
    'agent_writable',true,'parent_id',v_home::text,'title_field','work_order','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','work_order'),jsonb_build_object('name','stage'))));
  v_inv := custom.table_declare(v_org, jsonb_build_object('name','Invoices','slug','invoices','type','entity','display','list',
    'label_singular','Invoice','label_plural','Invoices','ordered',false,'weight','light','retention_days',365,'row_order','sorted',
    'agent_writable',true,'parent_id',v_home::text,'title_field','invoice_number','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','invoice_number'))));
  perform custom.record_write(v_org, v_jobs, jsonb_build_object('work_order','ATS-1','stage','Scheduled'));
  perform custom.record_write(v_org, v_jobs, jsonb_build_object('work_order','ATS-2','stage','Done'));
  perform custom.record_write(v_org, v_inv, jsonb_build_object('invoice_number','ATS-INV-1'));

  -- CLAUSE 1 — the office shares the whole Jobs table with a person who is not in the organization.
  v_out := custom.share_grant(v_org, v_jobs, 'person', c_mara, 'viewer'::public.permission_level);
  if not coalesce((v_out->>'shared')::boolean,false) or v_out->>'subject' <> 'table' then
    raise exception 'CLAUSE 1 FAILED: %', v_out;
  end if;
  raise notice 'CLAUSE 1 OK: %', v_out->>'message';

  -- CLAUSE 2 — the outsider opens that table at the shared level and reads its rows.
  perform set_config('request.jwt.claims', c_mara_j, true);
  select count(*) into v_rows from custom.read_records(v_org, v_jobs, false, 50, 0);
  if v_rows <> 2 then raise exception 'CLAUSE 2 FAILED: outsider read % rows, expected 2', v_rows; end if;
  v_level := custom.my_level(v_org, v_jobs, 'table')::text;
  if v_level is distinct from 'viewer' then raise exception 'CLAUSE 2 FAILED: level is %', v_level; end if;
  raise notice 'CLAUSE 2 OK: the outsider reads % rows at %', v_rows, v_level;

  -- CLAUSE 3 — nothing else: the other table refuses her and the table list holds only the shared one.
  begin
    perform count(*) from custom.read_records(v_org, v_inv, false, 5, 0);
    raise exception 'CLAUSE 3 FAILED: the outsider read Invoices';
  exception when insufficient_privilege then
    get stacked diagnostics v_msg = message_text;
    raise notice 'CLAUSE 3 OK (Invoices refused): %', v_msg;
  end;
  select count(*) into v_rows from custom.read_records(v_org, custom.table_kernel_id(), false, 500, 0);
  if v_rows <> 1 then raise exception 'CLAUSE 3 FAILED: outsider sees % tables', v_rows; end if;
  select count(*) into v_rows from iam.organization_member m where m.organization_id = v_org;
  if v_rows <> 0 then raise exception 'CLAUSE 3 FAILED: outsider sees % members', v_rows; end if;
  raise notice 'CLAUSE 3 OK: one table, no members visible';

  -- CLAUSE 4 — the ladder still caps the level: a viewer cannot hand out Edit.
  begin
    perform custom.share_grant(v_org, v_jobs, 'person', c_admin, 'editor'::public.permission_level);
    raise exception 'CLAUSE 4 FAILED: a viewer shared a table';
  exception when insufficient_privilege then
    raise notice 'CLAUSE 4 OK: a viewer cannot share';
  end;

  -- CLAUSE 5 — the office raises her to Edit, and she reads at Edit.
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_out := custom.share_grant(v_org, v_jobs, 'person', c_mara, 'editor'::public.permission_level);
  perform set_config('request.jwt.claims', c_mara_j, true);
  v_level := custom.my_level(v_org, v_jobs, 'table')::text;
  if v_level is distinct from 'editor' then raise exception 'CLAUSE 5 FAILED: level % not editor', v_level; end if;
  raise notice 'CLAUSE 5 OK: %', v_out->>'message';

  raise notice 'AT-SHARE row 1 GREEN';
end;
$green$;

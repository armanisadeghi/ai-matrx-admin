-- LANE CLOSE-LINK — CD-LINK-11 (acceptance test 15): "A relation from organization 1 to a record in organization 2
-- is refused unless the Table allows it." Refused first; allowed once the table allows other organizations (and both
-- organizations have "Links to other organizations" on - one organization's switch is not consent from the other).
-- RED before 20261021235000_closelink_e (the refusal says "points at something that is not there"), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: two fresh organizations, admin@admin.com the owner of both, made inside the transaction. Nothing is left behind.
do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_o1 uuid := gen_random_uuid();
  v_o2 uuid := gen_random_uuid();
  v_h1 uuid; v_h2 uuid; v_clinics uuid; v_labs uuid; v_lab uuid; v_visit uuid; v_msg text; v_got jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/closelink_cross_org', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values
    (v_o1, 'Bayside Family Clinic', 'bayside-family-clinic-' || substr(v_o1::text, 1, 8), 'BFC', c_admin),
    (v_o2, 'Harborview Reference Lab', 'harborview-reference-lab-' || substr(v_o2::text, 1, 8), 'HRL', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values
    (v_o1, 'organization', v_o1, c_admin, 'owner', 'active'),
    (v_o2, 'organization', v_o2, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values
    ('custom', 'system_enabled', 'organization', v_o1, v_o1, 'true'::jsonb, 'closelink_cross_org'),
    ('custom', 'system_enabled', 'organization', v_o2, v_o2, 'true'::jsonb, 'closelink_cross_org');
  insert into custom.record (organization_id, table_id, data) values (v_o1, null, '{"name":"Bayside HQ"}'::jsonb) returning id into v_h1;
  insert into custom.record (organization_id, table_id, data) values (v_o2, null, '{"name":"Harborview HQ"}'::jsonb) returning id into v_h2;

  perform set_config('role', 'authenticated', true);
  v_labs := custom.table_declare(v_o2, jsonb_build_object('name','Lab results','slug','cl_lab_results','type','entity','label_singular','Lab result','label_plural','Lab results','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_h2::text));
  v_lab := custom.record_write(v_o2, v_labs, '{"name":"Lipid panel, Patient 7"}'::jsonb);
  v_clinics := custom.table_declare(v_o1, jsonb_build_object('name','Visits','slug','cl_visits','type','entity','label_singular','Visit','label_plural','Visits','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_h1::text));
  -- a column may name only this organization's tables, so a link that reaches out is declared to point at any record
  perform custom.field_declare(v_o1, v_clinics, jsonb_build_object('key','lab','label','Lab result','type','relation','relation_target',v_clinics,'sort',20,
            'config', jsonb_build_object('target_mode','any')));
  v_visit := custom.record_write(v_o1, v_clinics, '{"name":"March 3 check-up"}'::jsonb);

  -- 1. the table does not allow other organizations: refused, and the refusal names what is missing
  v_msg := null;
  begin perform custom.record_update(v_o1, v_visit, jsonb_build_object('lab', v_lab), null);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '1: a link into another organization was accepted with nothing allowing it'; end if;
  if v_msg not like '%another organization%this table does not allow%' then raise exception '1: the refusal does not say why: %', v_msg; end if;
  raise notice '1 PASS refused: %', left(v_msg, 160);

  -- 2. both organizations turn "Links to other organizations" on, the table still does not allow it: refused
  perform set_config('role', 'postgres', true);
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values
    ('custom', 'cross_organization_links', 'organization', v_o1, v_o1, 'true'::jsonb, 'closelink_cross_org'),
    ('custom', 'cross_organization_links', 'organization', v_o2, v_o2, 'true'::jsonb, 'closelink_cross_org');
  perform set_config('role', 'authenticated', true);
  v_msg := null;
  begin perform custom.record_update(v_o1, v_visit, jsonb_build_object('lab', v_lab), null);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '2: accepted although the table does not allow other organizations'; end if;
  raise notice '2 PASS refused while the table says no: %', left(v_msg, 120);

  -- 3. the table's "Allow other organizations" switch, written the way Table settings write it (record_update on the Table record)
  perform custom.record_update(v_o1, v_clinics, '{"cross_organization_relations":true}'::jsonb, null);
  perform custom.record_update(v_o1, v_visit, jsonb_build_object('lab', v_lab), null);
  perform set_config('role', 'postgres', true);
  select r.data -> 'lab' into v_got from custom.record r where r.organization_id = v_o1 and r.id = v_visit;
  if v_got is distinct from to_jsonb(v_lab::text) then raise exception '3: the link did not save (lab = %)', v_got; end if;
  raise notice '3 PASS allowed after the switch';

  -- 4. one organization's consent is not the other's: the lab turns it off and a new link is refused again
  update platform.knob_override set value = 'false'::jsonb where organization_id = v_o2 and key = 'cross_organization_links';
  perform set_config('role', 'authenticated', true);
  perform custom.record_update(v_o1, v_visit, '{"lab":null}'::jsonb, null);
  v_msg := null;
  begin perform custom.record_update(v_o1, v_visit, jsonb_build_object('lab', v_lab), null);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '4: accepted although the other organization turned links off'; end if;
  if v_msg not like '%that organization has not turned on links to other organizations%' then raise exception '4: the refusal does not name the other organization''s switch: %', v_msg; end if;
  raise notice '4 PASS refused once the other organization says no';
  raise notice 'PASS all';
end
$t$;

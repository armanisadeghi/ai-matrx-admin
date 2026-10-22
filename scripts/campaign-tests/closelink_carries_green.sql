-- LANE CLOSE-LINK — CD-LINK-08 (acceptance test 2, "Note on three records") and CD-LINK-09 (acceptance test 11, "Loop").
-- "Dana is a viewer on A only: she sees the note and cannot edit it. Unshare A: she loses it. Share C: she sees it again."
-- "Share A with Dana as editor: Dana is a viewer of B (level stepped down), Visibility terminates."
-- RED before 20261021234000_closelink_d (field_update has no "carries" setting), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: a fresh organization made inside the transaction (admin@admin.com its owner). test@test.com ("Dana") is
-- NOT a member of it - an outsider, so she reaches only what is shared with her (the access ladder: a member opens
-- every internal record of her organization, so carrying is a question about people shared in, never members).
-- Nothing is left behind.
do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_dana    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_dana_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_home uuid; v_proj uuid; v_ppl uuid; v_cls uuid; v_notes uuid; v_part uuid; v_all uuid;
  v_p uuid; v_pe uuid; v_c uuid; v_n uuid; v_rel uuid; v_a uuid; v_b uuid; v_loop uuid; v_al uuid;
  v_msg text; v_page jsonb; v_sum jsonb;
  v_sees boolean;
  v_hc uuid;
begin
  perform set_config('app.actor_system', 'campaign-test/closelink_carries', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Juniper Ridge Community College — Facilities', 'juniper-ridge-facilities-' || substr(v_org::text, 1, 8), 'JRF', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values
    (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values
    ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'closelink_carries');
  insert into custom.record (organization_id, table_id, data)
  values (v_org, null, jsonb_build_object('name', 'Juniper Ridge Facilities — Main Office')) returning id into v_home;

  perform set_config('role', 'authenticated', true);
  -- the four tables of acceptance test 2
  v_proj := custom.table_declare(v_org, jsonb_build_object('name','Projects','slug','cl_projects','type','entity','label_singular','Project','label_plural','Projects','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_home::text));
  v_ppl  := custom.table_declare(v_org, jsonb_build_object('name','People','slug','cl_people','type','entity','label_singular','Person','label_plural','People','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_home::text));
  v_cls  := custom.table_declare(v_org, jsonb_build_object('name','Classes','slug','cl_classes','type','entity','label_singular','Class','label_plural','Classes','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_home::text));
  v_notes := custom.table_declare(v_org, jsonb_build_object('name','Notes','slug','cl_notes','type','entity','label_singular','Note','label_plural','Notes','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_home::text));
  v_rel := custom.field_declare(v_org, v_notes, jsonb_build_object('key','related','label','Related to','type','relation','relation_target',v_proj,'multi',true,'sort',20,
             'config', jsonb_build_object('target_mode','several','target_tables', jsonb_build_array(v_proj, v_ppl, v_cls))));
  v_p  := custom.record_write(v_org, v_proj, '{"name":"Library roof replacement"}'::jsonb);
  v_pe := custom.record_write(v_org, v_ppl,  '{"name":"Rosa Delgado"}'::jsonb);
  v_c  := custom.record_write(v_org, v_cls,  '{"name":"Building Science 101"}'::jsonb);
  v_n  := custom.record_write(v_org, v_notes, jsonb_build_object('name','Contractor walk-through notes','related', jsonb_build_array(v_p, v_pe, v_c)));

  -- 1. the link column carries access, viewer at most
  perform custom.field_update(v_org, v_rel, '{"carries":true}'::jsonb);
  perform custom.share_grant(v_org, v_p, 'user', c_dana, 'viewer'::public.permission_level);

  perform set_config('request.jwt.claims', c_dana_j, true);
  if custom.query_can_see(v_org, v_p, 'viewer') is not true then raise exception '1: Dana does not see the Project shared with her'; end if;
  if custom.query_can_see(v_org, v_n, 'viewer') is not true then raise exception '1: Dana, a viewer of the Project, does not see the note related to it'; end if;
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_n, 'editor'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '1: Dana can EDIT the note through a viewer share'; end if;
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_c, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '1: Dana sees the Class, which nobody shared with her'; end if;
  v_msg := null;
  begin perform custom.record_update(v_org, v_n, '{"name":"Edited by Dana"}'::jsonb, null); exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '1: Dana edited the note'; end if;
  raise notice '1 PASS: Dana sees the note through the Project and cannot edit it (%)', left(v_msg, 80);

  -- 2. unshare the Project: she loses it
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.share_revoke(v_org, v_p, 'user', c_dana);
  perform set_config('request.jwt.claims', c_dana_j, true);
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_n, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '2: Dana still sees the note after the Project was unshared'; end if;
  raise notice '2 PASS: unshared, she loses it';

  -- 3. share the Class: she sees it again
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.share_grant(v_org, v_c, 'user', c_dana, 'viewer'::public.permission_level);
  perform set_config('request.jwt.claims', c_dana_j, true);
  if custom.query_can_see(v_org, v_n, 'viewer') is not true then raise exception '3: Dana, a viewer of the Class, does not see the note'; end if;
  raise notice '3 PASS: Class shared, she sees it again';

  -- 4. unlink the Class from the note: the share no longer reaches it
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.record_update(v_org, v_n, jsonb_build_object('related', jsonb_build_array(v_p, v_pe)), null);
  perform set_config('request.jwt.claims', c_dana_j, true);
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_n, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '4: an unlinked Class still carries the note to Dana'; end if;
  raise notice '4 PASS: unlinked, the Class carries nothing';

  -- 5. carrying off: sharing a linked record conveys nothing
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.share_grant(v_org, v_pe, 'user', c_dana, 'viewer'::public.permission_level);
  perform custom.field_update(v_org, v_rel, '{"carries":false}'::jsonb);
  perform set_config('request.jwt.claims', c_dana_j, true);
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_n, 'viewer'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '5: carrying is off, yet the Person share reaches the note'; end if;
  raise notice '5 PASS: carrying off conveys nothing';

  -- 6. carries_max editor: an editor share on the Person makes Dana an editor of the note
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.field_update(v_org, v_rel, '{"carries":true,"carries_max":"editor"}'::jsonb);
  perform custom.share_grant(v_org, v_pe, 'user', c_dana, 'editor'::public.permission_level);
  perform set_config('request.jwt.claims', c_dana_j, true);
  if custom.query_can_see(v_org, v_n, 'editor') is not true then raise exception '6: carries up to editor, yet Dana (editor of the Person) cannot edit the note'; end if;
  raise notice '6 PASS: carried up to editor';

  -- ── CD-LINK-09: A LOOP (acceptance test 11) ──────────────────────────────────────────────
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_part := custom.table_declare(v_org, jsonb_build_object('name','Partners','slug','cl_partners','type','entity','label_singular','Partner','label_plural','Partners','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_home::text));
  v_hc := custom.field_declare(v_org, v_part, '{"key":"headcount","label":"Headcount","type":"number","sort":20}'::jsonb);
  v_loop := custom.field_declare(v_org, v_part, jsonb_build_object('key','partner','label','Partner','type','relation','relation_target',v_part,'multi',true,'sort',30));
  -- 7. two partners cannot point at each other until loops are allowed
  v_a := custom.record_write(v_org, v_part, '{"name":"Northwind Builders","headcount":40}'::jsonb);
  v_b := custom.record_write(v_org, v_part, jsonb_build_object('name','Cedar Line Electric','headcount',12,'partner',jsonb_build_array(v_a)));
  v_msg := null;
  begin perform custom.record_update(v_org, v_a, jsonb_build_object('partner', jsonb_build_array(v_b)), null); exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '7: a loop was accepted on a column that does not allow loops'; end if;
  perform custom.field_update(v_org, v_loop, '{"loops":true,"carries":true}'::jsonb);
  perform custom.record_update(v_org, v_a, jsonb_build_object('partner', jsonb_build_array(v_b)), null);
  raise notice '7 PASS: refused until loops are on (%), then A and B point at each other', left(v_msg, 80);

  -- 8. share A at editor: Dana is an editor of A and a VIEWER of B (stepped down); the walk terminates
  perform custom.share_grant(v_org, v_a, 'user', c_dana, 'editor'::public.permission_level);
  perform set_config('request.jwt.claims', c_dana_j, true);
  if custom.query_can_see(v_org, v_a, 'editor') is not true then raise exception '8: Dana is not an editor of A'; end if;
  if custom.query_can_see(v_org, v_b, 'viewer') is not true then raise exception '8: Dana does not see B through the loop'; end if;
  v_sees := false; begin v_sees := custom.query_can_see(v_org, v_b, 'editor'); exception when insufficient_privilege then v_sees := false; end;
  if v_sees then raise exception '8: Dana is an EDITOR of B - the level did not step down'; end if;
  raise notice '8 PASS: viewer of B, the level stepped down, the walk terminated';

  -- 9. a roll-up over the loop counts each partner once (A listed twice on an alliance still adds 40 once)
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_all := custom.table_declare(v_org, jsonb_build_object('name','Alliances','slug','cl_alliances','type','entity','label_singular','Alliance','label_plural','Alliances','title_field','name','display','list','weight','light','ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,'fields',jsonb_build_array(jsonb_build_object('name','name')),'parent_id',v_home::text));
  perform custom.field_declare(v_org, v_all, jsonb_build_object('key','members','label','Members','type','relation','relation_target',v_part,'multi',true,'sort',20));
  perform custom.field_declare(v_org, v_all, '{"key":"total_headcount","label":"Total headcount","type":"rollup","via":"members","agg":"sum","of":"headcount","sort":30}'::jsonb);
  v_al := custom.record_write(v_org, v_all, jsonb_build_object('name','Library roof crew','members', jsonb_build_array(v_a, v_b, v_a)));
  v_page := custom.read_records_page(v_org, v_all);
  select r -> 'document' -> 'total_headcount' into v_sum from jsonb_array_elements(v_page -> 'rows') r where (r ->> 'id')::uuid = v_al;
  if v_sum is distinct from '52'::jsonb then raise exception '9: the roll-up over A, B, A answered %, not 52 (each counted once)', v_sum; end if;
  raise notice '9 PASS: roll-up %, each partner counted once', v_sum;

  -- 10. a column that is not a link is refused by name
  v_msg := null;
  begin perform custom.field_update(v_org, v_hc, '{"carries":true}'::jsonb);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%Headcount%' then raise exception '10: a number column said %', coalesce(v_msg, 'nothing'); end if;
  raise notice 'PASS all';
end
$t$;

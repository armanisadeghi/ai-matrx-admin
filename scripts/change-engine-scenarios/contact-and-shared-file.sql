select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
select set_config('chg_test.out', '{}', true);
do $t$
declare v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_party uuid; v_addr uuid; v_b1 uuid; v_b2 uuid; v_file uuid;
begin
  insert into crm.party (organization_id, party_kind, display_name, created_by) values (v_org, 'person', 'Marisol Okafor', v_me) returning id into v_party;
  insert into crm.address (party_id, organization_id, created_by) values (v_party, v_org, v_me) returning id into v_addr;
  insert into web.brand (organization_id, name, created_by) values (v_org, 'Hollow Pine Outfitters', v_me) returning id into v_b1;
  insert into web.brand (organization_id, name, created_by) values (v_org, 'Hollow Pine Outfitters Outlet', v_me) returning id into v_b2;
  insert into files.files (created_by, file_path, file_name, organization_id, storage_uri, mime_type)
    values (v_me, 'test/hollow-pine-logo.png', 'hollow-pine-logo.png', v_org, 's3://test/hollow-pine-logo.png', 'image/png') returning id into v_file;
  insert into web.brand_asset (organization_id, brand_id, kind, file_id, title, created_by) values (v_org, v_b1, 'logo', v_file, 'Logo', v_me), (v_org, v_b2, 'logo', v_file, 'Logo', v_me);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('ids', jsonb_build_object('party', v_party, 'addr', v_addr, 'b1', v_b1, 'file', v_file)))::text, true);
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := (current_setting('chg_test.out')::jsonb -> 'ids'); v_p jsonb; v_c jsonb; v_party uuid := (v_ids->>'party')::uuid; v_tgt uuid := '2643e470-b275-47f3-95f3-ae275ad3ca47';
begin
  -- CRM contact: delete, restore, move
  v_p := platform.change_records('delete', 'party', array[v_party]);
  v_c := platform.change_records('delete', 'party', array[v_party], null, null, '{}'::jsonb, false, v_p->>'fingerprint');
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('party_delete', jsonb_build_object('commit', v_c, 'addr_deleted', (select deleted_at is not null from crm.address where id=(v_ids->>'addr')::uuid))))::text, true);
  v_c := platform.change_records('restore', 'party', array[v_party], null, null, '{}'::jsonb, false);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('party_restore', jsonb_build_object('commit', v_c, 'party_live', (select deleted_at is null from crm.party where id=v_party), 'addr_live', (select deleted_at is null from crm.address where id=(v_ids->>'addr')::uuid))))::text, true);
  v_p := platform.change_records('move', 'party', array[v_party], v_tgt);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('party_move_preview', jsonb_build_object('q', v_p->'questions', 'w', (select jsonb_agg(w->'kind') from jsonb_array_elements(v_p->'warnings') w), 'groups', (select jsonb_agg(g->'type') from jsonb_array_elements(v_p->'groups') g))))::text, true);
  v_c := platform.change_records('move', 'party', array[v_party], v_tgt, null, '{}'::jsonb, false, v_p->>'fingerprint');
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('party_move', jsonb_build_object('commit', v_c - 'organization', 'party_org', (select organization_id from crm.party where id=v_party), 'addr_org', (select organization_id from crm.address where id=(v_ids->>'addr')::uuid))))::text, true);
  -- brand whose logo another brand also uses: the logo survives the delete
  v_p := platform.change_records('delete', 'web_brand', array[(v_ids->>'b1')::uuid]);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('shared_delete_preview', (select jsonb_agg(w - 'items') from jsonb_array_elements(v_p->'warnings') w)))::text, true);
  v_c := platform.change_records('delete', 'web_brand', array[(v_ids->>'b1')::uuid], null, null, '{}'::jsonb, false, v_p->>'fingerprint');
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('shared_delete', jsonb_build_object('commit', v_c, 'file_live', (select deleted_at is null from files.files where id=(v_ids->>'file')::uuid))))::text, true);
  v_c := platform.change_records('restore', 'web_brand', array[(v_ids->>'b1')::uuid], null, (v_c->>'plan_id')::uuid, '{}'::jsonb, false);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('shared_restore', jsonb_build_object('commit', v_c, 'brand_live', (select deleted_at is null from web.brand where id=(v_ids->>'b1')::uuid),
     'assets_live', (select count(*) from web.brand_asset where brand_id=(v_ids->>'b1')::uuid and deleted_at is null))))::text, true);
end $t$;
select key k, value v from jsonb_each(current_setting('chg_test.out')::jsonb) where key <> 'ids';

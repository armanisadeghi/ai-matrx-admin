-- Undo move (plan § 8.6): a note's scope link and home come back; a brand's part added after the move follows back.
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
select set_config('chg_test.out', '{}', true);
do $t$
declare v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd'; v_note uuid; v_edge uuid; v_brand uuid;
begin
  insert into workbench.notes (organization_id, home_scope_id, label, content, created_by)
  values (v_org, '2645730c-97a9-4080-9471-2546d0ce2b66', 'Expert witness notes', 'Call Dr. Park on Tuesday.', v_me) returning id into v_note;
  insert into platform.associations (source_type, source_id, target_type, target_id, organization_id, created_by)
  values ('note', v_note, 'scope', '2f658029-7960-4fd5-a451-1e47c40a4746', v_org, v_me) returning id into v_edge;
  insert into web.brand (organization_id, name, created_by) values (v_org, 'Quarry Hill Ceramics', v_me) returning id into v_brand;
  insert into web.brand_persona (brand_id, name, organization_id, created_by) values (v_brand, 'Gift shopper', v_org, v_me);
  perform set_config('chg_test.out', jsonb_build_object('ids', jsonb_build_object('note', v_note, 'edge', v_edge, 'brand', v_brand))::text, true);
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := current_setting('chg_test.out')::jsonb -> 'ids'; v_tgt uuid := '2643e470-b275-47f3-95f3-ae275ad3ca47';
  v_note uuid := (v_ids->>'note')::uuid; v_b uuid := (v_ids->>'brand')::uuid;
  v_p jsonb; v_c jsonb; v_u jsonb; v_up jsonb; v_bp jsonb; v_bc jsonb; v_bu jsonb; v_again jsonb;
begin
  v_p := platform.change_records('move', 'note', array[v_note], v_tgt);
  v_c := platform.change_records('move', 'note', array[v_note], v_tgt, null, '{"scope_link:assoc:scope":"cut"}'::jsonb, false, v_p->>'fingerprint');
  v_up := platform.change_records('undo', null, '{}', null, (v_c->>'plan_id')::uuid);
  v_u := platform.change_records('undo', null, '{}', null, (v_c->>'plan_id')::uuid, '{}'::jsonb, false, v_up->>'fingerprint');
  begin
    v_again := platform.change_records('undo', null, '{}', null, (v_c->>'plan_id')::uuid, '{}'::jsonb, false, v_up->>'fingerprint');
  exception when others then v_again := to_jsonb(sqlerrm); end;
  v_bp := platform.change_records('move', 'web_brand', array[v_b], v_tgt);
  v_bc := platform.change_records('move', 'web_brand', array[v_b], v_tgt, null, '{}'::jsonb, false, v_bp->>'fingerprint');
  -- a part added in the target after the move
  insert into web.brand_persona (brand_id, name, organization_id, created_by) values (v_b, 'Wedding registry', v_tgt, auth.uid());
  v_up := platform.change_records('undo', null, '{}', null, (v_bc->>'plan_id')::uuid);
  v_bu := platform.change_records('undo', null, '{}', null, (v_bc->>'plan_id')::uuid, '{}'::jsonb, false, v_up->>'fingerprint');
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object(
    'note_undo', v_u - 'organization', 'undo_twice', v_again,
    'note_after', (select jsonb_build_object('org', organization_id, 'home', home_scope_id) from workbench.notes where id = v_note),
    'edge_live', (select deleted_at is null from platform.associations where id = (v_ids->>'edge')::uuid),
    'brand_undo', v_bu - 'organization',
    'brand_after', jsonb_build_object('brand', (select organization_id from web.brand where id = v_b),
       'personas_in_source', (select count(*) from web.brand_persona p where p.brand_id = v_b and p.organization_id = '7cd12da2-2213-4378-8fba-a9e2dc4ea657'))
  ))::text, true);
end $t$;
select key k, value v from jsonb_each(current_setting('chg_test.out')::jsonb) where key <> 'ids';

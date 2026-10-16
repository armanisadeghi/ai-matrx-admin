-- Copy (plan § 7): a note into another organization, a contact with its address in its own (Duplicate).
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
select set_config('chg_test.out', '{}', true);
do $t$
declare v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd'; v_note uuid; v_party uuid; v_addr uuid; v_brand uuid;
begin
  insert into workbench.notes (organization_id, home_scope_id, label, content, created_by)
  values (v_org, '2645730c-97a9-4080-9471-2546d0ce2b66', 'Mediation checklist', 'Bring the settlement range.', v_me) returning id into v_note;
  insert into crm.party (organization_id, party_kind, display_name, created_by) values (v_org, 'person', 'Teodora Vance', v_me) returning id into v_party;
  insert into crm.address (party_id, organization_id, created_by) values (v_party, v_org, v_me) returning id into v_addr;
  insert into web.brand (organization_id, name, created_by) values (v_org, 'Vance Mediation Group', v_me) returning id into v_brand;
  perform set_config('chg_test.out', jsonb_build_object('ids', jsonb_build_object('note', v_note, 'party', v_party, 'addr', v_addr, 'brand', v_brand))::text, true);
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := current_setting('chg_test.out')::jsonb -> 'ids'; v_tgt uuid := '2643e470-b275-47f3-95f3-ae275ad3ca47';
  v_p jsonb; v_c jsonb; v_p2 jsonb; v_c2 jsonb; v_copy uuid; v_pcopy uuid; v_brand_p jsonb;
begin
  v_p := platform.change_records('copy', 'note', array[(v_ids->>'note')::uuid], v_tgt);
  v_c := platform.change_records('copy', 'note', array[(v_ids->>'note')::uuid], v_tgt, null, '{}'::jsonb, false, v_p->>'fingerprint');
  v_copy := (v_c->'copies'->0->>'id')::uuid;
  v_p2 := platform.change_records('copy', 'party', array[(v_ids->>'party')::uuid]);
  v_c2 := platform.change_records('copy', 'party', array[(v_ids->>'party')::uuid], null, null, '{}'::jsonb, false, v_p2->>'fingerprint');
  v_pcopy := (v_c2->'copies'->0->>'id')::uuid;
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object(
    'note_copy', (select jsonb_build_object('org', n.organization_id, 'label', n.label, 'content', n.content, 'home', n.home_scope_id) from workbench.notes n where n.id = v_copy),
    'note_original_org', (select organization_id from workbench.notes where id = (v_ids->>'note')::uuid),
    'party_copy', jsonb_build_object('rows', v_c2->'rows', 'name', (select display_name from crm.party where id = v_pcopy),
       'addresses', (select count(*) from crm.address a where a.party_id = v_pcopy),
       'original_addresses', (select count(*) from crm.address a where a.party_id = (v_ids->>'party')::uuid)),
    'not_copyable', (select w->>'kind' from jsonb_array_elements(platform.change_records('copy', 'web_brand', array[(v_ids->>'brand')::uuid], null, null, '{}'::jsonb, true)->'warnings') w limit 1)
  ))::text, true);
exception when others then
  declare d text; begin
    get stacked diagnostics d = pg_exception_detail;
    perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('error', sqlstate || ' ' || sqlerrm || ' | ' || coalesce(d, '')))::text, true);
  end;
end $t$;
reset role;
select set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('target_general', platform.organization_general_scope('2643e470-b275-47f3-95f3-ae275ad3ca47')))::text, true);
select key k, value v from jsonb_each(current_setting('chg_test.out')::jsonb) where key <> 'ids';

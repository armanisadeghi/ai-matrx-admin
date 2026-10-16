select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
select set_config('chg_test.out', '{}', true);
do $t$
declare v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_brand uuid; v_file uuid; v_asset uuid; v_persona uuid; v_note uuid; v_brand2 uuid; v_asset2 uuid;
begin
  insert into web.brand (organization_id, name, website_url, created_by) values (v_org, 'Amish Leatherworks', 'https://amishleatherworks.com', v_me) returning id into v_brand;
  insert into files.files (created_by, file_path, file_name, organization_id, storage_uri, mime_type)
    values (v_me, 'test/amish-logo.png', 'amish-logo.png', v_org, 's3://test/amish-logo.png', 'image/png') returning id into v_file;
  insert into web.brand_asset (organization_id, brand_id, kind, file_id, title, created_by) values (v_org, v_brand, 'logo', v_file, 'Logo', v_me) returning id into v_asset;
  insert into web.brand_persona (brand_id, name, organization_id, created_by) values (v_brand, 'Gift buyer', v_org, v_me) returning id into v_persona;
  -- the same logo is also used by a second brand that stays behind
  insert into web.brand (organization_id, name, created_by) values (v_org, 'Amish Leatherworks Wholesale', v_me) returning id into v_brand2;
  insert into web.brand_asset (organization_id, brand_id, kind, file_id, title, created_by) values (v_org, v_brand2, 'logo', v_file, 'Logo', v_me) returning id into v_asset2;
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('ids', jsonb_build_object('brand', v_brand, 'file', v_file, 'asset', v_asset, 'persona', v_persona, 'brand2', v_brand2)))::text, true);
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := (current_setting('chg_test.out')::jsonb -> 'ids'); v_b uuid := (v_ids->>'brand')::uuid; v_p jsonb; v_c jsonb; v_tgt uuid := '2643e470-b275-47f3-95f3-ae275ad3ca47'; v_ans jsonb := '{}';  q jsonb;
begin
  v_p := platform.change_records('move', 'web_brand', array[v_b], v_tgt);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('preview_shared', jsonb_build_object('questions', (select jsonb_agg(x->'id') from jsonb_array_elements(v_p->'questions') x),
     'warnings', (select jsonb_agg(w - 'items') from jsonb_array_elements(v_p->'warnings') w))))::text, true);
  begin
    perform platform.change_records('move', 'web_brand', array[v_b], v_tgt, null, '{}'::jsonb, false, v_p->>'fingerprint');
    perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('commit_shared', '"NOT REFUSED"'))::text, true);
  exception when others then perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('commit_shared', to_jsonb(sqlstate || ' ' || sqlerrm)))::text, true); end;
  -- the person removes the logo from the wholesale brand, then moves again
  update web.brand_asset set file_id = null, source_url = 'https://amishleatherworks.com/logo.png' where brand_id = (v_ids->>'brand2')::uuid;
  v_p := platform.change_records('move', 'web_brand', array[v_b], v_tgt);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('preview', jsonb_build_object('questions', (select jsonb_agg(jsonb_build_object('id', x->'id', 'prompt', x->'prompt', 'suggested', x->'suggested')) from jsonb_array_elements(v_p->'questions') x),
     'warnings', (select jsonb_agg(jsonb_build_object('kind', w->'kind', 'message', w->'message', 'count', w->'count')) from jsonb_array_elements(v_p->'warnings') w),
     'groups', (select jsonb_agg(jsonb_build_object('type', g->'type', 'count', g->'count', 'action', g->'action')) from jsonb_array_elements(v_p->'groups') g))))::text, true);
  for q in select * from jsonb_array_elements(v_p->'questions') loop
    v_ans := v_ans || jsonb_build_object(q->>'id', coalesce(q->>'suggested', 'cut'));
  end loop;
  v_c := platform.change_records('move', 'web_brand', array[v_b], v_tgt, null, v_ans, false, v_p->>'fingerprint');
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('commit', v_c - 'roots' - 'groups' - 'warnings'))::text, true);
end $t$;
reset role;
select set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object('after', jsonb_build_object(
  'brand', (select organization_id from web.brand where id=(v->>'brand')::uuid),
  'asset', (select organization_id from web.brand_asset where id=(v->>'asset')::uuid),
  'persona', (select organization_id from web.brand_persona where id=(v->>'persona')::uuid),
  'file', (select organization_id from files.files where id=(v->>'file')::uuid),
  'brand2', (select organization_id from web.brand where id=(v->>'brand2')::uuid))))::text, true)
  from (select current_setting('chg_test.out')::jsonb -> 'ids' v) ids;
select key k, value v from jsonb_each(current_setting('chg_test.out')::jsonb) where key <> 'ids';

select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
create temp table t_out (k text, v jsonb) on commit drop;
grant all on t_out to authenticated;
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
  insert into t_out values ('ids', jsonb_build_object('brand', v_brand, 'file', v_file, 'asset', v_asset, 'persona', v_persona, 'brand2', v_brand2));
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := (select v from t_out where k='ids'); v_b uuid := (v_ids->>'brand')::uuid; v_p jsonb; v_c jsonb; v_tgt uuid := 'ef4b0d95-5ec3-4d8f-901b-d40e178a71df'; v_ans jsonb := '{}';  q jsonb;
begin
  v_p := platform.change_records('move', 'web_brand', array[v_b], v_tgt);
  insert into t_out values ('preview_shared', jsonb_build_object('questions', (select jsonb_agg(x->'id') from jsonb_array_elements(v_p->'questions') x),
     'warnings', (select jsonb_agg(w - 'items') from jsonb_array_elements(v_p->'warnings') w)));
  begin
    perform platform.change_records('move', 'web_brand', array[v_b], v_tgt, null, '{}'::jsonb, false, v_p->>'fingerprint');
    insert into t_out values ('commit_shared', '"NOT REFUSED"');
  exception when others then insert into t_out values ('commit_shared', to_jsonb(sqlstate || ' ' || sqlerrm)); end;
  -- the person removes the logo from the wholesale brand, then moves again
  update web.brand_asset set file_id = null, source_url = 'https://amishleatherworks.com/logo.png' where brand_id = (v_ids->>'brand2')::uuid;
  v_p := platform.change_records('move', 'web_brand', array[v_b], v_tgt);
  insert into t_out values ('preview', jsonb_build_object('questions', (select jsonb_agg(jsonb_build_object('id', x->'id', 'prompt', x->'prompt', 'suggested', x->'suggested')) from jsonb_array_elements(v_p->'questions') x),
     'warnings', (select jsonb_agg(jsonb_build_object('kind', w->'kind', 'message', w->'message', 'count', w->'count')) from jsonb_array_elements(v_p->'warnings') w),
     'groups', (select jsonb_agg(jsonb_build_object('type', g->'type', 'count', g->'count', 'action', g->'action')) from jsonb_array_elements(v_p->'groups') g)));
  for q in select * from jsonb_array_elements(v_p->'questions') loop
    v_ans := v_ans || jsonb_build_object(q->>'id', coalesce(q->>'suggested', 'cut'));
  end loop;
  v_c := platform.change_records('move', 'web_brand', array[v_b], v_tgt, null, v_ans, false, v_p->>'fingerprint');
  insert into t_out values ('commit', v_c - 'roots' - 'groups' - 'warnings');
end $t$;
reset role;
insert into t_out select 'after', jsonb_build_object(
  'brand', (select organization_id from web.brand where id=(v->>'brand')::uuid),
  'asset', (select organization_id from web.brand_asset where id=(v->>'asset')::uuid),
  'persona', (select organization_id from web.brand_persona where id=(v->>'persona')::uuid),
  'file', (select organization_id from files.files where id=(v->>'file')::uuid),
  'brand2', (select organization_id from web.brand where id=(v->>'brand2')::uuid)) from t_out where k='ids';
select k, v from t_out where k <> 'ids';

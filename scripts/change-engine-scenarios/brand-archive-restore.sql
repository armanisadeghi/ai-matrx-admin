-- brand archive/restore round trip as admin@admin.com (rolled back by the runner)
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
create temp table t_out (k text, v jsonb) on commit drop;
grant all on t_out to authenticated;
do $t$
declare
  v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657';
  v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_brand uuid; v_file uuid; v_asset uuid; v_persona uuid;
begin
  insert into web.brand (organization_id, name, website_url, created_by) values (v_org, 'FishUSA', 'https://fishusa.com', v_me) returning id into v_brand;
  insert into files.files (created_by, file_path, file_name, organization_id, storage_uri, mime_type)
    values (v_me, 'test/fishusa-logo.png', 'fishusa-logo.png', v_org, 's3://test/fishusa-logo.png', 'image/png') returning id into v_file;
  insert into web.brand_asset (organization_id, brand_id, kind, file_id, title, created_by) values (v_org, v_brand, 'logo', v_file, 'Logo', v_me) returning id into v_asset;
  insert into web.brand_persona (brand_id, name, organization_id, created_by) values (v_brand, 'Weekend angler', v_org, v_me) returning id into v_persona;
  insert into t_out values ('ids', jsonb_build_object('brand', v_brand, 'file', v_file, 'asset', v_asset, 'persona', v_persona));
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := (select v from t_out where k='ids'); v_p jsonb; v_c jsonb; v_r jsonb; v_brand uuid := (v_ids->>'brand')::uuid;
begin
  v_p := platform.change_records('delete', 'web_brand', array[v_brand]);
  insert into t_out values ('preview', v_p - 'roots');
  v_c := platform.change_records('delete', 'web_brand', array[v_brand], null, null, '{}'::jsonb, false, v_p->>'fingerprint');
  insert into t_out values ('commit', v_c);
  insert into t_out values ('after_delete', jsonb_build_object(
    'brand', (select deleted_at is not null from web.brand where id=v_brand),
    'asset', (select deleted_at is not null from web.brand_asset where id=(v_ids->>'asset')::uuid),
    'persona', (select deleted_at is not null from web.brand_persona where id=(v_ids->>'persona')::uuid),
    'file', (select deleted_at is not null from files.files where id=(v_ids->>'file')::uuid)));
  v_r := platform.change_records('restore', 'web_brand', array[v_brand], null, (v_c->>'plan_id')::uuid, '{}'::jsonb, false);
  insert into t_out values ('restore', v_r);
  insert into t_out values ('after_restore', jsonb_build_object(
    'brand', (select deleted_at is null from web.brand where id=v_brand),
    'asset', (select deleted_at is null from web.brand_asset where id=(v_ids->>'asset')::uuid),
    'persona', (select deleted_at is null from web.brand_persona where id=(v_ids->>'persona')::uuid),
    'file', (select deleted_at is null from files.files where id=(v_ids->>'file')::uuid)));
end $t$;
select k, v from t_out;

-- A move above the inline budget runs as a durable job: step 1 moves the brand, the job moves its parts.
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
select set_config('chg_test.out', '{}', true);
-- this transaction only: two rows inline, so a four-row brand is "large"
update platform.feature_knob set value = '2'::jsonb where feature = 'change' and key = 'inline_row_budget';
do $t$
declare v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_brand uuid; v_file uuid; v_asset uuid; v_persona uuid;
begin
  insert into web.brand (organization_id, name, website_url, created_by) values (v_org, 'Larkspur Trail Outfitters', 'https://larkspurtrail.example', v_me) returning id into v_brand;
  insert into files.files (created_by, file_path, file_name, organization_id, storage_uri, mime_type)
    values (v_me, 'test/larkspur-logo.png', 'larkspur-logo.png', v_org, 's3://test/larkspur-logo.png', 'image/png') returning id into v_file;
  insert into web.brand_asset (organization_id, brand_id, kind, file_id, title, created_by) values (v_org, v_brand, 'logo', v_file, 'Logo', v_me) returning id into v_asset;
  insert into web.brand_persona (brand_id, name, organization_id, created_by) values (v_brand, 'Day hiker', v_org, v_me) returning id into v_persona;
  perform set_config('chg_test.out', jsonb_build_object('ids', jsonb_build_object('brand', v_brand, 'file', v_file, 'asset', v_asset, 'persona', v_persona))::text, true);
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := current_setting('chg_test.out')::jsonb -> 'ids'; v_b uuid := (v_ids->>'brand')::uuid;
  v_tgt uuid := '2643e470-b275-47f3-95f3-ae275ad3ca47'; v_p jsonb; v_c jsonb; v_a jsonb; v_mid jsonb;
begin
  v_p := platform.change_records('move', 'web_brand', array[v_b], v_tgt);
  v_c := platform.change_records('move', 'web_brand', array[v_b], v_tgt, null, '{}'::jsonb, false, v_p->>'fingerprint');
  v_mid := jsonb_build_object('brand', (select organization_id from web.brand where id = v_b),
                              'asset', (select organization_id from web.brand_asset where id = (v_ids->>'asset')::uuid));
  v_a := platform.change_job_advance((v_c->>'plan_id')::uuid, 2000);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object(
    'preview_mode', v_p->'mode', 'commit', v_c - 'organization', 'after_step1', v_mid, 'advance', v_a,
    'after', jsonb_build_object(
      'brand', (select organization_id from web.brand where id = v_b),
      'asset', (select organization_id from web.brand_asset where id = (v_ids->>'asset')::uuid),
      'persona', (select organization_id from web.brand_persona where id = (v_ids->>'persona')::uuid),
      'file', (select organization_id from files.files where id = (v_ids->>'file')::uuid))))::text, true);
end $t$;
select key k, value v from jsonb_each(current_setting('chg_test.out')::jsonb) where key <> 'ids';

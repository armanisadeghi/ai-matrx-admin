-- web.brand_archive / web.brand_restore are doors over the engine: the archive is a logged plan, the restore exact.
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
select set_config('chg_test.out', '{}', true);
do $t$
declare v_org uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd'; v_b uuid;
begin
  insert into web.brand (organization_id, name, created_by) values (v_org, 'Saltmarsh Kayak Co', v_me) returning id into v_b;
  insert into web.brand_persona (brand_id, name, organization_id, created_by) values (v_b, 'Weekend paddler', v_org, v_me);
  perform set_config('chg_test.out', jsonb_build_object('ids', jsonb_build_object('brand', v_b))::text, true);
end $t$;
set local role authenticated;
do $t$
declare v_b uuid := (current_setting('chg_test.out')::jsonb -> 'ids' ->> 'brand')::uuid; v_a jsonb; v_r jsonb;
begin
  v_a := web.brand_archive(v_b);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object(
    'archive', jsonb_build_object('archived', v_a -> 'archived', 'has_plan', (v_a ->> 'plan_id') is not null,
      'persona_archived', (select bool_and(p.deleted_at is not null) from web.brand_persona p where p.brand_id = v_b)))) ::text, true);
  v_r := web.brand_restore(v_b);
  perform set_config('chg_test.out', (current_setting('chg_test.out')::jsonb || jsonb_build_object(
    'restore', jsonb_build_object('brand_live', (select b.deleted_at is null from web.brand b where b.id = v_b),
      'persona_live', (select bool_and(p.deleted_at is null) from web.brand_persona p where p.brand_id = v_b)))) ::text, true);
end $t$;
select key k, value v from jsonb_each(current_setting('chg_test.out')::jsonb) where key <> 'ids';

-- chair-step: drop the stray visibility column on two COMPONENT tables (seo.gsc_dig_rule, seo.starter_pack_item); their access is the parent's, the column was a second competing access authority read by nothing but the platform_admin_all arm, and the certifier FAILs personal_row_wall/WARNs visibility until it goes
-- based-on: seo.starter_pack_item_save(jsonb) 30146ad32540ab5912031209c171ecdb4cdb6ac908000493802252196e6df982
-- based-on: seo.starter_pack_new_version(uuid, text) 01293e07bb69e9cb65642a4ae3a8ba6982314e77f2736e3ba35c1ad85f1bd69e
-- based-on: seo.starter_pack_from_proposal(jsonb, uuid, jsonb, uuid[]) 5da93463a167335beb98beb135ea9bd08ae0ca24f4b04b035942a3cbc680c19b
-- lane: canonicalization lane 7.
-- Readers census (2026-10-22): no app/server code reads either column (matrx-frontend data-dig.ts, useDigRules,
-- PackBandsSection go through the rows/RPCs without it; aidream, matrx-local, matrx-extend: no reference). The only
-- writers are the three seo.starter_pack_* functions below, which wrote the constant 'internal' into
-- starter_pack_item.visibility; that column is removed from their seo.starter_pack_item inserts only (their
-- seo.starter_pack inserts — the parent, which keeps its visibility — are untouched).
set lock_timeout = '2s';

do $mig$
declare
  f regprocedure;
  def text; seg text; newseg text; n int;
begin
  foreach f in array array[
    'seo.starter_pack_item_save(jsonb)'::regprocedure,
    'seo.starter_pack_new_version(uuid,text)'::regprocedure,
    'seo.starter_pack_from_proposal(jsonb,uuid,jsonb,uuid[])'::regprocedure]
  loop
    def := pg_get_functiondef(f); n := 0;
    for seg in select m[1] from regexp_matches(def, '(insert into seo\.starter_pack_item[^;]*;)', 'g') m loop
      newseg := replace(replace(seg, ', visibility, created_by', ', created_by'), ', ''internal'', v_uid', ', v_uid');
      if newseg = seg then raise exception 'lane7: % — a starter_pack_item insert did not change', f; end if;
      def := replace(def, seg, newseg); n := n + 1;
    end loop;
    if n = 0 then raise exception 'lane7: % — no starter_pack_item insert found', f; end if;
    execute def;
  end loop;
end $mig$;

drop policy if exists platform_admin_all on seo.gsc_dig_rule;
alter table seo.gsc_dig_rule drop column visibility;
drop policy if exists platform_admin_all on seo.starter_pack_item;
alter table seo.starter_pack_item drop column visibility;

select iam.apply_rls('seo', 'gsc_dig_rule', 'seo_gsc_dig_rule', 'component');
select iam.apply_rls('seo', 'starter_pack_item', 'seo_starter_pack_item', 'component');

do $$ begin
  if not iam.canonical_certify_ok('seo', 'gsc_dig_rule', 'seo_gsc_dig_rule') then raise exception 'lane7: gsc_dig_rule does not certify'; end if;
  if not iam.canonical_certify_ok('seo', 'starter_pack_item', 'seo_starter_pack_item') then raise exception 'lane7: starter_pack_item does not certify'; end if;
end $$;

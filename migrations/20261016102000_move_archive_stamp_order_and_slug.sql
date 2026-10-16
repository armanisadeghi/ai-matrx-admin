-- chair-step: one replace of platform._chg_records — delete stamps children before parents (a parent's own archive trigger, such as web._brand_cascade_softdelete_extras, reads its children's stamp); restore brings parents back first, and a restored root whose slug a live record took since gets a distinct one.
-- based-on: platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) 1deda05fc599bb647747835d96d11161e0daf9bf8cdc983be009749139b2a8ea
-- Move and archive (plan § 3, § 2 Restore). Found running the brand archive through the engine:
-- web._brand_cascade_softdelete_extras archives a brand's captured posts only when its tracked accounts carry
-- the brand's stamp, and the engine stamped the brand first. And web.brand_restore renamed a slug a newer brand
-- had taken; the engine's restore did not.
do $do$
declare v_def text; v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text)'::pg_catalog.regprocedure);
  v_new := replace(v_def,
    $a$group by x.depth, x.rel order by x.depth, x.rel::text loop$a$,
    $a$group by x.depth, x.rel order by x.depth desc, x.rel::text loop$a$);
  v_new := replace(v_new,
    $a$where i.plan_id = v_del_plan.id and i.action = 'stamped' order by i.seq loop$a$,
    $a$where i.plan_id = v_del_plan.id and i.action = 'stamped' order by i.depth, i.seq loop$a$);
  v_new := replace(v_new,
    $a$      values (pg_catalog.txid_current(), v_plan, v_del_plan.entity_type, v_ids);
$a$,
    $a$      values (pg_catalog.txid_current(), v_plan, v_del_plan.entity_type, v_ids);
      -- a root whose address a live record took since gets a distinct one (web.brand_restore's rule, for every type)
      if platform._chg_col_type(v_rel, 'slug') is not null then
        foreach v_id in array v_ids loop
          execute pg_catalog.format(
            'update %1$s t set slug = t.slug || ''-'' || left(t.id::text, 4)
              where t.id = $1 and t.deleted_at is not null and t.slug is not null
                and exists (select 1 from %1$s o where o.slug = t.slug and o.deleted_at is null and o.id <> t.id)', v_rel)
            using v_id;
        end loop;
      end if;
$a$);
  if v_new = v_def
     or position($a$order by x.depth desc, x.rel::text loop$a$ in v_new) = 0
     or position($a$order by i.depth, i.seq loop$a$ in v_new) = 0
     or position($a$web.brand_restore's rule$a$ in v_new) = 0 then
    raise exception 'platform._chg_records: an expected clause was not found; nothing changed';
  end if;
  execute v_new;
end $do$;

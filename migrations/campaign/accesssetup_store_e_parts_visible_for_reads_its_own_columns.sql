-- chair-step: REPLACES iam.parts_visible_for (accesssetup_store_d) only to add #variable_conflict use_column: its RETURNS TABLE names part and label, which the body's own query also names, so every call raised 42702 "column reference part is ambiguous". Nothing calls it before the swap; the body is otherwise unchanged.
-- lane: access-setup-store
-- lock: iam
-- based-on: iam.parts_visible_for(uuid, uuid, permission_level) b7543888c2272092493c38a769c80049d3fb53543349c9fac89944eb8b365fc9
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1 ("One page, one answer").
-- Inverse: migrations/inverse/accesssetup_store_e_parts_visible_for_reads_its_own_columns_down.sql

CREATE OR REPLACE FUNCTION iam.parts_visible_for(p_person uuid, p_table uuid, p_level permission_level)
 RETURNS TABLE(part text, label text, may_read boolean, may_edit boolean, per_row boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_key text;
  v_hit text;
  v_org uuid;
  v_out jsonb;
begin
  if p_table is null then return; end if;
  v_key := 'pvf:' || coalesce(p_person::text, '-') || ':' || p_table::text || ':' || coalesce(p_level::text, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is null then
    select t.organization_id into v_org from custom.record t where t.id = p_table;
    with parts as (
      select custom.store_field_part(f.data) as part,
             min(coalesce(nullif(btrim(f.data ->> 'part'), ''), f.data ->> 'sensitivity', 'internal')) as label,
             max(coalesce(f.data ->> 'sensitivity', 'internal')) filter (where true) as word
        from custom.record f
       where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = p_table and coalesce(f.data ->> 'type', '') <> 'formula'
       group by 1),
    cells as (select p.part, p.label, c
                from parts p, jsonb_array_elements(custom._store_part_cells(v_org, p_table, p.part, p.word)) c)
    select coalesce(jsonb_agg(jsonb_build_object(
             'part', x.part, 'label', x.label,
             'may_read', x.r, 'may_edit', x.e, 'per_row', x.pr) order by x.part), '[]'::jsonb)
      into v_out
      from (select part, label,
                   bool_or(not custom._store_cell_per_row(c) and (c ->> 'level')::public.permission_level >= 'viewer'
                           and (case when c #>> '{seat,kind}' = 'row_level'
                                     then p_level is not null and p_level >= (c #>> '{seat,min}')::public.permission_level
                                     when c #>> '{seat,kind}' = 'org_role'
                                     then exists (select 1 from iam.memberships m where m.organization_id = v_org
                                                    and m.container_type = 'organization' and m.user_id = p_person
                                                    and m.role = c #>> '{seat,role}' and m.status = 'active' and m.deleted_at is null)
                                     else false end)) as r,
                   bool_or(not custom._store_cell_per_row(c) and (c ->> 'level')::public.permission_level >= 'editor'
                           and p_level is not null and p_level >= 'edit_content'
                           and (case when c #>> '{seat,kind}' = 'row_level'
                                     then p_level >= (c #>> '{seat,min}')::public.permission_level
                                     else false end)) as e,
                   bool_or(custom._store_cell_per_row(c)) as pr
              from cells group by part, label) x;
    perform platform.memo_k_put(v_key, v_out::text);
  else
    v_out := v_hit::jsonb;
  end if;
  return query select e ->> 'part', e ->> 'label', (e ->> 'may_read')::boolean, (e ->> 'may_edit')::boolean,
                      (e ->> 'per_row')::boolean
                 from jsonb_array_elements(v_out) e;
end $function$;

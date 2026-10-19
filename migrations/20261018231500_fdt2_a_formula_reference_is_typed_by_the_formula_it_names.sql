-- target: production
-- additive: yes
--   ADDS one function, `custom._fxp_formula_type(text, jsonb)` (IMMUTABLE, invoker, no grant), and REPLACES one
--   body, `custom._view_field_key(uuid, uuid, text, text, jsonb, text[])` (byte for byte as live, plus a date
--   setting's formula typed through the new function). No table, trigger, policy, index, grant or row.
--   Inverse: migrations/inverse/20261018231500_fdt2_a_formula_reference_is_typed_by_the_formula_it_names_down.sql.
-- guard: custom/system_enabled
-- lock: custom
-- lane: VIEWS-AND-FIELDS (FDT-2, finishes the draft held by V16 on 2026-10-03)
-- based-on: custom._view_field_key(uuid, uuid, text, text, jsonb, text[]) f33eb723b2d886e73ad9bb837499a89413eabf4f930ff687a7cd11b229120a4a
--
-- A FORMULA THAT NAMES ANOTHER FORMULA IS TYPED BY THE FORMULA IT NAMES. `custom._fxp_type` types a reference
-- to a formula as unknown, so "= {Follow-up due}" was refused as a calendar date and IF(c, DATEADD(..), {text
-- formula}) was wrongly accepted (an unknown branch defers to the other). The 2026-10-03 draft inlined formula
-- expressions, which is exponential on diamonds; V16 held it for a node budget. This one types instead of
-- inlining: nine rounds, each types every formula of the table once from the previous round's answers, so the
-- work is rounds x formulas x expression size - linear, no inlining, nothing to budget. A chain up to nine
-- deep settles; a circle never leaves unknown and is refused with the same sentence. `_fxp_type` unchanged.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE FUNCTION custom._fxp_formula_type(p_target text, p_fields jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_cur jsonb := coalesce(p_fields, '[]'::jsonb);
  v_t   jsonb;
  v_i   int;
begin
  -- The answer for formula `p_target` of the field list `p_fields` ({id,key,label,type,config} each):
  -- 'date' | 'number' | 'text' | 'boolean' | 'unknown'. Lookups and rollups (config.via) stay unknown.
  for v_i in 1..9 loop
    select coalesce(jsonb_agg(
             case when f ->> 'type' = 'formula' and not (coalesce(f -> 'config', '{}'::jsonb) ? 'via')
                       and jsonb_typeof(f -> 'config' -> 'expr') = 'object'
                  then case custom._fxp_type(f -> 'config' -> 'expr', v_cur)
                         when 'date'    then jsonb_set(jsonb_set(f, '{type}', '"range"'), '{config}', '{"kind":"date","_typed":true}')
                         when 'number'  then jsonb_set(jsonb_set(f, '{type}', '"range"'), '{config}', '{"_typed":true}')
                         when 'text'    then jsonb_set(f, '{type}', '"text"')
                         when 'boolean' then jsonb_set(f, '{type}', '"boolean"')
                         else f end
                  else f end), '[]'::jsonb)
      into v_t
      from jsonb_array_elements(p_fields) f;
    v_cur := v_t;
  end loop;
  return (select custom._fxp_type(f -> 'config' -> 'expr', v_cur)
            from jsonb_array_elements(p_fields) f
           where f ->> 'id' = p_target and jsonb_typeof(f -> 'config' -> 'expr') = 'object'
           limit 1);
end
$function$;

CREATE OR REPLACE FUNCTION custom._view_field_key(p_organization_id uuid, p_table_id uuid, p_path text, p_shape text, p_ref jsonb, p_known text[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ref   text;
  v_doc   jsonb;
  v_dead  boolean;
  v_type  text;
  v_par   text;
  v_kind  text;
  v_label text;
  v_held  boolean;
  v_cfg   jsonb;
  v_far   jsonb;
  v_ftab  text;
  v_flds  jsonb;
  v_fid   uuid;
  v_farid uuid;
begin
  if p_ref is null or jsonb_typeof(p_ref) <> 'string' or btrim(p_ref #>> '{}') = '' then
    raise exception '% names a Field, and nothing was named.', p_path
      using errcode = '22023', hint = 'Name the Field by its key or its id. Nothing was written.';
  end if;
  v_ref := p_ref #>> '{}';

  select f.data, f.deleted_at is not null, f.id into v_doc, v_dead, v_fid
    from custom.record f
   where f.organization_id = p_organization_id and f.data_class = 'field'
     and f.data ->> 'entity_definition_id' = p_table_id::text
     and (f.id = platform.uuid_or_null(v_ref) or f.data ->> 'key' = v_ref)
   order by (f.deleted_at is null) desc, f.updated_at desc
   limit 1;

  if v_doc is not null and v_ref = any (p_known) then
    return v_doc ->> 'key';
  end if;
  if v_doc is null and v_ref = any (p_known) then
    -- A word the view already held that is no Field of this Table now (a column since removed
    -- for good). Kept as it was; the screens skip a Field they cannot find.
    return v_ref;
  end if;
  if v_doc is null then
    raise exception '% names "%", which is not a field of this table.', p_path, v_ref
      using errcode = '22023', hint = 'A view names the fields of its own table, by key or id. Nothing was written.';
  end if;
  v_label := coalesce(nullif(v_doc ->> 'label', ''), v_doc ->> 'key');
  if v_dead and p_path <> 'presentation.hiddenFields' then
    -- (Hiding a column that is archived anyway harms nobody, so that one list takes it.)
    raise exception '% names %, which has been archived.', p_path, v_label
      using errcode = '22023', hint = 'An archived field is not shown to anyone, so a view cannot be built on it. Restore it first, or pick another. Nothing was written.';
  end if;

  v_type := v_doc ->> 'type';
  v_par  := coalesce(v_doc ->> 'parity_type', '');
  v_kind := coalesce(v_doc -> 'config' ->> 'kind', '');

  -- LANE 10 FDT: A DATE SETTING TAKES A FIELD WHOSE VALUE IS A DATE, stored or worked out (Airtable
  -- places a calendar or a timeline by a formula or a lookup that returns a date). A stored date
  -- column, as before; a formula whose answer is a date, typed by `custom._fxp_type` — the one rule
  -- the formula editor's "gives a date" uses; a lookup of ONE value whose picked column on the far
  -- table is a stored date or a date formula. A rollup is never one: `custom.rollup_value` adds up
  -- numbers only, so a rollup of dates is always empty and a calendar on it would show nothing.
  -- Everything else is refused with the same sentences as before.
  if p_shape = 'field:date' then
    v_held := v_type = 'range' and (v_kind in ('date', 'datetime') or v_par in ('date', 'datetime'));
    v_cfg := coalesce(v_doc -> 'config', '{}'::jsonb);
    if not v_held and v_type = 'formula' and not (v_cfg ? 'via') and jsonb_typeof(v_cfg -> 'expr') = 'object' then
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
                                                   'type', f.data ->> 'type', 'config', f.data -> 'config')), '[]'::jsonb)
        into v_flds
        from custom.record f
       where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
         and f.data_class = 'field' and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = p_table_id::text;
      -- FDT-2: a reference to another formula is typed by THAT formula (bounded, linear).
      v_held := coalesce(custom._fxp_formula_type(v_fid::text, v_flds) = 'date', false);
    elsif not v_held and v_type = 'formula' and v_cfg ? 'via' and not (v_cfg ? 'agg')
          and not coalesce((v_doc ->> 'multi')::boolean, false) then
      select f.data ->> 'relation_target' into v_ftab
        from custom.record f
       where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
         and f.data_class = 'field' and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = p_table_id::text
         and f.data ->> 'key' = v_cfg ->> 'via'
       limit 1;
      if v_ftab is not null then
        select f.data, f.id into v_far, v_farid
          from custom.record f
         where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
           and f.data_class = 'field' and f.deleted_at is null
           and f.data ->> 'entity_definition_id' = v_ftab
           and f.data ->> 'key' = v_cfg ->> 'pick'
         limit 1;
      end if;
      if v_far ->> 'type' = 'range' then
        v_held := coalesce(v_far -> 'config' ->> 'kind', '') in ('date', 'datetime')
               or coalesce(v_far ->> 'parity_type', '') in ('date', 'datetime');
      elsif v_far ->> 'type' = 'formula' and not (v_far -> 'config' ? 'via')
            and jsonb_typeof(v_far -> 'config' -> 'expr') = 'object' then
        select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
                                                     'type', f.data ->> 'type', 'config', f.data -> 'config')), '[]'::jsonb)
          into v_flds
          from custom.record f
         where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
           and f.data_class = 'field' and f.deleted_at is null
           and f.data ->> 'entity_definition_id' = v_ftab;
        v_held := coalesce(custom._fxp_formula_type(v_farid::text, v_flds) = 'date', false);
      end if;
    end if;
    v_held := coalesce(v_held, false);
  end if;
  if p_shape = 'field:number'
     and not (v_type = 'formula'
              or (v_type = 'range' and v_kind not in ('date', 'datetime', 'time')
                  and v_par not in ('date', 'datetime', 'time'))) then
    raise exception 'The board sums a number, a money or a percentage field under each column, and % holds none of those.', v_label
      using errcode = '22023', hint = 'Pick a number field to total. Nothing was written.';
  elsif p_shape = 'field:date' and not v_held then
    -- LANE 10 VK: the same date test for every date setting; the sentence names the setting.
    if p_path = 'end_field' then
      raise exception 'A record''s end is a date, and % does not hold one.', v_label
        using errcode = '22023', hint = 'Pick a date field for where it ends. Nothing was written.';
    elsif p_path = 'start_field' then
      raise exception 'A timeline places a record by a date, and % does not hold one.', v_label
        using errcode = '22023', hint = 'Pick a date field for where it starts. Nothing was written.';
    end if;
    raise exception 'A calendar places a record by a date, and % does not hold one.', v_label
      using errcode = '22023', hint = 'Pick a date field. Nothing was written.';
  elsif p_shape = 'field:color' and v_type not in ('list', 'boolean') then
    raise exception 'Colour by gives one colour to each value of a choice, and % is not a choice.', v_label
      using errcode = '22023', hint = 'Pick a choice or a yes/no field to colour by. Nothing was written.';
  elsif p_shape = 'field:lane' and v_type not in ('list', 'relation', 'boolean', 'text') then
    raise exception 'A swimlane is one row for each value of a choice, a person, a link or a word, and % holds a %.', v_label, v_type
      using errcode = '22023', hint = 'Pick a choice, a person or a link field. Nothing was written.';
  end if;
  return v_doc ->> 'key';
end;
$function$;

-- chair-step: the inverse of READ-SPEED-8 b — the column mask and the reader judgement ask iam.may_touch_field one column at a time again
-- lane: READ-SPEED-8
-- based-on: iam.visible_field_ids(uuid, uuid, uuid, permission_level, text) a7ae330c75eba6ebdf50bce05e739715efacb22d5d23b5e69a5582cecb61f041
-- based-on: custom._computed_reader_judge(uuid, uuid, uuid) b734cfc7748f5f140ec2628d41cd8da1934444f37ad776c3aee0b4ad11707ecb
CREATE OR REPLACE FUNCTION iam.visible_field_ids(p_user_id uuid, p_organization_id uuid, p_table_id uuid, p_level_on_record permission_level, p_action text DEFAULT 'read'::text)
 RETURNS TABLE(field_id uuid, field_key text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select f.id, f.data ->> 'key'
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and iam.may_touch_field(p_user_id, f.id, p_organization_id, p_level_on_record, p_action);
$function$
;

CREATE OR REPLACE FUNCTION custom._computed_reader_judge(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_comp  uuid[] := custom._computed_component(p_org, p_table);
  v_t     uuid;
  v_all   boolean;
  v_level public.permission_level;
  c       record;
begin
  foreach v_t in array v_comp loop
    select s.o_all_visible into v_all from custom.visible_set(p_me, p_org, v_t, 'viewer'::public.permission_level) s;
    if not coalesce(v_all, false) then
      return false;
    end if;
  end loop;
  for c in
    with f as (
      select f.id, f.data, (f.data ->> 'entity_definition_id')::uuid tid
        from custom.record f
       where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = any (v_comp)),
    k as (
      select f.data -> 'config' ->> 'of' k from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select f.data -> 'config' ->> 'via' from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select jsonb_object_keys(case when jsonb_typeof(f.data -> 'config' -> 'filter') = 'object'
                                          then f.data -> 'config' -> 'filter' else '{}'::jsonb end)
              from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select jsonb_array_elements_text(case when jsonb_typeof(f.data -> 'depends_on') = 'array'
                                                  then f.data -> 'depends_on' else '[]'::jsonb end) from f),
    ids as (
      select (x #>> '{}') id from f cross join lateral jsonb_path_query(coalesce(f.data -> 'config' -> 'expr', 'null'::jsonb), 'strict $.**.field') x
       where custom.parity_type(f.data) = 'formula' and jsonb_typeof(x) = 'string')
    select f.id, f.tid from f
     where f.data ->> 'key' in (select k from k where k is not null)
        or f.id::text in (select id from ids)
        or custom.parity_type(f.data) in ('rollup', 'lookup', 'formula')
     order by f.tid
  loop
    v_level := custom.effective_level(p_me, p_org, c.tid);
    if not coalesce(iam.may_touch_field(p_me, c.id, p_org, v_level, 'read'), false) then
      return false;
    end if;
  end loop;
  return true;
end;
$function$
;

drop function if exists custom._may_touch_fields(uuid, uuid, uuid[], public.permission_level, text);
drop function if exists custom.field_input_closure_many(uuid, uuid[]);
drop function if exists custom._field_inputs_step(uuid, jsonb);

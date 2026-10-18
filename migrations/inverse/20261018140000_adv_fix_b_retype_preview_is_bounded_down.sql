-- chair-step: ADV-FIX-B down — puts custom.field_retype_preview back to the unbounded F2 D11 body.

CREATE OR REPLACE FUNCTION custom.field_retype_preview(p_organization_id uuid, p_field_id uuid, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- F2 D11 (2026-10-17): WHAT A CHANGE OF KIND WILL DO, ANSWERED BY THE CHANGE ITSELF. The panel used to
-- count with a client-side mirror of the conversion, judged by the behaviour word alone — so Choice,
-- Email, Phone, Link, Money, Percentage and Date (all "a text" or "a number" to the mirror) were
-- promised as converting while the store kept them aside. This runs the very same custom.field_update
-- (its checks, its trigger, its choice-making) inside a subtransaction, counts what it did, and
-- rolls every row of it back. The preview cannot disagree with the change because it IS the change.
declare
  v_key     text;
  v_table   uuid;
  v_before  integer;
  v_out     jsonb;
  v_opts    uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_retype_preview');
  select f.data ->> 'key', nullif(f.data ->> 'entity_definition_id', '')::uuid into v_key, v_table
    from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_key is null or v_table is null then
    raise exception 'There is no such column here.' using errcode = '02000';
  end if;
  select count(*) into v_before from custom.record x
   where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
     and x.data ? v_key and jsonb_typeof(x.data -> v_key) <> 'null';
  begin
    perform custom.field_update(p_organization_id, p_field_id, p_patch);
    select nullif(f.data -> 'config' ->> 'options_table_id', '')::uuid into v_opts
      from custom.record f where f.organization_id = p_organization_id and f.id = p_field_id;
    with kept as (
      select e.value as v
        from custom.record x
        cross join lateral jsonb_array_elements(case when jsonb_typeof(x.data -> '_retired') = 'array'
                                                     then x.data -> '_retired' else '[]'::jsonb end) e
       where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
         and e.value ->> 'key' = v_key
         and not (e.value ? 'was_an_alternate_ranked')
         and e.value ->> 'at' = (to_jsonb(now()) #>> '{}'))
    select jsonb_build_object(
      'held_before', v_before,
      'converts', (select count(*) from custom.record x
                    where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
                      and x.data ? v_key and jsonb_typeof(x.data -> v_key) <> 'null'),
      'kept_aside', (select count(*) from kept),
      'examples', coalesce((select jsonb_agg(d.w) from (select distinct left(k.v -> 'value' #>> '{}', 80) as w from kept k limit 5) d), '[]'::jsonb),
      'choices_added', case when v_opts is null then 0 else
                         (select count(*) from custom.record o
                           where o.organization_id = p_organization_id and o.table_id = v_opts
                             and o.deleted_at is null and o.created_at >= now()) end)
      into v_out;
    raise exception using errcode = 'MXPV1', message = 'the preview is rolled back';
  exception when sqlstate 'MXPV1' then
    null;                                   -- every row the change wrote is gone; v_out is what it did
  end;
  return v_out;
end;
$function$;


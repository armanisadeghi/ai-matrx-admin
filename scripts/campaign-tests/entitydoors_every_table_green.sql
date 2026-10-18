-- ENTITY-DOORS-EVERY-TABLE (2026-10-18), GREEN: the entity doors work on every active registered table.
-- Run as postgres (Supabase MCP execute_sql). Ends in ROLLBACK; the knob entry and every row go with it.
--
-- THE DEFECT: platform.entity_columns / drill_describe / entity_list_scoped / entity_insert / entity_update /
-- entity_archive resolved a token through custom.entity_table, which carries the custom-fields guard, so all
-- 563 active tokens whose registry row says custom_fields_enabled = false (web_brand_choice among them) were
-- refused "A <NULL> table does not take custom fields" by every door. RED (2026-10-18, before the fix, same
-- calls): every web_brand_* claim below answered 23514 / MX005 with that sentence.
-- THE FIX (Supabase MCP, migration entity_doors_every_registered_table): platform.entity_table resolves the
-- token with no custom-fields check; custom.entity_table = platform.entity_table + the guard, called only
-- where custom fields are touched; custom.entity_row_write asks custom.entity_table only for a _custom value.
--
-- Claims (each row's `pass`):
--   resolves_every_active_token  platform.entity_table answers every active registry token
--   describe:web_brand_*         entity_columns answers columns for three tables that take no custom fields
--   list:web_brand_choice        entity_list_scoped answers (0 or more rows), no refusal
--   insert / update / stale / trash   a web.brand_choice row, filed in its brand's organization, through the
--                                doors as admin@admin.com, once the Table API knob names the table (rehearsed here)
--   custom_value_refused         a _custom value on that table is refused in the custom-fields door's words
--   custom_door_refused          custom.entity_fields on that table still refuses (the guard where it belongs)
--   person_only_rule             decision = 'chosen' with nobody signed in is still refused (web trigger)
--   custom_fields_table_same     custom.entity_table('crm_deal') answers exactly as before
begin;
create temp table _r(k text, v jsonb) on commit drop;
grant all on _r to authenticated;
create function pg_temp._try(p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; s text; m text;
begin
  execute p_sql into v;
  return jsonb_build_object('ok', true, 'v', v);
exception when others then
  get stacked diagnostics s = returned_sqlstate, m = message_text;
  return jsonb_build_object('ok', false, 'state', s, 'message', m);
end $f$;
grant execute on function pg_temp._try(text) to authenticated;

insert into _r select 'resolves_every_active_token', jsonb_build_object(
  'active', (select count(*) from platform.entity_types where is_active),
  'resolved', (select count(*) from platform.entity_types e cross join lateral platform.entity_table(e.token) t where e.is_active));
insert into _r select 'person_only_rule', pg_temp._try($q$insert into web.brand_choice
  (brand_id, element_id, value, origin, decision, placement, decided_by, decided_at, organization_id)
  select b.id, (select c.id from platform.categories c where c.dimension = 'brand_element' and c.deleted_at is null limit 1),
         '{"text":"Warm, plain-spoken"}', 'ai', 'chosen', 'lead', '87a6e699-3622-4869-8843-d0867456c0dd', now(), b.organization_id
    from web.brand b where b.id = '9084bb1e-d847-4f27-b3b1-ed31dd1399ba' returning jsonb_build_object('id', id)$q$);
-- rehearsal only: the Table API knob names web_brand_choice as it names project and crm_deal
update platform.feature_knob
   set value = coalesce(value, default_value) || jsonb_build_object('web_brand_choice', jsonb_build_object(
         'reach', 'read_write', 'create_via', 'insert',
         'writable_columns', jsonb_build_array('brand_id', 'element_id', 'value', 'origin', 'decision', 'placement',
                                               'recommended_placement', 'opinion_reason', 'decision_reason', 'decided_by', 'decided_at')))
 where feature = 'table_api' and key = 'standard_tables';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
insert into _r select 'describe:' || t, pg_temp._try(format('select platform.entity_columns(null, %L)', t))
  from unnest(array['web_brand_choice', 'web_brand_testimony', 'web_brand_review']) t;
insert into _r select 'list:web_brand_choice', pg_temp._try($q$select platform.entity_list_scoped('web_brand_choice', null, '{}'::jsonb, p_page_size => 5)$q$);
insert into _r select 'insert', pg_temp._try($q$select platform.entity_insert('web_brand_choice', '5dc930e9-bd65-44a1-8369-af773f6e1a5b',
  jsonb_build_array(jsonb_build_object('brand_id', '9084bb1e-d847-4f27-b3b1-ed31dd1399ba',
    'element_id', (select c.id from platform.categories c where c.dimension = 'brand_element' and c.deleted_at is null limit 1),
    'value', '{"text":"Warm, plain-spoken"}'::jsonb, 'origin', 'team', 'decision', 'open')))$q$);
insert into _r select 'update', pg_temp._try(format($q$select platform.entity_update('web_brand_choice', %L, 1, '{"opinion_reason":"Matches how the founder talks"}')$q$,
  (select v #>> '{v,rows,0,id}' from _r where k = 'insert')));
insert into _r select 'stale', pg_temp._try(format($q$select platform.entity_update('web_brand_choice', %L, 1, '{"opinion_reason":"stale"}')$q$,
  (select v #>> '{v,rows,0,id}' from _r where k = 'insert')));
insert into _r select 'custom_value_refused', pg_temp._try(format($q$select platform.entity_update('web_brand_choice', %L, null, '{"_custom":{"tier":"gold"}}')$q$,
  (select v #>> '{v,rows,0,id}' from _r where k = 'insert')));
insert into _r select 'custom_door_refused', pg_temp._try($q$select to_jsonb(custom.entity_fields('5dc930e9-bd65-44a1-8369-af773f6e1a5b', 'web_brand_choice', false))$q$);
insert into _r select 'trash', pg_temp._try(format($q$select platform.entity_archive('web_brand_choice', array[%L]::uuid[])$q$,
  (select v #>> '{v,rows,0,id}' from _r where k = 'insert')));
insert into _r select 'custom_fields_table_same', pg_temp._try($q$select to_jsonb(x) from custom.entity_table('crm_deal') x$q$);
reset role;

select k, case
  when k = 'resolves_every_active_token' then jsonb_build_object('pass', v ->> 'active' = v ->> 'resolved', 'got', v)
  when k like 'describe:%' then jsonb_build_object('pass', (v ->> 'ok')::boolean and jsonb_array_length(v #> '{v,columns}') > 0,
                                                   'columns', jsonb_array_length(v #> '{v,columns}'), 'got', case when not (v ->> 'ok')::boolean then v end)
  when k = 'list:web_brand_choice' then jsonb_build_object('pass', (v ->> 'ok')::boolean, 'got', case when not (v ->> 'ok')::boolean then v end)
  when k = 'insert' then jsonb_build_object('pass', (v ->> 'ok')::boolean and v #>> '{v,rows,0,organization_id}' = '5dc930e9-bd65-44a1-8369-af773f6e1a5b'
                                            and v #>> '{v,rows,0,decision}' = 'open', 'got', case when not (v ->> 'ok')::boolean then v end)
  when k = 'update' then jsonb_build_object('pass', (v ->> 'ok')::boolean and (v #>> '{v,rows,0,version}')::int = 2, 'got', case when not (v ->> 'ok')::boolean then v end)
  when k = 'stale' then jsonb_build_object('pass', v ->> 'state' = 'MX001', 'got', v)
  when k = 'custom_value_refused' then jsonb_build_object('pass', v ->> 'state' = 'MX005' and v ->> 'message' like '%does not take custom fields%', 'got', v)
  when k = 'custom_door_refused' then jsonb_build_object('pass', v ->> 'state' = '23514' and v ->> 'message' like '%does not take custom fields%', 'got', v)
  when k = 'trash' then jsonb_build_object('pass', (v ->> 'ok')::boolean and v #>> '{v,message}' = 'Moved to trash', 'got', case when not (v ->> 'ok')::boolean then v end)
  when k = 'person_only_rule' then jsonb_build_object('pass', v ->> 'state' = '42501', 'got', v)
  when k = 'custom_fields_table_same' then jsonb_build_object('pass', v -> 'v' = '{"type": "entity", "label": "Deal", "token": "crm_deal", "table_name": "deal", "schema_name": "crm", "title_column": "name", "has_deleted_at": true, "has_organization": true}'::jsonb, 'got', v)
  end as result
from _r order by k;
rollback;

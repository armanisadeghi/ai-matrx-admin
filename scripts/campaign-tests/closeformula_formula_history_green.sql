-- LANE CLOSE-FORMULA — CD-FORMULA-08 (VISION Rule 8: "Rules have versions … and History knows which one produced a Value").
-- RED before 20261021190000_closeformula_a (custom.formula_history does not exist), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: made inside the transaction by admin@admin.com in the walk organization (a Deals table with Qty, Price and a
-- "Total" formula), so nothing is left behind. The formula is changed once and renamed once; the history must name
-- formula version 1 for the answers before the change and version 2 after, and a rename is not a new version.
do $t$
declare
  c_admin  constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_member constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  c_org    constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  v_made jsonb; v_t uuid; v_r uuid; v_total uuid; v_rows jsonb; v_msg text;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_made := custom.table_create(c_org,
    '{"name":"CF History proof","slug":"cf_history_proof","type":"entity","label_singular":"Deal","label_plural":"Deals","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"deal","retention_days":365,"agent_writable":true,"default_sort":[{"field":"deal","direction":"asc"}],"fields":[{"name":"deal"},{"name":"qty"},{"name":"price"}]}'::jsonb,
    '[{"key":"deal","label":"Deal","type":"text","sort":1},{"key":"qty","label":"Qty","plain":"number","sort":2},{"key":"price","label":"Price","plain":"number","sort":3}]'::jsonb);
  v_t := (v_made ->> 'table_id')::uuid;
  perform custom.field_declare(c_org, v_t, '{"key":"total","label":"Total","type":"formula","formula_text":"{Qty} * {Price}"}'::jsonb);
  select f.id into v_total from custom.record f
   where f.organization_id = c_org and f.table_id = custom.field_kernel_id() and (f.data ->> 'entity_definition_id')::uuid = v_t and f.data ->> 'key' = 'total';
  v_r := custom.record_write(c_org, v_t, '{"deal":"Tents","qty":3,"price":10}'::jsonb);
  perform custom.record_update(c_org, v_r, '{"qty":5}'::jsonb);                                         -- 50, version 1
  perform custom.field_update(c_org, v_total, '{"label":"Line total"}'::jsonb);                          -- a rename: no new version
  perform custom.field_update(c_org, v_total, '{"type":"formula","formula_text":"{Qty} * {Price} * 2"}'::jsonb);  -- 100, version 2
  perform custom.record_update(c_org, v_r, '{"price":11}'::jsonb);                                      -- 110, version 2
  perform custom.record_update(c_org, v_r, '{"deal":"Tents (4-person)"}'::jsonb);                       -- answer unchanged: no row

  perform set_config('role', 'authenticated', true);
  select jsonb_agg(jsonb_build_array(h.cause, h.formula_version, h.value) order by h.occurred_at desc, h.record_version desc, h.formula_version desc)
    into v_rows from custom.formula_history(c_org, v_r, 'total') h;
  if v_rows is distinct from '[["record edited",2,110],["formula changed",2,100],["record edited",1,50],["record created",1,30]]'::jsonb then
    raise exception '1: the formula history is wrong: %', v_rows;
  end if;
  raise notice '1 PASS admin: %', v_rows;

  begin
    perform 1 from custom.formula_history(c_org, v_r, 'qty');
    v_msg := null;
  exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '"Qty" holds what was typed into it%' then raise exception '2: a typed column was not refused by name: %', v_msg; end if;
  raise notice '2 PASS a typed column: %', v_msg;

  perform set_config('request.jwt.claims', c_member, true);
  select count(*)::text into v_msg from custom.formula_history(c_org, v_r, 'total');
  if v_msg <> '4' then raise exception '3: the member (Organization access) did not read the same history: % rows', v_msg; end if;
  raise notice '3 PASS member reads % rows', v_msg;
end
$t$;

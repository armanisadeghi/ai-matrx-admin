-- LANE CLOSE-FORMULA — CD-FORMULA-06 ("A formula column can be filtered like any other column": Total is 60.5).
-- RED before 20261022181500_closeformula_c_a (a worked-out number reads "60.50", the question "60.5", no row matches), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture made inside the transaction by admin@admin.com in the walk organization, so nothing is left behind.
do $t$
declare
  c_admin  constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_member constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  c_org    constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  v_d uuid; v_a uuid; v_ids uuid[]; v_total uuid; v_who text; v_got jsonb;
  -- the rows a filter answers, by name, in order
  names constant text := $q$select coalesce(jsonb_agg(r->'document'->>'deal' order by r->'document'->>'deal'), '[]'::jsonb)
                            from jsonb_array_elements(custom.read_records_page($1, $2, $3)->'rows') r$q$;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_d := (custom.table_create(c_org,
    '{"name":"CF Number proof deals","slug":"cf_number_proof_deals","type":"entity","label_singular":"Deal","label_plural":"Deals","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"deal","retention_days":365,"agent_writable":true,"default_sort":[{"field":"deal","direction":"asc"}],"fields":[{"name":"deal"},{"name":"amount"},{"name":"qty"},{"name":"price"}]}'::jsonb,
    '[{"key":"deal","label":"Deal","type":"text","sort":1},{"key":"amount","label":"Amount","parity_type":"currency","unit":"$","sort":2},{"key":"qty","label":"Qty","plain":"number","sort":3},{"key":"price","label":"Price","plain":"number","sort":4}]'::jsonb) ->> 'table_id')::uuid;
  perform custom.field_declare(c_org, v_d, '{"key":"total","label":"Total","type":"formula","formula_text":"ROUND({Qty} * {Price} * 1.1, 2)"}'::jsonb);
  v_ids := array[
    custom.record_write(c_org, v_d, '{"deal":"Tents","amount":1200,"qty":5,"price":11}'::jsonb),
    custom.record_write(c_org, v_d, '{"deal":"Boots","amount":800,"qty":2,"price":5}'::jsonb),
    custom.record_write(c_org, v_d, '{"deal":"Packs","amount":450.5,"qty":1,"price":7}'::jsonb),
    custom.record_write(c_org, v_d, '{"deal":"Stoves","amount":300,"qty":4,"price":2}'::jsonb)];
  v_a := (custom.table_create(c_org,
    format('{"name":"CF Number proof accounts","slug":"cf_number_proof_accounts","type":"entity","label_singular":"Account","label_plural":"Accounts","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"deal","retention_days":365,"agent_writable":true,"default_sort":[{"field":"deal","direction":"asc"}],"fields":[{"name":"deal"},{"name":"deals"}]}')::jsonb,
    format('[{"key":"deal","label":"Account","type":"text","sort":1},{"key":"deals","label":"Deals","type":"relation","relation_target":"%s","multi":true,"sort":2}]', v_d)::jsonb) ->> 'table_id')::uuid;
  perform custom.field_declare(c_org, v_a, '{"key":"deal_total","label":"Deal total","type":"rollup","via":"deals","agg":"sum","of":"total"}'::jsonb);
  perform custom.record_write(c_org, v_a, jsonb_build_object('deal','Juniper','deals',to_jsonb(v_ids[1:2])));
  perform custom.record_write(c_org, v_a, jsonb_build_object('deal','Alder','deals',to_jsonb(v_ids[3:3])));
  select f.id into v_total from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_d::text and f.data ->> 'key' = 'total';

  foreach v_who in array array['admin','member'] loop
    perform set_config('request.jwt.claims', case v_who when 'admin' then c_admin else c_member end, true);
    perform set_config('role', 'authenticated', true);
    -- 1. "Total is 60.5": the grid's one-column question is a flat equality
    execute names into v_got using c_org, v_d, '{"total":60.5}'::jsonb;
    if v_got is distinct from '["Tents"]'::jsonb then raise exception '1 %: Total is 60.5 answered %', v_who, v_got; end if;
    -- 2. "Total is 11" (ROUND gives 11.00)
    execute names into v_got using c_org, v_d, '{"total":11}'::jsonb;
    if v_got is distinct from '["Boots"]'::jsonb then raise exception '2 %: Total is 11 answered %', v_who, v_got; end if;
    -- 3. "Total is either" (the Values list ticks two)
    execute names into v_got using c_org, v_d, '{"total":[60.5, 11]}'::jsonb;
    if v_got is distinct from '["Boots","Tents"]'::jsonb then raise exception '3 %: Total is 60.5 or 11 answered %', v_who, v_got; end if;
    -- 4. "Total is none of"
    execute names into v_got using c_org, v_d, '{"total":{"is_not":[60.5]}}'::jsonb;
    if v_got is distinct from '["Boots","Packs","Stoves"]'::jsonb then raise exception '4 %: Total is not 60.5 answered %', v_who, v_got; end if;
    -- 5. the question asked with trailing zeros means the same number
    execute names into v_got using c_org, v_d, '{"total":60.50}'::jsonb;
    if v_got is distinct from '["Tents"]'::jsonb then raise exception '5 %: Total is 60.50 answered %', v_who, v_got; end if;
    -- 6. a stored number and a stored currency still answer
    execute names into v_got using c_org, v_d, '{"qty":5}'::jsonb;
    if v_got is distinct from '["Tents"]'::jsonb then raise exception '6 %: Qty is 5 answered %', v_who, v_got; end if;
    execute names into v_got using c_org, v_d, '{"amount":450.50}'::jsonb;
    if v_got is distinct from '["Packs"]'::jsonb then raise exception '7 %: Amount is 450.50 answered %', v_who, v_got; end if;
    -- 8. the Rule form was already right and stays right
    execute names into v_got using c_org, v_d, jsonb_build_object('op','eq','args',jsonb_build_array(jsonb_build_object('field',v_total),jsonb_build_object('const',60.5)));
    if v_got is distinct from '["Tents"]'::jsonb then raise exception '8 %: the Rule Total = 60.5 answered %', v_who, v_got; end if;
    -- 9. a roll-up of a formula is a number too: 60.50 + 11.00
    execute names into v_got using c_org, v_a, '{"deal_total":71.5}'::jsonb;
    if v_got is distinct from '["Juniper"]'::jsonb then raise exception '9 %: Deal total is 71.5 answered %', v_who, v_got; end if;
    -- 10. a text cell that happens to read like a number keeps its own words
    execute names into v_got using c_org, v_d, '{"deal":"Tents"}'::jsonb;
    if v_got is distinct from '["Tents"]'::jsonb then raise exception '10 %: Deal is Tents answered %', v_who, v_got; end if;
    raise notice '% PASS: 60.5, 11, either, none of, 60.50, stored qty and amount, the Rule, a roll-up of a formula, text', v_who;
  end loop;
end
$t$;

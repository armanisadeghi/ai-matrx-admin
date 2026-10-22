-- LANE CLOSE-FORMULA — CD-FORMULA-03 (VISION Doctrine 4.7 parity floor: "lookup, rollup").
-- RED before 20261021230000_closeformula_b_a (a lookup through a link holding four deals answers one email), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture made inside the transaction by admin@admin.com in the walk organization, so nothing is left behind.
do $t$
declare
  c_admin  constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_member constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  c_org    constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  v_d uuid; v_a uuid; v_ids uuid[] := '{}'; v_a1 uuid; v_a2 uuid; v_page jsonb; v_one jsonb; v_got jsonb; v_single jsonb; v_got_page jsonb;
  v_who text;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_d := (custom.table_create(c_org,
    '{"name":"CF Lookup proof deals","slug":"cf_lookup_proof_deals","type":"entity","label_singular":"Deal","label_plural":"Deals","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"deal","retention_days":365,"agent_writable":true,"default_sort":[{"field":"deal","direction":"asc"}],"fields":[{"name":"deal"},{"name":"contact_email"}]}'::jsonb,
    '[{"key":"deal","label":"Deal","type":"text","sort":1},{"key":"contact_email","label":"Contact email","parity_type":"email","sort":2}]'::jsonb) ->> 'table_id')::uuid;
  v_ids := array[
    custom.record_write(c_org, v_d, '{"deal":"Tents","contact_email":"tents@example.com"}'::jsonb),
    custom.record_write(c_org, v_d, '{"deal":"Boots","contact_email":"boots@example.com"}'::jsonb),
    custom.record_write(c_org, v_d, '{"deal":"Packs","contact_email":"packs@example.com"}'::jsonb)];
  v_a := (custom.table_create(c_org,
    format('{"name":"CF Lookup proof accounts","slug":"cf_lookup_proof_accounts","type":"entity","label_singular":"Account","label_plural":"Accounts","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"account","retention_days":365,"agent_writable":true,"default_sort":[{"field":"account","direction":"asc"}],"fields":[{"name":"account"},{"name":"deals"},{"name":"top_deal"}]}')::jsonb,
    format('[{"key":"account","label":"Account","type":"text","sort":1},{"key":"deals","label":"Deals","type":"relation","relation_target":"%s","multi":true,"sort":2},{"key":"top_deal","label":"Top deal","type":"relation","relation_target":"%s","sort":3}]', v_d, v_d)::jsonb) ->> 'table_id')::uuid;
  perform custom.field_declare(c_org, v_a, '{"key":"deal_emails","label":"Deal emails","type":"lookup","via":"deals","pick":"contact_email"}'::jsonb);
  perform custom.field_declare(c_org, v_a, '{"key":"top_email","label":"Top email","type":"lookup","via":"top_deal","pick":"contact_email"}'::jsonb);
  v_a1 := custom.record_write(c_org, v_a, jsonb_build_object('account','Juniper Outfitters','deals',to_jsonb(v_ids),'top_deal',v_ids[3]));
  v_a2 := custom.record_write(c_org, v_a, jsonb_build_object('account','Alder Supply','deals',to_jsonb(v_ids[1:1]),'top_deal',v_ids[1]));

  foreach v_who in array array['admin','member'] loop
    perform set_config('request.jwt.claims', case v_who when 'admin' then c_admin else c_member end, true);
    perform set_config('role', 'authenticated', true);
    -- the whole page at once (custom._page_derived_prefetch: two rows)
    v_page := custom.read_records_page(c_org, v_a);
    select r -> 'document' -> 'deal_emails', r -> 'document' -> 'top_email' into v_got, v_single
      from jsonb_array_elements(v_page -> 'rows') r where (r ->> 'id')::uuid = v_a1;
    if jsonb_typeof(v_got) is distinct from 'array'
       or (select jsonb_agg(e order by e) from jsonb_array_elements(v_got) e) is distinct from '["boots@example.com","packs@example.com","tents@example.com"]'::jsonb then
      raise exception '1 %: a page read of a lookup through three linked deals answered %', v_who, v_got;
    end if;
    v_got_page := v_got;
    if v_single is distinct from '"packs@example.com"'::jsonb then
      raise exception '2 %: a lookup through a one-record link stopped answering one value: %', v_who, v_single;
    end if;
    select r -> 'document' -> 'deal_emails' into v_got from jsonb_array_elements(v_page -> 'rows') r where (r ->> 'id')::uuid = v_a2;
    if v_got is distinct from '["tents@example.com"]'::jsonb then
      raise exception '3 %: a many-link holding one deal must still answer a list: %', v_who, v_got;
    end if;
    -- one row on its own (custom.lookup_value per row)
    perform set_config('role', 'postgres', true);
    v_one := custom.lookup_value(c_org, v_a1, (select f.data from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
                and f.data ->> 'entity_definition_id' = v_a::text and f.data ->> 'key' = 'deal_emails'));
    if v_one is distinct from v_got_page then
      raise exception '4 %: one row on its own answered % but the page answered %', v_who, v_one, v_got_page;
    end if;
    raise notice '% PASS page %, single %, one row %', v_who, v_page -> 'rows' -> 0 -> 'document' -> 'deal_emails', v_single, v_one;
  end loop;
end
$t$;

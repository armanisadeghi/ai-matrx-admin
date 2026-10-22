-- LANE CLOSE-LINK — CD-LINK-05 (VISION Rule 5: "binding: live (follows the target) or snapshot (freezes a copy at that moment)").
-- An invoice whose "Bill to" keeps a copy shows the address the client had when it was linked; a live link shows today's.
-- RED before 20261021233000_closelink_c (field_update has no "binding" setting, and a snapshot lookup follows the new address), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture made inside the transaction by admin@admin.com in the walk organization, so nothing is left behind.
do $t$
declare
  c_admin  constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_member constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  c_org    constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  v_c uuid; v_i uuid; v_client uuid; v_inv uuid; v_inv2 uuid; v_page jsonb; v_live jsonb; v_snap jsonb; v_msg text; v_bill uuid;
  v_who text;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_c := (custom.table_create(c_org,
    '{"name":"CL Snapshot clients","slug":"cl_snapshot_clients","type":"entity","label_singular":"Client","label_plural":"Clients","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"name","retention_days":365,"agent_writable":true,"default_sort":[{"field":"name","direction":"asc"}],"fields":[{"name":"name"},{"name":"address"}]}'::jsonb,
    '[{"key":"name","label":"Name","type":"text","sort":1},{"key":"address","label":"Address","type":"text","sort":2}]'::jsonb) ->> 'table_id')::uuid;
  v_i := (custom.table_create(c_org,
    '{"name":"CL Snapshot invoices","slug":"cl_snapshot_invoices","type":"entity","label_singular":"Invoice","label_plural":"Invoices","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"invoice","retention_days":365,"agent_writable":true,"default_sort":[{"field":"invoice","direction":"asc"}],"fields":[{"name":"invoice"},{"name":"client"},{"name":"bill_to"}]}'::jsonb,
    format('[{"key":"invoice","label":"Invoice","type":"text","sort":1},{"key":"client","label":"Client","type":"relation","relation_target":"%s","sort":2},{"key":"bill_to","label":"Bill to","type":"relation","relation_target":"%s","sort":3}]', v_c, v_c)::jsonb) ->> 'table_id')::uuid;
  perform custom.field_declare(c_org, v_i, '{"key":"client_address","label":"Client address","type":"lookup","via":"client","pick":"address"}'::jsonb);
  perform custom.field_declare(c_org, v_i, '{"key":"bill_address","label":"Bill-to address","type":"lookup","via":"bill_to","pick":"address"}'::jsonb);
  select f.id into v_bill from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_i::text and f.data ->> 'key' = 'bill_to';

  v_client := custom.record_write(c_org, v_c, '{"name":"Harbor Bakery","address":"12 March St"}'::jsonb);
  -- 1. an invoice linked BEFORE "Bill to" keeps a copy: turning snapshot on takes a copy of every link already there
  v_inv := custom.record_write(c_org, v_i, jsonb_build_object('invoice', 'INV-1', 'client', v_client, 'bill_to', v_client));
  perform custom.field_update(c_org, v_bill, '{"binding":"snapshot"}'::jsonb);
  if (select f.data -> 'config' ->> 'binding' from custom.record f where f.organization_id = c_org and f.id = v_bill) is distinct from 'snapshot' then
    raise exception '1: binding was not kept on the field';
  end if;
  -- 2. an invoice linked AFTER takes its copy when the link is made
  v_inv2 := custom.record_write(c_org, v_i, jsonb_build_object('invoice', 'INV-2', 'client', v_client, 'bill_to', v_client));
  -- the client moves
  perform custom.record_update(c_org, v_client, '{"address":"9 April Ave"}'::jsonb, null);

  foreach v_who in array array['admin', 'member'] loop
    perform set_config('request.jwt.claims', case v_who when 'admin' then c_admin else c_member end, true);
    perform set_config('role', 'authenticated', true);
    v_page := custom.read_records_page(c_org, v_i);
    perform set_config('role', 'postgres', true);
    if v_who = 'member' and jsonb_array_length(coalesce(v_page -> 'rows', '[]'::jsonb)) = 0 then
      raise notice 'member: sees no invoices in this table (not shared), so only the admin answers are checked';
      continue;
    end if;
    select r -> 'document' -> 'client_address', r -> 'document' -> 'bill_address' into v_live, v_snap
      from jsonb_array_elements(v_page -> 'rows') r where (r ->> 'id')::uuid = v_inv;
    if v_live is distinct from '"9 April Ave"'::jsonb then raise exception '3 %: the live link shows %, not the new address', v_who, v_live; end if;
    if v_snap is distinct from '"12 March St"'::jsonb then raise exception '4 %: INV-1 (linked before snapshot) shows %, not the March address', v_who, v_snap; end if;
    select r -> 'document' -> 'bill_address' into v_snap from jsonb_array_elements(v_page -> 'rows') r where (r ->> 'id')::uuid = v_inv2;
    if v_snap is distinct from '"12 March St"'::jsonb then raise exception '5 %: INV-2 (linked after) shows %, not the March address', v_who, v_snap; end if;
    raise notice '% PASS live %, snapshot %', v_who, v_live, v_snap;
  end loop;
  perform set_config('request.jwt.claims', c_admin, true);

  -- 6. one row on its own (custom.lookup_value, no page prefetch) answers the same
  v_snap := custom.lookup_value(c_org, v_inv2, (select f.data from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
              and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_i::text and f.data ->> 'key' = 'bill_address'));
  if v_snap is distinct from '"12 March St"'::jsonb then raise exception '6: one row on its own answered %', v_snap; end if;

  -- 7. unlink then link again: a new link takes today's copy
  perform custom.record_update(c_org, v_inv2, '{"bill_to":null}'::jsonb, null);
  perform custom.record_update(c_org, v_inv2, jsonb_build_object('bill_to', v_client), null);
  v_snap := custom.lookup_value(c_org, v_inv2, (select f.data from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
              and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_i::text and f.data ->> 'key' = 'bill_address'));
  if v_snap is distinct from '"9 April Ave"'::jsonb then raise exception '7: a link made again shows %, not today''s address', v_snap; end if;

  -- 8. back to live: the lookup follows the record again
  perform custom.field_update(c_org, v_bill, '{"binding":"live"}'::jsonb);
  perform custom.record_update(c_org, v_client, '{"address":"3 May Rd"}'::jsonb, null);
  v_snap := custom.lookup_value(c_org, v_inv, (select f.data from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
              and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_i::text and f.data ->> 'key' = 'bill_address'));
  if v_snap is distinct from '"3 May Rd"'::jsonb then raise exception '8: back on live, INV-1 shows %', v_snap; end if;

  -- 9. a column that is not a link is refused by name; a word that is not live or snapshot is refused
  v_msg := null;
  begin perform custom.field_update(c_org, (select f.id from custom.record f where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
              and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_i::text and f.data ->> 'key' = 'invoice'), '{"binding":"snapshot"}'::jsonb);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%Invoice%' then raise exception '9: a text column said %', coalesce(v_msg, 'nothing'); end if;
  v_msg := null;
  begin perform custom.field_update(c_org, v_bill, '{"binding":"frozen"}'::jsonb); exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '9: binding "frozen" was accepted'; end if;
  raise notice 'PASS all';
end
$t$;

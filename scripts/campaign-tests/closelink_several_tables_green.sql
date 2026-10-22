-- LANE CLOSE-LINK — CD-LINK-04: a link column made with one table can point at several (VISION Rule 5 "target: one Table, several, or any").
-- RED before 20261022010000_closelink_g (field_update refuses "target_tables" as an unknown setting), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: admin@admin.com's disposable tables "CL Bookings 9ta" (link "Client" -> "CL Clients 9ta"), "CL Vendors 9ta", "CL Other 7dd" (lane CLOSE-LINK).
do $t$
declare
  c_admin   constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_org     constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_clients constant uuid := '475d36ce-7e0e-4914-bb2e-f9372f999e48';
  c_vendors constant uuid := '5f0c5f8d-4f56-4cf7-a66b-ea5c985eba92';
  c_other   constant uuid := '3944496a-48b6-416d-8b88-36c754ee3304';
  c_link    constant uuid := 'c19ea3a0-fb6b-4af1-bfba-79c2bf306ace';  -- CL Bookings . Client
  c_title   constant uuid := '30b0d4c3-e234-4e01-9432-dc301857a327';  -- CL Bookings . Title (text)
  c_booking constant uuid := '794ca9c7-36d1-4f69-9585-611222444295';  -- "Summer order"
  c_vendor  constant uuid := '252781d9-ac57-4206-a124-a7976d58862f';  -- "Ridge Flour Co"
  c_stray   constant uuid := 'd2814cb1-ecfc-4b6f-aae6-1f0b6670ed34';  -- "Stray" (CL Other)
  v_cfg jsonb; v_msg text; v_ver integer; v_decl jsonb;
begin
  perform set_config('request.jwt.claims', c_admin, true);

  -- 1. the link points at its own table and the vendors: target_mode several, its own table first
  perform custom.field_update(c_org, c_link, jsonb_build_object('target_tables', jsonb_build_array(c_vendors)));
  select r.data -> 'config' into v_cfg from custom.record r where r.id = c_link;
  if v_cfg ->> 'target_mode' is distinct from 'several' or v_cfg -> 'target_tables' <> jsonb_build_array(c_clients, c_vendors) then
    raise exception '1: config is %', v_cfg; end if;
  v_decl := platform.relation_declaration(c_org, c_link);
  if v_decl ->> 'target_mode' <> 'several' then raise exception '1: the declaration still says %', v_decl ->> 'target_mode'; end if;
  raise notice '1 PASS: Client points at CL Clients and CL Vendors';

  -- 2. a vendor can now be linked; a record of a table it does not name is refused naming both tables
  select r.version into v_ver from custom.record r where r.id = c_booking;
  perform custom.record_update(c_org, c_booking, jsonb_build_object('client', c_vendor), v_ver);
  if (select r.data ->> 'client' from custom.record r where r.id = c_booking) is distinct from c_vendor::text then
    raise exception '2: the vendor link did not land'; end if;
  v_msg := null;
  select r.version into v_ver from custom.record r where r.id = c_booking;
  begin perform custom.record_update(c_org, c_booking, jsonb_build_object('client', c_stray), v_ver); exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%CL Clients%' or v_msg not like '%CL Vendors%' then
    raise exception '2: a record of a third table said %', coalesce(v_msg, 'nothing'); end if;
  raise notice '2 PASS: a vendor links; a third table is refused: %', v_msg;

  -- 3. the vendors cannot be dropped while a link points into them, named
  v_msg := null;
  begin perform custom.field_update(c_org, c_link, '{"target_tables":null}'); exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%CL Vendors%' then raise exception '3: dropping a table in use said %', coalesce(v_msg, 'nothing'); end if;
  raise notice '3 PASS: %', v_msg;

  -- 4. a table of no organization of ours, and a column that is not a link, are refused
  v_msg := null;
  begin perform custom.field_update(c_org, c_link, '{"target_tables":["00000000-0000-4000-8000-000000000000"]}'); exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '4: an unknown table was accepted'; end if;
  v_msg := null;
  begin perform custom.field_update(c_org, c_title, jsonb_build_object('target_tables', jsonb_build_array(c_vendors))); exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%Title%' then raise exception '4: a text column said %', coalesce(v_msg, 'nothing'); end if;
  raise notice '4 PASS: unknown table and text column refused';

  -- 5. take the vendor link off, then one table again is target_mode one
  select r.version into v_ver from custom.record r where r.id = c_booking;
  perform custom.record_update(c_org, c_booking, '{"client":null}'::jsonb, v_ver);
  perform custom.field_update(c_org, c_link, '{"target_tables":[]}');
  select r.data -> 'config' into v_cfg from custom.record r where r.id = c_link;
  if v_cfg ? 'target_mode' or v_cfg ? 'target_tables' then raise exception '5: config is still %', v_cfg; end if;
  raise notice '5 PASS: back to one table';
  raise notice 'PASS all';
end
$t$;

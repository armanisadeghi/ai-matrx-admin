-- LANE CLOSE-LINK — CD-LINK-03: a link column's choices can be limited to a saved view of the table it points at.
-- RED before 20261021150000_closelink_b (field_update refuses "limit_to_view" as an unknown setting), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: admin@admin.com's disposable tables "CL Bookings" (link "Client" -> "CL Clients") and "CL Vendors" (lane CLOSE-LINK).
do $t$
declare
  c_admin   constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_org     constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_clients constant uuid := '475d36ce-7e0e-4914-bb2e-f9372f999e48';
  c_vendors constant uuid := '5f0c5f8d-4f56-4cf7-a66b-ea5c985eba92';
  c_link    constant uuid := 'c19ea3a0-fb6b-4af1-bfba-79c2bf306ace';  -- CL Bookings . Client
  c_title   constant uuid := '30b0d4c3-e234-4e01-9432-dc301857a327';  -- CL Bookings . Title (text)
  v_view uuid; v_other uuid; v_cfg jsonb; v_msg text;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_view  := custom.view_declare(c_org, c_clients, '{"name":"Active clients","filters":{"address":"9 April Ave"}}');
  v_other := custom.view_declare(c_org, c_vendors, '{"name":"All vendors"}');

  -- 1. limit the link to a view of its own target table: stored in config.limit_to_view
  perform custom.field_update(c_org, c_link, jsonb_build_object('limit_to_view', v_view));
  select r.data -> 'config' into v_cfg from custom.record r where r.id = c_link;
  if v_cfg ->> 'limit_to_view' is distinct from v_view::text then raise exception '1: config.limit_to_view is %', v_cfg ->> 'limit_to_view'; end if;

  -- 2. a view of another table is refused by name, and the saved limit is unchanged
  v_msg := null;
  begin perform custom.field_update(c_org, c_link, jsonb_build_object('limit_to_view', v_other)); exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%All vendors%' then raise exception '2: a view of another table said %', coalesce(v_msg, 'nothing'); end if;
  select r.data -> 'config' into v_cfg from custom.record r where r.id = c_link;
  if v_cfg ->> 'limit_to_view' is distinct from v_view::text then raise exception '2: the refused change moved the limit to %', v_cfg ->> 'limit_to_view'; end if;

  -- 3. a column that is not a link is refused by name
  v_msg := null;
  begin perform custom.field_update(c_org, c_title, jsonb_build_object('limit_to_view', v_view)); exception when others then v_msg := sqlerrm; end;
  if v_msg is null or v_msg not like '%Title%' then raise exception '3: a text column said %', coalesce(v_msg, 'nothing'); end if;

  -- 4. an unknown id is refused
  v_msg := null;
  begin perform custom.field_update(c_org, c_link, '{"limit_to_view":"00000000-0000-4000-8000-000000000000"}'); exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception '4: an unknown view was accepted'; end if;

  -- 5. null takes the limit off
  perform custom.field_update(c_org, c_link, '{"limit_to_view":null}');
  select r.data -> 'config' into v_cfg from custom.record r where r.id = c_link;
  if v_cfg ? 'limit_to_view' then raise exception '5: the limit is still %', v_cfg ->> 'limit_to_view'; end if;
end
$t$;

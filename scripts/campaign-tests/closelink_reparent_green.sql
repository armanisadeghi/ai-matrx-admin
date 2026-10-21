-- LANE CLOSE-LINK — CD-LINK-07 (acceptance test 3, Reparent): a record moves under another record, never under itself or
-- under a record that sits inside it. RED before 20261021140000_closelink_a (the move under a descendant commits), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: admin@admin.com's disposable table "CL Clients" (lane CLOSE-LINK) in the walk organization; rows are made in the transaction.
do $t$
declare
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_tab   constant uuid := '475d36ce-7e0e-4914-bb2e-f9372f999e48';
  v_project_x uuid; v_project_y uuid; v_class uuid; v_assignment uuid; v_msg text; v_parent text;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_project_x  := custom.record_write(c_org, c_tab, '{"name":"Project X"}');
  v_project_y  := custom.record_write(c_org, c_tab, '{"name":"Project Y"}');
  v_class      := custom.record_write(c_org, c_tab, '{"name":"Class 101"}');
  v_assignment := custom.record_write(c_org, c_tab, '{"name":"Assignment 4"}');
  perform custom.record_reparent(c_org, v_class, v_project_x);
  perform custom.record_reparent(c_org, v_assignment, v_class);

  -- 1. Move Class 101 under Project Y: it commits, and its one parent is now Project Y
  perform custom.record_reparent(c_org, v_class, v_project_y);
  select r.data ->> 'parent_id' into v_parent from custom.record r where r.id = v_class;
  if v_parent is distinct from v_project_y::text then raise exception '1: Class 101 parent is %, not Project Y', v_parent; end if;

  -- 2. Move Class 101 under Assignment 4 (its own child): refused, naming both, nothing moved
  v_msg := null;
  begin
    perform custom.record_reparent(c_org, v_class, v_assignment);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null then raise exception '2: moving Class 101 under its own child Assignment 4 was not refused'; end if;
  if v_msg not like '%Class 101%' or v_msg not like '%Assignment 4%' then raise exception '2: the refusal does not name both records: %', v_msg; end if;
  select r.data ->> 'parent_id' into v_parent from custom.record r where r.id = v_class;
  if v_parent is distinct from v_project_y::text then raise exception '2: the refused move still changed the parent to %', v_parent; end if;

  -- 3. Move Project Y under Assignment 4 (a grandchild): refused too
  v_msg := null;
  begin
    perform custom.record_reparent(c_org, v_project_y, v_assignment);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null then raise exception '3: moving Project Y under its grandchild was not refused'; end if;

  -- 4. Under itself: refused
  v_msg := null;
  begin
    perform custom.record_reparent(c_org, v_class, v_class);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null or v_msg not like '%itself%' then raise exception '4: moving a record under itself said %', coalesce(v_msg, 'nothing'); end if;

  -- 5. Out of every parent: allowed
  perform custom.record_reparent(c_org, v_class, null);
  select r.data ->> 'parent_id' into v_parent from custom.record r where r.id = v_class;
  if v_parent is not null then raise exception '5: Class 101 still has a parent %', v_parent; end if;
  raise notice 'refusal said: %', (select 'ok');
end
$t$;

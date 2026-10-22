-- LANE CLOSE-VIEW — CD-VIEW-13 ("A whole view can be read as of a past date": rows show their values as they were then).
-- A past page of a table lists only the rows that were there then, so a page is full and agrees with the pager's count
-- (custom.record_aggregate_as_of). RED before 20261022000000_closeview_a: custom.query_table_as_of paged over TODAY's rows,
-- newest first, so rows made after the moment came back as blank rows (data null) that the client dropped — a past
-- page of a busy table could be empty while its count said 6. GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture made inside the transaction by admin@admin.com in the walk organization, so nothing is left behind.
do $t$
declare
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  v_t uuid; v_old uuid; v_new1 uuid; v_new2 uuid; v_at timestamptz := now() + interval '1 minute';
  v_page int; v_blank int; v_count bigint; v_first jsonb;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  v_t := (custom.table_create(c_org,
    '{"name":"CV As of page","slug":"cv_asof_page","type":"entity","label_singular":"Visit","label_plural":"Visits","display":"list","weight":"light","ordered":false,"row_order":"manual","title_field":"name","retention_days":365,"agent_writable":true,"default_sort":[{"field":"name","direction":"asc"}],"fields":[{"name":"name"}]}'::jsonb,
    '[{"key":"name","label":"Name","type":"text","sort":1}]'::jsonb) ->> 'table_id')::uuid;
  v_old  := custom.record_write(c_org, v_t, '{"name":"Booked before"}'::jsonb);
  v_new1 := custom.record_write(c_org, v_t, '{"name":"Booked after 1"}'::jsonb);
  v_new2 := custom.record_write(c_org, v_t, '{"name":"Booked after 2"}'::jsonb);
  -- Two visits are booked AFTER the moment asked about (an hour on): their history moves past it.
  update history.row_versions set occurred_at = now() + interval '1 hour' where entity_type = 'custom.record' and row_id in (v_new1, v_new2);

  raise notice 'versions: %', (select jsonb_agg(jsonb_build_object('row', rv.row_id = v_old, 'v', rv.version, 'at', rv.occurred_at)) from history.row_versions rv where rv.entity_type = 'custom.record' and rv.row_id in (v_old, v_new1, v_new2));
  perform set_config('role', 'authenticated', true);
  select count(*), count(*) filter (where d.data is null), (array_agg(d.data))[1]
    into v_page, v_blank, v_first
    from custom.query_table_as_of(c_org, v_t, v_at, null, 1, 0, 'viewer') d;
  select a.row_count into v_count from custom.record_aggregate_as_of(c_org, v_t, v_at, 'count', null, null, null) a;
  raise notice 'page of 1 as of the moment: % row(s), % blank; first = %; count then = %', v_page, v_blank, v_first ->> 'name', v_count;
  if v_count <> 1 then raise exception 'the count then should be 1, it is %', v_count; end if;
  if v_blank > 0 or v_first ->> 'name' is distinct from 'Booked before' then
    raise exception 'a past page of one row should be "Booked before"; it came back % blank row(s), first %', v_blank, coalesce(v_first ->> 'name', 'nothing');
  end if;
  select count(*) into v_page from custom.query_table_as_of(c_org, v_t, v_at, null, 50, 0, 'viewer') d;
  if v_page <> v_count then raise exception 'the past page holds % rows but the count then is %', v_page, v_count; end if;
  -- Today still reads every row.
  select count(*) into v_page from custom.query_table_as_of(c_org, v_t, null, null, 50, 0, 'viewer') d where d.data is not null;
  if v_page <> 3 then raise exception 'today should read 3 rows, it read %', v_page; end if;
  raise notice 'GREEN: a past page lists only the rows there were then, and agrees with the count';
end
$t$;

-- chair-step: inverse of storereadperf7_every_table_counted_on_one_walk.sql — restores the one body it replaced verbatim (custom.table_row_counts, as gridprim_every_table_counts_its_rows_and_every_row_shows_its_header.sql left it); same signature, owner, grants and door row; nothing else touched.
-- lane: STORE-READ-PERF-7
-- based-on: custom.table_row_counts(uuid, uuid[]) 816f098dd24b85d4f8e64c640c3d3849b040880d6900ca75f291c4b52fdee442

CREATE OR REPLACE FUNCTION custom.table_row_counts(p_organization_id uuid, p_table_ids uuid[])
 RETURNS TABLE(table_id uuid, visible_rows bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_row_counts');
  if coalesce(cardinality(p_table_ids), 0) > 500 then
    raise exception 'One call counts at most 500 tables; this one named %.', cardinality(p_table_ids)
      using errcode = '54000', hint = 'Ask for the tables a screen shows, a page at a time. Nothing was counted.';
  end if;

  for v_t in
    select distinct t.id
      from unnest(coalesce(p_table_ids, '{}'::uuid[])) as a(id)
      join custom.record t on t.organization_id = p_organization_id and t.id = a.id
     where t.table_id = custom.table_kernel_id() and t.data_class = 'table' and t.deleted_at is null
  loop
    begin
      perform custom.assert_may_know_table(p_organization_id, v_t, 'custom.table_row_counts');
    exception when insufficient_privilege then
      continue;   -- a Table this reader may not know is answered exactly like an invented id
    end;
    table_id := v_t;
    select count(*) into visible_rows from custom.query_visible_ids(p_organization_id, v_t, 'viewer');
    return next;
  end loop;
end
$function$;

-- Lane CLOSE-VIEW (CD-VIEW-13, "A whole view can be read as of a past date": rows show their values as they were then). custom.query_table_as_of (REPLACED by body) paged over the rows that exist TODAY, newest first, and asked each one what it said at the moment; a row made after the moment answered null and the client dropped it, so a past page of a busy table came back short or empty while the pager (custom.record_aggregate_as_of, which counts only rows with a version at or before the moment) said how many there were then. On the record clock the page now lists only rows that have a version at or before the moment, before it is cut into pages, so the page and the count agree. The world clock is unchanged (it reads today's rows). Inverse: migrations/inverse/20261022000000_closeview_a_a_past_page_lists_only_the_rows_there_were_then_down.sql.
-- lane: close-view
-- lock: custom
-- based-on: custom.query_table_as_of(uuid, uuid, timestamp with time zone, date, integer, integer, text) f17f840b046764e116dfd65ccc3a71ea71d8d7f950982a63a7be856c3fe841c2
--
-- Test: scripts/campaign-tests/closeview_asof_page_green.sql (RED before: "a past page of one row should be \"Booked before\"; it came back 1 blank row(s)").

set lock_timeout = '3s';
set statement_timeout = '120s';

CREATE OR REPLACE FUNCTION custom.query_table_as_of(p_organization_id uuid, p_table_id uuid, p_recorded_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_world_on date DEFAULT NULL::date, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_required text DEFAULT 'viewer'::text)
 RETURNS TABLE(record_id uuid, data jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.query_table_as_of');
  return query
select v, custom.query_record_as_of(p_organization_id, v, p_recorded_at, p_world_on, p_required)
    from custom.query_visible_ids(p_organization_id, p_table_id, p_required) v
    join custom.record r on r.organization_id = p_organization_id and r.id = v
   -- CD-VIEW-13: on the record clock, only the rows there were at the moment (a version at or before it),
   -- the same set custom.record_aggregate_as_of counts, so a past page is never padded with rows made later.
   where p_recorded_at is null
      or exists (select 1 from history.row_versions rv
                  where rv.entity_type = 'custom.record' and rv.row_id = v and rv.occurred_at <= p_recorded_at)
   order by r.created_at desc, r.id
   limit custom.page_size(p_organization_id, 'custom.query_table_as_of', p_limit, 50)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

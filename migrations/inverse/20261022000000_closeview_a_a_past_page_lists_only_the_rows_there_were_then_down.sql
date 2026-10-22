-- Inverse of migrations/campaign/20261022000000_closeview_a_a_past_page_lists_only_the_rows_there_were_then.sql (lane CLOSE-VIEW, CD-VIEW-13):
-- puts back custom.query_table_as_of exactly as it was live before (pages over today's rows on every clock).
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
   order by r.created_at desc, r.id
   limit custom.page_size(p_organization_id, 'custom.query_table_as_of', p_limit, 50)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

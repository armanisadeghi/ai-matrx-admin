-- lane: ENRICH-SPEED
-- Inverse of enrich_the_whole_organization_list_is_one_tally.sql: puts back the body that asked the per-row ladder for every Table (before the tally change).
-- based-on: custom.enrichments(uuid, uuid) 9147cff7e5644c4a8fdd5261b755b3cd1bcff28cb06511c823f968a6a67c6b57
CREATE OR REPLACE FUNCTION custom.enrichments(p_organization_id uuid, p_table_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(field_id uuid, table_id uuid, field_key text, label text, enrichment jsonb, enabled boolean, review_interval_days integer, rows_total integer, rows_filled integer, rows_stale integer, rows_pinned integer, rows_absent integer, runs integer, cost_cents numeric, cost_per_row_cents numeric, last_run_at timestamp with time zone, last_run jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.enrichments');
  -- VIS-5 / T10 (LADDER-CAP): and the wall after it — a Table she may not know exists is
  -- not described to her. Null Table = list everything, and this returns early on that.
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.enrichments');

  return query
  with fields as (
    select f.id as fid,
           (f.data ->> 'entity_definition_id')::uuid as tid,
           f.data ->> 'key'   as fkey,
           coalesce(f.data ->> 'label', f.data ->> 'key') as flabel,
           coalesce(f.data -> 'source_config', '{}'::jsonb) as cfg,
           nullif(f.data ->> 'review_interval_days', '')::integer as every
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and f.data ->> 'source' = 'agent'
       -- CONF-STRUCTURE: a Confidential table's columns are named only to a person the knob lets see them.
       and custom.may_see_table_structure(p_organization_id, (f.data ->> 'entity_definition_id')::uuid)
       and (p_table_id is null or (f.data ->> 'entity_definition_id')::uuid = p_table_id)
       -- ONLY OVER TABLES THIS CALLER CAN ALREADY OPEN (VIS-5), so the list of what a model
       -- fills in is never a second way to learn that a Table exists.
       and (f.data ->> 'entity_definition_id')::uuid
             in (select v from custom.query_visible_ids(p_organization_id, custom.table_kernel_id()) v)
  ),
  cells as (
    select fl.fid,
           count(*)::integer as n_total,
           count(*) filter (where r.data ? fl.fkey
                              and jsonb_typeof(r.data -> fl.fkey) <> 'null')::integer as n_filled,
           count(*) filter (where coalesce((r.data -> '_values' -> fl.fkey ->> 'pinned')::boolean, false))::integer as n_pinned,
           count(*) filter (where nullif(r.data -> '_values' -> fl.fkey ->> 'absent', '') is not null)::integer as n_absent,
           count(*) filter (where fl.every is not null
                              and (r.data -> '_values' -> fl.fkey ->> 'at') is not null
                              and (r.data -> '_values' -> fl.fkey ->> 'at')::timestamptz
                                    + make_interval(days => fl.every) < now())::integer as n_stale
      from fields fl
      join custom.record r
        on r.organization_id = p_organization_id
       and r.table_id = fl.tid
       and r.deleted_at is null
       and r.data_class = 'record'
       and r.id in (select v from custom.query_visible_ids(p_organization_id, fl.tid) v)
     group by fl.fid
  ),
  runs as (
    select (x.data ->> 'field_id')::uuid as fid,
           count(*)::integer             as n_runs,
           sum(coalesce((x.data ->> 'cost_cents')::numeric, 0))   as spend,
           sum(coalesce((x.data ->> 'rows_written')::numeric, 0)) as written,
           max(x.created_at)             as last_at
      from custom.record x
     where x.organization_id = p_organization_id
       and x.table_id = custom.organization_kernel_id()
       and x.data_class = custom.enrich_run_class()
       and x.deleted_at is null
     group by 1
  ),
  last_one as (
    select distinct on ((x.data ->> 'field_id')::uuid)
           (x.data ->> 'field_id')::uuid as fid, x.data as doc
      from custom.record x
     where x.organization_id = p_organization_id
       and x.table_id = custom.organization_kernel_id()
       and x.data_class = custom.enrich_run_class()
       and x.deleted_at is null
     order by (x.data ->> 'field_id')::uuid, x.created_at desc
  )
  select fl.fid, fl.tid, fl.fkey, fl.flabel, fl.cfg,
         coalesce((fl.cfg ->> 'enabled')::boolean, false),
         fl.every,
         coalesce(c.n_total, 0), coalesce(c.n_filled, 0), coalesce(c.n_stale, 0),
         coalesce(c.n_pinned, 0), coalesce(c.n_absent, 0),
         coalesce(rn.n_runs, 0), coalesce(rn.spend, 0),
         case when coalesce(rn.written, 0) > 0
              then round(coalesce(rn.spend, 0) / rn.written, 4) end,
         rn.last_at, lo.doc
    from fields fl
    left join cells c   on c.fid  = fl.fid
    left join runs rn   on rn.fid = fl.fid
    left join last_one lo on lo.fid = fl.fid
   order by fl.flabel;
end;
$function$;

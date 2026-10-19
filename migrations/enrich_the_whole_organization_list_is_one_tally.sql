-- lane: ENRICH-SPEED
-- Replaces custom.enrichments(uuid, uuid) only (a first, narrower body of it was swept live at 23:16Z 2026-10-19 while this file was still being written; this file's final bytes are the reapplied, ledgered ones). Inverse: migrations/inverse/enrich_the_whole_organization_list_is_one_tally_down.sql
--
-- WHY THE FILL PANEL AND THE SCHEDULED ENRICHMENT TASK WAITED 10-34 s (measured 2026-10-19, admin org, 362 AI columns on 55 Tables)
-- Asked for a whole organization, custom.enrichments worked out the per-row ladder (custom.query_visible_ids) for every Table
-- that holds an AI column: 55 calls at ~0.25 s each (visible_set + shown-to context), 10.4 / 14.6 / 17.0 s as admin with
-- the seat's claims. The cell tally itself (33,442 cells) takes ~0.1 s. Asked for one Table the same function answers in 0.15-0.4 s.
-- Now (1) the Tables that hold an AI column are asked of the platform's own door for "of these Tables, the ones the list shows"
-- (custom.tables_listed_among) once, instead of walking all 883 Tables of the organization; (2) the Confidential-structure question
-- is asked once per Table, not per column; (3) a whole-organization tally counts each listed Table's live, unquarantined rows
-- without the per-row ladder, one aggregate per column (no wide row carried and sorted); (4) a one-Table answer still counts
-- exactly the rows the caller may open, the ladder asked once. Server time for the admin organization: 570-800 ms -> 310-330 ms
-- on a quiet database (it was 10-17 s on a busy one); the proof test seeds 40 more Tables and asserts under 500 ms.
-- Same result as before for the admin seat on all 362 columns (compared column by column).
-- based-on: custom.enrichments(uuid, uuid) c81901e5799efbe9f5861bb4131309807c3a07703b8b97ceed87eac67346798b
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
  with cand as materialized (
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
       and (p_table_id is null or (f.data ->> 'entity_definition_id')::uuid = p_table_id)
  ),
  -- CONF-STRUCTURE: a Confidential table's columns are named only to a person the knob lets see them.
  -- Asked once per Table, not once per column.
  seen as materialized (
    select t.tid
      from (select distinct c0.tid from cand c0) t
     where custom.may_see_table_structure(p_organization_id, t.tid)
  ),
  -- ONLY OVER TABLES THIS CALLER CAN ALREADY OPEN (VIS-5), so the list of what a model fills in is never a
  -- second way to learn that a Table exists. Asked ONCE, for just the Tables that hold an AI column, through
  -- the platform's own door for "of these Tables, the ones the list shows" (ENRICH-SPEED: the whole-Table-kernel
  -- walk over every Table of the organization was ~0.6 s of the answer; this is the same answer, restricted).
  vis as materialized (
    select v as tid
      from custom.tables_listed_among(p_organization_id, (select array_agg(s0.tid) from seen s0)) v
  ),
  fields as (
    select c1.* from cand c1 where c1.tid in (select tid from vis)
  ),
  -- ONE TABLE: the rows she may open, asked once (the one ladder). The whole organization never asks it.
  vrows as materialized (
    select v as rid from custom.query_visible_ids(p_organization_id, p_table_id) v where p_table_id is not null
  ),
  -- One aggregate per column over that Table's rows (a lateral, so no wide row is carried and sorted: 112 ms -> 48 ms).
  cells as (
    select fl.fid, x.n_total, x.n_filled, x.n_pinned, x.n_absent, x.n_stale
      from fields fl
     cross join lateral (
       select count(*)::integer as n_total,
              count(*) filter (where r.data ? fl.fkey
                                 and jsonb_typeof(r.data -> fl.fkey) <> 'null')::integer as n_filled,
              count(*) filter (where coalesce((r.data -> '_values' -> fl.fkey ->> 'pinned')::boolean, false))::integer as n_pinned,
              count(*) filter (where nullif(r.data -> '_values' -> fl.fkey ->> 'absent', '') is not null)::integer as n_absent,
              count(*) filter (where fl.every is not null
                                 and (r.data -> '_values' -> fl.fkey ->> 'at') is not null
                                 and (r.data -> '_values' -> fl.fkey ->> 'at')::timestamptz
                                       + make_interval(days => fl.every) < now())::integer as n_stale
         from custom.record r
        where r.organization_id = p_organization_id
          and r.table_id = fl.tid
          and r.deleted_at is null
          and r.data_class = 'record'
          and (
                -- ONE TABLE: exactly the rows she may open.
                (p_table_id is not null and r.id in (select rid from vrows))
                -- THE WHOLE ORGANIZATION: the per-row ladder is NOT asked per Table (ENRICH-SPEED, measured
                -- 2026-10-19: 55 Tables x ~0.25 s each as a member, while the tally itself is ~0.05 s). The
                -- Tables listed are still only those she can open (tables_listed_among above), and the tally
                -- counts those Tables' live, unquarantined rows.
                or (p_table_id is null
                    and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true')
              )
     ) x
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

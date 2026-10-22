-- chair-step: replaces history.prune's body only; the DELETE is the function's existing prune statement, unchanged, with a narrower never-prune predicate (BH-HIST, test 14)
-- based-on: history.prune(uuid, text, uuid, boolean) b3f81f7b71bc14cc7d565a301ce78c8a3ae3278cd7db4189133059755eba7a0a
-- lane: BUILD-HIST (BH-) — acceptance test 14, pruning versus undo.
-- history.prune spares the row versions a Migration wrote (migration_id set), not every version in
-- the organization older than any Migration. Red/green: scripts/campaign-tests/bh_t14_merge_undo_after_prune.sql
-- (red before: "T14 (d): sixty days past a thirty-day floor the prune took nothing").
CREATE OR REPLACE FUNCTION history.prune(p_organization_id uuid, p_scope text DEFAULT 'values'::text, p_table_id uuid DEFAULT NULL::uuid, p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_days     integer;
  v_cutoff   timestamptz;
  v_count    bigint := 0;
  v_started  timestamptz := clock_timestamp();
begin
  -- HIS-4, AND IT IS THE FIRST THING THIS FUNCTION DOES. No argument, no organization, no
  -- table and no privilege reaches past this line.
  if p_scope = 'migration_log' then
    raise exception 'The Migration log is never pruned — not by a table, not by an organization, not by this function.'
      using errcode = '0A000',
            hint = 'HIS-4: every structural change ever made here stays on the record permanently, which is what makes an old Migration undoable at all (HIS-8) and what lets anybody ask what this data used to look like. Value history is what retention shortens: call this with ''values'', or with ''structure'' for the definitions'' own version rows. If the log has grown beyond what this database should hold, that is a capacity decision for a person, not a prune a caller may ask for.';
  end if;

  if p_scope is null or p_scope not in ('values', 'structure') then
    raise exception 'history.prune: % is not something this store prunes.', coalesce(p_scope, 'nothing')
      using errcode = '22023',
            hint = 'The scopes are ''values'' (records'' value history) and ''structure'' (Tables'', Fields'' and Rules'' own version rows). ''migration_log'' is refused by name — HIS-4.';
  end if;

  if p_organization_id is null then
    raise exception 'history.prune: which organization''s history?'
      using errcode = '22004',
            hint = 'Retention is resolved per organization, so a prune that spans organizations would apply one organization''s floor to another''s history.';
  end if;

  -- The guard, by name, through the one predicate — a prune while the store is switched off
  -- would delete rows nothing can currently read. GUARD-SWITCH (2026-09-19): the switch this
  -- names is the organization's own custom/system_enabled, read through
  -- `history.capture_is_open`; the old custom/row_versions_guard is retired and decides nothing.
  if not history.capture_is_open(p_organization_id) then
    raise exception 'The history store is not open here, so nothing was pruned.'
      using errcode = '42501',
            hint = 'This organization''s record store is switched off (custom/system_enabled resolves false for it) and this caller does not own the store. Nothing was deleted. Turn the store on for this organization on the switch screen; a caller never turns it on for itself.';
  end if;

  v_days := case when p_table_id is null
                 then history.retention_floor_days(p_organization_id)
                 else history.retention_days(p_organization_id, p_table_id) end;
  v_cutoff := now() - make_interval(days => v_days);

  with candidate as (
    select v.id,
           v.occurred_at,
           row_number() over (partition by v.row_id order by v.occurred_at desc, v.id desc) as recency_rank
      from history.row_versions v
      join custom.record r
        on r.organization_id = v.organization_id and r.id = v.row_id
     where v.entity_type = 'custom.record'
       and v.organization_id = p_organization_id
       and v.occurred_at < v_cutoff
       and (p_table_id is null or r.table_id = p_table_id)
       and (case when p_scope = 'values' then r.data_class = 'record'
                 else r.data_class <> 'record' end)
       -- HIS-4 AGAIN, AS A PREDICATE RATHER THAN AS A PROMISE: a row-version a Migration
       -- names is part of the Migration log's evidence and is never a prune candidate, even
       -- under 'values', even past retention. An undo that finds its inverse and not the
       -- rows it describes is an undo that lies.
       -- BH-HIST (2026-10-21): the version a Migration WROTE carries that Migration's id
       -- (`history.record_capture` stamps `migration_id` under the statement's mark), and that is
       -- exactly the evidence HIS-4 names. The old predicate read the log's row_version_lo/hi
       -- range; `history.migration_record` never writes lo, so `coalesce(lo, v.id)` made every
       -- version below ANY migration's hi a "named" row: one merge pinned the whole
       -- organization's value history forever and test 14's prune took nothing.
       and v.migration_id is null
  ),
  doomed as (
    -- The same policy the live trim already applies to the other store: the two most recent
    -- versions of a row survive whatever retention says, so "what did this look like before
    -- the last change" is always answerable.
    select id, occurred_at from candidate where recency_rank > 2
  ),
  gone as (
    delete from history.row_versions
     where not p_dry_run and entity_type='custom.record' and organization_id=p_organization_id and exists (select 1 from doomed d where d.id=history.row_versions.id and d.occurred_at=history.row_versions.occurred_at)
    returning 1
  )
  select case when p_dry_run then (select count(*) from doomed)
              else (select count(*) from gone) end
    into v_count;

  return jsonb_build_object(
    'function', 'history.prune',
    'scope', p_scope,
    'organization_id', p_organization_id,
    'table_id', p_table_id,
    'retention_days', v_days,
    'cutoff', v_cutoff,
    'policy', 'keep the two most recent versions of every row, and everything inside retention; never a row the Migration log names (HIS-4)',
    'dry_run', p_dry_run,
    'rows_pruned', v_count,
    'duration_ms', extract(millisecond from (clock_timestamp() - v_started))::int,
    'at', now());
end;
$function$;

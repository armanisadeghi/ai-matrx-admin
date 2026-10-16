-- chair-step: one replace of platform._chg_records — a move above knob change.inline_row_budget no longer refuses: step 1 (answers, cuts, the roots and every part-file of the roots) commits at once and the rest becomes a durable job advanced in bounded batches; new tables platform.change_job / change_job_row and doors change_job_advance / change_job_progress / change_job_retry.
-- based-on: platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) c1bf2e181e0254d23e20866e584b2e1d52038430fda9726fc78e4982664cce2f
-- =============================================================================
-- MOVE AND ARCHIVE — the durable job (plan § 8.5, § 14.3).
-- All or nothing, honestly: a large move is complete or visibly in progress, never silently partial.
-- Each advance call moves whole depths, parents first; a part-file is queued at its referrer's depth so an
-- (file_id, organization_id) pair always moves inside one call. A batch that cannot follow holds the job
-- with the refusal in last_error and the rows it stopped on; Retry runs it again.
-- Delete above the budget keeps the live trigger cascade and its deferred drain (mode 'trigger').
-- =============================================================================

create table if not exists platform.change_job (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null unique references platform.change_plan(id) on delete cascade,
  state          text not null default 'running' check (state in ('queued', 'running', 'held', 'reversing', 'done', 'reversed', 'failed')),
  rows_done      bigint not null default 0,
  rows_estimate  bigint not null default 0,
  held_rows      jsonb,
  last_error     text,
  attempts       integer not null default 0,
  heartbeat_at   timestamptz,
  created_at     timestamptz not null default now(),
  finished_at    timestamptz
);
create index if not exists change_job_state_idx on platform.change_job (state);

create table if not exists platform.change_job_row (
  plan_id  uuid not null references platform.change_plan(id) on delete cascade,
  seq      bigint generated always as identity,
  depth    integer not null,
  rel      regclass not null,
  row_id   uuid not null,
  done     boolean not null default false,
  primary key (plan_id, seq)
);
create index if not exists change_job_row_todo_idx on platform.change_job_row (plan_id, depth) where not done;

alter table platform.change_job enable row level security;
alter table platform.change_job_row enable row level security;
revoke all on platform.change_job, platform.change_job_row from public, anon, authenticated;

insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref, type)
values
  ('change_job', 'platform', 'change_job', 'Change job', 'machinery',
   'Durable move job of platform.change_records; people see it only through change_job_progress.', 'platform.change_job'::regclass, 'system'),
  ('change_job_row', 'platform', 'change_job_row', 'Change job row', 'machinery',
   'The frozen walk of a durable move; written and read only by the change engine.', 'platform.change_job_row'::regclass, 'system')
on conflict (token) do nothing;

-- ------------------------------------------------------------------ the engine: durable moves
do $do$
declare v_def text; v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text)'::pg_catalog.regprocedure);
  v_new := replace(v_def,
    $a$  v_defer text;
begin$a$,
    $a$  v_defer text;
  v_durable boolean := false;
begin$a$);
  v_new := replace(v_new,
    $a$  if v_prev ->> 'mode' = 'durable' then
    raise exception using errcode = '0A000',
      message = pg_catalog.format('This move touches %s rows; moves this large are not offered yet.', v_prev ->> 'total_rows');
  end if;$a$,
    $a$  -- above the inline budget: step 1 now, the rest as a durable job (plan § 8.5)
  v_durable := v_prev ->> 'mode' = 'durable';$a$);
  v_new := replace(v_new,
    $a$  insert into entity_data_private.chg_todo select x.depth, x.rel, array_agg(x.id) from entity_data_private.chg_tree x group by x.depth, x.rel;$a$,
    $a$  if v_durable then
    -- step 1 moves the roots and the files they hold; everything under them is frozen into the job,
    -- a part-file at its referrer's depth so a (file_id, organization_id) pair moves inside one call
    insert into entity_data_private.chg_todo
      select x.depth, x.rel, array_agg(x.id) from entity_data_private.chg_tree x
       where x.depth = 0 or (x.depth = 1 and x.pulled) group by x.depth, x.rel;
    insert into platform.change_job_row (plan_id, depth, rel, row_id)
      select v_plan, x.depth - case when x.pulled then 1 else 0 end, x.rel, x.id
        from entity_data_private.chg_tree x
       where not (x.depth = 0 or (x.depth = 1 and x.pulled))
       order by x.depth, x.rel::text;
  else
    insert into entity_data_private.chg_todo select x.depth, x.rel, array_agg(x.id) from entity_data_private.chg_tree x group by x.depth, x.rel;
  end if;$a$);
  v_new := replace(v_new,
    $a$  if v_defer is not null then
    execute 'set constraints ' || v_defer || ' immediate';
  end if;
  delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
  update platform.change_plan set state = 'done' where id = v_plan;$a$,
    $a$  if v_defer is not null then
    execute 'set constraints ' || v_defer || ' immediate';
  end if;
  delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
  if v_durable then
    insert into platform.change_job (plan_id, state, rows_estimate, heartbeat_at)
    values (v_plan, 'running', (select count(*) from platform.change_job_row j where j.plan_id = v_plan), now());
    update platform.change_plan set state = 'running' where id = v_plan;
    return jsonb_build_object('status', 'running', 'verb', 'move', 'plan_id', v_plan, 'mode', 'durable',
      'organization', jsonb_build_object('id', p_organization_id, 'name', platform._chg_org_name(p_organization_id)),
      'rows', (select count(*) from platform.change_item i where i.plan_id = v_plan and i.action = 'moved'),
      'rows_estimate', (select count(*) from platform.change_job_row j where j.plan_id = v_plan));
  end if;
  update platform.change_plan set state = 'done' where id = v_plan;$a$);
  if v_new = v_def
     or position($a$v_durable boolean := false;$a$ in v_new) = 0
     or position($a$v_durable := v_prev ->> 'mode' = 'durable';$a$ in v_new) = 0
     or position($a$insert into platform.change_job_row (plan_id, depth, rel, row_id)$a$ in v_new) = 0
     or position($a$insert into platform.change_job (plan_id, state, rows_estimate, heartbeat_at)$a$ in v_new) = 0 then
    raise exception 'platform._chg_records: an expected clause was not found; nothing changed';
  end if;
  execute v_new;
end $do$;

-- --------------------------------------------------------------------- progress
create or replace function platform.change_job_progress(p_plan_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare v jsonb;
begin
  -- the plan's own actor (or a platform admin) reads its progress; anyone else is told nothing exists
  if not exists (select 1 from platform.change_plan p where p.id = p_plan_id
                  and (p.actor = auth.uid() or coalesce(public.is_super_admin_for(auth.uid()), false))) then
    perform platform.refuse_not_found('There is no change in progress with that id.');
  end if;
  select jsonb_build_object('plan_id', j.plan_id, 'state', j.state, 'rows_done', j.rows_done,
                            'rows_estimate', j.rows_estimate, 'last_error', j.last_error, 'held_rows', j.held_rows,
                            'attempts', j.attempts, 'heartbeat_at', j.heartbeat_at, 'finished_at', j.finished_at)
    into v from platform.change_job j where j.plan_id = p_plan_id;
  return coalesce(v, jsonb_build_object('plan_id', p_plan_id, 'state',
    (select p.state from platform.change_plan p where p.id = p_plan_id), 'rows_done', 0, 'rows_estimate', 0));
end $function$;

-- ---------------------------------------------------------------------- advance
-- Moves whole depths, parents first, until the time budget is spent (at least one depth per call).
create or replace function platform.change_job_advance(p_plan_id uuid, p_budget_ms integer default 2000)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_plan record;
  v_job record;
  v_start timestamptz := pg_catalog.clock_timestamp();
  v_depth int;
  g record;
  r record;
  v_has_home boolean;
  v_defer text;
  v_n bigint := 0;
  v_err text;
begin
  select p.* into v_plan from platform.change_plan p where p.id = p_plan_id
     and (p.actor = auth.uid() or coalesce(public.is_super_admin_for(auth.uid()), false));
  if v_plan.id is null then
    perform platform.refuse_not_found('There is no change in progress with that id.');
  end if;
  select j.* into v_job from platform.change_job j where j.plan_id = p_plan_id for update;
  if v_job.id is null or v_job.state not in ('running', 'queued') then
    return platform.change_job_progress(p_plan_id);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('change_job:' || p_plan_id, 0));

  begin
    insert into entity_data_private.org_move_txn (xact, plan_id, entity_type, ids)
    values (pg_catalog.txid_current(), p_plan_id, v_plan.entity_type, v_plan.root_ids);
    loop
      select min(j.depth) into v_depth from platform.change_job_row j where j.plan_id = p_plan_id and not j.done;
      exit when v_depth is null;
      select string_agg(pg_catalog.format('%I.%I', n.nspname, con.conname), ', ') into v_defer
        from pg_catalog.pg_constraint con join pg_catalog.pg_namespace n on n.oid = con.connamespace
       where con.contype = 'f' and con.condeferrable and not con.condeferred
         and con.conrelid in (select distinct j.rel from platform.change_job_row j where j.plan_id = p_plan_id and j.depth = v_depth and not j.done);
      if v_defer is not null then execute 'set constraints ' || v_defer || ' deferred'; end if;
      for g in select j.rel, array_agg(j.row_id) ids from platform.change_job_row j
                where j.plan_id = p_plan_id and j.depth = v_depth and not j.done group by j.rel order by j.rel::text loop
        v_has_home := platform._chg_col_type(g.rel, 'home_scope_id') = 'uuid';
        for r in execute pg_catalog.format(
            'with o as (select c.id, c.organization_id, %s home from %s c where c.id = any($1) and c.organization_id is distinct from $2)
             update %s t set organization_id = $2%s from o where t.id = o.id
             returning t.id, o.organization_id, o.home',
            case when v_has_home then 'c.home_scope_id' else 'null::uuid' end, g.rel, g.rel,
            case when v_has_home then ', home_scope_id = platform.organization_general_scope($2)' else '' end)
            using g.ids, v_plan.target_organization_id loop
          perform platform._chg_log(p_plan_id, g.rel, r.id, 'moved', v_depth,
            jsonb_strip_nulls(jsonb_build_object('organization_id', r.organization_id, 'home_scope_id', r.home)),
            jsonb_build_object('organization_id', v_plan.target_organization_id));
          v_n := v_n + 1;
        end loop;
        update platform.change_job_row j set done = true
         where j.plan_id = p_plan_id and j.depth = v_depth and j.rel = g.rel and not j.done;
      end loop;
      if v_defer is not null then execute 'set constraints ' || v_defer || ' immediate'; end if;
      exit when pg_catalog.clock_timestamp() - v_start > make_interval(secs => greatest(coalesce(p_budget_ms, 2000), 100) / 1000.0);
    end loop;
    delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
  exception when others then
    -- nothing of this call stays; the job holds, naming what stopped it
    get stacked diagnostics v_err = message_text;
    update platform.change_job j
       set state = 'held', last_error = v_err, attempts = j.attempts + 1, heartbeat_at = now(),
           held_rows = (select jsonb_agg(jsonb_build_object('table', x.rel::text, 'id', x.row_id))
                          from (select j2.rel, j2.row_id from platform.change_job_row j2
                                 where j2.plan_id = p_plan_id and not j2.done
                                   and j2.depth = (select min(j3.depth) from platform.change_job_row j3
                                                    where j3.plan_id = p_plan_id and not j3.done)
                                 limit 20) x)
     where j.plan_id = p_plan_id;
    update platform.change_plan set state = 'held' where id = p_plan_id;
    return platform.change_job_progress(p_plan_id);
  end;

  update platform.change_job j set rows_done = j.rows_done + v_n, heartbeat_at = now(), attempts = j.attempts + 1
   where j.plan_id = p_plan_id;
  if not exists (select 1 from platform.change_job_row j where j.plan_id = p_plan_id and not j.done) then
    update platform.change_job j set state = 'done', finished_at = now() where j.plan_id = p_plan_id;
    update platform.change_plan set state = 'done' where id = p_plan_id;
  end if;
  return platform.change_job_progress(p_plan_id);
end $function$;

-- ------------------------------------------------------------------------ retry
create or replace function platform.change_job_retry(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not exists (select 1 from platform.change_plan p where p.id = p_plan_id
                  and (p.actor = auth.uid() or coalesce(public.is_super_admin_for(auth.uid()), false))) then
    perform platform.refuse_not_found('There is no change in progress with that id.');
  end if;
  update platform.change_job j set state = 'running', last_error = null, held_rows = null
   where j.plan_id = p_plan_id and j.state = 'held';
  update platform.change_plan set state = 'running' where id = p_plan_id and state = 'held';
  return platform.change_job_advance(p_plan_id, 2000);
end $function$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'p_plan_id: only the plan''s own actor (auth.uid() = change_plan.actor) or a platform admin; any other id answers not found before any read.',
       '20261016103000_move_archive_change_job', null, true, false
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'platform' and p.proname in ('change_job_progress', 'change_job_advance', 'change_job_retry')
   and not exists (select 1 from platform.client_callable_door d where d.schema_name = n.nspname and d.function_name = p.proname
                     and d.identity_args = pg_catalog.pg_get_function_identity_arguments(p.oid));
grant execute on function platform.change_job_progress(uuid), platform.change_job_advance(uuid, integer),
  platform.change_job_retry(uuid) to authenticated;

-- chair-step: one replace of platform._chg_records — the 'undo' verb stops refusing and runs platform._chg_undo (plan § 8.6).
-- based-on: platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) f9d33cb98715d2303cd9548a8d86c1debab14a41603119e630b60746527bd5d0
-- =============================================================================
-- MOVE AND ARCHIVE — Undo move (plan § 8.6).
-- Re-runs the forward walk from the roots back to the old organization, so everything created under the tree
-- since the move follows back; then uses the change log only for what a walk cannot recompute: each row's old
-- home, the links the move cut (revived), the references it detached (re-attached), edges it carried.
-- Refused, naming the reason: not a finished move, past knob move.undo_window_days, already undone, a root
-- moved again since, or the person no longer belongs to the organization it came from.
-- =============================================================================

create or replace function platform._chg_undo(p_plan_id uuid, p_preview boolean, p_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_super boolean := coalesce(public.is_super_admin_for(auth.uid()), false);
  v_move record;
  v_rel regclass;
  v_label text;
  v_id uuid;
  v_fp text;
  v_plan uuid;
  v_groups jsonb := '[]'::jsonb;
  g record;
  r record;
  v_has_home boolean;
  v_defer text;
  v_n bigint := 0;
  v_budget int := coalesce((platform.knob_resolve('change', 'inline_row_budget', null, auth.uid(), null) #>> '{}')::int, 5000);
begin
  select p.* into v_move from platform.change_plan p where p.id = p_plan_id and p.verb = 'move';
  if v_move.id is null or not (v_super or v_move.actor = v_me
       or exists (select 1 from unnest(v_move.root_ids) x where iam.has_access(v_move.entity_type, x, 'admin'))) then
    perform platform.refuse_not_found('There is no move with that id you can undo.');
  end if;
  select et.table_ref, et.label into v_rel, v_label from platform.entity_types et
   where et.token = v_move.entity_type and et.is_active limit 1;
  if v_move.state = 'reversed' or v_move.undone_by is not null then
    raise exception using errcode = '22023', message = 'This move was already undone.';
  end if;
  if v_move.state <> 'done' then
    raise exception using errcode = '22023', message = 'This move has not finished, so it cannot be undone yet.';
  end if;
  if v_move.undo_until is not null and v_move.undo_until < now() then
    raise exception using errcode = '22023',
      message = pg_catalog.format('Moves can be undone for %s days; this one is older.',
        coalesce((platform.knob_resolve('move', 'undo_window_days', v_move.target_organization_id, v_me, null) #>> '{}'), '30'));
  end if;
  if not (v_super or iam.has_org_access_for(v_me, v_move.source_organization_id)) then
    raise exception using errcode = '42501',
      message = pg_catalog.format('You no longer belong to %s, so this move cannot be undone.', platform._chg_org_name(v_move.source_organization_id));
  end if;
  if exists (select 1 from platform.change_plan p
              where p.verb = 'move' and p.state in ('done', 'running', 'held') and p.id <> v_move.id
                and p.created_at > v_move.created_at and p.root_ids && v_move.root_ids) then
    raise exception using errcode = '22023', message = pg_catalog.format('This %s was moved again since, so this move cannot be undone.', lower(v_label));
  end if;

  -- the forward walk again, from the roots as they are now
  delete from entity_data_private.chg_tree; delete from entity_data_private.chg_block;
  insert into entity_data_private.chg_tree (rel, id, depth, rule_id) select v_rel, x, 0, null from unnest(v_move.root_ids) x;
  perform platform._chg_walk('move');
  for g in select x.rel, count(*) n, array_agg(x.id) ids from entity_data_private.chg_tree x where x.depth > 0 group by x.rel loop
    v_groups := v_groups || jsonb_build_object('rule_id', null, 'type', platform._chg_token(g.rel), 'table', g.rel::text,
      'noun', coalesce((select et.label from platform.entity_types et where et.token = platform._chg_token(g.rel)), g.rel::text),
      'count', g.n, 'sample', platform._chg_items(g.rel, g.ids[1:5], 5), 'action', 'follow');
  end loop;
  v_fp := md5(jsonb_build_object('t', (select jsonb_agg(x.rel::text || ':' || x.id order by x.rel::text, x.id)
                                         from entity_data_private.chg_tree x), 'p', p_plan_id)::text);
  if p_preview then
    return jsonb_build_object('status', 'preview', 'verb', 'undo', 'plan_id', p_plan_id, 'fingerprint', v_fp,
      'roots', platform._chg_items(v_rel, v_move.root_ids, 50), 'groups', v_groups, 'questions', '[]'::jsonb,
      'warnings', jsonb_build_array(jsonb_build_object('kind', 'undo_restores_links',
        'count', (select count(*) from platform.change_item i where i.plan_id = p_plan_id and i.action in ('cut_edge', 'detached')))),
      'total_rows', (select count(*) from entity_data_private.chg_tree), 'mode', 'inline',
      'source_organization', jsonb_build_object('id', v_move.target_organization_id, 'name', platform._chg_org_name(v_move.target_organization_id)),
      'target_organization', jsonb_build_object('id', v_move.source_organization_id, 'name', platform._chg_org_name(v_move.source_organization_id)));
  end if;
  if p_fingerprint is distinct from v_fp then
    return jsonb_build_object('status', 'changed', 'verb', 'undo', 'plan_id', p_plan_id, 'fingerprint', v_fp, 'groups', v_groups,
      'questions', '[]'::jsonb, 'warnings', '[]'::jsonb, 'message', 'This changed while you were looking. Review it again.');
  end if;
  if (select count(*) from entity_data_private.chg_tree) > v_budget then
    raise exception using errcode = '0A000', message = 'Undoing a move this large is not offered yet.';
  end if;

  insert into platform.change_plan (verb, actor, entity_type, root_ids, source_organization_id, target_organization_id,
                                    fingerprint, state, mode, committed_at)
  values ('undo', v_me, v_move.entity_type, v_move.root_ids, v_move.target_organization_id, v_move.source_organization_id,
          v_fp, 'committed', 'inline', now()) returning id into v_plan;
  insert into entity_data_private.org_move_txn (xact, plan_id, entity_type, ids)
  values (pg_catalog.txid_current(), v_plan, v_move.entity_type, v_move.root_ids);
  for r in select x.rel, x.id from entity_data_private.chg_tree x where x.depth = 0 order by x.rel::text, x.id loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('change:' || coalesce(platform._chg_token(r.rel), r.rel::text) || ':' || r.id, 0));
  end loop;
  select string_agg(pg_catalog.format('%I.%I', n.nspname, con.conname), ', ') into v_defer
    from pg_catalog.pg_constraint con join pg_catalog.pg_namespace n on n.oid = con.connamespace
   where con.contype = 'f' and con.condeferrable and not con.condeferred
     and (con.conrelid in (select distinct x.rel from entity_data_private.chg_tree x) or con.confrelid in (select distinct x.rel from entity_data_private.chg_tree x));
  if v_defer is not null then execute 'set constraints ' || v_defer || ' deferred'; end if;

  -- every row of the walk goes back; a row the move logged gets its old home back, a new one the General home
  for g in select x.depth, x.rel, array_agg(x.id) ids from entity_data_private.chg_tree x group by x.depth, x.rel order by x.depth, x.rel::text loop
    v_has_home := platform._chg_col_type(g.rel, 'home_scope_id') = 'uuid';
    for r in execute pg_catalog.format(
        'with o as (select c.id, c.organization_id, %s home from %s c where c.id = any($1) and c.organization_id is distinct from $2)
         update %s t set organization_id = $2%s from o where t.id = o.id returning t.id, o.organization_id, o.home',
        case when v_has_home then 'c.home_scope_id' else 'null::uuid' end, g.rel, g.rel,
        case when v_has_home then ', home_scope_id = coalesce((select (i.old_values ->> ''home_scope_id'')::uuid from platform.change_item i
                                       where i.plan_id = $3 and i.row_id = t.id and i.action = ''moved'' limit 1),
                                     platform.organization_general_scope($2))' else '' end)
        using g.ids, v_move.source_organization_id, p_plan_id loop
      perform platform._chg_log(v_plan, g.rel, r.id, 'moved', g.depth,
        jsonb_strip_nulls(jsonb_build_object('organization_id', r.organization_id, 'home_scope_id', r.home)),
        jsonb_build_object('organization_id', v_move.source_organization_id));
      v_n := v_n + 1;
    end loop;
  end loop;

  -- what a walk cannot recompute: cut links revive, detached references re-attach, carried edges return
  update platform.associations a set deleted_at = null, deleted_via_type = null, deleted_via_id = null
   where a.deleted_via_type = 'change_plan' and a.deleted_via_id = p_plan_id;
  for r in select i.table_ref, i.row_id, i.old_values from platform.change_item i
            where i.plan_id = p_plan_id and i.action = 'detached' and i.old_values is not null loop
    for g in select k, v from jsonb_each_text(r.old_values) as e(k, v) loop
      execute pg_catalog.format('update %s set %I = $2::%s where id = $1 and %I is null', r.table_ref, g.k,
                                platform._chg_col_type(r.table_ref, g.k), g.k) using r.row_id, g.v;
    end loop;
  end loop;
  update platform.associations a set organization_id = (i.old_values ->> 'organization_id')::uuid
    from platform.change_item i
   where i.plan_id = p_plan_id and i.action = 'edge_moved' and i.row_id = a.id;
  update platform.associations a set organization_id = v_move.source_organization_id
   where a.deleted_at is null and a.organization_id = v_move.target_organization_id
     and exists (select 1 from entity_data_private.chg_tree x where x.id = a.source_id and platform._chg_token(x.rel) = a.source_type);

  if v_defer is not null then execute 'set constraints ' || v_defer || ' immediate'; end if;
  delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
  update platform.change_plan set state = 'done' where id = v_plan;
  update platform.change_plan set state = 'reversed', undone_by = v_plan where id = p_plan_id;
  return jsonb_build_object('status', 'done', 'verb', 'undo', 'plan_id', v_plan, 'undid', p_plan_id, 'rows', v_n,
    'organization', jsonb_build_object('id', v_move.source_organization_id, 'name', platform._chg_org_name(v_move.source_organization_id)));
end $function$;

do $do$
declare v_def text; v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text)'::pg_catalog.regprocedure);
  v_new := replace(v_def,
    $a$  if v_verb = 'undo' then
    -- Announced, never silent: plan § 8.6 is a later build step.
    raise exception using errcode = '0A000', message = 'Undoing a move is not offered yet.';
  end if;$a$,
    $a$  if v_verb = 'undo' then
    -- plan § 8.6: the move named by p_plan_id, walked back to the organization it came from
    if p_plan_id is null then
      raise exception using errcode = '22023', message = 'Name the move to undo.';
    end if;
    return platform._chg_undo(p_plan_id, p_preview, p_fingerprint);
  end if;$a$);
  if v_new = v_def or position($a$return platform._chg_undo($a$ in v_new) = 0 then
    raise exception 'platform._chg_records: the undo refusal was not found; nothing changed';
  end if;
  execute v_new;
end $do$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'Move and archive engine internals; called only from platform.change_records.',
       '20261016105000_move_archive_undo_move',
       'server_only: the move-and-archive engine (platform.change_records) calls this; no client ever does.', false, false
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'platform' and p.proname = '_chg_undo'
   and not exists (select 1 from platform.client_callable_door d where d.schema_name = n.nspname and d.function_name = p.proname);
revoke all on function platform._chg_undo(uuid, boolean, text) from public, anon, authenticated;

-- chair-step: one replace of platform._chg_records — the 'copy' verb stops refusing and runs platform._chg_copy (plan § 7); copy_mode declared for note (shallow) and party (deep); new view entity_data_private.chg_map over the engine's work rows.
-- based-on: platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) a39fd11c1ba663b5e2e4baafbe47cf6f59c7be037409f80e174a8ea50f5c555d
-- =============================================================================
-- MOVE AND ARCHIVE — Copy (plan § 7): the same walk, new rows.
-- The root and its copy-rule parts are inserted as new rows in the target organization (the record's own
-- organization when none is named: Duplicate). References inside the copied tree point at the copies; a
-- same-organization reference out of it is emptied when the copy lands in another organization (nullable),
-- otherwise it keeps pointing at the original. Edges with both ends copied are copied. Files need the file
-- service's byte copy, so a tree holding a file is a named refusal until that door exists. Activity, history,
-- shares and per-person state are never copied. A type copies only once its copy_mode is declared.
-- =============================================================================

create or replace view entity_data_private.chg_map with (security_invoker = true) as
  select w.rel, w.id, w.ref_id, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'map';
alter view entity_data_private.chg_map alter column bucket set default 'map';
revoke all on entity_data_private.chg_map from public, anon, authenticated;

update platform.entity_types set copy_mode = 'shallow' where token = 'note' and copy_mode is null;
update platform.entity_types set copy_mode = 'deep' where token = 'party' and copy_mode is null;

create or replace function platform._chg_copy(p_entity_type text, p_ids uuid[], p_target uuid, p_preview boolean, p_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_super boolean := coalesce(public.is_super_admin_for(auth.uid()), false);
  v_rel regclass;
  v_label text;
  v_mode text;
  v_id uuid;
  v_ids uuid[];
  v_src uuid;
  v_target uuid;
  v_warn jsonb := '[]'::jsonb;
  v_groups jsonb := '[]'::jsonb;
  v_roots jsonb := '[]'::jsonb;
  v_fp text;
  v_plan uuid;
  v_over jsonb;
  v_new uuid;
  v_val text;
  v_mapped uuid;
  g record;
  r record;
  f record;
  e record;
  v_n bigint := 0;
  v_err text;
  v_cols text;
  v_pcols text;
begin
  select et.table_ref, et.label, et.copy_mode into v_rel, v_label, v_mode
    from platform.entity_types et where et.token = p_entity_type and et.is_active and et.table_ref is not null limit 1;
  if v_rel is null then
    raise exception using errcode = '22023', message = pg_catalog.format('There is no kind of record called "%s".', p_entity_type);
  end if;
  v_ids := array(select distinct x from unnest(coalesce(p_ids, '{}'::uuid[])) x where x is not null);
  if cardinality(v_ids) = 0 then
    raise exception using errcode = '22023', message = 'Name the records to copy.';
  end if;
  -- access first: every root readable by the caller; the target one they belong to
  foreach v_id in array v_ids loop
    if platform._chg_fk_value(v_rel, v_id, 'id') is null or not (v_super or iam.has_access(p_entity_type, v_id, 'viewer')) then
      perform platform.refuse_not_found(pg_catalog.format('There is no %s you can open with that id.', lower(v_label)));
    end if;
    v_src := coalesce(v_src, platform._chg_row_org(v_rel, v_id));
  end loop;
  v_target := coalesce(p_target, v_src);
  if not (v_super or iam.has_org_access_for(v_me, v_target)) then
    raise exception using errcode = '42501',
      message = pg_catalog.format('You are not a member of %s, so you cannot copy into it.', platform._chg_org_name(v_target));
  end if;

  -- the walk: the move walk (what follows a record), narrowed to copy rules; shallow types copy the root only
  delete from entity_data_private.chg_tree; delete from entity_data_private.chg_block; delete from entity_data_private.chg_map;
  insert into entity_data_private.chg_tree (rel, id, depth, rule_id) select v_rel, x, 0, null from unnest(v_ids) x;
  if v_mode = 'deep' then
    perform platform._chg_walk('move');
    delete from entity_data_private.chg_tree x
     using platform.relationship_rule rr
     where x.depth > 0 and rr.id = x.rule_id and rr.on_copy <> 'copy' and not x.pulled;
  end if;

  if v_mode is null then
    v_warn := v_warn || jsonb_build_object('kind', 'not_copyable', 'severity', 'refuse',
      'message', pg_catalog.format('%s records cannot be copied yet.', v_label));
  end if;
  if exists (select 1 from entity_data_private.chg_tree x where x.rel = 'files.files'::regclass) then
    v_warn := v_warn || jsonb_build_object('kind', 'copy_files', 'severity', 'refuse',
      'message', 'Copying files needs the file service; this one holds files.',
      'items', platform._chg_items('files.files'::regclass,
                 (select array_agg(x.id) from entity_data_private.chg_tree x where x.rel = 'files.files'::regclass), 20));
  end if;
  for g in select x.rel, count(*) n, array_agg(x.id) ids from entity_data_private.chg_tree x where x.depth > 0 group by x.rel loop
    select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(g.rel);
    v_groups := v_groups || jsonb_build_object('rule_id', null, 'type', platform._chg_token(g.rel), 'table', g.rel::text,
      'noun', coalesce(v_label, g.rel::text), 'count', g.n, 'sample', platform._chg_items(g.rel, g.ids[1:5], 5), 'action', 'copy');
  end loop;
  v_roots := platform._chg_items(v_rel, v_ids, 50);
  v_fp := md5(jsonb_build_object('t', (select jsonb_agg(x.rel::text || ':' || x.id order by x.rel::text, x.id) from entity_data_private.chg_tree x),
                                 'w', v_warn, 'to', v_target)::text);

  if p_preview then
    insert into platform.change_plan (verb, actor, entity_type, root_ids, source_organization_id, target_organization_id,
                                      fingerprint, state, mode)
    values ('copy', v_me, p_entity_type, v_ids, v_src, v_target, v_fp, 'previewed', 'inline') returning id into v_plan;
    return jsonb_build_object('status', 'preview', 'verb', 'copy', 'plan_id', v_plan, 'fingerprint', v_fp, 'roots', v_roots,
      'groups', v_groups, 'questions', '[]'::jsonb, 'warnings', v_warn, 'mode', 'inline',
      'total_rows', (select count(*) from entity_data_private.chg_tree),
      'source_organization', jsonb_build_object('id', v_src, 'name', platform._chg_org_name(v_src)),
      'target_organization', jsonb_build_object('id', v_target, 'name', platform._chg_org_name(v_target)));
  end if;
  if p_fingerprint is distinct from v_fp then
    return jsonb_build_object('status', 'changed', 'verb', 'copy', 'fingerprint', v_fp, 'roots', v_roots, 'groups', v_groups,
      'questions', '[]'::jsonb, 'warnings', v_warn, 'message', 'This changed while you were looking. Review it again.');
  end if;
  if exists (select 1 from jsonb_array_elements(v_warn) w where w ->> 'severity' = 'refuse') then
    raise exception using errcode = '23514',
      message = (select w ->> 'message' from jsonb_array_elements(v_warn) w where w ->> 'severity' = 'refuse' limit 1);
  end if;

  insert into platform.change_plan (verb, actor, entity_type, root_ids, source_organization_id, target_organization_id,
                                    fingerprint, state, mode, committed_at)
  values ('copy', v_me, p_entity_type, v_ids, v_src, v_target, v_fp, 'committed', 'inline', now()) returning id into v_plan;
  insert into entity_data_private.chg_map (rel, id, ref_id) select x.rel, x.id, gen_random_uuid() from entity_data_private.chg_tree x;

  -- parents first; every reference into the copied tree points at the copy
  for r in select x.rel, x.id, x.depth, m.ref_id from entity_data_private.chg_tree x
             join entity_data_private.chg_map m on m.rel = x.rel and m.id = x.id order by x.depth, x.rel::text loop
    v_over := jsonb_build_object('id', r.ref_id, 'organization_id', v_target, 'created_by', v_me, 'updated_by', v_me,
                                 'created_at', now(), 'updated_at', now(), 'version', 1, 'deleted_at', null);
    if platform._chg_col_type(r.rel, 'slug') is not null and platform._chg_fk_value(r.rel, r.id, 'slug') is not null then
      v_over := v_over || jsonb_build_object('slug', platform._chg_fk_value(r.rel, r.id, 'slug') || '-' || left(r.ref_id::text, 4));
    end if;
    if platform._chg_col_type(r.rel, 'home_scope_id') = 'uuid' and v_target is distinct from v_src then
      v_over := v_over || jsonb_build_object('home_scope_id', platform.organization_general_scope(v_target));
    end if;
    for f in select rr.child_columns[1] col, rr.parent_table, rr.same_org_required, rr.child_nullable
               from platform.relationship_rule rr
              where rr.source_kind = 'fk' and rr.child_table = r.rel and coalesce(rr.parent_columns[1], 'id') = 'id'
                and rr.child_columns[1] <> 'organization_id' and rr.access <> 'lookup' loop
      continue when platform._chg_col_type(r.rel, f.col) is distinct from 'uuid';
      v_val := platform._chg_fk_value(r.rel, r.id, f.col);
      continue when v_val is null;
      select m.ref_id into v_mapped from entity_data_private.chg_map m where m.rel = f.parent_table and m.id = v_val::uuid;
      if v_mapped is not null then
        v_over := v_over || jsonb_build_object(f.col, v_mapped);
      elsif v_target is distinct from v_src and f.same_org_required and f.child_nullable then
        v_over := v_over || jsonb_build_object(f.col, null);
      end if;
      v_mapped := null;
    end loop;
    begin
      -- every column a row may be written with (generated and always-identity columns fill themselves)
      select string_agg(pg_catalog.quote_ident(a.attname), ', ' order by a.attnum),
             string_agg('p.' || pg_catalog.quote_ident(a.attname), ', ' order by a.attnum)
        into v_cols, v_pcols
        from pg_catalog.pg_attribute a
       where a.attrelid = r.rel and a.attnum > 0 and not a.attisdropped and a.attgenerated = '' and a.attidentity <> 'a';
      execute pg_catalog.format(
        'insert into %1$s (%2$s) select %3$s from %1$s t cross join lateral jsonb_populate_record(t, $1) p where t.id = $2',
        r.rel, v_cols, v_pcols)
        using v_over, r.id;
    exception when others then
      get stacked diagnostics v_err = message_text;
      raise exception using errcode = '23514',
        message = pg_catalog.format('A %s could not be copied. Nothing was copied.', coalesce(platform._chg_token(r.rel), r.rel::text)),
        detail = v_err;
    end;
    insert into platform.change_item (plan_id, seq, table_ref, row_id, action, depth, new_values, copy_of)
    values (v_plan, coalesce((select max(i.seq) from platform.change_item i where i.plan_id = v_plan), 0) + 1,
            r.rel, r.ref_id, 'copied', r.depth, jsonb_build_object('organization_id', v_target), r.id);
    v_n := v_n + 1;
  end loop;

  -- edges with both ends copied are copied (plan § 7)
  for e in select a.*, ms.ref_id s_new, mt.ref_id t_new
             from platform.associations a
             join entity_data_private.chg_map ms on ms.id = a.source_id and platform._chg_token(ms.rel) = a.source_type
             join entity_data_private.chg_map mt on mt.id = a.target_id and platform._chg_token(mt.rel) = a.target_type
            where a.deleted_at is null loop
    insert into platform.associations (source_type, source_id, target_type, target_id, organization_id, label, role, metadata, created_by)
    values (e.source_type, e.s_new, e.target_type, e.t_new, v_target, e.label, e.role, e.metadata, v_me);
  end loop;

  update platform.change_plan set state = 'done' where id = v_plan;
  return jsonb_build_object('status', 'done', 'verb', 'copy', 'plan_id', v_plan, 'rows', v_n,
    'copies', (select jsonb_agg(jsonb_build_object('type', p_entity_type, 'id', m.ref_id, 'copy_of', m.id))
                 from entity_data_private.chg_map m where m.rel = v_rel and m.id = any(v_ids)),
    'organization', jsonb_build_object('id', v_target, 'name', platform._chg_org_name(v_target)));
end $function$;

do $do$
declare v_def text; v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text)'::pg_catalog.regprocedure);
  v_new := replace(v_def,
    $a$  if v_verb in ('copy', 'undo') then
    -- Announced, never silent: plan § 7 / § 8.6 are later build steps.
    raise exception using errcode = '0A000',
      message = case v_verb when 'copy' then 'Copying records is not offered yet.' else 'Undoing a move is not offered yet.' end;
  end if;$a$,
    $a$  if v_verb = 'copy' then
    -- plan § 7: the same walk, new rows (the record's own organization when none is named = Duplicate)
    return platform._chg_copy(p_entity_type, p_ids, p_organization_id, p_preview, p_fingerprint);
  end if;
  if v_verb = 'undo' then
    -- Announced, never silent: plan § 8.6 is a later build step.
    raise exception using errcode = '0A000', message = 'Undoing a move is not offered yet.';
  end if;$a$);
  if v_new = v_def or position($a$return platform._chg_copy($a$ in v_new) = 0 then
    raise exception 'platform._chg_records: the copy refusal was not found; nothing changed';
  end if;
  execute v_new;
end $do$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'Move and archive engine internals; called only from platform.change_records.',
       '20261016104000_move_archive_copy',
       'server_only: the move-and-archive engine (platform.change_records) calls this; no client ever does.', false, false
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'platform' and p.proname = '_chg_copy'
   and not exists (select 1 from platform.client_callable_door d where d.schema_name = n.nspname and d.function_name = p.proname);
revoke all on function platform._chg_copy(text, uuid[], uuid, boolean, text) from public, anon, authenticated;

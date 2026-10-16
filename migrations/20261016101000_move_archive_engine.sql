-- chair-step: REVOKEs close new engine internals to clients; the DELETEs live inside function bodies on the engine's own work rows, marker and change log; two replaces: platform._cascade_soft_delete steps aside under the engine marker, and platform.classify_relationships rules a soft-deletable part as deleted with its parent.
-- based-on: platform._cascade_soft_delete() 49610b3490593796cb833e4e9f5ba87e19cee513694ebcbe2a05fcde58bda09b
-- based-on: platform.classify_relationships() 833732a47477009229faaab114cb9035673a61af74a77833e37ffbb6f82a3d44
-- =============================================================================
-- MOVE AND ARCHIVE — steps 2-3: the one engine.
--   platform.change_records(verb, type, ids, org, plan, answers, preview, fingerprint)
-- Preview walks the register (relationship_rule) from the roots, parents before
-- children, to a fixpoint; it writes nothing but its plan row. Commit re-walks,
-- compares the fingerprint of the DECISIONS, applies the person's answers, and
-- writes every row itself under the transaction marker, logging old values.
-- Restore keys on the delete's plan (exact), never on timestamps.
-- Plan: common-docs/systems/architecture/database/projects/move-and-archive/PLAN.md § 3-9.
-- Not in this step (announced by refusal, never silent): copy (§ 7), undo move (§ 8.6),
-- the durable move job (§ 8.5) — a delete above the inline budget runs through the
-- live trigger cascade instead (mode 'trigger').
-- =============================================================================

-- ------------------------------------------------------------- the work table
-- The walk's scratch space. One permanent UNLOGGED table, every row keyed by the transaction that
-- wrote it; seven views show a transaction only its own rows. Temporary tables were the first draft:
-- every CREATE TEMP fires the DDL event triggers, which lock auth/storage/realtime relations until the
-- transaction ends (incident 2026-09-27), so an engine call must never create anything.
-- platform.change_records clears its transaction's rows before it returns; a rollback leaves none.
create unlogged table if not exists entity_data_private.change_work (
  xact      bigint not null default pg_catalog.txid_current(),
  bucket    text not null,
  rel       regclass,
  id        uuid,
  depth     integer,
  rule_id   uuid,
  pulled    boolean not null default false,
  col       text,
  qid       text,
  kind      text,
  edge_id   uuid,
  other_rel regclass,
  other_id  uuid,
  prompt    text,
  options   jsonb,
  suggested text,
  way_out   jsonb,
  ord       integer,
  ref_id    uuid,
  pinned    boolean not null default false,
  ids       uuid[]
);
revoke all on entity_data_private.change_work from public, anon, authenticated;
alter table entity_data_private.change_work enable row level security;
create index if not exists change_work_xact_bucket_idx on entity_data_private.change_work (xact, bucket);
create unique index if not exists change_work_tree_key on entity_data_private.change_work (xact, rel, id) where bucket = 'tree';
create unique index if not exists change_work_block_key on entity_data_private.change_work (xact, rel, id) where bucket = 'block';
create unique index if not exists change_work_surv_key on entity_data_private.change_work (xact, rel, id) where bucket = 'surv';
create unique index if not exists change_work_qmeta_key on entity_data_private.change_work (xact, qid) where bucket = 'qmeta';

create or replace view entity_data_private.chg_tree with (security_invoker = true) as
  select w.rel, w.id, w.depth, w.rule_id, w.pulled, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'tree';
create or replace view entity_data_private.chg_block with (security_invoker = true) as
  select w.rel, w.id, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'block';
create or replace view entity_data_private.chg_surv with (security_invoker = true) as
  select w.rel, w.id, w.rule_id, w.col, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'surv';
create or replace view entity_data_private.chg_q with (security_invoker = true) as
  select w.qid, w.kind, w.rule_id, w.rel, w.id, w.col, w.edge_id, w.other_rel, w.other_id, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'q';
create or replace view entity_data_private.chg_qmeta with (security_invoker = true) as
  select w.qid, w.kind, w.prompt, w.options, w.suggested, w.way_out, w.ord, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'qmeta';
create or replace view entity_data_private.chg_users with (security_invoker = true) as
  select w.id, w.rel, w.ref_id, w.pinned, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'users';
create or replace view entity_data_private.chg_todo with (security_invoker = true) as
  select w.depth, w.rel, w.ids, w.bucket from entity_data_private.change_work w
   where w.xact = pg_catalog.txid_current() and w.bucket = 'todo';
alter view entity_data_private.chg_tree alter column bucket set default 'tree';
alter view entity_data_private.chg_block alter column bucket set default 'block';
alter view entity_data_private.chg_surv alter column bucket set default 'surv';
alter view entity_data_private.chg_q alter column bucket set default 'q';
alter view entity_data_private.chg_qmeta alter column bucket set default 'qmeta';
alter view entity_data_private.chg_users alter column bucket set default 'users';
alter view entity_data_private.chg_todo alter column bucket set default 'todo';
alter view entity_data_private.chg_tree alter column pulled set default false;
alter view entity_data_private.chg_users alter column pinned set default false;
revoke all on entity_data_private.chg_tree, entity_data_private.chg_block, entity_data_private.chg_surv, entity_data_private.chg_q,
  entity_data_private.chg_qmeta, entity_data_private.chg_users, entity_data_private.chg_todo from public, anon, authenticated;

insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref, type)
values ('change_work', 'entity_data_private', 'change_work', 'Change work rows', 'machinery',
        'Per-transaction scratch rows of platform.change_records; cleared before every call returns.', 'entity_data_private.change_work'::regclass, 'system')
on conflict (token) do nothing;

-- --------------------------------------------------------------------- helpers
create or replace function platform._chg_token(p_rel regclass)
returns text
language sql
stable
set search_path to ''
as $function$
  select case when p_rel = 'custom.context_scopes'::regclass then 'scope' else (
  select et.token
    from platform.entity_types et
    join pg_catalog.pg_class c on c.oid = p_rel
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where et.table_ref = p_rel or (et.schema_name = n.nspname and et.table_name = c.relname)
   order by et.is_active desc, et.is_component asc, (et.table_ref = p_rel) desc
   limit 1) end
$function$;

-- The table a registry token's rows live in. Scopes are custom-store records read through
-- custom.context_scopes; the registry row for 'scope' still names its retired table.
create or replace function platform._chg_rel(p_token text)
returns regclass
language sql
stable
set search_path to ''
as $function$
  select case when p_token = 'scope' then 'custom.context_scopes'::regclass
              else (select et.table_ref from platform.entity_types et
                     where et.token = p_token and et.table_ref is not null
                     order by et.is_active desc limit 1) end
$function$;

create or replace function platform._chg_col_type(p_rel regclass, p_col text)
returns text
language sql
stable
set search_path to ''
as $function$
  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    from pg_catalog.pg_attribute a
   where a.attrelid = p_rel and a.attname = p_col and a.attnum > 0 and not a.attisdropped
$function$;

-- Doors for the review: type + id + title (+ organization) for up to p_limit rows.
create or replace function platform._chg_items(p_rel regclass, p_ids uuid[], p_limit integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_tok text := platform._chg_token(p_rel);
  v_tc text;
  v_out jsonb;
begin
  if p_ids is null or cardinality(p_ids) = 0 then return '[]'::jsonb; end if;
  select et.title_column into v_tc from platform.entity_types et where et.token = v_tok;
  execute pg_catalog.format(
    'select coalesce(jsonb_agg(jsonb_build_object(''type'', $3::text, ''table'', $4::text, ''id'', x.j ->> ''id'',
        ''title'', coalesce(x.j ->> $5, x.j ->> ''name'', x.j ->> ''title'', x.j ->> ''label'', x.j ->> ''display_name'',
                           x.j ->> ''filename'', x.j ->> ''file_name'', x.j ->> ''domain'', x.j ->> ''slug''),
        ''organization_id'', x.j ->> ''organization_id'')), ''[]''::jsonb)
       from (select to_jsonb(t) j from %s t where t.id = any($1) limit $2) x', p_rel)
    into v_out using p_ids, p_limit, v_tok, p_rel::text, coalesce(v_tc, 'name');
  return v_out;
end $function$;

create or replace function platform._chg_org_name(p_org uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select o.name from iam.organizations o where o.id = p_org
$function$;

-- ------------------------------------------------------------------ the walk
-- Works on the session's temp tables (_chg_tree, _chg_block). Parents before children,
-- frontier by frontier, to a fixpoint; a row is never visited twice (self trees included).
create or replace function platform._chg_walk(p_verb text)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_pass int := 0;
  v_new bigint;
  v_n bigint;
  r record;
  t record;
  at record;
  v_keys text[];
  v_ty text;
  v_ids uuid[];
  v_need text := case when p_verb = 'delete' then 'deleted_at' else 'organization_id' end;
  v_live text;
  v_item_rel regclass;
begin
  loop
    v_pass := v_pass + 1;
    v_new := 0;

    -- (1) FK rules: composition and containment children of the frontier.
    for r in
      select rr.id, rr.child_table, rr.child_columns[1] as col, coalesce(rr.parent_columns[1], 'id') as pcol, rr.parent_table
        from platform.relationship_rule rr
       where rr.source_kind = 'fk' and rr.constraint_name is null and cardinality(rr.child_columns) = 1
         and rr.parent_table in (select distinct x.rel from entity_data_private.chg_tree x where x.depth = v_pass - 1)
         and rr.access in ('composition', 'containment')
         and ((p_verb = 'delete' and rr.on_delete <> 'keep') or (p_verb = 'move' and rr.org_on_move = 'follow'))
    loop
      continue when platform._chg_col_type(r.child_table, 'id') is distinct from 'uuid'
                 or platform._chg_col_type(r.child_table, v_need) is null;
      v_ty := platform._chg_col_type(r.child_table, r.col);
      continue when v_ty is null;
      v_ids := array(select x.id from entity_data_private.chg_tree x where x.rel = r.parent_table and x.depth = v_pass - 1);
      if r.pcol = 'id' then
        v_keys := v_ids::text[];
      else
        execute pg_catalog.format('select array_agg(p.%I::text) from %s p where p.id = any($1)', r.pcol, r.parent_table)
          into v_keys using v_ids;
      end if;
      continue when v_keys is null or cardinality(v_keys) = 0;
      v_live := case when p_verb = 'delete' then ' and c.deleted_at is null' else '' end;
      execute pg_catalog.format(
        'insert into entity_data_private.chg_tree (rel, id, depth, rule_id)
         select %L::regclass, c.id, $2, $3 from %s c
          where c.%I = any($1::%s[])%s
            and not exists (select 1 from entity_data_private.chg_block b where b.rel = %L::regclass and b.id = c.id)
         on conflict do nothing',
        r.child_table, r.child_table, r.col, v_ty, v_live, r.child_table)
        using v_keys, v_pass, r.id;
      get diagnostics v_n = row_count;
      v_new := v_new + v_n;
    end loop;

    -- (2) Polymorphic parts (files, comments, shares) of every frontier record.
    for r in
      select rr.id, rr.child_table, rr.child_columns[1] as type_col, rr.child_columns[2] as id_col
        from platform.relationship_rule rr
       where rr.source_kind = 'polymorphic' and rr.access in ('composition', 'containment')
         and ((p_verb = 'delete' and rr.on_delete <> 'keep') or (p_verb = 'move' and rr.org_on_move = 'follow'))
    loop
      continue when platform._chg_col_type(r.child_table, 'id') is distinct from 'uuid'
                 or platform._chg_col_type(r.child_table, v_need) is null;
      for t in select x.rel, platform._chg_token(x.rel) tok, array_agg(x.id) ids
                 from entity_data_private.chg_tree x where x.depth = v_pass - 1 group by x.rel loop
        continue when t.tok is null;
        v_live := case when p_verb = 'delete' then ' and c.deleted_at is null' else '' end;
        execute pg_catalog.format(
          'insert into entity_data_private.chg_tree (rel, id, depth, rule_id)
           select %L::regclass, c.id, $3, $4 from %s c
            where c.%I = $1 and c.%I = any($2)%s
              and not exists (select 1 from entity_data_private.chg_block b where b.rel = %L::regclass and b.id = c.id)
           on conflict do nothing',
          r.child_table, r.child_table, r.type_col, r.id_col, v_live, r.child_table)
          using t.tok, t.ids, v_pass, r.id;
        get diagnostics v_n = row_count;
        v_new := v_new + v_n;
      end loop;
    end loop;

    -- (3) Association containment (cascades_trash pairs): what a container holds.
    for t in select x.rel, platform._chg_token(x.rel) tok, array_agg(x.id) ids
               from entity_data_private.chg_tree x where x.depth = v_pass - 1 group by x.rel loop
      continue when t.tok is null;
      for at in select a.source_type, a.target_type, a.label, a.container_side
                  from platform.association_types a
                 where a.cascades_trash and a.is_active
                   and ((a.container_side = 'target' and a.target_type = t.tok)
                     or (a.container_side = 'source' and a.source_type = t.tok)) loop
        v_item_rel := platform._chg_rel(case when at.container_side = 'target' then at.source_type else at.target_type end);
        continue when v_item_rel is null or platform._chg_col_type(v_item_rel, v_need) is null;
        execute pg_catalog.format(
          'insert into entity_data_private.chg_tree (rel, id, depth, rule_id)
           select %L::regclass, e.item_id, $4, (select rr.id from platform.relationship_rule rr
                     where rr.source_kind = ''association'' and rr.assoc_source_type = $1 and rr.assoc_target_type = $2
                       and rr.assoc_role = coalesce($3, '''') limit 1)
             from (select case when $5 = ''target'' then a.source_id else a.target_id end item_id
                     from platform.associations a
                    where a.deleted_at is null and a.source_type = $1 and a.target_type = $2
                      and ($3 is null or a.label = $3)
                      and (case when $5 = ''target'' then a.target_id else a.source_id end) = any($6)) e
             join %s i on i.id = e.item_id %s
            where not exists (select 1 from entity_data_private.chg_block b where b.rel = %L::regclass and b.id = e.item_id)
           on conflict do nothing',
          v_item_rel, v_item_rel, case when p_verb = 'delete' then 'and i.deleted_at is null' else '' end, v_item_rel)
          using at.source_type, at.target_type, at.label, v_pass, at.container_side, t.ids;
        get diagnostics v_n = row_count;
        v_new := v_new + v_n;
      end loop;
    end loop;

    -- (4) Part-files a frontier row points at (brand_asset.file_id, snapshot.body_file_id, ...).
    for r in
      select rr.id, rr.child_table, rr.child_columns[1] as col
        from platform.relationship_rule rr
       where rr.source_kind = 'fk' and rr.parent_table = 'files.files'::regclass and rr.access <> 'lookup'
         -- single-column FKs and the (file_id, organization_id) pairs that pin a file to its owner's organization
         and coalesce(rr.parent_columns[1], 'id') = 'id'
         and rr.child_table in (select distinct x.rel from entity_data_private.chg_tree x where x.depth = v_pass - 1)
    loop
      v_ids := array(select x.id from entity_data_private.chg_tree x where x.rel = r.child_table and x.depth = v_pass - 1);
      execute pg_catalog.format(
        'insert into entity_data_private.chg_tree (rel, id, depth, rule_id, pulled)
         select ''files.files''::regclass, f.id, $2, $3, true from files.files f
          where f.id in (select c.%I from %s c where c.id = any($1) and c.%I is not null)%s
            and not exists (select 1 from entity_data_private.chg_block b where b.rel = ''files.files''::regclass and b.id = f.id)
         on conflict do nothing',
        r.col, r.child_table, r.col, case when p_verb = 'delete' then ' and f.deleted_at is null' else '' end)
        using v_ids, v_pass, r.id;
      get diagnostics v_n = row_count;
      v_new := v_new + v_n;
    end loop;

    exit when v_new = 0 or v_pass >= 60;
  end loop;
  return v_pass;
end $function$;

-- Outside users of the given tree rows: reference rules from rows outside the tree, and live
-- association edges whose other end is outside the tree. Lookups, activity and the tree do not count.
create or replace function platform._chg_outside_users(p_rel regclass, p_ids uuid[], p_any_fk boolean default false)
returns table (id uuid, users bigint, sample jsonb, pinned boolean)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  v_tok text := platform._chg_token(p_rel);
  v_soft boolean;
begin
  delete from entity_data_private.chg_users;
  for r in
    select rr.child_table, rr.child_columns[1] col,
           -- a (x_id, organization_id) pair pins the referrer to the referenced row's organization
           (cardinality(rr.child_columns) > 1 and 'organization_id' = any(rr.child_columns)) pinned
      from platform.relationship_rule rr
     where rr.source_kind = 'fk' and rr.parent_table = p_rel and coalesce(rr.parent_columns[1], 'id') = 'id'
       and (cardinality(rr.child_columns) = 1 or rr.constraint_name is not null) and rr.org_on_move <> 'stay'
       and (rr.access = 'reference' or (p_any_fk and rr.access <> 'lookup'))
  loop
    continue when platform._chg_col_type(r.child_table, 'id') is distinct from 'uuid'
               or platform._chg_col_type(r.child_table, r.col) is distinct from 'uuid';
    v_soft := platform._chg_col_type(r.child_table, 'deleted_at') is not null;
    execute pg_catalog.format(
      'insert into entity_data_private.chg_users select c.%I, %L::regclass, c.id, $2 from %s c
        where c.%I = any($1)%s
          and not exists (select 1 from entity_data_private.chg_tree x where x.rel = %L::regclass and x.id = c.id)',
      r.col, r.child_table, r.child_table, r.col, case when v_soft then ' and c.deleted_at is null' else '' end, r.child_table)
      using p_ids, r.pinned;
  end loop;
  if v_tok is not null then
    insert into entity_data_private.chg_users (id, rel, ref_id)
    select case when a.source_type = v_tok and a.source_id = any(p_ids) then a.source_id else a.target_id end,
           platform._chg_rel(case when a.source_type = v_tok and a.source_id = any(p_ids) then a.target_type else a.source_type end),
           case when a.source_type = v_tok and a.source_id = any(p_ids) then a.target_id else a.source_id end
      from platform.associations a
     where a.deleted_at is null
       and ((a.source_type = v_tok and a.source_id = any(p_ids)) or (a.target_type = v_tok and a.target_id = any(p_ids)))
       and not exists (select 1 from entity_data_private.chg_tree x
                        where x.id = case when a.source_type = v_tok and a.source_id = any(p_ids) then a.target_id else a.source_id end);
  end if;
  return query
    select u.id, count(*)::bigint,
           (select coalesce(jsonb_agg(s), '[]'::jsonb) from (
              select platform._chg_items(u2.rel, array[u2.ref_id], 1) -> 0 s
                from entity_data_private.chg_users u2 where u2.id = u.id and u2.rel is not null limit 3) z),
           bool_or(u.pinned)
      from entity_data_private.chg_users u group by u.id;
end $function$;

-- --------------------------------------------------------------- the preview
-- Builds the tree (with survivors for delete), the groups, warnings and grouped questions.
-- Leaves _chg_tree / _chg_q / _chg_surv populated for the commit in the same transaction.
create or replace function platform._chg_build(p_verb text, p_roots jsonb, p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_round int := 0;
  v_surv bigint;
  r record;
  g record;
  q record;
  v_groups jsonb := '[]'::jsonb;
  v_warn jsonb := '[]'::jsonb;
  v_qs jsonb := '[]'::jsonb;
  v_src_org uuid;
  v_src_name text;
  v_tgt_name text;
  v_total bigint;
  v_ty text;
  v_n bigint;
  v_fp text;
  v_roots jsonb := '[]'::jsonb;
  v_label text;
  v_auto bigint;
  v_tok text;
  v_general uuid;
  v_sample jsonb;
begin
  delete from entity_data_private.chg_tree; delete from entity_data_private.chg_block; delete from entity_data_private.chg_surv;
  delete from entity_data_private.chg_q; delete from entity_data_private.chg_qmeta;

  -- the walk, re-run while survivors appear (delete) -----------------------------------------
  loop
    v_round := v_round + 1;
    delete from entity_data_private.chg_tree;
    insert into entity_data_private.chg_tree (rel, id, depth, rule_id)
    select (x ->> 'rel')::regclass, (x ->> 'id')::uuid, 0, null from jsonb_array_elements(p_roots) x
    on conflict do nothing;
    perform platform._chg_walk(p_verb);
    exit when p_verb <> 'delete' or v_round >= 4;
    v_surv := 0;
    -- containment children whose link can be emptied survive when used from outside (§ 3);
    -- part-files survive when anything outside the tree uses them (§ 6).
    for g in
      select x.rel, x.rule_id, rr.child_columns[1] col, bool_or(x.pulled) pulled, array_agg(x.id) ids
        from entity_data_private.chg_tree x
        join platform.relationship_rule rr on rr.id = x.rule_id
       where x.depth > 0 and ((rr.access = 'containment' and rr.detach = 'set_null' and rr.source_kind = 'fk') or x.pulled)
       group by x.rel, x.rule_id, rr.child_columns[1]
    loop
      for r in select u.id from platform._chg_outside_users(g.rel, g.ids, g.pulled) u loop
        insert into entity_data_private.chg_block values (g.rel, r.id) on conflict do nothing;
        insert into entity_data_private.chg_surv values (g.rel, r.id, g.rule_id, case when g.pulled then null else g.col end)
        on conflict do nothing;
        v_surv := v_surv + 1;
      end loop;
    end loop;
    exit when v_surv = 0;
  end loop;

  select count(*) into v_total from entity_data_private.chg_tree;
  select (x.organization_id) into v_src_org
    from jsonb_to_recordset(p_roots) as x(rel text, id uuid, organization_id uuid) limit 1;
  v_src_name := platform._chg_org_name(v_src_org);
  v_tgt_name := platform._chg_org_name(p_target);

  -- roots ------------------------------------------------------------------------------------
  for r in select x.rel, array_agg(x.id) ids from entity_data_private.chg_tree x where x.depth = 0 group by x.rel loop
    v_roots := v_roots || platform._chg_items(r.rel, r.ids, 50);
  end loop;

  -- groups -----------------------------------------------------------------------------------
  for g in
    select x.rel, x.rule_id, count(*) n, array_agg(x.id) ids, bool_or(x.pulled) pulled,
           max(rr.access) access, max(rr.org_on_move) org_on_move, max(rr.declared_by) declared_by
      from entity_data_private.chg_tree x left join platform.relationship_rule rr on rr.id = x.rule_id
     where x.depth > 0
     group by x.rel, x.rule_id
     order by count(*) desc
  loop
    select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(g.rel);
    v_groups := v_groups || jsonb_build_object(
      'rule_id', g.rule_id, 'access', g.access, 'org_on_move', g.org_on_move,
      'type', platform._chg_token(g.rel), 'table', g.rel::text, 'noun', coalesce(v_label, g.rel::text),
      'count', g.n, 'count_is_estimate', false, 'pulled', g.pulled,
      'decided_automatically', g.declared_by = 'classifier',
      'sample', platform._chg_items(g.rel, g.ids[1:5], 5),
      'action', case when p_verb = 'delete' then 'delete' else 'follow' end);
  end loop;

  if p_verb = 'delete' then
    for g in select s.rel, array_agg(s.id) ids, count(*) n from entity_data_private.chg_surv s group by s.rel loop
      select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(g.rel);
      v_warn := v_warn || jsonb_build_object('kind', 'kept_in_use', 'type', platform._chg_token(g.rel),
        'noun', coalesce(v_label, g.rel::text), 'count', g.n, 'items', platform._chg_items(g.rel, g.ids[1:5], 5));
    end loop;
  end if;

  -- activity that stays (move): counted with a door, never moved -----------------------------
  if p_verb = 'move' then
    for r in
      select rr.child_table, rr.child_columns[1] col, x.rel, array_agg(x.id) ids
        from entity_data_private.chg_tree x
        join platform.relationship_rule rr on rr.parent_table = x.rel and rr.source_kind = 'fk'
         and rr.org_on_move = 'stay' and rr.access = 'composition' and cardinality(rr.child_columns) = 1
       group by rr.child_table, rr.child_columns[1], x.rel
    loop
      continue when platform._chg_col_type(r.child_table, r.col) is distinct from 'uuid';
      execute pg_catalog.format('select count(*) from %s c where c.%I = any($1)', r.child_table, r.col) into v_n using r.ids;
      if v_n > 0 then
        v_groups := v_groups || jsonb_build_object('rule_id', null, 'access', 'composition', 'org_on_move', 'stay',
          'type', platform._chg_token(r.child_table), 'table', r.child_table::text, 'noun', r.child_table::text,
          'count', v_n, 'count_is_estimate', false, 'sample', '[]'::jsonb, 'action', 'stay');
      end if;
    end loop;
  end if;

  -- questions (move) -------------------------------------------------------------------------
  if p_verb = 'move' then
    -- (a) the root's own parent / container outside the move.
    insert into entity_data_private.chg_q (qid, kind, rule_id, rel, id, col, other_rel, other_id)
    select 'contained:' || s.rule_id || ':' || substr(md5(s.parent_table::text), 1, 8), 'contained', s.rule_id, s.rel, s.id,
           s.col, s.parent_table, s.parent_id
      from (select x.rel, x.id, rr.id rule_id, rr.parent_table, rr.child_columns[1] col, rr.detach, rr.access,
                   platform._chg_fk_value(x.rel, x.id, rr.child_columns[1])::uuid parent_id
              from entity_data_private.chg_tree x
              join platform.relationship_rule rr on rr.child_table = x.rel and rr.source_kind = 'fk'
               and rr.access in ('composition', 'containment') and cardinality(rr.child_columns) = 1
               and rr.constraint_name is null and coalesce(rr.parent_columns[1], 'id') = 'id'
               and platform._chg_col_type(rr.child_table, rr.child_columns[1]) = 'uuid'
             where x.depth = 0) s
     where s.parent_id is not null
       and not exists (select 1 from entity_data_private.chg_tree y where y.rel = s.parent_table and y.id = s.parent_id);
    for q in select distinct on (c.qid) c.qid, c.rule_id, c.other_rel, rr.detach, rr.access
               from entity_data_private.chg_q c join platform.relationship_rule rr on rr.id = c.rule_id where c.kind = 'contained' loop
      select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(q.other_rel);
      if q.detach = 'set_null' then
        insert into entity_data_private.chg_qmeta values (q.qid, 'contained',
          pg_catalog.format('Inside a %s that stays in %s', lower(coalesce(v_label, 'record')), coalesce(v_src_name, 'its organization')),
          jsonb_build_array(
            jsonb_build_object('value', 'detach', 'label', 'Detach and move', 'consequence', pg_catalog.format('No longer inside the %s', lower(coalesce(v_label, 'record')))),
            jsonb_build_object('value', 'bring', 'label', pg_catalog.format('Move the %s too', lower(coalesce(v_label, 'record'))), 'consequence', 'Everything inside it moves as well')),
          'detach', '[]'::jsonb, 10)
        on conflict do nothing;
      else
        v_warn := v_warn || jsonb_build_object('kind', 'move_parent_instead', 'severity', 'refuse',
          'message', pg_catalog.format('Part of a %s. Move the %s instead.', lower(coalesce(v_label, 'record')), lower(coalesce(v_label, 'record'))),
          'items', (select platform._chg_items(q.other_rel, array_agg(c.other_id), 5) from entity_data_private.chg_q c where c.qid = q.qid));
        delete from entity_data_private.chg_q c where c.qid = q.qid;
      end if;
    end loop;

    -- (b) same-organization references out of the tree (the moved rows point at them).
    insert into entity_data_private.chg_q (qid, kind, rule_id, rel, id, col, other_rel, other_id)
    select 'same_org_ref:' || s.rule_id || ':' || substr(md5(s.parent_table::text), 1, 8), 'same_org_ref', s.rule_id, s.rel, s.id,
           s.col, s.parent_table, s.parent_id
      from (select x.rel, x.id, rr.id rule_id, rr.parent_table, rr.child_columns[1] col,
                   platform._chg_fk_value(x.rel, x.id, rr.child_columns[1])::uuid parent_id
              from entity_data_private.chg_tree x
              join platform.relationship_rule rr on rr.child_table = x.rel and rr.source_kind = 'fk'
               and rr.access = 'reference' and rr.org_on_move = 'decide' and cardinality(rr.child_columns) = 1
               and rr.constraint_name is null and coalesce(rr.parent_columns[1], 'id') = 'id'
               and rr.parent_table <> 'files.files'::regclass
               and platform._chg_col_type(rr.child_table, rr.child_columns[1]) = 'uuid') s
     where s.parent_id is not null
       and not exists (select 1 from entity_data_private.chg_tree y where y.rel = s.parent_table and y.id = s.parent_id)
       and platform._chg_row_org(s.parent_table, s.parent_id) is not distinct from v_src_org;
    for q in select c.qid, min(c.other_rel::text)::regclass other_rel, bool_and(rr.child_nullable) nullable,
                    count(distinct c.other_id) n
               from entity_data_private.chg_q c join platform.relationship_rule rr on rr.id = c.rule_id
              where c.kind = 'same_org_ref' group by c.qid loop
      select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(q.other_rel);
      insert into entity_data_private.chg_qmeta values (q.qid, 'same_org_ref',
        pg_catalog.format('%s %s %s in %s', q.n, lower(coalesce(v_label, 'record')), case when q.n = 1 then 'stays' else 'stay' end, coalesce(v_src_name, 'the old organization')),
        case when q.nullable then jsonb_build_array(
            jsonb_build_object('value', 'bring', 'label', 'Bring along', 'consequence', pg_catalog.format('Moves to %s too', coalesce(v_tgt_name, 'the target'))),
            jsonb_build_object('value', 'cut', 'label', 'Cut the link', 'consequence', 'The moved record stops pointing at it'))
          else jsonb_build_array(
            jsonb_build_object('value', 'bring', 'label', 'Bring along', 'consequence', pg_catalog.format('Moves to %s too', coalesce(v_tgt_name, 'the target')))) end,
        case when q.nullable then 'cut' else 'bring' end,
        jsonb_build_array(jsonb_build_object('value', 'skip', 'label', 'Skip for now', 'consequence', 'Kept as a link across organizations')), 20)
      on conflict do nothing;
    end loop;

    -- (c) links pointing in from outside the tree (references that stay behind).
    for r in
      select rr.id rule_id, rr.child_table, rr.child_columns[1] col, x.rel, array_agg(x.id) ids, rr.child_nullable
        from entity_data_private.chg_tree x
        join platform.relationship_rule rr on rr.parent_table = x.rel and rr.source_kind = 'fk'
         and rr.access = 'reference' and rr.org_on_move = 'decide' and cardinality(rr.child_columns) = 1
         and rr.constraint_name is null and coalesce(rr.parent_columns[1], 'id') = 'id'
       group by rr.id, rr.child_table, rr.child_columns[1], x.rel, rr.child_nullable
    loop
      continue when platform._chg_col_type(r.child_table, 'id') is distinct from 'uuid'
                 or platform._chg_col_type(r.child_table, r.col) is distinct from 'uuid';
      execute pg_catalog.format(
        'insert into entity_data_private.chg_q (qid, kind, rule_id, rel, id, col, other_rel, other_id)
         select $3, ''inbound_link'', $4, %L::regclass, c.%I, %L, %L::regclass, c.id from %s c
          where c.%I = any($1)%s
            and not exists (select 1 from entity_data_private.chg_tree y where y.rel = %L::regclass and y.id = c.id)',
        r.rel, r.col, r.col, r.child_table, r.child_table, r.col,
        case when platform._chg_col_type(r.child_table, 'deleted_at') is not null then ' and c.deleted_at is null' else '' end,
        r.child_table)
        using r.ids, null, 'inbound_link:' || r.rule_id || ':' || substr(md5(r.child_table::text), 1, 8), r.rule_id;
    end loop;
    for q in select c.qid, min(c.other_rel::text)::regclass other_rel, bool_and(rr.child_nullable) nullable,
                    count(distinct c.other_id) n
               from entity_data_private.chg_q c join platform.relationship_rule rr on rr.id = c.rule_id
              where c.kind = 'inbound_link' group by c.qid loop
      select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(q.other_rel);
      insert into entity_data_private.chg_qmeta values (q.qid, 'inbound_link',
        pg_catalog.format('%s %s in %s %s this', q.n, lower(coalesce(v_label, 'record')), coalesce(v_src_name, 'the old organization'), case when q.n = 1 then 'uses' else 'use' end),
        case when q.nullable then jsonb_build_array(
            jsonb_build_object('value', 'cut', 'label', 'Cut their links', 'consequence', 'They stop pointing at the moved record'),
            jsonb_build_object('value', 'bring', 'label', 'Bring them along', 'consequence', pg_catalog.format('They move to %s too', coalesce(v_tgt_name, 'the target'))))
          else jsonb_build_array(
            jsonb_build_object('value', 'bring', 'label', 'Bring them along', 'consequence', pg_catalog.format('They move to %s too', coalesce(v_tgt_name, 'the target')))) end,
        case when q.nullable then 'cut' else 'bring' end,
        jsonb_build_array(jsonb_build_object('value', 'skip', 'label', 'Skip for now', 'consequence', 'Kept as a link across organizations')), 30)
      on conflict do nothing;
    end loop;

    -- (d) association edges with one end outside the tree.
    insert into entity_data_private.chg_q (qid, kind, rule_id, rel, id, edge_id, other_rel, other_id)
    select case
             when e.mine_is_source and e.other_type = 'scope' then 'scope_link:assoc:scope'
             when e.mine_is_source and e.side = 'target' then 'container_link:assoc:' || e.other_type
             when not e.mine_is_source and e.side = 'target' then 'inbound_link:assoc:' || e.other_type
             else 'peer_link:assoc:' || e.other_type end,
           case
             when e.mine_is_source and e.other_type = 'scope' then 'scope_link'
             when e.mine_is_source and e.side = 'target' then 'container_link'
             when not e.mine_is_source and e.side = 'target' then 'inbound_link_assoc'
             else 'peer_link' end,
           null, e.rel, e.my_id, e.edge_id,
           platform._chg_rel(e.other_type), e.other_id
      from (select x.rel, x.id my_id, a.id edge_id,
                   (a.source_type = platform._chg_token(x.rel) and a.source_id = x.id) mine_is_source,
                   case when a.source_type = platform._chg_token(x.rel) and a.source_id = x.id then a.target_type else a.source_type end other_type,
                   case when a.source_type = platform._chg_token(x.rel) and a.source_id = x.id then a.target_id else a.source_id end other_id,
                   coalesce((select t2.container_side from platform.association_types t2
                              where t2.source_type = a.source_type and t2.target_type = a.target_type and t2.is_active
                                and (t2.label is null or t2.label = a.label) order by t2.label nulls last limit 1), 'none') side
              from entity_data_private.chg_tree x
              join platform.associations a on a.deleted_at is null
               and ((a.source_type = platform._chg_token(x.rel) and a.source_id = x.id)
                 or (a.target_type = platform._chg_token(x.rel) and a.target_id = x.id))) e
     where not exists (select 1 from entity_data_private.chg_tree y where y.id = e.other_id);

    -- a home scope other than the old organization's General is a scope link too.
    for r in select x.rel, x.id from entity_data_private.chg_tree x where platform._chg_col_type(x.rel, 'home_scope_id') = 'uuid' loop
      v_tok := platform._chg_fk_value(r.rel, r.id, 'home_scope_id')::text;
      v_general := platform.organization_general_scope(v_src_org);
      if v_tok is not null and v_tok::uuid is distinct from v_general then
        insert into entity_data_private.chg_q (qid, kind, rule_id, rel, id, col, other_rel, other_id)
        values ('scope_link:assoc:scope', 'scope_link', null, r.rel, r.id, 'home_scope_id', 'custom.context_scopes'::regclass, v_tok::uuid);
      end if;
    end loop;

    for q in select c.qid, min(c.kind) kind, min(c.other_rel::text)::regclass other_rel, count(distinct c.other_id) n
               from entity_data_private.chg_q c where c.kind in ('scope_link', 'container_link', 'inbound_link_assoc', 'peer_link')
              group by c.qid loop
      select et.label into v_label from platform.entity_types et where et.token = platform._chg_token(q.other_rel);
      if q.kind = 'scope_link' then
        -- Arman 2026-10-16: linked to scopes = almost certainly a mistake. Loud, named, full detach only.
        v_warn := v_warn || jsonb_build_object('kind', 'scope_alarm', 'severity', 'alarm',
          'message', pg_catalog.format('Filed in %s %s of %s. Moving removes it from all of them.', q.n,
                                       case when q.n = 1 then 'scope' else 'scopes' end, coalesce(v_src_name, 'this organization')),
          'count', q.n,
          'items', (select platform._chg_items('custom.context_scopes'::regclass, array_agg(distinct c.other_id), 50)
                      from entity_data_private.chg_q c where c.qid = q.qid));
        insert into entity_data_private.chg_qmeta values (q.qid, 'scope_link',
          pg_catalog.format('Linked to %s %s in %s', q.n, case when q.n = 1 then 'scope' else 'scopes' end, coalesce(v_src_name, 'this organization')),
          jsonb_build_array(jsonb_build_object('value', 'cut', 'label', 'Detach from all scopes and move',
                                               'consequence', 'Removed from every scope; undo brings the links back')),
          null,
          jsonb_build_array(jsonb_build_object('value', 'cancel', 'label', 'Don''t move it', 'consequence', 'Nothing changes')), 0)
        on conflict do nothing;
      elsif q.kind = 'container_link' then
        insert into entity_data_private.chg_qmeta values (q.qid, 'container_link',
          pg_catalog.format('Linked to %s %s in %s', q.n, lower(coalesce(v_label, 'item')), coalesce(v_src_name, 'the old organization')),
          jsonb_build_array(
            jsonb_build_object('value', 'cut', 'label', 'Unlink', 'consequence', pg_catalog.format('%s stops seeing it there', coalesce(v_src_name, 'The old organization'))),
            jsonb_build_object('value', 'keep', 'label', 'Keep the links', 'consequence', pg_catalog.format('%s keeps access through them', coalesce(v_src_name, 'The old organization')))),
          'cut', jsonb_build_array(jsonb_build_object('value', 'skip', 'label', 'Skip for now', 'consequence', 'Links are kept')), 40)
        on conflict do nothing;
      elsif q.kind = 'inbound_link_assoc' then
        insert into entity_data_private.chg_qmeta values (q.qid, 'inbound_link',
          pg_catalog.format('%s %s inside it %s in %s', q.n, lower(coalesce(v_label, 'item')), case when q.n = 1 then 'stays' else 'stay' end, coalesce(v_src_name, 'the old organization')),
          jsonb_build_array(
            jsonb_build_object('value', 'cut', 'label', 'Unlink them', 'consequence', pg_catalog.format('%s gets no access to them', coalesce(v_tgt_name, 'The target'))),
            jsonb_build_object('value', 'bring', 'label', 'Bring them along', 'consequence', pg_catalog.format('They move to %s too', coalesce(v_tgt_name, 'the target')))),
          'cut', jsonb_build_array(jsonb_build_object('value', 'keep', 'label', 'Keep the links', 'consequence', pg_catalog.format('%s can open them through it', coalesce(v_tgt_name, 'The target')))), 50)
        on conflict do nothing;
      else
        insert into entity_data_private.chg_qmeta values (q.qid, 'peer_link',
          pg_catalog.format('Linked with %s %s', q.n, lower(coalesce(v_label, 'item'))),
          jsonb_build_array(
            jsonb_build_object('value', 'keep', 'label', 'Keep the links', 'consequence', 'Kept as links across organizations'),
            jsonb_build_object('value', 'cut', 'label', 'Unlink', 'consequence', 'The links are removed')),
          'keep', jsonb_build_array(jsonb_build_object('value', 'skip', 'label', 'Skip for now', 'consequence', 'Links are kept')), 60)
        on conflict do nothing;
      end if;
    end loop;

    -- (e) part-files other records also use (§ 6: brand files move with the brand, with the full list).
    for g in select array_agg(x.id) ids from entity_data_private.chg_tree x where x.pulled loop
      continue when g.ids is null;
      insert into entity_data_private.chg_q (qid, kind, rule_id, rel, id, col, other_rel, other_id)
      select 'shared_file:files:shared', 'shared_file', null, 'files.files'::regclass, u.id,
             case when u.pinned then 'pinned' end, null, null
        from platform._chg_outside_users('files.files'::regclass, g.ids, true) u;
      select count(*) into v_n from entity_data_private.chg_q c where c.kind = 'shared_file';
      if exists (select 1 from entity_data_private.chg_q c where c.kind = 'shared_file' and c.col = 'pinned') then
        -- Records that stay hold these files to the old organization (file_id + organization_id), so the
        -- files cannot move under them, and the moved records cannot let go of them. A copy for the moved
        -- side is the file service's copy (plan § 7). Until then: named, every user a door, refused.
        v_warn := v_warn || jsonb_build_object('kind', 'shared_file_pinned', 'severity', 'refuse',
          'message', pg_catalog.format('%s %s also used by records that stay in %s. Move those too, or remove the %s from them first.',
                                       v_n, case when v_n = 1 then 'file is' else 'files are' end, coalesce(v_src_name, 'the old organization'),
                                       case when v_n = 1 then 'file' else 'files' end),
          'items', platform._chg_items('files.files'::regclass, (select array_agg(c.id) from entity_data_private.chg_q c where c.kind = 'shared_file'), 20),
          'users', (select coalesce(jsonb_agg(e.v), '[]'::jsonb)
                      from platform._chg_outside_users('files.files'::regclass,
                             (select array_agg(c.id) from entity_data_private.chg_q c where c.kind = 'shared_file'), true) u,
                           jsonb_array_elements(u.sample) e(v)));
        delete from entity_data_private.chg_q c where c.kind = 'shared_file';
      elsif v_n > 0 then
        insert into entity_data_private.chg_qmeta values ('shared_file:files:shared', 'shared_file',
          pg_catalog.format('%s %s also used elsewhere', v_n, case when v_n = 1 then 'file is' else 'files are' end),
          jsonb_build_array(jsonb_build_object('value', 'move', 'label', 'Move the files',
                      'consequence', pg_catalog.format('Others outside %s may lose them', coalesce(v_tgt_name, 'the target')))),
          'move', jsonb_build_array(jsonb_build_object('value', 'skip', 'label', 'Skip for now', 'consequence', 'They move with it')), 70)
        on conflict do nothing;
        v_warn := v_warn || jsonb_build_object('kind', 'access_loss', 'message', 'Files used by other records',
          'items', platform._chg_items('files.files'::regclass, (select array_agg(c.id) from entity_data_private.chg_q c where c.kind = 'shared_file'), 20));
      end if;
    end loop;

    -- the question list, items as doors
    for q in select m.* from entity_data_private.chg_qmeta m order by m.ord, m.qid loop
      select count(distinct coalesce(c.other_id, c.id)),
             coalesce(platform._chg_items(coalesce(min(c.other_rel::text), min(c.rel::text))::regclass,
                                          (array_agg(distinct coalesce(c.other_id, c.id)))[1:5], 5), '[]'::jsonb)
        into v_n, v_sample from entity_data_private.chg_q c where c.qid = q.qid;
      v_qs := v_qs || jsonb_build_object('id', q.qid, 'kind', q.kind, 'prompt', q.prompt,
        'items', jsonb_build_object('count', v_n, 'sample', v_sample), 'options', q.options, 'suggested', q.suggested,
        'way_out', q.way_out);
    end loop;
  end if;

  -- warnings every review carries ---------------------------------------------------------------
  select count(*) into v_auto from entity_data_private.chg_tree x join platform.relationship_rule rr on rr.id = x.rule_id
   where rr.declared_by = 'classifier';
  if v_auto > 0 then
    v_warn := v_warn || jsonb_build_object('kind', 'decided_automatically', 'count', v_auto);
  end if;
  v_warn := v_warn || jsonb_build_object('kind', 'unchecked_embeds', 'message', 'Uses inside written content are not checked');

  -- the fingerprint hashes DECISIONS, never rows (§ 8.3) -------------------------------------------
  v_fp := md5(jsonb_build_object(
    'roots', (select jsonb_agg(x.rel::text || ':' || x.id || ':' || coalesce(platform._chg_fk_value(x.rel, x.id, 'version')::text, '')
                               order by x.rel::text, x.id) from entity_data_private.chg_tree x where x.depth = 0),
    'groups', (select jsonb_agg(distinct coalesce(x.rule_id::text, 'root') || ':' || x.rel::text) from entity_data_private.chg_tree x),
    'questions', (select jsonb_agg(m.qid || '=' || coalesce(m.suggested, '') order by m.qid) from entity_data_private.chg_qmeta m),
    'named', (select jsonb_agg(distinct coalesce(c.other_id, c.edge_id, c.id)) from entity_data_private.chg_q c),
    'survivors', (select jsonb_agg(s.id order by s.id) from entity_data_private.chg_surv s))::text);

  return jsonb_build_object('verb', p_verb, 'fingerprint', v_fp, 'roots', v_roots, 'groups', v_groups,
    'questions', v_qs, 'warnings', v_warn, 'total_rows', v_total,
    'source_organization', jsonb_build_object('id', v_src_org, 'name', v_src_name),
    'target_organization', case when p_target is null then null else jsonb_build_object('id', p_target, 'name', v_tgt_name) end,
    'mode', case when v_total > coalesce((platform.knob_resolve('change', 'inline_row_budget', null, auth.uid(), null) #>> '{}')::int, 5000)
                 then case when p_verb = 'delete' then 'trigger' else 'durable' end else 'inline' end);
end $function$;

create or replace function platform._chg_fk_value(p_rel regclass, p_id uuid, p_col text)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare v text;
begin
  if platform._chg_col_type(p_rel, p_col) is null then return null; end if;
  execute pg_catalog.format('select c.%I::text from %s c where c.id = $1', p_col, p_rel) into v using p_id;
  return v;
end $function$;

create or replace function platform._chg_row_org(p_rel regclass, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select platform._chg_fk_value(p_rel, p_id, 'organization_id')::uuid
$function$;

-- Log a row the engine wrote.
create or replace function platform._chg_log(p_plan uuid, p_rel regclass, p_id uuid, p_action text, p_depth int,
                                             p_old jsonb default null, p_new jsonb default null)
returns void
language sql
security definer
set search_path to ''
as $function$
  insert into platform.change_item (plan_id, seq, table_ref, row_id, action, depth, old_values, new_values)
  values (p_plan, coalesce((select max(i.seq) from platform.change_item i where i.plan_id = p_plan), 0) + 1,
          p_rel, p_id, p_action, coalesce(p_depth, 0), p_old, p_new)
$function$;

-- ------------------------------------------------------------------- the door
create or replace function platform._chg_records(
  p_verb            text,
  p_entity_type     text,
  p_ids             uuid[],
  p_organization_id uuid    default null,
  p_plan_id         uuid    default null,
  p_answers         jsonb   default '{}'::jsonb,
  p_preview         boolean default true,
  p_fingerprint     text    default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_super boolean;
  v_verb text := lower(btrim(coalesce(p_verb, '')));
  v_rel regclass;
  v_label text;
  v_id uuid;
  v_ids uuid[];
  v_roots jsonb := '[]'::jsonb;
  v_org uuid;
  v_src_org uuid;
  v_prev jsonb;
  v_plan uuid;
  v_at timestamptz := now();
  v_answers jsonb := coalesce(p_answers, '{}'::jsonb);
  v_ans text;
  q record;
  r record;
  g record;
  v_n bigint;
  v_done jsonb := '{}'::jsonb;
  v_pass int;
  v_left int;
  v_progress boolean;
  v_err text;
  v_brought int;
  v_del_plan record;
  v_has_home boolean;
  v_tok text;
  v_defer text;
begin
  if v_me is null then
    raise exception using errcode = '42501', message = 'Sign in to change records.';
  end if;
  if v_verb not in ('delete', 'restore', 'move', 'copy', 'undo') then
    raise exception using errcode = '22023', message = pg_catalog.format('Unknown change "%s".', p_verb),
      hint = 'Use delete, restore, move, copy or undo.';
  end if;
  if v_verb in ('copy', 'undo') then
    -- Announced, never silent: plan § 7 / § 8.6 are later build steps.
    raise exception using errcode = '0A000',
      message = case v_verb when 'copy' then 'Copying records is not offered yet.' else 'Undoing a move is not offered yet.' end;
  end if;
  v_super := coalesce(public.is_super_admin_for(v_me), false);

  -- ===================================================================== restore
  if v_verb = 'restore' then
    if p_plan_id is not null then
      select * into v_del_plan from platform.change_plan p where p.id = p_plan_id and p.verb = 'delete';
    else
      select * into v_del_plan from platform.change_plan p
       where p.verb = 'delete' and p.entity_type = p_entity_type and p.state = 'done' and p.root_ids @> p_ids
       order by p.committed_at desc limit 1;
    end if;
    select et.table_ref, et.label into v_rel, v_label from platform.entity_types et
     where et.token = coalesce(v_del_plan.entity_type, p_entity_type) and et.is_active limit 1;
    if v_rel is null then
      raise exception using errcode = '22023', message = 'Name the kind of record to restore.';
    end if;
    v_ids := coalesce(nullif(p_ids, '{}'), v_del_plan.root_ids);
    if v_ids is null or cardinality(v_ids) = 0 then
      perform platform.refuse_not_found('There is no deleted change with that id you can restore.');
    end if;
    foreach v_id in array v_ids loop
      if not (v_super or platform._chg_fk_value(v_rel, v_id, 'created_by')::uuid is not distinct from v_me
              or iam.has_access(coalesce(v_del_plan.entity_type, p_entity_type), v_id, 'editor')) then
        raise exception using errcode = '42501',
          message = pg_catalog.format('Restoring this %s takes edit access to it. Nothing was restored.', lower(v_label));
      end if;
    end loop;
    if p_preview then
      return jsonb_build_object('verb', 'restore', 'plan_id', v_del_plan.id,
        'roots', platform._chg_items(v_rel, v_ids, 50),
        'rows', (select count(*) from platform.change_item i where i.plan_id = v_del_plan.id and i.action = 'stamped'),
        'groups', '[]'::jsonb, 'questions', '[]'::jsonb, 'warnings', '[]'::jsonb, 'fingerprint', coalesce(v_del_plan.id::text, 'trigger'),
        'mode', case when v_del_plan.id is null or v_del_plan.mode = 'trigger' then 'trigger' else 'inline' end);
    end if;
    insert into platform.change_plan (verb, actor, entity_type, root_ids, state, committed_at, mode)
    values ('restore', v_me, coalesce(v_del_plan.entity_type, p_entity_type), v_ids, 'done', now(),
            case when v_del_plan.id is null or v_del_plan.mode = 'trigger' then 'trigger' else 'inline' end)
    returning id into v_plan;
    if v_del_plan.id is null or v_del_plan.mode = 'trigger' then
      -- Deleted before the engine (or past the inline budget): the live cascade restores by timestamp.
      foreach v_id in array v_ids loop
        execute pg_catalog.format('update %s set deleted_at = null where id = $1 and deleted_at is not null', v_rel) using v_id;
        get diagnostics v_n = row_count;
        if v_n > 0 then perform platform._chg_log(v_plan, v_rel, v_id, 'restored', 0); end if;
      end loop;
    else
      insert into entity_data_private.org_move_txn (xact, plan_id, entity_type, ids)
      values (pg_catalog.txid_current(), v_plan, v_del_plan.entity_type, v_ids);
      -- exactly what that delete took, parents first (the order it was stamped in)
      for r in select i.table_ref, i.row_id, i.depth from platform.change_item i
                where i.plan_id = v_del_plan.id and i.action = 'stamped' order by i.seq loop
        execute pg_catalog.format('update %s set deleted_at = null where id = $1 and deleted_at = $2', r.table_ref)
          using r.row_id, v_del_plan.stamp;
        get diagnostics v_n = row_count;
        if v_n > 0 then perform platform._chg_log(v_plan, r.table_ref, r.row_id, 'restored', r.depth); end if;
      end loop;
      -- survivors re-attach to their restored container
      for r in select i.table_ref, i.row_id, i.old_values from platform.change_item i
                where i.plan_id = v_del_plan.id and i.action = 'detached' order by i.seq loop
        for g in select k, v from jsonb_each_text(r.old_values) as e(k, v) loop
          execute pg_catalog.format('update %s set %I = $2::%s where id = $1 and %I is null', r.table_ref, g.k,
                                    platform._chg_col_type(r.table_ref, g.k), g.k)
            using r.row_id, g.v;
        end loop;
        perform platform._chg_log(v_plan, r.table_ref, r.row_id, 'detached', 0, null, r.old_values);
      end loop;
      update platform.change_plan set state = 'reversed', undone_by = v_plan where id = v_del_plan.id;
      delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
    end if;
    return jsonb_build_object('status', 'done', 'verb', 'restore', 'plan_id', v_plan, 'restored_plan', v_del_plan.id,
      'rows', (select count(*) from platform.change_item i where i.plan_id = v_plan and i.action = 'restored'));
  end if;

  -- ============================================================ delete and move
  select et.table_ref, et.label into v_rel, v_label from platform.entity_types et
   where et.token = p_entity_type and et.is_active and et.table_ref is not null limit 1;
  if v_rel is null then
    raise exception using errcode = '22023', message = pg_catalog.format('There is no kind of record called "%s".', p_entity_type);
  end if;
  v_ids := array(select distinct x from unnest(coalesce(p_ids, '{}'::uuid[])) x where x is not null);
  if cardinality(v_ids) = 0 then
    raise exception using errcode = '22023', message = 'Name the records to change.';
  end if;
  if v_verb = 'delete' and platform._chg_col_type(v_rel, 'deleted_at') is null then
    raise exception using errcode = '0A000', message = pg_catalog.format('%s records never go to the trash.', v_label);
  end if;

  foreach v_id in array v_ids loop
    v_org := platform._chg_row_org(v_rel, v_id);
    if platform._chg_fk_value(v_rel, v_id, 'id') is null
       or not (v_super or iam.has_access(p_entity_type, v_id, 'viewer')) then
      perform platform.refuse_not_found(pg_catalog.format('There is no %s you can open with that id.', lower(v_label)));
    end if;
    v_src_org := coalesce(v_src_org, v_org);
    v_roots := v_roots || jsonb_build_object('rel', v_rel::text, 'id', v_id, 'organization_id', v_org);
  end loop;

  if v_verb = 'move' then
    if p_organization_id is null or not exists (select 1 from iam.organizations o where o.id = p_organization_id) then
      perform platform.refuse_not_found('That organization does not exist.');
    end if;
    if not (v_super or iam.has_org_access_for(v_me, p_organization_id)) then
      raise exception using errcode = '42501',
        message = pg_catalog.format('You are not a member of %s, so you cannot move things into it.', platform._chg_org_name(p_organization_id));
    end if;
  end if;

  v_prev := platform._chg_build(v_verb, v_roots, p_organization_id);

  if p_preview then
    insert into platform.change_plan (verb, actor, entity_type, root_ids, source_organization_id, target_organization_id,
                                      fingerprint, preview, state, mode)
    values (v_verb, v_me, p_entity_type, v_ids, v_src_org, p_organization_id, v_prev ->> 'fingerprint', v_prev, 'previewed',
            v_prev ->> 'mode')
    returning id into v_plan;
    return v_prev || jsonb_build_object('plan_id', v_plan, 'status', 'preview');
  end if;

  -- ------------------------------------------------------------------ commit
  if p_fingerprint is distinct from (v_prev ->> 'fingerprint') then
    return v_prev || jsonb_build_object('status', 'changed', 'code', '40001',
      'message', 'This changed while you were looking. Review it again.');
  end if;
  -- Who may: delete = the table's delete right; move = creator, full access, or an admin of its organization.
  foreach v_id in array v_ids loop
    if v_verb = 'delete' then
      if not (v_super or platform._chg_fk_value(v_rel, v_id, 'created_by')::uuid is not distinct from v_me
              or iam.has_access(p_entity_type, v_id, 'admin')) then
        raise exception using errcode = '42501',
          message = pg_catalog.format('Only the person who added this %s, or someone with full access to it, can delete it. Nothing was deleted.', lower(v_label));
      end if;
    else
      if not (v_super or platform._chg_fk_value(v_rel, v_id, 'created_by')::uuid is not distinct from v_me
              or iam.has_access(p_entity_type, v_id, 'admin')
              or public.is_org_admin_for(v_me, platform._chg_row_org(v_rel, v_id))) then
        raise exception using errcode = '42501',
          message = pg_catalog.format('Moving this %s takes full access to it or admin of its organization. Nothing was moved.', lower(v_label));
      end if;
    end if;
  end loop;
  -- every question needs an answer (§ 8.3); nothing is filled in silently
  for q in select x ->> 'id' qid from jsonb_array_elements(v_prev -> 'questions') x loop
    if not (v_answers ? q.qid) then
      return v_prev || jsonb_build_object('status', 'needs_answers', 'missing', q.qid,
        'message', 'Answer every question first.');
    end if;
    if v_answers ->> q.qid = 'cancel' then
      return jsonb_build_object('status', 'cancelled', 'verb', v_verb, 'question', q.qid,
                                'message', 'You chose not to move it. Nothing changed.');
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(v_prev -> 'warnings') w where w ->> 'severity' = 'refuse') then
    raise exception using errcode = '23514',
      message = (select w ->> 'message' from jsonb_array_elements(v_prev -> 'warnings') w where w ->> 'severity' = 'refuse' limit 1);
  end if;

  -- "Bring along" widens the move: re-walk with the brought records as roots, and every new
  -- question that appears must also be answered before anything is written.
  if v_verb = 'move' then
    v_brought := 0;
    for r in select distinct c.other_rel, c.other_id from entity_data_private.chg_q c
              where c.kind in ('contained', 'same_org_ref', 'inbound_link', 'inbound_link_assoc')
                and coalesce(v_answers ->> (c.qid || '#' || coalesce(c.other_id, c.id)), v_answers ->> c.qid) = 'bring'
                and c.other_rel is not null and c.other_id is not null loop
      v_roots := v_roots || jsonb_build_object('rel', r.other_rel::text, 'id', r.other_id,
                                               'organization_id', platform._chg_row_org(r.other_rel, r.other_id));
      v_brought := v_brought + 1;
    end loop;
    if v_brought > 0 then
      v_prev := platform._chg_build('move', v_roots, p_organization_id);
      for q in select x ->> 'id' qid from jsonb_array_elements(v_prev -> 'questions') x loop
        if not (v_answers ? q.qid) then
          return v_prev || jsonb_build_object('status', 'needs_answers', 'missing', q.qid,
            'message', 'Bringing those along raised new questions.');
        end if;
      end loop;
    end if;
  end if;

  insert into platform.change_plan (verb, actor, entity_type, root_ids, source_organization_id, target_organization_id,
                                    answers, fingerprint, preview, state, mode, stamp, committed_at, undo_until)
  values (v_verb, v_me, p_entity_type, v_ids, v_src_org, p_organization_id, v_answers, p_fingerprint, v_prev, 'committed',
          v_prev ->> 'mode', v_at, now(), case when v_verb = 'move' then now() + make_interval(days =>
            coalesce((platform.knob_resolve('move', 'undo_window_days', p_organization_id, v_me, null) #>> '{}')::int, 30)) end)
  returning id into v_plan;

  -- one lock per root, sorted (§ 8.5)
  for r in select x.rel, x.id from entity_data_private.chg_tree x where x.depth = 0 order by x.rel::text, x.id loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('change:' || coalesce(platform._chg_token(r.rel), r.rel::text) || ':' || r.id, 0));
  end loop;

  -- ------------------------------------------------------------------ delete
  if v_verb = 'delete' then
    if v_prev ->> 'mode' = 'trigger' then
      -- Above the inline budget: the roots are stamped and the live cascade (with its deferred job) walks.
      foreach v_id in array v_ids loop
        execute pg_catalog.format('update %s set deleted_at = $2 where id = $1 and deleted_at is null', v_rel) using v_id, v_at;
        perform platform._chg_log(v_plan, v_rel, v_id, 'stamped', 0);
      end loop;
      update platform.change_plan set state = 'done' where id = v_plan;
      return jsonb_build_object('status', 'done', 'verb', 'delete', 'plan_id', v_plan, 'mode', 'trigger',
                                'rows', cardinality(v_ids), 'total_rows', (v_prev ->> 'total_rows')::bigint);
    end if;
    insert into entity_data_private.org_move_txn (xact, plan_id, entity_type, ids)
    values (pg_catalog.txid_current(), v_plan, p_entity_type, v_ids);
    -- survivors detach first (old value logged; restoring the container re-attaches them)
    for r in select s.rel, s.id, s.col from entity_data_private.chg_surv s loop
      perform platform._chg_log(v_plan, r.rel, r.id, 'survived', 1);
      continue when r.col is null;
      perform platform._chg_log(v_plan, r.rel, r.id, 'detached', 1,
                                jsonb_build_object(r.col, platform._chg_fk_value(r.rel, r.id, r.col)));
      execute pg_catalog.format('update %s set %I = null where id = $1', r.rel, r.col) using r.id;
    end loop;
    -- parents before children; every row stamped by the engine itself (one walker, § 3)
    for g in select x.depth, x.rel, array_agg(x.id) ids from entity_data_private.chg_tree x group by x.depth, x.rel order by x.depth, x.rel::text loop
      for r in execute pg_catalog.format('update %s set deleted_at = $2 where id = any($1) and deleted_at is null returning id', g.rel)
                 using g.ids, v_at loop
        perform platform._chg_log(v_plan, g.rel, r.id, 'stamped', g.depth);
      end loop;
    end loop;
    delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
    update platform.change_plan set state = 'done' where id = v_plan;
    return jsonb_build_object('status', 'done', 'verb', 'delete', 'plan_id', v_plan, 'mode', 'inline',
      'rows', (select count(*) from platform.change_item i where i.plan_id = v_plan and i.action = 'stamped'),
      'kept_in_use', (select count(*) from entity_data_private.chg_surv));
  end if;

  -- -------------------------------------------------------------------- move
  if v_prev ->> 'mode' = 'durable' then
    raise exception using errcode = '0A000',
      message = pg_catalog.format('This move touches %s rows; moves this large are not offered yet.', v_prev ->> 'total_rows');
  end if;
  insert into entity_data_private.org_move_txn (xact, plan_id, entity_type, ids)
  values (pg_catalog.txid_current(), v_plan, p_entity_type, v_ids);
  -- rows that pin a file to their organization (file_id, organization_id) move in separate statements;
  -- those deferrable checks run once, at the end of the move, inside this function (named, never ALL)
  select string_agg(pg_catalog.format('%I.%I', n.nspname, con.conname), ', ') into v_defer
    from pg_catalog.pg_constraint con join pg_catalog.pg_namespace n on n.oid = con.connamespace
   where con.contype = 'f' and con.condeferrable and not con.condeferred
     and (con.conrelid in (select distinct x.rel from entity_data_private.chg_tree x) or con.confrelid in (select distinct x.rel from entity_data_private.chg_tree x));
  if v_defer is not null then
    execute 'set constraints ' || v_defer || ' deferred';
  end if;

  -- answers that change links before the rows move
  for q in select c.* from entity_data_private.chg_q c loop
    v_ans := coalesce(v_answers ->> (q.qid || '#' || coalesce(q.other_id, q.id)), v_answers ->> q.qid);
    if q.kind in ('contained', 'same_org_ref') and v_ans in ('detach', 'cut') then
      perform platform._chg_log(v_plan, q.rel, q.id, 'detached', 0, jsonb_build_object(q.col, q.other_id));
      execute pg_catalog.format('update %s set %I = null where id = $1', q.rel, q.col) using q.id;
    elsif q.kind = 'inbound_link' and v_ans = 'cut' then
      perform platform._chg_log(v_plan, q.other_rel, q.other_id, 'detached', 0, jsonb_build_object(q.col, q.id));
      execute pg_catalog.format('update %s set %I = null where id = $1', q.other_rel, q.col) using q.other_id;
    elsif q.edge_id is not null and v_ans = 'cut' then
      update platform.associations a set deleted_at = now(), deleted_via_type = 'change_plan', deleted_via_id = v_plan
       where a.id = q.edge_id and a.deleted_at is null;
      get diagnostics v_n = row_count;
      if v_n > 0 then perform platform._chg_log(v_plan, 'platform.associations'::regclass, q.edge_id, 'cut_edge', 0); end if;
    end if;
  end loop;

  -- the rows: parents before children; a refusal that only means "your parent has not moved yet"
  -- is retried on the next pass; anything left after that fails the whole move (nothing stays behind).
  delete from entity_data_private.chg_todo;
  insert into entity_data_private.chg_todo select x.depth, x.rel, array_agg(x.id) from entity_data_private.chg_tree x group by x.depth, x.rel;
  v_pass := 0;
  loop
    v_pass := v_pass + 1;
    v_progress := false;
    for g in select t.* from entity_data_private.chg_todo t order by t.depth, t.rel::text loop
      begin
        v_has_home := platform._chg_col_type(g.rel, 'home_scope_id') = 'uuid';
        for r in execute pg_catalog.format(
            'with o as (select c.id, c.organization_id, %s home from %s c where c.id = any($1) and c.organization_id is distinct from $2)
             update %s t set organization_id = $2%s from o where t.id = o.id
             returning t.id, o.organization_id, o.home',
            case when v_has_home then 'c.home_scope_id' else 'null::uuid' end, g.rel, g.rel,
            case when v_has_home then ', home_scope_id = platform.organization_general_scope($2)' else '' end)
            using g.ids, p_organization_id loop
          perform platform._chg_log(v_plan, g.rel, r.id, 'moved', g.depth,
            jsonb_strip_nulls(jsonb_build_object('organization_id', r.organization_id, 'home_scope_id', r.home)),
            jsonb_build_object('organization_id', p_organization_id));
        end loop;
        delete from entity_data_private.chg_todo t where t.depth = g.depth and t.rel = g.rel;
        v_progress := true;
      exception when sqlstate '23514' then
        v_err := sqlerrm;
      end;
    end loop;
    exit when not exists (select 1 from entity_data_private.chg_todo) or not v_progress or v_pass >= 25;
  end loop;
  if exists (select 1 from entity_data_private.chg_todo) then
    raise exception using errcode = '23514',
      message = 'Some records under this one could not follow it to the other organization. Nothing was moved.',
      detail = pg_catalog.format('Unmoved: %s. Last refusal: %s',
        (select string_agg(t.rel::text, ', ') from entity_data_private.chg_todo t), coalesce(v_err, 'none'));
  end if;

  -- association edges belong to their source: edges whose source moved follow it (§ 5)
  for r in select x.rel, platform._chg_token(x.rel) tok, array_agg(x.id) ids from entity_data_private.chg_tree x group by x.rel loop
    continue when r.tok is null;
    for g in update platform.associations a set organization_id = p_organization_id
              where a.source_type = r.tok and a.source_id = any(r.ids) and a.deleted_at is null
                and a.organization_id is distinct from p_organization_id
             returning a.id loop
      perform platform._chg_log(v_plan, 'platform.associations'::regclass, g.id, 'edge_moved', 0,
                                jsonb_build_object('organization_id', v_src_org));
    end loop;
  end loop;

  if v_defer is not null then
    execute 'set constraints ' || v_defer || ' immediate';
  end if;
  delete from entity_data_private.org_move_txn where xact = pg_catalog.txid_current();
  update platform.change_plan set state = 'done' where id = v_plan;
  return jsonb_build_object('status', 'done', 'verb', 'move', 'plan_id', v_plan, 'mode', 'inline',
    'organization', jsonb_build_object('id', p_organization_id, 'name', platform._chg_org_name(p_organization_id)),
    'rows', (select count(*) from platform.change_item i where i.plan_id = v_plan and i.action = 'moved'),
    'cut', (select count(*) from platform.change_item i where i.plan_id = v_plan and i.action in ('cut_edge', 'detached')));
end $function$;

-- The door: the engine, then its scratch rows cleared (a raise rolls them back with everything else).
create or replace function platform.change_records(
  p_verb            text,
  p_entity_type     text,
  p_ids             uuid[],
  p_organization_id uuid    default null,
  p_plan_id         uuid    default null,
  p_answers         jsonb   default '{}'::jsonb,
  p_preview         boolean default true,
  p_fingerprint     text    default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign in to change records.';
  end if;
  -- the access decisions (iam.has_access per root, iam.has_org_access_for on the target) are taken
  -- inside platform._chg_records before its first read of any row
  v_out := platform._chg_records(p_verb, p_entity_type, p_ids, p_organization_id, p_plan_id, p_answers, p_preview, p_fingerprint);
  delete from entity_data_private.change_work w where w.xact = pg_catalog.txid_current();
  return v_out;
end $function$;

-- ---------------------------------------------------------------- access decisions
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       case when p.proname = 'change_records'
            then 'p_ids: each root is checked with iam.has_access(p_entity_type, id) (viewer to preview; admin or creator to delete; editor or creator to restore; admin, creator or org admin to move) and p_organization_id with iam.has_org_access_for; NULL ids are refused.'
            else 'Move and archive engine internals; called only from platform.change_records, which checks every root first.' end,
       '20261016101000_move_archive_engine',
       case when p.proname = 'change_records' then null
            else 'server_only: the move-and-archive engine (platform.change_records) calls this; no client ever does.' end,
       p.proname = 'change_records', false,
       case when p.proname = 'change_records' then jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
         'p_ids', jsonb_build_object('type', 'uuid[]', 'position', 3, 'optional', false,
           'check', 'iam.has_access(p_entity_type, id, viewer) for every id before the preview walks; delete needs creator or admin, restore creator or editor, move creator, admin or organization admin',
           'foreign', jsonb_build_object('bounded', true, 'note', 'A root the caller cannot open refuses as not found before anything is read; the walk starts only from roots that passed.')),
         'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 4, 'optional', true,
           'check', 'iam.has_org_access_for(auth.uid(), p_organization_id) before a move preview is built',
           'foreign', jsonb_build_object('bounded', true, 'note', 'An organization the caller is not a member of raises 42501 before the walk; it is only ever the move target.'),
           'null_rule', jsonb_build_object('means', 'not a move')),
         'p_plan_id', jsonb_build_object('type', 'uuid', 'position', 5, 'optional', true,
           'check', 'the plan only supplies root ids; each root is then checked with creator or iam.has_access(type, id, editor)',
           'foreign', jsonb_build_object('bounded', true, 'note', 'A foreign plan names roots the caller cannot edit, which refuse with 42501 before any row is restored.'),
           'null_rule', jsonb_build_object('means', 'the latest finished delete of these roots')))) end
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'platform'
   and p.proname in ('change_records', '_chg_records', '_chg_items', '_chg_org_name', '_chg_walk', '_chg_outside_users', '_chg_build',
                     '_chg_fk_value', '_chg_row_org', '_chg_log')
   and not exists (select 1 from platform.client_callable_door d where d.schema_name = n.nspname and d.function_name = p.proname
                     and d.identity_args = pg_catalog.pg_get_function_identity_arguments(p.oid));

revoke all on function platform._chg_items(regclass, uuid[], integer), platform._chg_org_name(uuid), platform._chg_walk(text),
  platform._chg_outside_users(regclass, uuid[], boolean), platform._chg_build(text, jsonb, uuid),
  platform._chg_fk_value(regclass, uuid, text), platform._chg_row_org(regclass, uuid),
  platform._chg_log(uuid, regclass, uuid, text, integer, jsonb, jsonb),
  platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) from public, anon, authenticated;
grant execute on function platform.change_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) to authenticated;

-- ------------------------------------------- org-pinned file references are deferrable
-- web.snapshot and web.screenshot already are; brand_asset was the one (file_id, organization_id) pair that was not,
-- so a brand and its logo could never change organization in one transaction.
alter table web.brand_asset alter constraint brand_asset_file_org_fkey deferrable initially immediate;
-- the covering index every foreign key needs (431 rows: a plain build is instant)
create index if not exists brand_asset_file_org_idx on web.brand_asset (file_id, organization_id);
-- re-declaring the key makes it new to the shape guard, which asks for the same-org check every nullable
-- tenant reference carries (validation only; the composite key already enforces it)
drop trigger if exists trg_same_org_web_brand_asset_file_id on web.brand_asset;
create trigger trg_same_org_web_brand_asset_file_id before insert or update of file_id on web.brand_asset
  for each row execute function platform.assert_same_org('file_id', 'files.files');

-- ------------------------------------------------------- the one walker (§ 3)
-- Under the engine's marker the row-trigger cascade steps aside: the engine stamped every row itself.
do $do$
declare v_def text; v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('platform._cascade_soft_delete()'::pg_catalog.regprocedure);
  v_new := replace(v_def,
    E'  if current_setting(''custom.archive_bulk'', true) = ''on'' then\n    return null;\n  end if;',
    E'  if current_setting(''custom.archive_bulk'', true) = ''on'' then\n    return null;\n  end if;\n'
    || E'  -- MOVE AND ARCHIVE (plan § 3): the engine walks and stamps every row itself inside its marker.\n'
    || E'  if platform.change_marker() is not null then\n    return null;\n  end if;');
  if v_new = v_def then
    raise exception 'platform._cascade_soft_delete: the archive_bulk early return was not found; nothing changed';
  end if;
  execute v_new;
end $do$;

-- ------------------------------------------------- classifier: parts are deleted with their parent
-- A composition or containment child that has deleted_at is stamped with its parent whatever the
-- foreign key's hard-delete action says (RESTRICT guards hard deletes, not archives): brand personas,
-- 86 such rules on 2026-10-16, were left live under an archived parent. And a NOT NULL ON DELETE
-- CASCADE key is a part (seo.ai_visibility_*, web.temp_brand_* were read as references).
do $do$
declare v_def text; v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('platform.classify_relationships()'::pg_catalog.regprocedure);
  v_new := replace(v_def,
    $a$case when d.klass in ('composition', 'containment') and d.child_soft and d.deltype = 'c' then 'cascade' else 'keep' end$a$,
    $a$case when d.klass in ('composition', 'containment') and d.child_soft then 'cascade' else 'keep' end$a$);
  v_new := replace(v_new,
    $a$or (f.fk_notnull and (f.has_assert or (f.deltype in ('c', 'r') and f.child_type in ('detail', 'ledger')))) then 'composition'$a$,
    $a$or (f.fk_notnull and (f.has_assert or f.deltype = 'c' or (f.deltype = 'r' and f.child_type in ('detail', 'ledger')))) then 'composition'$a$);
  if v_new = v_def or position($a$d.child_soft then 'cascade'$a$ in v_new) = 0 or position($a$f.deltype = 'c' or$a$ in v_new) = 0 then
    raise exception 'platform.classify_relationships: an expected clause was not found; nothing changed';
  end if;
  execute v_new;
end $do$;

update platform.relationship_rule r
   set on_delete = 'cascade', reason = r.reason || '; parts archive with their parent'
 where r.declared_by = 'classifier' and r.source_kind = 'fk' and r.access in ('composition', 'containment')
   and r.org_on_move = 'follow' and r.on_delete = 'keep'
   and platform._chg_col_type(r.child_table, 'deleted_at') is not null;

-- (seo.ai_visibility_*, web.temp_brand_* were read as references.) Declared rows untouched.
update platform.relationship_rule r
   set access = 'composition', org_on_move = 'follow', on_purge = 'with_parent', on_copy = 'copy', detach = 'none',
       on_delete = case when platform._chg_col_type(r.child_table, 'deleted_at') is not null then 'cascade' else 'keep' end,
       reason = 'classifier: not-null cascade'
 where r.declared_by = 'classifier' and r.source_kind = 'fk' and r.access = 'reference' and r.child_nullable is false
   and exists (select 1 from pg_catalog.pg_constraint con
                where con.contype = 'f' and con.conrelid = r.child_table and con.confrelid = r.parent_table
                  and con.confdeltype = 'c' and cardinality(con.conkey) = 1
                  and (select a.attname::text from pg_catalog.pg_attribute a
                        where a.attrelid = con.conrelid and a.attnum = con.conkey[1]) = r.child_columns[1]);

-- ------------------------------------------------------------- liveness checks
-- Read by scripts/check-soft-delete-cascade.ts beside the cascade checks (service role only).
-- Every check answers from the catalog and the register, never from a file on disk.
create or replace function platform.change_engine_conformance()
returns table (check_key text, ok boolean, severity text, detail jsonb)
language sql
stable
set search_path to ''
as $function$
  -- every foreign key, polymorphic pair, association role and relation field has a rule
  select 'relationships_all_ruled'::text,
         not exists (select 1 from platform.v_relationship_unruled),
         'error'::text,
         jsonb_build_object('why', 'A relationship without a rule is walked by no one: a delete or move silently leaves it behind.',
                            'unruled', (select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
                                          from (select * from platform.v_relationship_unruled limit 20) u))
  union all
  -- the one door exists, runs as definer, is declared for signed-in callers and every id argument is ruled
  select 'change_engine_door_declared',
         exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'platform' and p.proname = 'change_records' and p.prosecdef
                    and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'))
         and exists (select 1 from platform.client_callable_door d
                      where d.schema_name = 'platform' and d.function_name = 'change_records' and d.signed_in_callers
                        and d.argument_rules #> '{arguments,p_ids,foreign}' is not null
                        and d.argument_rules #> '{arguments,p_organization_id,foreign}' is not null
                        and d.argument_rules #> '{arguments,p_plan_id,foreign}' is not null),
         'error',
         jsonb_build_object('why', 'platform.change_records is the one delete / restore / move door; without it every surface falls back to its own walker.')
  union all
  -- under the engine's marker the row-trigger cascade steps aside (one walker, plan § 3)
  select 'row_cascade_steps_aside_for_engine',
         pg_catalog.pg_get_functiondef('platform._cascade_soft_delete()'::pg_catalog.regprocedure) like '%platform.change_marker()%',
         'error',
         jsonb_build_object('why', 'Two walkers stamp the same rows and disagree about what survives.')
  union all
  -- a (x_id, organization_id) reference can follow its row inside one move only when its check can wait
  select 'org_pinned_references_deferrable',
         not exists (select 1 from pg_catalog.pg_constraint c
                      where c.contype = 'f' and cardinality(c.conkey) > 1 and not c.condeferrable
                        and exists (select 1 from pg_catalog.pg_attribute a
                                     where a.attrelid = c.conrelid and a.attnum = any (c.conkey) and a.attname = 'organization_id')),
         'error',
         jsonb_build_object('why', 'A record pinned to its file''s organization can never move with it in one transaction.',
                            'not_deferrable', (select coalesce(jsonb_agg(c.conrelid::regclass::text || '.' || c.conname), '[]'::jsonb)
                                                 from pg_catalog.pg_constraint c
                                                where c.contype = 'f' and cardinality(c.conkey) > 1 and not c.condeferrable
                                                  and exists (select 1 from pg_catalog.pg_attribute a
                                                               where a.attrelid = c.conrelid and a.attnum = any (c.conkey)
                                                                 and a.attname = 'organization_id')))
$function$;
revoke all on function platform.change_engine_conformance() from public, anon, authenticated;
grant execute on function platform.change_engine_conformance() to service_role;

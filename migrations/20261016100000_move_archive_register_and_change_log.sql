-- chair-step: every DROP is an idempotent re-create of a policy or trigger this file adds; every REVOKE closes a new object to clients; the DELETEs live inside the classifier body and touch only its own register rows.
-- based-on: files.files_org_move_guard() 94e9ff7feb205a1c7b944839a71646768936352131bd9166463f6d2bb025c289
-- =============================================================================
-- MOVE AND ARCHIVE — step 1: the relationship register, its classifier, the
-- change log and the engine's transaction marker.
-- Plan: common-docs/systems/architecture/database/projects/move-and-archive/PLAN.md
-- (§ 1 register, § 8.4 marker, § 10 knobs, § 14 contracts).
--
-- One rule per relationship, two decisions per rule (access, org_on_move).
-- Every FK (single-column by columns, multi-column by constraint name), every
-- polymorphic source, every association role and every soft-delete edge gets a
-- rule. The classifier proposes (declared_by = 'classifier'); a declared rule is
-- never overwritten by it. soft_delete_edge rows are folded in as declared rules
-- (declared_by = 'soft_delete_edge'), and a trigger keeps them folded while the
-- live cascade still reads that table (open item: retire it, plan § 12).
-- =============================================================================

-- ---------------------------------------------------------------- the register
create table if not exists platform.relationship_rule (
  id                uuid primary key default gen_random_uuid(),
  source_kind       text not null check (source_kind in ('fk', 'polymorphic', 'association', 'custom_field')),
  parent_table      regclass,
  child_table       regclass,
  child_columns     text[],
  parent_columns    text[],
  constraint_name   text,
  parent_token      text,
  assoc_source_type text,
  assoc_target_type text,
  assoc_role        text,
  custom_field_id   uuid,
  access            text not null check (access in ('composition', 'containment', 'reference', 'lookup')),
  org_on_move       text not null check (org_on_move in ('follow', 'stay', 'decide')),
  on_delete         text not null check (on_delete in ('cascade', 'cascade_deferred', 'keep')),
  on_purge          text not null check (on_purge in ('with_parent', 'set_null', 'hold')),
  on_copy           text not null check (on_copy in ('copy', 'repoint', 'skip')),
  detach            text not null check (detach in ('set_null', 'none')),
  same_org_required boolean not null default false,
  child_nullable    boolean,
  parent_noun       text,
  reason            text,
  declared_by       text not null,
  declared_at       timestamptz not null default now()
);

create unique index if not exists relationship_rule_identity
  on platform.relationship_rule (source_kind, parent_table, child_table, child_columns, constraint_name,
                                 parent_token, assoc_source_type, assoc_target_type, assoc_role, custom_field_id)
  nulls not distinct;
create index if not exists relationship_rule_parent on platform.relationship_rule (parent_table) where parent_table is not null;
create index if not exists relationship_rule_child on platform.relationship_rule (child_table) where child_table is not null;

alter table platform.relationship_rule enable row level security;
drop policy if exists platform_admin_read on platform.relationship_rule;
create policy platform_admin_read on platform.relationship_rule for select using ((select public.is_platform_admin()));
grant select on platform.relationship_rule to service_role;

comment on table platform.relationship_rule is
  'Move and archive register (System): one rule per relationship, two decisions per rule. Written only by platform.declare_relationship_rule and platform.classify_relationships. Plan: move-and-archive § 1, § 14.1.';

-- ----------------------------------------------------- entity type declarations
alter table platform.entity_types add column if not exists copy_mode text;
alter table platform.entity_types add column if not exists org_move text not null default 'engine';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'entity_types_copy_mode_check') then
    alter table platform.entity_types add constraint entity_types_copy_mode_check check (copy_mode in ('deep', 'shallow'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'entity_types_org_move_check') then
    alter table platform.entity_types add constraint entity_types_org_move_check check (org_move in ('engine', 'feature', 'never'));
  end if;
end $$;

-- ------------------------------------------------------------- the one writer
create or replace function platform.declare_relationship_rule(
  p_source_kind text, p_parent_table regclass, p_child_table regclass, p_child_columns text[],
  p_access text, p_org_on_move text, p_on_delete text, p_on_purge text, p_on_copy text, p_detach text,
  p_same_org_required boolean default false, p_reason text default null, p_declared_by text default 'migration',
  p_parent_columns text[] default null, p_constraint_name text default null, p_parent_token text default null,
  p_assoc_source_type text default null, p_assoc_target_type text default null, p_assoc_role text default null,
  p_custom_field_id uuid default null, p_parent_noun text default null, p_child_nullable boolean default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id uuid;
begin
  insert into platform.relationship_rule as r
    (source_kind, parent_table, child_table, child_columns, parent_columns, constraint_name, parent_token,
     assoc_source_type, assoc_target_type, assoc_role, custom_field_id, access, org_on_move, on_delete, on_purge,
     on_copy, detach, same_org_required, child_nullable, parent_noun, reason, declared_by, declared_at)
  values
    (p_source_kind, p_parent_table, p_child_table, p_child_columns, p_parent_columns, p_constraint_name, p_parent_token,
     p_assoc_source_type, p_assoc_target_type, p_assoc_role, p_custom_field_id, p_access, p_org_on_move, p_on_delete,
     p_on_purge, p_on_copy, p_detach, coalesce(p_same_org_required, false), p_child_nullable, p_parent_noun, p_reason,
     p_declared_by, now())
  on conflict (source_kind, parent_table, child_table, child_columns, constraint_name, parent_token,
               assoc_source_type, assoc_target_type, assoc_role, custom_field_id)
  do update set access = excluded.access, org_on_move = excluded.org_on_move, on_delete = excluded.on_delete,
                on_purge = excluded.on_purge, on_copy = excluded.on_copy, detach = excluded.detach,
                same_org_required = excluded.same_org_required, child_nullable = excluded.child_nullable,
                parent_columns = coalesce(excluded.parent_columns, r.parent_columns),
                parent_noun = coalesce(excluded.parent_noun, r.parent_noun), reason = excluded.reason,
                declared_by = excluded.declared_by, declared_at = now()
  returning id into v_id;
  return v_id;
end $function$;
revoke all on function platform.declare_relationship_rule from public, anon, authenticated;

-- ------------------------------------------------------------- the classifier
-- Proposes a rule for every relationship without a declared one (plan § 1, first match wins).
-- Deviation, on purpose: a pointer into iam/auth or a Reference/System table is decided as a lookup
-- FIRST, so organization_id / created_by FKs are never read as composition.
create or replace function platform.classify_relationships()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_fk int; v_sde int; v_poly int; v_assoc int; v_gone int;
begin
  -- Rules whose table vanished.
  delete from platform.relationship_rule r
   where (r.parent_table is not null and not exists (select 1 from pg_catalog.pg_class c where c.oid = r.parent_table))
      or (r.child_table is not null and not exists (select 1 from pg_catalog.pg_class c where c.oid = r.child_table));
  get diagnostics v_gone = row_count;

  -- Classifier rows are recomputed from scratch; declared rows stay as declared.
  delete from platform.relationship_rule where declared_by = 'classifier';

  -- 1. soft_delete_edge, folded in as declared rules.
  with s as (
    select e.*, pg_catalog.to_regclass(pg_catalog.format('%I.%I', e.parent_schema, e.parent_table)) p,
           pg_catalog.to_regclass(pg_catalog.format('%I.%I', e.child_schema, e.child_table)) c
      from platform.soft_delete_edge e
  ), t as (
    select s.*, ct.type as child_type,
           (select not a.attnotnull from pg_catalog.pg_attribute a
             where a.attrelid = s.c and a.attname = s.child_column and not a.attisdropped) as nullable,
           exists (select 1 from platform.entity_relationships er
                    join platform.entity_types pc on pc.token = er.child_type
                    join platform.entity_types pp on pp.token = er.parent_type
                   where er.kind = 'containment' and er.fk_column = s.child_column
                     and pc.schema_name = s.child_schema and pc.table_name = s.child_table
                     and pp.schema_name = s.parent_schema and pp.table_name = s.parent_table) as er_containment
      from s
      left join lateral (select et.type from platform.entity_types et
                          where et.schema_name = s.child_schema and et.table_name = s.child_table
                          order by et.is_active desc, et.is_component limit 1) ct on true
     where s.p is not null and s.c is not null
  )
  insert into platform.relationship_rule as r
    (source_kind, parent_table, child_table, child_columns, parent_columns, access, org_on_move, on_delete, on_purge,
     on_copy, detach, same_org_required, child_nullable, parent_noun, reason, declared_by)
  select 'fk', t.p, t.c, array[t.child_column], array[t.parent_column],
         case when t.action = 'keep' then 'reference'
              when t.er_containment or (coalesce(t.nullable, false) and t.child_type = 'entity') then 'containment'
              else 'composition' end,
         case when t.action = 'keep' then 'decide' else 'follow' end,
         t.action,
         case when t.action = 'keep' then case when coalesce(t.nullable, false) then 'set_null' else 'hold' end
              else 'with_parent' end,
         case when t.action = 'keep' then 'repoint' else 'copy' end,
         case when t.action <> 'keep' and coalesce(t.nullable, false)
                   and (t.er_containment or t.child_type = 'entity') then 'set_null' else 'none' end,
         false, t.nullable, t.parent_noun, t.reason, 'soft_delete_edge'
    from t
  on conflict (source_kind, parent_table, child_table, child_columns, constraint_name, parent_token,
               assoc_source_type, assoc_target_type, assoc_role, custom_field_id)
  do update set access = excluded.access, org_on_move = excluded.org_on_move, on_delete = excluded.on_delete,
                on_purge = excluded.on_purge, on_copy = excluded.on_copy, detach = excluded.detach,
                child_nullable = excluded.child_nullable, parent_columns = excluded.parent_columns,
                parent_noun = excluded.parent_noun, reason = excluded.reason, declared_at = now()
          where r.declared_by = 'soft_delete_edge';
  get diagnostics v_sde = row_count;

  -- 2. Every foreign key (partition copies skipped: the root's constraint is the rule).
  with fk as (
    select con.conname::text conname, con.conrelid child, con.confrelid parent, con.confdeltype::text deltype,
           cardinality(con.conkey) ncols,
           array(select a.attname::text from unnest(con.conkey) with ordinality k(n, o)
                   join pg_catalog.pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n order by k.o) cols,
           array(select a.attname::text from unnest(con.confkey) with ordinality k(n, o)
                   join pg_catalog.pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n order by k.o) pcols,
           (select bool_and(a.attnotnull) from pg_catalog.pg_attribute a
             where a.attrelid = con.conrelid and a.attnum = any(con.conkey)) fk_notnull,
           cn.nspname::text cschema, cc.relname::text ctable, pn.nspname::text pschema, pc.relname::text ptable
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class cc on cc.oid = con.conrelid
      join pg_catalog.pg_namespace cn on cn.oid = cc.relnamespace
      join pg_catalog.pg_class pc on pc.oid = con.confrelid
      join pg_catalog.pg_namespace pn on pn.oid = pc.relnamespace
     where con.contype = 'f' and con.conparentid = 0
       and cn.nspname not in ('pg_catalog', 'information_schema', 'deprecated')
       and cc.relkind in ('r', 'p')
  ), f as (
    select fk.*,
           (select et.type from platform.entity_types et where et.schema_name = fk.cschema and et.table_name = fk.ctable
             order by et.is_active desc, et.is_component limit 1) child_type,
           (select et.type from platform.entity_types et where et.schema_name = fk.pschema and et.table_name = fk.ptable
             order by et.is_active desc, et.is_component limit 1) parent_type,
           (select et.org_move from platform.entity_types et where et.schema_name = fk.cschema and et.table_name = fk.ctable
             order by et.is_active desc, et.is_component limit 1) child_org_move,
           exists (select 1 from pg_catalog.pg_trigger tg
                    cross join lateral (select pg_catalog.string_to_array(pg_catalog.encode(tg.tgargs, 'escape'), E'\\000') a) x
                   where tg.tgrelid = fk.child and tg.tgfoid = 'platform.refuse_org_foreign_to_parent()'::pg_catalog.regprocedure
                     and x.a[1] = fk.pschema and x.a[2] = fk.ptable and x.a[3] = fk.cols[1]) has_refuse,
           exists (select 1 from pg_catalog.pg_trigger tg
                    cross join lateral (select pg_catalog.string_to_array(pg_catalog.encode(tg.tgargs, 'escape'), E'\\000') a) x
                   where tg.tgrelid = fk.child and tg.tgfoid = 'platform.assert_same_org()'::pg_catalog.regprocedure
                     and x.a[1] = fk.cols[1]) has_assert,
           (select er.kind from platform.entity_relationships er
              join platform.entity_types ec on ec.token = er.child_type
              join platform.entity_types ep on ep.token = er.parent_type
             where ec.schema_name = fk.cschema and ec.table_name = fk.ctable
               and ep.schema_name = fk.pschema and ep.table_name = fk.ptable and er.fk_column = fk.cols[1]
             limit 1) er_kind,
           (fk.ctable ~ '(usage|meter|billing|audit|invoice|spend|charge|_log$|_logs$|activity)') is_activity,
           exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = fk.child and a.attname = 'deleted_at'
                    and not a.attisdropped) child_soft
      from fk
  ), d as (
    select f.*,
      case
        when f.pschema in ('iam', 'auth', 'storage', 'extensions') or f.parent_type in ('reference', 'system')
             or f.ptable in ('entity_types', 'organizations', 'users') then 'lookup'
        when f.is_activity then 'activity'
        when f.er_kind = 'containment' then 'containment'
        when f.er_kind = 'composition' or f.has_refuse
             or (f.fk_notnull and (f.has_assert or (f.deltype in ('c', 'r') and f.child_type in ('detail', 'ledger')))) then 'composition'
        when f.child_type = 'deprecated' or f.child_org_move = 'never' then 'stay'
        when f.has_assert and not f.fk_notnull then 'same_org_ref'
        else 'reference'
      end klass
    from f
  )
  insert into platform.relationship_rule as r
    (source_kind, parent_table, child_table, child_columns, parent_columns, constraint_name, access, org_on_move,
     on_delete, on_purge, on_copy, detach, same_org_required, child_nullable, reason, declared_by)
  select 'fk', d.parent, d.child, d.cols, d.pcols, case when d.ncols > 1 then d.conname end,
         case d.klass when 'lookup' then 'lookup' when 'activity' then 'composition' when 'containment' then 'containment'
                      when 'composition' then 'composition' else 'reference' end,
         case d.klass when 'lookup' then 'stay' when 'activity' then 'stay' when 'stay' then 'stay'
                      when 'containment' then 'follow' when 'composition' then 'follow' else 'decide' end,
         case when d.klass in ('composition', 'containment') and d.child_soft and d.deltype = 'c' then 'cascade' else 'keep' end,
         case when d.klass in ('composition', 'containment', 'activity') then 'with_parent'
              when not d.fk_notnull then 'set_null' else 'hold' end,
         case d.klass when 'composition' then 'copy' when 'containment' then 'copy' when 'activity' then 'skip'
                      when 'lookup' then 'repoint' else 'repoint' end,
         case when d.klass = 'containment' and not d.fk_notnull then 'set_null'
              when d.klass in ('reference', 'same_org_ref') and not d.fk_notnull then 'set_null' else 'none' end,
         d.klass = 'same_org_ref' or d.has_refuse or d.has_assert,
         not d.fk_notnull,
         'classifier: ' || d.klass, 'classifier'
    from d
  on conflict (source_kind, parent_table, child_table, child_columns, constraint_name, parent_token,
               assoc_source_type, assoc_target_type, assoc_role, custom_field_id)
  do nothing;
  get diagnostics v_fk = row_count;

  -- 3. Polymorphic sources (plan § 1 table). parent_token '*' = every entity type.
  with p(tbl, type_col, id_col, access, org_on_move, on_delete, note) as (values
    ('files.files', 'parent_record_type', 'parent_record_id', 'composition', 'follow', 'cascade', 'A part-file (§ 6).'),
    ('platform.comments', 'entity_type', 'entity_id', 'composition', 'follow', 'cascade', 'Comments on the record.'),
    ('platform.share_links', 'resource_type', 'resource_id', 'composition', 'follow', 'keep', 'Shares stay with the record.'),
    ('platform.user_entity_state', 'entity_type', 'entity_id', 'lookup', 'stay', 'keep', 'Each person''s own state.'),
    ('platform.hidden_item', 'entity_type', 'entity_id', 'lookup', 'stay', 'keep', 'Each person''s own state.'),
    ('platform.activity_log', 'entity_type', 'entity_id', 'reference', 'stay', 'keep', 'Activity.'),
    ('platform.outcome_event', 'entity_type', 'entity_id', 'reference', 'stay', 'keep', 'Activity.')
  ), q as (
    select pg_catalog.to_regclass(p.tbl) rel, p.* from p
  )
  insert into platform.relationship_rule as r
    (source_kind, parent_table, child_table, child_columns, parent_token, access, org_on_move, on_delete, on_purge,
     on_copy, detach, reason, declared_by)
  select 'polymorphic', null, q.rel, array[q.type_col, q.id_col], '*', q.access, q.org_on_move, q.on_delete,
         case when q.access in ('composition', 'containment') then 'with_parent' else 'hold' end,
         case when q.access = 'composition' then 'copy' else 'skip' end, 'none', q.note, 'classifier'
    from q
   where q.rel is not null
     and exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = q.rel and a.attname = q.type_col and not a.attisdropped)
     and exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = q.rel and a.attname = q.id_col and not a.attisdropped)
  on conflict (source_kind, parent_table, child_table, child_columns, constraint_name, parent_token,
               assoc_source_type, assoc_target_type, assoc_role, custom_field_id)
  do nothing;
  get diagnostics v_poly = row_count;

  -- 4. Association roles: one rule per (source, target, label) with '' as the pair's default.
  insert into platform.relationship_rule as r
    (source_kind, assoc_source_type, assoc_target_type, assoc_role, access, org_on_move, on_delete, on_purge,
     on_copy, detach, reason, declared_by)
  select distinct on (t.source_type, t.target_type, coalesce(t.label, ''))
         'association', t.source_type, t.target_type, coalesce(t.label, ''),
         case when t.cascades_trash then 'composition' else 'reference' end,
         case when t.cascades_trash then 'follow' else 'decide' end,
         case when t.cascades_trash then 'cascade' else 'keep' end,
         'with_parent', case when t.cascades_trash then 'copy' else 'skip' end, 'none',
         'classifier: container_side=' || t.container_side, 'classifier'
    from platform.association_types t
   where t.is_active
   order by t.source_type, t.target_type, coalesce(t.label, ''), t.cascades_trash desc
  on conflict (source_kind, parent_table, child_table, child_columns, constraint_name, parent_token,
               assoc_source_type, assoc_target_type, assoc_role, custom_field_id)
  do nothing;
  get diagnostics v_assoc = row_count;

  return jsonb_build_object('soft_delete_edge', v_sde, 'fk', v_fk, 'polymorphic', v_poly,
                            'association', v_assoc, 'removed_for_missing_tables', v_gone);
end $function$;
revoke all on function platform.classify_relationships from public, anon, authenticated;

-- Every FK without a rule (the guard reads this; empty = green).
create or replace view platform.v_relationship_unruled with (security_invoker = true) as
select con.conname::text as constraint_name, con.conrelid::regclass::text as child_table,
       con.confrelid::regclass::text as parent_table,
       array(select a.attname::text from unnest(con.conkey) with ordinality k(n, o)
               join pg_catalog.pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n order by k.o) as child_columns
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class cc on cc.oid = con.conrelid
  join pg_catalog.pg_namespace cn on cn.oid = cc.relnamespace
 where con.contype = 'f' and con.conparentid = 0
   and cn.nspname not in ('pg_catalog', 'information_schema', 'deprecated')
   and cc.relkind in ('r', 'p')
   and not exists (
     select 1 from platform.relationship_rule r
      where r.source_kind = 'fk' and r.child_table = con.conrelid and r.parent_table = con.confrelid
        and r.child_columns = array(select a.attname::text from unnest(con.conkey) with ordinality k(n, o)
                                      join pg_catalog.pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n
                                     order by k.o));
revoke all on platform.v_relationship_unruled from public, anon, authenticated;
grant select on platform.v_relationship_unruled to service_role;

-- soft_delete_edge stays folded while the live cascade still reads it.
create or replace function platform._soft_delete_edge_fold()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform platform.classify_relationships();
  return null;
end $function$;
drop trigger if exists _fold_into_relationship_rule on platform.soft_delete_edge;
create trigger _fold_into_relationship_rule after insert or update or delete on platform.soft_delete_edge
  for each statement execute function platform._soft_delete_edge_fold();

-- ------------------------------------------------------------- the marker (§ 8.4)
create schema if not exists entity_data_private;
revoke all on schema entity_data_private from public, anon, authenticated;
create table if not exists entity_data_private.org_move_txn (
  xact        bigint not null,
  plan_id     uuid not null,
  entity_type text,
  ids         uuid[],
  created_at  timestamptz not null default now(),
  primary key (xact, plan_id)
);
revoke all on entity_data_private.org_move_txn from public, anon, authenticated;

-- The plan the current transaction is committing, or null. No client writes the marker table.
create or replace function platform.change_marker()
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select m.plan_id from entity_data_private.org_move_txn m
   where m.xact = pg_catalog.txid_current_if_assigned() limit 1
$function$;
revoke all on function platform.change_marker() from public, anon, authenticated;

-- --------------------------------------------------------------- the change log
create table if not exists platform.change_plan (
  id                     uuid primary key default gen_random_uuid(),
  verb                   text not null check (verb in ('delete', 'restore', 'move', 'copy', 'undo')),
  actor                  uuid,
  entity_type            text,
  root_ids               uuid[] not null default '{}',
  source_organization_id uuid,
  target_organization_id uuid,
  answers                jsonb not null default '{}'::jsonb,
  fingerprint            text,
  preview                jsonb,
  state                  text not null default 'previewed'
                         check (state in ('previewed', 'committed', 'running', 'held', 'done', 'reversing', 'reversed', 'failed')),
  mode                   text not null default 'inline' check (mode in ('inline', 'durable', 'trigger')),
  stamp                  timestamptz,
  created_at             timestamptz not null default now(),
  committed_at           timestamptz,
  undo_until             timestamptz,
  undone_by              uuid references platform.change_plan (id)
);
create index if not exists change_plan_actor on platform.change_plan (actor, created_at desc);
create index if not exists change_plan_roots on platform.change_plan using gin (root_ids);
create index if not exists change_plan_undone_by on platform.change_plan (undone_by) where undone_by is not null;

create table if not exists platform.change_item (
  plan_id    uuid not null references platform.change_plan (id) on delete cascade,
  seq        bigint not null,
  table_ref  regclass not null,
  row_id     uuid,
  action     text not null check (action in ('moved', 'stamped', 'restored', 'detached', 'cut_edge', 'copied',
                                             'repointed', 'kept', 'survived', 'edge_moved')),
  depth      integer not null default 0,
  old_values jsonb,
  new_values jsonb,
  copy_of    uuid,
  created_at timestamptz not null default now(),
  primary key (plan_id, seq)
);
create index if not exists change_item_row on platform.change_item (table_ref, row_id);

alter table platform.change_plan enable row level security;
alter table platform.change_item enable row level security;
drop policy if exists platform_admin_read on platform.change_plan;
create policy platform_admin_read on platform.change_plan for select using ((select public.is_platform_admin()));
drop policy if exists platform_admin_read on platform.change_item;
create policy platform_admin_read on platform.change_item for select using ((select public.is_platform_admin()));
grant select on platform.change_plan, platform.change_item to service_role;

comment on table platform.change_plan is 'Move and archive change log (System): one row per previewed or committed change. Plan § 14.2.';
comment on table platform.change_item is 'Move and archive change log (System): every row the engine wrote, with old values. Plan § 14.2.';

-- --------------------------------------------------- guards that admit the engine
-- files.files_org_move_guard: an organization change inside the engine's transaction is the engine's.
create or replace function files.files_org_move_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'iam', 'auth'
as $function$
begin
  if auth.role() is distinct from 'anon' and auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if new.organization_id is distinct from old.organization_id then
    -- Move and archive engine (plan § 6, § 8.4): it checked the move rule itself.
    if platform.change_marker() is not null then
      return new;
    end if;
    if new.organization_id is not null
       and old.metadata @> '{"system_artifact": true, "artifact_domain": "web_crawl"}'::jsonb
       and exists (select 1 from web.site s
                    where s.id::text = old.metadata ->> 'web_site_id'
                      and s.organization_id = new.organization_id) then
      return new;
    end if;
    if auth.uid() is null or auth.uid() is distinct from old.created_by then
      raise exception 'matrx_validation_gate: only the file creator may move a file to another organization'
        using errcode = '42501';
    end if;
    if new.organization_id is not null
       and not iam.has_org_access_for((select auth.uid()), new.organization_id) then
      raise exception 'matrx_validation_gate: cannot move a file into an organization you are not a member of'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- ----------------------------------------------------------------------- knobs (§ 10)
insert into platform.feature_knob (feature, key, value, default_value, value_type, unit, min_value, max_value,
  allowed_values, label, description, set_by, basis, review_due, overridable_by, override_direction, ui, propagation,
  public_read, delegable)
values
  ('change', 'inline_row_budget', '5000', '5000', 'integer', 'rows', 1, 100000, null,
   'Rows a change writes in one step', 'Above this, a delete runs in bounded batches.', 'agent',
   'Move and archive plan § 8.5.', '2027-01-16', '{}', 'any', '{}', 'next_load', false, true),
  ('change', 'exact_count_limit', '10000', '10000', 'integer', 'rows', 100, 1000000, null,
   'Rows counted exactly in a review', 'Above this, a group shows an estimate.', 'agent',
   'Move and archive plan § 8.2.', '2027-01-16', '{}', 'any', '{}', 'next_load', false, true),
  ('change', 'remember_answers', 'true', 'true', 'boolean', null, null, null, null,
   'Remember my last answer', 'Your last answer becomes the suggestion next time.', 'agent',
   'Move and archive plan § 10.', '2027-01-16', '{user}', 'any', '{}', 'next_load', false, true),
  ('move', 'contained_children', '"follow"', '"follow"', 'enum', null, null, null, '["follow","stay"]',
   'Contained items on a move', 'Whether items inside a moved record move with it.', 'agent',
   'Move and archive plan § 10.', '2027-01-16', '{organization,user}', 'any', '{}', 'next_load', false, true),
  ('move', 'old_org_container_links', '"cut"', '"cut"', 'enum', null, null, null, '["cut","keep"]',
   'Links to the old organization''s containers', 'Suggested answer for projects, tasks and folders left behind.', 'agent',
   'Move and archive plan § 10.', '2027-01-16', '{organization}', 'any', '{}', 'next_load', false, true),
  ('move', 'peer_links', '"keep"', '"keep"', 'enum', null, null, null, '["keep","cut"]',
   'Links between records on a move', 'Suggested answer for links that give no access.', 'agent',
   'Move and archive plan § 10.', '2027-01-16', '{organization}', 'any', '{}', 'next_load', false, true),
  ('move', 'shared_files', '"move"', '"move"', 'enum', null, null, null, '["move","leave"]',
   'Shared files on a move', 'Suggested answer for files other records also use.', 'agent',
   'Move and archive plan § 6, § 10.', '2027-01-16', '{organization,user}', 'any', '{}', 'next_load', false, true),
  ('move', 'allowed_by', '"rule"', '"rule"', 'enum', null, null, null, '["rule","org_admins"]',
   'Who may move records out', 'Narrow moves to organization admins.', 'agent',
   'Move and archive plan § 0, § 10.', '2027-01-16', '{organization}', 'any', '{}', 'next_load', false, true),
  ('move', 'notify_owners', 'true', 'true', 'boolean', null, null, null, null,
   'Tell owners about a move', 'Owners hear when their records change organization.', 'agent',
   'Move and archive plan § 10.', '2027-01-16', '{organization}', 'any', '{}', 'next_load', false, true),
  ('move', 'undo_window_days', '30', '30', 'integer', 'days', 0, 365, null,
   'Days a move can be undone', 'After this, Undo move is no longer offered.', 'agent',
   'Move and archive plan § 8.6, § 10.', '2027-01-16', '{organization}', 'any', '{}', 'next_load', false, true)
on conflict (feature, key) do nothing;

-- archive_confirm_over is widened to the platform: a person may set it too (plan § 9, § 10).
update platform.feature_knob set overridable_by = '{organization,user}'
 where feature = 'custom' and key = 'archive_confirm_over' and not ('user' = any(overridable_by));


-- ------------------------------------------------------------ registration (machinery)
insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref, type)
values
  ('relationship_rule', 'platform', 'relationship_rule', 'Relationship rule', 'machinery',
   'Engine register read only by platform.change_records and the guards; no person reads it in the app.', 'platform.relationship_rule'::regclass, 'system'),
  ('change_plan', 'platform', 'change_plan', 'Change plan', 'machinery',
   'Change log written and read by platform.change_records; people see it only through that door.', 'platform.change_plan'::regclass, 'system'),
  ('change_item', 'platform', 'change_item', 'Change item', 'machinery',
   'Change log rows written and read by platform.change_records; people see them only through that door.', 'platform.change_item'::regclass, 'system'),
  ('org_move_txn', 'entity_data_private', 'org_move_txn', 'Change marker', 'machinery',
   'Transaction marker the engine writes and deletes inside one transaction; guards read it.', 'entity_data_private.org_move_txn'::regclass, 'system')
on conflict (token) do nothing;
alter table entity_data_private.org_move_txn enable row level security;


-- ------------------------------------------------------------ access decisions (server-only definers)
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), array(select unnest(p.proargtypes))::oid[],
       'Move and archive machinery; takes no entity id from a caller.', '20261016100000_move_archive_register_and_change_log',
       'server_only: migrations and the move-and-archive engine call this; no client ever calls it directly.', false, false
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'platform' and p.proname in ('declare_relationship_rule', 'classify_relationships', 'change_marker')
   and not exists (select 1 from platform.client_callable_door d where d.schema_name = n.nspname and d.function_name = p.proname
                     and d.identity_args = pg_catalog.pg_get_function_identity_arguments(p.oid));

-- ------------------------------------------------------------------------ run it
select platform.classify_relationships();

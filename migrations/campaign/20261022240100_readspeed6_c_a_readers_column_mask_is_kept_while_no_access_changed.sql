-- chair-step: replaces custom.read_mask_for and custom._computed_warm in place (a kept answer read first, the unchanged body as its fallback); additive table, no trigger dropped
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-6
-- lock: custom
-- allows: revoke custom
-- based-on: custom.read_mask_for(uuid, uuid, uuid, permission_level, text) e307fa155d301ce95f2841de6d0861c10088709ea8385272c4f0d702ea2135a3
-- based-on: custom._computed_warm(uuid, uuid, uuid) 93188caf7818cb18c8a910efffa521eae7e3bffa84cd5fbf9cbbaf04304bf1d0
--
-- READ-SPEED-6 c — A READER'S COLUMN MASK IS KEPT WHILE NO ACCESS CHANGED.
-- Profiled on a served 50-row page (Customers, Jobs; admin): after serving, the biggest single cost left was the field
-- question — custom.read_mask_for -> iam.visible_field_ids -> iam.may_touch_field per column -> custom.field_input_closure,
-- 300-600 ms per level asked. The answer depends only on what the access version tracks (every access door, every
-- Field, Table, rule and kernel write moves custom._access_versions), so the refresh door (custom._computed_warm) now
-- keeps it per reader, Table and level, exactly as it keeps the reader's judgement, and custom.read_mask_for reads the
-- kept answer while the versions stand and for 5 minutes; otherwise it works it out exactly as before
-- (custom._read_mask_compute is the unchanged body, run as its caller: only the definer read doors and the refresh door call it). The door also stops re-judging a reader whose judgement is current.
-- Inverse: migrations/inverse/20261022240100_readspeed6_c_a_readers_column_mask_is_kept_while_no_access_changed_down.sql
create table if not exists custom.read_mask_kept (
  reader_id       uuid not null,
  organization_id uuid not null,
  table_id        uuid not null,
  level           text not null,
  versions        bigint[] not null,
  mask            jsonb not null,
  kept_at         timestamptz not null default now(),
  primary key (reader_id, organization_id, table_id, level)
);
alter table custom.read_mask_kept enable row level security;
revoke all on table custom.read_mask_kept from public, anon, authenticated;
insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
values ('read_mask_kept', 'custom', 'read_mask_kept', 'Read Mask Kept', 'machinery',
        'machinery: a reader''s column mask of a Table at one level, stamped with the access versions; written by custom._computed_warm (the refresh door), read by custom.read_mask_for inside SECURITY DEFINER read doors; RLS on, no grants to anon or authenticated; schema custom is CLOSED',
        'custom.read_mask_kept'::regclass)
on conflict do nothing;
comment on table custom.read_mask_kept is 'READ-SPEED-6 c: custom.read_mask_for answers kept per reader, Table and level while custom._access_versions stands (and 5 minutes); written by custom._computed_warm only.';

CREATE FUNCTION custom._read_mask_compute(p_user_id uuid, p_organization_id uuid, p_table_id uuid, p_level permission_level, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_key      text;
  v_hit      text;
  v_visible  text[];
  v_declared text[];
  v_notices  jsonb;
  v_key_ids  jsonb;
  v_all_ids  jsonb;
  v_out      jsonb;
begin
  if p_table_id is null then
    return jsonb_build_object('table_id', null, 'level', null,
                              'visible', '[]'::jsonb, 'declared', '[]'::jsonb,
                              'notices', '{}'::jsonb, 'key_ids', '{}'::jsonb,
                              'all_key_ids', '{}'::jsonb,
                              'undeclared_ride_along', true);
  end if;

  v_key := 'rmf:' || coalesce(p_user_id::text, '-') || ':' || coalesce(p_organization_id::text, '-')
        || ':' || p_table_id::text || ':' || coalesce(p_level::text, '-') || ':' || coalesce(p_action, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    return v_hit::jsonb;
  end if;

  select coalesce(array_agg(f.field_key), '{}'::text[])
    into v_visible
    from iam.visible_field_ids(p_user_id, p_organization_id, p_table_id, p_level, p_action) f;

  select coalesce(array_agg(f.data ->> 'key'), '{}'::text[]),
         coalesce(jsonb_object_agg(f.data ->> 'key', f.id::text), '{}'::jsonb)
    into v_declared, v_all_ids
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id;

  select coalesce(jsonb_object_agg(f.data ->> 'key', custom.hidden_field_notice(f, p_action)), '{}'::jsonb),
         coalesce(jsonb_object_agg(f.data ->> 'key', f.id::text), '{}'::jsonb)
    into v_notices, v_key_ids
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and not (f.data ->> 'key' = any (v_visible));

  v_out := jsonb_build_object(
    'table_id',    p_table_id,
    'level',       p_level,
    'visible',     to_jsonb(v_visible),
    'declared',    to_jsonb(v_declared),
    'notices',     v_notices,
    'key_ids',     v_key_ids,
    'all_key_ids', v_all_ids,
    'undeclared_ride_along', true);
  perform platform.memo_k_put(v_key, v_out::text);
  return v_out;
end;
$function$;
revoke all on function custom._read_mask_compute(uuid, uuid, uuid, public.permission_level, text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION custom.read_mask_for(p_user_id uuid, p_organization_id uuid, p_table_id uuid, p_level permission_level, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_key      text;
  v_hit      text;
  v_visible  text[];
  v_declared text[];
  v_notices  jsonb;
  v_key_ids  jsonb;
  v_all_ids  jsonb;
  v_out      jsonb;
begin
  if p_table_id is null then
    return jsonb_build_object('table_id', null, 'level', null,
                              'visible', '[]'::jsonb, 'declared', '[]'::jsonb,
                              'notices', '{}'::jsonb, 'key_ids', '{}'::jsonb,
                              'all_key_ids', '{}'::jsonb,
                              'undeclared_ride_along', true);
  end if;

  v_key := 'rmf:' || coalesce(p_user_id::text, '-') || ':' || coalesce(p_organization_id::text, '-')
        || ':' || p_table_id::text || ':' || coalesce(p_level::text, '-') || ':' || coalesce(p_action, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    return v_hit::jsonb;
  end if;
  -- READ-SPEED-6 c: THE KEPT MASK. The same answer, kept by the refresh door (custom._computed_warm) for this reader,
  -- Table and level while no access changed (custom._access_versions: every access door and every Field, Table, rule
  -- or kernel write moves it) and for 5 minutes. Worked out here, exactly as before, when none is current.
  if p_action = 'read' and p_user_id is not null and p_organization_id is not null and p_level is not null then
    select k.mask into v_out from custom.read_mask_kept k
     where k.reader_id = p_user_id and k.organization_id = p_organization_id and k.table_id = p_table_id
       and k.level = p_level::text and k.versions = custom._access_versions(p_organization_id)
       and k.kept_at > now() - interval '5 minutes';
    if v_out is not null then
      perform platform.memo_k_put(v_key, v_out::text);
      return v_out;
    end if;
  end if;

  select coalesce(array_agg(f.field_key), '{}'::text[])
    into v_visible
    from iam.visible_field_ids(p_user_id, p_organization_id, p_table_id, p_level, p_action) f;

  select coalesce(array_agg(f.data ->> 'key'), '{}'::text[]),
         coalesce(jsonb_object_agg(f.data ->> 'key', f.id::text), '{}'::jsonb)
    into v_declared, v_all_ids
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id;

  select coalesce(jsonb_object_agg(f.data ->> 'key', custom.hidden_field_notice(f, p_action)), '{}'::jsonb),
         coalesce(jsonb_object_agg(f.data ->> 'key', f.id::text), '{}'::jsonb)
    into v_notices, v_key_ids
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and not (f.data ->> 'key' = any (v_visible));

  v_out := jsonb_build_object(
    'table_id',    p_table_id,
    'level',       p_level,
    'visible',     to_jsonb(v_visible),
    'declared',    to_jsonb(v_declared),
    'notices',     v_notices,
    'key_ids',     v_key_ids,
    'all_key_ids', v_all_ids,
    'undeclared_ride_along', true);
  perform platform.memo_k_put(v_key, v_out::text);
  return v_out;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._computed_warm(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ver bigint[] := custom._access_versions(p_org);
  v_ok  boolean;
  v_lvl public.permission_level;
begin
  if p_me is null then
    return false;
  end if;
  -- READ-SPEED-6 c: this reader's masks of this Table, kept at every level while no access changed (custom.read_mask_for
  -- reads them); only a level with no current kept mask is worked out
  foreach v_lvl in array enum_range(null::public.permission_level) loop
    continue when exists (select 1 from custom.read_mask_kept k
                           where k.reader_id = p_me and k.organization_id = p_org and k.table_id = p_table
                             and k.level = v_lvl::text and k.versions = v_ver and k.kept_at > now() - interval '4 minutes');
    insert into custom.read_mask_kept as k (reader_id, organization_id, table_id, level, versions, mask, kept_at)
    values (p_me, p_org, p_table, v_lvl::text, v_ver, custom._read_mask_compute(p_me, p_org, p_table, v_lvl, 'read'), now())
    on conflict (reader_id, organization_id, table_id, level)
    do update set versions = excluded.versions, mask = excluded.mask, kept_at = excluded.kept_at;
  end loop;
  if not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  -- READ-SPEED-6 c: a current judgement is kept, not judged again on every call
  select j.ok into v_ok from custom.computed_reader_judgement j
   where j.reader_id = p_me and j.organization_id = p_org and j.table_id = p_table
     and j.versions = v_ver and j.judged_at > now() - interval '4 minutes';
  if v_ok is not null then
    return v_ok;
  end if;
  v_ok := custom._computed_reader_judge(p_me, p_org, p_table);
  insert into custom.computed_reader_judgement as j (reader_id, organization_id, table_id, versions, ok, judged_at)
  values (p_me, p_org, p_table, v_ver, v_ok, now())
  on conflict (reader_id, organization_id, table_id) do update set versions = excluded.versions, ok = excluded.ok, judged_at = excluded.judged_at;
  return v_ok;
end;
$function$;

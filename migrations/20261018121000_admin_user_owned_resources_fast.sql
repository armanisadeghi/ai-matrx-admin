-- based-on: admin.user_owned_resources(uuid, integer) bd9e9df2642f69cb3c22997d192f2214628b527b3768010b8476fdfab5571808
-- admin.user_owned_resources — speed pass (users one-roof lane C2, 2026-10-18).
-- Measured after 20261018120000: admin@admin.com took 7.3 s (custom.io_outbox 307k rows = 2.9 s,
-- custom.record 70k = 1.0 s) and ran 19 types out of budget. The aggregate reads the heap for every
-- owned row. Now every type first takes an index-only count(*) on the owner column:
--   0            -> count 0, nothing else read (most types for most people)
--   > 50,000     -> count = all owned rows (trashed and archived included), `exact: false`; no dates,
--                   no newest (the type's list page opens them)
--   otherwise    -> the exact live/archived aggregate and newest 5, as before.
-- Default budget 4000 ms (the inventory's 4 s census budget in aidream), so one overshooting read
-- still lands inside the authenticated role's 8 s statement_timeout. Newest-5 also accepts a partial
-- (owner, time) index — files and conversations carry `where deleted_at is null` ones.

create or replace function admin.user_owned_resources(p_user uuid, p_budget_ms integer default 4000)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
  v_started timestamptz := clock_timestamp();
  v_type_started timestamptz;
  v_out jsonb := '[]'::jsonb;
  v_live text;
  v_arch text;
  v_name text;
  v_sort text;
  v_sql text;
  v_count bigint;
  v_archived bigint;
  v_last_created timestamptz;
  v_last_updated timestamptz;
  v_newest jsonb;
  v_skip text;
  v_raw bigint;
  v_budget integer := greatest(coalesce(p_budget_ms, 4000), 100);
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_owned_resources: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_owned_resources: p_user is required' using errcode = '22004';
  end if;

  for r in
    with reg as (
      select reg.resource_type,
             coalesce(reg.display_label, reg.resource_type) as label,
             coalesce(reg.schema_name, 'public') as schema_name,
             reg.table_name,
             coalesce(reg.id_column, 'id') as id_column,
             reg.url_path_template,
             iam._resolve_owner_column(coalesce(reg.schema_name, 'public'), reg.table_name, reg.owner_column) as owner_col,
             coalesce(et.is_component, false) as is_component,
             et.category
        from platform.shareable_resource_registry reg
        left join platform.entity_types et on et.token = reg.resource_type
       where coalesce(reg.is_active, true)
    )
    select reg.*,
           cls.oid as rel_oid,
           coalesce(cls.reltuples, 0)::bigint as est_rows,
           cols.names
      from reg
      left join pg_catalog.pg_namespace ns on ns.nspname = reg.schema_name
      left join pg_catalog.pg_class cls on cls.relnamespace = ns.oid and cls.relname = reg.table_name and cls.relkind in ('r', 'p')
      left join lateral (
        select array_agg(a.attname::text) as names
          from pg_catalog.pg_attribute a
         where a.attrelid = cls.oid and a.attnum > 0 and not a.attisdropped
      ) cols on true
     order by reg.is_component, coalesce(cls.reltuples, 0), reg.resource_type
  loop
    v_type_started := clock_timestamp();
    if r.rel_oid is null or r.owner_col is null then
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'type', r.resource_type, 'label', r.label, 'schema', r.schema_name, 'table', r.table_name,
        'url_template', r.url_path_template, 'is_component', r.is_component, 'category', r.category,
        'ok', false, 'reason', case when r.rel_oid is null then 'missing_table' else 'no_owner_column' end));
      continue;
    end if;
    if extract(epoch from (clock_timestamp() - v_started)) * 1000 > v_budget then
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'type', r.resource_type, 'label', r.label, 'schema', r.schema_name, 'table', r.table_name,
        'url_template', r.url_path_template, 'is_component', r.is_component, 'category', r.category,
        'ok', false, 'reason', 'budget'));
      continue;
    end if;

    begin
      execute format('select count(*) from %I.%I where %I = $1', r.schema_name, r.table_name, r.owner_col)
        into v_raw using p_user;
      if v_raw = 0 or v_raw > 50000 then
        v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'type', r.resource_type, 'label', r.label, 'schema', r.schema_name, 'table', r.table_name,
          'url_template', r.url_path_template, 'is_component', r.is_component, 'category', r.category,
          'ok', true, 'count', v_raw, 'exact', case when v_raw > 50000 then false end,
          'newest_skipped', case when v_raw > 50000 then 'large' end,
          'ms', round((extract(epoch from (clock_timestamp() - v_type_started)) * 1000)::numeric, 1))));
        continue;
      end if;

      v_live := case when 'deleted_at' = any(r.names) then 'deleted_at is null' else 'true' end;
      v_arch := case
                  when 'archived_at' = any(r.names) then 'archived_at is not null'
                  when 'is_archived' = any(r.names) then 'coalesce(is_archived, false)'
                  else 'false' end;
      v_name := case
                  when 'title' = any(r.names) then 'title::text'
                  when 'name' = any(r.names) then 'name::text'
                  when 'display_name' = any(r.names) then 'display_name::text'
                  when 'label' = any(r.names) then 'label::text'
                  when 'file_name' = any(r.names) then 'file_name::text'
                  when 'filename' = any(r.names) then 'filename::text'
                  when 'slug' = any(r.names) then 'slug::text'
                  else 'null::text' end;
      v_sort := case
                  when 'updated_at' = any(r.names) then 'updated_at'
                  when 'created_at' = any(r.names) then 'created_at'
                  else null end;

      v_sql := format(
        'select count(*) filter (where not (%3$s)), count(*) filter (where %3$s), %4$s, %5$s
           from %1$I.%2$I where %6$I = $1 and %7$s',
        r.schema_name, r.table_name, v_arch,
        case when 'created_at' = any(r.names) then format('max(created_at) filter (where not (%s))', v_arch) else 'null::timestamptz' end,
        case when 'updated_at' = any(r.names) then format('max(updated_at) filter (where not (%s))', v_arch) else 'null::timestamptz' end,
        r.owner_col, v_live);
      execute v_sql into v_count, v_archived, v_last_created, v_last_updated using p_user;

      v_newest := null;
      v_skip := null;
      if v_count > 0 and v_sort is not null then
        if v_count > 20000 and not exists (
             select 1 from pg_catalog.pg_index i
               join pg_catalog.pg_attribute a1 on a1.attrelid = i.indrelid and a1.attnum = i.indkey[0]
               join pg_catalog.pg_attribute a2 on a2.attrelid = i.indrelid and a2.attnum = i.indkey[1]
              where i.indrelid = r.rel_oid and i.indisvalid
                and a1.attname = r.owner_col and a2.attname = v_sort) then
          v_skip := 'large';
        else
          execute format(
            'select coalesce(jsonb_agg(jsonb_build_object(''id'', x.id, ''name'', x.name, ''updated_at'', x.at) order by x.at desc nulls last), ''[]''::jsonb)
               from (select %3$I::text as id, %4$s as name, %5$I as at
                       from %1$I.%2$I where %6$I = $1 and %7$s and not (%8$s)
                      order by %5$I desc nulls last limit 5) x',
            r.schema_name, r.table_name, r.id_column, v_name, v_sort, r.owner_col, v_live, v_arch)
          into v_newest using p_user;
        end if;
      elsif v_count > 0 then
        v_skip := 'no_time_column';
      end if;

      v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'type', r.resource_type, 'label', r.label, 'schema', r.schema_name, 'table', r.table_name,
        'url_template', r.url_path_template, 'is_component', r.is_component, 'category', r.category,
        'ok', true, 'exact', true, 'count', v_count, 'archived', v_archived,
        'last_created_at', v_last_created, 'last_updated_at', v_last_updated,
        'newest', v_newest, 'newest_skipped', v_skip,
        'ms', round((extract(epoch from (clock_timestamp() - v_type_started)) * 1000)::numeric, 1))));
    exception when others then
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'type', r.resource_type, 'label', r.label, 'schema', r.schema_name, 'table', r.table_name,
        'url_template', r.url_path_template, 'is_component', r.is_component, 'category', r.category,
        'ok', false, 'reason', 'error', 'error', sqlerrm));
    end;
  end loop;

  return jsonb_build_object(
    'user_id', p_user,
    'registered', jsonb_array_length(v_out),
    'budget_ms', v_budget,
    'elapsed_ms', round((extract(epoch from (clock_timestamp() - v_started)) * 1000)::numeric, 1),
    'computed_at', now(),
    'types', v_out);
end;
$$;

comment on function admin.user_owned_resources(uuid, integer) is
  'Everything one person owns, by registered resource type (platform.shareable_resource_registry): live count, archived count, last created/updated and the newest 5 items per type; per-type {ok:false, reason} for a missing table, an error or the time budget. The admin user record page Content tab. Platform admins only.';


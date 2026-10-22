-- lane: L53b (defect 84, Q-12). /data's first read was custom.data_home: every table, item and who-changed-it
-- row of every organization (1.16 MB, 1.4-2 s warm, 8.8 s cold for a person in 55 organizations; the
-- request's 8 s limit cancelled the cold one: 57014). Measured per stage (pg_stat_xact_user_functions, as
-- admin through `authenticated`): walk 0.55 s, data_home_tables 0.68 s, data_home_items 0.62 s,
-- data_home_changed_by 0.25 s, data_home itself 0.17 s - no one sub-select dominates.
-- custom.data_home_first is the BOUNDED first read: the newest p_limit tables (default 100, at most 500) the
-- person may open, in the same row shape as custom.data_home's `tables`, who changed each, and the total
-- she may open. The rest (every table, forms, dashboards, ...) is custom.data_home, read after first paint.
-- It adds nothing to what a person may see: the very same doors and walls (custom.data_home_tables).
CREATE OR REPLACE FUNCTION custom.data_home_first(p_organization_id uuid DEFAULT NULL::uuid, p_include_platform_tables boolean DEFAULT false, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me      uuid := custom.query_principal();
  v_lim     integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_tables  jsonb;
  v_changed jsonb;
  v_total   integer;
begin
  if p_organization_id is not null then
    perform custom.assert_client_may_reach(p_organization_id, 'custom.data_home_first');
  end if;
  if v_me is null then
    return jsonb_build_object('tables', '[]'::jsonb, 'changed_by', '[]'::jsonb, 'total', 0);
  end if;

  -- the one walk, for every organization of hers (data_home's own, so data_home_tables finds it in the memo)
  perform count(*)
     from custom.tables_seen_once_per_group(v_me, array(
            select m.organization_id
              from iam.organization_member m
              join iam.organizations o on o.id = m.organization_id and o.archived_at is null
             where m.user_id = v_me
               and (p_organization_id is null or m.organization_id = p_organization_id)));

  -- the newest p_limit Tables she may open, with data_home's own platform-table rule
  with listed as (
    select t.*
      from custom.data_home_tables(p_organization_id, p_include_platform_tables) t
     where p_include_platform_tables or not coalesce(t.platform_owned, false)
  ), kept as (
    select l.*, count(*) over () as total_
      from listed l
     order by l.updated_at desc nulls last, l.table_id
     limit v_lim
  ), rows_ as materialized (
    select to_jsonb(k) - 'total_' as e, k.total_,
           k.organization_id as org, k.table_id as id, k.created_by as maker,
           tr.data as tdata,
           tr.data -> 'sync_source' ->> 'provider' as synced_from,
           coalesce(tr.updated_at, tr.created_at) as at,
           coalesce(tr.updated_by, tr.created_by) as changer,
           (tr.id is not null and tr.deleted_at is null and coalesce(tr.data_class, 'record') <> 'record') as answered
      from kept k
      left join custom.record tr
        on tr.organization_id = k.organization_id and tr.id = k.table_id and tr.table_id = custom.table_kernel_id()
  ), mk as (
    select r.org, array_agg(distinct p.id) as ids
      from rows_ r
      cross join lateral (values (r.maker), (case when r.answered then r.changer end)) as p(id)
     where p.id is not null
     group by 1
  ), people as materialized (
    select mk.org, custom.history_people(mk.org, mk.ids) as m from mk
  )
  select coalesce(jsonb_agg(r.e || jsonb_build_object('foundation', coalesce(custom.table_is_foundation(r.tdata), false),
                                                      'created_by_name', p.m #>> array[r.e ->> 'created_by', 'name'],
                                                      'synced_from', r.synced_from)
                            order by coalesce(r.e ->> 'table_name', ''), r.id, r.org), '[]'::jsonb),
         (select coalesce(jsonb_agg(jsonb_build_object('organization_id', c.org, 'id', c.id, 'at', c.at,
                                                       'who', cp.m #>> array[c.changer::text, 'name'])
                                    order by c.org, c.id), '[]'::jsonb)
            from (select distinct a.org, a.id, a.at, a.changer from rows_ a where a.answered) c
            left join people cp on cp.org = c.org),
         coalesce(max(r.total_), 0)::integer
    into v_tables, v_changed, v_total
    from rows_ r
    left join people p on p.org = r.org;

  return jsonb_build_object('tables', v_tables, 'changed_by', v_changed, 'total', v_total);
end;
$function$;


insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', 'data_home_first', 'p_organization_id uuid, p_include_platform_tables boolean, p_limit integer',
        array['uuid'::regtype::oid, 'boolean'::regtype::oid, 'integer'::regtype::oid],
        'p_organization_id, when named, is checked first by custom.assert_client_may_reach (refused, naming this door, when the caller cannot reach it); NULL means every organization she reaches. Every row comes from custom.data_home_tables, the same walls as custom.data_home. p_limit is clamped to 1..500 and is not an id.',
        '20261022210500_data_home_first_read_is_bounded.sql', null, true, false);
grant execute on function custom.data_home_first(uuid, boolean, integer) to authenticated;

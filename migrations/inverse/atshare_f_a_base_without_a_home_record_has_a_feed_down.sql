-- INVERSE of atshare_f: the base_activity body of atshare_b.
-- lane: AT-SHARE
CREATE OR REPLACE FUNCTION custom.base_activity(p_organization_id uuid, p_subject_id uuid, p_limit integer DEFAULT 50, p_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_subject custom.record;
  v_is_home boolean;
  v_limit   integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_scan    constant integer := 8000;
  v_me      uuid := custom.query_principal();
  v_tables  uuid[];
  v_titles  jsonb;
  v_entries jsonb;
  v_next    bigint;
  v_seen    integer;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.base_activity');
  perform custom.assert_client_may_open(p_organization_id, p_subject_id, 'custom.base_activity',
                                        'viewer'::public.permission_level, 'table');
  select r.* into v_subject from custom.record r
   where r.organization_id = p_organization_id and r.id = p_subject_id;
  if not found then
    raise exception 'There is no such table or home in this organization.' using errcode = '02000';
  end if;
  if v_subject.table_id is null then
    v_is_home := true;
  elsif v_subject.table_id = custom.table_kernel_id() then
    v_is_home := false;
  else
    raise exception 'An activity feed belongs to a table or a home.' using errcode = '22023';
  end if;

  -- THE TABLES THIS FEED COVERS. A table: itself. A home: every table under it that the reader may open.
  if v_is_home then
    select coalesce(array_agg(t.id), array[]::uuid[]) into v_tables
      from custom.record t
     where t.organization_id = p_organization_id and t.table_id = custom.table_kernel_id()
       and t.deleted_at is null
       and t.data ->> 'parent_id' = p_subject_id::text
       and (custom.query_is_store_owner()
            or custom.effective_level(v_me, p_organization_id, t.id, 'record') is not null);
  else
    v_tables := array[p_subject_id];
  end if;

  -- the title field of each covered table, so a record entry carries the record's own name
  select coalesce(jsonb_object_agg(t.id::text, coalesce(t.data ->> 'title_field', 'name')), '{}'::jsonb) into v_titles
    from custom.record t where t.organization_id = p_organization_id and t.id = any (v_tables);

  with window_rows as (
    (select v.id, v.entity_type, v.row_id, v.operation, v.row_data, v.actor_id, v.occurred_at
       from history.row_versions v
      where v.entity_type = 'custom.record' and v.organization_id = p_organization_id
        and (p_before is null or v.id < p_before)
      order by v.id desc limit v_scan)
    union all
    (select v.id, v.entity_type, v.row_id, v.operation, v.row_data, v.actor_id, v.occurred_at
       from history.row_versions v
      where v.entity_type = 'iam.permissions' and v.organization_id = p_organization_id
        and (p_before is null or v.id < p_before)
      order by v.id desc limit v_scan)
  ), bounds as (
    select min(id) as lo, count(*) as n from (select id from window_rows order by id desc limit v_scan) w
  ), classed as (
    select w.id, w.occurred_at, w.operation, w.actor_id, w.row_id, w.row_data, w.entity_type,
           case
             when w.entity_type = 'iam.permissions' then 'share'
             when w.row_data ->> 'table_id' = custom.table_kernel_id()::text then 'table'
             when w.row_data ->> 'table_id' = custom.field_kernel_id()::text then 'field'
             when w.row_data ->> 'table_id' = custom.presentation_kernel_id()::text then 'view'
             when w.row_data ->> 'table_id' = custom.rule_kernel_id()::text then 'automation'
             else 'record' end as kind,
           coalesce(
             nullif(w.row_data ->> 'table_id', ''),
             nullif(w.row_data -> 'data' ->> 'entity_definition_id', '')) as owner_hint
      from window_rows w
     where w.id >= (select lo from bounds)
  ), scoped as (
    select c.*,
           case c.kind
             when 'share'      then c.row_data ->> 'resource_id'
             when 'table'      then c.row_id::text
             when 'field'      then c.row_data -> 'data' ->> 'entity_definition_id'
             when 'view'       then coalesce(c.row_data -> 'data' ->> 'subject_table_id', c.row_data -> 'data' ->> 'table_id')
             when 'automation' then c.row_data -> 'data' ->> 'scope_table_id'
             else c.row_data ->> 'table_id' end as of_table
      from classed c
  ), mine as (
    select s.* from scoped s
     where s.of_table is not null and s.of_table::uuid = any (v_tables)
  ), page as (
    select * from mine order by id desc limit v_limit
  ), people as (
    select u.id,
           coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                    split_part(u.email::text, '@', 1)) as name
      from auth.users u
     where u.id in (select actor_id from page union select nullif(row_data ->> 'granted_to_user_id', '')::uuid from page where kind = 'share')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'occurred_at', p.occurred_at, 'kind', p.kind,
           'verb', case
                     when p.kind = 'share' then case p.operation when 'INSERT' then 'shared' when 'DELETE' then 'stopped sharing' else 'changed the share of' end
                     else case p.operation when 'INSERT' then 'created' when 'SOFT_DELETE' then 'deleted' when 'RESTORE' then 'restored'
                                           when 'DELETE' then 'removed' else 'edited' end end,
           'title', case
                      when p.kind = 'share' then coalesce((select pp.name from people pp where pp.id = nullif(p.row_data ->> 'granted_to_user_id', '')::uuid), 'a person')
                                                 || ' at ' || coalesce(p.row_data ->> 'permission_level', 'a level')
                      when p.kind in ('table', 'view', 'automation') then coalesce(p.row_data -> 'data' ->> 'name', p.row_data -> 'data' ->> 'label')
                      when p.kind = 'field' then coalesce(p.row_data -> 'data' ->> 'label', p.row_data -> 'data' ->> 'key')
                      else coalesce(nullif(p.row_data -> 'data' ->> coalesce(v_titles ->> (p.row_data ->> 'table_id'), 'name'), ''), null) end,
           'table_id', p.of_table,
           'subject_id', case when p.kind = 'share' then p.row_data ->> 'resource_id' else p.row_id::text end,
           'actor', jsonb_build_object('id', p.actor_id,
                      'name', coalesce((select pp.name from people pp where pp.id = p.actor_id), case when p.actor_id is null then 'the system' else 'someone' end))
         ) order by p.id desc), '[]'::jsonb),
         (select count(*) from page)
    into v_entries, v_seen
    from page p;

  select case when b.n >= v_scan then b.lo end into v_next from (
    select min(id) as lo, count(*) as n from (
      (select v.id from history.row_versions v where v.entity_type = 'custom.record' and v.organization_id = p_organization_id
          and (p_before is null or v.id < p_before) order by v.id desc limit v_scan)
      union all
      (select v.id from history.row_versions v where v.entity_type = 'iam.permissions' and v.organization_id = p_organization_id
          and (p_before is null or v.id < p_before) order by v.id desc limit v_scan)) x) b;

  return jsonb_build_object('subject', case when v_is_home then 'home' else 'table' end,
                            'entries', v_entries,
                            'next_before', v_next);
end;
$function$;

-- based-on: public._trash_context_rows(text, uuid, uuid, uuid) 68436b8a943de5641b190e6331a657080b78db3c6db4bcf140d0fc1e7eb1a680
-- FT2-3 (2026-10-22): personal context-kind reads stop walking every archived row of the kind. ft_4 kept the
-- owner test and the grant test in one OR, which no index serves (context item: 33k archived Fields read, 274 ms).
-- The grants are read once into an array; the grant half is guarded by cardinality(v_granted) > 0, which the
-- planner turns into a one-time filter, so with no grant the owner half alone runs on the created_by index.
-- Same signature, same returned shape, same rows.
CREATE OR REPLACE FUNCTION public._trash_context_rows(p_token text, p_uid uuid, p_org uuid, p_member uuid)
 RETURNS TABLE(id uuid, title text, deleted_at timestamp with time zone, organization_id uuid, owner_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_granted uuid[];
begin
  if p_uid is null or p_token not in ('scope_type', 'scope', 'context_item') then
    return;
  end if;

  if p_org is null then
    -- PERSONAL: what the person owns, plus what was named to them by a live grant. The grants are read
    -- first; the grant half of each query runs only when there is one (a one-time filter), so the owner
    -- half walks the person's own archived rows by index instead of every archived row of the kind (FT2-3).
    select coalesce(array_agg(g.resource_id), '{}'::uuid[]) into v_granted
      from iam.permissions g
     where g.granted_to_user_id = p_uid and g.resource_type = p_token
       and coalesce(g.status, 'active') <> 'rejected'
       and (g.expires_at is null or g.expires_at > now());

    if p_token = 'scope_type' then
      return query
      select t.id, left(t.data ->> 'label_plural', 200), t.deleted_at, t.organization_id, t.created_by
        from custom.record t
       where t.data_class = 'table' and t.data ->> 'kept_for' = 'context' and t.deleted_at is not null
         and (t.created_by = p_uid or (cardinality(v_granted) > 0 and t.id = any (v_granted)));
    elsif p_token = 'scope' then
      return query
      with k as materialized (
        select t.id, t.organization_id, t.deleted_at, left(t.data ->> 'label_plural', 200) as title
          from custom.record t
         where t.data_class = 'table' and t.data ->> 'kept_for' = 'context'
      )
      select r.id,
             case when k.deleted_at is null then left(r.data ->> 'name', 200)
                  else coalesce(nullif(btrim(left(r.data ->> 'name', 200)), ''), 'Untitled') || ' (in '
                       || coalesce(nullif(btrim(k.title), ''), 'an archived item') || ')' end,
             r.deleted_at, r.organization_id, r.created_by
        from k
        join custom.record r on r.organization_id = k.organization_id and r.table_id = k.id
       where r.data_class = 'record' and r.deleted_at is not null
         and (r.created_by = p_uid or (cardinality(v_granted) > 0 and r.id = any (v_granted)));
    else
      return query
      with k as materialized (
        select t.id, t.organization_id, t.deleted_at, left(t.data ->> 'label_plural', 200) as title
          from custom.record t
         where t.data_class = 'table' and t.data ->> 'kept_for' = 'context'
      ), f as (
        select f.id, f.organization_id, f.deleted_at, f.created_by, f.data
          from custom.record f
         where f.created_by = p_uid and f.data_class = 'field' and f.deleted_at is not null
        union all
        select f.id, f.organization_id, f.deleted_at, f.created_by, f.data
          from custom.record f
         where cardinality(v_granted) > 0 and f.id = any (v_granted)
           and f.created_by is distinct from p_uid and f.data_class = 'field' and f.deleted_at is not null
      )
      select f.id,
             case when k.deleted_at is null then left(f.data ->> 'label', 200)
                  else coalesce(nullif(btrim(left(f.data ->> 'label', 200)), ''), 'Untitled') || ' (in '
                       || coalesce(nullif(btrim(k.title), ''), 'an archived item') || ')' end,
             f.deleted_at, null::uuid, f.created_by
        from f
        join k on f.organization_id = k.organization_id and f.data ->> 'entity_definition_id' = k.id::text
       where f.data ->> 'context_policy' is distinct from 'exclude';
    end if;
    return;
  end if;

  -- ORGANIZATION: this organization's archived rows, optionally one member's. The caller gated it.
  if p_token = 'scope_type' then
    return query
    select t.id, left(t.data ->> 'label_plural', 200), t.deleted_at, t.organization_id, t.created_by
      from custom.record t
     where t.organization_id = p_org
       and t.data_class = 'table' and t.data ->> 'kept_for' = 'context' and t.deleted_at is not null
       and (p_member is null or t.created_by = p_member);
  elsif p_token = 'scope' then
    return query
    select r.id,
           case when k.deleted_at is null then left(r.data ->> 'name', 200)
                else coalesce(nullif(btrim(left(r.data ->> 'name', 200)), ''), 'Untitled') || ' (in '
                     || coalesce(nullif(btrim(left(k.data ->> 'label_plural', 200)), ''), 'an archived item') || ')' end,
           r.deleted_at, r.organization_id, r.created_by
      from custom.record k
      join custom.record r on r.organization_id = k.organization_id and r.table_id = k.id
     where k.organization_id = p_org and k.data_class = 'table' and k.data ->> 'kept_for' = 'context'
       and r.data_class = 'record' and r.deleted_at is not null
       and (p_member is null or r.created_by = p_member);
  else
    return query
    select f.id,
           case when k.deleted_at is null then left(f.data ->> 'label', 200)
                else coalesce(nullif(btrim(left(f.data ->> 'label', 200)), ''), 'Untitled') || ' (in '
                     || coalesce(nullif(btrim(left(k.data ->> 'label_plural', 200)), ''), 'an archived item') || ')' end,
           f.deleted_at, k.organization_id, f.created_by
      from custom.record k
      join custom.record f on f.organization_id = k.organization_id
                          and f.data ->> 'entity_definition_id' = k.id::text
     where k.organization_id = p_org and k.data_class = 'table' and k.data ->> 'kept_for' = 'context'
       and f.data_class = 'field' and f.deleted_at is not null
       and f.data ->> 'context_policy' is distinct from 'exclude'
       and (p_member is null or f.created_by = p_member);
  end if;
end
$function$;

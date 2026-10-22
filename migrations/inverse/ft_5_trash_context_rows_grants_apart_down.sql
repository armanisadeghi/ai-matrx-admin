-- chair-step: FT2-3 inverse - puts back the ft_4 _trash_context_rows body (owner and grant tests in one OR; same rows, slower).
CREATE OR REPLACE FUNCTION public._trash_context_rows(p_token text, p_uid uuid, p_org uuid, p_member uuid)
 RETURNS TABLE(id uuid, title text, deleted_at timestamp with time zone, organization_id uuid, owner_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if p_uid is null or p_token not in ('scope_type', 'scope', 'context_item') then
    return;
  end if;

  if p_org is null then
    -- PERSONAL: what the person owns, plus what was named to them by a live grant.
    if p_token = 'scope_type' then
      return query
      select t.id, left(t.data ->> 'label_plural', 200), t.deleted_at, t.organization_id, t.created_by
        from custom.record t
       where t.data_class = 'table' and t.data ->> 'kept_for' = 'context' and t.deleted_at is not null
         and (t.created_by = p_uid
              or t.id in (select g.resource_id from iam.permissions g
                           where g.granted_to_user_id = p_uid and g.resource_type = p_token
                             and coalesce(g.status, 'active') <> 'rejected'
                             and (g.expires_at is null or g.expires_at > now())));
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
         and (r.created_by = p_uid
              or r.id in (select g.resource_id from iam.permissions g
                           where g.granted_to_user_id = p_uid and g.resource_type = p_token
                             and coalesce(g.status, 'active') <> 'rejected'
                             and (g.expires_at is null or g.expires_at > now())));
    else
      return query
      with k as materialized (
        select t.id, t.organization_id, t.deleted_at, left(t.data ->> 'label_plural', 200) as title
          from custom.record t
         where t.data_class = 'table' and t.data ->> 'kept_for' = 'context'
      )
      select f.id,
             case when k.deleted_at is null then left(f.data ->> 'label', 200)
                  else coalesce(nullif(btrim(left(f.data ->> 'label', 200)), ''), 'Untitled') || ' (in '
                       || coalesce(nullif(btrim(k.title), ''), 'an archived item') || ')' end,
             f.deleted_at, null::uuid, f.created_by
        from k
        join custom.record f on f.organization_id = k.organization_id
                            and f.data ->> 'entity_definition_id' = k.id::text
       where f.data_class = 'field' and f.deleted_at is not null
         and f.data ->> 'context_policy' is distinct from 'exclude'
         and (f.created_by = p_uid
              or f.id in (select g.resource_id from iam.permissions g
                           where g.granted_to_user_id = p_uid and g.resource_type = p_token
                             and coalesce(g.status, 'active') <> 'rejected'
                             and (g.expires_at is null or g.expires_at > now())));
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

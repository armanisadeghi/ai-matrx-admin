-- chair-step: FT-1 inverse - restores the previous public._trash_context_rows body (owner filter after the join; slow for people with thousands of archived Fields).
-- based-on: public._trash_context_rows(text, uuid, uuid, uuid) dfdda85e2fb6d57f4a821224797866934e26721f71e2cdf2317843f9f3282f88
CREATE OR REPLACE FUNCTION public._trash_context_rows(p_token text, p_uid uuid, p_org uuid, p_member uuid)
 RETURNS TABLE(id uuid, title text, deleted_at timestamp with time zone, organization_id uuid, owner_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  with k as (
    select t.id, t.organization_id, t.created_by, t.deleted_at, t.data,
           left(t.data ->> 'label_plural', 200) as title
      from custom.record t
     where t.data_class = 'table' and t.data ->> 'kept_for' = 'context'
       and (p_org is null or t.organization_id = p_org)
  ), c as (
    -- a scope type
    select k.id, k.title, k.deleted_at, k.organization_id, k.created_by as owner_id,
           null::text as parent_title
      from k
     where p_token = 'scope_type' and k.deleted_at is not null
    union all
    -- a scope: a Record of a context Table
    select r.id, left(r.data ->> 'name', 200), r.deleted_at, r.organization_id, r.created_by,
           case when k.deleted_at is not null then k.title end
      from k
      join custom.record r
        on r.organization_id = k.organization_id and r.table_id = k.id and r.data_class = 'record'
     where p_token = 'scope' and r.deleted_at is not null
    union all
    -- a context item: a Field of a context Table that is not one of the Table's own columns
    select f.id, left(f.data ->> 'label', 200), f.deleted_at,
           case when p_org is null then null::uuid else k.organization_id end, f.created_by,
           case when k.deleted_at is not null then k.title end
      from k
      join custom.record f
        on f.organization_id = k.organization_id and f.data_class = 'field'
       and f.data ->> 'entity_definition_id' = k.id::text
     where p_token = 'context_item' and f.deleted_at is not null
       and f.data ->> 'context_policy' is distinct from 'exclude'
  )
  select c.id,
         case when c.parent_title is null then c.title
              else coalesce(nullif(btrim(c.title), ''), 'Untitled') || ' (in '
                   || coalesce(nullif(btrim(c.parent_title), ''), 'an archived item') || ')' end,
         c.deleted_at, c.organization_id, c.owner_id
    from c
   where p_uid is not null
     and case
           when p_org is null then
             c.owner_id = p_uid
             or (c.owner_id is distinct from p_uid
                 and c.id in (select g.resource_id from iam.permissions g
                               where g.granted_to_user_id = p_uid and g.resource_type = p_token
                                 and coalesce(g.status, 'active') <> 'rejected'
                                 and (g.expires_at is null or g.expires_at > now())))
           else
             (p_member is null or c.owner_id = p_member)
         end
$function$;

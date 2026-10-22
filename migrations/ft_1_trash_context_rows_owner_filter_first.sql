-- based-on: public._trash_context_rows(text, uuid, uuid, uuid) 55f1fa8d125de3689e5643eaac1e60085dcc4fd3d04d769ffc8c0acf4050bcee
-- FT-1 (2026-10-21): /trash timed out at 9 s for a person with ~27k archived rows. public._trash_context_rows
-- filtered by owner AFTER joining every organization's Fields to every context Table (1.05M buffers, 5-8 s for
-- 50 rows). The owner filter now selects the person's own archived rows first (created_by index), then joins the
-- 225 context Tables. Same signature, same returned shape, same rows. No DDL on any table.
CREATE OR REPLACE FUNCTION public._trash_context_rows(p_token text, p_uid uuid, p_org uuid, p_member uuid)
 RETURNS TABLE(id uuid, title text, deleted_at timestamp with time zone, organization_id uuid, owner_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  with g as materialized (
    select g.resource_id as rid
      from iam.permissions g
     where p_org is null and p_uid is not null
       and g.granted_to_user_id = p_uid and g.resource_type = p_token
       and coalesce(g.status, 'active') <> 'rejected'
       and (g.expires_at is null or g.expires_at > now())
  ), k as materialized (
    select t.id, t.organization_id, t.created_by, t.deleted_at, t.data,
           left(t.data ->> 'label_plural', 200) as title
      from custom.record t
     where t.data_class = 'table' and t.data ->> 'kept_for' = 'context'
       and (p_org is null or t.organization_id = p_org)
  ), fd as materialized (
    -- the person's (or the organization's) own archived Fields / Records, selected BEFORE any join
    select r.id, r.organization_id, r.created_by, r.deleted_at, r.data, r.data_class, r.table_id
      from custom.record r
     where p_token in ('scope', 'context_item') and r.deleted_at is not null
       and r.data_class = case p_token when 'scope' then 'record' else 'field' end
       and case when p_org is null then (r.created_by = p_uid or r.id in (select rid from g))
                else (r.organization_id = p_org and (p_member is null or r.created_by = p_member)) end
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
      from fd r
      join k on r.organization_id = k.organization_id and r.table_id = k.id
     where p_token = 'scope'
    union all
    -- a context item: a Field of a context Table that is not one of the Table's own columns
    select f.id, left(f.data ->> 'label', 200), f.deleted_at,
           case when p_org is null then null::uuid else k.organization_id end, f.created_by,
           case when k.deleted_at is not null then k.title end
      from fd f
      join k on f.organization_id = k.organization_id
            and f.data ->> 'entity_definition_id' = k.id::text
     where p_token = 'context_item'
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
                 and c.id in (select rid from g))
           else
             (p_member is null or c.owner_id = p_member)
         end
$function$;

-- chair-step: FT3 inverse - puts back the ft_6 _trash_store_children and ft_5 _trash_context_rows bodies (same rows, slower).
CREATE OR REPLACE FUNCTION public._trash_store_children(p_uid uuid, p_org uuid, p_member uuid, p_class text, p_window integer)
 RETURNS TABLE(id uuid, organization_id uuid, deleted_at timestamp with time zone, created_by uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- lane STORE-RESTORE-DOORS. THE ONE PREDICATE for the five record-store Trash kinds, read by the
-- listing AND the counts. Personal: what the person made, or removed (the removal stamps updated_by).
-- Organization: that organization's (optionally one member's), never another member's personal row.
-- A thing is listed while what it belongs to is live — a Field, Rule, template or dashboard its Table
-- (a Rule, template or dashboard with no Table is listed as it is); a link both of its records.
-- The two modes are two queries, each walking only its own rows.
begin
  if p_class not in ('field', 'rule', 'relation', 'doc_template', 'dashboard') then
    return;
  end if;

  if p_org is not null then
    return query
    select c.id, c.organization_id, c.deleted_at, c.created_by
      from custom.record c
     where c.organization_id = p_org
       and c.data_class = p_class
       and c.deleted_at is not null
       -- SCOPES-WRITERS: a context item is a Field listed (once) as its own kind, context_item.
       and coalesce(c.metadata -> 'moved_from' ->> 'table', '') <> 'context.context_items'
       and (p_member is null or c.created_by = p_member)
       and (c.visibility is distinct from 'personal'::platform.visibility or c.created_by = p_uid)
       and case when p_class = 'relation' then
                  exists (select 1 from custom.record x
                           where x.organization_id = p_org and x.id = nullif(c.data ->> 'from', '')::uuid
                             and x.deleted_at is null)
              and exists (select 1 from custom.record x
                           where x.organization_id = p_org and x.id = nullif(c.data ->> 'to', '')::uuid
                             and x.deleted_at is null)
                else
                  coalesce(c.data ->> case p_class when 'field' then 'entity_definition_id'
                                                   when 'rule' then 'scope_table_id'
                                                   when 'doc_template' then 'renders_table_id'
                                                   else 'subject_table_id' end, '') = ''
                  and p_class <> 'field'
               or (c.data ->> case p_class when 'field' then 'entity_definition_id'
                                             when 'rule' then 'scope_table_id'
                                             when 'doc_template' then 'renders_table_id'
                                             else 'subject_table_id' end)
                  in (select t.id::text from custom.record t
                       where t.organization_id = p_org and t.data_class = 'table' and t.deleted_at is null)
           end
     order by c.deleted_at desc, c.id
     limit p_window;
    return;
  end if;

  -- FT2-4 (2026-10-22): two ordered index walks (what the person made; what they removed), each stopping at
  -- p_window, instead of one OR that sorted every archived row of the kind first.
  return query
  select x.id, x.organization_id, x.deleted_at, x.created_by
    from (
    (select c.id, c.organization_id, c.deleted_at, c.created_by
       from custom.record c
      where c.created_by = p_uid
     and c.data_class = p_class
     and c.deleted_at is not null
       -- SCOPES-WRITERS: a context item is a Field listed (once) as its own kind, context_item.
       and coalesce(c.metadata -> 'moved_from' ->> 'table', '') <> 'context.context_items'
     and case when p_class = 'relation' then
                exists (select 1 from custom.record x
                         where x.organization_id = c.organization_id and x.id = nullif(c.data ->> 'from', '')::uuid
                           and x.deleted_at is null)
            and exists (select 1 from custom.record x
                         where x.organization_id = c.organization_id and x.id = nullif(c.data ->> 'to', '')::uuid
                           and x.deleted_at is null)
              else
                coalesce(c.data ->> case p_class when 'field' then 'entity_definition_id'
                                                 when 'rule' then 'scope_table_id'
                                                 when 'doc_template' then 'renders_table_id'
                                                 else 'subject_table_id' end, '') = ''
                and p_class <> 'field'
             or exists (select 1 from custom.record t
                         where t.organization_id = c.organization_id and t.data_class = 'table' and t.deleted_at is null
                           and t.id = nullif(c.data ->> case p_class when 'field' then 'entity_definition_id'
                                                               when 'rule' then 'scope_table_id'
                                                               when 'doc_template' then 'renders_table_id'
                                                               else 'subject_table_id' end, '')::uuid)
         end
      order by c.deleted_at desc, c.id
      limit p_window)
    union
    (select c.id, c.organization_id, c.deleted_at, c.created_by
       from custom.record c
      where c.updated_by = p_uid
     and c.data_class = p_class
     and c.deleted_at is not null
       -- SCOPES-WRITERS: a context item is a Field listed (once) as its own kind, context_item.
       and coalesce(c.metadata -> 'moved_from' ->> 'table', '') <> 'context.context_items'
     and case when p_class = 'relation' then
                exists (select 1 from custom.record x
                         where x.organization_id = c.organization_id and x.id = nullif(c.data ->> 'from', '')::uuid
                           and x.deleted_at is null)
            and exists (select 1 from custom.record x
                         where x.organization_id = c.organization_id and x.id = nullif(c.data ->> 'to', '')::uuid
                           and x.deleted_at is null)
              else
                coalesce(c.data ->> case p_class when 'field' then 'entity_definition_id'
                                                 when 'rule' then 'scope_table_id'
                                                 when 'doc_template' then 'renders_table_id'
                                                 else 'subject_table_id' end, '') = ''
                and p_class <> 'field'
             or exists (select 1 from custom.record t
                         where t.organization_id = c.organization_id and t.data_class = 'table' and t.deleted_at is null
                           and t.id = nullif(c.data ->> case p_class when 'field' then 'entity_definition_id'
                                                               when 'rule' then 'scope_table_id'
                                                               when 'doc_template' then 'renders_table_id'
                                                               else 'subject_table_id' end, '')::uuid)
         end
      order by c.deleted_at desc, c.id
      limit p_window)
    ) x
   order by x.deleted_at desc, x.id
   limit p_window;
end
$function$
;

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
$function$
;

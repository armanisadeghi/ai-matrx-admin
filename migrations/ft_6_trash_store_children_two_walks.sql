-- based-on: public._trash_store_children(uuid, uuid, uuid, text, integer) 39aca4a957938d558349c1bc07b4ddec13741dadad14498fb33474ca31e8d28c
-- FT2-4 (2026-10-22): a Trash Field / Rule / Link / template / dashboard page reads two ordered index walks
-- (created_by, updated_by: ft_2's record_trash_made_idx / record_trash_removed_idx) that stop at the page, not one
-- OR over both columns that fetched and sorted every archived row of the kind (admin: 33k Fields, 250 ms -> ~60 ms).
-- Organization mode unchanged. Same signature, same rows.
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
$function$;

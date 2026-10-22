-- chair-step: FT2-4 inverse - puts back the one-OR _trash_store_children body (same rows, slower).
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

  return query
  select c.id, c.organization_id, c.deleted_at, c.created_by
    from custom.record c
   where (c.created_by = p_uid or c.updated_by = p_uid)
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
   limit p_window;
end
$function$

;

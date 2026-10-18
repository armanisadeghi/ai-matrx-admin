-- based-on: content.space_sidebar(uuid[], uuid[]) d7c16fa845478438a93dc2414d1ef0c65df05764ab03c8f6c3248c0968890833
-- ROW-PAGE-VIEWS (row-pages PLAN §1): a row's page lives under its row, like Notion's database pages — never at
-- the sidebar's top level. content.space_list already skipped them (content._space_row_of); the sidebar's own
-- first read (content.space_sidebar) did not, so every row page showed as an "Untitled" root page. Found by the
-- Spaces New-menu lane (2026-10-17): New ▾ makes the row's page up front, so each new row added one.
-- Only the roots change: a root that is the row_body target of a record is left out (its sub-pages are never
-- roots, because their parent — the row page — is discoverable).
CREATE OR REPLACE FUNCTION content.space_sidebar(p_expand uuid[] DEFAULT '{}'::uuid[], p_reveal uuid[] DEFAULT '{}'::uuid[])
 RETURNS TABLE(id uuid, parent_id uuid, edge_position integer, title text, icon text, deleted_at timestamp with time zone, updated_at timestamp with time zone, version integer, organization_id uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_type    uuid;
  v_disc    uuid[];
  v_parents uuid[];
  v_visible uuid[];
  v_kids    uuid[];
begin
  -- The sidebar's first read (round 35, Notion's lazy tree): the person's live top-level pages, plus the
  -- live children of the pages they asked to see open (p_expand) and of every ancestor of each page to reveal
  -- (p_reveal: the open page, favorites, recents). Deeper levels come from content.space_children when a page is expanded; Trash is
  -- content.space_trash. Access is set-based: the kernel's enumerator (iam.discoverable_ids) once, and
  -- iam.has_access only for a parent or child that the enumerator did not already return.
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sign in to list your Spaces.';
  end if;
  select c.id into v_type from platform.categories c
   where c.dimension = 'document_type' and c.slug = 'space' and c.deleted_at is null
     and c.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'::uuid;
  v_disc := iam.discoverable_ids(v_uid, 'document', 'viewer'::public.permission_level, 0, false);

  -- Parents to open: the asked-for ones (bounded) and every revealed page's ancestors (walked up the live edges).
  with recursive up(doc_id, depth) as (
    select a.target_id, 1 from platform.associations a
     where a.source_id = any (p_reveal[1:100]) and a.source_type = 'document'
       and a.target_type = 'document' and a.label = 'sub_page' and a.deleted_at is null
    union all
    select a.target_id, u.depth + 1 from up u
      join platform.associations a on a.source_id = u.doc_id and a.source_type = 'document'
       and a.target_type = 'document' and a.label = 'sub_page' and a.deleted_at is null
     where u.depth < 64
  )
  select coalesce(array_agg(distinct x), '{}') into v_parents
    from (select doc_id as x from up union select unnest(p_expand[1:300])) s
   where x is not null;

  -- A parent opens only when the person can open it: the enumerator first, the kernel for the rest.
  select coalesce(array_agg(p), '{}') into v_visible
    from unnest(v_parents) p
   where p = any (v_disc) or iam.has_access('document', p, 'viewer'::public.permission_level);

  -- The children of the open parents that the person can open (the kernel only for ones not enumerated).
  with cand as materialized (
    select a.source_id as child
      from platform.associations a
      join content.document d on d.id = a.source_id and d.deleted_at is null
       and d.document_type_id = v_type and d.format = 'spaces'
     where a.target_type = 'document' and a.target_id = any (v_visible)
       and a.source_type = 'document' and a.label = 'sub_page' and a.deleted_at is null
  )
  select coalesce(array_agg(child), '{}') into v_kids
    from cand
   where child = any (v_disc) or iam.has_access('document', child, 'viewer'::public.permission_level);

  return query
  with spaces as materialized (
    select d.id from content.document d
     where d.id = any (v_disc) and d.document_type_id = v_type and d.format = 'spaces'
  ),
  -- Every ancestor of every enumerated page (live edges, any state of the ancestor page).
  anc(start_id, doc_id, depth) as materialized (
    with recursive walk(start_id, doc_id, depth) as (
      select a.source_id, a.target_id, 1 from platform.associations a
       where a.source_id = any (v_disc) and a.source_type = 'document' and a.target_type = 'document'
         and a.label = 'sub_page' and a.deleted_at is null
      union all
      select w.start_id, a.target_id, w.depth + 1 from walk w
        join platform.associations a on a.source_id = w.doc_id and a.source_type = 'document'
         and a.target_type = 'document' and a.label = 'sub_page' and a.deleted_at is null
       where w.depth < 64
    )
    select * from walk
  ),
  -- Top level: a live page the person can discover that sits under no page they can discover, and is not a
  -- row's page (ROW-PAGE-VIEWS: a row's page lives under its row, never in the sidebar).
  roots as (
    select s.id from spaces s
     where not exists (select 1 from anc where anc.start_id = s.id and anc.doc_id = any (v_disc))
       and not exists (select 1 from platform.associations rb
                        where rb.target_type = 'document' and rb.target_id = s.id
                          and rb.source_type = 'record' and rb.label = 'row_body' and rb.deleted_at is null)
  ),
  kids as (
    select k as id from unnest(v_kids) k
  ),
  edge as (
    select a.source_id, a.target_id, a.position from platform.associations a
     where a.source_id in (select kd.id from kids kd) and a.source_type = 'document' and a.target_type = 'document'
       and a.label = 'sub_page' and a.deleted_at is null
  )
  select d.id,
         case when e.target_id = any (v_visible) then e.target_id end,
         case when e.target_id = any (v_visible) then e.position end,
         d.title, d.icon, d.deleted_at, d.updated_at, d.version, d.organization_id, d.created_at
    from (select rt.id from roots rt union select kd.id from kids kd) r
    join content.document d on d.id = r.id and d.deleted_at is null
    left join edge e on e.source_id = d.id;
end;
$function$;

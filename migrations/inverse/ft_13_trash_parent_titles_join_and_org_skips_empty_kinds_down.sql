-- chair-step: FT3 inverse - puts back the ft_12 _trash_kind_rows body (per-row parent titles, no organization skip; same rows, slower).
CREATE OR REPLACE FUNCTION public._trash_kind_rows(p_uid uuid, p_org uuid, p_member uuid, p_kinds text[], p_limit integer, p_offset integer)
 RETURNS TABLE(artifact_kind text, entity_token text, label text, id uuid, title text, deleted_at timestamp with time zone, organization_id uuid, is_mine boolean, owner_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- lane TRASH-2. The person (personal mode) or the organization (organization mode, gated by the
-- caller) is the filter; there is no per-row access check and no organization-wide walk here.
-- lane TRASH-TABLES: the record store's Tables and Records, after the registry kinds.
-- lane TRASH-COVERAGE-2: a row whose parent is archived (platform.archived_parent_of) is titled
-- "<title> (in <parent>)" — it is listed, never hidden, and its restore brings the parent back first.
-- A scope type's Field (context_item) carries no organization_id; in organization mode its
-- organization is its scope type's.
-- lane TRASH-COVERAGE-2 (second file): the "(in <parent>)" suffix is computed AFTER the page is cut —
-- an outer select over the limited rows — so it costs one parent lookup per LISTED row, never one per
-- candidate row (org_trash_list file for AI Matrx measured 890.7 ms with it inside the sort; ceiling 300).
-- lane TRASH-COVERAGE-2 (third file): Organization Trash reads a table that carries visibility as TWO
-- bounded index walks — the organization's shared rows, and the caller's own personal rows — instead
-- of one walk that filters out every member's personal row (AI Matrx: 75,540 archived personal files,
-- 3 shared; the one walk read all of them to find three).
-- lane STORE-RESTORE-DOORS: five more record-store kinds — a Field, a Rule, a link between Records, a
-- document template and a dashboard, each removed on its own — read through public._trash_store_children
-- (one predicate with the counts) and titled by public._trash_store_title; restored through their own
-- store door (public._trash_store_restore).
-- lane SCOPES-READS-REST (2026-09-29): the registry's three context kinds (scope_type, scope,
-- context_item) are read from the record store through public._trash_context_rows, never from context.*.
declare
  rec record;
  v_rel regclass;
  v_title text;
  v_org text;
  v_cols text;
  v_limit int := least(greatest(coalesce(p_limit, 200), 1), 1000);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_window int;
  v_title_expr text;
  v_parented boolean;
  v_q text;
  v_wrap text;
  v_kind text[];
begin
  if p_uid is null then return; end if;
  v_window := v_limit + v_offset;

  for rec in
    select e.token, e.user_artifact_kind as kind, e.label,
           e.schema_name as sch, e.table_name as tbl,
           coalesce(e.retention_owner_column, 'created_by') as owner_col,
           e.title_column, e.feature_owned_restore
      from platform.entity_types e
     where e.user_artifact_kind is not null
       and e.is_active
       and (p_kinds is null or e.user_artifact_kind = any(p_kinds))
     order by e.user_artifact_kind
  loop
    begin
      if rec.sch = 'context' and rec.token in ('scope_type', 'scope', 'context_item') then
        return query
        select rec.kind::text, rec.token::text, rec.label::text, x.id, x.title,
               x.deleted_at, x.organization_id, (x.owner_id = p_uid), x.owner_id
          from public._trash_context_rows(rec.token, p_uid, p_org, p_member) x
         order by x.deleted_at desc, x.id
         limit v_limit offset v_offset;
        continue;
      end if;

      v_rel := to_regclass(format('%I.%I', rec.sch, rec.tbl));
      if v_rel is null then continue; end if;

      if rec.token = 'credential_item' and rec.feature_owned_restore then
        -- Vault credentials: the owner's own, only. Organization mode never lists them.
        if p_org is not null then continue; end if;
        return query execute format(
          'select %L::text, %L::text, %L::text, t.id, t.display_name::text,
                  t.deleted_at, t.organization_id, true, t.user_id
             from users.credential_items t
            where t.user_id = $1 and t.deleted_at is not null
            order by t.deleted_at desc, t.id
            limit %s offset %s',
          rec.kind, rec.token, rec.label, v_limit, v_offset)
          using p_uid;
        continue;
      end if;

      v_title := null;
      -- A scope type's own name is its plural label ("Service areas"); its title_column is the slug.
      select a.attname into v_title
        from pg_attribute a
       where a.attrelid = v_rel and a.attnum > 0 and not a.attisdropped
         and a.attname = any (array['label_plural', coalesce(rec.title_column, '')])
       order by (a.attname <> 'label_plural')
       limit 1;
      if v_title is null then
        select a.attname into v_title
          from pg_attribute a
         where a.attrelid = v_rel and a.attnum > 0 and not a.attisdropped
           and a.attname = any (array['name','title','label','display_name','file_name','folder_name','page_title','subject_value','target_domain','jurisdiction_key','path','code','label_plural','body','description'])
         order by array_position(array['name','title','label','display_name','file_name','folder_name','page_title','subject_value','target_domain','jurisdiction_key','path','code','label_plural','body','description'], a.attname::text)
         limit 1;
      end if;
      v_org := null;
      select a.attname into v_org
        from pg_attribute a
       where a.attrelid = v_rel and a.attnum > 0 and not a.attisdropped
         and a.attname = 'organization_id'
       limit 1;

      v_title_expr := case when v_title is null then 'null::text' else format('left(t.%I::text, 200)', v_title) end;
      -- The comment kind's title rule (a suggestion shows its replacement, a comment its body, else the quote).
      if rec.token = 'comment' then v_title_expr := 'left(platform.comment_trash_title(t), 200)'; end if;
      -- A Data table row has no title column: its own words, then the table it sits in.
      if rec.token = 'udt_dataset_rows' then
        v_title_expr := 'left(coalesce(nullif(btrim(coalesce(t.data ->> ''name'', t.data ->> ''title'', custom._first_words(t.data))), ''''), ''Untitled row'')'
          || ' || '' (in a table)'', 200)';
      end if;
      v_parented := rec.token in ('folder', 'file', 'hr_employment', 'workflow_trigger', 'processed_document')
        or exists (select 1 from platform.soft_delete_edge s
                    where s.child_schema = rec.sch and s.child_table = rec.tbl and s.action = 'cascade');
      v_wrap := null;
      if v_parented then
        v_wrap := format(
          'select y.a, y.b, y.c, y.id, '
          || 'coalesce((select coalesce(nullif(btrim(y.t), ''''), ''Untitled'') || '' (in '' || '
          || 'coalesce(nullif(btrim(ap.parent_title), ''''), ''an archived item'') || '')'' '
          || 'from platform.archived_parent_of(%L, y.id) ap limit 1), y.t), '
          || 'y.d, y.o, y.m, y.w from (%%s) y(a, b, c, id, t, d, o, m, w) order by y.d desc, y.id',
          rec.token);
      end if;

      if p_org is not null and v_org is null then continue; end if;

      v_cols := format('%L::text, %L::text, %L::text, t.id, %s, t.deleted_at, %s, (t.%I = $1), t.%I',
        rec.kind, rec.token, rec.label,
        v_title_expr,
        case when v_org is null then 'null::uuid' else format('t.%I', v_org) end,
        rec.owner_col, rec.owner_col);

      if p_org is null then
        -- PERSONAL: what I own, plus what was named to me. Each branch is its own indexed read.
        v_q := format(
          'select * from (
             (select %1$s from %2$I.%3$I t
               where t.%4$I = $1 and t.deleted_at is not null
               order by t.deleted_at desc, t.id limit %5$s)
             union all
             (select %1$s from %2$I.%3$I t
               where t.deleted_at is not null
                 and t.%4$I is distinct from $1
                 and t.id in (select g.resource_id from iam.permissions g
                               where g.granted_to_user_id = $1
                                 and g.resource_type = %6$L
                                 and coalesce(g.status, ''active'') <> ''rejected''
                                 and (g.expires_at is null or g.expires_at > now()))
               order by t.deleted_at desc, t.id limit %5$s)
           ) x
           order by x.deleted_at desc, x.id
           limit %7$s offset %8$s',
          v_cols, rec.sch, rec.tbl, rec.owner_col, v_window, rec.token, v_limit, v_offset);
        if v_wrap is not null then v_q := format(v_wrap, v_q); end if;
        return query execute v_q using p_uid;
      else
        -- ORGANIZATION: this organization's archived rows, optionally one member's. The caller gated it.
        -- A PERSONAL row (visibility = personal) belongs to its owner alone — a member's private
        -- highlight or note never shows in the organization's Trash (verify RC-B11 round 3; access
        -- is personal, Arman 2026-09-23). Its owner still sees it in their own Trash.
        if iam.table_has_visibility(rec.sch, rec.tbl) then
          v_q := format(
            'select * from (
               (select %1$s from %2$I.%3$I t
                 where t.%4$I = $2 and t.deleted_at is not null
                   and ($3::uuid is null or t.%5$I = $3)
                   and t.visibility is distinct from ''personal''
                 order by t.deleted_at desc, t.id limit %8$s)
               union all
               (select %1$s from %2$I.%3$I t
                 where t.%5$I = $1 and t.deleted_at is not null
                   and t.%4$I = $2
                   and ($3::uuid is null or t.%5$I = $3)
                   and t.visibility = ''personal''
                 order by t.deleted_at desc, t.id limit %8$s)
             ) x
             order by x.deleted_at desc, x.id
             limit %6$s offset %7$s',
            v_cols, rec.sch, rec.tbl, v_org, rec.owner_col, v_limit, v_offset, v_window);
        else
          v_q := format(
            'select %1$s from %2$I.%3$I t
              where t.%4$I = $2 and t.deleted_at is not null
                and ($3::uuid is null or t.%5$I = $3)
              order by t.deleted_at desc, t.id
              limit %6$s offset %7$s',
            v_cols, rec.sch, rec.tbl, v_org, rec.owner_col, v_limit, v_offset);
        end if;
        if v_wrap is not null then v_q := format(v_wrap, v_q); end if;
        return query execute v_q using p_uid, p_org, p_member;
      end if;
    exception when undefined_table or undefined_column or insufficient_privilege then continue;
    end;
  end loop;

  -- ── THE RECORD STORE (lane TRASH-TABLES) ────────────────────────────────────────────────────
  -- One physical table (custom.record) holds every Table and Record, so the registry loop above
  -- cannot describe them. Same two modes, same person/organization filter, restored by
  -- custom.record_restore through entity_undelete / org_trash_restore (token `record`).
  -- ── PASSAGE LINKS (annotation trash) ─────────────────────────────────────────────────────────
  -- Only anchored_to associations the person made, removed on their own; personal Trash only (see
  -- the file header). The rest of platform.associations never reaches /trash.
  if p_kinds is null or 'passage_link' = any (p_kinds) then
    return query
    select 'passage_link'::text, 'passage_link'::text, 'Passage link'::text, a.id,
           left(platform.passage_link_trash_title(a), 200),
           a.deleted_at, a.organization_id, (a.created_by = p_uid), a.created_by
      from platform.associations a
     where a.role = 'anchored_to' and a.deleted_at is not null and a.deleted_via_type is null
       and p_org is null and a.created_by = p_uid
     order by a.deleted_at desc, a.id
     limit v_limit offset v_offset;
  end if;

  if to_regclass('custom.record') is null then return; end if;

  if p_kinds is null or 'table' = any (p_kinds) then
    if p_org is null then
      return query
      select 'table'::text, 'record'::text, 'Table'::text, x.id,
             coalesce(nullif(btrim(x.data ->> 'name'), ''), 'Untitled table'),
             x.deleted_at, x.organization_id, (x.created_by = p_uid), x.created_by
        from (
          (select t.id, t.data, t.deleted_at, t.organization_id, t.created_by
             from custom.record t
            where t.created_by = p_uid and t.data_class = 'table' and t.deleted_at is not null and not (t.data @> '{"kept_for": "context"}'::jsonb)
            order by t.deleted_at desc, t.id limit v_window)
          union all
          (select t.id, t.data, t.deleted_at, t.organization_id, t.created_by
             from custom.record t
            where t.data_class = 'table' and t.deleted_at is not null and not (t.data @> '{"kept_for": "context"}'::jsonb)
              and t.created_by is distinct from p_uid
              and t.id in (select g.resource_id from iam.permissions g
                            where g.granted_to_user_id = p_uid
                              and g.resource_type = 'record'
                              and coalesce(g.status, 'active') <> 'rejected'
                              and (g.expires_at is null or g.expires_at > now()))
            order by t.deleted_at desc, t.id limit v_window)
        ) x
       order by x.deleted_at desc, x.id
       limit v_limit offset v_offset;
    else
      return query
      select 'table'::text, 'record'::text, 'Table'::text, t.id,
             coalesce(nullif(btrim(t.data ->> 'name'), ''), 'Untitled table'),
             t.deleted_at, t.organization_id, (t.created_by = p_uid), t.created_by
        from custom.record t
       where t.organization_id = p_org and t.data_class = 'table' and t.deleted_at is not null and not (t.data @> '{"kept_for": "context"}'::jsonb)
         and (p_member is null or t.created_by = p_member)
       order by t.deleted_at desc, t.id
       limit v_limit offset v_offset;
    end if;
  end if;

  if p_kinds is null or 'record' = any (p_kinds) then
    -- A Record archived on its own, while its Table is live. One inside an archived Table comes
    -- back with the Table, so it is not a second Trash row.
    return query
    select 'record'::text, 'record'::text, 'Record'::text, y.id,
           format('%s (in %s)',
                  coalesce(nullif(btrim(custom.record_words(y.organization_id, y.id)), ''), 'Untitled record'),
                  coalesce(nullif(btrim(y.table_name), ''), 'a table')),
           y.deleted_at, y.organization_id, (y.created_by = p_uid), y.created_by
      from (
        -- FT3 (2026-10-22): a Record is listed only while its Table is live, and few are (test@test.com: 50 of 106k
        -- archived Records; the old join read 97k blocks, 240 ms warm, 2.8 s cold). Each branch now walks archived
        -- Records index-only (record_archived_record_made_idx / _org_idx carry organization_id, table_id, created_by)
        -- and keeps a Record when its Table is live (record_live_table_idx) and not a context Table
        -- (record_context_table_idx), both index-only; the Table's name is read for the page only. The organization
        -- branch keeps its join (35 ms for AI Matrx, faster than the index-only walk there).
        select x.id, x.deleted_at, x.organization_id, x.created_by,
               (select t.data ->> 'name' from custom.record t
                 where t.organization_id = x.organization_id and t.id = x.table_id) as table_name
          from (
            (select r.id, r.deleted_at, r.organization_id, r.created_by, r.table_id
               from custom.record r
              where p_org is null
                and r.created_by = p_uid and r.data_class = 'record' and r.deleted_at is not null
                and exists (select 1 from custom.record t
                              where t.organization_id = r.organization_id and t.id = r.table_id
                                and t.data_class = 'table' and t.deleted_at is null)
                and not exists (select 1 from custom.record t
                                 where t.organization_id = r.organization_id and t.id = r.table_id
                                   and t.data_class = 'table' and (t.data ->> 'kept_for') = 'context')
              order by r.deleted_at desc, r.id limit v_window)
            union all
            (select r.id, r.deleted_at, r.organization_id, r.created_by, r.table_id
               from custom.record r
              where p_org is null
                and r.data_class = 'record' and r.deleted_at is not null
                and r.created_by is distinct from p_uid
                and r.id in (select g.resource_id from iam.permissions g
                              where g.granted_to_user_id = p_uid
                                and g.resource_type = 'record'
                                and coalesce(g.status, 'active') <> 'rejected'
                                and (g.expires_at is null or g.expires_at > now()))
                and exists (select 1 from custom.record t
                              where t.organization_id = r.organization_id and t.id = r.table_id
                                and t.data_class = 'table' and t.deleted_at is null)
                and not exists (select 1 from custom.record t
                                 where t.organization_id = r.organization_id and t.id = r.table_id
                                   and t.data_class = 'table' and (t.data ->> 'kept_for') = 'context')
              order by r.deleted_at desc, r.id limit v_window)
            union all
            (select r.id, r.deleted_at, r.organization_id, r.created_by, r.table_id
               from custom.record r
               join custom.record t
                 on t.organization_id = r.organization_id and t.id = r.table_id
                and t.data_class = 'table' and t.deleted_at is null and not (t.data @> '{"kept_for": "context"}'::jsonb)
              where p_org is not null
                and r.organization_id = p_org and r.data_class = 'record' and r.deleted_at is not null
                and (p_member is null or r.created_by = p_member)
              order by r.deleted_at desc, r.id limit v_window)
          ) x
         order by x.deleted_at desc, x.id
         limit v_limit offset v_offset
      ) y
     order by y.deleted_at desc, y.id;
  end if;

  -- ── THE STORE'S OWN THINGS, removed on their own (lane STORE-RESTORE-DOORS) ──────────────────
  foreach v_kind slice 1 in array array[['field','Field'],['rule','Rule'],['relation','Link'],['doc_template','Document template'],['dashboard','Dashboard']] loop
    continue when p_kinds is not null and not (v_kind[1] = any (p_kinds));
    return query
    select v_kind[1], 'record'::text, v_kind[2], y.id,
           coalesce(public._trash_store_title(y.organization_id, y.id), 'Untitled'),
           y.deleted_at, y.organization_id, (y.created_by = p_uid), y.created_by
      from (select c.id, c.organization_id, c.deleted_at, c.created_by
              from public._trash_store_children(p_uid, p_org, p_member, v_kind[1], v_window) c
             order by c.deleted_at desc, c.id
             limit v_limit offset v_offset) y
     order by y.deleted_at desc, y.id;
  end loop;
end;
$function$
;

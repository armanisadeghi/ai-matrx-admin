-- INVERSE of migrations/campaign/templateinstall3_c_uninstall_moves_the_workspace_pages_to_trash.sql (lane TEMPLATE-INSTALL-3): the three bodies before it.
-- chair-step: restores function bodies.
-- lock: custom
-- based-on: custom.template_install_note(uuid, uuid, text, uuid, text) 653dc02d12e4a77d35b76168241769e1247cd8216d42a624f15fa16cf12ab6c3
-- based-on: custom.template_uninstall(uuid, uuid, integer) 1e519e75ed734708ff1d9751238227c35ff0e8c5214c4c45ceb63d4f4b5dba34
-- based-on: custom.template_restore(uuid, uuid, integer) 6561b1913e1482500df0bfb9fd9a94465aee605e56e74825c76b755622dd51bf
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION custom.template_install_note(p_organization_id uuid, p_install_id uuid, p_kind text, p_id uuid, p_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_i custom.template_install;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_install_note');
  if coalesce(p_kind, '') not in ('agent', 'workflow') then
    raise exception 'An install records only what its host makes outside the store (an agent or a workflow); "%" is made by the install itself.', coalesce(p_kind, '(none)')
      using errcode = '22023';
  end if;
  select * into v_i from custom.template_install i
   where i.id = p_install_id and i.organization_id = p_organization_id and i.state <> 'uninstalled' for update;
  if not found then
    raise exception 'There is no such install in this organization.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_i.made) x where x ->> 'kind' = p_kind and x ->> 'id' = p_id::text) then
    if p_label is not null and exists (select 1 from jsonb_array_elements(v_i.made) x
                                        where x ->> 'kind' = p_kind and x ->> 'title' = p_label and nullif(x ->> 'id', '') is null) then
      update custom.template_install i
         set made = (select jsonb_agg(case when x ->> 'kind' = p_kind and x ->> 'title' = p_label and nullif(x ->> 'id', '') is null
                                          then jsonb_build_object('kind', p_kind, 'id', p_id, 'ref', p_kind, 'title', p_label, 'step', null)
                                          else x end order by o)
                       from jsonb_array_elements(i.made) with ordinality as e(x, o)),
             updated_at = now()
       where i.id = v_i.id
      returning * into v_i;
    else
      update custom.template_install i
         set made = i.made || jsonb_build_array(jsonb_build_object('kind', p_kind, 'id', p_id, 'ref', p_kind, 'title', p_label, 'step', null)),
             updated_at = now()
       where i.id = v_i.id
      returning * into v_i;
    end if;
  end if;
  return custom._template_answer(v_i);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.template_uninstall(p_organization_id uuid, p_install_id uuid, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
declare
  v_i      custom.template_install;
  v_m      jsonb;
  v_id     uuid;
  v_tbl    uuid;
  v_r      jsonb;
  v_t0     timestamptz := clock_timestamp();
  -- TEMPLATE-FRESH-3: at most 6 s. A client call is cancelled at ~8 s by PostgREST, and the budget is only checked BETWEEN steps.
  v_budget integer := least(greatest(coalesce(p_budget_ms, 4000), 0), 6000);
  v_c0     timestamptz;
  v_slow   double precision := 0;   -- the longest table_archive chunk of this call, in ms
  v_arch   jsonb;
  v_left   jsonb := '[]'::jsonb;
  v_done   boolean := true;
  v_kind   text;
  v_was    boolean;
  v_may    boolean;
  v_applets jsonb;
  v_stalled boolean := false;   -- TEMPLATE-INSTALL-2: a table pass moved nothing
  v_len integer;
  v_stepped boolean := false;   -- TEMPLATE-INSTALL-2: a step has run in this call
begin
  -- FIRST-OPEN: its table passes keep the 1 s window (its own budget counts passes); a small table archived by a client
  -- call is the one that takes the longer window in custom.table_archive.
  if coalesce(current_setting('custom.archive_pass_ms', true), '') = '' then
    perform set_config('custom.archive_pass_ms', '1000', true);
  end if;
  perform custom.assert_store_door(p_organization_id, 'custom.template_uninstall');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_uninstall');
  select * into v_i from custom.template_install i
   where i.id = p_install_id and i.organization_id = p_organization_id for update;
  if not found then
    raise exception 'There is no such install in this organization, so there is nothing to uninstall.' using errcode = 'P0002';
  end if;
  if v_i.state = 'uninstalled' then
    return custom._template_answer(v_i, jsonb_build_object('already', true));
  end if;
  -- A STUCK INSTALL IS REMOVABLE (CHAIR-DESCRIBE-4, 2026-10-05): an install left "installing" (the page
  -- closed mid-install, a step never came back) archives what its finished steps made, like any other. The
  -- row lock above waits out a step that is running right now, so nothing half-made escapes `made`.
  v_arch := v_i.archived;
  -- THE APPLET THE INSTALL COPIED (2026-10-07): "Use this template" copies the template Applet into the organization and
  -- stamps metadata.from_template.install_id. Remove archives it with the rest (status archived + deleted_at), so its
  -- /apps/<slug> never reads a table that is gone; restore brings it back from `archived`.
  with u as (
    update app.definition a set status = 'archived', deleted_at = now(), updated_at = now()
     where a.organization_id = p_organization_id and a.deleted_at is null
       and a.metadata -> 'from_template' ->> 'install_id' = p_install_id::text
    returning a.id, a.name)
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'applet', 'id', u.id, 'title', u.name)), '[]'::jsonb) into v_applets from u;
  v_arch := v_arch || v_applets;

  for v_m in select x from jsonb_array_elements(v_i.made) with ordinality as e(x, n) order by n desc loop
    v_kind := v_m ->> 'kind';
    v_id := nullif(v_m ->> 'id', '')::uuid;
    continue when v_id is null or exists (select 1 from jsonb_array_elements(v_arch) a where a ->> 'id' = v_id::text);
    -- TEMPLATE-INSTALL-2: the FIRST step that works in a call always runs, so a call always moves; the budget decides only about the next.
    if v_stepped and extract(epoch from clock_timestamp() - v_t0) * 1000 > v_budget then
      v_done := false;
      exit;
    end if;
    v_len := jsonb_array_length(v_arch);
    case v_kind
      when 'table' then
        loop
          v_c0 := clock_timestamp();
          v_r := custom.table_archive(p_organization_id, v_id, 10, true);   -- small chunks (the interim installer's ARCHIVE_CHUNK): a call stays inside the 8 s ceiling
          v_slow := greatest(v_slow, extract(epoch from clock_timestamp() - v_c0) * 1000);
          exit when coalesce((v_r ->> 'done')::boolean, false) or coalesce((v_r ->> 'table_archived')::boolean, false);
          -- TEMPLATE-INSTALL-2: A PASS THAT MOVED NOTHING IS NAMED, NEVER LOOPED ON. table_archive's first step always runs, so
          -- this is a store answer we do not know; the install says which table, and the caller stops instead of calling again.
          if coalesce((v_r ->> 'archived')::integer, 0) + coalesce((v_r ->> 'built_on_archived')::integer, 0) = 0 then
            v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                        'says', 'Stopped: archiving this table moved nothing on this call (' || coalesce(v_r ->> 'message', 'no message') || ').'));
            v_stalled := true;
            exit;
          end if;
          -- TEMPLATE-FRESH-3: the next chunk starts only when it should fit what is left (1.5 x the slowest chunk so far), so a
          -- big table's call ends after the chunk that used its budget instead of starting one it cannot finish; the install
          -- stays `uninstalling` and the caller's next call resumes it.
          if extract(epoch from clock_timestamp() - v_t0) * 1000 + 1.5 * v_slow > v_budget then
            v_done := false;
            exit;
          end if;
        end loop;
        if v_stalled then
          v_done := false;
          exit;
        end if;
        exit when not v_done;
        v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title', 'event', v_r ->> 'archive_event'));
      when 'dashboard', 'document' then
        -- Both are records of the store; one already archived (by hand, or with its table) is left as it is.
        if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is null) then
          if v_kind = 'dashboard' then
            perform custom.dashboard_delete(p_organization_id, v_id);
          else
            perform custom.doc_template_delete(p_organization_id, v_id);
          end if;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        end if;
      when 'portal' then
        perform custom.portal_archive(p_organization_id, v_id, v_m ->> 'title', 'The template that made it was uninstalled.');
        v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
      when 'form' then
        select f.table_id into v_tbl from custom.anon_form f
         where f.organization_id = p_organization_id and f.id = v_id and f.deleted_at is null;
        if found then
          perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_uninstall');
          update custom.anon_form f set deleted_at = now(), updated_at = now(), updated_by = auth.uid()
           where f.organization_id = p_organization_id and f.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        end if;
      when 'view' then
        select v.subject_id into v_tbl from platform.saved_view v
         where v.organization_id = p_organization_id and v.id = v_id and v.deleted_at is null;
        if found then
          perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_uninstall');
          update platform.saved_view v set deleted_at = now(), updated_at = now(), updated_by = auth.uid()
           where v.organization_id = p_organization_id and v.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        end if;
      when 'record' then
        if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is null) then
          -- The template's Home can also hold a table the whole organization shares and the template did not
          -- make — "Checklist steps" (custom.checklist_steps_table puts it in the first Home it finds). Then the
          -- Home stays, named in `left`, and the uninstall finishes instead of being refused as a whole.
          begin
            perform custom.record_delete(p_organization_id, v_id);
            v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
          exception when foreign_key_violation then
            v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                        'says', 'Kept: it also holds tables the organization uses outside this template.'));
          end;
        end if;
      when 'agent' then
        -- The agents list's own Archive (is_archived; restorable from its Archived view), only for a copy in this
        -- organization the person may edit (agent.definition's std_update); anything else is named in `left`.
        select d.is_archived, (d.created_by = auth.uid() or iam.has_access('agent', d.id, 'editor'::public.permission_level))
          into v_was, v_may
          from agent.definition d
         where d.id = v_id and d.organization_id = p_organization_id and d.deleted_at is null;
        if not found then
          null;   -- already gone, or never this organization's: nothing to archive
        elsif v_was then
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        elsif v_may then
          update agent.definition d set is_archived = true, updated_at = now() where d.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        else
          v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                      'says', 'Kept: you may not change this agent, so it was not archived.'));
        end if;
      when 'workflow' then
        -- The workflows list's own Archive (is_archived), with the same rule as an agent (workflow.definition's std_update).
        select d.is_archived, (d.created_by = auth.uid() or iam.has_access('workflow', d.id, 'editor'::public.permission_level))
          into v_was, v_may
          from workflow.definition d
         where d.id = v_id and d.organization_id = p_organization_id and d.deleted_at is null;
        if not found then
          null;
        elsif v_was then
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        elsif v_may then
          update workflow.definition d set is_archived = true, updated_at = now() where d.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        else
          v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                      'says', 'Kept: you may not change this workflow, so it was not archived.'));
        end if;
      else
        null;   -- fields, rules, row actions, stage rules, dimensions: they go with their table.
    end case;
    -- A step that archived something (or worked on a table) counts; one that found nothing to do (a field, a rule, a row
    -- already gone) does not, so the first step that DOES work is the one every call is guaranteed.
    if v_kind = 'table' or jsonb_array_length(v_arch) > v_len then
      v_stepped := true;
    end if;
  end loop;

  update custom.template_install i
     set archived = v_arch,
         state = case when v_done then 'uninstalled' else 'uninstalling' end,
         refusal = case when v_stalled then jsonb_build_object('code', 'uninstall_stalled', 'door', 'custom.template_uninstall',
                          'message', v_left -> (jsonb_array_length(v_left) - 1) ->> 'says') end,
         uninstalled_at = case when v_done then now() end,
         uninstalled_by = case when v_done then auth.uid() end,
         updated_at = now()
   where i.id = v_i.id
  returning * into v_i;
  return custom._template_answer(v_i, jsonb_build_object('left', v_left, 'done', v_done));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.template_restore(p_organization_id uuid, p_install_id uuid, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
declare
  v_i        custom.template_install;
  v_a        jsonb;
  v_id       uuid;
  v_tbl      uuid;
  v_kind     text;
  v_title    text;
  v_left     jsonb;
  v_next     jsonb;
  v_progress boolean;
  v_t0       timestamptz := clock_timestamp();
  v_budget   integer := least(greatest(coalesce(p_budget_ms, 4000), 0), 600000);
  v_out      boolean := false;
  v_msg      text;
  v_code     text;
  v_hint     text;
  v_refusal  jsonb;
  v_slug     text;
  v_new_slug text;
  v_n        integer;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.template_restore');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_restore');
  select * into v_i from custom.template_install i
   where i.id = p_install_id and i.organization_id = p_organization_id for update;
  if not found then
    raise exception 'There is no such install in this organization.' using errcode = 'P0002';
  end if;
  if v_i.state not in ('uninstalled', 'uninstalling') then
    return custom._template_answer(v_i, jsonb_build_object('already', true));
  end if;
  if exists (select 1 from custom.template_install o
              where o.organization_id = p_organization_id and o.catalogue_id = v_i.catalogue_id
                and o.state <> 'uninstalled' and o.id <> v_i.id
                and o.instance_no is not distinct from v_i.instance_no) then  -- TEMPLATE-FRESH: per instance
    raise exception 'This template has been installed again since, so the earlier install cannot be brought back beside it.' using errcode = '55000';
  end if;

  -- `archived` lists newest-archived first; restore runs the other way (the Home before its tables).
  select coalesce(jsonb_agg(x order by n desc), '[]'::jsonb) into v_left
    from jsonb_array_elements(v_i.archived) with ordinality as e(x, n);

  loop
    v_progress := false;
    v_next := '[]'::jsonb;
    v_refusal := null;
    for v_a in select x from jsonb_array_elements(v_left) x loop
      if v_out or extract(epoch from clock_timestamp() - v_t0) * 1000 > v_budget then
        v_out := true;
        v_next := v_next || jsonb_build_array(v_a);
        continue;
      end if;
      v_kind := v_a ->> 'kind';
      v_id := (v_a ->> 'id')::uuid;
      v_title := v_a ->> 'title';
      begin
        case v_kind
          when 'table', 'record' then
            if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is not null) then
              perform custom.record_restore(p_organization_id, v_id);
            end if;
          when 'dashboard' then perform custom.dashboard_restore(p_organization_id, v_id);
          when 'document' then perform custom.doc_template_restore(p_organization_id, v_id);
          when 'portal' then perform custom.portal_restore(p_organization_id, v_id, v_title);
          when 'form' then
            select f.table_id, f.slug into v_tbl, v_slug from custom.anon_form f where f.organization_id = p_organization_id and f.id = v_id;
            perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_restore');
            -- TEMPLATE-INSTALL-3: a form made since owns this link name (a later install of a template with the same
            -- form): the restored form comes back under the first free `<slug>-<n>`, never refused for it.
            v_n := 1;
            v_new_slug := v_slug;
            while v_new_slug is not null and exists (select 1 from custom.anon_form o
                                                       where o.organization_id = p_organization_id and o.slug = v_new_slug
                                                         and o.deleted_at is null and o.id <> v_id) loop
              v_n := v_n + 1;
              v_new_slug := v_slug || '-' || v_n;
            end loop;
            update custom.anon_form f set deleted_at = null, slug = v_new_slug, updated_at = now(), updated_by = auth.uid()
             where f.organization_id = p_organization_id and f.id = v_id;
          when 'view' then
            select v.subject_id into v_tbl from platform.saved_view v where v.organization_id = p_organization_id and v.id = v_id;
            perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_restore');
            update platform.saved_view v set deleted_at = null, updated_at = now(), updated_by = auth.uid()
             where v.organization_id = p_organization_id and v.id = v_id;
          when 'applet' then
            update app.definition a set status = 'draft', deleted_at = null, updated_at = now()
             where a.id = v_id and a.organization_id = p_organization_id;
          else null;
        end case;
        v_progress := true;
      exception when others then
        get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate, v_hint = pg_exception_hint;
        -- TEMPLATE-INSTALL-3: the refusal answered is the CAUSE: a table's (or record's) refusal is kept over that of
        -- a dashboard, view or form that only waits for the table (it said "counts a table that is archived").
        if v_refusal is null or v_kind in ('table', 'record') or (v_refusal ->> 'kind') not in ('table', 'record') then
          v_refusal := jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_title, 'code', v_code,
                                          'message', v_msg, 'hint', nullif(v_hint, ''));
        end if;
        v_next := v_next || jsonb_build_array(v_a);
      end;
    end loop;
    v_left := v_next;
    exit when v_out or not v_progress or jsonb_array_length(v_left) = 0;
  end loop;

  -- Back in `archived` order (newest first), so a later call or uninstall reads it the same way.
  select coalesce(jsonb_agg(x order by n desc), '[]'::jsonb) into v_left
    from jsonb_array_elements(v_left) with ordinality as e(x, n);
  update custom.template_install i
     set archived = v_left,
         state = case when jsonb_array_length(v_left) = 0 then 'installed' else i.state end,
         uninstalled_at = case when jsonb_array_length(v_left) = 0 then null else i.uninstalled_at end,
         uninstalled_by = case when jsonb_array_length(v_left) = 0 then null else i.uninstalled_by end,
         updated_at = now()
   where i.id = v_i.id
  returning * into v_i;
  return custom._template_answer(v_i, jsonb_build_object(
           'restored', jsonb_array_length(v_left) = 0,
           'done', jsonb_array_length(v_left) = 0,
           'waiting', jsonb_array_length(v_left),
           'refusal', case when not v_out and jsonb_array_length(v_left) > 0 then v_refusal end));
end;
$function$;


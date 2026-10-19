-- additive: yes
-- One function body (custom.template_uninstall). Nothing dropped, revoked, or granted; no table DDL.
-- lane: TEMPLATE-INSTALL-2
-- lock: custom
-- Inverse: migrations/inverse/20261020030500_templateinstall2_a2_a_step_that_finds_nothing_to_do_is_not_the_calls_step_down.sql
-- based-on: custom.template_uninstall(uuid, uuid, integer) c5543b2cb9c680edd87440920cfb4c50cffd04545f5341b6465cb96010047f44
--
-- TEMPLATE-INSTALL-2 (follow-up to 20261020030000): the call's guaranteed first step must be a step that WORKS. A made field, rule or
-- row that is already gone is a no-op kind; counting it as the call's one step spent the whole call on it, and the same no-op came
-- first again on every later call (found by the test: a budget-0 uninstall stayed at 0 archived for 25 calls). Now only a step that
-- archived something, or worked on a table, counts.
set local lock_timeout = '3s';

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

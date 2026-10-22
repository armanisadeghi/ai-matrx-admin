-- INVERSE of migrations/campaign/restoreadvance_c_a_restore_brings_back_the_assistant_and_workflows.sql (lane RESTORE-ADVANCE): the body before it.
-- chair-step: restores a function body.
-- lock: custom
-- based-on: custom.template_restore(uuid, uuid, integer) 9dc0d8b6cc1d9f96afe9a949314667efab438b0c367bfd4347f5856826cacf30
set local lock_timeout = '3s';

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
  -- RESTORE-ADVANCE: at most 6 s, like the uninstall door (PostgREST cancels a client call at ~8 s, and a cancelled call
  -- rolls back everything it brought back).
  v_budget   integer := least(greatest(coalesce(p_budget_ms, 4000), 0), 6000);
  v_wall     constant integer := 6000;   -- before anything came back, the call keeps trying up to this, never the budget
  v_any      boolean := false;           -- RESTORE-ADVANCE: something came back in THIS call
  v_fail     jsonb;                      -- this pass's refused items, retried after the rest (and first to go to the back)
  v_ms       double precision;
  v_slow     double precision := 0;   -- RESTORE-ADVANCE b: the longest item of this call, in ms
  v_s0       timestamptz;
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
    v_fail := '[]'::jsonb;
    v_refusal := null;
    for v_a in select x from jsonb_array_elements(v_left) x loop
      v_ms := extract(epoch from clock_timestamp() - v_t0) * 1000;
      -- RESTORE-ADVANCE (ADVERSARIAL-8 F2): the budget ends a call only once something came back in it. A refused first
      -- item (a table that waits for the table restored after it) used to spend the whole budget, so the call answered
      -- "keep going" having brought nothing back, and every later call did the same from the same item (36 calls, 0 moved).
      -- RESTORE-ADVANCE b: an item is not started when the longest one so far would carry the call past the wall (a call
      -- PostgREST cancels at ~8 s rolls back what it brought back AND the reordering, so the next call repeats it).
      if v_out or (v_any and v_ms > v_budget) or v_ms + v_slow > v_wall then
        v_out := true;
        v_next := v_next || jsonb_build_array(v_a);
        continue;
      end if;
      v_kind := v_a ->> 'kind';
      v_id := (v_a ->> 'id')::uuid;
      v_title := v_a ->> 'title';
      v_s0 := clock_timestamp();
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
          when 'page' then
            -- TEMPLATE-INSTALL-3: the workspace page comes back out of Trash (its sub-pages with it).
            perform content.space_set_trashed(v_id, false);
          when 'applet' then
            update app.definition a set status = 'draft', deleted_at = null, updated_at = now()
             where a.id = v_id and a.organization_id = p_organization_id;
          else null;
        end case;
        v_progress := true;
        v_any := true;
      exception when others then
        get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate, v_hint = pg_exception_hint;
        -- TEMPLATE-INSTALL-3: the refusal answered is the CAUSE: a table's (or record's) refusal is kept over that of
        -- a dashboard, view or form that only waits for the table (it said "counts a table that is archived").
        if v_refusal is null or v_kind in ('table', 'record') or (v_refusal ->> 'kind') not in ('table', 'record') then
          v_refusal := jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_title, 'code', v_code,
                                          'message', v_msg, 'hint', nullif(v_hint, ''));
        end if;
        v_fail := v_fail || jsonb_build_array(v_a);
      end;
      v_slow := greatest(v_slow, extract(epoch from clock_timestamp() - v_s0) * 1000);
    end loop;
    -- RESTORE-ADVANCE: what was refused goes behind what was not tried yet, so the next call starts somewhere new.
    v_left := v_next || v_fail;
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
           -- RESTORE-ADVANCE: "keep going" (no refusal, not done) only after a call that brought something back. A call that
           -- brought nothing back always says why, in one sentence, so the client stops and offers "Try again".
           'refusal', case when jsonb_array_length(v_left) > 0 and not (v_any and v_out) then
                        coalesce(v_refusal, jsonb_build_object('code', 'restore_stalled', 'door', 'custom.template_restore',
                                   'message', 'Nothing could be brought back this time; try again in a minute.'))
                        -- RESTORE-ADVANCE b: `untried` = items this call had no time for. A stalled call with untried > 0 is not a
                        -- dead end (its refused items went to the back); the Spaces client calls again, bounded by the item count.
                        || jsonb_build_object('stalled', not v_any, 'untried', case when v_out then jsonb_array_length(v_next) else 0 end) end));
end;
$function$;

-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- One function body only (custom.template_install_note). Nothing dropped, revoked, or granted; no table DDL.
-- lane: INSTALL-ATOMIC
-- lock: custom
-- Inverse: migrations/inverse/installatomic_a_a_template_page_is_recorded_before_it_is_written_down.sql
-- based-on: custom.template_install_note(uuid, uuid, text, uuid, text) 653dc02d12e4a77d35b76168241769e1247cd8216d42a624f15fa16cf12ab6c3
--
-- INSTALL-ATOMIC (ADVERSARIAL-7 F1b) - A TEMPLATE PAGE IS RECORDED BEFORE IT IS WRITTEN. "Use template" recorded its root page on the
-- install only after every page was written (~3 min under load). A run cut off in between (tab closed, navigation, a dropped
-- connection) left a root the install never knew: template_instance_of_page answered null, Spaces never offered "Remove template
-- copy", and Move to Trash left the copy's tables live. The host now records the page under its caller-chosen id first, then
-- writes it; this body accepts an id no document holds yet (a planned page). Remove/Restore already skip a page that does not exist.
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
  if coalesce(p_kind, '') not in ('agent', 'workflow', 'page') then
    raise exception 'An install records only what its host makes outside the store (an agent, a workflow or a workspace page); "%" is made by the install itself.', coalesce(p_kind, '(none)')
      using errcode = '22023';
  end if;
  -- TEMPLATE-INSTALL-3: a workspace page (a Spaces root the host made beside the tables) is recorded so Remove moves it to Trash and
  -- Restore brings it back.
  -- INSTALL-ATOMIC (ADVERSARIAL-7 F1b): the host records the page BEFORE it writes it, under the id it chose, so no run can leave
  -- a page the install does not know (a run cut off between the write and the record left SP0579's copy unremovable). So an id
  -- no document holds yet is accepted as a planned page; Remove and Restore skip it until it exists. An id a document already
  -- holds must be a Spaces page of this organization.
  if p_kind = 'page' and exists (select 1 from content.document d where d.id = p_id)
     and not exists (select 1 from content.document d
                      where d.id = p_id and d.organization_id = p_organization_id and d.format = 'spaces') then
    raise exception 'That is not a workspace page of this organization, so the install cannot record it.' using errcode = '22023';
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

-- INVERSE of migrations/campaign/installatomic_a_a_template_page_is_recorded_before_it_is_written.sql (lane INSTALL-ATOMIC): the body before it.
-- chair-step: restores a function body.
-- lock: custom
-- based-on: custom.template_install_note(uuid, uuid, text, uuid, text) 1a85b3f9636878d793b24bcd21c8d2310bfc2c9b5e7856132d52c3626ee4b648
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
  -- Restore brings it back. It must be a Spaces page of this organization.
  if p_kind = 'page' and not exists (select 1 from content.document d
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

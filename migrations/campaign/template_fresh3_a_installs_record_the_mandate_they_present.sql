-- template_fresh3_a_installs_record_the_mandate_they_present.sql (lane TEMPLATE-FRESH-3, 2026-10-19)
-- based-on: custom._template_answer(custom.template_install, jsonb) 4e401d740bba30e54899707e369a0d1c4cd1020128865b41b47db054a29d3c38
-- additive: yes (one nullable column, one trigger, one function body).
-- Inverse: migrations/inverse/template_fresh3_a_installs_record_the_mandate_they_present_down.sql.
-- A template may present a MANDATE instead of copying an agent (spec.mandateKey, compiled to plan.mandateKey, e.g. the design
-- packs' `design_system.build`). The install copies no agent (the plan has no `agent`, so _template_agent answers null) and
-- records the key ON THE INSTALL: custom.template_install.mandate_key is set from the template's plan whenever an install row
-- is made or moved to another template version (an upgrade), so a surface reads it from the install, answered as `mandate_key`.
ALTER TABLE custom.template_install ADD COLUMN IF NOT EXISTS mandate_key text;

CREATE OR REPLACE FUNCTION custom._template_install_mandate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.mandate_key := (select nullif(btrim(t.plan ->> 'mandateKey'), '') from custom.template t where t.id = new.template_id);
  return new;
end;
$function$;

CREATE OR REPLACE TRIGGER template_install_mandate
  BEFORE INSERT OR UPDATE OF template_id ON custom.template_install
  FOR EACH ROW EXECUTE FUNCTION custom._template_install_mandate();

-- Installs made before this migration for a template that presents a mandate.
UPDATE custom.template_install i
   SET mandate_key = nullif(btrim(t.plan ->> 'mandateKey'), '')
  FROM custom.template t
 WHERE t.id = i.template_id AND t.plan ? 'mandateKey' AND i.mandate_key IS NULL;

CREATE OR REPLACE FUNCTION custom._template_answer(p_install custom.template_install, p_extra jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select jsonb_build_object(
    'install_id', p_install.id,
    'organization_id', p_install.organization_id,
    'template_id', p_install.template_id,
    'catalogue_id', p_install.catalogue_id,
    'version', p_install.template_version,
    'state', p_install.state,
    'ok', p_install.state in ('installing', 'installed', 'uninstalling', 'uninstalled'),
    'done', p_install.state in ('installed', 'uninstalled'),
    'next_step', p_install.next_step,
    'made', p_install.made,
    'archived', p_install.archived,
    'refusal', p_install.refusal,
    'install_day', p_install.install_day,
    'ms', p_install.ms,
    'calls', p_install.calls,
    -- CHAIR-TEMPLATE-UPGRADE (2026-10-06): ONE agent shape for every door of the family.
    'agent', custom._template_agent(p_install),
    -- TEMPLATE-FRESH-3: the mandate this install's template presents instead of an agent copy (null when it copies an agent).
    'mandate_key', p_install.mandate_key,
    'host', (select jsonb_build_object(
                      'extra_agents', t.plan -> 'extraAgents',
                      'workflows', t.plan -> 'workflows',
                      'ids', coalesce((select jsonb_object_agg(substr(e.key, 5), e.value)
                                         from jsonb_each(p_install.ids) e
                                        where e.key like 'ref:tables.%' or e.key like 'new:row.%'), '{}'::jsonb))
               from custom.template t
              where t.id = p_install.template_id
                and (t.plan ? 'extraAgents' or t.plan ? 'workflows'
                     or jsonb_path_exists(t.plan, '$.agent.bindings[*].binding'))),
    'show', (select jsonb_strip_nulls(jsonb_build_object(
                      'guide', t.spec -> 'guide',
                      'agent_name', t.spec #>> '{agent,name}',
                      'agent_question', t.spec #>> '{agent,question,ask}',
                      'agent_try_it', t.spec #> '{agent,tryIt}',
                      'unrecorded', (select jsonb_agg(jsonb_build_object(
                                       'kind', x ->> 'kind', 'title', coalesce(x ->> 'name', x ->> 'token'),
                                       'ref', (x ->> 'kind') || '.' || coalesce(x ->> 'token', ''),
                                       'table_id', p_install.ids ->> ('ref:tables.' || (x ->> 'table'))))
                                       from jsonb_array_elements(coalesce(t.spec -> 'extras', '[]'::jsonb)) x
                                      where x ->> 'kind' = 'stage_rules')))
               from custom.template t where t.id = p_install.template_id))
  -- TEMPLATE-FRESH: a fresh copy says which one it is (the default install answers exactly as before).
  || case when p_install.instance_no is not null then
       jsonb_build_object('instance', jsonb_build_object('no', p_install.instance_no, 'title', p_install.instance_title,
                                                          'mode', 'fresh', 'suffix', ' · ' || p_install.instance_title))
     else '{}'::jsonb end
  || coalesce(p_extra, '{}'::jsonb)
$function$
;

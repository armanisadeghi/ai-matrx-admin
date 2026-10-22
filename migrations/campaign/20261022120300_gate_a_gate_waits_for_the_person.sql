-- based-on: mandate.shortcut_treatment_config(jsonb) 6476634930c64001596faa571f3c606250d7c98b7b65994e049b5415dd339d81
-- based-on: public.create_shortcut_from_agent_surface(uuid, uuid, uuid, uuid, uuid, uuid, jsonb) 6212143e8cf122efe9ec26dbbc61e7de63acd10df45d7e5af0c14d6e2dbc4390
-- GATE (UI net Q-10-a, 2026-10-22): a shortcut's pre-execution gate pressed Send for the person three seconds
-- after it opened. A positive bypass_gate_seconds is an auto-send countdown, and the number 3 was the blank-form
-- default everywhere: the view's COALESCE, the treatment writer, the create-from-surface writer, and 226 stored
-- treatments (config.gate.bypass_seconds = 3) that never chose it. A gate whose default is to confirm itself is
-- not a gate. Defaults become 0 (wait for the person) and the stored 3s are reset; any other number someone set
-- (there is one, 7) is a chosen countdown and stays.
-- 1) the reader's default
create or replace view mandate.vw_shortcut with (security_invoker = true) as
 SELECT COALESCE((d.metadata ->> 'legacy_id'::text)::uuid, d.id) AS id,
    ((t.config -> 'menu'::text) ->> 'category_id'::text)::uuid AS category_id,
    d.label,
    d.description,
    t.config ->> 'icon_name'::text AS icon_name,
    t.config ->> 'keyboard_shortcut'::text AS keyboard_shortcut,
    COALESCE(((t.config -> 'menu'::text) ->> 'sort_order'::text)::integer, 0) AS sort_order,
    d.default_holder_id AS agent_id,
    COALESCE((t.config -> 'menu'::text) -> 'enabled_features'::text, '["general"]'::jsonb) AS enabled_features,
    d.metadata -> 'shortcut_scope_mappings'::text AS scope_mappings,
    COALESCE(t.config ->> 'display_mode'::text, 'modal-full'::text) AS display_mode,
    COALESCE((t.config ->> 'allow_chat'::text)::boolean, true) AS allow_chat,
    COALESCE((t.config ->> 'auto_run'::text)::boolean, true) AS auto_run,
    COALESCE(((t.config -> 'gate'::text) ->> 'enabled'::text)::boolean, false) AS show_pre_execution_gate,
    d.is_enabled AS is_active,
    COALESCE((d.metadata ->> 'shortcut_created_at'::text)::timestamp with time zone, d.created_at) AS created_at,
    COALESCE((d.metadata ->> 'shortcut_updated_at'::text)::timestamp with time zone, d.updated_at) AS updated_at,
    d.organization_id,
    d.default_holder_version_id AS agent_version_id,
    d.default_holder_version_id IS NULL AS use_latest,
    COALESCE(((t.config -> 'variables'::text) ->> 'show_panel'::text)::boolean, false) AS show_variable_panel,
    COALESCE((t.config -> 'variables'::text) ->> 'panel_style'::text, 'inline'::text) AS variables_panel_style,
    COALESCE(((t.config -> 'reveal'::text) ->> 'show_definition_messages'::text)::boolean, false) AS show_definition_messages,
    COALESCE(((t.config -> 'reveal'::text) ->> 'show_definition_message_content'::text)::boolean, false) AS show_definition_message_content,
    COALESCE(((t.config -> 'reveal'::text) ->> 'hide_reasoning'::text)::boolean, false) AS hide_reasoning,
    COALESCE(((t.config -> 'reveal'::text) ->> 'hide_tool_results'::text)::boolean, false) AS hide_tool_results,
    (t.config -> 'gate'::text) ->> 'message'::text AS pre_execution_message,
    COALESCE(((t.config -> 'gate'::text) ->> 'bypass_seconds'::text)::integer, 0) AS bypass_gate_seconds,
    (t.config -> 'seeds'::text) ->> 'default_user_input'::text AS default_user_input,
    (t.config -> 'seeds'::text) -> 'default_variables'::text AS default_variables,
    (t.config -> 'seeds'::text) -> 'context_overrides'::text AS context_overrides,
    (t.config -> 'seeds'::text) -> 'llm_overrides'::text AS llm_overrides,
    d.metadata -> 'shortcut_context_mappings'::text AS context_mappings,
    COALESCE(t.config ->> 'response_density'::text, 'comfortable'::text) AS response_density,
    t.config -> 'json_extraction'::text AS json_extraction,
    (t.config -> 'menu'::text) ->> 'surface_name'::text AS surface_name,
    d.default_consumption_map - '__write_policies'::text AS value_mappings,
    (d.metadata ->> 'shortcut_created_by'::text)::uuid AS created_by,
    (d.metadata ->> 'shortcut_updated_by'::text)::uuid AS updated_by,
    COALESCE((d.metadata ->> 'shortcut_version'::text)::integer, d.version) AS version,
    d.visibility,
    d.deleted_at,
    COALESCE(d.metadata -> 'shortcut_metadata'::text, '{}'::jsonb) AS metadata,
    d.id AS mandate_id,
    d.mandate_key,
    COALESCE(t.config -> 'write_policies'::text, '{}'::jsonb) AS write_policies,
    COALESCE(t.config -> 'never_include_tools'::text, '[]'::jsonb) AS never_include_tools
   FROM mandate.definition d
     JOIN mandate.treatment t ON t.mandate_id = d.id AND t.tier = 'widget'::text AND t.is_default AND t.deleted_at IS NULL
  WHERE d.metadata ? 'shortcut_compat'::text AND d.deleted_at IS NULL;

-- 2) the writers' default
CREATE OR REPLACE FUNCTION mandate.shortcut_treatment_config(p_row jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT
    jsonb_build_object(
      'schema_version', 1,
      'display_mode', coalesce(p_row->>'display_mode', 'modal-full'),
      'allow_chat', coalesce((p_row->>'allow_chat')::boolean, true),
      'auto_run', coalesce((p_row->>'auto_run')::boolean, true),
      'response_density', coalesce(p_row->>'response_density', 'comfortable'),
      'variables', jsonb_build_object(
        'show_panel', coalesce((p_row->>'show_variable_panel')::boolean, false),
        'panel_style', coalesce(p_row->>'variables_panel_style', 'inline')),
      'reveal', jsonb_build_object(
        'show_definition_messages', coalesce((p_row->>'show_definition_messages')::boolean, false),
        'show_definition_message_content', coalesce((p_row->>'show_definition_message_content')::boolean, false),
        'hide_reasoning', coalesce((p_row->>'hide_reasoning')::boolean, false),
        'hide_tool_results', coalesce((p_row->>'hide_tool_results')::boolean, false)),
      'gate', jsonb_build_object(
          'enabled', coalesce((p_row->>'show_pre_execution_gate')::boolean, false),
          'bypass_seconds', coalesce((p_row->>'bypass_gate_seconds')::int, 0))
        || CASE WHEN p_row->>'pre_execution_message' IS NOT NULL
                THEN jsonb_build_object('message', p_row->>'pre_execution_message')
                ELSE '{}'::jsonb END,
      'seeds', '{}'::jsonb
        || CASE WHEN p_row->>'default_user_input' IS NOT NULL
                THEN jsonb_build_object('default_user_input', p_row->>'default_user_input')
                ELSE '{}'::jsonb END
        || CASE WHEN jsonb_typeof(p_row->'default_variables') IS DISTINCT FROM NULL
                     AND jsonb_typeof(p_row->'default_variables') <> 'null'
                THEN jsonb_build_object('default_variables', p_row->'default_variables')
                ELSE '{}'::jsonb END
        || CASE WHEN jsonb_typeof(p_row->'context_overrides') IS DISTINCT FROM NULL
                     AND jsonb_typeof(p_row->'context_overrides') <> 'null'
                THEN jsonb_build_object('context_overrides', p_row->'context_overrides')
                ELSE '{}'::jsonb END
        || CASE WHEN jsonb_typeof(p_row->'llm_overrides') IS DISTINCT FROM NULL
                     AND jsonb_typeof(p_row->'llm_overrides') <> 'null'
                THEN jsonb_build_object('llm_overrides', p_row->'llm_overrides')
                ELSE '{}'::jsonb END,
      'menu', jsonb_build_object(
          'sort_order', coalesce((p_row->>'sort_order')::int, 0),
          'enabled_features', coalesce(NULLIF(p_row->'enabled_features', 'null'::jsonb), '["general"]'::jsonb))
        || CASE WHEN p_row->>'category_id' IS NOT NULL
                THEN jsonb_build_object('category_id', p_row->>'category_id')
                ELSE '{}'::jsonb END
        || CASE WHEN p_row->>'surface_name' IS NOT NULL
                THEN jsonb_build_object('surface_name', p_row->>'surface_name')
                ELSE '{}'::jsonb END
    )
    || CASE WHEN p_row->>'icon_name' IS NOT NULL
            THEN jsonb_build_object('icon_name', p_row->>'icon_name')
            ELSE '{}'::jsonb END
    || CASE WHEN p_row->>'keyboard_shortcut' IS NOT NULL
            THEN jsonb_build_object('keyboard_shortcut', p_row->>'keyboard_shortcut')
            ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_row->'json_extraction') IS DISTINCT FROM NULL
                 AND jsonb_typeof(p_row->'json_extraction') <> 'null'
            THEN jsonb_build_object('json_extraction', p_row->'json_extraction')
            ELSE '{}'::jsonb END
    -- Tool block list: names (or prefix* groups) this shortcut never offers its run.
    || CASE WHEN jsonb_typeof(p_row->'never_include_tools') = 'array'
                 AND p_row->'never_include_tools' <> '[]'::jsonb
            THEN jsonb_build_object('never_include_tools', p_row->'never_include_tools')
            ELSE '{}'::jsonb END
    -- Census #20: policies are treatment. An empty map stores nothing, so a
    -- shortcut with no overrides keeps a config byte-identical to before.
    || CASE WHEN jsonb_typeof(p_row->'write_policies') = 'object'
                 AND p_row->'write_policies' <> '{}'::jsonb
            THEN jsonb_build_object('write_policies', p_row->'write_policies')
            ELSE '{}'::jsonb END
$function$;

CREATE OR REPLACE FUNCTION public.create_shortcut_from_agent_surface(p_agent_surface_id uuid, p_category_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_organization_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_task_id uuid DEFAULT NULL::uuid, p_overrides jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_agent_id       uuid;
  v_surface_name   text;
  v_value_maps     jsonb;
  v_write_policies jsonb;
  v_effective_maps jsonb;
  v_agent          record;
  v_new_id         uuid;
  v_label          text;
  v_description    text;
  v_icon_name      text;
begin
  select a.source_id,
         us.name,
         coalesce(a.payload->'value_mappings', a.metadata->'value_mappings', '{}'::jsonb),
         coalesce(a.payload->'write_policies', '{}'::jsonb)
    into v_agent_id, v_surface_name, v_value_maps, v_write_policies
    from platform.associations_live a
    join ui.ui_surface us on us.id = a.target_id
   where a.id = p_agent_surface_id
     and a.source_type = 'agent'
     and a.target_type = 'surface';

  if v_agent_id is null then
    raise exception 'agent-surface binding association % not found', p_agent_surface_id;
  end if;

  select id, name, description into v_agent
    from agent.definition where id = v_agent_id;
  if not found then
    raise exception 'agent.definition row % not found', v_agent_id;
  end if;

  v_label       := coalesce(p_overrides->>'label',       v_agent.name || ' Shortcut');
  v_description := coalesce(p_overrides->>'description', v_agent.description);
  v_icon_name   := coalesce(p_overrides->>'icon_name',   null);

  v_effective_maps := coalesce((p_overrides->'value_mappings')::jsonb, v_value_maps);
  if v_write_policies <> '{}'::jsonb
     and not (v_effective_maps ? '__write_policies') then
    v_effective_maps := coalesce(v_effective_maps, '{}'::jsonb)
      || jsonb_build_object('__write_policies', v_write_policies);
  end if;

  insert into agent.shortcut (
    category_id, label, description, icon_name, agent_id, surface_name,
    value_mappings, created_by, organization_id,
    keyboard_shortcut, display_mode, allow_chat, auto_run, show_variable_panel,
    variables_panel_style, show_definition_messages, show_definition_message_content,
    hide_reasoning, hide_tool_results, show_pre_execution_gate, pre_execution_message,
    bypass_gate_seconds, default_user_input, default_variables, context_overrides,
    llm_overrides, response_density, json_extraction, enabled_features, use_latest,
    agent_version_id, is_active
  ) values (
    p_category_id, v_label, v_description, v_icon_name, v_agent_id, v_surface_name,
    v_effective_maps,
    p_user_id, p_organization_id,
    p_overrides->>'keyboard_shortcut',
    coalesce(p_overrides->>'display_mode', 'modal-full'),
    coalesce((p_overrides->>'allow_chat')::boolean, true),
    coalesce((p_overrides->>'auto_run')::boolean, true),
    coalesce((p_overrides->>'show_variable_panel')::boolean, false),
    coalesce(p_overrides->>'variables_panel_style', 'inline'),
    coalesce((p_overrides->>'show_definition_messages')::boolean, false),
    coalesce((p_overrides->>'show_definition_message_content')::boolean, false),
    coalesce((p_overrides->>'hide_reasoning')::boolean, false),
    coalesce((p_overrides->>'hide_tool_results')::boolean, false),
    coalesce((p_overrides->>'show_pre_execution_gate')::boolean, false),
    p_overrides->>'pre_execution_message',
    coalesce((p_overrides->>'bypass_gate_seconds')::int, 0),
    p_overrides->>'default_user_input',
    (p_overrides->'default_variables')::jsonb,
    (p_overrides->'context_overrides')::jsonb,
    (p_overrides->'llm_overrides')::jsonb,
    coalesce(p_overrides->>'response_density', 'comfortable'),
    (p_overrides->'json_extraction')::jsonb,
    coalesce((p_overrides->'enabled_features')::jsonb, '["general"]'::jsonb),
    coalesce((p_overrides->>'use_latest')::boolean, true),
    nullif(p_overrides->>'agent_version_id', '')::uuid,
    true
  )
  returning id into v_new_id;

  if p_project_id is not null then
    perform public.assoc_add('agent_shortcut', v_new_id, 'project', p_project_id, p_organization_id);
  end if;
  if p_task_id is not null then
    perform public.assoc_add('agent_shortcut', v_new_id, 'task', p_task_id, p_organization_id);
  end if;

  return v_new_id;
end;
$function$;

-- 3) the stored defaults
update mandate.treatment
   set config = jsonb_set(config, '{gate,bypass_seconds}', '0'::jsonb)
 where config->'gate'->>'bypass_seconds' = '3';

-- 4) the legacy table's blank default
alter table agent.shortcut alter column bypass_gate_seconds set default 0;
update agent.shortcut set bypass_gate_seconds = 0 where bypass_gate_seconds = 3;

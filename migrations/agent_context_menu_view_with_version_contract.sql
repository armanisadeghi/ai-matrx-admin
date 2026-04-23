-- Patch agent_context_menu_view to carry the agent contract (variable
-- definitions + context slots) on every shortcut item, read from the
-- correct source (frozen agx_version when the shortcut pins a version,
-- live agx_agent otherwise).
--
-- Why: the client reads shortcuts straight from this view and executes
-- them without any subsequent agent fetch. Without these fields, every
-- scope→variable mapping silently drops and the agent runs blind.
-- Additionally, reading from agx_agent (current) for a version-pinned
-- shortcut would silently swap in the current version's contract —
-- breaking shortcut authors' frozen contracts.
--
-- Fields added inside each shortcut item's `agent` object:
--   variable_definitions jsonb
--   context_slots        jsonb
--
-- Source selection:
--   use_latest = false AND agent_version_id set → agx_version.*
--   otherwise                                   → agx_agent.*

CREATE OR REPLACE VIEW public.agent_context_menu_view AS
WITH shortcut_items AS (
  SELECT
    sc_1.id AS category_id,
    sc_1.placement_type,
    COALESCE(
      json_agg(
        json_build_object(
          'type', 'agent_shortcut',
          'id', s.id,
          'label', s.label,
          'description', s.description,
          'icon_name', s.icon_name,
          'sort_order', s.sort_order,
          'keyboard_shortcut', s.keyboard_shortcut,
          'scope_mappings', s.scope_mappings,
          'context_mappings', s.context_mappings,
          'enabled_features', s.enabled_features,
          'display_mode', s.display_mode,
          'auto_run', s.auto_run,
          'allow_chat', s.allow_chat,
          'show_variable_panel', s.show_variable_panel,
          'variables_panel_style', s.variables_panel_style,
          'show_definition_messages', s.show_definition_messages,
          'show_definition_message_content', s.show_definition_message_content,
          'hide_reasoning', s.hide_reasoning,
          'hide_tool_results', s.hide_tool_results,
          'show_pre_execution_gate', s.show_pre_execution_gate,
          'pre_execution_message', s.pre_execution_message,
          'bypass_gate_seconds', s.bypass_gate_seconds,
          'default_user_input', s.default_user_input,
          'default_variables', s.default_variables,
          'context_overrides', s.context_overrides,
          'llm_overrides', s.llm_overrides,
          'agent_id', s.agent_id,
          'agent_version_id', s.agent_version_id,
          'use_latest', s.use_latest,
          'scope',
            CASE
              WHEN s.user_id IS NOT NULL THEN 'user'::text
              WHEN s.organization_id IS NOT NULL THEN 'organization'::text
              WHEN s.project_id IS NOT NULL THEN 'project'::text
              WHEN s.task_id IS NOT NULL THEN 'task'::text
              ELSE 'global'::text
            END,
          'agent',
            CASE
              WHEN s.agent_id IS NOT NULL THEN json_build_object(
                'id', s.agent_id,
                'name', COALESCE(v.name, a.name),
                'description', a.description,
                'variable_definitions',
                  CASE
                    WHEN s.use_latest = false AND v.id IS NOT NULL THEN v.variable_definitions
                    ELSE a.variable_definitions
                  END,
                'context_slots',
                  CASE
                    WHEN s.use_latest = false AND v.id IS NOT NULL THEN v.context_slots
                    ELSE a.context_slots
                  END
              )
              ELSE NULL::json
            END
        ) ORDER BY s.sort_order
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM shortcut_categories sc_1
    LEFT JOIN agx_shortcut s ON s.category_id = sc_1.id AND s.is_active = true
    LEFT JOIN agx_agent a ON a.id = s.agent_id
    LEFT JOIN agx_version v ON v.id = s.agent_version_id
  WHERE sc_1.is_active = true
  GROUP BY sc_1.id, sc_1.placement_type
),
block_items AS (
  SELECT
    sc_1.id AS category_id,
    sc_1.placement_type,
    COALESCE(
      json_agg(
        json_build_object(
          'type', 'content_block',
          'id', cb.id,
          'label', cb.label,
          'description', cb.description,
          'icon_name', cb.icon_name,
          'sort_order', cb.sort_order,
          'template', cb.template,
          'block_id', cb.block_id,
          'scope',
            CASE
              WHEN cb.user_id IS NOT NULL THEN 'user'::text
              WHEN cb.organization_id IS NOT NULL THEN 'organization'::text
              WHEN cb.project_id IS NOT NULL THEN 'project'::text
              WHEN cb.task_id IS NOT NULL THEN 'task'::text
              ELSE 'global'::text
            END
        ) ORDER BY cb.sort_order
      ) FILTER (WHERE cb.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM shortcut_categories sc_1
    LEFT JOIN content_blocks cb ON cb.category_id = sc_1.id AND cb.is_active = true
  WHERE sc_1.is_active = true
  GROUP BY sc_1.id, sc_1.placement_type
)
SELECT
  sc.placement_type,
  json_agg(
    json_build_object(
      'category', json_build_object(
        'id', sc.id,
        'placement_type', sc.placement_type,
        'parent_category_id', sc.parent_category_id,
        'label', sc.label,
        'description', sc.description,
        'icon_name', sc.icon_name,
        'color', sc.color,
        'sort_order', sc.sort_order,
        'is_active', sc.is_active,
        'metadata', sc.metadata,
        'enabled_features', sc.enabled_features,
        'scope',
          CASE
            WHEN sc.user_id IS NOT NULL THEN 'user'::text
            WHEN sc.organization_id IS NOT NULL THEN 'organization'::text
            WHEN sc.project_id IS NOT NULL THEN 'project'::text
            WHEN sc.task_id IS NOT NULL THEN 'task'::text
            ELSE 'global'::text
          END
      ),
      'items', (
        SELECT COALESCE(json_agg(combined.elem ORDER BY ((combined.elem ->> 'sort_order'::text)::integer)), '[]'::json)
        FROM (
          SELECT json_array_elements(si.items) AS elem WHERE si.items::text <> '[]'::text
          UNION ALL
          SELECT json_array_elements(bi.items) AS elem WHERE bi.items::text <> '[]'::text
        ) combined
      )
    ) ORDER BY sc.sort_order
  ) AS categories_flat
FROM shortcut_categories sc
  LEFT JOIN shortcut_items si ON si.category_id = sc.id
  LEFT JOIN block_items bi ON bi.category_id = sc.id
WHERE sc.is_active = true
GROUP BY sc.placement_type;

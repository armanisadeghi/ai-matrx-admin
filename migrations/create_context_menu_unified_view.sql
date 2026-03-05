-- ============================================================
-- context_menu_unified_view
-- ============================================================
-- Pre-aggregated view that returns all context menu data grouped
-- by placement_type. Each row contains a placement_type and a
-- categories_flat JSON array ready for client-side consumption.
--
-- The categories_flat array matches the FlatCategory shape expected
-- by buildCategoryHierarchy() in features/prompt-builtins/utils/menuHierarchy.ts:
--
--   { category: { id, placement_type, parent_category_id, label, ... , enabled_contexts },
--     items: [ { type, id, label, prompt_builtin, scope_mappings, ... } ] }
--
-- Consumed by:
--   • get_ssr_shell_data() RPC (server-side hydration)
--   • useUnifiedContextMenu() hook (client-side fallback)
--   • NoteAiMenu component (AI actions submenu)
-- ============================================================

CREATE OR REPLACE VIEW public.context_menu_unified_view AS
WITH category_items AS (
  -- Aggregate prompt_shortcuts + prompt_builtins per category
  SELECT
    sc.id AS category_id,
    sc.placement_type,
    COALESCE(
      json_agg(
        json_build_object(
          'type', 'prompt_shortcut',
          'id', ps.id,
          'label', ps.label,
          'description', ps.description,
          'icon_name', ps.icon_name,
          'sort_order', ps.sort_order,
          'keyboard_shortcut', ps.keyboard_shortcut,
          'scope_mappings', ps.scope_mappings,
          'available_scopes', ps.available_scopes,
          'result_display', ps.result_display,
          'auto_run', ps.auto_run,
          'allow_chat', ps.allow_chat,
          'show_variables', ps.show_variables,
          'apply_variables', ps.apply_variables,
          'prompt_builtin_id', ps.prompt_builtin_id,
          'prompt_builtin', CASE
            WHEN pb.id IS NOT NULL THEN json_build_object(
              'id', pb.id,
              'name', pb.name,
              'description', pb.description,
              'messages', pb.messages,
              'variableDefaults', pb.variable_defaults,
              'tools', pb.tools,
              'settings', pb.settings,
              'is_active', pb.is_active,
              'source_prompt_id', pb.source_prompt_id,
              'source_prompt_snapshot_at', pb.source_prompt_snapshot_at
            )
            ELSE NULL
          END,
          'enabled_contexts', ps.enabled_contexts
        )
        ORDER BY ps.sort_order
      ) FILTER (WHERE ps.id IS NOT NULL),
      '[]'::json
    ) AS shortcut_items
  FROM public.shortcut_categories sc
  LEFT JOIN public.prompt_shortcuts ps
    ON ps.category_id = sc.id
    AND ps.is_active = TRUE
  LEFT JOIN public.prompt_builtins pb
    ON pb.id = ps.prompt_builtin_id
    AND pb.is_active = TRUE
  WHERE sc.is_active = TRUE
  GROUP BY sc.id, sc.placement_type
),
content_block_items AS (
  -- Aggregate content_blocks per category (if table exists)
  SELECT
    sc.id AS category_id,
    sc.placement_type,
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
          'block_id', cb.block_id
        )
        ORDER BY cb.sort_order
      ) FILTER (WHERE cb.id IS NOT NULL),
      '[]'::json
    ) AS block_items
  FROM public.shortcut_categories sc
  LEFT JOIN public.content_blocks cb
    ON cb.category_id = sc.id
    AND cb.is_active = TRUE
  WHERE sc.is_active = TRUE
  GROUP BY sc.id, sc.placement_type
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
        'enabled_contexts', sc.enabled_contexts
      ),
      'items', (
        -- Merge shortcut items and content block items into a single array
        SELECT COALESCE(
          json_agg(elem ORDER BY (elem->>'sort_order')::int),
          '[]'::json
        )
        FROM (
          SELECT json_array_elements(ci.shortcut_items) AS elem
          WHERE ci.shortcut_items::text != '[]'
          UNION ALL
          SELECT json_array_elements(cbi.block_items) AS elem
          WHERE cbi.block_items::text != '[]'
        ) combined
      )
    )
    ORDER BY sc.sort_order
  ) AS categories_flat
FROM public.shortcut_categories sc
LEFT JOIN category_items ci ON ci.category_id = sc.id
LEFT JOIN content_block_items cbi ON cbi.category_id = sc.id
WHERE sc.is_active = TRUE
GROUP BY sc.placement_type;

-- Grant access
GRANT SELECT ON public.context_menu_unified_view TO authenticated;
GRANT SELECT ON public.context_menu_unified_view TO anon;

COMMENT ON VIEW public.context_menu_unified_view IS
'Pre-aggregated context menu data grouped by placement_type. Each row has a
categories_flat JSON array of {category, items} objects ready for client-side
buildCategoryHierarchy(). Used by SSR RPC, useUnifiedContextMenu hook, and NoteAiMenu.';

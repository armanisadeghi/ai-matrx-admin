-- Fix the context_menu_unified_view to match expected TypeScript structure
-- 1. Structure: { category: {...}, items: [...] }
-- 2. Include BOTH shortcuts AND content_blocks in items array

DROP VIEW IF EXISTS public.context_menu_unified_view;

CREATE OR REPLACE VIEW public.context_menu_unified_view AS
SELECT 
  sc.placement_type,
  jsonb_agg(
    jsonb_build_object(
      'category', jsonb_build_object(
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
      'items', COALESCE(
        (
          -- Combine shortcuts and content blocks into one array
          SELECT jsonb_agg(item ORDER BY sort_order)
          FROM (
            -- Shortcuts
            SELECT 
              ps.sort_order,
              jsonb_build_object(
                'id', ps.id,
                'type', 'prompt_shortcut',
                'label', ps.label,
                'description', ps.description,
                'icon_name', ps.icon_name,
                'keyboard_shortcut', ps.keyboard_shortcut,
                'sort_order', ps.sort_order,
                'scope_mappings', ps.scope_mappings,
                'available_scopes', ps.available_scopes,
                'result_display', ps.result_display,
                'auto_run', ps.auto_run,
                'allow_chat', ps.allow_chat,
                'show_variables', ps.show_variables,
                'apply_variables', ps.apply_variables,
                'enabled_contexts', ps.enabled_contexts,
                'prompt_builtin_id', ps.prompt_builtin_id,
                'prompt_builtin', CASE 
                  WHEN pb.id IS NOT NULL THEN jsonb_build_object(
                    'id', pb.id,
                    'name', pb.name,
                    'description', pb.description,
                    'messages', pb.messages,
                    'variableDefaults', pb.variable_defaults,
                    'settings', pb.settings,
                    'tools', pb.tools
                  )
                  ELSE NULL
                END
              ) as item
            FROM prompt_shortcuts ps
            LEFT JOIN prompt_builtins pb ON ps.prompt_builtin_id = pb.id
            WHERE ps.category_id = sc.id
              AND ps.is_active = TRUE
            
            UNION ALL
            
            -- Content Blocks
            SELECT 
              cb.sort_order,
              jsonb_build_object(
                'id', cb.id,
                'type', 'content_block',
                'label', cb.label,
                'description', cb.description,
                'icon_name', cb.icon_name,
                'sort_order', cb.sort_order,
                'template', cb.template,
                'block_id', cb.block_id
              ) as item
            FROM content_blocks cb
            WHERE cb.category_id = sc.id
              AND cb.is_active = TRUE
          ) combined_items
        ),
        '[]'::jsonb
      )
    )
    ORDER BY sc.sort_order
  ) AS categories_flat
FROM shortcut_categories sc
WHERE sc.is_active = TRUE
GROUP BY sc.placement_type;

GRANT SELECT ON public.context_menu_unified_view TO authenticated;

COMMENT ON VIEW public.context_menu_unified_view IS 
'Unified view that aggregates shortcuts AND content blocks by placement type. Returns: { category: {...}, items: [shortcuts + content_blocks] }. Used by UnifiedContextMenu.';


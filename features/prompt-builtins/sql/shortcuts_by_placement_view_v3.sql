-- =====================================================
-- SHORTCUTS BY PLACEMENT VIEW (V3 - Boolean Execution Config)
-- =====================================================
-- Optimized view with new boolean-based execution configuration
-- Direct client access - no API route needed!

-- Drop old view
DROP VIEW IF EXISTS public.shortcuts_by_placement_view;

-- Create new view with updated execution config
CREATE OR REPLACE VIEW public.shortcuts_by_placement_view AS
SELECT 
  -- Shortcut fields
  ps.id AS shortcut_id,
  ps.created_at AS shortcut_created_at,
  ps.updated_at AS shortcut_updated_at,
  ps.prompt_builtin_id,
  ps.label AS shortcut_label,
  ps.description AS shortcut_description,
  ps.icon_name AS shortcut_icon,
  ps.keyboard_shortcut,
  ps.sort_order AS shortcut_sort_order,
  ps.scope_mappings,
  ps.available_scopes,
  ps.is_active AS shortcut_is_active,
  
  -- Execution configuration (NEW BOOLEAN SYSTEM!)
  ps.result_display,
  ps.auto_run,
  ps.allow_chat,
  ps.show_variables,
  ps.apply_variables,
  
  -- Category fields
  sc.id AS category_id,
  sc.placement_type,
  sc.parent_category_id,
  sc.label AS category_label,
  sc.description AS category_description,
  sc.icon_name AS category_icon,
  sc.color AS category_color,
  sc.sort_order AS category_sort_order,
  sc.is_active AS category_is_active,
  sc.metadata AS category_metadata,
  
  -- Prompt Builtin fields (for execution)
  pb.id AS builtin_id,
  pb.name AS builtin_name,
  pb.description AS builtin_description,
  pb.messages AS builtin_messages,
  pb.variable_defaults AS builtin_variable_defaults,
  pb.tools AS builtin_tools,
  pb.settings AS builtin_settings,
  pb.is_active AS builtin_is_active,
  pb.source_prompt_id,
  pb.source_prompt_snapshot_at

FROM prompt_shortcuts ps
INNER JOIN shortcut_categories sc ON ps.category_id = sc.id
LEFT JOIN prompt_builtins pb ON ps.prompt_builtin_id = pb.id

WHERE ps.is_active = TRUE
  AND sc.is_active = TRUE

ORDER BY 
  sc.placement_type,
  sc.sort_order,
  ps.sort_order;

-- Grant access to authenticated users
GRANT SELECT ON public.shortcuts_by_placement_view TO authenticated;

COMMENT ON VIEW public.shortcuts_by_placement_view IS 
'Optimized view for loading shortcuts by placement type with boolean-based execution configuration. Used by UnifiedContextMenu and other placement-specific components. Direct client access - no API route needed.';


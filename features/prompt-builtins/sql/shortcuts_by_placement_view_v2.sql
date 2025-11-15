-- =====================================================
-- SHORTCUTS BY PLACEMENT VIEW (V2 - with execution config)
-- =====================================================
-- Optimized view for loading shortcuts grouped by placement type
-- Includes execution configuration (context, modal_mode, etc.)
-- Direct client access - no API route needed!

-- Drop old view if exists
DROP VIEW IF EXISTS public.shortcuts_by_placement_view;

-- Create new view with execution config
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
  
  -- Execution configuration (NEW!)
  ps.execution_context,
  ps.modal_mode,
  ps.allow_chat,
  ps.allow_initial_message,
  
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

-- =====================================================
-- OPTIMIZING INDEX (if not already exists)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_placement_covering
ON public.prompt_shortcuts (category_id, is_active, sort_order)
INCLUDE (
  id, 
  prompt_builtin_id, 
  label, 
  description, 
  icon_name, 
  keyboard_shortcut, 
  scope_mappings, 
  available_scopes,
  execution_context,
  modal_mode,
  allow_chat,
  allow_initial_message
)
WHERE is_active = TRUE;

COMMENT ON VIEW public.shortcuts_by_placement_view IS 
'Optimized view for loading shortcuts by placement type with execution configuration. Used by UnifiedContextMenu and other placement-specific components. Direct client access - no API route needed.';


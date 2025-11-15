-- =====================================================
-- UNIFIED CONTEXT MENU VIEW
-- =====================================================
-- Fetches ALL menu items for the context menu in a single query:
-- 1. Prompt Shortcuts (AI Actions, Organization Tools, User Tools)
-- 2. Content Blocks (separate table, separate system)
-- 
-- Both systems share the same shortcut_categories table!

DROP VIEW IF EXISTS public.unified_context_menu_view;

CREATE OR REPLACE VIEW public.unified_context_menu_view AS

-- =====================================================
-- PART 1: PROMPT SHORTCUTS (AI Actions, Org Tools, User Tools)
-- =====================================================
SELECT 
  'prompt_shortcut' AS item_type,
  
  -- Shortcut fields
  ps.id AS item_id,
  ps.created_at,
  ps.updated_at,
  ps.label,
  ps.description,
  ps.icon_name,
  ps.sort_order,
  ps.is_active,
  
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
  
  -- Prompt Shortcut specific fields
  ps.prompt_builtin_id,
  ps.keyboard_shortcut,
  ps.scope_mappings,
  ps.available_scopes,
  ps.result_display,
  ps.auto_run,
  ps.allow_chat,
  ps.show_variables,
  ps.apply_variables,
  
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
  pb.source_prompt_snapshot_at,
  
  -- Content Block specific fields (NULL for shortcuts)
  NULL::text AS template,
  NULL::character varying AS block_id

FROM prompt_shortcuts ps
INNER JOIN shortcut_categories sc ON ps.category_id = sc.id
LEFT JOIN prompt_builtins pb ON ps.prompt_builtin_id = pb.id

WHERE ps.is_active = TRUE
  AND sc.is_active = TRUE

UNION ALL

-- =====================================================
-- PART 2: CONTENT BLOCKS (separate system!)
-- =====================================================
SELECT 
  'content_block' AS item_type,
  
  -- Content Block fields mapped to common structure
  cb.id AS item_id,
  cb.created_at,
  cb.updated_at,
  cb.label,
  cb.description,
  cb.icon_name,
  cb.sort_order,
  cb.is_active,
  
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
  
  -- Prompt Shortcut specific fields (NULL for content blocks)
  NULL::uuid AS prompt_builtin_id,
  NULL::text AS keyboard_shortcut,
  NULL::jsonb AS scope_mappings,
  NULL::text[] AS available_scopes,
  NULL::text AS result_display,
  NULL::boolean AS auto_run,
  NULL::boolean AS allow_chat,
  NULL::boolean AS show_variables,
  NULL::boolean AS apply_variables,
  
  -- Prompt Builtin fields (NULL for content blocks)
  NULL::uuid AS builtin_id,
  NULL::character varying AS builtin_name,
  NULL::text AS builtin_description,
  NULL::jsonb AS builtin_messages,
  NULL::jsonb AS builtin_variable_defaults,
  NULL::jsonb AS builtin_tools,
  NULL::jsonb AS builtin_settings,
  NULL::boolean AS builtin_is_active,
  NULL::uuid AS source_prompt_id,
  NULL::timestamp with time zone AS source_prompt_snapshot_at,
  
  -- Content Block specific fields
  cb.template,
  cb.block_id

FROM content_blocks cb
INNER JOIN shortcut_categories sc ON cb.category_id = sc.id

WHERE cb.is_active = TRUE
  AND sc.is_active = TRUE

-- Order by placement type, category sort order, then item sort order
ORDER BY 
  placement_type,
  category_sort_order,
  sort_order;

-- Grant access to authenticated users
GRANT SELECT ON public.unified_context_menu_view TO authenticated;

-- =====================================================
-- OPTIMIZING INDEXES (if not already exists)
-- =====================================================

-- For prompt_shortcuts
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_unified_covering
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
  result_display,
  auto_run,
  allow_chat,
  show_variables,
  apply_variables,
  created_at,
  updated_at
)
WHERE is_active = TRUE;

-- For content_blocks
CREATE INDEX IF NOT EXISTS idx_content_blocks_unified_covering
ON public.content_blocks (category_id, is_active, sort_order)
INCLUDE (
  id,
  block_id,
  label,
  description,
  icon_name,
  template,
  created_at,
  updated_at
)
WHERE is_active = TRUE;

-- For shortcut_categories (shared by both)
CREATE INDEX IF NOT EXISTS idx_shortcut_categories_unified_covering
ON public.shortcut_categories (placement_type, is_active, sort_order)
INCLUDE (
  id,
  parent_category_id,
  label,
  description,
  icon_name,
  color,
  metadata
)
WHERE is_active = TRUE;

COMMENT ON VIEW public.unified_context_menu_view IS 
'Unified view that fetches BOTH prompt shortcuts AND content blocks for the context menu. Use item_type to distinguish between them. Returns all active items grouped by placement_type.';


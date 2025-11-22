-- =====================================================
-- CODE EDITOR CONTEXT MENU MIGRATION
-- =====================================================
-- Part 1: Add enabled_contexts column to tables
-- Part 2: Create context_menu_unified_view
-- Part 3: Set default values for Code Operations

-- =====================================================
-- PART 1: Add enabled_contexts Column
-- =====================================================

-- Add enabled_contexts to shortcut_categories table
-- JSONB array of context names where this category should appear
-- Examples: ["general"], ["code-editor"], ["general", "code-editor", "note-editor"]
ALTER TABLE shortcut_categories 
ADD COLUMN IF NOT EXISTS enabled_contexts JSONB DEFAULT '["general"]'::jsonb;

-- Add enabled_contexts to prompt_shortcuts table
-- Same format as categories
ALTER TABLE prompt_shortcuts 
ADD COLUMN IF NOT EXISTS enabled_contexts JSONB DEFAULT '["general"]'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN shortcut_categories.enabled_contexts IS 
'JSONB array of context names where this category should appear. Examples: ["general"], ["code-editor"], ["note-editor"]';

COMMENT ON COLUMN prompt_shortcuts.enabled_contexts IS 
'JSONB array of context names where this shortcut should appear. Inherits from category by default, but can be overridden.';

-- =====================================================
-- PART 2: Create context_menu_unified_view
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.context_menu_unified_view;

-- Create the unified view that groups all shortcuts by placement type and category
CREATE OR REPLACE VIEW public.context_menu_unified_view AS
SELECT 
  sc.placement_type,
  jsonb_agg(
    jsonb_build_object(
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
      'enabled_contexts', sc.enabled_contexts,
      'items', COALESCE(
        (
          SELECT jsonb_agg(
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
            )
            ORDER BY ps.sort_order
          )
          FROM prompt_shortcuts ps
          LEFT JOIN prompt_builtins pb ON ps.prompt_builtin_id = pb.id
          WHERE ps.category_id = sc.id
            AND ps.is_active = TRUE
        ),
        '[]'::jsonb
      )
    )
    ORDER BY sc.sort_order
  ) AS categories_flat
FROM shortcut_categories sc
WHERE sc.is_active = TRUE
GROUP BY sc.placement_type;

-- Grant access to authenticated users
GRANT SELECT ON public.context_menu_unified_view TO authenticated;

COMMENT ON VIEW public.context_menu_unified_view IS 
'Unified view that aggregates all shortcuts and categories by placement type. Returns a flat array of categories with their items. Used by UnifiedContextMenu component. Includes enabled_contexts for filtering by context (e.g., code-editor, note-editor).';

-- =====================================================
-- PART 3: Set Default enabled_contexts Values
-- =====================================================

-- Set Code Operations category to appear in both general and code-editor contexts
UPDATE shortcut_categories
SET enabled_contexts = '["general", "code-editor"]'::jsonb
WHERE id = 'aab76f2f-e2a6-403e-8a33-f592a6fe538d' -- Code Operations
  OR id = '6eab5e60-c84b-4ca9-a1cd-876a5bf226db'; -- Write Code subcategory

-- Set Text Operations to appear in all contexts (code-editor, note-editor, general)
UPDATE shortcut_categories
SET enabled_contexts = '["general", "code-editor", "note-editor"]'::jsonb
WHERE id = '26985d40-8315-48af-8bf3-959e512c5173' -- Text Operations
  OR id = 'cf5aedb5-95d6-480a-a8ac-88b762230d90' -- Formatting
  OR id = 'f69b5dfe-5de5-4d94-a43d-1ab93355d8f9'; -- Text Tools

-- Set Organization and Personal tools to appear everywhere
UPDATE shortcut_categories
SET enabled_contexts = '["general", "code-editor", "note-editor"]'::jsonb
WHERE id = 'c3e94ce0-a3c4-4161-ae89-1d089d096951' -- My Organizations
  OR id = 'd99b80b8-47f6-4a1c-b7a9-daa76cd04a47'; -- My Personal

-- CRITICAL: Also update the shortcuts themselves
-- Set enabled_contexts for all shortcuts in Code Operations category
UPDATE prompt_shortcuts
SET enabled_contexts = '["general", "code-editor"]'::jsonb
WHERE category_id IN (
  'aab76f2f-e2a6-403e-8a33-f592a6fe538d', -- Code Operations
  '6eab5e60-c84b-4ca9-a1cd-876a5bf226db'  -- Write Code
);

-- Set enabled_contexts for all shortcuts in Text Operations categories
UPDATE prompt_shortcuts
SET enabled_contexts = '["general", "code-editor", "note-editor"]'::jsonb
WHERE category_id IN (
  '26985d40-8315-48af-8bf3-959e512c5173', -- Text Operations
  'cf5aedb5-95d6-480a-a8ac-88b762230d90', -- Formatting
  'f69b5dfe-5de5-4d94-a43d-1ab93355d8f9'  -- Text Tools
);

-- Set enabled_contexts for shortcuts in Organization and Personal categories
UPDATE prompt_shortcuts
SET enabled_contexts = '["general", "code-editor", "note-editor"]'::jsonb
WHERE category_id IN (
  'c3e94ce0-a3c4-4161-ae89-1d089d096951', -- My Organizations
  'd99b80b8-47f6-4a1c-b7a9-daa76cd04a47'  -- My Personal
);

-- All other shortcuts/categories default to ["general"] which is already set

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the view works
-- SELECT * FROM context_menu_unified_view WHERE placement_type = 'ai-action';

-- Verify enabled_contexts were set
-- SELECT id, label, enabled_contexts FROM shortcut_categories WHERE enabled_contexts @> '["code-editor"]'::jsonb;

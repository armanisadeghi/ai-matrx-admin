-- Quick test script to verify context menu data loads correctly for code editor
-- Run this to ensure Code Operations and related categories appear

-- 1. Check that enabled_contexts column exists
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'shortcut_categories' 
  AND column_name = 'enabled_contexts';

-- 2. Verify Code Operations category has correct enabled_contexts
SELECT 
  id,
  label,
  placement_type,
  enabled_contexts,
  is_active
FROM shortcut_categories
WHERE enabled_contexts @> '["code-editor"]'::jsonb
ORDER BY sort_order;

-- 3. Test the unified view
SELECT 
  placement_type,
  jsonb_array_length(categories_flat) as category_count
FROM context_menu_unified_view;

-- 4. Get detailed view of ai-action placement for code editor
SELECT 
  placement_type,
  jsonb_pretty(categories_flat) as categories
FROM context_menu_unified_view
WHERE placement_type = 'ai-action';

-- 5. List all shortcuts in Code Operations category
SELECT 
  ps.id,
  ps.label,
  ps.enabled_contexts,
  ps.is_active,
  sc.label as category_label
FROM prompt_shortcuts ps
JOIN shortcut_categories sc ON ps.category_id = sc.id
WHERE sc.id = 'aab76f2f-e2a6-403e-8a33-f592a6fe538d' -- Code Operations
   OR sc.id = '6eab5e60-c84b-4ca9-a1cd-876a5bf226db'  -- Write Code
ORDER BY ps.sort_order;

-- Expected results:
-- 1. enabled_contexts column should exist with type jsonb
-- 2. Should show Code Operations, Text Operations, My Organizations, My Personal categories
-- 3. Should show counts for each placement type
-- 4. Should show full JSON structure for ai-action placement
-- 5. Should list all shortcuts under Code Operations

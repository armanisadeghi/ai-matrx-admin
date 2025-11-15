-- ============================================================================
-- CONTENT BLOCKS CATEGORY MIGRATION
-- Migrate from category_configs/subcategory_configs to shortcut_categories
-- ============================================================================
-- 
-- PURPOSE: Migrate legacy content block categories to unified shortcut_categories system
-- SAFETY: Can be rolled back - does NOT modify existing tables
-- CREATES: New entries in shortcut_categories with placement_type='content-block'
--
-- PREREQUISITES:
-- 1. shortcut_categories table exists
-- 2. category_configs table has data
-- 3. subcategory_configs table has data (optional)
-- 4. Backup created
--
-- USAGE:
-- Run this in a transaction so it can be rolled back if needed:
--   BEGIN;
--   \i migrations/migrate_content_block_categories.sql
--   -- Review results, then either:
--   COMMIT;   -- To keep changes
--   ROLLBACK; -- To undo
-- ============================================================================

-- Safety check: Ensure we're not re-running this migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM shortcut_categories 
    WHERE placement_type = 'content-block' 
    AND metadata->>'migrated_from' = 'category_configs'
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Migration already run! shortcut_categories already contains migrated content-block categories.';
  END IF;
END $$;

-- ============================================================================
-- STEP 1: Create temporary mapping table
-- ============================================================================

CREATE TEMPORARY TABLE IF NOT EXISTS category_migration_map (
  old_category_id VARCHAR(50) PRIMARY KEY,
  new_category_uuid UUID NOT NULL,
  old_subcategory_id VARCHAR(50),
  new_subcategory_uuid UUID,
  UNIQUE(old_category_id, old_subcategory_id)
);

-- ============================================================================
-- STEP 2: Migrate top-level categories
-- ============================================================================

INSERT INTO public.shortcut_categories (
  id,
  placement_type,
  parent_category_id,
  label,
  description,
  icon_name,
  color,
  sort_order,
  is_active,
  metadata
)
SELECT
  gen_random_uuid() as id,
  'content-block' as placement_type,
  NULL as parent_category_id, -- Top level
  cc.label,
  NULL as description, -- Old system didn't have description field
  COALESCE(cc.icon_name, 'FileText') as icon_name,
  COALESCE(cc.color, 'zinc') as color,
  COALESCE(cc.sort_order, 999) as sort_order,
  COALESCE(cc.is_active, true) as is_active,
  jsonb_build_object(
    'migrated_from', 'category_configs',
    'original_category_id', cc.category_id,
    'original_db_id', cc.id::text,
    'migrated_at', NOW()::text,
    'migration_version', '1.0'
  ) as metadata
FROM public.category_configs cc
WHERE cc.is_active = true
ON CONFLICT DO NOTHING;

-- Log categories migrated
DO $$
DECLARE
  category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count
  FROM public.shortcut_categories
  WHERE placement_type = 'content-block'
  AND parent_category_id IS NULL;
  
  RAISE NOTICE '✓ Migrated % top-level categories', category_count;
END $$;

-- ============================================================================
-- STEP 3: Save mapping of old category_id to new UUID
-- ============================================================================

INSERT INTO category_migration_map (old_category_id, new_category_uuid)
SELECT 
  cc.category_id,
  sc.id
FROM public.category_configs cc
JOIN public.shortcut_categories sc 
  ON sc.metadata->>'original_category_id' = cc.category_id
WHERE sc.placement_type = 'content-block'
AND sc.parent_category_id IS NULL
ON CONFLICT (old_category_id) DO NOTHING;

-- Log mapping entries
DO $$
DECLARE
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM category_migration_map;
  RAISE NOTICE '✓ Created % category mapping entries', mapping_count;
END $$;

-- ============================================================================
-- STEP 4: Migrate subcategories as child categories
-- ============================================================================

INSERT INTO public.shortcut_categories (
  id,
  placement_type,
  parent_category_id,
  label,
  description,
  icon_name,
  color,
  sort_order,
  is_active,
  metadata
)
SELECT
  gen_random_uuid() as id,
  'content-block' as placement_type,
  cmm.new_category_uuid as parent_category_id, -- Link to parent
  sc.label,
  NULL as description,
  COALESCE(sc.icon_name, 'FolderOpen') as icon_name,
  parent.color as color, -- Inherit parent color
  COALESCE(sc.sort_order, 999) as sort_order,
  COALESCE(sc.is_active, true) as is_active,
  jsonb_build_object(
    'migrated_from', 'subcategory_configs',
    'original_category_id', sc.category_id,
    'original_subcategory_id', sc.subcategory_id,
    'original_db_id', sc.id::text,
    'migrated_at', NOW()::text,
    'migration_version', '1.0'
  ) as metadata
FROM public.subcategory_configs sc
JOIN category_migration_map cmm ON cmm.old_category_id = sc.category_id
JOIN public.shortcut_categories parent ON parent.id = cmm.new_category_uuid
WHERE sc.is_active = true
ON CONFLICT DO NOTHING;

-- Log subcategories migrated
DO $$
DECLARE
  subcategory_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subcategory_count
  FROM public.shortcut_categories
  WHERE placement_type = 'content-block'
  AND parent_category_id IS NOT NULL;
  
  RAISE NOTICE '✓ Migrated % subcategories', subcategory_count;
END $$;

-- ============================================================================
-- STEP 5: Update mapping with subcategory UUIDs
-- ============================================================================

INSERT INTO category_migration_map (old_category_id, old_subcategory_id, new_category_uuid, new_subcategory_uuid)
SELECT
  sc_old.category_id,
  sc_old.subcategory_id,
  cmm.new_category_uuid,
  sc_new.id
FROM public.subcategory_configs sc_old
JOIN category_migration_map cmm ON cmm.old_category_id = sc_old.category_id
JOIN public.shortcut_categories sc_new ON 
  sc_new.metadata->>'original_subcategory_id' = sc_old.subcategory_id
  AND sc_new.metadata->>'original_category_id' = sc_old.category_id
  AND sc_new.parent_category_id = cmm.new_category_uuid
ON CONFLICT (old_category_id, old_subcategory_id) DO UPDATE
SET 
  old_subcategory_id = EXCLUDED.old_subcategory_id,
  new_subcategory_uuid = EXCLUDED.new_subcategory_uuid;

-- ============================================================================
-- STEP 6: Verification Queries
-- ============================================================================

-- Display migration summary
DO $$
DECLARE
  top_level_count INTEGER;
  subcategory_count INTEGER;
  total_count INTEGER;
  mapping_entries INTEGER;
BEGIN
  -- Count top-level categories
  SELECT COUNT(*) INTO top_level_count
  FROM public.shortcut_categories
  WHERE placement_type = 'content-block'
  AND parent_category_id IS NULL;
  
  -- Count subcategories
  SELECT COUNT(*) INTO subcategory_count
  FROM public.shortcut_categories
  WHERE placement_type = 'content-block'
  AND parent_category_id IS NOT NULL;
  
  -- Total
  total_count := top_level_count + subcategory_count;
  
  -- Mapping entries
  SELECT COUNT(*) INTO mapping_entries FROM category_migration_map;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'Top-level categories:  %', top_level_count;
  RAISE NOTICE 'Subcategories:         %', subcategory_count;
  RAISE NOTICE 'Total migrated:        %', total_count;
  RAISE NOTICE 'Mapping entries:       %', mapping_entries;
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Display category hierarchy
SELECT 
  '════════════════════════════════════════════════════' as "CATEGORY HIERARCHY";

WITH RECURSIVE category_tree AS (
  -- Base case: top-level categories
  SELECT
    id,
    label,
    icon_name,
    color,
    sort_order,
    0 as depth,
    ARRAY[sort_order] as sort_path,
    metadata->>'original_category_id' as old_cat_id,
    metadata->>'original_subcategory_id' as old_subcat_id
  FROM shortcut_categories
  WHERE placement_type = 'content-block'
  AND parent_category_id IS NULL
  
  UNION ALL
  
  -- Recursive case: subcategories
  SELECT
    sc.id,
    sc.label,
    sc.icon_name,
    sc.color,
    sc.sort_order,
    ct.depth + 1,
    ct.sort_path || sc.sort_order,
    sc.metadata->>'original_category_id',
    sc.metadata->>'original_subcategory_id'
  FROM shortcut_categories sc
  JOIN category_tree ct ON sc.parent_category_id = ct.id
  WHERE sc.placement_type = 'content-block'
)
SELECT
  REPEAT('  ', depth) || label as "Category Hierarchy",
  icon_name as "Icon",
  color as "Color",
  CASE 
    WHEN old_subcat_id IS NOT NULL 
    THEN old_cat_id || ' > ' || old_subcat_id
    ELSE old_cat_id
  END as "Original ID"
FROM category_tree
ORDER BY sort_path;

-- Display mapping table
SELECT 
  '════════════════════════════════════════════════════' as "MIGRATION MAPPING";

SELECT
  old_category_id as "Old Category ID",
  old_subcategory_id as "Old Subcategory ID",
  new_category_uuid::text as "New UUID",
  new_subcategory_uuid::text as "New Sub-UUID"
FROM category_migration_map
ORDER BY old_category_id, old_subcategory_id NULLS FIRST;

-- ============================================================================
-- STEP 7: Validation Checks
-- ============================================================================

-- Check for any orphaned records or issues
DO $$
DECLARE
  orphan_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Check for orphaned subcategories (parent doesn't exist)
  SELECT COUNT(*) INTO orphan_count
  FROM public.shortcut_categories sc
  WHERE sc.placement_type = 'content-block'
  AND sc.parent_category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shortcut_categories parent
    WHERE parent.id = sc.parent_category_id
  );
  
  IF orphan_count > 0 THEN
    RAISE WARNING '⚠ Found % orphaned subcategories', orphan_count;
  ELSE
    RAISE NOTICE '✓ No orphaned subcategories';
  END IF;
  
  -- Check for duplicate labels at same level
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT 
      COALESCE(parent_category_id::text, 'root') as parent_level,
      label,
      COUNT(*) as cnt
    FROM public.shortcut_categories
    WHERE placement_type = 'content-block'
    GROUP BY parent_category_id, label
    HAVING COUNT(*) > 1
  ) dups;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠ Found % duplicate labels at same level', duplicate_count;
  ELSE
    RAISE NOTICE '✓ No duplicate labels';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION COMPLETE';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the results above. If everything looks correct:';
  RAISE NOTICE '  → Type: COMMIT;';
  RAISE NOTICE '';
  RAISE NOTICE 'If you want to undo this migration:';
  RAISE NOTICE '  → Type: ROLLBACK;';
  RAISE NOTICE '';
  RAISE NOTICE 'The mapping table will be lost if you close this session.';
  RAISE NOTICE 'Consider copying it to a permanent table if needed:';
  RAISE NOTICE '  → CREATE TABLE category_migration_map_permanent AS';
  RAISE NOTICE '    SELECT * FROM category_migration_map;';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- Optional: Save mapping permanently (uncomment if desired)
-- ============================================================================

-- CREATE TABLE IF NOT EXISTS public.category_migration_map_permanent (
--   old_category_id VARCHAR(50),
--   new_category_uuid UUID NOT NULL,
--   old_subcategory_id VARCHAR(50),
--   new_subcategory_uuid UUID,
--   migrated_at TIMESTAMPTZ DEFAULT NOW(),
--   PRIMARY KEY (old_category_id, COALESCE(old_subcategory_id, ''))
-- );
-- 
-- INSERT INTO public.category_migration_map_permanent
-- SELECT *, NOW() as migrated_at
-- FROM category_migration_map
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================


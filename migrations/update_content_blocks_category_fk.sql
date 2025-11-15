-- ============================================================================
-- UPDATE CONTENT BLOCKS TO USE UNIFIED CATEGORIES
-- Populate category_id FK based on old string-based category/subcategory
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Update content blocks that have BOTH category AND subcategory
-- These should link to the CHILD category (subcategory in new system)
-- ============================================================================

UPDATE public.content_blocks cb
SET category_id = sc.id
FROM public.shortcut_categories sc
WHERE cb.subcategory IS NOT NULL
AND cb.subcategory != ''
AND sc.placement_type = 'content-block'
AND sc.metadata->>'original_subcategory_id' = cb.subcategory
AND sc.metadata->>'original_category_id' = cb.category
AND cb.category_id IS NULL; -- Only update if not already set

-- Log count
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.content_blocks
  WHERE category_id IS NOT NULL
  AND subcategory IS NOT NULL;
  
  RAISE NOTICE '✓ Updated % blocks with subcategories', updated_count;
END $$;

-- ============================================================================
-- STEP 2: Update content blocks that ONLY have category (no subcategory)
-- These should link to the PARENT category
-- ============================================================================

UPDATE public.content_blocks cb
SET category_id = sc.id
FROM public.shortcut_categories sc
WHERE (cb.subcategory IS NULL OR cb.subcategory = '')
AND sc.placement_type = 'content-block'
AND sc.parent_category_id IS NULL -- Top-level category
AND sc.metadata->>'original_category_id' = cb.category
AND cb.category_id IS NULL; -- Only update if not already set

-- Log count
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.content_blocks
  WHERE category_id IS NOT NULL
  AND (subcategory IS NULL OR subcategory = '');
  
  RAISE NOTICE '✓ Updated % blocks without subcategories', updated_count;
END $$;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

-- Check for any content blocks that still don't have category_id
DO $$
DECLARE
  missing_count INTEGER;
  total_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.content_blocks
  WHERE category_id IS NULL;
  
  SELECT COUNT(*) INTO total_count
  FROM public.content_blocks;
  
  updated_count := total_count - missing_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'Total content blocks:     %', total_count;
  RAISE NOTICE 'Updated with category_id: %', updated_count;
  RAISE NOTICE 'Missing category_id:      %', missing_count;
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF missing_count > 0 THEN
    RAISE WARNING '⚠ % content blocks still missing category_id!', missing_count;
    RAISE WARNING 'Review the orphaned blocks below:';
  ELSE
    RAISE NOTICE '✓ All content blocks have been linked to unified categories';
  END IF;
END $$;

-- Show any orphaned blocks
SELECT 
  '════════════════════════════════════════════════════' as "ORPHANED BLOCKS (IF ANY)";

SELECT
  block_id,
  label,
  category as old_category,
  subcategory as old_subcategory,
  category_id
FROM public.content_blocks
WHERE category_id IS NULL
ORDER BY category, subcategory, sort_order;

-- ============================================================================
-- STEP 4: Show mapping summary
-- ============================================================================

SELECT 
  '════════════════════════════════════════════════════' as "CATEGORY MAPPING";

SELECT
  cb.category as "Old Category String",
  cb.subcategory as "Old Subcategory String",
  sc.label as "New Category Label",
  sc.id::text as "New UUID",
  COUNT(cb.id) as "# Blocks"
FROM public.content_blocks cb
JOIN public.shortcut_categories sc ON sc.id = cb.category_id
GROUP BY cb.category, cb.subcategory, sc.label, sc.id
ORDER BY cb.category, cb.subcategory NULLS FIRST;

-- ============================================================================
-- STEP 5: Final validation - check hierarchy is correct
-- ============================================================================

SELECT 
  '════════════════════════════════════════════════════' as "HIERARCHY CHECK";

WITH block_categories AS (
  SELECT DISTINCT
    cb.category_id,
    sc.label as category_label,
    sc.parent_category_id,
    parent.label as parent_label,
    sc.metadata->>'original_category_id' as orig_cat,
    sc.metadata->>'original_subcategory_id' as orig_subcat
  FROM public.content_blocks cb
  JOIN public.shortcut_categories sc ON sc.id = cb.category_id
  LEFT JOIN public.shortcut_categories parent ON parent.id = sc.parent_category_id
)
SELECT
  category_label as "Category",
  parent_label as "Parent Category",
  orig_cat as "Original Category ID",
  orig_subcat as "Original Subcategory ID"
FROM block_categories
ORDER BY parent_label NULLS FIRST, category_label;

-- ============================================================================
-- If everything looks good, COMMIT. Otherwise ROLLBACK.
-- ============================================================================

DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.content_blocks
  WHERE category_id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete! % blocks missing category_id. Review and fix before committing.', missing_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'READY TO COMMIT';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'All content blocks have been linked successfully.';
  RAISE NOTICE '';
  RAISE NOTICE 'To finalize: Type COMMIT;';
  RAISE NOTICE 'To undo:     Type ROLLBACK;';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;

-- Don't auto-commit - let user review and decide
-- COMMIT;


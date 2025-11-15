-- ============================================================================
-- Cleanup Old Content Block Category System
-- ============================================================================
-- Purpose: Remove deprecated category/subcategory string columns and drop
--          old category_configs and subcategory_configs tables
--
-- IMPORTANT: Only run this after confirming:
-- 1. ContentBlocksManager is working with new system
-- 2. Context menus display content blocks correctly
-- 3. Content block insertion works properly
-- 4. All content blocks have valid category_id values
--
-- Created: 2025-01-15
-- ============================================================================

-- Step 1: Verify all content blocks have category_id
-- (Run this first to ensure no data loss)
SELECT 
    id,
    block_id,
    label,
    category_id,
    category,
    subcategory
FROM content_blocks
WHERE category_id IS NULL;

-- If the above query returns any rows, DO NOT PROCEED!
-- Those blocks need to be manually assigned a category_id first.

-- ============================================================================
-- Step 2: Drop the deprecated string columns from content_blocks
-- ============================================================================

-- Remove old category column
ALTER TABLE content_blocks 
DROP COLUMN IF EXISTS category;

-- Remove old subcategory column  
ALTER TABLE content_blocks
DROP COLUMN IF EXISTS subcategory;

-- ============================================================================
-- Step 3: Drop old category tables
-- ============================================================================

-- Option A: Archive the old tables (RECOMMENDED)
-- This keeps the data for reference but renames the tables

ALTER TABLE IF EXISTS category_configs 
RENAME TO _archived_category_configs;

ALTER TABLE IF EXISTS subcategory_configs
RENAME TO _archived_subcategory_configs;

-- Add archived timestamp to table comments
COMMENT ON TABLE _archived_category_configs IS 'Archived on 2025-01-15 - Replaced by shortcut_categories with placement_type=''content-block''';
COMMENT ON TABLE _archived_subcategory_configs IS 'Archived on 2025-01-15 - Replaced by shortcut_categories with parent_category_id';

-- Option B: Completely drop the tables (USE WITH CAUTION)
-- Uncomment these lines only if you're absolutely certain you don't need the old data

-- DROP TABLE IF EXISTS subcategory_configs CASCADE;
-- DROP TABLE IF EXISTS category_configs CASCADE;

-- ============================================================================
-- Step 4: Verification Queries
-- ============================================================================

-- Verify content_blocks table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'content_blocks'
ORDER BY ordinal_position;

-- Verify all content blocks have categories
SELECT 
    COUNT(*) as total_blocks,
    COUNT(category_id) as blocks_with_category,
    COUNT(*) - COUNT(category_id) as blocks_without_category
FROM content_blocks;

-- Verify category distribution
SELECT 
    sc.label as category_name,
    COUNT(cb.id) as block_count
FROM content_blocks cb
JOIN shortcut_categories sc ON cb.category_id = sc.id
WHERE sc.placement_type = 'content-block'
GROUP BY sc.id, sc.label
ORDER BY sc.sort_order;

-- Verify hierarchical structure
SELECT 
    parent.label as parent_category,
    child.label as child_category,
    COUNT(cb.id) as block_count
FROM shortcut_categories parent
LEFT JOIN shortcut_categories child ON child.parent_category_id = parent.id
LEFT JOIN content_blocks cb ON cb.category_id = COALESCE(child.id, parent.id)
WHERE parent.placement_type = 'content-block'
  AND parent.parent_category_id IS NULL
GROUP BY parent.id, parent.label, parent.sort_order, child.id, child.label, child.sort_order
ORDER BY parent.sort_order, child.sort_order;

-- ============================================================================
-- Cleanup Complete
-- ============================================================================

-- Summary of changes:
-- ✓ Removed content_blocks.category column
-- ✓ Removed content_blocks.subcategory column  
-- ✓ Archived/dropped category_configs table
-- ✓ Archived/dropped subcategory_configs table
-- ✓ All content blocks now use category_id → shortcut_categories FK

SELECT 'Cleanup completed successfully!' as status;


-- ============================================================================
-- COMPREHENSIVE SYSTEM PROMPTS SCHEMA CONSOLIDATION
-- ============================================================================
-- 
-- Purpose: Consolidate system_prompts and system_prompt_functionality_configs
--          into a clean, hierarchical structure based on content_blocks pattern
--
-- Design:
-- 1. placement_type → category → subcategory → system prompt
-- 2. Placement type is stored in CATEGORY (not prompt)
-- 3. Categories can be duplicated across placement types
-- 4. Single human-readable ID per table
-- 5. Self-referencing FK for subcategories
--
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE NEW CLEAN SCHEMA
-- ============================================================================

-- Drop existing category table if it exists (we're rebuilding it)
DROP TABLE IF EXISTS system_prompt_categories_new CASCADE;

-- Create new categories table with placement_type and hierarchy support
CREATE TABLE system_prompt_categories_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,                          -- Human-readable ID (e.g., "text-operations")
  placement_type TEXT NOT NULL,                       -- Where this category appears
  parent_category_id UUID NULL,                       -- FK to self for subcategories
  label TEXT NOT NULL,                                -- Display name (e.g., "Text Operations")
  description TEXT NULL,
  icon_name TEXT NOT NULL,
  color TEXT NULL,                                    -- For UI theming
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT system_prompt_categories_new_placement_type_check CHECK (
    placement_type = ANY (ARRAY[
      'context-menu'::text,
      'card'::text,
      'button'::text,
      'modal'::text,
      'link'::text,
      'action'::text
    ])
  ),
  
  -- Same category_id can exist under different placement_types
  CONSTRAINT system_prompt_categories_new_unique_per_placement 
    UNIQUE (placement_type, category_id),
    
  -- Self-referencing FK for subcategories
  CONSTRAINT system_prompt_categories_new_parent_fkey 
    FOREIGN KEY (parent_category_id) 
    REFERENCES system_prompt_categories_new(id) 
    ON DELETE CASCADE
);

-- Indexes for categories
CREATE INDEX idx_spc_new_placement_type ON system_prompt_categories_new(placement_type);
CREATE INDEX idx_spc_new_category_id ON system_prompt_categories_new(category_id);
CREATE INDEX idx_spc_new_parent ON system_prompt_categories_new(parent_category_id);
CREATE INDEX idx_spc_new_active ON system_prompt_categories_new(is_active) WHERE is_active = true;
CREATE INDEX idx_spc_new_sort ON system_prompt_categories_new(placement_type, parent_category_id, sort_order);

-- Comments
COMMENT ON TABLE system_prompt_categories_new IS 'Hierarchical categories for system prompts. Placement type determines where they appear in the UI.';
COMMENT ON COLUMN system_prompt_categories_new.category_id IS 'Human-readable unique identifier per placement type';
COMMENT ON COLUMN system_prompt_categories_new.placement_type IS 'Determines UI placement: context-menu shows as menu sections, buttons/cards for organization';
COMMENT ON COLUMN system_prompt_categories_new.parent_category_id IS 'Self-referencing FK for subcategories. NULL = top-level category.';

-- ============================================================================

-- Drop and recreate system_prompts table with clean schema
DROP TABLE IF EXISTS system_prompts_new CASCADE;

CREATE TABLE system_prompts_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL UNIQUE,                    -- Human-readable ID (e.g., "debug-and-fix")
  category_id UUID NOT NULL,                         -- FK to system_prompt_categories_new
  label TEXT NOT NULL,                               -- Display name (e.g., "Debug & Fix")
  description TEXT NULL,                             -- What this prompt does
  icon_name TEXT NOT NULL,                           -- Icon for UI display
  
  -- Prompt execution data
  prompt_snapshot JSONB NOT NULL,                    -- Complete prompt config (messages, settings, variables, defaults)
  source_prompt_id UUID NULL,                        -- FK to prompts (for refresh capability)
  version INTEGER DEFAULT 1,                         -- Auto-incremented on updates
  
  -- Organization & display
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Publishing workflow
  status TEXT DEFAULT 'published',
  published_by UUID NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Change tracking
  last_updated_by UUID NULL,
  last_updated_at TIMESTAMPTZ NULL,
  update_notes TEXT NULL,
  
  -- Flexible storage
  tags TEXT[] DEFAULT '{}'::text[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT system_prompts_new_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])
  ),
  
  CONSTRAINT system_prompts_new_category_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES system_prompt_categories_new(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT system_prompts_new_source_prompt_fkey 
    FOREIGN KEY (source_prompt_id) 
    REFERENCES prompts(id) 
    ON DELETE SET NULL
);

-- Indexes for system_prompts
CREATE INDEX idx_sp_new_prompt_id ON system_prompts_new(prompt_id);
CREATE INDEX idx_sp_new_category_id ON system_prompts_new(category_id);
CREATE INDEX idx_sp_new_source_prompt_id ON system_prompts_new(source_prompt_id);
CREATE INDEX idx_sp_new_active ON system_prompts_new(is_active) WHERE is_active = true;
CREATE INDEX idx_sp_new_status ON system_prompts_new(status);
CREATE INDEX idx_sp_new_tags ON system_prompts_new USING gin(tags);
CREATE INDEX idx_sp_new_sort ON system_prompts_new(category_id, sort_order);
CREATE INDEX idx_sp_new_published_by ON system_prompts_new(published_by);

-- Comments
COMMENT ON TABLE system_prompts_new IS 'System prompts with complete execution configuration. Organized by hierarchical categories.';
COMMENT ON COLUMN system_prompts_new.prompt_id IS 'Human-readable unique identifier (e.g., "debug-and-fix")';
COMMENT ON COLUMN system_prompts_new.category_id IS 'FK to system_prompt_categories_new - determines placement via category';
COMMENT ON COLUMN system_prompts_new.prompt_snapshot IS 'Complete prompt configuration: {messages, settings, variables, variableDefaults, etc.}';
COMMENT ON COLUMN system_prompts_new.source_prompt_id IS 'Optional FK to prompts table - used for "refresh to latest version" capability';

-- ============================================================================
-- STEP 2: MIGRATE DATA FROM OLD TABLES
-- ============================================================================

-- Migrate categories from old system_prompt_categories
-- These become context-menu categories (the default placement)
INSERT INTO system_prompt_categories_new (
  id,
  category_id,
  placement_type,
  parent_category_id,
  label,
  description,
  icon_name,
  color,
  sort_order,
  is_active,
  created_at,
  updated_at
)
SELECT 
  id,
  category_id,
  'context-menu' AS placement_type,  -- Default to context-menu
  NULL AS parent_category_id,         -- All existing are top-level
  label,
  description,
  icon_name,
  color,
  sort_order,
  is_active,
  created_at,
  updated_at
FROM system_prompt_categories
WHERE category_id IS NOT NULL;  -- Only migrate valid entries

-- Create missing categories that are referenced in old system_prompts
-- but don't exist in system_prompt_categories
INSERT INTO system_prompt_categories_new (
  category_id,
  placement_type,
  parent_category_id,
  label,
  description,
  icon_name,
  color,
  sort_order,
  is_active
)
SELECT DISTINCT
  LOWER(REPLACE(sp.category, ' ', '-')) AS category_id,
  'context-menu' AS placement_type,
  NULL::UUID AS parent_category_id,
  sp.category AS label,
  'Auto-migrated from old system_prompts' AS description,
  'Sparkles' AS icon_name,
  NULL AS color,
  999 AS sort_order,  -- Put at end
  true AS is_active
FROM system_prompts sp
WHERE sp.category IS NOT NULL
  AND sp.system_prompt_id IS NOT NULL
  -- Only create if it doesn't already exist
  AND NOT EXISTS (
    SELECT 1 FROM system_prompt_categories_new spcn
    WHERE spcn.category_id = LOWER(REPLACE(sp.category, ' ', '-'))
  )
ON CONFLICT (placement_type, category_id) DO NOTHING;

-- Create a default "uncategorized" category as final fallback
INSERT INTO system_prompt_categories_new (
  category_id,
  placement_type,
  parent_category_id,
  label,
  description,
  icon_name,
  color,
  sort_order,
  is_active
)
VALUES (
  'uncategorized',
  'context-menu',
  NULL::UUID,
  'Uncategorized',
  'System prompts without a specific category',
  'FolderOpen',
  NULL,
  9999,
  true
)
ON CONFLICT (placement_type, category_id) DO NOTHING;

-- Migrate system prompts from old table
-- We'll match them to categories by functionality_id → category_id lookup
INSERT INTO system_prompts_new (
  id,
  prompt_id,
  category_id,
  label,
  description,
  icon_name,
  prompt_snapshot,
  source_prompt_id,
  version,
  sort_order,
  is_active,
  is_featured,
  status,
  published_by,
  published_at,
  last_updated_by,
  last_updated_at,
  update_notes,
  tags,
  metadata,
  created_at,
  updated_at
)
SELECT 
  sp.id,
  sp.system_prompt_id AS prompt_id,
  
  -- Map to new category via functionality_id lookup
  COALESCE(
    (SELECT spcn.id 
     FROM system_prompt_functionality_configs spfc
     JOIN system_prompt_categories_new spcn ON spfc.category_id = spcn.id
     WHERE spfc.functionality_id = sp.functionality_id
     LIMIT 1),
    -- Fallback: try to find by category name match
    (SELECT id FROM system_prompt_categories_new 
     WHERE category_id = LOWER(REPLACE(sp.category, ' ', '-'))
     LIMIT 1),
    -- Final fallback: use uncategorized
    (SELECT id FROM system_prompt_categories_new 
     WHERE category_id = 'uncategorized' 
     AND placement_type = 'context-menu'
     LIMIT 1)
  ) AS category_id,
  
  sp.name AS label,
  sp.description,
  
  -- Try to get icon from functionality_configs, fallback to default
  COALESCE(
    (SELECT icon_name FROM system_prompt_functionality_configs 
     WHERE functionality_id = sp.functionality_id LIMIT 1),
    'Sparkles'
  ) AS icon_name,
  
  sp.prompt_snapshot,
  sp.source_prompt_id,
  sp.version,
  sp.sort_order,
  sp.is_active,
  sp.is_featured,
  sp.status,
  sp.published_by,
  sp.published_at,
  sp.last_updated_by,
  sp.last_updated_at,
  sp.update_notes,
  sp.tags,
  
  -- Merge metadata with old display_config and placement_settings
  jsonb_build_object(
    'old_functionality_id', sp.functionality_id,
    'old_placement_type', sp.placement_type,
    'old_category', sp.category,
    'old_subcategory', sp.subcategory,
    'old_display_config', sp.display_config,
    'old_placement_settings', sp.placement_settings
  ) || COALESCE(sp.metadata, '{}'::jsonb) AS metadata,
  
  sp.created_at,
  sp.updated_at
FROM system_prompts sp
WHERE sp.system_prompt_id IS NOT NULL;

-- ============================================================================
-- STEP 3: CREATE TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_system_prompts_new_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for version increment
CREATE OR REPLACE FUNCTION increment_system_prompt_new_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.prompt_snapshot IS DISTINCT FROM NEW.prompt_snapshot THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new table
CREATE TRIGGER system_prompts_new_updated_at
  BEFORE UPDATE ON system_prompts_new
  FOR EACH ROW
  EXECUTE FUNCTION update_system_prompts_new_updated_at();

CREATE TRIGGER system_prompts_new_version_increment
  BEFORE UPDATE ON system_prompts_new
  FOR EACH ROW
  EXECUTE FUNCTION increment_system_prompt_new_version();

-- ============================================================================
-- STEP 4: UPDATE RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE system_prompt_categories_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_prompts_new ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view published system prompts)
CREATE POLICY "Anyone can read active categories"
  ON system_prompt_categories_new
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read published system prompts"
  ON system_prompts_new
  FOR SELECT
  USING (status = 'published' AND is_active = true);

-- Authenticated users can manage (for admins)
CREATE POLICY "Authenticated users can manage categories"
  ON system_prompt_categories_new
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage system prompts"
  ON system_prompts_new
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 5: CREATE HELPFUL VIEWS
-- ============================================================================

-- View that shows the full hierarchy for context menus
CREATE OR REPLACE VIEW system_prompts_context_menu_hierarchy AS
SELECT 
  c.category_id,
  c.label AS category_label,
  c.icon_name AS category_icon,
  c.color AS category_color,
  c.sort_order AS category_sort,
  sc.category_id AS subcategory_id,
  sc.label AS subcategory_label,
  sc.icon_name AS subcategory_icon,
  sc.sort_order AS subcategory_sort,
  sp.prompt_id,
  sp.label AS prompt_label,
  sp.description AS prompt_description,
  sp.icon_name AS prompt_icon,
  sp.sort_order AS prompt_sort,
  sp.is_active,
  sp.is_featured,
  sp.prompt_snapshot,
  sp.source_prompt_id
FROM system_prompt_categories_new c
LEFT JOIN system_prompt_categories_new sc ON sc.parent_category_id = c.id
LEFT JOIN system_prompts_new sp ON sp.category_id = COALESCE(sc.id, c.id)
WHERE c.placement_type = 'context-menu' 
  AND c.parent_category_id IS NULL
  AND c.is_active = true
ORDER BY c.sort_order, sc.sort_order, sp.sort_order;

COMMENT ON VIEW system_prompts_context_menu_hierarchy IS 'Hierarchical view of all context menu prompts with their categories and subcategories';

-- ============================================================================
-- STEP 6: DATA VALIDATION
-- ============================================================================

-- Check for orphaned system prompts (no category)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM system_prompts_new
  WHERE category_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE WARNING '% system prompts have NULL category_id. Check migration logic!', orphan_count;
  ELSE
    RAISE NOTICE 'All system prompts have valid categories ✓';
  END IF;
END $$;

-- Show migration summary
DO $$
DECLARE
  old_cat_count INTEGER;
  new_cat_count INTEGER;
  old_prompt_count INTEGER;
  new_prompt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_cat_count FROM system_prompt_categories;
  SELECT COUNT(*) INTO new_cat_count FROM system_prompt_categories_new;
  SELECT COUNT(*) INTO old_prompt_count FROM system_prompts;
  SELECT COUNT(*) INTO new_prompt_count FROM system_prompts_new;
  
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE 'Categories: % → %', old_cat_count, new_cat_count;
  RAISE NOTICE 'System Prompts: % → %', old_prompt_count, new_prompt_count;
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- STEP 7: RENAME TABLES (SWAP OLD AND NEW)
-- ============================================================================
-- 
-- IMPORTANT: Run this AFTER verifying data migration is correct!
-- Uncomment these lines when ready to make the switch:
--
-- ALTER TABLE system_prompt_categories RENAME TO system_prompt_categories_old_backup;
-- ALTER TABLE system_prompt_categories_new RENAME TO system_prompt_categories;
--
-- ALTER TABLE system_prompts RENAME TO system_prompts_old_backup;
-- ALTER TABLE system_prompts_new RENAME TO system_prompts;
--
-- DROP TABLE system_prompt_functionality_configs;  -- No longer needed
--
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all categories with their placement types
SELECT 
  placement_type,
  category_id,
  label,
  (SELECT COUNT(*) FROM system_prompts_new WHERE category_id = spc.id) AS prompt_count
FROM system_prompt_categories_new spc
ORDER BY placement_type, sort_order;

-- Show system prompts with their categories
SELECT 
  sp.prompt_id,
  sp.label AS prompt_label,
  c.category_id,
  c.label AS category_label,
  c.placement_type,
  sp.is_active
FROM system_prompts_new sp
JOIN system_prompt_categories_new c ON sp.category_id = c.id
ORDER BY c.placement_type, c.sort_order, sp.sort_order;


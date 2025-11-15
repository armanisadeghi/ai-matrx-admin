# Content Blocks Category Migration Plan

**Mission: Migrate from legacy category_configs/subcategory_configs to unified shortcut_categories**

**Critical Requirement**: ZERO BREAKING CHANGES to existing content blocks functionality

---

## Table of Contents

1. [Current System Inventory](#current-system-inventory)
2. [Usage Map - Every Reference](#usage-map)
3. [Data Migration Strategy](#data-migration-strategy)
4. [Code Migration Checklist](#code-migration-checklist)
5. [Testing Protocol](#testing-protocol)

---

## Current System Inventory

### Database Tables (OLD SYSTEM)

#### `category_configs`
```sql
- id (uuid, PK)
- category_id (varchar(50), unique) -- STRING-BASED ID
- label (varchar(255))
- icon_name (varchar(100))
- color (varchar(50))
- sort_order (integer, default 0)
- is_active (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Current Data:**
- 5 categories: ai-prompts, structure, formatting, special, block-components

#### `subcategory_configs`
```sql
- id (uuid, PK)
- category_id (varchar(50), FK to category_configs.category_id) -- CASCADE DELETE
- subcategory_id (varchar(50)) -- STRING-BASED ID
- label (varchar(255))
- icon_name (varchar(100))
- sort_order (integer, default 0)
- is_active (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE(category_id, subcategory_id)
```

**Current Data:**
- 9 subcategories across multiple categories (thinking, timeline, flowchart, task-list, education, research, business, audio-transcription, code-1)

#### `content_blocks`
```sql
- id (uuid, PK)
- block_id (varchar(255), unique) -- STRING-BASED ID
- label (varchar(255))
- description (text)
- icon_name (varchar(100))
- category (varchar(50)) -- STRING-BASED, references category_id
- subcategory (varchar(50), nullable) -- STRING-BASED, references subcategory_id
- template (text)
- sort_order (integer, default 0)
- is_active (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Database Tables (NEW SYSTEM)

#### `shortcut_categories`
```sql
- id (uuid, PK)
- placement_type (text) -- NEW: 'menu', 'button', 'card', 'quick-action', 'modal'
- parent_category_id (uuid, nullable, FK self-referencing) -- UUID-BASED HIERARCHY
- label (text)
- description (text, nullable)
- icon_name (text, default 'SquareMenu')
- color (text, default 'zinc')
- sort_order (integer, default 999)
- is_active (boolean, default true)
- metadata (jsonb, default {})
```

**Key Differences:**
1. ✅ Self-referencing hierarchy (parent_category_id) instead of two tables
2. ✅ UUID-based relationships instead of string-based
3. ✅ placement_type for multi-purpose categorization
4. ✅ description field for better UX
5. ✅ metadata field for extensibility

---

## Usage Map - Every Reference

### 1. TypeScript Type Definitions

**File**: `types/content-blocks-db.ts`
- ✅ `CategoryConfigDB` interface (lines 18-28)
- ✅ `SubcategoryConfigDB` interface (lines 30-40)
- ✅ `ContentBlockDB` interface (line 9: category field)
- ✅ `CreateContentBlockInput` interface (line 48: category field)
- ✅ `CategoryWithSubcategories` interface (lines 91-94)

**Action Required**: Create parallel types for new system, maintain old types for backwards compatibility

### 2. Service Layer

**File**: `lib/services/content-blocks-service.ts`
- ✅ Line 132-142: `fetchCategoryConfigs()` - queries category_configs
- ✅ Line 145-161: `fetchSubcategoryConfigs()` - queries subcategory_configs
- ✅ Line 44-59: `dbCategoryConfigToCategoryConfig()` - conversion function
- ✅ Line 170-174: Fetches both categories and subcategories in parallel

**Action Required**: Add new service functions that work with shortcut_categories

### 3. UI Components

#### **File**: `components/admin/ContentBlocksManager.tsx` (1820 lines)
**Critical Component** - Admin interface for managing content blocks

Database Queries:
- ✅ Line 145-150: SELECT from category_configs
- ✅ Line 154-160: SELECT from subcategory_configs
- ✅ Line 163-166: Organizes categories with subcategories
- ✅ Line 264-276: UPDATE content_blocks
- ✅ Line 290-302: INSERT content_blocks
- ✅ Line 337-340: DELETE content_blocks
- ✅ Line 354-359: UPDATE content_blocks (toggle active)
- ✅ Line 458-467: INSERT category_configs
- ✅ Line 517-520: UPDATE category_configs
- ✅ Line 544-547: DELETE category_configs
- ✅ Line 595-604: INSERT subcategory_configs
- ✅ Line 658-662: UPDATE subcategory_configs
- ✅ Line 686-689: DELETE subcategory_configs

UI State Management:
- ✅ Line 108: `categories` state (CategoryWithSubcategories[])
- ✅ Line 366-381: Helper functions using category/subcategory data
- ✅ Line 813-920: Sidebar rendering with category/subcategory hierarchy
- ✅ Line 1032-1090: Category/subcategory select dropdowns

**Action Required**: This is the PRIMARY component that needs updating

#### **File**: `components/unified/UnifiedContextMenu.tsx` (555 lines)
**Critical Component** - Main context menu used throughout app

Usage:
- ✅ Line 115-118: `useContentBlocks()` hook
- ✅ Line 336-343: Renders categories in menu
- ✅ Line 337: Uses `DynamicContextMenuSection`

**Action Required**: Verify no breaking changes after migration

#### **File**: `features/rich-text-editor/components/DynamicContextMenuSection.tsx` (218 lines)
**Critical Component** - Renders category hierarchy in context menu

Usage:
- ✅ Line 66-111: Loads blocks by category and subcategory
- ✅ Line 87: `getBlocksWithoutSubcategory(category.id)`
- ✅ Line 96: `getBlocksBySubcategory(category.id, subcategory.id)`

**Action Required**: Ensure service layer maintains compatible interface

### 4. Hooks

**File**: `hooks/useContentBlocks.ts`
- ✅ Line 37: Calls `getCachedContentBlockStructure()`
- ✅ Line 2: Returns `CategoryConfig[]`

**Action Required**: Hook should continue to work if service layer is updated properly

### 5. Migration Scripts

**File**: `scripts/migrate-content-blocks.ts`
- ✅ Line 31-57: Migrates category_configs
- ✅ Line 59-98: Migrates subcategory_configs

**Action Required**: Create NEW migration script for shortcut_categories

### 6. Configuration

**File**: `config/content-blocks.ts`
- ✅ No category-specific configuration
- ✅ Controls database vs static usage

**Action Required**: None - configuration agnostic

### 7. Static Data (Fallback)

**File**: `features/rich-text-editor/config/contentBlocks.ts`
- ✅ Line 24-32: `ContentBlock` interface with category field
- ✅ Line 35+: Static content blocks array

**Action Required**: Maintain as fallback - no changes needed

---

## Data Migration Strategy

### Phase 1: Preparation (NO SCHEMA CHANGES YET)

#### Step 1.1: Add New Placement Type Constant

**File**: `features/prompt-builtins/constants.ts`

```typescript
export const PLACEMENT_TYPES = {
  MENU: 'menu',
  BUTTON: 'button',
  CARD: 'card',
  QUICK_ACTION: 'quick-action',
  MODAL: 'modal',
  CONTENT_BLOCK: 'content-block', // NEW: For content blocks context menu
} as const;
```

Update metadata:
```typescript
[PLACEMENT_TYPES.CONTENT_BLOCK]: {
  label: 'Content Block',
  description: 'Content blocks for insertion in editors',
  icon: 'FileText',
},
```

#### Step 1.2: Create Mapping Table (Temporary)

Create a temporary mapping table to track the migration:

```sql
CREATE TABLE public.category_migration_map (
  old_category_id VARCHAR(50) PRIMARY KEY,
  new_category_uuid UUID NOT NULL,
  old_subcategory_id VARCHAR(50),
  new_subcategory_uuid UUID,
  UNIQUE(old_category_id, old_subcategory_id)
);
```

### Phase 2: Data Migration SQL

#### Step 2.1: Migrate Categories to shortcut_categories

**File**: Create `migrations/migrate_content_block_categories.sql`

```sql
-- ============================================================================
-- CONTENT BLOCKS CATEGORY MIGRATION
-- Migrate from category_configs/subcategory_configs to shortcut_categories
-- ============================================================================

BEGIN;

-- Step 1: Migrate top-level categories
-- These become parent categories with placement_type = 'content-block'
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
  gen_random_uuid() as id, -- Generate new UUID
  'content-block' as placement_type,
  NULL as parent_category_id, -- Top level
  label,
  NULL as description, -- Old system didn't have description
  COALESCE(icon_name, 'FileText') as icon_name,
  COALESCE(color, 'zinc') as color,
  COALESCE(sort_order, 999) as sort_order,
  COALESCE(is_active, true) as is_active,
  jsonb_build_object(
    'migrated_from', 'category_configs',
    'original_category_id', category_id,
    'migrated_at', NOW()
  ) as metadata
FROM public.category_configs
WHERE is_active = true
ON CONFLICT DO NOTHING; -- Safety check

-- Step 2: Save mapping of old category_id to new UUID
INSERT INTO public.category_migration_map (old_category_id, new_category_uuid)
SELECT 
  cc.category_id,
  sc.id
FROM public.category_configs cc
JOIN public.shortcut_categories sc ON sc.metadata->>'original_category_id' = cc.category_id
WHERE sc.placement_type = 'content-block'
AND sc.parent_category_id IS NULL;

-- Step 3: Migrate subcategories
-- These become child categories with parent_category_id set
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
    'migrated_at', NOW()
  ) as metadata
FROM public.subcategory_configs sc
JOIN public.category_migration_map cmm ON cmm.old_category_id = sc.category_id
JOIN public.shortcut_categories parent ON parent.id = cmm.new_category_uuid
WHERE sc.is_active = true;

-- Step 4: Update mapping with subcategory UUIDs
UPDATE public.category_migration_map cmm
SET 
  old_subcategory_id = sc_old.subcategory_id,
  new_subcategory_uuid = sc_new.id
FROM public.subcategory_configs sc_old
JOIN public.shortcut_categories sc_new ON 
  sc_new.metadata->>'original_subcategory_id' = sc_old.subcategory_id
  AND sc_new.metadata->>'original_category_id' = sc_old.category_id
WHERE cmm.old_category_id = sc_old.category_id
AND cmm.old_subcategory_id IS NULL;

-- Step 5: Verify migration
SELECT 
  'Categories migrated:' as status,
  COUNT(*) as count
FROM public.shortcut_categories
WHERE placement_type = 'content-block'
AND parent_category_id IS NULL;

SELECT 
  'Subcategories migrated:' as status,
  COUNT(*) as count
FROM public.shortcut_categories
WHERE placement_type = 'content-block'
AND parent_category_id IS NOT NULL;

SELECT 
  'Mapping entries:' as status,
  COUNT(*) as count
FROM public.category_migration_map;

COMMIT;
```

#### Step 2.2: Verification Query

```sql
-- Verify the migration created the correct hierarchy
WITH RECURSIVE category_tree AS (
  -- Base case: top-level categories
  SELECT
    id,
    placement_type,
    parent_category_id,
    label,
    icon_name,
    color,
    sort_order,
    0 as depth,
    ARRAY[label] as path,
    metadata
  FROM shortcut_categories
  WHERE placement_type = 'content-block'
  AND parent_category_id IS NULL
  
  UNION ALL
  
  -- Recursive case: subcategories
  SELECT
    sc.id,
    sc.placement_type,
    sc.parent_category_id,
    sc.label,
    sc.icon_name,
    sc.color,
    sc.sort_order,
    ct.depth + 1,
    ct.path || sc.label,
    sc.metadata
  FROM shortcut_categories sc
  JOIN category_tree ct ON sc.parent_category_id = ct.id
  WHERE sc.placement_type = 'content-block'
)
SELECT
  depth,
  REPEAT('  ', depth) || label as hierarchy_label,
  icon_name,
  color,
  sort_order,
  metadata->>'original_category_id' as old_category_id,
  metadata->>'original_subcategory_id' as old_subcategory_id
FROM category_tree
ORDER BY path, sort_order;
```

### Phase 3: Dual-System Support (CRITICAL FOR ZERO DOWNTIME)

#### Strategy: Adapter Pattern

Create adapter functions that allow both old and new systems to coexist:

**File**: Create `lib/services/content-blocks-category-adapter.ts`

```typescript
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import { CategoryConfigDB, SubcategoryConfigDB, CategoryWithSubcategories } from '@/types/content-blocks-db';
import { ShortcutCategory } from '@/features/prompt-builtins/types';

/**
 * Adapter to fetch categories from new unified system
 * Returns data in old format for backwards compatibility
 */
export async function fetchCategoriesFromUnifiedSystem(): Promise<{
  categories: CategoryConfigDB[];
  subcategories: SubcategoryConfigDB[];
}> {
  const supabase = getBrowserSupabaseClient();
  
  // Fetch all content-block categories
  const { data: shortcutCategories, error } = await supabase
    .from('shortcut_categories')
    .select('*')
    .eq('placement_type', 'content-block')
    .eq('is_active', true)
    .order('sort_order');
    
  if (error) throw error;
  
  // Separate top-level and subcategories
  const topLevel = shortcutCategories.filter(c => !c.parent_category_id);
  const subLevel = shortcutCategories.filter(c => c.parent_category_id);
  
  // Convert to old format
  const categories: CategoryConfigDB[] = topLevel.map(sc => ({
    id: sc.id,
    category_id: sc.metadata?.original_category_id || sc.id,
    label: sc.label,
    icon_name: sc.icon_name,
    color: sc.color,
    sort_order: sc.sort_order,
    is_active: sc.is_active,
    created_at: new Date().toISOString(), // Placeholder
    updated_at: new Date().toISOString(), // Placeholder
  }));
  
  const subcategories: SubcategoryConfigDB[] = subLevel.map(sc => {
    const parent = topLevel.find(p => p.id === sc.parent_category_id);
    return {
      id: sc.id,
      category_id: parent?.metadata?.original_category_id || parent?.id || '',
      subcategory_id: sc.metadata?.original_subcategory_id || sc.id,
      label: sc.label,
      icon_name: sc.icon_name,
      sort_order: sc.sort_order,
      is_active: sc.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
  
  return { categories, subcategories };
}

/**
 * Feature flag to control which system to use
 */
export const USE_UNIFIED_CATEGORIES = process.env.NEXT_PUBLIC_USE_UNIFIED_CATEGORIES === 'true';
```

---

## Code Migration Checklist

### ✅ Phase 1: Setup & Preparation

- [ ] 1.1 Add `CONTENT_BLOCK` placement type to constants
- [ ] 1.2 Create migration mapping table SQL
- [ ] 1.3 Create category adapter service
- [ ] 1.4 Add feature flag to .env: `NEXT_PUBLIC_USE_UNIFIED_CATEGORIES=false`
- [ ] 1.5 Create full backup of database

### ✅ Phase 2: Data Migration

- [ ] 2.1 Run migration SQL script
- [ ] 2.2 Verify all categories migrated correctly
- [ ] 2.3 Verify all subcategories migrated correctly
- [ ] 2.4 Verify mapping table populated
- [ ] 2.5 Run hierarchy verification query
- [ ] 2.6 Test category retrieval from new system

### ✅ Phase 3: Service Layer Updates

#### File: `lib/services/content-blocks-service.ts`

- [ ] 3.1 Update `fetchCategoryConfigs()` to use adapter
- [ ] 3.2 Update `fetchSubcategoryConfigs()` to use adapter
- [ ] 3.3 Add feature flag checks
- [ ] 3.4 Test with flag OFF (old system)
- [ ] 3.5 Test with flag ON (new system)
- [ ] 3.6 Verify all existing tests pass

### ✅ Phase 4: Component Updates (IF NEEDED)

#### File: `components/admin/ContentBlocksManager.tsx`

**Decision Point**: Do we update this component or create a new one?

**Option A** (Recommended): Create NEW manager for unified system
- [ ] 4.A.1 Create `components/admin/UnifiedContentBlocksManager.tsx`
- [ ] 4.A.2 Add toggle in admin to switch between old/new manager
- [ ] 4.A.3 Keep old manager for fallback
- [ ] 4.A.4 Test both managers side-by-side

**Option B**: Update existing manager
- [ ] 4.B.1 Add feature flag checks throughout component
- [ ] 4.B.2 Update all database queries to use adapter
- [ ] 4.B.3 Maintain backwards compatibility
- [ ] 4.B.4 Add extensive testing

### ✅ Phase 5: Testing Protocol

See [Testing Protocol](#testing-protocol) section below

### ✅ Phase 6: Gradual Rollout

- [ ] 6.1 Deploy with flag OFF (old system active)
- [ ] 6.2 Verify production stable
- [ ] 6.3 Enable flag for admin users only
- [ ] 6.4 Monitor for 24 hours
- [ ] 6.5 Enable flag for all users
- [ ] 6.6 Monitor for 1 week

### ✅ Phase 7: Cleanup (AFTER STABLE FOR 2+ WEEKS)

- [ ] 7.1 Remove feature flag
- [ ] 7.2 Remove adapter layer
- [ ] 7.3 Archive old category_configs/subcategory_configs tables
- [ ] 7.4 Remove old service functions
- [ ] 7.5 Update documentation

---

## Testing Protocol

### Pre-Migration Tests

#### Database State
- [ ] Export all category_configs data
- [ ] Export all subcategory_configs data
- [ ] Export all content_blocks data
- [ ] Document current category hierarchy
- [ ] Take full database snapshot

#### Functional Tests
- [ ] Test content blocks in context menu (Notes)
- [ ] Test content blocks in context menu (Prompts)
- [ ] Test content blocks insertion in rich text editor
- [ ] Test category filtering in admin
- [ ] Test subcategory filtering in admin
- [ ] Test content block creation via admin
- [ ] Test category creation via admin
- [ ] Test subcategory creation via admin

### Post-Migration Tests (Flag OFF)

#### Verify Old System Still Works
- [ ] All categories load correctly
- [ ] All subcategories load correctly
- [ ] Content blocks show in context menu
- [ ] Content blocks can be inserted
- [ ] Admin can create new categories
- [ ] Admin can create new subcategories
- [ ] Admin can edit existing items
- [ ] Admin can delete items

### Post-Migration Tests (Flag ON)

#### Verify New System Works
- [ ] All migrated categories visible
- [ ] All migrated subcategories visible
- [ ] Category hierarchy is correct
- [ ] Content blocks show in context menu
- [ ] Content blocks can be inserted
- [ ] Icons display correctly
- [ ] Colors display correctly
- [ ] Sort order is maintained

#### Data Integrity
- [ ] Count matches: old categories = new top-level categories
- [ ] Count matches: old subcategories = new child categories
- [ ] All category names identical
- [ ] All subcategory names identical
- [ ] No orphaned content blocks
- [ ] All metadata preserved

#### Cross-System Tests
- [ ] Toggle flag ON -> OFF -> ON
- [ ] Verify no data corruption
- [ ] Verify no missing categories
- [ ] Verify consistent behavior

### Integration Tests

#### Context Menu (UnifiedContextMenu)
- [ ] Test in NoteEditor
- [ ] Test in PromptEditor
- [ ] Test in RichTextEditor
- [ ] Verify category hierarchy displays
- [ ] Verify subcategory hierarchy displays
- [ ] Verify content block selection works
- [ ] Verify content block insertion works

#### Admin Interface
- [ ] Test ContentBlocksManager loads
- [ ] Test category management
- [ ] Test subcategory management
- [ ] Test content block CRUD operations
- [ ] Test search/filter functionality
- [ ] Test sort functionality

### Performance Tests

- [ ] Measure category load time (old system)
- [ ] Measure category load time (new system)
- [ ] Verify no performance regression
- [ ] Check for N+1 queries
- [ ] Verify caching still works

### Edge Cases

- [ ] Test with inactive categories
- [ ] Test with inactive subcategories
- [ ] Test with empty categories
- [ ] Test with null subcategories
- [ ] Test with special characters in names
- [ ] Test with very long category names
- [ ] Test with maximum nesting depth

---

## Rollback Plan

### If Migration Fails

#### Immediate Rollback (Before Flag Enabled)
1. `ROLLBACK` SQL transaction
2. Drop category_migration_map table
3. Verify old system intact
4. Continue with old system

#### Emergency Rollback (After Flag Enabled)
1. Set `NEXT_PUBLIC_USE_UNIFIED_CATEGORIES=false`
2. Redeploy application
3. Verify old system working
4. Investigate issue
5. Fix and retry migration

#### Data Loss Prevention
- Keep old tables for 30+ days after successful migration
- Maintain category_migration_map indefinitely
- Log all adapter function calls
- Monitor error rates closely

---

## Success Criteria

### Migration is successful when:

1. ✅ All categories migrated to shortcut_categories
2. ✅ All subcategories migrated as children
3. ✅ Category hierarchy matches original
4. ✅ Content blocks system works with new categories
5. ✅ Context menus display correctly
6. ✅ Admin can manage categories in new system
7. ✅ No performance degradation
8. ✅ Zero data loss
9. ✅ Feature flag can toggle between systems seamlessly
10. ✅ All tests pass in both modes

---

## Timeline Estimate

### Conservative Estimate

- **Phase 1** (Setup): 2-3 hours
- **Phase 2** (Data Migration): 1-2 hours
- **Phase 3** (Service Layer): 3-4 hours
- **Phase 4** (Components - if needed): 4-6 hours
- **Phase 5** (Testing): 4-6 hours
- **Phase 6** (Gradual Rollout): 1 week monitoring
- **Phase 7** (Cleanup): 2-3 hours

**Total Active Development**: 14-21 hours
**Total Timeline with Monitoring**: 2-3 weeks

---

## Next Steps

1. **User Reviews This Document**
   - Confirm approach
   - Identify any missed usages
   - Approve migration strategy

2. **Create Feature Branch**
   - `feature/unified-content-block-categories`

3. **Implement Phase 1**
   - Start with constants
   - Create adapter
   - Add feature flag

4. **Execute Migration**
   - Run SQL in development first
   - Test thoroughly
   - Document any issues

5. **Iterative Testing**
   - Test each phase independently
   - Don't proceed until current phase stable

---

## Questions for User

1. **Do we want to update ContentBlocksManager or create a new component?**
   - New component (safer, allows A/B comparison)
   - Update existing (less code duplication)

2. **How long should we maintain dual-system support?**
   - Recommended: Keep adapter layer for 3-6 months
   - Allows rollback if issues discovered

3. **Should we archive or delete old tables after migration?**
   - Recommended: Archive (rename to `_archived_category_configs`)
   - Keep for 90 days minimum

4. **Do we need to migrate any metadata from old system?**
   - Check if any integrations depend on old string-based IDs
   - Document any external references

---

## Risk Assessment

### Low Risk
- ✅ Data migration (can be rolled back)
- ✅ Service layer changes (adapter provides safety)
- ✅ Feature flag implementation

### Medium Risk
- ⚠️ Component updates (thorough testing required)
- ⚠️ Type definition changes (may affect multiple files)

### High Risk
- ❌ Breaking existing production functionality
- **Mitigation**: Dual-system support, feature flags, extensive testing

### Risk Mitigation Strategies
1. Feature flags for gradual rollout
2. Adapter pattern for backwards compatibility
3. Keep old tables archived
4. Comprehensive testing protocol
5. Rollback plan ready
6. Monitor error rates during rollout

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Status**: Draft - Awaiting User Review


# Content Blocks System - Complete File Inventory

**Purpose**: Track every file that references the content blocks category system  
**Status**: Pre-Migration Inventory  
**Last Updated**: 2025-01-15

---

## Critical Files (MUST UPDATE)

These files directly interact with category_configs/subcategory_configs tables:

### 1. Service Layer

#### `lib/services/content-blocks-service.ts`
**Lines**: 132-142, 145-161, 44-59, 164-192  
**Purpose**: Main service for fetching and converting content blocks data  
**Database Tables Used**:
- `category_configs` (SELECT)
- `subcategory_configs` (SELECT)
- `content_blocks` (SELECT)

**Functions to Update**:
- `fetchCategoryConfigs()` - Line 132
- `fetchSubcategoryConfigs()` - Line 145  
- `dbCategoryConfigToCategoryConfig()` - Line 44
- `fetchCompleteContentBlockStructure()` - Line 164

**Migration Priority**: 🔴 **HIGH** - Core functionality
**Migration Strategy**: Use adapter pattern to support both systems

---

### 2. Admin Components

#### `components/admin/ContentBlocksManager.tsx`
**Lines**: 1-1820 (entire file)  
**Purpose**: Full CRUD interface for managing content blocks, categories, and subcategories  
**Database Tables Used**:
- `category_configs` (SELECT, INSERT, UPDATE, DELETE)
- `subcategory_configs` (SELECT, INSERT, UPDATE, DELETE)
- `content_blocks` (SELECT, INSERT, UPDATE, DELETE)

**Key Operations**:
- Line 145-166: Load categories and subcategories
- Line 424-512: Create category
- Line 514-528: Update category
- Line 530-556: Delete category
- Line 558-654: Create subcategory
- Line 656-670: Update subcategory
- Line 672-698: Delete subcategory

**UI State**:
- Line 108: `categories: CategoryWithSubcategories[]`
- Line 366-381: Helper functions for category/subcategory lookups

**Migration Priority**: 🔴 **CRITICAL** - Main admin interface
**Migration Strategy**: 
- **Option A**: Create new `UnifiedContentBlocksManager.tsx`
- **Option B**: Add feature flag and adapter support
- **Recommendation**: Option A (safer)

---

### 3. Context Menu Components

#### `components/unified/UnifiedContextMenu.tsx`
**Lines**: 1-555  
**Purpose**: App-wide context menu that displays content blocks  
**Database Tables Used**: None (uses hook)

**Content Blocks Integration**:
- Line 115-118: `useContentBlocks()` hook call
- Line 336-343: Renders content blocks section
- Line 337: Passes `categoryConfigs` to `DynamicContextMenuSection`

**Migration Priority**: 🟡 **MEDIUM** - Should work if service layer updated correctly
**Migration Strategy**: Verify no breaking changes after service layer update

---

#### `features/rich-text-editor/components/DynamicContextMenuSection.tsx`
**Lines**: 1-218  
**Purpose**: Renders hierarchical category menu with content blocks  
**Database Tables Used**: None (calls service functions)

**Service Calls**:
- Line 87: `getBlocksWithoutSubcategory(category.id)`
- Line 96: `getBlocksBySubcategory(category.id, subcategory.id)`

**Category Hierarchy Rendering**:
- Line 132-159: Flat category structure
- Line 162-216: Hierarchical with subcategories

**Migration Priority**: 🟡 **MEDIUM** - Depends on service layer
**Migration Strategy**: Should work if service maintains compatible interface

---

### 4. Type Definitions

#### `types/content-blocks-db.ts`
**Lines**: 1-114  
**Purpose**: TypeScript interfaces for content blocks database

**Interfaces Defined**:
- Line 18-28: `CategoryConfigDB`
- Line 30-40: `SubcategoryConfigDB`
- Line 3-16: `ContentBlockDB` (has category field)
- Line 86-94: `CategoryWithSubcategories`
- Plus input/output types

**Migration Priority**: 🔴 **HIGH** - Type safety across codebase
**Migration Strategy**: 
- Keep existing types for backwards compatibility
- Add new types for unified system
- Use union types during transition

---

### 5. Hooks

#### `hooks/useContentBlocks.ts`
**Lines**: 1-116  
**Purpose**: React hook for loading content blocks

**Dependencies**:
- Line 3: Imports from `content-blocks-service`
- Line 37: Calls `getCachedContentBlockStructure()`

**Migration Priority**: 🟡 **MEDIUM** - Wrapper around service
**Migration Strategy**: Should work if service layer updated

---

## Supporting Files (MONITOR ONLY)

These files use content blocks but don't directly access category tables:

### 6. Configuration

#### `config/content-blocks.ts`
**Purpose**: Feature flags and configuration  
**Migration Impact**: None - configuration agnostic  
**Action**: No changes needed

---

### 7. Static Fallback Data

#### `features/rich-text-editor/config/contentBlocks.ts`
**Purpose**: Static content blocks definition (fallback when DB unavailable)  
**Migration Impact**: None - used as fallback only  
**Action**: No changes needed

---

### 8. Migration Scripts

#### `scripts/migrate-content-blocks.ts`
**Purpose**: Original migration script to populate database  
**Migration Impact**: Needs NEW script for unified system  
**Action**: Create `scripts/migrate-to-unified-categories.ts`

---

### 9. Schema Files

#### `utils/schema/lookupSchema.ts`
**Contains**: Schema definitions  
**Migration Impact**: May need updates if schema changes  
**Action**: Monitor, update if needed

#### `utils/schema/initialTableSchemas.ts`
**Contains**: Initial table definitions  
**Migration Impact**: May need updates  
**Action**: Monitor, update if needed

#### `utils/schema/initialSchemas.ts`
**Contains**: Schema initialization  
**Migration Impact**: May need updates  
**Action**: Monitor, update if needed

---

## Files Using useContentBlocks Hook

These components use the hook and should be tested after migration:

### Rich Text Editor
1. `features/rich-text-editor/components/EditorContextMenu.tsx`
2. `features/prompts/components/PromptEditorContextMenu.tsx`

### Template Components  
3. `components/playground/templates/TemplateLibraryPanel.tsx`
4. `components/playground/templates/QuickTemplateInsertButton.tsx`
5. `components/playground/templates/CanvasQuickActions.tsx`

**Migration Priority**: 🟢 **LOW** - Should work transparently
**Migration Strategy**: Integration testing after migration

---

## New Files to Create

### 1. Adapter Service

**File**: `lib/services/content-blocks-category-adapter.ts`
**Purpose**: Translate between old and new category systems
**Functions Needed**:
- `fetchCategoriesFromUnifiedSystem()` - Returns old format from new tables
- `fetchCategoriesFromLegacySystem()` - Returns from old tables
- `saveCategoryToUnifiedSystem()` - CRUD for new system
- Feature flag checks

**Priority**: 🔴 **CRITICAL** - Required for migration
**Status**: ❌ Not created

---

### 2. Migration Script

**File**: `scripts/migrate-to-unified-categories.ts`
**Purpose**: Migrate data from old to new system
**Functions Needed**:
- Migrate categories to shortcut_categories
- Migrate subcategories as children
- Create mapping table
- Verification queries

**Priority**: 🔴 **CRITICAL** - Required for migration
**Status**: ❌ Not created (SQL version in migration plan)

---

### 3. New Types (Optional)

**File**: `types/unified-content-blocks-db.ts`
**Purpose**: Types for unified system
**Includes**:
- Unified category types
- Adapter types
- Migration types

**Priority**: 🟡 **MEDIUM** - For type safety
**Status**: ❌ Not created

---

### 4. New Admin Component (Option A)

**File**: `components/admin/UnifiedContentBlocksManager.tsx`
**Purpose**: Admin interface using unified categories
**Functions**:
- Manage content blocks
- Manage unified categories (hierarchical)
- Same UX as old manager

**Priority**: 🟡 **MEDIUM** - If Option A chosen
**Status**: ❌ Not created

---

## Documentation Files

### 1. README Files
- `components/unified/README.md` - Mentions content blocks
- `components/playground/templates/README.md` - Uses content blocks

**Action**: Update after migration

### 2. Migration Docs  
- `SYSTEM_PROMPTS_DATABASE_PLAN.md` - References categories
- `SYSTEM_INTEGRATION_COMPLETE.md` - Documents integration

**Action**: Update references to new system

### 3. Feature Docs
- `UNIFIED_CONTEXT_MENU_COMPLETE.md` - Documents context menu

**Action**: Document migration in this file

---

## Testing Files

### To Create After Migration

1. `tests/content-blocks/category-adapter.test.ts` - Test adapter
2. `tests/content-blocks/migration.test.ts` - Test migration
3. `tests/content-blocks/integration.test.ts` - Test end-to-end

---

## Environment Variables

### New Variables to Add

```bash
# Feature flag for unified categories
NEXT_PUBLIC_USE_UNIFIED_CATEGORIES=false

# Existing (keep)
NEXT_PUBLIC_USE_DATABASE_CONTENT_BLOCKS=true
NEXT_PUBLIC_ENABLE_CONTENT_BLOCKS_ADMIN=true
```

**File**: `.env.local`  
**Action**: Add after Phase 1 setup

---

## Database Files

### SQL Migrations to Create

1. `migrations/migrate_content_block_categories.sql`
   - Migrate data from old to new tables
   - Create mapping table
   - Verification queries

2. `migrations/archive_old_category_tables.sql` (LATER)
   - Rename old tables to _archived
   - Remove foreign keys
   - Keep data for reference

---

## Summary Statistics

### Files That Touch Category System

| Category | Count | Priority |
|----------|-------|----------|
| **Critical** (Must Update) | 5 | 🔴 HIGH |
| **Monitor** (Test After) | 9 | 🟡 MEDIUM |
| **Supporting** (No Changes) | 4 | 🟢 LOW |
| **New Files** (To Create) | 4-5 | 🔴 HIGH |
| **Tests** (To Create) | 3 | 🔴 HIGH |

### Total Files in Migration Scope: ~25 files

---

## File Dependency Graph

```
┌─────────────────────────────────┐
│ UnifiedContextMenu              │
│ (uses content blocks)           │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│ useContentBlocks hook           │
│ (React state management)        │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│ content-blocks-service          │◄──────┐
│ (Main service layer)            │       │
└────────────┬────────────────────┘       │
             │                             │
             ↓                             │
┌─────────────────────────────────┐       │
│ category-adapter (NEW)          │       │
│ (Feature flag routing)          │       │
└────────────┬────────────────────┘       │
             │                             │
      ┌──────┴──────┐                    │
      ↓             ↓                     │
┌──────────┐  ┌─────────────┐            │
│ Old      │  │ New         │            │
│ Tables   │  │ Tables      │            │
│          │  │ shortcut_   │            │
│ category_│  │ categories  │            │
│ configs  │  │             │            │
└──────────┘  └─────────────┘            │
                                          │
┌─────────────────────────────────┐      │
│ ContentBlocksManager            │      │
│ (Admin CRUD interface)          │──────┘
└─────────────────────────────────┘
```

---

## Change Impact Matrix

| File | Lines Changed | Risk | Testing Effort |
|------|---------------|------|----------------|
| content-blocks-service.ts | 50-100 | Medium | High |
| ContentBlocksManager.tsx | 200-500+ | High | Very High |
| UnifiedContextMenu.tsx | 0-10 | Low | Medium |
| DynamicContextMenuSection.tsx | 0-20 | Low | Medium |
| content-blocks-db.ts | 50-100 | Medium | Medium |
| category-adapter.ts (new) | 200-300 | Medium | High |

---

## Pre-Migration Checklist

Before starting migration:

- [ ] Backup all category_configs data
- [ ] Backup all subcategory_configs data
- [ ] Backup all content_blocks data
- [ ] Document current category count: **5 categories**
- [ ] Document current subcategory count: **9 subcategories**
- [ ] Test content blocks in production
- [ ] Record baseline performance metrics
- [ ] Create git branch: `feature/unified-content-block-categories`
- [ ] Set up monitoring/logging
- [ ] Prepare rollback SQL scripts

---

**Document Version**: 1.0  
**Purpose**: Complete file inventory for migration planning  
**Next Step**: Review with user, then begin Phase 1 implementation


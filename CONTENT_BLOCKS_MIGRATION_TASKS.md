# Content Blocks Migration to Unified Categories

**Goal**: Transition content blocks from separate `category_configs`/`subcategory_configs` tables to the unified `shortcut_categories` system.

**Status**: In Progress  
**Started**: 2025-01-15  
**Last Updated**: 2025-01-15

---

## ✅ COMPLETED TASKS

### Phase 1: Database Migration
- ✅ Created SQL migration script (`migrations/migrate_content_block_categories.sql`)
  - Migrates all categories from `category_configs` to `shortcut_categories`
  - Migrates all subcategories as child categories with `parent_category_id`
  - Sets `placement_type = 'content-block'` for filtering
  - Preserves all metadata (colors, icons, sort order)
- ✅ Added `category_id` UUID foreign key column to `content_blocks` table
- ✅ Created SQL script to populate `category_id` FK (`migrations/update_content_blocks_category_fk.sql`)
  - Maps old string-based `category` + `subcategory` to new UUID `category_id`
  - Updates all 48 existing content blocks
- ✅ Executed both migration scripts successfully

### Phase 2: Service Layer Updates
- ✅ Updated `lib/services/content-blocks-service.ts`
  - ✅ `fetchCategoryConfigs()` - Now fetches from `shortcut_categories` (placement_type: 'content-block', parent_category_id: null)
  - ✅ `fetchSubcategoryConfigs()` - Now fetches child categories from `shortcut_categories`
  - ✅ Maintains backward-compatible interface (maps to old format)
  - ✅ All dependent hooks (`useContentBlocks`) work transparently

### Phase 3: Type Definitions
- ✅ Updated `types/content-blocks-db.ts`
  - ✅ Added `category_id: string | null` to `ContentBlockDB` interface
  - ✅ Added `category_id: string` to `CreateContentBlockInput` interface
  - ✅ Marked old `category` and `subcategory` fields as deprecated
  - ✅ Maintained backward compatibility during transition

### Phase 4: Admin Interface
- ✅ Completely rewrote `components/admin/ContentBlocksManager.tsx`
  - ✅ Removed separate category/subcategory concept
  - ✅ Implemented unified hierarchical category system
  - ✅ Uses new `Category` interface (flat structure with children)
  - ✅ All CRUD operations now use `shortcut_categories` table
  - ✅ Created VSCode-like tree view sidebar
    - ✅ Recursive rendering with proper indentation
    - ✅ Independent expand/collapse for each category
    - ✅ Folders (categories) display before files (blocks)
  - ✅ Updated category selector dropdowns (create/edit forms)
    - ✅ Hierarchical tree display with indentation
    - ✅ Single unified category field (no separate subcategory)
  - ✅ Create/update blocks now use `category_id` UUID
  - ✅ Still populates old `category`/`subcategory` fields for backward compat

---

## 🔄 IN PROGRESS

### Phase 5: Testing & Validation
- 🔄 **Test content blocks in UnifiedContextMenu**
  - Need to verify content blocks appear correctly in context menu
  - Test hierarchical category display
  - Verify block insertion still works
  - Check all context menu consumers:
    - `components/unified/UnifiedContextMenu.tsx`
    - `features/rich-text-editor/components/EditorContextMenu.tsx`
    - `features/prompts/components/PromptEditorContextMenu.tsx`
    - `features/rich-text-editor/components/DynamicContextMenuSection.tsx`

---

## 📋 TODO

### Phase 6: Cleanup (Final Steps)
- ⏳ **Remove deprecated string columns from `content_blocks` table**
  ```sql
  -- After confirming everything works
  ALTER TABLE content_blocks DROP COLUMN category;
  ALTER TABLE content_blocks DROP COLUMN subcategory;
  ```
  
- ⏳ **Drop old category tables**
  ```sql
  -- Archive first (optional)
  ALTER TABLE category_configs RENAME TO _archived_category_configs;
  ALTER TABLE subcategory_configs RENAME TO _archived_subcategory_configs;
  
  -- Or drop completely
  DROP TABLE IF EXISTS subcategory_configs;
  DROP TABLE IF EXISTS category_configs;
  ```

### Phase 7: Documentation Updates
- ⏳ Update `CONTENT_BLOCKS_FILE_INVENTORY.md` with final status
- ⏳ Update `components/unified/README.md` if needed
- ⏳ Add migration notes to codebase documentation

---

## 📊 MIGRATION STATISTICS

### Database Changes
- **Tables Modified**: 3
  - `shortcut_categories` (insertions)
  - `content_blocks` (new column)
  - `category_configs` → to be dropped
  - `subcategory_configs` → to be dropped

### Data Migrated
- **Categories**: 5 parent categories
- **Subcategories**: 9 child categories (now in same table)
- **Content Blocks**: 48 blocks (all updated with category_id FK)

### Code Changes
- **Files Updated**: 3
  - `lib/services/content-blocks-service.ts` (~50 lines)
  - `types/content-blocks-db.ts` (~20 lines)
  - `components/admin/ContentBlocksManager.tsx` (~500 lines - major rewrite)
- **Files To Test**: 4-5 (context menu consumers)
- **Files To Drop**: 0 (all working with new system)

---

## 🎯 SUCCESS CRITERIA

### Must Pass Before Completion
- [x] All categories visible in admin interface
- [x] Can create new categories with hierarchy
- [x] Can create/edit content blocks with new categories
- [ ] Content blocks appear in UnifiedContextMenu
- [ ] Content blocks insertable from context menu
- [ ] No console errors in browser
- [ ] No database errors in logs
- [ ] All existing content blocks still accessible
- [ ] Old string fields can be safely removed

---

## 🔄 ROLLBACK PLAN

If issues arise, rollback steps:

1. **Restore old columns** (if already dropped):
   ```sql
   ALTER TABLE content_blocks ADD COLUMN category TEXT;
   ALTER TABLE content_blocks ADD COLUMN subcategory TEXT;
   -- Repopulate from category_id
   ```

2. **Keep old tables** until fully validated:
   - Don't drop `category_configs` and `subcategory_configs` until Phase 7

3. **Service layer** already supports both systems (adapter pattern)

---

## 🏗️ ARCHITECTURE DECISIONS

### Why Unified Categories?
1. **Single Source of Truth**: One table for all categorization
2. **Flexibility**: Support N-level hierarchy (not just 2 levels)
3. **Consistency**: Same system used for prompt shortcuts and content blocks
4. **Scalability**: Easier to add new category types (menu, button, card)

### Migration Approach
- **Strategy**: Direct cutover (no feature flag)
- **Reasoning**: 
  - Content blocks are admin-only feature
  - Small dataset (48 blocks, 14 categories)
  - Service layer maintains compatible interface
  - Low risk, high reward

### Backward Compatibility
- **Phase 4-5**: Keep old string fields populated during testing
- **Phase 6**: Drop old fields after validation
- **Reasoning**: Safety net during validation

---

## 📝 NOTES

### Integration Points
- `useContentBlocks` hook → Uses updated service layer → Works transparently
- Context menu components → Use hook → Should work without changes
- Admin interface → Completely rewritten → Fully functional

### Testing Strategy
1. ✅ Manual testing: Admin CRUD operations
2. 🔄 Integration testing: Context menu display
3. ⏳ Validation: Block insertion functionality
4. ⏳ Cleanup: Remove old fields
5. ⏳ Final verification: Full end-to-end test

---

**Next Action**: Complete Phase 5 testing (UnifiedContextMenu validation)


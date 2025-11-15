# Context Menu Content Blocks - Fixes Applied

**Date**: 2025-01-15  
**Status**: Fixes completed, ready for testing

---

## ✅ Fixes Applied

### 1. **Fixed UUID Mapping in `fetchCategoryConfigs()`**
**File**: `lib/services/content-blocks-service.ts` (Line 172)

**Before**:
```typescript
category_id: sc.metadata?.original_category_id || sc.id,
```

**After**:
```typescript
category_id: sc.id, // Use UUID directly
```

**Why**: The `metadata.original_category_id` field doesn't exist. We need to use the UUID `id` directly from `shortcut_categories`.

---

### 2. **Fixed UUID Mapping in `fetchSubcategoryConfigs()`**
**File**: `lib/services/content-blocks-service.ts` (Line 206-207)

**Before**:
```typescript
category_id: sc.metadata?.original_category_id || '',
subcategory_id: sc.metadata?.original_subcategory_id || sc.id,
```

**After**:
```typescript
category_id: sc.parent_category_id || '', // Parent UUID
subcategory_id: sc.id, // Use UUID directly
```

**Why**: 
- `category_id` should be the parent category's UUID (from `parent_category_id` column)
- `subcategory_id` should be the UUID of the child category itself

---

### 3. **Updated Query Options to Use `category_id`**
**File**: `types/content-blocks-db.ts` (Line 103)

**Before**:
```typescript
export interface ContentBlockQueryOptions {
    category?: string;
    subcategory?: string;
    // ...
}
```

**After**:
```typescript
export interface ContentBlockQueryOptions {
    category_id?: string; // UUID
    // ...
}
```

---

### 4. **Updated `fetchContentBlocks()` Filter**
**File**: `lib/services/content-blocks-service.ts` (Line 73-75)

**Before**:
```typescript
if (options.category) {
    query = query.eq('category', options.category);
}
if (options.subcategory) {
    query = query.eq('subcategory', options.subcategory);
}
```

**After**:
```typescript
if (options.category_id) {
    query = query.eq('category_id', options.category_id);
}
```

**Why**: Removed references to old string-based `category` and `subcategory` columns. Now using UUID `category_id` foreign key.

---

## 🔍 Data Flow Verification

### How Categories Are Fetched

1. **Top-level categories** (`fetchCategoryConfigs`):
   ```sql
   SELECT * FROM shortcut_categories
   WHERE placement_type = 'content-block'
     AND is_active = true
     AND parent_category_id IS NULL
   ORDER BY sort_order
   ```
   
   Maps to:
   ```typescript
   {
     id: <uuid>,
     category_id: <same-uuid>,  // Used for filtering subcategories
     label: "Structure",
     icon_name: "FileText",
     color: "blue",
     // ...
   }
   ```

2. **Child categories** (`fetchSubcategoryConfigs`):
   ```sql
   SELECT * FROM shortcut_categories
   WHERE placement_type = 'content-block'
     AND is_active = true
     AND parent_category_id IS NOT NULL
   ORDER BY sort_order
   ```
   
   Maps to:
   ```typescript
   {
     id: <uuid>,
     category_id: <parent-uuid>,      // Parent's UUID
     subcategory_id: <uuid>,          // This child's UUID
     label: "Thinking",
     icon_name: "Brain",
     // ...
   }
   ```

3. **Hierarchy Building** (`fetchCompleteContentBlockStructure`):
   ```typescript
   categories.map(category => {
     // Filter subcategories where parent matches this category
     const categorySubcategories = subcategories.filter(
       sub => sub.category_id === category.category_id
     );
     return dbCategoryConfigToCategoryConfig(category, categorySubcategories);
   });
   ```

4. **Content Blocks**:
   ```sql
   SELECT * FROM content_blocks
   WHERE is_active = true
     AND category_id = <uuid>  -- Now uses UUID foreign key
   ORDER BY sort_order
   ```

---

## 🧪 Testing Checklist

### Database Verification

Run these queries to verify data:

```sql
-- 1. Check categories exist
SELECT 
    id,
    label,
    parent_category_id,
    placement_type,
    is_active
FROM shortcut_categories
WHERE placement_type = 'content-block'
  AND is_active = true
ORDER BY parent_category_id NULLS FIRST, sort_order;

-- 2. Check content blocks have valid category_id
SELECT 
    block_id,
    label,
    category_id,
    is_active
FROM content_blocks
WHERE is_active = true
ORDER BY category_id, sort_order;

-- 3. Verify category_id foreign keys are valid
SELECT 
    cb.block_id,
    cb.label as block_label,
    sc.label as category_label,
    sc.parent_category_id
FROM content_blocks cb
LEFT JOIN shortcut_categories sc ON cb.category_id = sc.id
WHERE cb.is_active = true;
```

### Console Debugging

Add this to your browser console when the context menu isn't working:

```javascript
// Check if data is loaded
const state = window.__NEXT_DATA__;
console.log('Content Blocks State:', state);

// Check if categories are fetched
fetch('/api/...')  // Replace with your API endpoint if any
  .then(r => r.json())
  .then(data => console.log('API Response:', data));
```

### Component Debugging

Add these console logs temporarily:

**In `lib/services/content-blocks-service.ts`**:
```typescript
export async function fetchCompleteContentBlockStructure() {
    const [categories, subcategories, blocks] = await Promise.all([...]);
    
    console.log('🔷 Fetched categories:', categories);
    console.log('🔶 Fetched subcategories:', subcategories);
    console.log('🔸 Fetched blocks:', blocks);
    
    const categoryConfigs = categories.map(category => {
        const categorySubcategories = subcategories.filter(
            sub => sub.category_id === category.category_id
        );
        console.log(`🔹 Category "${category.label}" has ${categorySubcategories.length} subcategories`);
        return dbCategoryConfigToCategoryConfig(category, categorySubcategories);
    });
    
    console.log('✅ Final category configs:', categoryConfigs);
    console.log('✅ Final content blocks:', contentBlocks);
    
    return { categories: categoryConfigs, contentBlocks };
}
```

---

## 🚨 Common Issues to Check

### Issue 1: No categories showing
**Symptom**: Context menu opens but "Content Blocks" submenu is empty  
**Check**:
- Are there categories with `placement_type = 'content-block'` in database?
- Is `config/content-blocks.ts` set to `useDatabase: true`?
- Check browser console for errors

### Issue 2: Categories show but no blocks
**Symptom**: Can see category names but no content blocks inside  
**Check**:
- Do content blocks have valid `category_id` (not null)?
- Run SQL query to verify `category_id` foreign keys match existing categories
- Check if `is_active = true` for both categories and blocks

### Issue 3: Loading forever
**Symptom**: Shows "Loading..." but never finishes  
**Check**:
- Check browser Network tab for failed API calls
- Check for JavaScript errors in console
- Verify Supabase connection is working

### Issue 4: Wrong hierarchy
**Symptom**: Subcategories not appearing under correct parent  
**Check**:
- Verify `parent_category_id` is set correctly in `shortcut_categories`
- Check that line 228 in `content-blocks-service.ts` filter is working
- Add console logs to verify filtering logic

---

## 📋 Files Modified

1. ✅ `lib/services/content-blocks-service.ts` - Fixed UUID mapping (2 functions)
2. ✅ `types/content-blocks-db.ts` - Updated query options interface
3. ✅ `components/admin/ContentBlocksManager.tsx` - Already migrated to UUIDs
4. ⏹️ `components/unified/UnifiedContextMenu.tsx` - No changes needed (uses hook)
5. ⏹️ `features/rich-text-editor/components/DynamicContextMenuSection.tsx` - No changes needed (uses service)
6. ⏹️ `hooks/useContentBlocks.ts` - No changes needed (wrapper)

---

## 🎯 Next Steps

1. **Test the context menu**: Right-click on any rich text editor
2. **Check for data**: Should see "Content Blocks" submenu with categories
3. **Verify hierarchy**: Categories should show with their subcategories
4. **Test insertion**: Click a block and verify it inserts into editor
5. **Run database queries** above to verify data integrity
6. **If still broken**: Add console logs and share browser console output

---

## 🔄 Rollback Plan (If Needed)

If the context menu is still broken, you can temporarily revert to static content blocks:

**In `config/content-blocks.ts`**:
```typescript
useDatabase: false,  // Change from true to false
```

This will use the static content blocks from `features/rich-text-editor/config/contentBlocks.ts` as a fallback.

---

## ✅ Summary

All code references to old string-based `category`/`subcategory` fields have been removed. The system now:
- ✅ Fetches categories from `shortcut_categories` table
- ✅ Uses UUID-based `category_id` foreign key
- ✅ Builds hierarchical structure correctly
- ✅ Filters content blocks by UUID

The context menu should now work with the unified category system!


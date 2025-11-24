# 🚨 CRITICAL: Run This Migration ASAP

## The Bug We Fixed

Your database has **invalid `'modal'` values** in the `result_display` column that were causing hidden bugs. The UI was masking this by converting them to `'modal-full'`, making it impossible to see or fix.

## What We've Done

✅ **UI now SHOWS invalid values** with big red warnings
✅ **Fixed all code** that was saving `'modal'` instead of `'modal-full'`
✅ **Created migration** to fix existing data

## 🔴 ACTION REQUIRED: Run the Migration

### Step 1: Run the SQL Migration

```bash
# From project root
psql -U your_username -d your_database -f features/prompt-builtins/sql/fix_modal_to_modal_full.sql
```

Or run this SQL directly in your database tool:

```sql
-- Update all 'modal' to 'modal-full'
UPDATE public.prompt_shortcuts 
SET result_display = 'modal-full' 
WHERE result_display = 'modal';

-- Update the constraint (see full SQL in fix_modal_to_modal_full.sql)
```

### Step 2: Verify in UI

1. Navigate to: `http://localhost:3000/administration/prompt-builtins`
2. Click "Shortcuts Table" tab
3. Look at the "Display" column
4. **If you see any red warning triangles** ⚠️:
   - That means the migration hasn't run yet OR
   - There are other invalid values besides 'modal'

### Step 3: Manual Fix (if needed)

For any shortcuts showing red warnings:
1. Click on the row
2. In the edit modal, find the "Display" dropdown
3. Select "Full Modal" (or appropriate value)
4. Save

## What Changed in Code

Before (WRONG):
```typescript
result_display: input.result_display ?? 'modal'  // ❌ Invalid value
```

After (CORRECT):
```typescript
result_display: input.result_display ?? 'modal-full'  // ✅ Valid value
```

## Files Changed

- `features/prompt-builtins/admin/ShortcutsTableManager.tsx` - Shows warnings
- `features/prompt-builtins/services/admin-service.ts` - Fixed default
- `features/prompt-builtins/hooks/useContextMenuShortcuts.ts` - Fixed fallback
- `features/prompt-builtins/admin/PromptBuiltinsManager.tsx` - Fixed fallback
- `features/prompt-builtins/admin/PromptBuiltinEditPanel.tsx` - Fixed fallback

## Valid Values

Only these are valid for `result_display`:

- ✅ `'modal-full'` (default)
- ✅ `'modal-compact'`
- ✅ `'inline'`
- ✅ `'sidebar'`
- ✅ `'flexible-panel'`
- ✅ `'toast'`
- ✅ `'direct'`
- ✅ `'background'`

**NEVER use** ❌ `'modal'` - it's not valid!

## Questions?

See `CRITICAL_BUG_FIX_MODAL_VALUES.md` for full details.


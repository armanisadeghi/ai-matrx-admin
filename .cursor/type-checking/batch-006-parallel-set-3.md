# Batch 006: Parallel Processing - Set 3 of 3

**Date:** 2026-01-31
**Status:** ✅ Complete
**Agent:** 1154f678-e82d-4137-8270-26073b3db10c
**Parallel Group:** Part of 3-agent parallel execution (30 files total)

## Scope

Process **10 files** with TS2307 (Cannot find module) errors. All fixes are simple import path changes from barrel imports to specific module imports.

## Files to Process

1. app/api/admin/prompt-shortcuts/[id]/route.ts
2. app/api/admin/prompt-shortcuts/route.ts
3. app/api/admin/shortcut-categories/[id]/route.ts
4. app/api/admin/shortcut-categories/route.ts
5. app/entities/dynamic-options/types.ts
6. app/entities/fields/field-components/EntityRelationshipInput copy.tsx
7. app/entities/forms/EntityFormAnyRecordWithRelated.tsx
8. app/entities/forms/EntityFormCustomMinimal.tsx
9. app/entities/forms/EntityFormRecordSelections.tsx
10. app/entities/forms/EntitySheetForm.tsx

## Instructions for Sub-Agent

For each file:
1. **Read** the file to see the failing import
2. **Identify** what is being imported from the barrel export
3. **Find** the correct specific module file (use Grep if needed)
4. **Replace** the import with the specific path

### Common Patterns

- `@/types` → Usually `@/types/entityTypes` or `@/types/componentConfigTypes`
- `@/utils` → Usually `@/utils/cn` or `@/utils/utils`
- For API routes, might need to look in `/lib/` or `/utils/supabase/`
- Entity forms typically import from `@/types/entityTypes`

### What NOT to do

- NO logic changes
- NO function signature changes
- NO type modifications
- ONLY update import paths

## Expected Results

- 10 files fixed
- 10 errors resolved
- 0 errors flagged for review
- No logic changes

---

**Notes:**
- Part of 3-agent parallel execution (batches 004, 005, 006)
- Each agent processing 10 files simultaneously
- Scaling test: 30 files at once

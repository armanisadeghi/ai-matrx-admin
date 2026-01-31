# Batch 002: Entity Module Imports

**Date:** 2026-01-31
**Status:** ✅ Complete
**Agent:** TypeScript Error Cleanup Sub-Agent

## Scope

Process **4 files** from the `app/entities` area with simple import resolution errors.

## Files to Process

### 1. app/entities/fields/types.ts
- **Errors:** 1
- **Line 3, Column 34**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/types' or its corresponding type declarations.
- **Current Import:** `import { EntityKeys } from "@/types";`
- **Fix Strategy:** `import { EntityKeys } from "@/types/entityTypes";`
- **Verified:** Type exists in `/types/entityTypes.ts` line 17

### 2. app/entities/forms/EntityFormMinimal.tsx
- **Errors:** 1
- **Line 11, Column 34**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/types' or its corresponding type declarations.
- **Current Import:** `import { ComponentDensity } from '@/types';`
- **Fix Strategy:** `import { ComponentDensity } from '@/types/componentConfigTypes';`
- **Verified:** Type exists in `/types/componentConfigTypes.ts`

### 3. app/entities/hooks/crud/useDirectCreateRecord.ts
- **Errors:** 1
- **Line 5, Column 66**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/types' or its corresponding type declarations.
- **Current Import:** `import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';`
- **Fix Strategy:** `import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types/entityTypes';`
- **Verified:** All three types exist in `/types/entityTypes.ts` (lines 13, 17, 495)

### 4. app/entities/fields/field-management.tsx
- **Errors:** 1
- **Line 7, Column 24**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/utils' or its corresponding type declarations.
- **Current Import:** `import { noErrors } from '@/utils';`
- **Fix Strategy:** `import { noErrors } from '@/utils/utils';`
- **Verified:** Function exists in `/utils/utils.ts` line 25

## Instructions for Sub-Agent

1. **Read** each file to understand context
2. **Replace** the import statement with the specific import path (see Fix Strategy above)
3. **Verify** no other changes are needed
4. **Do NOT** change any logic, types, or function signatures
5. **Stop** after processing these 4 files

## Expected Results

- 4 files fixed
- 4 errors resolved
- 0 errors flagged for review
- 0 files excluded
- No logic changes
- No breaking changes

## Verification

After fixes, these files should have zero TS2307 errors.

---

**Notes:**
- All fixes are simple import path changes (barrel imports → specific module imports)
- Zero risk to functionality
- Tests system on entity-related code (different from batch 001)

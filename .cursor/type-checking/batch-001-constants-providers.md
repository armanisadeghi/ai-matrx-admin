# Batch 001: Constants & Providers (Test Run)

**Date:** 2026-01-31
**Status:** ✅ Complete
**Agent:** TypeScript Error Cleanup Sub-Agent

## Scope

Process **3 files** with simple import resolution errors.

## Files to Process

### 1. constants/chat.ts
- **Errors:** 1
- **Line 5, Column 38**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/types' or its corresponding type declarations.
- **Import:** `import { MessageRecordWithKey } from "@/types";`
- **Fix Strategy:** Change to specific import: `import { MessageRecordWithKey } from "@/types/AutomationSchemaTypes";`
- **Verified:** Type exists in `/types/AutomationSchemaTypes.ts` line 707

### 2. providers/toast-context.tsx
- **Errors:** 1
- **Line 7, Column 36**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/types' or its corresponding type declarations.
- **Import:** `import type { ToastDefaults } from '@/types';`
- **Fix Strategy:** Change to specific import: `import type { ToastDefaults } from '@/types/toast.types';`
- **Verified:** Type exists in `/types/toast.types.ts` line 2

### 3. providers/layout/Breadcrumbs.tsx
- **Errors:** 1
- **Line 7, Column 18**
- **Error Code:** TS2307
- **Message:** Cannot find module '@/utils' or its corresponding type declarations.
- **Import:** `import {cn} from "@/utils";`
- **Fix Strategy:** Change to specific import: `import {cn} from "@/utils/cn";`
- **Verified:** Function exists in `/utils/cn.ts` line 4

## Instructions for Sub-Agent

1. **Read** each file to understand context
2. **Replace** the import statement with the specific import path (see Fix Strategy above)
3. **Verify** no other changes are needed
4. **Do NOT** change any logic, types, or function signatures
5. **Stop** after processing these 3 files

## Expected Results

- 3 files fixed
- 3 errors resolved
- 0 errors flagged for review
- 0 files excluded
- No logic changes
- No breaking changes

## Verification

After fixes, run:
```bash
npx tsc --noEmit --project . | grep -E "(constants/chat.ts|providers/toast-context.tsx|providers/layout/Breadcrumbs.tsx)"
```

Should return 0 errors for these files.

---

**Notes:**
- This is a test run to validate the sub-agent process
- All fixes are simple import path changes
- Zero risk to functionality
- Easy to verify success

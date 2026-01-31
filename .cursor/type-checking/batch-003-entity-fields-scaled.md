# Batch 003: Entity Fields Area (Scaled Up)

**Date:** 2026-01-31
**Status:** ✅ Complete
**Agent:** TypeScript Error Cleanup Sub-Agent

## Scope

Process **8 files** from the `app/entities` area - SCALED UP from 4 files in batch 002.

## Files to Process

### 1. app/entities/fields/EntityRelationshipInput.tsx
- **Errors:** 1
- **Line 4, Column 20**
- **Error Code:** TS2307
- **Current Import:** `import { cn } from '@/utils';`
- **Fix Strategy:** `import { cn } from '@/utils/cn';`
- **Verified:** Function exists in `/utils/cn.ts`

### 2. app/entities/fields/field-components/add-ons/JsonEditor.tsx
- **Errors:** 1
- **Line 4, Column 20**
- **Error Code:** TS2307
- **Current Import:** `import { cn } from '@/utils';`
- **Fix Strategy:** `import { cn } from '@/utils/cn';`
- **Verified:** Function exists in `/utils/cn.ts`

### 3. app/entities/fields/field-components/relationship-fields/custom-fk-config.ts
- **Errors:** 1
- **Line 1, Column 28**
- **Error Code:** TS2307
- **Current Import:** `import { EntityKeys } from '@/types';`
- **Fix Strategy:** `import { EntityKeys } from '@/types/entityTypes';`
- **Verified:** Type exists in `/types/entityTypes.ts`

### 4. app/entities/fields/field-components/relationship-fields/custom/FieldComponentsFkCustom.tsx
- **Errors:** 1
- **Line 3, Column 31**
- **Error Code:** TS2307
- **Current Import:** `import { MatrxRecordId } from '@/types';`
- **Fix Strategy:** `import { MatrxRecordId } from '@/types/entityTypes';`
- **Verified:** Type exists in `/types/entityTypes.ts`

### 5. app/entities/fields/field-components/relationship-fields/CustomFkHandler.tsx
- **Errors:** 1
- **Line 3, Column 28**
- **Error Code:** TS2307
- **Current Import:** `import { EntityKeys } from '@/types';`
- **Fix Strategy:** `import { EntityKeys } from '@/types/entityTypes';`
- **Verified:** Type exists in `/types/entityTypes.ts`

### 6. app/entities/fields/field-components/relationship-fields/EntityForeignKeySelect.tsx
- **Errors:** 1
- **Line 5, Column 43**
- **Error Code:** TS2307
- **Current Import:** `import { EntityKeys, MatrxRecordId } from '@/types';`
- **Fix Strategy:** `import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';`
- **Verified:** Both types exist in `/types/entityTypes.ts`

### 7. app/entities/fields/field-components/relationship-fields/EntitySearchableFkSelect.tsx
- **Errors:** 1
- **Line 3, Column 43**
- **Error Code:** TS2307
- **Current Import:** `import { EntityKeys, MatrxRecordId } from '@/types';`
- **Fix Strategy:** `import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';`
- **Verified:** Both types exist in `/types/entityTypes.ts`

### 8. app/entities/forms/EntityFormMinimalAnyRecord.tsx
- **Errors:** 1
- **Line 8, Column 51**
- **Error Code:** TS2307
- **Current Import:** `import { ComponentDensity, EntityKeys, MatrxRecordId } from '@/types';`
- **Fix Strategy:** Break into two imports:
  - `import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';`
  - `import { ComponentDensity } from '@/types/componentConfigTypes';`
- **Verified:** Types exist in their respective files

## Instructions for Sub-Agent

1. **Read** each file to understand context
2. **Replace** the import statement(s) with the specific import path(s)
3. **For file #8**, split the import into two separate import statements
4. **Verify** no other changes are needed
5. **Do NOT** change any logic, types, or function signatures
6. **Stop** after processing these 8 files

## Expected Results

- 8 files fixed
- 8 errors resolved
- 0 errors flagged for review
- 0 files excluded
- No logic changes
- No breaking changes

## Verification

After fixes, these files should have zero TS2307 errors.

---

**Notes:**
- This batch is DOUBLED in size from batch 002 (8 files vs 4)
- All fixes are simple import path changes
- All files are in the entity field/form area
- Zero risk to functionality
- Testing scalability of the system

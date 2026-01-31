# Batch 005: Parallel Processing - Set 2 of 3

**Date:** 2026-01-31
**Status:** 🔄 Queued
**Agent:** Pending assignment
**Parallel Group:** Part of 3-agent parallel execution (30 files total)

## Scope

Process **10 files** with TS2307 (Cannot find module) errors. All fixes are simple import path changes from barrel imports to specific module imports.

## Files to Process

1. app/(authenticated)/tests/relationship-management/entity-json-builder/async-sequential-create/page.tsx
2. app/(authenticated)/tests/relationship-management/entity-json-builder/page.tsx
3. app/(authenticated)/tests/relationship-management/metadata-test/RelationshipDetailsCard.tsx
4. app/(authenticated)/tests/relationship-management/metadata-test/info-header.tsx
5. app/(authenticated)/tests/relationship-management/metadata-test/page.tsx
6. app/(authenticated)/tests/relationship-management/rel-with-fetch-test/ChildRecordCard.tsx
7. app/(authenticated)/tests/relationship-management/rel-with-fetch-test/EntityJsonBuilder.tsx
8. app/LiteProviders.tsx
9. app/Providers.tsx
10. app/api/admin/prompt-builtins/route.ts

## Instructions for Sub-Agent

For each file:
1. **Read** the file to see the failing import
2. **Identify** what is being imported from the barrel export
3. **Find** the correct specific module file (use Grep if needed)
4. **Replace** the import with the specific path

### Common Patterns

- `@/types` → Usually `@/types/entityTypes` or `@/types/componentConfigTypes`
- `@/utils` → Usually `@/utils/cn` or `@/utils/utils`
- `@/providers` → Check `/providers/index.ts` for the barrel export
- `@/features/*` → Look for index.ts in that feature directory

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

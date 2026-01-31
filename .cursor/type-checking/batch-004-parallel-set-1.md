# Batch 004: Parallel Processing - Set 1 of 3

**Date:** 2026-01-31
**Status:** ✅ Complete
**Agent:** 8635429a-bc1e-4a5f-a23c-32ebf59dd5b5
**Parallel Group:** Part of 3-agent parallel execution (30 files total)

## Scope

Process **10 files** with TS2307 (Cannot find module) errors. All fixes are simple import path changes from barrel imports to specific module imports.

## Files to Process

1. app/(authenticated)/apps/custom/[slug]/[appletSlug]/AppletPageClient.tsx
2. app/(authenticated)/demo/many-to-many-ui/claude/RelationshipMaker.tsx
3. app/(authenticated)/demo/many-to-many-ui/grok/RelationshipMaker.tsx
4. app/(authenticated)/entity-crud/[entityName]/[primaryKeyField]/page.tsx
5. app/(authenticated)/layout.tsx
6. app/(authenticated)/tests/dynamic-layouts/grid-demo/GridLayout.tsx
7. app/(authenticated)/tests/fetch-test/useConversationMessages.ts
8. app/(authenticated)/tests/matrx-table/components/StandardTabUtil.ts
9. app/(authenticated)/tests/relationship-management/entity-json-builder/EntityJsonBuilderWithSelect.tsx
10. app/(authenticated)/tests/relationship-management/entity-json-builder/async-direct-create/page.tsx

## Instructions for Sub-Agent

For each file:
1. **Read** the file to see the failing import
2. **Identify** what is being imported from the barrel export
3. **Find** the correct specific module file (use Grep if needed)
4. **Replace** the import with the specific path

### Common Patterns

- `@/types` → Usually `@/types/entityTypes` or `@/types/componentConfigTypes`
- `@/utils` → Usually `@/utils/cn` or `@/utils/utils`
- `@/constants` → Check `/constants/index.ts` for the barrel export
- Look for the type/function definition using Grep if unsure

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

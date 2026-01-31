# Batch 015: ULTRA Run - Agent 5/5

**Date:** 2026-01-31  
**Status:** 🔄 Queued  
**Parallel Group:** Part of 5-agent ULTRA execution (100 files total!)

## 20 Files - Hooks & Redux

1. hooks/aiCockpit/useRecipeAgentSettings.ts
2. hooks/applets/useCreateAssociatedValueBrokers.ts
3. hooks/applets/useValueBroker.ts
4. hooks/applets/useValueBrokers.ts
5. hooks/run-recipe/types.ts
6. hooks/run-recipe/useCompiledRecipe.ts
7. hooks/run-recipe/usePrepareRecipeToRun.ts
8. hooks/run-recipe/useRunRecipeVersionSelection.ts
9. hooks/useToastManager.tsx
10. lib/ai/adapters/anthropicAdapter.ts
11. lib/redux/app-builder/service/customAppletService.ts
12. lib/redux/entity/concepts/paramEntitySelectors.ts
13. lib/redux/entity/concepts/paramSelectors.ts
14. lib/redux/entity/custom-selectors/chatSelectors.ts
15. lib/redux/entity/hooks/entity-main-hooks.ts
16. lib/redux/entity/hooks/entityMainHooks.ts
17. lib/redux/entity/hooks/functions-and-args.ts
18. lib/redux/entity/hooks/useAllData.ts
19. lib/redux/entity/hooks/useCreateManyToMany.ts
20. lib/redux/entity/hooks/useEntityFetch.ts

All TS2307 import errors. Fix by changing barrel imports to specific module imports.

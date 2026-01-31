# Batch 014: ULTRA Run - Agent 4/5

**Date:** 2026-01-31  
**Status:** 🔄 Queued  
**Parallel Group:** Part of 5-agent ULTRA execution (100 files total!)

## 20 Files - Features & Hooks

1. features/prompts/hooks/usePrompts.ts
2. features/rich-text-editor/components/ColorSelection.tsx
3. features/rich-text-editor/utils/ChipUpdater.ts
4. features/rich-text-editor/utils/chipFilnder.ts
5. features/rich-text-editor/utils/enhancedChipUtils.ts
6. features/workflows-xyflow/node-editor/tabs/NodeDefinitionTab.tsx
7. features/workflows-xyflow/utils/node-utils.ts
8. features/workflows/hooks/useDataOutputComponent.ts
9. features/workflows/react-flow/nodes/NodeWrapper.tsx
10. features/workflows/utils/data-flow-manager.ts
11. hooks/ai/chat/unused/useChatInput.ts
12. hooks/ai/chat/unused/useChatStorage.ts
13. hooks/ai/chat/unused/useChatSubmission.ts
14. hooks/ai/chat/unused/useConversationCreateUpdate.ts
15. hooks/ai/chat/unused/usePromptInput.ts
16. hooks/ai/chat/useChatBasics.ts
17. hooks/ai/chat/useConversationRouting.ts
18. hooks/aiCockpit/newMessageRecordering.ts
19. hooks/aiCockpit/useMessageReordering.ts
20. hooks/aiCockpit/useProcessedRecipeMessages.ts

All TS2307 import errors. Fix by changing barrel imports to specific module imports.

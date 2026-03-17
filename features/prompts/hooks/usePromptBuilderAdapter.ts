/**
 * usePromptBuilderAdapter — adapter for /ai/prompts/edit
 *
 * Bridges the PromptBuilder's prop-drilled state into chatConversationsSlice
 * so the PromptBuilderRightPanel can eventually be replaced with ConversationShell.
 *
 * This is a thin wrapper over usePromptExecutionAdapter that also handles
 * the PromptBuilder-specific agentId resolution.
 *
 * @deprecated — use ConversationShell directly once PromptBuilder is migrated.
 */

'use client';

import { usePromptExecutionAdapter } from './usePromptExecutionAdapter';

interface UsePromptBuilderAdapterOptions {
    runId: string;
    promptId: string;
}

export function usePromptBuilderAdapter({ runId, promptId }: UsePromptBuilderAdapterOptions) {
    const { sessionId } = usePromptExecutionAdapter({
        runId,
        agentId: promptId,
        enabled: !!runId && !!promptId,
    });

    return { sessionId };
}

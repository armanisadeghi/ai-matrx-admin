'use client';

import { createContext, useContext } from 'react';
import type { AgentConfig } from './ChatContext';
import { DEFAULT_AGENTS } from '../components/AgentSelector';

// ============================================================================
// TYPES
// ============================================================================

export interface LayoutAgentContextValue {
    selectedAgent: AgentConfig;
    onAgentChange: (agent: AgentConfig) => void;
    activeConversationId: string | null;
    isLoadingConversation: boolean;
    /** Increments on every agent change — used by ChatContainer to trigger focus */
    focusKey: number;
    /** Opens the unified agent picker (bottom sheet on mobile, dialog on desktop) */
    openAgentPicker: () => void;
}

// ============================================================================
// CONTEXT + HOOK
// ============================================================================

const DEFAULT_AGENT_CONFIG: AgentConfig = {
    promptId: DEFAULT_AGENTS[0].promptId,
    name: DEFAULT_AGENTS[0].name,
    description: DEFAULT_AGENTS[0].description,
    variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
};

export const LayoutAgentContext = createContext<LayoutAgentContextValue | null>(null);

/**
 * Returns the layout-level agent/conversation context.
 * Falls back to safe defaults when rendered outside ChatLayoutShell
 * (e.g. during SSR or in tests).
 */
export function useLayoutAgent(): LayoutAgentContextValue {
    const ctx = useContext(LayoutAgentContext);
    if (!ctx) {
        return {
            selectedAgent: DEFAULT_AGENT_CONFIG,
            onAgentChange: () => {},
            activeConversationId: null,
            isLoadingConversation: false,
            focusKey: 0,
            openAgentPicker: () => {},
        };
    }
    return ctx;
}

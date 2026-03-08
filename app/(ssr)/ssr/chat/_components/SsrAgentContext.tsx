'use client';

// SsrAgentContext — Manages selected agent state for the entire SSR chat route.
//
// This is the SSR-route equivalent of the agent management inside the public route's
// ChatLayoutShell.ChatLayoutInner. It:
//   1. Holds the currently selected AgentConfig in React state.
//   2. Syncs agent state INTO ChatContext.setAgent whenever it changes.
//   3. Resolves agent from the URL `?agent=<promptId>` search param on mount.
//   4. Exposes openAgentPicker() so any component can open the full AgentPickerSheet.
//   5. Renders the AgentPickerSheet once at this level (not scattered across components).
//
// All SSR chat components (header, sidebar, welcome screen, response-mode buttons)
// read from this context so a change in one place propagates to all.

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';
import { useChatContext } from '@/features/public-chat/context/ChatContext';
import { resolveAgentFromId, DEFAULT_AGENT_CONFIG } from '@/features/public-chat/utils/agent-resolver';
import { AgentPickerSheet } from '@/features/public-chat/components/AgentPickerSheet';

// ============================================================================
// CONTEXT SHAPE
// ============================================================================

interface SsrAgentContextValue {
    selectedAgent: AgentConfig;
    onAgentChange: (agent: AgentConfig) => void;
    openAgentPicker: () => void;
}

const SsrAgentContext = createContext<SsrAgentContextValue>({
    selectedAgent: DEFAULT_AGENT_CONFIG,
    onAgentChange: () => {},
    openAgentPicker: () => {},
});

export function useSsrAgent(): SsrAgentContextValue {
    return useContext(SsrAgentContext);
}

// ============================================================================
// PROVIDER
// ============================================================================

export function SsrAgentProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const { setAgent } = useChatContext();

    // Resolve initial agent from ?agent= URL param (same as ChatWorkspace does)
    const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(() => {
        const agentId = searchParams.get('agent');
        if (agentId) {
            const resolved = resolveAgentFromId(agentId);
            if (resolved) return resolved;
        }
        return DEFAULT_AGENT_CONFIG;
    });

    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Keep ChatContext in sync whenever the agent changes
    useEffect(() => {
        console.log('[SsrAgent] Agent changed →', selectedAgent.name, selectedAgent.promptId);
        setAgent(selectedAgent);
    }, [selectedAgent, setAgent]);

    // Re-resolve agent if URL param changes (e.g. Back/Forward nav or external link)
    useEffect(() => {
        const agentId = searchParams.get('agent');
        if (!agentId) return;
        if (agentId === selectedAgent.promptId) return;

        const resolved = resolveAgentFromId(agentId);
        if (resolved) {
            console.log('[SsrAgent] URL agent changed → resolving', agentId);
            setSelectedAgent(resolved);
        }
    }, [searchParams]);

    const handleAgentChange = useCallback((agent: AgentConfig) => {
        console.log('[SsrAgent] handleAgentChange →', agent.name, agent.promptId);
        setSelectedAgent(agent);

        // Update URL with new agent (without page reload)
        const params = new URLSearchParams(window.location.search);
        params.set('agent', agent.promptId);
        // Navigate to base chat (drop any conversation ID) when switching agents
        const newUrl = `/ssr/chat?${params.toString()}`;
        window.history.pushState(null, '', newUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);

    const openAgentPicker = useCallback(() => {
        console.log('[SsrAgent] openAgentPicker called');
        setIsPickerOpen(true);
    }, []);

    return (
        <SsrAgentContext.Provider value={{ selectedAgent, onAgentChange: handleAgentChange, openAgentPicker }}>
            {/* AgentPickerSheet rendered once here — all openAgentPicker() calls open this */}
            <AgentPickerSheet
                open={isPickerOpen}
                onOpenChange={setIsPickerOpen}
                selectedAgent={selectedAgent}
                onSelect={handleAgentChange}
            />
            {children}
        </SsrAgentContext.Provider>
    );
}

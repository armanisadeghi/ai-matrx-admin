'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface MinimalPrompt {
    id: string;
    name: string;
    description: string | null;
    variable_defaults: any[] | null;
}

// ============================================================================
// SIDEBAR EVENT BUS — lightweight pub/sub for sidebar updates
// ============================================================================

type SidebarEventMap = {
    'conversation-created': { id: string; title: string };
    'conversation-updated': { id: string };
};

type SidebarEventType = keyof SidebarEventMap;

export class SidebarEvents {
    private handlers = new Map<string, Set<Function>>();

    on<T extends SidebarEventType>(event: T, handler: (data: SidebarEventMap[T]) => void) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event)!.add(handler);
        return () => {
            this.handlers.get(event)?.delete(handler);
        };
    }

    emit<T extends SidebarEventType>(event: T, data: SidebarEventMap[T]) {
        this.handlers.get(event)?.forEach(h => h(data));
    }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface AgentsContextValue {
    userPrompts: MinimalPrompt[];
    userPromptsLoading: boolean;
    userPromptsError: string | null;
    sidebarEvents: SidebarEvents;
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

export function useAgentsContext() {
    const ctx = useContext(AgentsContext);
    if (!ctx) throw new Error('useAgentsContext must be used within AgentsProvider');
    return ctx;
}

// ============================================================================
// PROVIDER — fetches user prompts once and shares across all components
// ============================================================================

export function AgentsProvider({ children }: { children: ReactNode }) {
    const [userPrompts, setUserPrompts] = useState<MinimalPrompt[]>([]);
    const [userPromptsLoading, setUserPromptsLoading] = useState(false);
    const [userPromptsError, setUserPromptsError] = useState<string | null>(null);
    const sidebarEventsRef = useRef(new SidebarEvents());

    useEffect(() => {
        let isMounted = true;

        const fetchPrompts = async () => {
            setUserPromptsLoading(true);
            setUserPromptsError(null);

            try {
                const supabase = createClient();
                let user: { id: string } | null = null;

                try {
                    const { data } = await supabase.auth.getUser();
                    user = data?.user ?? null;
                } catch {
                    // No session (public page) — no user prompts
                    if (isMounted) {
                        setUserPrompts([]);
                        setUserPromptsLoading(false);
                    }
                    return;
                }

                if (!user) {
                    if (isMounted) {
                        setUserPrompts([]);
                        setUserPromptsLoading(false);
                    }
                    return;
                }

                // Fetch only the fields needed for agent selection (no messages)
                const { data, error } = await supabase
                    .from('prompts')
                    .select('id, name, description, variable_defaults')
                    .eq('user_id', user.id)
                    .order('name', { ascending: true });

                if (isMounted) {
                    if (error) {
                        setUserPromptsError(error.message);
                        setUserPrompts([]);
                    } else {
                        setUserPrompts(data || []);
                    }
                    setUserPromptsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setUserPromptsError(err instanceof Error ? err.message : 'Failed to load prompts');
                    setUserPrompts([]);
                    setUserPromptsLoading(false);
                }
            }
        };

        // Lazy load — small delay so the page becomes interactive first
        const timer = setTimeout(fetchPrompts, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);

    const value: AgentsContextValue = {
        userPrompts,
        userPromptsLoading,
        userPromptsError,
        sidebarEvents: sidebarEventsRef.current,
    };

    return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}

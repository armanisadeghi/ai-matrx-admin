'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { PromptVariable } from '@/features/prompts/types/core';

// ============================================================================
// TYPES
// ============================================================================

export interface MinimalPrompt {
    id: string;
    name: string;
    description: string | null;
    variable_defaults: PromptVariable[] | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Lazy-load user prompts with minimal fields
 * Only fetches what's needed to run as an agent (no messages)
 */
export function useUserPrompts() {
    const [prompts, setPrompts] = useState<MinimalPrompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchPrompts = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                let user: { id: string } | null = null;

                try {
                    const { data } = await supabase.auth.getUser();
                    user = data?.user ?? null;
                } catch (authErr) {
                    // No session (e.g. public page) — treat as no user, don't surface error
                    if (isMounted) {
                        setPrompts([]);
                        setIsLoading(false);
                    }
                    return;
                }

                if (!user) {
                    if (isMounted) {
                        setPrompts([]);
                        setIsLoading(false);
                    }
                    return;
                }

                // Fetch only necessary fields
                const { data, error: fetchError } = await supabase
                    .from('prompts')
                    .select('id, name, description, variable_defaults')
                    .eq('user_id', user.id)
                    .order('name', { ascending: true });

                if (fetchError) {
                    throw fetchError;
                }

                if (isMounted) {
                    setPrompts(data || []);
                    setIsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load prompts');
                    setIsLoading(false);
                }
            }
        };

        // Lazy load - small delay to ensure page is interactive first
        const timer = setTimeout(() => {
            fetchPrompts();
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);

    return { prompts, isLoading, error };
}

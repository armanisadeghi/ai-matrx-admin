'use client';

// app/(ssr)/ssr/chat/_lib/useUserPrompts.ts
//
// Fetches the authenticated user's custom prompts for the sidebar agent list.
// Replaces the deprecated AgentsContext dependency for the SSR chat route.

import { useState, useEffect } from 'react';

export interface MinimalPrompt {
    id: string;
    name: string;
    description: string | null;
    variable_defaults: unknown[] | null;
}

export function useUserPrompts() {
    const [userPrompts, setUserPrompts] = useState<MinimalPrompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchPrompts() {
            setIsLoading(true);
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();

                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    if (!cancelled) {
                        setUserPrompts([]);
                        setIsLoading(false);
                    }
                    return;
                }

                const { data, error } = await supabase
                    .from('prompts')
                    .select('id, name, description, variable_defaults')
                    .eq('user_id', session.user.id)
                    .order('name', { ascending: true });

                if (!cancelled) {
                    setUserPrompts(error ? [] : (data || []));
                    setIsLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setUserPrompts([]);
                    setIsLoading(false);
                }
            }
        }

        const timer = setTimeout(fetchPrompts, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, []);

    return { userPrompts, userPromptsLoading: isLoading };
}

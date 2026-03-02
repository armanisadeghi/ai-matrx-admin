'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
    // Toggle this to show/hide the React Query DevTools widget
    const showDevtools = false;

    useEffect(() => {
        const t = performance.now();
        console.debug(`[perf] ReactQueryProvider mounted in ${t.toFixed(2)}ms since page start`);
    }, []);

    // Create a client instance per component mount
    // This ensures no shared state between server and client
    const [queryClient] = useState(() => {
        const t0 = performance.now();
        const client = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000,
                    retry: 1,
                    refetchOnWindowFocus: false,
                },
                mutations: {
                    retry: 1,
                },
            },
        });
        const t1 = performance.now();
        console.debug(`[perf] ReactQueryProvider QueryClient created in ${(t1 - t0).toFixed(3)}ms`);
        return client;
    });

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* React Query DevTools - toggle showDevtools variable to enable/disable */}
            {showDevtools && process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools 
                    initialIsOpen={false}
                />
            )}
        </QueryClientProvider>
    );
}


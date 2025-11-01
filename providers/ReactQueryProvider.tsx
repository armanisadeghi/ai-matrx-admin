'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
    // Toggle this to show/hide the React Query DevTools widget
    const showDevtools = false;
    
    // Create a client instance per component mount
    // This ensures no shared state between server and client
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // With SSR, we usually want to set some default staleTime
                // above 0 to avoid refetching immediately on the client
                staleTime: 60 * 1000, // 1 minute
                retry: 1,
                refetchOnWindowFocus: false,
            },
            mutations: {
                // Retry failed mutations once
                retry: 1,
            },
        },
    }));

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


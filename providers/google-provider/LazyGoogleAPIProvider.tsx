'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// ===== PERFORMANCE TIMING LOGS =====
if (typeof window !== 'undefined') {
    console.log(`[PERF] LazyGoogleAPIProvider module loaded at: ${performance.now().toFixed(2)}ms`);
}

/**
 * Lazy-loaded Google API Provider
 * 
 * Use this wrapper in components that need Google API integration.
 * The actual GoogleAPIProvider code will only be downloaded when this
 * component is rendered, keeping it out of the initial bundle.
 * 
 * Usage:
 * ```tsx
 * import { LazyGoogleAPIProvider } from '@/providers/google-provider/LazyGoogleAPIProvider';
 * 
 * function MyGoogleFeature() {
 *   return (
 *     <LazyGoogleAPIProvider>
 *       <ComponentThatUsesGoogleAPI />
 *     </LazyGoogleAPIProvider>
 *   );
 * }
 * ```
 */
const GoogleAPIProvider = dynamic(
    () => import('./GoogleApiProvider'),
    { 
        ssr: false,
        loading: () => null // Children will render without the provider during load
    }
);

interface LazyGoogleAPIProviderProps {
    children: React.ReactNode;
    scopes?: string[];
}

export function LazyGoogleAPIProvider({ children, scopes }: LazyGoogleAPIProviderProps) {
    return (
        <GoogleAPIProvider scopes={scopes}>
            {children}
        </GoogleAPIProvider>
    );
}

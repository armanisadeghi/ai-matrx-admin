'use client';

import React from 'react';
import GoogleAPIProvider from '@/providers/google-provider/GoogleApiProvider';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Public Providers
 * 
 * Wraps only essential client-side providers:
 * - ReactQueryProvider for data fetching
 * - NextThemesProvider for theme management (syncs with server-side theme cookie)
 * - GoogleAPIProvider for Google API integration
 * 
 * Theme syncs with server-side cookie set in root layout
 */
export function PublicProviders({ children }: { children: React.ReactNode }) {
    return (
        <ReactQueryProvider>
            <NextThemesProvider 
                attribute="class" 
                defaultTheme="dark"
                enableSystem={true}
                storageKey="theme"
            >
                <GoogleAPIProvider>
                    {children}
                    <Toaster />
                </GoogleAPIProvider>
            </NextThemesProvider>
        </ReactQueryProvider>
    );
}

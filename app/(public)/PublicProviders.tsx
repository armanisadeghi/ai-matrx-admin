'use client';

import React from 'react';
import GoogleAPIProvider from '@/providers/google-provider/GoogleApiProvider';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function PublicProviders({ children }: { children: React.ReactNode }) {
    return (
        <ReactQueryProvider>
            <NextThemesProvider 
                attribute="class" 
                defaultTheme="system" 
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

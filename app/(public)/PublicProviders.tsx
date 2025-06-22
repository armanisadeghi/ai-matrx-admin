'use client';

import React from 'react';
import { ThemeProvider } from "@/styles/themes";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "@/components/ui/toaster";
import GoogleAPIProvider from '@/providers/google-provider/GoogleApiProvider';

export function PublicProviders({ children }: { children: React.ReactNode }) {
    return (
        <GoogleAPIProvider>
            <HeroUIProvider>
                {children}
                <Toaster />
            </HeroUIProvider>
        </GoogleAPIProvider>
    );
}

// File: app/Providers.tsx

'use client';

import React from 'react';
import { SchemaProvider } from '@/providers/SchemaProvider';
import { NextUIProvider } from "@nextui-org/react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/styles/themes";
import StoreProvider from "@/providers/StoreProvider";

export function Providers({ children, initialReduxState }: { children: React.ReactNode, initialReduxState?: any }) {
    return (
        <StoreProvider initialState={initialReduxState}>
            <ThemeProvider defaultTheme="dark" enableSystem={false}>
                <SchemaProvider>
                    <NextUIProvider>
                        {children}
                        <Toaster/>
                    </NextUIProvider>
                </SchemaProvider>
            </ThemeProvider>
        </StoreProvider>
    );
}

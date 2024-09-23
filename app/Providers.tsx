// File location: app/Providers.tsx

'use client';

import React from 'react';
import {SchemaProvider} from '@/lib/SchemaProvider';
import {NextUIProvider} from "@nextui-org/react";
import {Toaster} from "@/components/ui/toaster";
import {ThemeProvider} from "@/styles/themes";
import StoreProvider from "@/lib/StoreProvider";

export function Providers({children}: { children: React.ReactNode }) {
    return (
        <StoreProvider>
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

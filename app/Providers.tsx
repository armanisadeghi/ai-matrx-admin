// File: app/Providers.tsx

'use client';

import React from 'react';
import { SchemaProvider } from '@/providers/SchemaProvider';
import { NextUIProvider } from "@nextui-org/react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/styles/themes";
import StoreProvider from "@/providers/StoreProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from '@/components/ui/sidebar-collapsible'; // Import SidebarProvider

export function Providers({ children, initialReduxState }: { children: React.ReactNode, initialReduxState?: any }) {
    return (
        <StoreProvider initialState={initialReduxState}>
            <ThemeProvider defaultTheme="dark" enableSystem={false}>
                <SchemaProvider>
                    <NextUIProvider>
                        <TooltipProvider>
                            <SidebarProvider>
                                {children}
                                <Toaster/>
                            </SidebarProvider>
                        </TooltipProvider>
                    </NextUIProvider>
                </SchemaProvider>
            </ThemeProvider>
        </StoreProvider>
    );
}


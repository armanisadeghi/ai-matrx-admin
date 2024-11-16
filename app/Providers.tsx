// app/Providers.tsx

'use client';

import React from 'react';
import {SchemaProvider} from '@/providers/SchemaProvider';
import {NextUIProvider} from "@nextui-org/react";
import {Toaster} from "@/components/ui/toaster";
import {ThemeProvider} from "@/styles/themes";
import StoreProvider from "@/providers/StoreProvider";
import {TooltipProvider} from "@/components/ui/tooltip";
import {InitialReduxState} from "@/types/reduxTypes";
import {SocketProvider} from '@/providers/SocketProvider';
import { RefProvider } from '@/lib/refs';

export function Providers(
    {
        children,
        initialReduxState,
    }: {
        children: React.ReactNode;
        initialReduxState?: InitialReduxState;
    }) {
    return (
        <SchemaProvider initialSchema={initialReduxState?.globalCache}>
            <StoreProvider initialState={initialReduxState}>
                <SocketProvider>
                    <ThemeProvider defaultTheme="dark" enableSystem={false}>
                        <RefProvider>
                            <NextUIProvider>
                                <TooltipProvider>
                                    {children}
                                    <Toaster/>
                                </TooltipProvider>
                            </NextUIProvider>
                        </RefProvider>
                    </ThemeProvider>
                </SocketProvider>
            </StoreProvider>
        </SchemaProvider>
    );
}

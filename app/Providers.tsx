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
import {RefProvider} from '@/lib/refs';
import {ShikiProvider} from '@/providers/ShikiProvider';
import {RecoilRoot} from 'recoil';
import { ToastProvider } from '@/providers';

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
            <RecoilRoot>
                <StoreProvider initialState={initialReduxState}>
                    <SocketProvider>
                        <ThemeProvider defaultTheme="dark" enableSystem={false}>
                            <RefProvider>
                                <NextUIProvider>
                                    <TooltipProvider>
                                        <ToastProvider>
                                            <ShikiProvider initialLanguages={['typescript', 'javascript']}>
                                                {children}
                                            </ShikiProvider>
                                            <Toaster/>
                                        </ToastProvider>
                                    </TooltipProvider>
                                </NextUIProvider>
                            </RefProvider>
                        </ThemeProvider>
                    </SocketProvider>
                </StoreProvider>
            </RecoilRoot>
        </SchemaProvider>
    );
}

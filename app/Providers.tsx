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
import {StorageProvider, ToastProvider} from '@/providers';
import {AudioModalProvider} from "@/providers/AudioModalProvider";

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
                                <StorageProvider>
                                    <NextUIProvider>
                                        <TooltipProvider>
                                            <ToastProvider>
                                                <AudioModalProvider>
                                                    <ShikiProvider initialLanguages={['typescript', 'javascript']}>
                                                        {children}
                                                    </ShikiProvider>
                                                    <Toaster/>
                                                </AudioModalProvider>
                                            </ToastProvider>
                                        </TooltipProvider>
                                    </NextUIProvider>
                                </StorageProvider>
                            </RefProvider>
                        </ThemeProvider>
                    </SocketProvider>
                </StoreProvider>
            </RecoilRoot>
        </SchemaProvider>
    );
}

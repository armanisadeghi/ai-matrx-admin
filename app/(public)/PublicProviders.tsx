'use client';

import React from 'react';
import { ThemeProvider } from "@/styles/themes";
import { NextUIProvider } from "@nextui-org/react";
import { Toaster } from "@/components/ui/toaster";

export function PublicProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
            <NextUIProvider>
                {children}
                <Toaster />
            </NextUIProvider>
        </ThemeProvider>
    );
}
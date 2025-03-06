'use client';

import React from 'react';
import { ThemeProvider } from "@/styles/themes";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "@/components/ui/toaster";

export function PublicProviders({ children }: { children: React.ReactNode }) {
    return (
            <HeroUIProvider>
                {children}
                <Toaster />
            </HeroUIProvider>
    );
}

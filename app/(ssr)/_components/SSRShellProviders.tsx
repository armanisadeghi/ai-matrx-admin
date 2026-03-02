'use client';

// SSRShellProviders — all synchronous context providers for the SSR shell.
// None of these make network calls or block rendering in any way.
// Cost: microseconds of JS context creation, invisible to the user.

import LiteStoreProvider from '@/providers/LiteStoreProvider';
import { ThemeProvider } from '@/styles/themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/providers/toast-context';
import { Toaster } from '@/components/ui/toaster';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';

interface SSRShellProvidersProps {
    children: React.ReactNode;
}

export default function SSRShellProviders({ children }: SSRShellProvidersProps) {
    return (
        <ReactQueryProvider>
            <LiteStoreProvider>
                <ThemeProvider defaultTheme="dark" enableSystem={false}>
                    <ToastProvider>
                        <TooltipProvider delayDuration={200}>
                            {children}
                            <Toaster />
                        </TooltipProvider>
                    </ToastProvider>
                </ThemeProvider>
            </LiteStoreProvider>
        </ReactQueryProvider>
    );
}

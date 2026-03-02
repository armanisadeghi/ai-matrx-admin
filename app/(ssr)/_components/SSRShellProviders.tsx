'use client';

// SSRShellProviders — all synchronous context providers for the SSR shell.
// None of these make network calls or block rendering in any way.
// Cost: microseconds of JS context creation, invisible to the user.
//
// [perf] logs appear in the browser console (DevTools) showing mount time
// relative to page start. If any value is surprisingly high, investigate.

import { useEffect } from 'react';
import LiteStoreProvider from '@/providers/LiteStoreProvider';
import { ThemeProvider } from '@/styles/themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/providers/toast-context';
import { Toaster } from '@/components/ui/toaster';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';

function TooltipProviderWithTiming({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        console.debug(`[perf] TooltipProvider mounted at ${performance.now().toFixed(2)}ms since page start`);
    }, []);
    return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
}

function SSRShellProvidersInner({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        console.debug(`[perf] SSRShellProviders (all providers) fully mounted at ${performance.now().toFixed(2)}ms since page start`);
    }, []);
    return <>{children}</>;
}

interface SSRShellProvidersProps {
    children: React.ReactNode;
}

export default function SSRShellProviders({ children }: SSRShellProvidersProps) {
    return (
        <ReactQueryProvider>
            <LiteStoreProvider>
                <ThemeProvider defaultTheme="dark" enableSystem={false}>
                    <ToastProvider>
                        <TooltipProviderWithTiming>
                            <SSRShellProvidersInner>
                                {children}
                                <Toaster />
                            </SSRShellProvidersInner>
                        </TooltipProviderWithTiming>
                    </ToastProvider>
                </ThemeProvider>
            </LiteStoreProvider>
        </ReactQueryProvider>
    );
}

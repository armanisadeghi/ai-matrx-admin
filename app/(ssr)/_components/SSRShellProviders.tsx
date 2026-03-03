'use client';

// Module evaluated = bundle downloaded + parsed. Gap to first useEffect = React hydration cost.
console.debug(`⚡SSRShellProviders module evaluated at ${performance.now().toFixed(2)}ms`);

// SSRShellProviders — all synchronous context providers for the SSR shell.
// None of these make network calls or block rendering in any way.
// Cost: microseconds of JS context creation, invisible to the user.
//
// ⚡logs appear in the browser console (DevTools) showing mount time
// relative to page start. If any value is surprisingly high, investigate.

import { MountTimer } from '@/utils/mount-timer';
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
        <MountTimer name="SSRShellProviders (outer)">
            <ReactQueryProvider>
                <LiteStoreProvider>
                    <ThemeProvider>
                        <ToastProvider>
                            <MountTimer name="TooltipProvider">
                                <TooltipProvider delayDuration={200}>
                                    <MountTimer name="SSRShellProviders (inner)">
                                        {children}
                                        <Toaster />
                                    </MountTimer>
                                </TooltipProvider>
                            </MountTimer>
                        </ToastProvider>
                    </ThemeProvider>
                </LiteStoreProvider>
            </ReactQueryProvider>
        </MountTimer>
    );
}

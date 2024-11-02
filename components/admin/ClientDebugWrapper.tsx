// components/debug/ClientDebugWrapper.tsx
'use client';

import {useEffect, useState} from 'react';
// import ReduxDebugInterface from './ReduxDebugInterface';
import {UserData} from "@/utils/userDataMapper";
import EnhancedDebugInterface from './EnhancedDebugInterface';

interface ClientDebugWrapperProps {
    user: UserData;
}

export function ClientDebugWrapper({ user }: ClientDebugWrapperProps) {
    const shouldShowDebug =
        user.userMetadata.fullName === 'Arman Sadeghi' ||
        process.env.NEXT_PUBLIC_ENV === 'development' ||
        process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';

    // Store user's debug preference
    const [isDebugEnabled, setIsDebugEnabled] = useState(() => {
        // Check localStorage for saved preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('debug-interface-enabled');
            return saved ? JSON.parse(saved) : shouldShowDebug;
        }
        return shouldShowDebug;
    });

    // Update localStorage when preference changes
    useEffect(() => {
        localStorage.setItem('debug-interface-enabled', JSON.stringify(isDebugEnabled));
    }, [isDebugEnabled]);

    // Add keyboard shortcut for toggling
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only enable for eligible users
            if (!shouldShowDebug) return;

            // Ctrl/Cmd + Shift + D to toggle debug interface
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd') {
                e.preventDefault();
                setIsDebugEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [shouldShowDebug]);

    if (!shouldShowDebug || !isDebugEnabled) return null;

    return <EnhancedDebugInterface />;
}


'use client';

// BrokerPack — Provider pack for routes that need the concept broker system.
// Used by prompt execution, app runner, and AI features.

import { GlobalBrokerRegistration } from '@/providers/GlobalBrokerRegistration';

interface BrokerPackProps {
    children: React.ReactNode;
}

export function BrokerPack({ children }: BrokerPackProps) {
    return (
        <GlobalBrokerRegistration>
            {children}
        </GlobalBrokerRegistration>
    );
}

'use client';

// AppBuilderPack — Provider pack for app builder routes.
// Combines EntityPack with broker registration.

import { EntityPack } from './EntityPack';
import { BrokerPack } from './BrokerPack';

interface AppBuilderPackProps {
    children: React.ReactNode;
}

export function AppBuilderPack({ children }: AppBuilderPackProps) {
    return (
        <EntityPack>
            <BrokerPack>
                {children}
            </BrokerPack>
        </EntityPack>
    );
}

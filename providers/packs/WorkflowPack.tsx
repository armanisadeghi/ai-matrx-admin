'use client';

// WorkflowPack — Provider pack for workflow routes.
// Combines EntityPack with broker registration.

import { EntityPack } from './EntityPack';
import { BrokerPack } from './BrokerPack';

interface WorkflowPackProps {
    children: React.ReactNode;
}

export function WorkflowPack({ children }: WorkflowPackProps) {
    return (
        <EntityPack>
            <BrokerPack>
                {children}
            </BrokerPack>
        </EntityPack>
    );
}

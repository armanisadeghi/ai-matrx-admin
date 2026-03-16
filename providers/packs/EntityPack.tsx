'use client';

// EntityPack — Provider pack for routes that need the entity system.
// Wraps children with EntitySystemProvider (on-demand schema loading),
// SchemaProvider (context for schema lookups), and EntityProvider (entity context).

import { EntitySystemProvider } from '@/providers/EntitySystemProvider';
import { EntityProvider } from '@/providers/entity-context/EntityProvider';

interface EntityPackProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function EntityPack({ children, fallback }: EntityPackProps) {
    return (
        <EntitySystemProvider fallback={fallback}>
            <EntityProvider>
                {children}
            </EntityProvider>
        </EntitySystemProvider>
    );
}

'use client';

// EntityPack — Provider pack for routes that need the entity system.
// Wraps children with EntitySystemProvider (on-demand schema loading),
// a nested SchemaProvider (overrides the parent empty context with real data),
// EntityProvider (entity context), and entity-dependent providers
// (ChipMenuProvider, EditorProvider) that were removed from global Providers.

import { EntitySystemProvider } from '@/providers/EntitySystemProvider';
import { SchemaProvider } from '@/providers/SchemaProvider';
import { EntityProvider } from '@/providers/entity-context/EntityProvider';
import { ChipMenuProvider } from '@/features/rich-text-editor/components/ChipContextMenu';
import { EditorProvider } from '@/providers/rich-text-editor/Provider';
import { useAppSelector } from '@/lib/redux/hooks';
import type { UnifiedSchemaCache } from '@/types/entityTypes';

interface EntityPackProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

function EntitySchemaHydrator({ children }: { children: React.ReactNode }) {
    const globalCache = useAppSelector((s) => (s as Record<string, unknown>).globalCache) as UnifiedSchemaCache | undefined;

    if (!globalCache?.schema) {
        return <>{children}</>;
    }

    return (
        <SchemaProvider initialSchema={globalCache}>
            <EntityProvider>
                <ChipMenuProvider>
                    <EditorProvider>
                        {children}
                    </EditorProvider>
                </ChipMenuProvider>
            </EntityProvider>
        </SchemaProvider>
    );
}

export function EntityPack({ children, fallback }: EntityPackProps) {
    return (
        <EntitySystemProvider fallback={fallback}>
            <EntitySchemaHydrator>
                {children}
            </EntitySchemaHydrator>
        </EntitySystemProvider>
    );
}

// app/(authenticated)/entity-crud/layout.tsx
import React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {ChevronRight} from 'lucide-react';
import Link from 'next/link';
import {formatName} from "@/utils/formatName";

interface EntityLayoutProps {
    children: React.ReactNode;
    params: {
        entityName?: string;
        primaryKeyField?: string;
        primaryKeyValue?: string;
    };
}

function EntityBreadcrumbs(
    {
        entityName,
        entityPrettyName,
        primaryKeyField,
        primaryKeyValue,
        fieldPrettyName
    }: {
        entityName?: string;
        entityPrettyName?: string;
        primaryKeyField?: string;
        primaryKeyValue?: string;
        fieldPrettyName?: string;
    }) {
    const displayEntityName = entityName ? formatName(entityPrettyName || entityName) : null;
    const displayFieldName = primaryKeyField ? formatName(fieldPrettyName || primaryKeyField) : null;

    return (
        <div className="flex items-center text-sm text-muted-foreground">
            <Link
                href="/entity-crud"
                className="hover:text-primary transition-colors"
            >
                Entities
            </Link>

            {displayEntityName && entityName && (
                <>
                    <ChevronRight className="h-4 w-4 mx-2"/>
                    <Link
                        href={`/entity-crud/${entityName}?entityPrettyName=${encodeURIComponent(displayEntityName)}`}
                        className="hover:text-primary transition-colors"
                    >
                        {displayEntityName}
                    </Link>
                </>
            )}

            {displayFieldName && primaryKeyValue && (
                <>
                    <ChevronRight className="h-4 w-4 mx-2"/>
                    <span className="text-primary">
                        {displayFieldName}: {primaryKeyValue}
                    </span>
                </>
            )}
        </div>
    );
}

export default function EntityLayout({children, params}: EntityLayoutProps) {
    // Log to verify what params we're getting
    console.log('Layout Params:', params);

    return (
        <div className="flex flex-col h-full">
            <div
                className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <EntityBreadcrumbs
                    entityName={params.entityName}
                    primaryKeyField={params.primaryKeyField}
                    primaryKeyValue={params.primaryKeyValue}
                />
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}

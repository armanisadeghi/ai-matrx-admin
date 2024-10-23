// providers/SchemaProvider.tsx
'use client';

import React, { createContext, useContext, useRef, useEffect } from 'react';
import type { AutomationTableStructure } from '@/types/automationTableTypes';

type SchemaContextType = {
    schema: AutomationTableStructure;
    lookups: {
        tables: Record<string, string>;
        fields: Record<string, Record<string, string>>;
    };
    resolveTableName: (variant: string) => string;
    resolveFieldName: (tableKey: string, fieldVariant: string) => string;
};

const SchemaContext = createContext<SchemaContextType | null>(null);

interface SchemaProviderProps {
    children: React.ReactNode;
    initialSchema?: {
        schema: AutomationTableStructure;
        lookups: {
            tables: Record<string, string>;
            fields: Record<string, Record<string, string>>;
        };
    };
}

export function SchemaProvider({ children, initialSchema }: SchemaProviderProps) {
    const schemaRef = useRef<SchemaContextType>({
        schema: initialSchema?.schema ?? {},
        lookups: initialSchema?.lookups ?? { tables: {}, fields: {} },
        resolveTableName: (variant: string) => {
            const normalizedVariant = variant.toLowerCase();
            return initialSchema?.lookups.tables[normalizedVariant] || variant;
        },
        resolveFieldName: (tableKey: string, fieldVariant: string) => {
            const normalizedVariant = fieldVariant.toLowerCase();
            return initialSchema?.lookups.fields[tableKey]?.[normalizedVariant] || fieldVariant;
        }
    });

    // Throw error if schema is not provided
    if (!initialSchema) {
        throw new Error('Schema must be provided to SchemaProvider');
    }

    useEffect(() => {
        import('flowbite').then((flowbite) => {
            flowbite.initFlowbite();
        });
    }, []);

    return (
        <SchemaContext.Provider value={schemaRef.current}>
            {children}
        </SchemaContext.Provider>
    );
}

// Rest of the hooks remain the same
export function useSchema() {
    const context = useContext(SchemaContext);
    if (!context) {
        throw new Error('useSchema must be used within a SchemaProvider');
    }
    return context;
}

export function useSchemaResolution() {
    const { resolveTableName, resolveFieldName } = useSchema();

    return {
        resolveTableName,
        resolveFieldName,
        resolveTableAndField: (tableVariant: string, fieldVariant: string) => {
            const tableKey = resolveTableName(tableVariant);
            return {
                tableKey,
                fieldKey: resolveFieldName(tableKey, fieldVariant)
            };
        }
    };
}

export function useTableSchema(tableVariant: string) {
    const { schema, resolveTableName } = useSchema();
    const tableKey = resolveTableName(tableVariant);
    return schema[tableKey];
}

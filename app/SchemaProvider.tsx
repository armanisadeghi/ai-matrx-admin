// File: app/SchemaProvider.tsx

'use client';

import React, { createContext, useContext } from 'react';
import { SchemaRegistry, registerSchema, TableSchema } from '@/lib/schemaRegistry';

const SchemaContext = createContext<SchemaRegistry>({});

export function useSchema() {
    return useContext(SchemaContext);
}

export function SchemaProvider({ children, initialSchemas }: { children: React.ReactNode, initialSchemas: Record<string, TableSchema> }) {
    const schemaRegistry: SchemaRegistry = {};

    for (const [frontendName, schema] of Object.entries(initialSchemas)) {
        registerSchema(frontendName, schema);
        schemaRegistry[frontendName] = schema;
    }

    return (
        <SchemaContext.Provider value={schemaRegistry}>
            {children}
        </SchemaContext.Provider>
    );
}

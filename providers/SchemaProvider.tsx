// File: app/SchemaProvider.tsx

'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { registerSchema } from '@/utils/schema/schemaRegistry';
import { initialSchemas } from '@/utils/schema/initialSchemas';
import {SchemaRegistry} from "@/types/AutomationSchemaTypes";

export const SchemaContext = createContext<SchemaRegistry>({});

export function useSchemaContext() {
    return useContext(SchemaContext);
}

export function SchemaProvider({ children }: { children: React.ReactNode }) {
    const schemaRegistry: SchemaRegistry = {};

    for (const [frontendName, schema] of Object.entries(initialSchemas)) {

        registerSchema(frontendName, schema);
        schemaRegistry[frontendName] = schema;
    }

    useEffect(() => {
        import('flowbite').then((flowbite) => {
            flowbite.initFlowbite();
        });
    }, []);

    return (
        <SchemaContext.Provider value={schemaRegistry}>
            {children}
        </SchemaContext.Provider>
    );
}

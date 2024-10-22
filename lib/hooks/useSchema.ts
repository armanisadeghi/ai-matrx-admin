// File: hooks/useSchema.ts

'use client';

import { useContext, useCallback } from 'react';
import { SchemaContext } from '@/providers/SchemaProvider';
import { registerSchema, getSchema, getRegisteredSchemaNames, globalSchemaRegistry } from '@/utils/schema/schemaRegistry';
import { TableSchema } from '@/lib/redux/concepts/tableSchemaTypes';

// Ensure that globalSchemaRegistry is exported from schemaRegistry
export { globalSchemaRegistry };

interface UseSchemaResult {
    schemaRegistry: { [key: string]: TableSchema };
    getTableSchema: (tableName: string) => TableSchema | undefined;
    registerNewSchema: (name: string, schema: TableSchema) => void;
    updateSchema: (name: string, updatedSchema: Partial<TableSchema>) => void;
    deleteSchema: (name: string) => void;
    registeredSchemas: string[];
}

export function useSchema(): UseSchemaResult {
    // Access the schema registry from the context
    const schemaRegistry = useContext(SchemaContext);

    // Retrieve all registered schemas for the 'database' format
    const registeredSchemas = getRegisteredSchemaNames('database');

    // Function to get a specific table or view schema based on its frontend name
    const getTableSchema = useCallback((tableName: string): TableSchema | undefined => {
        return getSchema(tableName, 'frontend');
    }, []);

    // Function to register a new schema dynamically
    const registerNewSchema = useCallback((name: string, schema: TableSchema) => {
        if (!schemaRegistry[name]) {
            registerSchema(name, schema);
            console.log(`Schema ${name} registered successfully.`);
        } else {
            console.warn(`Schema ${name} is already registered.`);
        }
    }, [schemaRegistry]);

    // Function to update an existing schema
    const updateSchema = useCallback((name: string, updatedSchema: Partial<TableSchema>) => {
        const existingSchema = getSchema(name, 'frontend');
        if (existingSchema) {
            const newSchema = { ...existingSchema, ...updatedSchema };
            schemaRegistry[name] = newSchema;
            globalSchemaRegistry[name] = newSchema; // Update the global registry as well
            console.log(`Schema ${name} updated successfully.`);
        } else {
            console.warn(`Schema ${name} not found. Cannot update.`);
        }
    }, [schemaRegistry]);

    // Function to delete a schema
    const deleteSchema = useCallback((name: string) => {
        if (schemaRegistry[name]) {
            delete schemaRegistry[name];
            delete globalSchemaRegistry[name];
            console.log(`Schema ${name} deleted successfully.`);
        } else {
            console.warn(`Schema ${name} not found. Cannot delete.`);
        }
    }, [schemaRegistry]);

    return {
        schemaRegistry,
        getTableSchema,
        registerNewSchema,
        updateSchema,
        deleteSchema,
        registeredSchemas,
    };
}

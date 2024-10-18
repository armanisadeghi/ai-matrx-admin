// File: components/admin/SchemaAdmin.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { useSchema } from '@/lib/hooks/useSchema';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { createTypeReference } from '@/utils/schema/schemaRegistry';
import {TableSchema} from "@/types/tableSchemaTypes";

export default function SchemaAdmin() {
    const { schemaRegistry, getTableSchema, registerNewSchema, updateSchema, registeredSchemas } = useSchema();
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [newSchemaName, setNewSchemaName] = useState<string>('');
    const [newFieldName, setNewFieldName] = useState<string>('');

    const handleSchemaSelect = useCallback((schemaName: string) => {
        setSelectedSchema(schemaName);
    }, []);

    const handleAddSchema = () => {
        if (newSchemaName) {
            const newSchema: TableSchema = {
                name: {
                    frontend: newSchemaName,
                    backend: newSchemaName.toLowerCase(),
                    database: newSchemaName.toLowerCase(),
                    pretty: newSchemaName,
                },
                schemaType: 'table', // You can update this to the appropriate type ('table', 'view', etc.)
                fields: {
                    id: {
                        alts: {
                            frontend: 'id',
                            backend: 'id',
                            database: 'id',
                            pretty: 'ID',
                        },
                        type: 'string', // Based on DataType defined in the types
                        format: 'single', // Refers to ConversionFormat
                        structure: {
                            structure: 'simple', // Refers to StructureType ('simple', 'foreignKey', etc.)
                            typeReference: createTypeReference<string>(), // Keeps the generic type reference structure
                        },
                    },
                },
                relationships: {
                    fetchStrategy: 'simple', // Default fetch strategy, you can adjust based on actual need
                    foreignKeys: [], // Array of foreign key relationships (empty by default)
                    inverseForeignKeys: [], // Array of inverse foreign key relationships (empty by default)
                    manyToMany: [], // Array of many-to-many relationships (empty by default)
                },
            };

            // Register the new schema in the global registry
            registerNewSchema(newSchemaName, newSchema);

            // Clear the input field after adding the schema
            setNewSchemaName('');
        }
    };

    const selectedSchemaDetails = selectedSchema ? getTableSchema(selectedSchema) : null;

    return (
        <div className="p-4 space-y-4">
            <Card className="bg-card">
                <CardHeader>
                    <h2 className="text-xl font-bold">Schema Manager</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium">Registered Schemas</label>
                        <Select onValueChange={handleSchemaSelect}>
                            <SelectTrigger className="w-full bg-input">
                                <SelectValue placeholder="Select a schema" />
                            </SelectTrigger>
                            <SelectContent>
                                {registeredSchemas.map((schemaName) => (
                                    <SelectItem key={schemaName} value={schemaName}>
                                        {schemaName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedSchemaDetails && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Details for: {selectedSchemaDetails.name.pretty}</h3>
                            <div className="space-y-2">
                                <h4 className="font-medium">Fields:</h4>
                                {Object.entries(selectedSchemaDetails.fields).map(([fieldName, field]) => (
                                    <div key={fieldName} className="bg-card rounded p-2">
                                        <p><strong>Field Name:</strong> {fieldName}</p>
                                        <p><strong>Type:</strong> {field.type}</p>
                                        <p><strong>Database Field:</strong> {field.alts.database}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="space-x-4">
                    <Input
                        value={newSchemaName}
                        onChange={(e) => setNewSchemaName(e.target.value)}
                        placeholder="New Schema Name"
                    />
                    <Button onClick={handleAddSchema}>Add Schema</Button>
                </CardFooter>
            </Card>
        </div>
    );
}

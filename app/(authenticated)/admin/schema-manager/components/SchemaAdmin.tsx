// /admin/schema-manager/components/SchemaAdmin.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SchemaSelect from "@/components/matrx/schema/opsRedux/SchemaSelect";
import { EntityKeys, AutomationEntity } from "@/types/entityTypes";


import {useSchema} from "@/lib/redux/schema/useSchema" // New import


export default function SchemaAdmin() {
    const [selectedSchema, setSelectedSchema] = useState<EntityKeys | null>(null);
    const [schemaDetails, setSchemaDetails] = useState<{
        schema: AutomationEntity<EntityKeys>;
        fieldsList: Array<Record<string, any>>;
    } | null>(null);
    const [newSchemaName, setNewSchemaName] = useState<string>('');

    const handleSchemaSelect = useCallback((selectedEntity: {
        entityKey: EntityKeys;
        pretty: string
    }) => {
        setSelectedSchema(selectedEntity.entityKey);
    }, []);

    const handleSchemaFetched = useCallback(<TEntity extends EntityKeys>(
        result: {
            schema: AutomationEntity<TEntity>;
            fieldsList: Array<Record<string, any>>;
        }
    ) => {
        setSchemaDetails(result as any);
    }, []);

    return (
        <div className="p-4 space-y-4">
            <Card className="bg-card">
                <CardHeader>
                    <h2 className="text-xl font-bold">Schema Manager</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium">Registered Schemas</label>
                        <SchemaSelect
                            onSchemaSelect={handleSchemaSelect}
                            onSchemaFetched={handleSchemaFetched}
                            selectedSchema={selectedSchema}
                        />
                    </div>

                    {schemaDetails && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Details for: {schemaDetails.schema.entityNameFormats.pretty}
                            </h3>
                            <div className="space-y-2">
                                <h4 className="font-medium">Fields:</h4>
                                {schemaDetails.fieldsList.map((field) => (
                                    <div key={field.fieldName} className="bg-card rounded p-2 space-y-2">
                                        {Object.entries(field).map(([key, value]) => (
                                            <p key={key}>
                                                <strong>{key}:</strong> {' '}
                                                {typeof value === 'boolean'
                                                 ? value.toString()
                                                 : value === null
                                                   ? 'null'
                                                   : typeof value === 'object'
                                                     ? JSON.stringify(value)
                                                     : value}
                                            </p>
                                        ))}
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
                        placeholder="PLACEHOLDER ONLY: New Schema Name"
                    />
                </CardFooter>
            </Card>
        </div>
    );
}

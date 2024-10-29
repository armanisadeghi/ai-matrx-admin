// File: components/admin/SchemaAdmin.tsx

'use client';

import React, {useState, useCallback} from 'react';

import {Card, CardHeader, CardContent, CardFooter} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {useSchemaResolution} from "@/providers/SchemaProvider";
import {AllEntityNameVariations, EntityField} from "@/types/entityTypes";


export default function SchemaAdmin() {

    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [newSchemaName, setNewSchemaName] = useState<string>('');
    const [newFieldName, setNewFieldName] = useState<string>('');

    const handleSchemaSelect = useCallback((schemaName: AllEntityNameVariations) => {
        setSelectedSchema(schemaName);
    }, []);

    const {
        resolveEntityKey,
        setSingleFieldsToDefault,
        resolveFieldKey,
        resolveEntityAndFieldKeys,
        getEntityNameInFormat,
        resolveEntityNameInFormat,
        getFieldNameInFormat,
        resolveFieldNameInFormat,
        findPrimaryKeyFieldKey,
        findDisplayFieldKey,
        getFieldData,
        findFieldsByCondition,
        findFieldsWithDefaultGeneratorFunction,
        getFieldsWithAttribute,
        createFormattedEntityRecord,
        getEntitySchemaInFormat,
        formatTransformers,
        generateDefaultValue,
        transformObjectBasic,
        transformObject,
        schema,
        entityNameToCanonical,
        fieldNameToCanonical,
        entityNameFormats,
        fieldNameFormats,
        databaseFields,
        enhancedDatabaseValidation,
        getAllEntitiesWithPrettyName,
        getAllEntityKeys,
        getEntitySchema,
    } = useSchemaResolution()

    const registeredSchemas = getAllEntitiesWithPrettyName();

    const selectedSchemaDetails = selectedSchema ? getEntitySchema(selectedSchema) : null;

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
                                {registeredSchemas.map(({ entityKey, pretty }) => (
                                    <SelectItem key={entityKey} value={entityKey}>
                                        {pretty}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedSchemaDetails && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Details for: {selectedSchemaDetails.entityNameFormats.pretty}
                            </h3>
                            <div className="space-y-2">
                                <h4 className="font-medium">Fields:</h4>
                                {Object.entries(selectedSchemaDetails.entityFields).map(([fieldName, field]) => (
                                    <div key={fieldName} className="bg-card rounded p-2">
                                        <p><strong>Field Name:</strong> {fieldName}</p>
                                        <p><strong>Type:</strong> {field.dataType}</p>
                                        <p><strong>Database Field:</strong> {field.fieldNameVariations.database}</p>
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
                    {/*<Button onClick={handleAddSchema}>Add Schema</Button>*/}
                </CardFooter>
            </Card>
        </div>
    );
}

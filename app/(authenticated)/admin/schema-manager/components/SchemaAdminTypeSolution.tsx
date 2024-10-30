'use client';

import React, {useState, useCallback} from 'react';
import {Card, CardHeader, CardContent, CardFooter} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import SchemaSelect from "@/components/matrx/schema/opsRedux/SchemaSelect";
import {EntityKeys, EntityFieldKeys, AutomationEntity,} from "@/types/entityTypes";

export default function SchemaAdmin() {
    const [selectedSchema, setSelectedSchema] = useState<EntityKeys | null>(null);
    const [selectedSchemaDetails, setSelectedSchemaDetails] = useState<AutomationEntity<EntityKeys> | null>(null);
    const [newSchemaName, setNewSchemaName] = useState<string>('');

    const handleSchemaSelect = useCallback((selectedEntity: {
        entityKey: EntityKeys;
        pretty: string
    }) => {
        setSelectedSchema(selectedEntity.entityKey);
    }, []);

    const handleSchemaFetched = useCallback(<TEntity extends EntityKeys>(
        schema: AutomationEntity<TEntity>
    ) => {
        setSelectedSchemaDetails(schema);
    }, []);

    const renderFieldNameVariations = (fieldNameFormats?: Record<string, string>) => {
        if (fieldNameFormats && Object.entries(fieldNameFormats).length > 0) {
            return (
                <div>
                    <strong>Field Name Variations:</strong>
                    <ul>
                        {Object.entries(fieldNameFormats).map(([variationKey, variationValue]) => (
                            <li key={variationKey}>
                                <strong>{variationKey}:</strong> {variationValue}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }
        return null;
    };

    const renderField = <TEntity extends EntityKeys>(
        schema: AutomationEntity<TEntity>,
        fieldName: EntityFieldKeys<TEntity>
    ) => {
        const field = schema.entityFields[fieldName];

        return (
            <div key={fieldName} className="bg-card rounded p-4">
                <p><strong>Field Name:</strong> {fieldName}</p>
                <p><strong>Type:</strong> {field.dataType}</p>
                <p><strong>Is Array:</strong> {field.isArray ? "Yes" : "No"}</p>
                <p><strong>Structure:</strong> {field.structure}</p>
                <p><strong>Is Native:</strong> {field.isNative ? "Yes" : "No"}</p>
                <p><strong>Type Reference:</strong> {field.typeReference.toString()}</p>
                {field.defaultComponent && <p><strong>Default Component:</strong> {field.defaultComponent}</p>}
                {field.componentProps && (
                    <p><strong>Component Props:</strong> {JSON.stringify(field.componentProps, null, 2)}</p>
                )}
                <p><strong>Is Required:</strong> {field.isRequired ? "Yes" : "No"}</p>
                <p><strong>Max Length:</strong> {field.maxLength ?? "None"}</p>
                <p><strong>Default Value:</strong> {field.defaultValue ?? "None"}</p>
                <p><strong>Is Primary Key:</strong> {field.isPrimaryKey ? "Yes" : "No"}</p>
                {field.isDisplayField &&
                    <p><strong>Is Display Field:</strong> {field.isDisplayField ? "Yes" : "No"}</p>}
                <p><strong>Default Generator Function:</strong> {field.defaultGeneratorFunction ?? "None"}</p>
                <p><strong>Validation Functions:</strong> {field.validationFunctions}</p>
                <p><strong>Exclusion Rules:</strong> {field.exclusionRules}</p>
                <p><strong>Database Table:</strong> {field.databaseTable}</p>

                {renderFieldNameVariations(field.fieldNameFormats)}
            </div>
        );
    };

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

                    {selectedSchemaDetails && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Details for: {selectedSchemaDetails.entityNameFormats.pretty}
                            </h3>
                            <div className="space-y-2">
                                <h4 className="font-medium">Fields:</h4>
                                {(Object.keys(selectedSchemaDetails.entityFields) as EntityFieldKeys<EntityKeys>[]).map(
                                    (fieldName) => renderField(selectedSchemaDetails, fieldName)
                                )}
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

// components/matrx/schema/opsRedux/SchemaSelect.tsx

'use client';

import React, {useState} from 'react';
import {useSchemaResolution} from "@/providers/SchemaProvider"; // old
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {AutomationEntity, EntityKeys} from "@/types/entityTypes";
import {useSchema} from "@/lib/redux/schema/useSchema" // New import

interface SchemaSelectProps {
    onSchemaSelect: (selectedEntity: {
        entityKey: EntityKeys;
        pretty: string
    }) => void;
    onSchemaFetched: <TEntity extends EntityKeys>(result: {
        schema: AutomationEntity<TEntity>;
        fieldsList: Array<Record<string, any>>;
    }) => void;
    selectedSchema: EntityKeys | null;
}

const SchemaSelect = <TEntity extends EntityKeys>(
    {
        onSchemaSelect,
        onSchemaFetched,
        selectedSchema
    }: SchemaSelectProps): JSX.Element => {
    const {getAllEntitiesWithPrettyName, createTypedEntitySchema} = useSchemaResolution();  // old
    const registeredSchemas = getAllEntitiesWithPrettyName();

    const [loadingSchema, setLoadingSchema] = useState(false);

    const handleSchemaSelect = (entityKey: TEntity) => {
        const selectedEntity = registeredSchemas.find(
            schema => schema.entityKey === entityKey
        );

        if (selectedEntity) {
            onSchemaSelect({
                entityKey: entityKey,
                pretty: selectedEntity.pretty
            });

            if (onSchemaFetched) {
                setLoadingSchema(true);
                try {
                    const result = createTypedEntitySchema<TEntity>(entityKey);
                    onSchemaFetched(result);
                } catch (error) {
                    console.error("Error fetching schema:", error);
                } finally {
                    setLoadingSchema(false);
                }
            }
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium">Select Table/View</label>
            <Select
                onValueChange={handleSchemaSelect}
                value={selectedSchema || undefined}
            >
                <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Select a table/view"/>
                    {loadingSchema && <span className="ml-2 text-sm text-gray-500">Loading...</span>}
                </SelectTrigger>
                <SelectContent>
                    {registeredSchemas.map(({entityKey, pretty}) => (
                        <SelectItem key={entityKey} value={entityKey}>
                            {pretty}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default SchemaSelect;

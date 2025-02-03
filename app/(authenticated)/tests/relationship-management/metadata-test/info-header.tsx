import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AllEntityFieldKeys, AllEntityFieldVariations, EntityKeys } from '@/types';
import { getEntitySelectOptions, toDbEntityName, toPrettyEntityName, toPrettyFieldName } from '@/lib/redux/entity/utils/direct-schema';
import { FullEntityRelationships } from '@/utils/schema/fullRelationships';
import { EntityMetadata } from '@/lib/redux/entity/types/stateTypes';

interface EntityHeaderProps {
    entityKey: EntityKeys | undefined;
    onEntityChange: (value: EntityKeys) => void;
    metadata: EntityMetadata | null;
    relationships: FullEntityRelationships;
}

export const EntityHeader = ({ entityKey, onEntityChange, metadata, relationships }: EntityHeaderProps) => {
    const entityOptions = getEntitySelectOptions();

    const getLabelValuePair = (label: string, value: string | number | null) => (
        <div className="flex flex-col">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
            <span className="text-sm text-neutral-900 dark:text-neutral-200">{value || '0'}</span>
        </div>
    );

    const getPrimaryKeys = () => {
        if (!metadata) return '-';
        return metadata.primaryKeyMetadata.fields.join(', ');
    };

    const getFieldCount = () => {
        if (!metadata) return '-';
        return Object.keys(metadata.entityFields).length;
    };

    const getForeignKeyCount = () => {
        return Object.keys(relationships.relationshipDetails.foreignKeys).length;
    };

    const getReferencedByCount = () => {
        return Object.keys(relationships.relationshipDetails.referencedBy).length;
    };

    const getDisplayFieldName = () => {
        if (!metadata) return '0';
        return toPrettyFieldName(entityKey, metadata.displayFieldMetadata.fieldName as AllEntityFieldKeys);
    };

    const getDefaultFetchStrategy = () => {
        if (!metadata) return '-';
        return metadata.defaultFetchStrategy;
    }
    const getConnectionInfo = () => {
        if (!metadata) return { provider: '', database: '', schema: '' };
        
        const parts = metadata.uniqueTableId.split(':');
        const providerAndDb = parts[0].split('_');
        
        return {
            provider: providerAndDb[0].charAt(0).toUpperCase() + providerAndDb[0].slice(1),
            database: providerAndDb.slice(1).join(' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            schema: parts[1].charAt(0).toUpperCase() + parts[1].slice(1)
        };
    };

    const connectionInfo = metadata ? getConnectionInfo() : { provider: '', database: '', schema: '' };

    return (
        <div className="w-full bg-white dark:bg-neutral-900 rounded-lg shadow p-2">
            <div className="grid grid-cols-12 gap-5 items-start">
                <div className="col-span-2">
                    <Select value={entityKey} onValueChange={onEntityChange}>
                        <SelectTrigger className="w-full border-2 border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200">
                            <SelectValue placeholder="Select an Entity" />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-neutral-700 bg-white dark:bg-neutral-800">
                            {entityOptions.map(({ value, label }) => (
                                <SelectItem
                                    key={value}
                                    value={value}
                                    className="text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                >
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {entityKey && (
                    <div className="col-span-10 grid grid-cols-11 gap-1">
                        {getLabelValuePair('Provider', connectionInfo.provider)}
                        {getLabelValuePair('Database', connectionInfo.database)}
                        {getLabelValuePair('Schema', connectionInfo.schema)}
                        {getLabelValuePair('Name', toPrettyEntityName(entityKey))}
                        {getLabelValuePair('Table', toDbEntityName(entityKey))}
                        {getLabelValuePair('Primary Key(s)', getPrimaryKeys())}
                        {getLabelValuePair('Fields', getFieldCount())}
                        {getLabelValuePair('Foreign Keys', getForeignKeyCount())}
                        {getLabelValuePair('Referenced By', getReferencedByCount())}
                        {getLabelValuePair('Display Field', getDisplayFieldName())}
                        {getLabelValuePair('Fetch Strategy', getDefaultFetchStrategy())}
                    </div>
                )}
            </div>
        </div>
    );
};
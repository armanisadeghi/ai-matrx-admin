import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleCard } from './info-cards';
import { EntityMetadata, EntityStateField } from '@/lib/redux/entity/types/stateTypes';


export const MetadataField = ({ label, value }: { label: string; value: string | number | null }) => (
    <div className='mb-2'>
        <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>{label}:</span>
        <span className='ml-2 text-sm text-gray-900 dark:text-gray-100'>{value === null ? 'None' : value}</span>
    </div>
);


export const EntityFieldContent = ({ entityField }: { entityField: EntityStateField }) => (
    <div className="py-2">
        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            <MetadataField
                label="Unique Column ID"
                value={entityField.uniqueColumnId}
            />
            <MetadataField
                label="Unique Field ID"
                value={entityField.uniqueFieldId}
            />
            <MetadataField
                label="Data Type"
                value={entityField.dataType}
            />
            <MetadataField
                label="Is Required"
                value={entityField.isRequired ? 'Yes' : 'No'}
            />
            <MetadataField
                label="Max Length"
                value={entityField.maxLength}
            />
            <MetadataField
                label="Is Array"
                value={entityField.isArray ? 'Yes' : 'No'}
            />
            <MetadataField
                label="Default Value"
                value={Array.isArray(entityField.defaultValue) ? entityField.defaultValue.join(', ') : entityField.defaultValue}
            />
            <MetadataField
                label="Is Primary Key"
                value={entityField.isPrimaryKey ? 'Yes' : 'No'}
            />
            <MetadataField
                label="Default Generator Function"
                value={entityField.defaultGeneratorFunction}
            />
            <MetadataField
                label="Validation Functions"
                value={entityField.validationFunctions.join(', ')}
            />
            <MetadataField
                label="Exclusion Rules"
                value={entityField.exclusionRules.join(', ')}
            />
            <MetadataField
                label="Default Component"
                value={entityField.defaultComponent}
            />
            <MetadataField
                label="Structure"
                value={entityField.structure}
            />
            <MetadataField
                label="Is Native"
                value={entityField.isNative ? 'Yes' : 'No'}
            />
            <MetadataField
                label="Type Reference"
                value={JSON.stringify(entityField.typeReference, null, 2)}
            />
            <MetadataField
                label="Entity Name"
                value={entityField.entityName}
            />
            <MetadataField
                label="Database Table"
                value={entityField.databaseTable}
            />
            <MetadataField
                label="Name"
                value={entityField.name}
            />
            <MetadataField
                label="Display Name"
                value={entityField.displayName}
            />
        </div>
    </div>
);



const EntityFieldsCard = ({ entityFields }: any) => {
    const fields = Object.values(entityFields) as EntityStateField[];
    const [activeTab, setActiveTab] = useState<string>();
    
    const groupedFields = fields.reduce((acc, field) => {
        const key = field.name;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(field);
        return acc;
    }, {} as Record<string, EntityStateField[]>);

    const fieldNames = Object.keys(groupedFields);

    useEffect(() => {
        if (fieldNames.length > 0 && !activeTab) {
            setActiveTab(fieldNames[0]);
        }
    }, [fieldNames, activeTab]);

    if (!activeTab) return null;

    return (
        <SimpleCard title="Entity Fields">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="max-w-full overflow-x-auto">
                    <TabsList className="w-full flex flex-wrap">
                        {fieldNames.map((name) => {
                            const field = groupedFields[name]?.[0];
                            if (!field) return null;
                            const prettyName = field.fieldNameFormats.pretty;
                            return (
                                <TabsTrigger
                                    key={name}
                                    value={name}
                                    className="flex-shrink-0"
                                >
                                    {prettyName}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>
                {Object.entries(groupedFields).map(([name, fields]) => (
                    <TabsContent
                        key={name}
                        value={name}
                        className="mt-2"
                    >
                        {(fields as EntityStateField[]).map((field, idx) => (
                            <EntityFieldContent
                                key={idx}
                                entityField={field}
                            />
                        ))}
                    </TabsContent>
                ))}
            </Tabs>
        </SimpleCard>
    );
};

export default EntityFieldsCard;
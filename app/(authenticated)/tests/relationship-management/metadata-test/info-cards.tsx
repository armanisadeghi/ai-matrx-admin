import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityMetadata } from '@/lib/redux/entity/types/stateTypes';

interface SimpleCardProps {
    title: string;
    children: React.ReactNode;
}

export const MetadataField = ({ label, value }: { label: string; value: string | null }) => (
    <div className='mb-2'>
        <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>{label}:</span>
        <span className='ml-2 text-sm text-gray-900 dark:text-gray-100'>{value === null ? 'None' : value}</span>
    </div>
);

export const RelationshipContent = ({ relationship }: { relationship: any }) => (
    <div className='py-2'>
        <div className='space-y-2'>
            <MetadataField
                label='Relationship Type'
                value={relationship.relationshipType}
            />
            <MetadataField
                label='Column'
                value={relationship.column}
            />
            <MetadataField
                label='Related Table'
                value={relationship.relatedTable}
            />
            <MetadataField
                label='Related Column'
                value={relationship.relatedColumn}
            />
            <MetadataField
                label='Junction Table'
                value={relationship.junctionTable}
            />
        </div>
    </div>
);



const SimpleCard = ({ title, children }: SimpleCardProps) => (
    <Card className="h-full w-full border-2 border-neutral-700">
        <CardHeader className="pb-2 bg-neutral-700 rounded-t-md mb-3">
            <CardTitle className="text-center text-neutral-200">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {children}
            </div>
        </CardContent>
    </Card>
);

const BasicInfoCard = ({ metadata }: { metadata: EntityMetadata }) => (
    <SimpleCard title="Entity Information">
        <div>
            <MetadataField
                label="Entity Name"
                value={metadata.entityName}
            />
            <MetadataField
                label="Schema Type"
                value={metadata.schemaType}
            />
            <MetadataField
                label="Field Name"
                value={metadata.displayFieldMetadata.fieldName}
            />
            <MetadataField
                label="Database Field"
                value={metadata.displayFieldMetadata.databaseFieldName}
            />
        </div>
    </SimpleCard>
);

const PrimaryKeyInfo = ({ metadata }: { metadata: EntityMetadata }) => (
    <SimpleCard title="Primary Key Information">
        <div>
            <MetadataField
                label="Type"
                value={metadata.primaryKeyMetadata.type}
            />
            <MetadataField
                label="Fields"
                value={metadata.primaryKeyMetadata.fields.join(', ')}
            />
            <MetadataField
                label="Database Fields"
                value={metadata.primaryKeyMetadata.database_fields.join(', ')}
            />
        </div>
    </SimpleCard>
);

interface RelationshipsCardProps {
    relationships: EntityMetadata['relationships'];
}

const RelationshipsCard = ({ relationships }: RelationshipsCardProps) => {
    const groupedRelationships = relationships.reduce((acc, rel) => {
        const key = rel.relatedTable.charAt(0).toUpperCase() + rel.relatedTable.slice(1);
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(rel);
        return acc;
    }, {} as { [key: string]: typeof relationships });

    const tables = Object.keys(groupedRelationships);
    const [activeTab, setActiveTab] = useState(tables[0] || '');

    useEffect(() => {
        if (tables.length > 0 && !activeTab) {
            setActiveTab(tables[0]);
        }
    }, [tables, activeTab]);

    if (!activeTab) return null;

    return (
        <SimpleCard title="Relationships">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    {tables.map((table) => (
                        <TabsTrigger
                            key={table}
                            value={table}
                            className="flex-1"
                        >
                            {table}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {Object.entries(groupedRelationships).map(([table, relationships]) => (
                    <TabsContent
                        key={table}
                        value={table}
                    >
                        {relationships.map((relationship, idx) => (
                            <RelationshipContent
                                key={idx}
                                relationship={relationship}
                            />
                        ))}
                    </TabsContent>
                ))}
            </Tabs>
        </SimpleCard>
    );
};

export { SimpleCard, BasicInfoCard, PrimaryKeyInfo, RelationshipsCard };
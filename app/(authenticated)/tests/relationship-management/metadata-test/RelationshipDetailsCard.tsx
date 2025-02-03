import { EntityKeys } from "@/types";
import { FullEntityRelationships } from "@/utils/schema/fullRelationships";
import { MetadataField, SimpleCard } from "./info-cards";
import { RelationshipDetails } from '@/utils/schema/fullRelationships';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";


interface RelationshipDetailsCardProps {
    relationships: FullEntityRelationships;
}

const RelationshipArraySection = ({ title, items }: { title: string; items: EntityKeys[] }) => (
    <div className="mb-2">
        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}:</span>
        <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
            {items.length > 0 ? items.join(', ') : '[]'}
        </span>
    </div>
);

const ForeignKeyContent = ({ details }: { details: any }) => (
    <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-md">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(details).map(([field, value]) => (
                <MetadataField
                    key={field}
                    label={field}
                    value={String(value)}
                />
            ))}
        </div>
    </div>
);

const ReferencedByContent = ({ details }: { details: any }) => (
    <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-md">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(details).map(([field, value]) => (
                <MetadataField
                    key={field}
                    label={field}
                    value={String(value)}
                />
            ))}
        </div>
    </div>
);

const ForeignKeySection = ({ foreignKeys }: { foreignKeys: RelationshipDetails['foreignKeys'] }) => {
    const keys = Object.keys(foreignKeys);
    const [activeTab, setActiveTab] = useState(keys[0] || '');

    if (keys.length === 0) {
        return <div className="text-sm text-neutral-500 dark:text-neutral-400">No foreign keys defined</div>;
    }

    return (
        <div className="mt-4">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Foreign Keys</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    {keys.map((key) => (
                        <TabsTrigger
                            key={key}
                            value={key}
                            className="flex-1"
                        >
                            {key}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {keys.map((key) => (
                    <TabsContent key={key} value={key}>
                        <ForeignKeyContent details={foreignKeys[key]} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

const ReferencedBySection = ({ referencedBy }: { referencedBy: RelationshipDetails['referencedBy'] }) => {
    const references = Object.keys(referencedBy);
    const [activeTab, setActiveTab] = useState(references[0] || '');

    if (references.length === 0) {
        return <div className="text-sm text-neutral-500 dark:text-neutral-400">No references defined</div>;
    }

    return (
        <div className="mt-4">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Referenced By</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    {references.map((ref) => (
                        <TabsTrigger
                            key={ref}
                            value={ref}
                            className="flex-1"
                        >
                            {ref}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {references.map((ref) => (
                    <TabsContent key={ref} value={ref}>
                        <ReferencedByContent details={referencedBy[ref]} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

const RelationshipDetailsCard = ({ relationships }: RelationshipDetailsCardProps) => (
    <SimpleCard title="Full Relationship Details">
        <div className="space-y-2">
            <RelationshipArraySection title="Self Referential" items={relationships.selfReferential} />
            <RelationshipArraySection title="Many to Many" items={relationships.manyToMany} />
            <RelationshipArraySection title="One to One" items={relationships.oneToOne} />
            <RelationshipArraySection title="Many to One" items={relationships.manyToOne} />
            <RelationshipArraySection title="One to Many" items={relationships.oneToMany} />
            <RelationshipArraySection title="Undefined" items={relationships.undefined} />
            <RelationshipArraySection title="Inverse References" items={relationships.inverseReferences} />
            
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-2 gap-x-4">
                    <MetadataField 
                        label="Entity Name"
                        value={relationships.relationshipDetails.entityName}
                    />
                    <MetadataField
                        label="Table Name"
                        value={relationships.relationshipDetails.tableName}
                    />
                </div>

                <ForeignKeySection foreignKeys={relationships.relationshipDetails.foreignKeys} />
                <ReferencedBySection referencedBy={relationships.relationshipDetails.referencedBy} />
            </div>
        </div>
    </SimpleCard>
);

export default RelationshipDetailsCard;
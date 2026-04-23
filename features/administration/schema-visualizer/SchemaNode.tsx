import React from 'react';
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectEntityNameFormats } from "@/lib/redux/schema/globalCacheSelectors";
import { ComponentIcon } from './ComponentIcon';
import { useSchemaVisualizerStore } from './store';
import { Eye, Key } from 'lucide-react';
import { ENTITY_FIELD_COMPONENTS } from "@/components/matrx/ArmaniForm/field-components";
import { EntityKeys } from "@/types/entityTypes";

type RelationshipType = 'foreignKey' | 'inverseForeignKey' | 'manyToMany';

interface Relationship {
    relationshipType: RelationshipType;
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

interface EntityField {
    fieldNameFormats: { pretty: string };
    dataType: string;
    isPrimaryKey?: boolean;
    isDisplayField?: boolean;
    defaultComponent?: keyof typeof ENTITY_FIELD_COMPONENTS;
}

interface Entity {
    entityNameFormats: { pretty: string };
    entityName: EntityKeys;
    schemaType: string;
    primaryKey: string | string[];
    entityFields: Record<string, EntityField>;
    relationships: Relationship[];
}

interface SchemaNodeData {
    label: string;
    entity: Entity;
}

interface SchemaNodeProps {
    data: SchemaNodeData;
}

interface FieldRowProps {
    field: EntityField;
    entityPrettyName: string;
    fieldName: string;
}

const relationshipTypes: Array<{ type: RelationshipType; title: string }> = [
    { type: 'foreignKey', title: 'Foreign Key' },
    { type: 'manyToMany', title: 'Many to Many' },
    { type: 'inverseForeignKey', title: 'Inverse Foreign Key' },
];

function FieldRow({ field, entityPrettyName, fieldName }: FieldRowProps) {
    const { setSelectedElement, setDetailsOpen } = useSchemaVisualizerStore();

    const handleFieldClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent table click
        setSelectedElement({
            type: 'field',
            entityName: entityPrettyName as EntityKeys, // Type assertion if needed
            fieldName
        });
        setDetailsOpen(true);
    };

    return (
        <div
            onClick={handleFieldClick}
            className="flex items-center justify-between py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded px-2"
        >
            <div className="flex items-center gap-2">
                {field.isPrimaryKey && (
                    <Key
                        className="w-4 h-4 text-amber-500"
                        size={16}
                        strokeWidth={2}
                    />
                )}
                {field.isDisplayField && (
                    <Eye
                        className="w-4 h-4 text-blue-500"
                        size={16}
                        strokeWidth={2}
                    />
                )}
                {field.defaultComponent && (
                    <ComponentIcon
                        component={field.defaultComponent}
                        className="w-4 h-4 text-purple-500"
                        size={16}
                        strokeWidth={2}
                    />
                )}
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {field.fieldNameFormats.pretty}
                </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                {field.dataType}
            </span>
        </div>
    );
}

function SchemaNode({ data }: SchemaNodeProps) {
    const { setSelectedElement, setDetailsOpen } = useSchemaVisualizerStore();
    const { entity } = data;
    const entityNameFormats = useAppSelector(selectEntityNameFormats);

    const handleTableClick = () => {
        setSelectedElement({
            type: 'table',
            entityName: entity.entityName // Using the actual entity name instead of pretty name
        });
        setDetailsOpen(true);
    };

    const handleRelationshipClick = (rel: Relationship, index: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedElement({
            type: 'relationship',
            entityName: entity.entityName,
            relationshipIndex: index
        });
        setDetailsOpen(true);
    };

    const relationshipsByType = relationshipTypes.reduce((acc, { type }) => {
        acc[type] = entity.relationships.filter(rel => rel.relationshipType === type);
        return acc;
    }, {} as Record<RelationshipType, Relationship[]>);

    const renderRelationships = (relationships: Relationship[], title: string) => {
        if (!relationships || relationships.length === 0) return null;

        return (
            <div key={title} className="border-b border-border pb-3">
                <h5 className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-2">{title}</h5>
                <div className="space-y-1">
                    {relationships.map((rel, index) => (
                        <div
                            key={index}
                            onClick={handleRelationshipClick(rel, index)}
                            className="flex items-center justify-between py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
                        >
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{rel.column}</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    rel.relationshipType === 'foreignKey' ? 'bg-blue-500 dark:bg-blue-400' :
                                    rel.relationshipType === 'manyToMany' ? 'bg-green-500 dark:bg-green-400' :
                                    'bg-purple-500 dark:bg-purple-400'
                                }`} />
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                    {entityNameFormats[rel.relatedTable]?.pretty}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <Handle type="target" position={Position.Top} className="!bg-gray-400 dark:!bg-gray-500" />
            <div
                onClick={handleTableClick}
                className="rounded-lg bg-textured border-border min-w-[300px] max-w-[400px] overflow-hidden shadow-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                        <h3 className="text-gray-900 dark:text-white font-large">{entity.entityNameFormats.pretty}</h3>
                        <span className="text-gray-700 dark:text-gray-200 text-sm px-2 py-1 bg-gray-100 dark:bg-gray-900/50 rounded">
                            {entity.schemaType.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="px-4 py-3 space-y-4">
                    <div className="border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Primary Key</span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                                {Array.isArray(entity.primaryKey) ? entity.primaryKey.join(', ') : entity.primaryKey}
                            </span>
                        </div>
                    </div>

                    <div className="border-b border-border pb-3">
                        <h4 className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-2">Fields</h4>
                        <div className="space-y-1">
                            {Object.entries(entity.entityFields).map(([fieldName, field]) => (
                                <FieldRow
                                    key={fieldName}
                                    field={field as EntityField}
                                    entityPrettyName={entity.entityNameFormats.pretty}
                                    fieldName={fieldName}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        {relationshipTypes.map(({ type, title }) => renderRelationships(relationshipsByType[type], title))}
                    </div>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-gray-400 dark:!bg-gray-500" />
        </>
    );
}

export default memo(SchemaNode);

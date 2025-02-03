import { DisplayFieldMetadata, PrimaryKeyMetadata } from '@/lib/redux/entity/types/stateTypes';
import { EntityKeys } from '@/types/entityTypes';
import { FetchStrategy } from './AutomationSchemaTypes';

export type EntityNameOfficial = EntityKeys;

export const createFieldId = (entityName: EntityNameOfficial, fieldName: string) => `${entityName}__${fieldName}`;

export const parseFieldId = (fieldId: string): [EntityNameOfficial, string] => {
    const [entityName, fieldName] = fieldId.split('__') as [EntityNameOfficial, string];
    return [entityName, fieldName];
};

export interface relationships {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

export interface SchemaEntity {
    entityName: EntityNameOfficial;
    schemaType: 'table' | 'view' | 'dynamic' | 'other';
    primaryKey: string | Array<string>;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    defaultFetchStrategy: FetchStrategy;
    componentProps?: Record<string, any>;
    relationships: relationships[];
}

import { EntityKeys, AnyEntityDatabaseTable, AutomationEntities, UnifiedSchemaCache } from '@/types/entityTypes';
import { SchemaEntity } from '@/types/schema';
import { FullEntityRelationships, RelationshipDetails } from '@/utils/schema/fullRelationships';

type EmptyNameMap = Partial<Record<EntityKeys, string>>;
type EmptyFieldMap = Partial<Record<EntityKeys, Record<string, string>>>;
type EmptyNestedFieldMap = Partial<Record<EntityKeys, Record<string, Record<string, string>>>>;

function emptyRelationshipDetails(): Partial<RelationshipDetails> {
    return {
        foreignKeys: {},
        referencedBy: {},
    };
}

function emptyFullEntityRelationships(): Omit<FullEntityRelationships, 'relationshipDetails'> & { relationshipDetails: Partial<RelationshipDetails> } {
    return {
        selfReferential: [],
        manyToMany: [],
        oneToOne: [],
        manyToOne: [],
        oneToMany: [],
        undefined: [],
        inverseReferences: [],
        relationshipDetails: emptyRelationshipDetails(),
    };
}

function emptySchemaEntity(): Partial<SchemaEntity> {
    return {
        schemaType: 'table',
        primaryKey: '',
        primaryKeyMetadata: { fields: [], type: 'none', database_fields: [], where_template: {} },
        displayFieldMetadata: { fieldName: null, databaseFieldName: null },
        defaultFetchStrategy: 'simple',
        relationships: [],
    };
}

export function getEmptyGlobalCache(): UnifiedSchemaCache {
    return {
        schema: {} as AutomationEntities,
        entityNames: [],
        entitiesWithoutFields: {},
        entityNameToCanonical: {},
        fieldNameToCanonical: {} as Record<EntityKeys, Record<string, string>>,
        entityNameFormats: {} as Record<EntityKeys, Record<string, string>>,
        fieldNameFormats: {} as Record<EntityKeys, Record<string, Record<string, string>>>,
        entityNameToDatabase: {} as Record<EntityKeys, string>,
        entityNameToBackend: {} as Record<EntityKeys, string>,
        entityNametoPretty: {} as Record<EntityKeys, string>,
        fieldNameToDatabase: {} as Record<EntityKeys, Record<string, string>>,
        fieldNameToBackend: {} as Record<EntityKeys, Record<string, string>>,
        fieldNameToPretty: {} as Record<EntityKeys, Record<string, string>>,
        fullEntityRelationships: {} as Record<EntityKeys, FullEntityRelationships>,
    };
}

export { emptyFullEntityRelationships, emptySchemaEntity, emptyRelationshipDetails };
export type { EmptyNameMap, EmptyFieldMap, EmptyNestedFieldMap };

// lib/redux/entity/hooks/coreHooks.ts
import { FieldKeys, AllEntityNameVariations, AnyEntityDatabaseTable, EntityKeys, ForeignKeyReference, TypeBrand } from '@/types/entityTypes';
import {
    FieldDataOptionsType,
    DataStructure,
    AutomationEntities,
    EntityNameOfficial,
    FetchStrategy,
    relationships,
    AllEntityFieldVariations,
    EntityDatabaseTable,
    NameFormat,
    UnifiedSchemaCache,
    PrettyEntityName,
    PrettyFieldName,
    BackendEntityName,
    DatabaseEntityName,
    BackendFieldName,
    DatabaseFieldName,
    AllEntityFieldKeys,
} from '@/types';
import { MatrxVariant } from '@/components/ui/types';
import { getGlobalCache } from '@/utils/schema/schema-processing/processSchema';
import { RelationshipDetails } from '@/utils/schema/fullRelationships';
import { EntityMetadata, EntityFieldRecord } from '../types/stateTypes';
import { getGlobalUserId } from '@/app/Providers';


type ComponentProps = {
    subComponent: 'default' | string;
    variant: MatrxVariant;
    size?: string;
    textSize?: string;
    textColor?: string;
    animation?: string;
    fullWidthValue?: string;
    fullWidth?: string;
    disabled?: string;
    placeholder?: string;
    className?: string;
    type?: string;
    rows?: string;
    onChange?: string;
    formatString?: string;
    [key: string]: string;
};

interface EntityStateField {
    fieldName: FieldKeys;
    fieldNameFormats: Record<string, AllEntityNameVariations>;
    uniqueColumnId: string;
    uniqueFieldId: string;
    dataType: FieldDataOptionsType;
    isRequired: boolean;
    maxLength: number;
    isArray: boolean;
    defaultValue: any;
    isPrimaryKey: boolean;
    isDisplayField?: boolean;
    defaultGeneratorFunction: string;
    validationFunctions: string[];
    exclusionRules: string[];
    defaultComponent?: string;
    componentProps: ComponentProps;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<any>;
    enumValues: string[];
    entityName: EntityKeys;
    databaseTable: AnyEntityDatabaseTable;
    foreignKeyReference: ForeignKeyReference | null;
    description: string;
    name: string;
    displayName: string;
}

type PrimaryKeyType = 'single' | 'composite' | 'none';

interface PrimaryKeyMetadata {
    type: PrimaryKeyType;
    fields: FieldKeys[];
    database_fields: string[];
    where_template: Record<string, null>;
}

interface DisplayFieldMetadata {
    fieldName: FieldKeys | null;
    databaseFieldName: string | null;
}

interface Relationship {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

interface EntityMetadataLocal {
    entityName: EntityKeys;
    uniqueTableId: string;
    uniqueEntityId: string;
    displayName: string;
    defaultFetchStrategy: FetchStrategy;
    schemaType: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    displayField?: string;
    entityFields: Record<string, EntityStateField>;
    relationships: Relationship[];
}

interface SchemaEntity {
    entityName: EntityNameOfficial;
    schemaType: 'table' | 'view' | 'dynamic' | 'other';
    primaryKey: string | Array<string>;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    defaultFetchStrategy: FetchStrategy;
    componentProps?: Record<string, any>;
    relationships: relationships[];
}

type FullEntityRelationships = {
    selfReferential: EntityKeys[];
    manyToMany: EntityKeys[];
    oneToOne: EntityKeys[];
    manyToOne: EntityKeys[];
    oneToMany: EntityKeys[];
    undefined: EntityKeys[];
    inverseReferences: EntityKeys[];
    relationshipDetails: RelationshipDetails;
};

interface UnifiedSchemaCacheLocal {
    schema: AutomationEntities;
    entityNames: EntityKeys[];
    entitiesWithoutFields: Partial<Record<EntityKeys, SchemaEntity>>;
    entityNameToCanonical: Record<string, EntityKeys>;
    fieldNameToCanonical: Record<EntityKeys, Record<string, string>>;
    entityNameFormats: Record<EntityKeys, Record<string, string>>;
    fieldNameFormats: Record<EntityKeys, Record<string, Record<string, string>>>;
    entityNameToDatabase: Record<EntityKeys, string>;
    entityNameToBackend: Record<EntityKeys, string>;
    entityNametoPretty: Record<EntityKeys, string>;
    fieldNameToDatabase: Record<EntityKeys, Record<FieldKeys, string>>;
    fieldNameToBackend: Record<EntityKeys, Record<FieldKeys, string>>;
    fieldNameToPretty: Record<EntityKeys, Record<FieldKeys, PrettyFieldName<EntityKeys, FieldKeys>>>;
    fullEntityRelationships?: Record<EntityKeys, FullEntityRelationships>;
}

export const getSchmePart = (part: keyof UnifiedSchemaCache) => {
    const cache = getGlobalCache();
    return cache[part];
};

export const getSchema = () => getSchmePart('schema');
export const getEntityNames = () => getSchmePart('entityNames');
export const getEntitiesWithoutFields = () => getSchmePart('entitiesWithoutFields');
export const getEntityNameToCanonical = () => getSchmePart('entityNameToCanonical');
export const getFieldNameToCanonical = () => getSchmePart('fieldNameToCanonical');
export const getEntityNameFormats = () => getSchmePart('entityNameFormats');
export const getFieldNameFormats = () => getSchmePart('fieldNameFormats');
export const getEntityNameToDatabase = () => getSchmePart('entityNameToDatabase');
export const getEntityNameToBackend = () => getSchmePart('entityNameToBackend');
export const getEntityNametoPretty = () => getSchmePart('entityNametoPretty');
export const getFieldNameToDatabase = () => getSchmePart('fieldNameToDatabase');
export const getFieldNameToBackend = () => getSchmePart('fieldNameToBackend');
export const getFieldNameToPretty = () => getSchmePart('fieldNameToPretty');
export const getFullEntityRelationships = () => getSchmePart('fullEntityRelationships');

const ENTITY_METADATA = new Map();

export const getEntityMetadata = (entityKey: EntityKeys) => {
    const schema = getSchema();
    if (!ENTITY_METADATA.has(entityKey)) {
        const metadata = schema[entityKey];
        console.log('entityKey', entityKey);
        console.log('metadata', metadata);
        if (metadata) {
            ENTITY_METADATA.set(entityKey, metadata);
        }
    }
    const result = ENTITY_METADATA.get(entityKey);
    return result as EntityMetadata;
};


export const toEntityKey = (entityName: AllEntityNameVariations): EntityKeys => {
    const mapping = getEntityNameToCanonical();
    return mapping[entityName];
};

export const toCanonicalField = (entityName: AllEntityNameVariations, fieldName: AllEntityFieldVariations<EntityKeys>): FieldKeys => {
    const canonicalEntity = toEntityKey(entityName);
    const fieldMappings = getFieldNameToCanonical()[canonicalEntity];
    return fieldMappings[fieldName];
};

export const formatEntityName = (entityKey: EntityKeys, format: NameFormat): AllEntityNameVariations => {
    const formats = getEntityNameFormats()[entityKey];
    return formats[format];
};

export const formatFieldName = (entityKey: EntityKeys, fieldKey: FieldKeys, format: NameFormat): AllEntityFieldVariations<EntityKeys> => {
    const formats = getFieldNameFormats()[entityKey][fieldKey];
    return formats[format];
};

export const toDbEntityName = (entityKey: EntityKeys): DatabaseEntityName<EntityKeys> => {
    const mapping = getEntityNameToDatabase();
    return mapping[entityKey];
};

export const toBackendEntityName = (entityKey: EntityKeys): BackendEntityName<EntityKeys> => {
    const mapping = getEntityNameToBackend();
    return mapping[entityKey];
};

export const toDbFieldName = (entityKey: EntityKeys, fieldKey: FieldKeys): DatabaseFieldName<EntityKeys, FieldKeys> => {
    const mapping = getFieldNameToDatabase()[entityKey];
    return mapping[fieldKey];
};

export const toBackendFieldName = (entityKey: EntityKeys, fieldKey: FieldKeys): BackendFieldName<EntityKeys, FieldKeys> => {
    const mapping = getFieldNameToBackend()[entityKey];
    return mapping[fieldKey];
};

export const toPrettyEntityName = (entityKey: EntityKeys): PrettyEntityName<EntityKeys> => {
    const mapping = getEntityNametoPretty();
    return mapping[entityKey];
};

export const toPrettyFieldName = (entityKey: EntityKeys, fieldKey: FieldKeys): PrettyFieldName<EntityKeys, FieldKeys> => {
    const mapping = getFieldNameToPretty()[entityKey];
    return mapping[fieldKey];
};

export interface EntitySelectOption {
    value: EntityKeys;
    label: PrettyEntityName<EntityKeys>;
}

export interface FieldSelectOption {
    value: FieldKeys;
    label: PrettyFieldName<EntityKeys, FieldKeys>;
}

export const getEntitySelectOptions = (): EntitySelectOption[] => {
    const entityKeys = getEntityNames() as EntityKeys[];
    return entityKeys.map((entityKey) => ({
        value: entityKey,
        label: toPrettyEntityName(entityKey),
    }));
};

export const getEntityPrettyFields = (entityKey: EntityKeys): PrettyFieldName<EntityKeys, FieldKeys>[] => {
    const fieldMappings = getFieldNameToCanonical()[entityKey];
    const fieldKeys = Object.values(fieldMappings) as FieldKeys[];
    return fieldKeys.map((fieldKey) => toPrettyFieldName(entityKey, fieldKey) as PrettyFieldName<EntityKeys, FieldKeys>);
};

export const getFieldSelectOptions = (entityKey: EntityKeys): FieldSelectOption[] => {
    const fieldMappings = getFieldNameToCanonical()[entityKey];
    const fieldKeys = Object.values(fieldMappings) as FieldKeys[];
    return fieldKeys.map((fieldKey) => ({
        value: fieldKey as FieldKeys,
        label: toPrettyFieldName(entityKey, fieldKey) as PrettyFieldName<EntityKeys, FieldKeys>,
    }));
};


export const getEntityFields = (entityKey: EntityKeys) => {
    const metadata = getEntityMetadata(entityKey);
    return metadata.entityFields as EntityFieldRecord;
};


export const getEntityFieldNames = (entityKey: EntityKeys) => {
    const metadata = getEntityMetadata(entityKey);
    return Object.keys(metadata.entityFields) as AllEntityFieldKeys[];
};

export const getEntityField = (entityKey: EntityKeys, fieldName: FieldKeys) => {
    const metadata = getEntityMetadata(entityKey);
    return metadata.entityFields[fieldName] as EntityStateField;
};

export const getEntityDefaultValues = (entityKey: EntityKeys) => {
    const entityFields = getEntityFields(entityKey);
    return Object.fromEntries(
        Object.entries(entityFields).map(([key, field]) => [key, field.defaultValue])
    ) as Record<AllEntityFieldKeys, unknown>;
};


export const hasUserIdField = (entityKey: EntityKeys): boolean => {
    const metadata = getEntityMetadata(entityKey);
    if (!metadata) return false;
    const fieldKeys = Object.keys(metadata.entityFields);
    return fieldKeys.includes('userId');
};

export const addUserIdToData = (entityKey: EntityKeys, data: any) => {
    const hasUserId = hasUserIdField(entityKey);
    const userId = getGlobalUserId();
    
    if (hasUserId && userId && !data['user_id']) {
        console.log('adding userId to data for Entity: ', entityKey, { ...data, user_id: userId });
        return { ...data, user_id: userId };
    }
    
    return data;
};




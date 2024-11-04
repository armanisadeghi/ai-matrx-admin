import {
    AutomationEntities,
    EntityComponentProps,
    EntityDefaultFetchStrategy,
    EntityKeys, EntityNameFormats,
    EntityRelationships,
    EntitySchemaType
} from "@/types/entityTypes";

export type EntityNameOfficial = EntityKeys

type TypeBrand<T> = { _typeBrand: T };

type FieldDataOptionsType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'json'
    | 'null'
    | 'undefined'
    | 'any'
    | 'function'
    | 'symbol'
    | 'union'
    | 'bigint'
    | 'date'
    | 'map'
    | 'set'
    | 'tuple'
    | 'enum'
    | 'intersection'
    | 'literal'
    | 'void'
    | 'never';

type DataStructure =
    | 'single'
    | 'array'
    | 'object'
    | 'foreignKey'
    | 'inverseForeignKey'
    | 'manyToMany';

type FetchStrategy =
    | 'simple'
    | 'fk'
    | 'ifk'
    | 'm2m'
    | 'fkAndIfk'
    | 'm2mAndFk'
    | 'm2mAndIfk'
    | 'fkIfkAndM2M'
    | 'none';


interface GlobalCacheState {
    readonly schema: AutomationEntities;
    entityNames: EntityKeys[];
    entities: Partial<Record<EntityKeys, SchemaEntity>>;
    fields: Record<string, SchemaField>;
    fieldsByEntity: Partial<Record<EntityKeys, string[]>>;
    entityNameToCanonical: Record<string, EntityKeys>;
    fieldNameToCanonical: Record<EntityKeys, Record<string, string>>;
    entityNameFormats: Record<EntityKeys, Record<string, string>>;
    fieldNameFormats: Record<EntityKeys, Record<string, Record<string, string>>>;
    entityNameToDatabase: Record<EntityKeys, string>;
    entityNameToBackend: Record<EntityKeys, string>;
    fieldNameToDatabase: Record<EntityKeys, Record<string, string>>;
    fieldNameToBackend: Record<EntityKeys, Record<string, string>>;
    isInitialized: boolean;
}

export interface SchemaField {
    fieldName: string;
    entityName: EntityNameOfficial;
    dataType: FieldDataOptionsType;
    isArray: boolean;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<any>;
    defaultComponent?: string;
    componentProps?: Record<string, unknown>;
    isRequired: boolean;
    maxLength: number;
    defaultValue: any;
    isPrimaryKey: boolean;
    isDisplayField?: boolean;
    defaultGeneratorFunction: string;
    validationFunctions: string[];
    exclusionRules: string[];
    databaseTable: string;
}

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
    defaultFetchStrategy:  "m2mAndFk" | "simple" | "m2mAndIfk" | "fk" | "none" | "fkIfkAndM2M" | "ifk" | "fkAndIfk" | "m2m";
    componentProps?: Record<string, any>;
    relationships: relationships[];
}

export const createFieldId = (entityName: EntityNameOfficial, fieldName: string) =>
    `${entityName}__${fieldName}`;

export const parseFieldId = (fieldId: string): [EntityNameOfficial, string] => {
    const [entityName, fieldName] = fieldId.split('__') as [EntityNameOfficial, string];
    return [entityName, fieldName];
};

export interface SchemaEntity {
    entityName: EntityNameOfficial;
    schemaType: 'table' | 'view' | 'dynamic' | 'other';
    primaryKey: string | Array<string>;
    defaultFetchStrategy: FetchStrategy;
    componentProps?: Record<string, any>;
    relationships: relationships[];
}




// export interface SchemaEntity<TEntity extends EntityKeys = EntityKeys> {
//     entityName: TEntity;
//     schemaType: EntitySchemaType<TEntity>;
//     defaultFetchStrategy: EntityDefaultFetchStrategy<TEntity>;
//     componentProps: EntityComponentProps<TEntity>;
//     relationships: EntityRelationships<TEntity>;
// }
//
// export interface SchemaField {
//     fieldName: string;
//     entityName: EntityKeys;
//     validationFunctions: unknown[];
//     exclusionRules: unknown[];
//
//     [key: string]: unknown;
// }


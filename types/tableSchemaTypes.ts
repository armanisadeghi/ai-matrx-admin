import {initialSchemas} from "@/utils/schema/initialSchemas";
import {getRegisteredSchemaNames} from "@/utils/schema/schemaRegistry";


const TypeBrand = Symbol('TypeBrand');
export type TypeBrand<T> = { _typeBrand: T };


export type FieldProperties = {
    alts: AltFieldNameMap;
    type: DataType;
    format: ConversionFormat;
    structure: FieldStructure;
    isRequired?: boolean;
    characterMaximumLength?: number | null;
    isArray?: boolean;
    default?: any;
    isPrimaryKey?: boolean;
    defaultGeneratorFunction?: string | null;
    validationFunctions?: string[];
    exclusionRules?: string[];
    defaultComponent?: string;
};


export interface AltFieldNameMap {
    frontend: string;
    backend: string;
    database: string;
    pretty: string;
    component?: string;
    graphql?: string;
    restApi?: string;

    [key: string]: string;
}

export interface FieldStructure {
    structure: StructureTypes;
    typeReference: TypeBrand<any>;
    databaseTable?: TableName;
}

export type ConversionFormat = 'single' | 'array' | 'object';


export type DataType =
    | 'string' | 'number' | 'boolean' | 'array' | 'object'
    | 'null' | 'undefined' | 'any' | 'function' | 'symbol'
    | 'bigint' | 'date' | 'map' | 'set' | 'tuple' | 'enum'
    | 'union' | 'intersection' | 'literal' | 'void' | 'never'
    | 'stringArray' | 'objectArray';

export type InferFieldType<T extends FieldProperties> =
    T['isRequired'] extends false
        ? (T['isArray'] extends true ? Array<InferBaseType<T>> | null | undefined : InferBaseType<T> | null | undefined)
        : (T['isArray'] extends true ? Array<InferBaseType<T>> : InferBaseType<T>);

export type InferBaseType<T extends FieldProperties> =
    T['type'] extends 'string' ? string :
        T['type'] extends 'number' ? number :
            T['type'] extends 'boolean' ? boolean :
                T['type'] extends 'date' ? Date :
                    T['type'] extends 'object' ? Record<string, unknown> :
                        T['type'] extends 'stringArray' ? Array<string> :
                            T['type'] extends 'objectArray' ? Array<Record<string, unknown>> :
                                unknown;


type InferStructureType<T extends FieldStructure> =
    T['structure'] extends 'simple' ? unknown :
        T['structure'] extends 'foreignKey' ? (T['databaseTable'] extends TableName ? InferSchemaType<SchemaRegistry[T['databaseTable']]> : never) :
            T['structure'] extends 'inverseForeignKey' ? (T['databaseTable'] extends TableName ? Array<InferSchemaType<SchemaRegistry[T['databaseTable']]>> : never) :
                T['structure'] extends 'manyToMany' ? (T['databaseTable'] extends TableName ? Array<InferSchemaType<SchemaRegistry[T['databaseTable']]>> : never) :
                    unknown;

export type StructureTypes = "simple" | "foreignKey" | "inverseForeignKey" | "manyToMany";
export type DataFormat = 'frontend' | 'backend' | 'database' | 'component' | 'pretty' | 'graphql' | 'restApi';


export interface SchemaRegistry {
    [tableName: string]: TableSchema;
}

export interface AltTableNameMap {
    frontend: string;
    backend: string;
    database: string;
    pretty: string;
    component?: string;
    graphql?: string;
    restApi?: string;

    [key: string]: string;
}

export type SchemaType = 'table' | 'view' ;

export type TableFieldSchema = {
    [key: string]: FieldProperties;
};




export interface TableSchema {
    name: AltTableNameMap;
    schemaType: SchemaType;
    fields: TableFieldSchema;
    relationships: TableRelationship;
    description?: string;
}

export type TableName = keyof typeof initialSchemas;



export type InferSchemaType<T extends TableSchema> = {
    [K in keyof T['fields']]: InferFieldType<T['fields'][K]>;
};




export type TableFieldTypes = {
    [K in TableName]: InferSchemaType<typeof initialSchemas[K]>
};


export type TableFields<T extends keyof SchemaRegistry> = InferSchemaType<SchemaRegistry[T]>;
export type FieldType<T extends keyof SchemaRegistry, F extends keyof TableFields<T>> = TableFields<T>[F];
export type FieldNames<T extends keyof SchemaRegistry> = keyof TableFields<T>;



export interface TableRelationship {
    fetchStrategy: FetchStrategy;
    foreignKeys: ForeignKeyRelation[];
    inverseForeignKeys: InverseForeignKeyRelation[];
    manyToMany: ManyToManyRelation[];
}


type FetchStrategy = 'simple' | 'fk' | 'ifk' | 'm2m' | 'fkAndIfk' | 'm2mAndFk' | 'm2mAndIfk' | 'fkIfkAndM2M';

type ForeignKeyRelation = {
    column: DatabaseFieldName;
    relatedTable: string;
    relatedColumn: DatabaseFieldName;
};

type InverseForeignKeyRelation = {
    relatedTable: string;
    relatedColumn: DatabaseFieldName;
    mainTableColumn: DatabaseFieldName;
};

type ManyToManyRelation = {
    junctionTable: string;
    relatedTable: string;
    mainTableColumn: DatabaseFieldName;
    relatedTableColumn: DatabaseFieldName;
};


export type AltOptionKeys<T extends TableSchema> = keyof T['name']; // Not sure if this is even accurate


export type TableNameResolver<T extends keyof SchemaRegistry, V extends keyof SchemaRegistry[T]['name']> = SchemaRegistry[T]['name'][V];
export type ResolveFrontendTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'frontend'>;
export type ResolveDatabaseTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'database'>;
export type ResolveBackendTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'backend'>;
export type ResolvePrettyTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'pretty'>;

export type AnyTableName<T extends keyof SchemaRegistry> =
    ResolveFrontendTableName<T> |
    ResolveBackendTableName<T> |
    ResolveDatabaseTableName<T> |
    ResolvePrettyTableName<T>;


export type ResolveTableName<T extends keyof SchemaRegistry, V extends keyof SchemaRegistry[T]['name']> = SchemaRegistry[T]['name'][V];


// Example usage
type AiTableNameInFormat<F extends keyof SchemaRegistry['aiEndpoint']['name']> = ResolveTableName<'aiEndpoint', F>;


export const databaseSchemaNames = getRegisteredSchemaNames('database');
export const frontendSchemasNames = getRegisteredSchemaNames('frontend');
export const backendSchemasNames = getRegisteredSchemaNames('backend');


// Utility types for accessing nested properties
export type NestedProp<T, K extends string> = K extends keyof T
    ? T[K]
    : K extends `${infer A}.${infer B}`
        ? A extends keyof T
            ? NestedProp<T[A], B>
            : never
        : never;

// Utility functions
export function createTypeReference<T>(): TypeBrand<T> {
    return {} as TypeBrand<T>;
}


export type FieldNameKey = keyof AltFieldNameMap;

export type FrontendFieldName = AltFieldNameMap['frontend'];
export type DatabaseFieldName = AltFieldNameMap['database'];


export function fieldName<T extends TableName, F extends FieldNames<T>>(table: T, field: F): F {
    return field;
}

export function tableName<T extends TableName>(table: T): T {
    return table;
}


// Generate types for each table  -- Not working. TypeScript is NOT inferring the details of the tables.
export type ActionType = TableFieldTypes["action"];

// Should all of these actually be "export type ActionType = SchemaRegistry["action"];"?????

export type AiEndpointType = TableFieldTypes["aiEndpoint"];
export type AiModelType = TableFieldTypes["aiModel"];
export type ArgType = TableFieldTypes["arg"];
export type AutomationBoundaryBrokerType = TableFieldTypes["automationBoundaryBroker"];
export type AutomationMatrixType = TableFieldTypes["automationMatrix"];
export type BrokerType = TableFieldTypes["broker"];
export type DataInputComponentType = TableFieldTypes["dataInputComponent"];
export type DataOutputComponentType = TableFieldTypes["dataOutputComponent"];
export type DisplayOptionType = TableFieldTypes["displayOption"];
export type EmailsType = TableFieldTypes["emails"];
export type ExtractorType = TableFieldTypes["extractor"];
export type FlashcardDataType = TableFieldTypes["flashcardData"];
export type FlashcardHistoryType = TableFieldTypes["flashcardHistory"];
export type FlashcardImagesType = TableFieldTypes["flashcardImages"];
export type FlashcardSetRelationsType = TableFieldTypes["flashcardSetRelations"];
export type FlashcardSetsType = TableFieldTypes["flashcardSets"];
export type ProcessorType = TableFieldTypes["processor"];
export type RecipeType = TableFieldTypes["recipe"];
export type RecipeBrokerType = TableFieldTypes["recipeBroker"];
export type RecipeDisplayType = TableFieldTypes["recipeDisplay"];
export type RecipeFunctionType = TableFieldTypes["recipeFunction"];
export type RecipeModelType = TableFieldTypes["recipeModel"];
export type RecipeProcessorType = TableFieldTypes["recipeProcessor"];
export type RecipeToolType = TableFieldTypes["recipeTool"];
export type RegisteredFunctionType = TableFieldTypes["registeredFunction"];
export type SystemFunctionType = TableFieldTypes["systemFunction"];
export type ToolType = TableFieldTypes["tool"];
export type TransformerType = TableFieldTypes["transformer"];
export type UserPreferencesType = TableFieldTypes["userPreferences"];


export interface FrontendTableSchema extends Omit<TableSchema, 'name'> {
    frontendTableName: string;
}

export interface DatabaseTableSchema extends Omit<TableSchema, 'name'> {
    databaseTableName: string;
}

export interface BackendTableSchema extends Omit<TableSchema, 'name'> {
    backendTableName: string;
}

export interface PrettyTableSchema extends Omit<TableSchema, 'name'> {
    prettyTableName: string;
}

export interface CustomTableSchema extends Omit<TableSchema, 'name'> {
    customName: string;
    customFormat: DataFormat;
}

export interface FrontendFieldConverter extends Omit<FieldProperties, 'alts'> {
    frontendFieldName: string;
}

export interface DatabaseFieldConverter extends Omit<FieldProperties, 'alts'> {
    databaseFieldName: string;
}

export interface BackendFieldConverter<T> extends Omit<FieldProperties, 'alts'> {
    backendFieldName: string;
}

export interface PrettyFieldConverter<T> extends Omit<FieldProperties, 'alts'> {
    prettyFieldName: string;
}

export interface CustomFieldConverter<T> extends Omit<FieldProperties, 'alts'> {
    customFieldName: string;
    customFormat: DataFormat;
}


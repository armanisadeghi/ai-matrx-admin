import { initialSchemas } from "@/utils/schema/initialSchemas";
import {getRegisteredSchemaNames} from "@/utils/schema/schemaRegistry";

// Basic types
export type SchemaType = 'table' | 'view' | 'function' | 'procedure';

export type DataType =
    | 'string' | 'number' | 'boolean' | 'array' | 'object'
    | 'null' | 'undefined' | 'any' | 'function' | 'symbol'
    | 'bigint' | 'date' | 'map' | 'set' | 'tuple' | 'enum'
    | 'union' | 'intersection' | 'literal' | 'void' | 'never'
    | 'stringArray' | 'objectArray';

export type ConversionFormat = 'single' | 'array' | 'object';
export type StructureTypes = "simple" | "foreignKey" | "inverseForeignKey" | "manyToMany";
export type DataFormat = 'frontend' | 'backend' | 'database' | 'component' | 'pretty' | 'graphql' | 'restApi';

// Type brand for type safety
const TypeBrand = Symbol('TypeBrand');
export type TypeBrand<T> = { _typeBrand: T };

// Field structure
export interface FieldStructure<T> {
    structure: StructureTypes;
    typeReference: TypeBrand<T>;
    databaseTable?: string;
}

// Common field properties
type CommonFieldProperties = {
    isRequired?: boolean;
    characterMaximumLength?: number | null;
    isArray?: boolean;
    default?: any;
    isPrimaryKey?: boolean;
    defaultGeneratorFunction?: string | null;
    validationFunctions?: string[];
    exclusionRules?: string[];
    defaultComponent?: string;
    description?: string; // Added for documentation
};

// Field converter
export interface FieldConverter<T> extends CommonFieldProperties {
    alts: AltOptions;
    type: DataType;
    format: ConversionFormat;
    structure: FieldStructure<T>;
}

export type ConverterMap = {
    [key: string]: FieldConverter<any>;
};

// Alternative options for naming
export interface AltOptions {
    frontend: string;
    backend: string;
    database: string;
    pretty: string;
    component?: string;
    graphql?: string;
    restApi?: string;
    schema?: string;
    test?: string;
    migration?: string;
    logging?: string;
    constant?: string;
    cli?: string;
    [key: string]: string | undefined;
}



// Table schema
export interface TableSchema {
    name: AltOptions;
    schemaType: SchemaType;
    fields: ConverterMap;
    relationships: TableRelationship;
    description?: string;
}

export interface SchemaRegistry {
    [tableName: string]: TableSchema;
}

// Relationship types
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

export interface TableRelationship {
    fetchStrategy: FetchStrategy;
    foreignKeys: ForeignKeyRelation[];
    inverseForeignKeys: InverseForeignKeyRelation[];
    manyToMany: ManyToManyRelation[];
}

// Improved type inference
export type InferSchemaType<T extends TableSchema> = {
    [K in keyof T['fields']]: InferFieldType<T['fields'][K]>;
};

type InferFieldType<T extends FieldConverter<any>> =
    T['isRequired'] extends false
        ? (T['isArray'] extends true ? Array<InferBaseType<T>> | null | undefined : InferBaseType<T> | null | undefined)
        : T['isArray'] extends true ? Array<InferBaseType<T>> : InferBaseType<T>;

type InferBaseType<T extends FieldConverter<any>> =
    T['type'] extends 'string' ? string :
    T['type'] extends 'number' ? number :
    T['type'] extends 'boolean' ? boolean :
    T['type'] extends 'date' ? Date :
    T['type'] extends 'object' ? Record<string, unknown> :
    T['type'] extends 'array' ? Array<unknown> :
    T['type'] extends 'stringArray' ? Array<string> :
    T['type'] extends 'objectArray' ? Array<Record<string, unknown>> :
    unknown;

type InferStructureType<T extends FieldStructure<any>> =
    T['structure'] extends 'simple' ? unknown :
    T['structure'] extends 'foreignKey' ? (T['databaseTable'] extends TableNames ? TableSchemaTypes[T['databaseTable']] : never) :
    T['structure'] extends 'inverseForeignKey' ? (T['databaseTable'] extends TableNames ? Array<TableSchemaTypes[T['databaseTable']]> : never) :
    T['structure'] extends 'manyToMany' ? (T['databaseTable'] extends TableNames ? Array<TableSchemaTypes[T['databaseTable']]> : never) :
    unknown;


export type TableSchemaTypes = {
    [K in keyof typeof initialSchemas]: {
        [F in keyof typeof initialSchemas[K]['fields']]: InferFieldType<typeof initialSchemas[K]['fields'][F]>;
    };
};




export type TableNames = Extract<keyof typeof initialSchemas, string>;







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
    ResolvePrettyTableName<T>;  // Add other formats as needed


export type ResolveTableName<T extends keyof SchemaRegistry, V extends keyof SchemaRegistry[T]['name']> = SchemaRegistry[T]['name'][V];



// Example usage
type AiTableNameInFormat<F extends keyof SchemaRegistry['aiEndpoint']['name']> = ResolveTableName<'aiEndpoint', F>;




export const databaseSchemas = getRegisteredSchemaNames('database');
export const frontendSchemas = getRegisteredSchemaNames('frontend');
export const backendSchemas = getRegisteredSchemaNames('backend');



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


export type FieldNameKey = keyof AltOptions;

export type FrontendFieldName = AltOptions['frontend'];
export type DatabaseFieldName = AltOptions['database'];


export function fieldName<T extends TableNames, F extends FieldNames<T>>(table: T, field: F): F {
    return field;
}

export function tableName<T extends TableNames>(table: T): T {
    return table;
}

// Additional utility types
export type FieldType<T extends keyof TableSchemaTypes, F extends keyof TableSchemaTypes[T]> = TableSchemaTypes[T][F];
export type FieldNames<T extends keyof TableSchemaTypes> = keyof TableSchemaTypes[T];

// Schema types
export type SchemaTypes = {
    [K in keyof typeof initialSchemas]: InferSchemaType<typeof initialSchemas[K]>
};

// Generate types for each table
export type ActionType = SchemaTypes["action"];
export type AiEndpointType = SchemaTypes["aiEndpoint"];
export type AiModelType = SchemaTypes["aiModel"];
export type ArgType = SchemaTypes["arg"];
export type AutomationBoundaryBrokerType = SchemaTypes["automationBoundaryBroker"];
export type AutomationMatrixType = SchemaTypes["automationMatrix"];
export type BrokerType = SchemaTypes["broker"];
export type DataInputComponentType = SchemaTypes["dataInputComponent"];
export type DataOutputComponentType = SchemaTypes["dataOutputComponent"];
export type DisplayOptionType = SchemaTypes["displayOption"];
export type EmailsType = SchemaTypes["emails"];
export type ExtractorType = SchemaTypes["extractor"];
export type FlashcardDataType = SchemaTypes["flashcardData"];
export type FlashcardHistoryType = SchemaTypes["flashcardHistory"];
export type FlashcardImagesType = SchemaTypes["flashcardImages"];
export type FlashcardSetRelationsType = SchemaTypes["flashcardSetRelations"];
export type FlashcardSetsType = SchemaTypes["flashcardSets"];
export type ProcessorType = SchemaTypes["processor"];
export type RecipeType = SchemaTypes["recipe"];
export type RecipeBrokerType = SchemaTypes["recipeBroker"];
export type RecipeDisplayType = SchemaTypes["recipeDisplay"];
export type RecipeFunctionType = SchemaTypes["recipeFunction"];
export type RecipeModelType = SchemaTypes["recipeModel"];
export type RecipeProcessorType = SchemaTypes["recipeProcessor"];
export type RecipeToolType = SchemaTypes["recipeTool"];
export type RegisteredFunctionType = SchemaTypes["registeredFunction"];
export type SystemFunctionType = SchemaTypes["systemFunction"];
export type ToolType = SchemaTypes["tool"];
export type TransformerType = SchemaTypes["transformer"];
export type UserPreferencesType = SchemaTypes["userPreferences"];


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

export interface FrontendFieldConverter<T> extends Omit<FieldConverter<T>, 'alts'> {
    frontendFieldName: string;
}

export interface DatabaseFieldConverter<T> extends Omit<FieldConverter<T>, 'alts'> {
    databaseFieldName: string;
}

export interface BackendFieldConverter<T> extends Omit<FieldConverter<T>, 'alts'> {
    backendFieldName: string;
}

export interface PrettyFieldConverter<T> extends Omit<FieldConverter<T>, 'alts'> {
    prettyFieldName: string;
}

export interface CustomFieldConverter<T> extends Omit<FieldConverter<T>, 'alts'> {
    customFieldName: string;
    customFormat: DataFormat;
}


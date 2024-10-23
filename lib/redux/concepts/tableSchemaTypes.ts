import {AutomationTableName, NameFormat, TypeBrand} from "@/types/AutomationSchemaTypes";
import {getGlobalCache} from "@/utils/schema/precomputeUtil";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";
import {getRegisteredSchemaNames} from "@/utils/schema/schemaRegistry";


export type RelationshipType = 'foreignKey' | 'inverseForeignKey' | 'manyToMany';


export type SchemaTableName = keyof typeof initialAutomationTableSchema;

type InitialSchemas = typeof initialAutomationTableSchema;





export type StringKeysOnly<T> = {
    [K in Extract<keyof T, string>]: T[K]
};

type ValueOf<T> = T[keyof T];







export const databaseSchemaNames = getRegisteredSchemaNames('databaseName');
export const frontendSchemasNames = getRegisteredSchemaNames('frontendName');
export const backendSchemasNames = getRegisteredSchemaNames('backendName');


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


export type FieldNameKey = keyof NameFormat;

// export type FrontendFieldName = NameFormat['frontend'];
// export type DatabaseFieldName = NameFormat['database'];
//
//
// export function fieldName<T extends SchemaTableName, F extends FieldNames<T>>(table: T, field: F): F {
//     return field;
// }

export function tableName<T extends SchemaTableName>(table: T): T {
    return table;
}




export type DataFormat =
    'frontendName'
    | 'backendName'
    | 'databaseName'
    | 'prettyName'
    | 'componentName'
    | 'kebabName'
    | 'others';


export interface FrontendTableSchema extends Omit<AutomationTableName, 'entityNameVariations'> {
    frontendTableName: string;
}

export interface DatabaseTableSchema extends Omit<AutomationTableName, 'tableNameVariations'> {
    databaseTableName: string;
}

export interface BackendTableSchema extends Omit<AutomationTableName, 'tableNameVariations'> {
    backendTableName: string;
}

export interface PrettyTableSchema extends Omit<AutomationTableName, 'tableNameVariations'> {
    prettyTableName: string;
}

export interface CustomTableSchema extends Omit<AutomationTableName, 'tableNameVariations'> {
    customName: string;
    customFormat: DataFormat;
}

// export interface FrontendFieldConverter extends Omit<FieldProperties, 'fieldNameVariations'> {
//     frontendFieldName: string;
// }
//
// export interface DatabaseFieldConverter extends Omit<FieldProperties, 'fieldNameVariations'> {
//     databaseFieldName: string;
// }
//
// export interface BackendFieldConverter<T> extends Omit<FieldProperties, 'fieldNameVariations'> {
//     backendFieldName: string;
// }
//
// export interface PrettyFieldConverter<T> extends Omit<FieldProperties, 'fieldNameVariations'> {
//     prettyFieldName: string;
// }
//
// export interface CustomFieldConverter<T> extends Omit<FieldProperties, 'fieldNameVariations'> {
//     customFieldName: string;
//     customFormat: DataFormat;
// }
//

// InferSchemaType REPLACED BY InferFieldTypes
// export type InferSchemaType<T extends AutomationTableName> = {
//     [K in keyof T['fields']]: InferFieldType<T['fields'][K]>;
// };


/* Replaced by DataStructure
export type ConversionFormat = 'single' | 'array' | 'object';
*/


/*
export type FieldProperties = {
    structure: FieldStructure;
    characterMaximumLength?: number | null;
    isArray?: boolean;
};


export interface FieldStructure {
    structure: StructureTypes;
    typeReference: TypeBrand<any>;
    databaseTable?: SchemaTableName;
}

*/


/* REPLACED BY Relationship
export interface TableRelationship {
    fetchStrategy: FetchStrategy;
    foreignKeys: ForeignKeyRelation[];
    inverseForeignKeys: InverseForeignKeyRelation[];
    manyToMany: ManyToManyRelation[];
}
*/


// ELIMINATED when we moved structure entries to direct properties of FieldProperties
// export interface FieldStructure {
//     structure: StructureTypes;
//     typeReference: TypeBrand<any>;
//     databaseTable?: SchemaTableName;
// }
//
//
// type InferStructureType<T extends FieldStructure> =
//     T['structure'] extends 'simple' ? unknown :
//         T['structure'] extends 'foreignKey' ? (T['databaseTable'] extends SchemaTableName ? InferFieldTypes<SchemaRegistry[T['databaseTable']]> : never) :
//             T['structure'] extends 'inverseForeignKey' ? (T['databaseTable'] extends SchemaTableName ? Array<InferFieldTypes<SchemaRegistry[T['databaseTable']]>> : never) :
//                 T['structure'] extends 'manyToMany' ? (T['databaseTable'] extends SchemaTableName ? Array<InferFieldTypes<SchemaRegistry[T['databaseTable']]>> : never) :
//                     unknown;
//
//


// Eliminated when relationships were merged into a single array of objects for 'relationships' in the same format
// type ForeignKeyRelation = {
//     column: DatabaseFieldName;
//     relatedTable: string;
//     relatedColumn: DatabaseFieldName;
// };
//
// type InverseForeignKeyRelation = {
//     relatedTable: string;
//     relatedColumn: DatabaseFieldName;
//     mainTableColumn: DatabaseFieldName;
// };
//
// type ManyToManyRelation = {
//     junctionTable: string;
//     relatedTable: string;
//     mainTableColumn: DatabaseFieldName;
//     relatedTableColumn: DatabaseFieldName;
// };
//
//
// export type AltOptionKeys<T extends AutomationTableName> = keyof T['tableNameVariations']; // Not sure if this is even accurate

// Eliminated when these options were added to 'DataStructure' but this is one that might not work.
// export type StructureTypes = "simple" | "foreignKey" | "inverseForeignKey" | "manyToMany";


// // Generate types for each table  -- Not working. TypeScript is NOT inferring the details of the tables.
// export type ActionType = TableFieldTypes["action"];
//
// // Should all of these actually be "export type ActionType = SchemaRegistry["action"];"?????
//
// export type AiEndpointType = TableFieldTypes["aiEndpoint"];
// export type AiModelType = TableFieldTypes["aiModel"];
// export type ArgType = TableFieldTypes["arg"];
// export type AutomationBoundaryBrokerType = TableFieldTypes["automationBoundaryBroker"];
// export type AutomationMatrixType = TableFieldTypes["automationMatrix"];
// export type BrokerType = TableFieldTypes["broker"];
// export type DataInputComponentType = TableFieldTypes["dataInputComponent"];
// export type DataOutputComponentType = TableFieldTypes["dataOutputComponent"];
// export type DisplayOptionType = TableFieldTypes["displayOption"];
// export type EmailsType = TableFieldTypes["emails"];
// export type ExtractorType = TableFieldTypes["extractor"];
// export type FlashcardDataType = TableFieldTypes["flashcardData"];
// export type FlashcardHistoryType = TableFieldTypes["flashcardHistory"];
// export type FlashcardImagesType = TableFieldTypes["flashcardImages"];
// export type FlashcardSetRelationsType = TableFieldTypes["flashcardSetRelations"];
// export type FlashcardSetsType = TableFieldTypes["flashcardSets"];
// export type ProcessorType = TableFieldTypes["processor"];
// export type RecipeType = TableFieldTypes["recipe"];
// export type RecipeBrokerType = TableFieldTypes["recipeBroker"];
// export type RecipeDisplayType = TableFieldTypes["recipeDisplay"];
// export type RecipeFunctionType = TableFieldTypes["recipeFunction"];
// export type RecipeModelType = TableFieldTypes["recipeModel"];
// export type RecipeProcessorType = TableFieldTypes["recipeProcessor"];
// export type RecipeToolType = TableFieldTypes["recipeTool"];
// export type RegisteredFunctionType = TableFieldTypes["registeredFunction"];
// export type SystemFunctionType = TableFieldTypes["systemFunction"];
// export type ToolType = TableFieldTypes["tool"];
// export type TransformerType = TableFieldTypes["transformer"];
// export type UserPreferencesType = TableFieldTypes["userPreferences"];


// type NameVariations = {
//     frontendName: string;
//     backendName: string;
//     databaseName: string;
//     prettyName: string;
//     componentName: string;
//     kebabName: string;
//     [key: string]: string;
// };
//
//
// type FieldProperties = {
//     fieldNameVariations: NameVariations;
//     dataType: DataType;
//     isRequired?: boolean;
//     maxLength?: number | null;
//     isArray?: boolean;
//     defaultValue?: any;
//     isPrimaryKey?: boolean;
//     defaultGeneratorFunction?: string | null;
//     validationFunctions?: string[];
//     exclusionRules?: string[];
//     defaultComponent?: string;
//     structure: DataStructure;
//     isNative: boolean;
//     typeReference: TypeBrand<any>;
//     databaseTable: SchemaTableName;
// };



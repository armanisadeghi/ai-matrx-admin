// File: types/AutomationSchemaTypes.ts


import {tableSchemas, viewSchemas} from "@/utils/schema/initialSchemas";

export type TypeBrand<T> = { _typeBrand: T };

export type DataType =
    | 'string' | 'number' | 'boolean' | 'array' | 'object'
    | 'null' | 'undefined' | 'any' | 'function' | 'symbol'
    | 'bigint' | 'date' | 'map' | 'set' | 'tuple' | 'enum'
    | 'union' | 'intersection' | 'literal' | 'void' | 'never';

export type DataStructure = 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';

export type FetchStrategy = 'simple' | 'fk' | 'ifk' | 'm2m' | 'fkAndIfk' | 'm2mAndFk' | 'm2mAndIfk' | 'fkIfkAndM2M';

export type AutomationTableName =
    'action'
    | 'aiEndpoint'
    | 'aiModel'
    | 'arg'
    | 'automationBoundaryBroker'
    | 'automationMatrix'
    | 'broker'
    | 'dataInputComponent'
    | 'dataOutputComponent'
    | 'displayOption'
    | 'emails'
    | 'extractor'
    | 'flashcardData'
    | 'flashcardHistory'
    | 'flashcardImages'
    | 'flashcardSetRelations'
    | 'flashcardSets'
    | 'processor'
    | 'recipe'
    | 'recipeBroker'
    | 'recipeDisplay'
    | 'recipeFunction'
    | 'recipeModel'
    | 'recipeProcessor'
    | 'recipeTool'
    | 'registeredFunction'
    | 'systemFunction'
    | 'tool'
    | 'transformer'
    | 'userPreferences';

export type AutomationViewName =
    'viewRegisteredFunction'
    | 'viewRegisteredFunctionAllRels';

export type AutomationEntityName = AutomationTableName | AutomationViewName;


// export type AutomationEntitySchema = {
//     entityNameVariations: {
//         frontendName: string;
//         backendName: string;
//         databaseName: string;
//         prettyName: string;
//         componentName: string;
//         kebabName: string;
//         [key: string]: string;
//     };
//     schemaType: 'table' | 'view' | 'dynamic' | 'other';
//     entityFields: {
//         [fieldName: string]: {
//             fieldNameVariations: {
//                 frontendName: string;
//                 backendName: string;
//                 databaseName: string;
//                 prettyName: string;
//                 componentName: string;
//                 kebabName: string;
//                 [key: string]: string;
//             };
//             dataType: DataType;
//             isRequired?: boolean;
//             maxLength?: number | null;
//             isArray?: boolean;
//             defaultValue?: any;
//             isPrimaryKey?: boolean;
//             defaultGeneratorFunction?: string | null;
//             validationFunctions?: string[];
//             exclusionRules?: string[];
//             defaultComponent?: string;
//             structure: DataStructure;
//             isNative: boolean;
//             typeReference: TypeBrand<any>;
//             databaseTable: string;
//         };
//     };
//     defaultFetchStrategy: FetchStrategy;
//     relationships: Array<{
//         relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
//         column: string;
//         relatedEntity: string;
//         relatedColumn: string;
//         junctionTable: string | null;
//     }>;
// };


// Helper function to access a specific entity schema
export function getEntitySchema(entityName: AutomationEntityName) {
    return entitySchemas[entityName];
}

// Helper function to access fields of a specific entity
export function getEntityField(entityName: AutomationEntityName, fieldName: string) {
    const entitySchema = entitySchemas[entityName];
    return entitySchema?.entityFields[fieldName] ?? null;
}

// Example usage
const actionSchema = getEntitySchema('action');
const idField = getEntityField('action', 'id');




type AllSchemaKeys = typeof initialSchemas;

type AllRegisteredTableNames = keyof AutomationSchema;


type AnyTableFields = AutomationSchema[AllRegisteredTableNames]['tableFields'];

type AnyTableFieldStructure = AnyTableFields[keyof AutomationSchema[AutomationTableName]['tableFields']];

type SchemaRegistry = {
    [key in AllRegisteredTableNames]: AutomationSchema[key];
};


type SchemaShape = AutomationSchema[AutomationTableName];


const automationRegistry: Record<string, SchemaShape> = {};

function registerAutomationSchema<T extends AutomationTableName>(
    tableName: T,
    tableSchema: AutomationSchema[T]
) {
    automationRegistry[tableName] = tableSchema;
}

function initializeSchemas() {
    Object.keys(initialSchemas).forEach((key) => {
        const tableName = key as AutomationTableName;
        const tableSchema = initialSchemas[tableName];
        if (tableSchema) {
            registerAutomationSchema(tableName, tableSchema);
        } else {
            console.warn(`Schema for table ${tableName} not found in initialSchemas.`);
        }
    });
    console.log("Registered schemas:", Object.keys(automationRegistry));
}

initializeSchemas()






export type AnyTableName<T extends keyof AutomationSchema> =
    ResolveFrontendTableName<T> |
    ResolveBackendTableName<T> |
    ResolveDatabaseTableName<T> |
    ResolvePrettyTableName<T>;


export type ResolveTableName<T extends keyof SchemaRegistry, V extends keyof SchemaRegistry[T]['tableNameVariations']> = SchemaRegistry[T]['tableNameVariations'][V];





export type ActionTableNameVariationKeys = AutomationSchema['action']['tableNameVariations'];
export type ActionComponentNames = AutomationSchema['action']['tableNameVariations']['componentName'];
export type ActionTableDatabaseName = AutomationSchema['action']['tableNameVariations']['databaseName'];
export type ActionTableFields = AutomationSchema['action']['tableFields'];
export type ActionTableFieldStructure = ActionTableFields[keyof AutomationSchema['action']['tableFields']];
export type ActionTableFieldNameVariations = ActionTableFieldStructure['fieldNameVariations'];


export type AnyTableNameVariationKey = AutomationSchema[AutomationTableName]['tableNameVariations'];

export type AnyComponentName = AnyTableNameVariationKey['componentName'];
export type AnyTableDatabaseName = AnyTableNameVariationKey['databaseName'];
export type AnyPrettyName = AnyTableNameVariationKey['prettyName'];
export type AnyTableFieldNameVariations = AnyTableFieldStructure['fieldNameVariations'];
export type DatabaseTableName = AutomationSchema[AutomationTableName]['tableNameVariations']['databaseName'];

const entityName: AnyTableNameVariationKey['prettyName'] = 'action';




export type InferFieldType<T extends FieldProperties> =
    T['isRequired'] extends false
        ? (T['isArray'] extends true ? Array<InferBaseType<T>> | null | undefined : InferBaseType<T> | null | undefined)
        : (T['isArray'] extends true ? Array<InferBaseType<T>> : InferBaseType<T>);

export type InferBaseType<T extends FieldProperties> =
    T['dataType'] extends 'string' ? string :
        T['dataType'] extends 'number' ? number :
            T['dataType'] extends 'boolean' ? boolean :
                T['dataType'] extends 'date' ? Date :
                    T['dataType'] extends 'object' ? Record<string, unknown> :
                        T['dataType'] extends 'stringArray' ? Array<string> :
                            T['dataType'] extends 'objectArray' ? Array<Record<string, unknown>> :
                                unknown;

export type InferFieldTypes<T extends TableSchema> = {
    [K in keyof T['tableFields']]: InferFieldType<T['tableFields'][K]>;
};


export type TableFieldTypes = {
    [K in SchemaTableName]: InferFieldTypes<typeof initialSchemas[K]>
};


export type TableFields<T extends keyof SchemaRegistry> = InferFieldTypes<SchemaRegistry[T]>;
// export type FieldType<T extends keyof SchemaRegistry, F extends keyof TableFields<T>> = TableFields<T>[F];
export type FieldNames<T extends keyof SchemaRegistry> = keyof TableFields<T>;


export type TableNameResolver<T extends keyof SchemaRegistry, V extends keyof SchemaRegistry[T]['tableNameVariations']> = SchemaRegistry[T]['tableNameVariations'][V];
export type ResolveFrontendTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'frontendName'>;
export type ResolveDatabaseTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'databaseName'>;
export type ResolveBackendTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'backendName'>;
export type ResolvePrettyTableName<T extends keyof SchemaRegistry> = TableNameResolver<T, 'prettyName'>;



// Example usage
type AiTableNameInFormat<F extends keyof SchemaRegistry['aiEndpoint']['tableNameVariations']> = ResolveTableName<'aiEndpoint', F>;

















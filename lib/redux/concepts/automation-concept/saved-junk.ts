
// export type TableType<T extends keyof AutomationSchema> = {
//     [K in keyof AutomationSchema[T]['entityFields']]: AutomationSchema[T]['entityFields'][K]['typeReference'] extends TypeBrand<infer U> ? U : never;
// };
//
//
// // Helper type to expand FetchStrategy
// type ExpandFetchStrategy<T> = T extends FetchStrategy ? T : never;
//
// // Helper type to expand NameVariations
// type ExpandNameVariations<T> = T extends Record<NameFormat, string> ? {
//     [K in keyof T]: K extends NameFormat ? T[K] : never
// } & {
//     [K: string]: string;
// } : never;
//
// // Helper type to expand fieldNameMappings
// type ExpandFieldNameMappings<T> = T extends Record<string, Record<NameFormat, string>> ? {
//     [K in keyof T]: {
//         [F in NameFormat]: string
//     }
// } : never;
//
// // Helper type to expand precomputedFormats
// type ExpandPrecomputedFormats<T> = T extends Record<NameFormat, TableSchema> ? {
//     [K in NameFormat]: ExpandSchema<TableSchema>
// } : never;
//
//
// // Utility type to expand the structure of fields
// type ExpandFields<T extends Record<string, TableField>> = {
//     [K in keyof T]: UnwrapTypeBrand<T[K]['typeReference']>
// };
//


// export type ExpandedTableSchema = ExpandSchema<Merge<BaseEntitySchema, TableSchema>>;
// export type ExpandedViewSchema = ExpandSchema<Merge<BaseEntitySchema, ViewSchema>>;
// export type ExpandedDynamicSchema = ExpandSchema<Merge<BaseEntitySchema, DynamicSchema>>;
// export type ExpandedCustomSchema = ExpandSchema<Merge<BaseEntitySchema, CustomSchema>>;
//
// // Type to represent the full AutomationSchema structure
// export type FullAutomationSchema = {
//     [K in AutomationTableName]: ExpandedTableSchema;
// } & {
//     [K in AutomationViewName]: ExpandedViewSchema;
// } & {
//     [K in AutomationDynamicName]: ExpandedDynamicSchema;
// } & {
//     [K in AutomationCustomName]: ExpandedCustomSchema;
// };
//
//
// export type TableNameVariations = {
//     [K in AutomationTableName]: NameVariations;
// };
//
// export type AnyTableNameVariation<T extends AutomationTableName> = TableNameVariations[T][NameFormat];

/*
export const fieldDefaults: BaseField = {
    fieldNameVariations: {} as NameVariations,
    dataType: 'string',
    isArray: false,
    structure: 'single',
    isNative: false,
    typeReference: {_typeBrand: 'string'},
    defaultComponent: 'input',
};


export type BaseField<T = any> = {
    fieldNameVariations: NameVariations;
    dataType: FieldDataType;
    isArray: boolean;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<T>;
    defaultComponent?: string;
};


export type TableField<T = any> = BaseField<T> & {
    isRequired?: boolean;
    maxLength?: number | null;
    defaultValue?: T;
    isPrimaryKey?: boolean;
    defaultGeneratorFunction?: string | null;
    validationFunctions?: readonly string[];
    exclusionRules?: readonly string[];
    databaseTable: AnyTableNameVariation<AutomationTableName>;
    sqlFunctionRef?: string;
};

export type ViewField = BaseField & {
    excludeFromFetch?: boolean;
    hideFromUser?: boolean;
};

export type DynamicField = BaseField & {
    dynamicComponent?: string;
    dynamicProps?: Record<string, any>;
};

export type CustomField = BaseField & {
    customValidation?: (value: any) => boolean;
    customTransform?: (value: any) => any;
};

export type AnyField = TableField | ViewField | DynamicField | CustomField;

export type EnhancedBaseEntitySchema<
    SchemaType extends 'table' | 'view' | 'dynamic' | 'custom' | 'other',
    Fields extends Record<string, AnyField>,
    RelationshipType extends Array<Relationship> | null
> = {
    schemaType: SchemaType;
    entityFields: Fields;
    defaultFetchStrategy: FetchStrategy;
    relationships: RelationshipType;
    entityNameVariations: NameVariations;
    fieldNameMappings?: Record<string, Record<NameFormat, string>>;
    precomputedFormats?: Record<NameFormat, TableSchema>;
};

// Enhanced specific schema types
export type EnhancedTableSchema<Fields extends Record<string, TableField>> =
    EnhancedBaseEntitySchema<'table', Fields, Array<Relationship>>;

export type EnhancedViewSchema<Fields extends Record<string, ViewField>> =
    EnhancedBaseEntitySchema<'view', Fields, null> & {
    defaultFetchStrategy: 'simple';
};

export type EnhancedDynamicSchema<Fields extends Record<string, DynamicField>> =
    EnhancedBaseEntitySchema<'dynamic', Fields, Array<Relationship> | null> & {
    defaultFetchStrategy: 'none';
};

export type EnhancedCustomSchema<Fields extends Record<string, CustomField>> =
    EnhancedBaseEntitySchema<'custom', Fields, Array<Relationship> | null> & {
    defaultFetchStrategy: 'none';
};

// Enhanced AutomationSchema
export type EnhancedAutomationSchema = {
    [K in AutomationTableName]: EnhancedTableSchema<Record<string, TableField>>;
} & {
    [K in AutomationViewName]: EnhancedViewSchema<Record<string, ViewField>>;
} & {
    [K in AutomationDynamicName]: EnhancedDynamicSchema<Record<string, DynamicField>>;
} & {
    [K in AutomationCustomName]: EnhancedCustomSchema<Record<string, CustomField>>;
};

// Utility types for expanding schemas
type ExpandField<F> = F extends BaseField ? {
    [K in keyof F]: K extends 'typeReference' ? UnwrapTypeBrand<F[K]> : F[K]
} : never;

type ExpandEntityFields<T> = {
    [K in keyof T]: ExpandField<T[K]>
};

type ExpandSchema<T> = {
    [K in keyof T]: K extends 'entityFields'
        ? ExpandEntityFields<T[K]>
        : K extends 'relationships'
            ? T[K] extends Array<infer R>
                ? Array<{ [P in keyof R]: R[P] }>
                : T[K]
            : K extends 'defaultFetchStrategy'
                ? T[K]
                : K extends 'entityNameVariations'
                    ? { [NF in NameFormat]: string } & { [key: string]: string }
                    : K extends 'fieldNameMappings'
                        ? Record<string, Record<NameFormat, string>>
                        : K extends 'precomputedFormats'
                            ? Record<NameFormat, ExpandSchema<TableSchema>>
                            : T[K]
};


// Helper types for precise entity types and name variations
export type PreciseEntityType<K extends keyof EnhancedAutomationSchema> =
    ExpandSchema<EnhancedAutomationSchema[K]>['entityFields'];

export type TableNameVariation<T extends AutomationTableName> =
    EnhancedAutomationSchema[T]['entityNameVariations'][NameFormat];

export type FieldNameVariation<
    T extends AutomationTableName,
    F extends keyof EnhancedAutomationSchema[T]['entityFields']
> = EnhancedAutomationSchema[T]['entityFields'][F]['fieldNameVariations'][NameFormat];


export type BaseEntitySchema = {
    schemaType: 'table' | 'view' | 'dynamic' | 'custom' | 'other';
    entityFields: Record<string, TableField | AnyField>;
    defaultFetchStrategy: FetchStrategy;
    relationships: Array<Relationship> | null;
    entityNameVariations: NameVariations;
    fieldNameMappings?: Record<string, Record<NameFormat, string>>;
    precomputedFormats?: Record<NameFormat, TableSchema>;
};

export type TableSchema = BaseEntitySchema & {
    schemaType: 'table';
    entityFields: Record<string, TableField>;
    relationships: Array<Relationship>;
};

export type ViewSchema = BaseEntitySchema & {
    schemaType: 'view';
    entityFields: Record<string, ViewField>;
    defaultFetchStrategy: 'simple';
    relationships: null;
};

export type DynamicSchema = BaseEntitySchema & {
    schemaType: 'dynamic';
    entityFields: Record<string, DynamicField>;
    defaultFetchStrategy: 'none';
    relationships?: Array<Relationship>;
};

export type CustomSchema = BaseEntitySchema & {
    schemaType: 'custom';
    entityFields: Record<string, CustomField>;
    defaultFetchStrategy: 'none';
    relationships?: Array<Relationship>;
};

export type AnySchema = TableSchema | ViewSchema | DynamicSchema | CustomSchema;


export type Relationship = {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
};


export type ActionType = FullAutomationSchema["action"];
export type AiEndpointType = FullAutomationSchema["aiEndpoint"];
export type AiModelType = FullAutomationSchema["aiModel"];
export type ArgType = FullAutomationSchema["arg"];
export type AutomationBoundaryBrokerType = FullAutomationSchema["automationBoundaryBroker"];
export type AutomationMatrixType = FullAutomationSchema["automationMatrix"];
export type BrokerType = FullAutomationSchema["broker"];
export type DataInputComponentType = FullAutomationSchema["dataInputComponent"];
export type DataOutputComponentType = FullAutomationSchema["dataOutputComponent"];
export type DisplayOptionType = FullAutomationSchema["displayOption"];
export type EmailsType = FullAutomationSchema["emails"];
export type ExtractorType = FullAutomationSchema["extractor"];
export type FlashcardDataType = PreciseEntityType<"flashcardData">;
export type FlashcardHistoryType = PreciseEntityType<"flashcardHistory">;
export type FlashcardImagesType = PreciseEntityType<"flashcardImages">;
export type FlashcardSetRelationsType = PreciseEntityType<"flashcardSetRelations">;
export type FlashcardSetsType = PreciseEntityType<"flashcardSets">;
export type ProcessorType = FullAutomationSchema["processor"];
export type RecipeType = FullAutomationSchema["recipe"];
export type RecipeBrokerType = FullAutomationSchema["recipeBroker"];
export type RecipeDisplayType = FullAutomationSchema["recipeDisplay"];
export type RecipeFunctionType = FullAutomationSchema["recipeFunction"];
export type RecipeModelType = FullAutomationSchema["recipeModel"];
export type RecipeProcessorType = FullAutomationSchema["recipeProcessor"];
export type RecipeToolType = FullAutomationSchema["recipeTool"];
export type RegisteredFunctionType = FullAutomationSchema["registeredFunction"];
export type SystemFunctionType = FullAutomationSchema["systemFunction"];
export type ToolType = FullAutomationSchema["tool"];
export type TransformerType = FullAutomationSchema["transformer"];
export type UserPreferencesType = FullAutomationSchema["userPreferences"];
*/


// defaultFetchStrategy: FetchStrategy
// entityFields: ExpandEntityFields<Record<string, AnyField> & Record<string, TableField>>
// fieldNameMappings: Record<string, Record<DataFormat, string>>
// nameVariations: NameVariations
// precomputedFormats?: Record<DataFormat, TableSchema> | undefined


// type ExampleField = {
//     dataType: 'object';
//     reference: EntityReference<'user'>;
//     fieldReference: FieldReference<'user', 'id'>;
// };
//
//
//
//
// type ExampleForeignKeyField = TableField & {
//     dataType: 'object';
//     structure: 'foreignKey';
//     reference: EntityReference<'post'>;
//     fieldReference: FieldReference<'post', 'id'>;
//     defaultComponent: 'select';
//     isRequired: true;
// };
//
// // Example of how this might be used in a schema
// const userPostField: ExampleForeignKeyField = {
//     ...fieldDefaults,
//     dataType: 'object',
//     structure: 'foreignKey',
//     reference: createEntityReference('post'),
//     fieldReference: createFieldReference('post', 'id'),
//     defaultComponent: 'select',
//     isRequired: true,
//     typeReference: { _typeBrand: 'post' },
// };
//
// // Example of a many-to-many relationship field
// type ExampleManyToManyField = TableField & {
//     dataType: 'array';
//     structure: 'manyToMany';
//     reference: EntityReference<'tag'>;
//     fieldReference: FieldReference<'tag', 'id'>;
//     defaultComponent: 'multiSelect';
// };
//
// // Example of how this might be used in a schema
// const postTagsField: ExampleManyToManyField = {
//     ...fieldDefaults,
//     dataType: 'array',
//     isArray: true,
//     structure: 'manyToMany',
//     reference: createEntityReference('tag'),
//     fieldReference: createFieldReference('tag', 'id'),
//     defaultComponent: 'multiSelect',
//     typeReference: { _typeBrand: 'tag[]' },
// };


/*
export type AutomationEntityName = AutomationTableName | AutomationViewName;
export type AutomationEntitySchema = TableSchema | ViewSchema;








*/


/*
// File: types/AutomationSchemaTypes.ts



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
















*/

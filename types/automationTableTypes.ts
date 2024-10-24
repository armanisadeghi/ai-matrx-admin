import {
    AutomationTableName,
    DataStructure,
    FetchStrategy,
    FieldDataType,
    NameFormat, UnifiedSchemaCache
} from "@/types/AutomationSchemaTypes";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";


export type TypeBrand<DataType> = { _typeBrand: DataType };
export type EnumValues<T> = T extends TypeBrand<infer U> ? U : never;


export type InitialTableSchema = {
    schemaType: 'table';
    entityNameVariations: {
        [key in NameFormat]?: string;
    };
    entityFields: {
        [fieldName: string]: {
            fieldNameVariations: {
                [key in NameFormat]?: string;
            };
            dataType: FieldDataType;
            isArray: boolean;
            structure: DataStructure;
            isNative: boolean;
            typeReference: TypeBrand<any>;
            defaultComponent?: string;
            componentProps?: Record<string, unknown>;
            isRequired: boolean;
            maxLength: number | null;
            defaultValue: any;
            isPrimaryKey: boolean;
            isDisplayField?: boolean;
            defaultGeneratorFunction: string | null;
            validationFunctions: readonly string[];
            exclusionRules: readonly string[];
            databaseTable: string;
        };
    };
    defaultFetchStrategy: FetchStrategy;
    componentProps: Record<string, any>;
    relationships: Array<{
        relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
        column: string;
        relatedTable: string;
        relatedColumn: string;
        junctionTable: string | null;
    }>;
};



export type TableSchemaStructure = {
    [entityName in AutomationTableName]: InitialTableSchema;
};


// Shared mapping type that can be used for both table and field name mappings
export type EntityNameMappings = {
    frontend: string;
    backend: string;
    database: string;
    pretty: string;
    component: string;
    sqlFunctionRef: string;
    [key: string]: string;
};

// Relationship type pulled out for clarity
export type TableRelationship = {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
};

// Core field structure
export type EntityField = {
    fieldNameMappings: EntityNameMappings;
    value: any;
    dataType: FieldDataType;
    isArray: boolean;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<any>;
    enumValues: EnumValues<any>[] | null;
    defaultComponent?: string;
    componentProps?: Record<string, unknown>;
    isRequired: boolean;
    maxLength: number | null;
    defaultValue: any;
    isPrimaryKey: boolean;
    isDisplayField: boolean;
    defaultGeneratorFunction: string | null;
    validationFunctions: readonly string[];
    exclusionRules: readonly string[];
    databaseTable: string;
};

// Type to represent fields for a specific table
export type EntityFields<T extends AutomationTableName> = {
    [K in keyof (AutomationTableStructure[T]['entityFields'])]: EntityField;
};

// The main table type remains unchanged externally
export type AutomationTable = {
    schemaType: 'table';
    entityNameMappings: EntityNameMappings;
    entityFields: {
        [fieldName: string]: EntityField;
    };
    defaultFetchStrategy: FetchStrategy;
    componentProps: Record<string, any>;
    relationships: TableRelationship[];
};


export type initialSchema = typeof initialAutomationTableSchema;



// The core type structure remains identical
export type AutomationTableStructure = {
    [K in AutomationTableName]: AutomationTable;
};

// Helper type to get field names for a specific table
export type TableFieldNames<T extends AutomationTableName> = keyof AutomationTableStructure[T]['entityFields'];

// Helper type to get a specific field type for a table
export type TableField<
    T extends AutomationTableName,
    F extends TableFieldNames<T>
> = AutomationTableStructure[T]['entityFields'][F];

// Core type utilities for field inference
export type InferFieldType<F extends EntityField> = F['value'];

// Field type inference for entire tables
export type InferTableFieldTypes<T extends AutomationTable> = {
    [K in keyof T['entityFields']]: InferFieldType<T['entityFields'][K]>;
};

// Comprehensive table field types
export type TableFieldTypes = {
    [K in AutomationTableName]: InferTableFieldTypes<AutomationTableStructure[K]>;
};

// Type-safe field access utilities
export type TableFields<T extends AutomationTableName> =
    InferTableFieldTypes<AutomationTableStructure[T]>;

export type FieldType<
    T extends AutomationTableName,
    F extends keyof TableFields<T>
> = TableFields<T>[F];

// Name resolution types
export type NameMappingKey = keyof EntityNameMappings;

export type TableNameResolver<
    T extends AutomationTableName,
    V extends NameMappingKey
> = AutomationTableStructure[T]['entityNameMappings'][V];

// Specific name resolution types
export type ResolveFrontendTableName<T extends AutomationTableName> =
    TableNameResolver<T, 'frontend'>;

export type ResolveDatabaseTableName<T extends AutomationTableName> =
    TableNameResolver<T, 'database'>;

export type ResolveBackendTableName<T extends AutomationTableName> =
    TableNameResolver<T, 'backend'>;

export type ResolvePrettyTableName<T extends AutomationTableName> =
    TableNameResolver<T, 'pretty'>;

// Combined table name resolution
export type AnyTableName<T extends AutomationTableName> =
    | ResolveFrontendTableName<T>
    | ResolveBackendTableName<T>
    | ResolveDatabaseTableName<T>
    | ResolvePrettyTableName<T>;

// Field name resolution types
export type FieldNameResolver<
    T extends AutomationTableName,
    F extends keyof AutomationTableStructure[T]['entityFields'],
    V extends NameMappingKey
> = AutomationTableStructure[T]['entityFields'][F]['fieldNameMappings'][V];

// Cache-aware type utilities
export type CachedTableName = UnifiedSchemaCache['tableNameMap'] extends Map<infer K, any> ? K : never;
export type CachedFieldName<T extends AutomationTableName> =
    UnifiedSchemaCache['fieldNameMap'] extends Map<T, Map<infer F, any>> ? F : never;

// Type guard utilities
export type TypeGuardedTable<T extends AutomationTableName> = {
    readonly [K in keyof AutomationTableStructure[T]]: AutomationTableStructure[T][K];
};

// Utility helper functions with type inference
export function fieldName<
    T extends AutomationTableName,
    F extends keyof AutomationTableStructure[T]['entityFields']
>(table: T, field: F): F {
    return field;
}

export function tableName<T extends AutomationTableName>(table: T): T {
    return table;
}

// Relationship utility types
export type TableRelationships<T extends AutomationTableName> =
    AutomationTableStructure[T]['relationships'];

export type RelatedTables<T extends AutomationTableName> =
    TableRelationships<T>[number]['relatedTable'];

// Field constraint types
export type RequiredFields<T extends AutomationTableName> = {
    [K in keyof TableFields<T>]: AutomationTableStructure[T]['entityFields'][K & string]['isRequired'] extends true
        ? K
        : never
}[keyof TableFields<T>];

export type OptionalFields<T extends AutomationTableName> = {
    [K in keyof TableFields<T>]: AutomationTableStructure[T]['entityFields'][K & string]['isRequired'] extends false
        ? K
        : never
}[keyof TableFields<T>];

// Component-related types
export type FieldWithComponent<T extends AutomationTableName> = {
    [K in keyof TableFields<T>]: AutomationTableStructure[T]['entityFields'][K & string]['defaultComponent'] extends string
        ? K
        : never
}[keyof TableFields<T>];

// Validation-related types
export type FieldsWithValidation<T extends AutomationTableName> = {
    [K in keyof TableFields<T>]: AutomationTableStructure[T]['entityFields'][K & string]['validationFunctions']['length'] extends 0
        ? never
        : K
}[keyof TableFields<T>];



export type ActionType = AutomationTableStructure["action"];
export type AiEndpointType = AutomationTableStructure["aiEndpoint"];
export type AiModelType = AutomationTableStructure["aiModel"];
export type ArgType = AutomationTableStructure["arg"];
export type AutomationBoundaryBrokerType = AutomationTableStructure["automationBoundaryBroker"];
export type AutomationMatrixType = AutomationTableStructure["automationMatrix"];
export type BrokerType = AutomationTableStructure["broker"];
export type DataInputComponentType = AutomationTableStructure["dataInputComponent"];
export type DataOutputComponentType = AutomationTableStructure["dataOutputComponent"];
export type DisplayOptionType = AutomationTableStructure["displayOption"];
export type EmailsType = AutomationTableStructure["emails"];
export type ExtractorType = AutomationTableStructure["extractor"];
export type FlashcardDataType = AutomationTableStructure["flashcardData"];
export type FlashcardHistoryType = AutomationTableStructure["flashcardHistory"];
export type FlashcardImagesType = AutomationTableStructure["flashcardImages"];
export type FlashcardSetRelationsType = AutomationTableStructure["flashcardSetRelations"];
export type FlashcardSetsType = AutomationTableStructure["flashcardSets"];
export type ProcessorType = AutomationTableStructure["processor"];
export type RecipeType = AutomationTableStructure["recipe"];
export type RecipeBrokerType = AutomationTableStructure["recipeBroker"];
export type RecipeDisplayType = AutomationTableStructure["recipeDisplay"];
export type RecipeFunctionType = AutomationTableStructure["recipeFunction"];
export type RecipeModelType = AutomationTableStructure["recipeModel"];
export type RecipeProcessorType = AutomationTableStructure["recipeProcessor"];
export type RecipeToolType = AutomationTableStructure["recipeTool"];
export type RegisteredFunctionType = AutomationTableStructure["registeredFunction"];
export type SystemFunctionType = AutomationTableStructure["systemFunction"];
export type ToolType = AutomationTableStructure["tool"];
export type TransformerType = AutomationTableStructure["transformer"];
export type UserPreferencesType = AutomationTableStructure["userPreferences"];


export type EntityData = Record<string, any>;

export type EntitySliceState = {
    data: EntityData[]; // This holds the actual values, where each object represents a row (record) in the entity
    totalCount: number; // Total number of records in the entity (e.g., number of books)
    allPkAndDisplayFields: Array<{
        pk: any;
        display?: any;
    }>;
    loading: boolean; // Loading state
    error: string | null; // Error state
    lastFetched: Record<string, Date>; // Time when data was last fetched
    staleTime: number; // Time-to-live for data freshness
    backups: Record<string, EntityData[]>; // Backup of previous data states
    selectedItem: EntityData | null; // Currently selected item
};


export type AutomationView = {
    schemaType: 'view';
    entityNameMappings: {
        frontend: string;
        backend: string;
        database: string;
        pretty: string;
        component: string;
        sqlFunctionRef: string;
        [key: string | string]: string;
    };
    entityFields: {
        [fieldName: string]: {
            fieldNameMappings: {
                [fieldName: string]: {
                    frontend: string;
                    backend: string;
                    database: string;
                    pretty: string;
                    component: string;
                    sqlFunctionRef: string;
                    [key: string | string]: string;
                };
            };
            value: any;
            dataType: FieldDataType;
            isArray: boolean;
            structure: DataStructure;
            isNative: boolean;
            typeReference: TypeBrand<any>;
            defaultComponent?: string;
            componentProps?: Record<string, unknown>;
            isRequired: boolean;
            maxLength: number | null;
            defaultValue: any;
            isPrimaryKey: boolean;
            isDisplayField: boolean;
            defaultGeneratorFunction: string | null;
            validationFunctions: readonly string[];
            exclusionRules: readonly string[];
            databaseTable: string;
        };
    };
    defaultFetchStrategy: FetchStrategy;
    componentProps: Record<string, unknown>;
    relationships: Array<{
        relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
        column: string;
        relatedTable: string;
        relatedColumn: string;
        junctionTable: string | null;
    }>;
};




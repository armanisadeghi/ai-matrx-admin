import {
    AutomationTableName,
    DataStructure,
    FetchStrategy,
    FieldDataType,
    NameFormat
} from "@/types/AutomationSchemaTypes";


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


export type AutomationTableStructure = {
    [K in AutomationTableName]: AutomationTable;
};


export type AutomationTable = {
    schemaType: 'table';
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
                frontend: string;
                backend: string;
                database: string;
                pretty: string;
                component: string;
                sqlFunctionRef: string;
                [key: string | string]: string;
            };
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




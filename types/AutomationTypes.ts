import {tableSchemas, viewSchemas} from "@/utils/schema/initialSchemas";


export type TypeBrand<T> = { _typeBrand: T };

export type AutomationSchema = {
    [K in AutomationTableName]: unknown;
} & {
    [K in AutomationViewName]: unknown;
};

export type DataType =
    | 'string' | 'number' | 'boolean' | 'array' | 'object'
    | 'null' | 'undefined' | 'any' | 'function' | 'symbol'
    | 'bigint' | 'date' | 'map' | 'set' | 'tuple' | 'enum'
    | 'union' | 'intersection' | 'literal' | 'void' | 'never';

export type DataStructure = 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';

export type FetchStrategy = 'simple' | 'fk' | 'ifk' | 'm2m' | 'fkAndIfk' | 'm2mAndFk' | 'm2mAndIfk' | 'fkIfkAndM2M';

export type DataFormat = 'frontend' | 'backend' | 'database' | 'pretty' | 'component' | 'kebab';

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

export type BaseEntitySchema = {
    entityNameVariations: {
        frontendName: string;
        backendName: string;
        databaseName: string;
        prettyName: string;
        componentName: string;
        kebabName: string;
        [key: string]: string;
    };
    schemaType: 'table' | 'view' | 'dynamic' | 'other';
    entityFields: Record<string, TableField>;
    fieldNameMappings: Record<string, Record<DataFormat, string>>;
    defaultFetchStrategy: FetchStrategy;
    relationships: Array<Relationship> | null;
    precomputedFormats?: Record<DataFormat, TableSchema>;
};


export type TableSchema = {
    schemaType: 'table';
    entityFields: Record<string, TableField>;
    relationships: Array<Relationship>;
    defaultFetchStrategy: FetchStrategy;
    precomputedFormats?: Record<DataFormat, TableSchema>;
};

export type ViewSchema = BaseEntitySchema & {
    schemaType: 'view';
    entityFields: Record<string, ViewField>;
    relationships: null;
};


export type Relationship = {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
};

export type TableField = {
    dataType: DataType;
    isRequired?: boolean;
    maxLength?: number | null;
    isArray?: boolean;
    defaultValue?: any;
    isPrimaryKey?: boolean;
    defaultGeneratorFunction?: string | null;
    validationFunctions?: string[];
    exclusionRules?: string[];
    defaultComponent?: string;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<any>;
    databaseTable?: string;
};


export type ViewField = {
    fieldNameVariations: {
        frontendName: string;
        backendName: string;
        databaseName: string;
        prettyName: string;
        componentName: string;
        kebabName: string;
        [key: string]: string;
    };
    dataType: DataType;
    isArray?: boolean;
    defaultComponent?: string;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<any>;
};










export type ActionType = AutomationSchema["action"];
export type AiEndpointType = AutomationSchema["aiEndpoint"];
export type AiModelType = AutomationSchema["aiModel"];
export type ArgType = AutomationSchema["arg"];
export type AutomationBoundaryBrokerType = AutomationSchema["automationBoundaryBroker"];
export type AutomationMatrixType = AutomationSchema["automationMatrix"];
export type BrokerType = AutomationSchema["broker"];
export type DataInputComponentType = AutomationSchema["dataInputComponent"];
export type DataOutputComponentType = AutomationSchema["dataOutputComponent"];
export type DisplayOptionType = AutomationSchema["displayOption"];
export type EmailsType = AutomationSchema["emails"];
export type ExtractorType = AutomationSchema["extractor"];
export type FlashcardDataType = AutomationSchema["flashcardData"];
export type FlashcardHistoryType = AutomationSchema["flashcardHistory"];
export type FlashcardImagesType = AutomationSchema["flashcardImages"];
export type FlashcardSetRelationsType = AutomationSchema["flashcardSetRelations"];
export type FlashcardSetsType = AutomationSchema["flashcardSets"];
export type ProcessorType = AutomationSchema["processor"];
export type RecipeType = AutomationSchema["recipe"];
export type RecipeBrokerType = AutomationSchema["recipeBroker"];
export type RecipeDisplayType = AutomationSchema["recipeDisplay"];
export type RecipeFunctionType = AutomationSchema["recipeFunction"];
export type RecipeModelType = AutomationSchema["recipeModel"];
export type RecipeProcessorType = AutomationSchema["recipeProcessor"];
export type RecipeToolType = AutomationSchema["recipeTool"];
export type RegisteredFunctionType = AutomationSchema["registeredFunction"];
export type SystemFunctionType = AutomationSchema["systemFunction"];
export type ToolType = AutomationSchema["tool"];
export type TransformerType = AutomationSchema["transformer"];
export type UserPreferencesType = AutomationSchema["userPreferences"];




/*
export type AutomationEntityName = AutomationTableName | AutomationViewName;
export type AutomationEntitySchema = TableSchema | ViewSchema;








*/

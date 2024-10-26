// File: types/AutomationSchemaTypes.ts


import {AutomationTableStructure} from "@/types/automationTableTypes";

export type TypeBrand<T> = { _typeBrand: T };

export type FieldDataType =
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

export type DataStructure =
    | 'single'
    | 'array'
    | 'object'
    | 'foreignKey'
    | 'inverseForeignKey'
    | 'manyToMany';

export type FetchStrategy =
    | 'simple'
    | 'fk'
    | 'ifk'
    | 'm2m'
    | 'fkAndIfk'
    | 'm2mAndFk'
    | 'm2mAndIfk'
    | 'fkIfkAndM2M'
    | 'none';

export type RequiredNameFormats =
    'frontend' |
    'backend' |
    'database' |
    'pretty' |
    'component'|
    'kebab' |
    'sqlFunctionRef';

export type OptionalNameFormats =
    'RestAPI' |
    'GraphQL' |
    'custom';

export type NameFormat = RequiredNameFormats | OptionalNameFormats;

export type AutomationDynamicName =
    | 'dynamicAudio'
    | 'dynamicImage'
    | 'dynamicText'
    | 'dynamicVideo'
    | 'dynamicSocket'
    | 'anthropic'
    | 'openai'
    | 'llama'
    | 'googleAi';

export type AutomationCustomName =
    | 'flashcard'
    | 'mathTutor'
    | 'scraper';

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

// export type ProcessedSchema = ReturnType<typeof initializeTableSchema>;

// export type UnifiedSchemaCache = ReturnType<typeof initializeSchemaSystem>

// export type SchemaEntityKeys = keyof ProcessedSchema;

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


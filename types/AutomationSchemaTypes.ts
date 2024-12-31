// File: types/AutomationSchemaTypes.ts

import {AutomationEntity} from "@/types/entityTypes";

export type TypeBrand<T> = { _typeBrand: T };

export type FieldDataOptionsType =
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
    | 'never'
    | 'uuid'
    | 'email'
    | 'url'
    | 'phone'
    | 'datetime';

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
    | 'aiModelEndpoint'
    | 'aiProvider'
    | 'aiSettings'
    | 'arg'
    | 'automationBoundaryBroker'
    | 'automationMatrix'
    | 'broker'
    | 'bucketStructures'
    | 'bucketTreeStructures'
    | 'dataInputComponent'
    | 'dataOutputComponent'
    | 'displayOption'
    | 'emails'
    | 'extractor'
    | 'fileStructure'
    | 'flashcardData'
    | 'flashcardHistory'
    | 'flashcardImages'
    | 'flashcardSetRelations'
    | 'flashcardSets'
    | 'messageBroker'
    | 'messageTemplate'
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

export type ActionType = AutomationEntity<"action">;
export type AiEndpointType = AutomationEntity<"aiEndpoint">;
export type AiModelType = AutomationEntity<"aiModel">;
export type AiModelEndpointType = AutomationEntity<"aiModelEndpoint">;
export type AiProviderType = AutomationEntity<"aiProvider">;
export type AiSettingsType = AutomationEntity<"aiSettings">;
export type ArgType = AutomationEntity<"arg">;
export type AutomationBoundaryBrokerType = AutomationEntity<"automationBoundaryBroker">;
export type AutomationMatrixType = AutomationEntity<"automationMatrix">;
export type BrokerType = AutomationEntity<"broker">;
export type BucketStructuresType = AutomationEntity<"bucketStructures">;
export type BucketTreeStructuresType = AutomationEntity<"bucketTreeStructures">;
export type DataInputComponentType = AutomationEntity<"dataInputComponent">;
export type DataOutputComponentType = AutomationEntity<"dataOutputComponent">;
export type DisplayOptionType = AutomationEntity<"displayOption">;
export type EmailsType = AutomationEntity<"emails">;
export type ExtractorType = AutomationEntity<"extractor">;
export type FileStructureType = AutomationEntity<"fileStructure">;
export type FlashcardDataType = AutomationEntity<"flashcardData">;
export type FlashcardHistoryType = AutomationEntity<"flashcardHistory">;
export type FlashcardImagesType = AutomationEntity<"flashcardImages">;
export type FlashcardSetRelationsType = AutomationEntity<"flashcardSetRelations">;
export type FlashcardSetsType = AutomationEntity<"flashcardSets">;
export type MessageBrokerType = AutomationEntity<"messageBroker">;
export type MessageTemplateType = AutomationEntity<"messageTemplate">;
export type ProcessorType = AutomationEntity<"processor">;
export type RecipeType = AutomationEntity<"recipe">;
export type RecipeBrokerType = AutomationEntity<"recipeBroker">;
export type RecipeDisplayType = AutomationEntity<"recipeDisplay">;
export type RecipeFunctionType = AutomationEntity<"recipeFunction">;
export type RecipeModelType = AutomationEntity<"recipeModel">;
export type RecipeProcessorType = AutomationEntity<"recipeProcessor">;
export type RecipeToolType = AutomationEntity<"recipeTool">;
export type RegisteredFunctionType = AutomationEntity<"registeredFunction">;
export type SystemFunctionType = AutomationEntity<"systemFunction">;
export type ToolType = AutomationEntity<"tool">;
export type TransformerType = AutomationEntity<"transformer">;
export type UserPreferencesType = AutomationEntity<"userPreferences">;


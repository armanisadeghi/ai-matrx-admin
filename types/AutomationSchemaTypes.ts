// File: types/AutomationSchemaTypes.ts

import {AutomationType} from '@/types/AutomationTypes';

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
    'component';

export type OptionalNameFormats =
    'kebab' |
    'sqlFunctionRef' |
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

export type ActionType = AutomationType<"action">;
export type AiEndpointType = AutomationType<"aiEndpoint">;
export type AiModelType = AutomationType<"aiModel">;
export type ArgType = AutomationType<"arg">;
export type AutomationBoundaryBrokerType = AutomationType<"automationBoundaryBroker">;
export type AutomationMatrixType = AutomationType<"automationMatrix">;
export type BrokerType = AutomationType<"broker">;
export type DataInputComponentType = AutomationType<"dataInputComponent">;
export type DataOutputComponentType = AutomationType<"dataOutputComponent">;
export type DisplayOptionType = AutomationType<"displayOption">;
export type EmailsType = AutomationType<"emails">;
export type ExtractorType = AutomationType<"extractor">;
export type FlashcardDataType = AutomationType<"flashcardData">;
export type FlashcardHistoryType = AutomationType<"flashcardHistory">;
export type FlashcardImagesType = AutomationType<"flashcardImages">;
export type FlashcardSetRelationsType = AutomationType<"flashcardSetRelations">;
export type FlashcardSetsType = AutomationType<"flashcardSets">;
export type ProcessorType = AutomationType<"processor">;
export type RecipeType = AutomationType<"recipe">;
export type RecipeBrokerType = AutomationType<"recipeBroker">;
export type RecipeDisplayType = AutomationType<"recipeDisplay">;
export type RecipeFunctionType = AutomationType<"recipeFunction">;
export type RecipeModelType = AutomationType<"recipeModel">;
export type RecipeProcessorType = AutomationType<"recipeProcessor">;
export type RecipeToolType = AutomationType<"recipeTool">;
export type RegisteredFunctionType = AutomationType<"registeredFunction">;
export type SystemFunctionType = AutomationType<"systemFunction">;
export type ToolType = AutomationType<"tool">;
export type TransformerType = AutomationType<"transformer">;
export type UserPreferencesType = AutomationType<"userPreferences">;


// File: types/AutomationSchemaTypes.ts

import {initializeSchemaSystem} from '@/utils/schema/precomputeUtil';
import {AutomationTableStructure} from '@/types/automationTableTypes';

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


export type SchemaType = 'table' | 'view' | 'function' | 'procedure';




export type AutomationEntityName = AutomationTableName | AutomationViewName;


export type UnifiedSchemaCache = ReturnType<typeof initializeSchemaSystem>
export type ProcessedSchema = UnifiedSchemaCache['schema'];
export type SchemaEntityKeys = keyof ProcessedSchema;

export type EntityFields = ProcessedSchema[SchemaEntityKeys]['entityFields'];

export type EntityFieldNames = keyof ProcessedSchema["action"]['entityFields'];

export type EntityFieldDetails = EntityFields[keyof EntityFields];


export type NameVariationValues = {
    [K in NameFormat]: string;
};

export type FrontendName = NameVariationValues['frontend'];
export type BackendName = NameVariationValues['backend'];
export type DatabaseName = NameVariationValues['database'];
export type PrettyName = NameVariationValues['pretty'];
export type ComponentName = NameVariationValues['component'];
export type KebabName = NameVariationValues['kebab'];
export type SqlFunctionRefName = NameVariationValues['sqlFunctionRef'];
export type RestAPIName = NameVariationValues['RestAPI'];
export type GraphQLName = NameVariationValues['GraphQL'];
export type CustomName = NameVariationValues['custom'];

export type AllNameVariations = NameVariationValues[NameFormat];

export type NameMap = {
    [K in NameFormat]: NameVariationValues[K];
};




export type ActionType = ProcessedSchema["action"];
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


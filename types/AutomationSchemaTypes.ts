// File: types/AutomationSchemaTypes.ts

import { AutomationEntity, EntityData, EntityDataMixed, EntityDataOptional } from '@/types/entityTypes';

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

export type DataStructure = 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';

export type FetchStrategy = 'simple' | 'fk' | 'ifk' | 'm2m' | 'fkAndIfk' | 'm2mAndFk' | 'm2mAndIfk' | 'fkIfkAndM2M' | 'none';

export type RequiredNameFormats = 'frontend' | 'backend' | 'database' | 'pretty' | 'component' | 'kebab' | 'sqlFunctionRef';

export type OptionalNameFormats = 'RestAPI' | 'GraphQL' | 'custom';

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

export type AutomationCustomName = 'flashcard' | 'mathTutor' | 'scraper';

export type AutomationTableName =
    | 'action'
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

export type AutomationViewName = 'viewRegisteredFunction' | 'viewRegisteredFunctionAllRels';

export type AutomationEntityName = AutomationTableName | AutomationViewName;

// export type ProcessedSchema = ReturnType<typeof initializeTableSchema>;

// export type UnifiedSchemaCache = ReturnType<typeof initializeSchemaSystem>

// export type SchemaEntityKeys = keyof ProcessedSchema;

export type ActionType = AutomationEntity<'action'>;
export type ActionDataRequired = EntityData<'action'>;
export type ActionDataOptional = EntityDataOptional<'action'>;
export type ActionData = EntityDataMixed<'action'>;

export type AiEndpointType = AutomationEntity<'aiEndpoint'>;
export type AiEndpointDataRequired = EntityData<'aiEndpoint'>;
export type AiEndpointDataOptional = EntityDataOptional<'aiEndpoint'>;
export type AiEndpointData = EntityDataMixed<'aiEndpoint'>;

export type AiModelType = AutomationEntity<'aiModel'>;
export type AiModelDataRequired = EntityData<'aiModel'>;
export type AiModelDataOptional = EntityDataOptional<'aiModel'>;
export type AiModelData = EntityDataMixed<'aiModel'>;

export type AiModelEndpointType = AutomationEntity<'aiModelEndpoint'>;
export type AiModelEndpointDataRequired = EntityData<'aiModelEndpoint'>;
export type AiModelEndpointDataOptional = EntityDataOptional<'aiModelEndpoint'>;
export type AiModelEndpointData = EntityDataMixed<'aiModelEndpoint'>;

export type AiProviderType = AutomationEntity<'aiProvider'>;
export type AiProviderDataRequired = EntityData<'aiProvider'>;
export type AiProviderDataOptional = EntityDataOptional<'aiProvider'>;
export type AiProviderData = EntityDataMixed<'aiProvider'>;

export type AiSettingsType = AutomationEntity<'aiSettings'>;
export type AiSettingsDataRequired = EntityData<'aiSettings'>;
export type AiSettingsDataOptional = EntityDataOptional<'aiSettings'>;
export type AiSettingsData = EntityDataMixed<'aiSettings'>;

export type ArgType = AutomationEntity<'arg'>;
export type ArgDataRequired = EntityData<'arg'>;
export type ArgDataOptional = EntityDataOptional<'arg'>;
export type ArgData = EntityDataMixed<'arg'>;

export type AutomationBoundaryBrokerType = AutomationEntity<'automationBoundaryBroker'>;
export type AutomationBoundaryBrokerDataRequired = EntityData<'automationBoundaryBroker'>;
export type AutomationBoundaryBrokerDataOptional = EntityDataOptional<'automationBoundaryBroker'>;
export type AutomationBoundaryBrokerData = EntityDataMixed<'automationBoundaryBroker'>;

export type AutomationMatrixType = AutomationEntity<'automationMatrix'>;
export type AutomationMatrixDataRequired = EntityData<'automationMatrix'>;
export type AutomationMatrixDataOptional = EntityDataOptional<'automationMatrix'>;
export type AutomationMatrixData = EntityDataMixed<'automationMatrix'>;

export type BrokerType = AutomationEntity<'broker'>;
export type BrokerDataRequired = EntityData<'broker'>;
export type BrokerDataOptional = EntityDataOptional<'broker'>;
export type BrokerData = EntityDataMixed<'broker'>;

export type BucketStructuresType = AutomationEntity<'bucketStructures'>;
export type BucketStructuresDataRequired = EntityData<'bucketStructures'>;
export type BucketStructuresDataOptional = EntityDataOptional<'bucketStructures'>;
export type BucketStructuresData = EntityDataMixed<'bucketStructures'>;

export type BucketTreeStructuresType = AutomationEntity<'bucketTreeStructures'>;
export type BucketTreeStructuresDataRequired = EntityData<'bucketTreeStructures'>;
export type BucketTreeStructuresDataOptional = EntityDataOptional<'bucketTreeStructures'>;
export type BucketTreeStructuresData = EntityDataMixed<'bucketTreeStructures'>;

export type DataInputComponentType = AutomationEntity<'dataInputComponent'>;
export type DataInputComponentDataRequired = EntityData<'dataInputComponent'>;
export type DataInputComponentDataOptional = EntityDataOptional<'dataInputComponent'>;
export type DataInputComponentData = EntityDataMixed<'dataInputComponent'>;

export type DataOutputComponentType = AutomationEntity<'dataOutputComponent'>;
export type DataOutputComponentDataRequired = EntityData<'dataOutputComponent'>;
export type DataOutputComponentDataOptional = EntityDataOptional<'dataOutputComponent'>;
export type DataOutputComponentData = EntityDataMixed<'dataOutputComponent'>;

export type DisplayOptionType = AutomationEntity<'displayOption'>;
export type DisplayOptionDataRequired = EntityData<'displayOption'>;
export type DisplayOptionDataOptional = EntityDataOptional<'displayOption'>;
export type DisplayOptionData = EntityDataMixed<'displayOption'>;

export type EmailsType = AutomationEntity<'emails'>;
export type EmailsDataRequired = EntityData<'emails'>;
export type EmailsDataOptional = EntityDataOptional<'emails'>;
export type EmailsData = EntityDataMixed<'emails'>;

export type ExtractorType = AutomationEntity<'extractor'>;
export type ExtractorDataRequired = EntityData<'extractor'>;
export type ExtractorDataOptional = EntityDataOptional<'extractor'>;
export type ExtractorData = EntityDataMixed<'extractor'>;

export type FileStructureType = AutomationEntity<'fileStructure'>;
export type FileStructureDataRequired = EntityData<'fileStructure'>;
export type FileStructureDataOptional = EntityDataOptional<'fileStructure'>;
export type FileStructureData = EntityDataMixed<'fileStructure'>;

export type FlashcardDataType = AutomationEntity<'flashcardData'>;
export type FlashcardDataDataRequired = EntityData<'flashcardData'>;
export type FlashcardDataDataOptional = EntityDataOptional<'flashcardData'>;
export type FlashcardDataData = EntityDataMixed<'flashcardData'>;

export type FlashcardHistoryType = AutomationEntity<'flashcardHistory'>;
export type FlashcardHistoryDataRequired = EntityData<'flashcardHistory'>;
export type FlashcardHistoryDataOptional = EntityDataOptional<'flashcardHistory'>;
export type FlashcardHistoryData = EntityDataMixed<'flashcardHistory'>;

export type FlashcardImagesType = AutomationEntity<'flashcardImages'>;
export type FlashcardImagesDataRequired = EntityData<'flashcardImages'>;
export type FlashcardImagesDataOptional = EntityDataOptional<'flashcardImages'>;
export type FlashcardImagesData = EntityDataMixed<'flashcardImages'>;

export type FlashcardSetRelationsType = AutomationEntity<'flashcardSetRelations'>;
export type FlashcardSetRelationsDataRequired = EntityData<'flashcardSetRelations'>;
export type FlashcardSetRelationsDataOptional = EntityDataOptional<'flashcardSetRelations'>;
export type FlashcardSetRelationsData = EntityDataMixed<'flashcardSetRelations'>;

export type FlashcardSetsType = AutomationEntity<'flashcardSets'>;
export type FlashcardSetsDataRequired = EntityData<'flashcardSets'>;
export type FlashcardSetsDataOptional = EntityDataOptional<'flashcardSets'>;
export type FlashcardSetsData = EntityDataMixed<'flashcardSets'>;

export type MessageBrokerType = AutomationEntity<'messageBroker'>;
export type MessageBrokerDataRequired = EntityData<'messageBroker'>;
export type MessageBrokerDataOptional = EntityDataOptional<'messageBroker'>;
export type MessageBrokerData = EntityDataMixed<'messageBroker'>;

export type MessageTemplateType = AutomationEntity<'messageTemplate'>;
export type MessageTemplateDataRequired = EntityData<'messageTemplate'>;
export type MessageTemplateDataOptional = EntityDataOptional<'messageTemplate'>;
export type MessageTemplateData = EntityDataMixed<'messageTemplate'>;

export type ProcessorType = AutomationEntity<'processor'>;
export type ProcessorDataRequired = EntityData<'processor'>;
export type ProcessorDataOptional = EntityDataOptional<'processor'>;
export type ProcessorData = EntityDataMixed<'processor'>;

export type RecipeType = AutomationEntity<'recipe'>;
export type RecipeDataRequired = EntityData<'recipe'>;
export type RecipeDataOptional = EntityDataOptional<'recipe'>;
export type RecipeData = EntityDataMixed<'recipe'>;

export type RecipeBrokerType = AutomationEntity<'recipeBroker'>;
export type RecipeBrokerDataRequired = EntityData<'recipeBroker'>;
export type RecipeBrokerDataOptional = EntityDataOptional<'recipeBroker'>;
export type RecipeBrokerData = EntityDataMixed<'recipeBroker'>;

export type RecipeDisplayType = AutomationEntity<'recipeDisplay'>;
export type RecipeDisplayDataRequired = EntityData<'recipeDisplay'>;
export type RecipeDisplayDataOptional = EntityDataOptional<'recipeDisplay'>;
export type RecipeDisplayData = EntityDataMixed<'recipeDisplay'>;

export type RecipeFunctionType = AutomationEntity<'recipeFunction'>;
export type RecipeFunctionDataRequired = EntityData<'recipeFunction'>;
export type RecipeFunctionDataOptional = EntityDataOptional<'recipeFunction'>;
export type RecipeFunctionData = EntityDataMixed<'recipeFunction'>;

export type RecipeModelType = AutomationEntity<'recipeModel'>;
export type RecipeModelDataRequired = EntityData<'recipeModel'>;
export type RecipeModelDataOptional = EntityDataOptional<'recipeModel'>;
export type RecipeModelData = EntityDataMixed<'recipeModel'>;

export type RecipeProcessorType = AutomationEntity<'recipeProcessor'>;
export type RecipeProcessorDataRequired = EntityData<'recipeProcessor'>;
export type RecipeProcessorDataOptional = EntityDataOptional<'recipeProcessor'>;
export type RecipeProcessorData = EntityDataMixed<'recipeProcessor'>;

export type RecipeToolType = AutomationEntity<'recipeTool'>;
export type RecipeToolDataRequired = EntityData<'recipeTool'>;
export type RecipeToolDataOptional = EntityDataOptional<'recipeTool'>;
export type RecipeToolData = EntityDataMixed<'recipeTool'>;

export type RegisteredFunctionType = AutomationEntity<'registeredFunction'>;
export type RegisteredFunctionDataRequired = EntityData<'registeredFunction'>;
export type RegisteredFunctionDataOptional = EntityDataOptional<'registeredFunction'>;
export type RegisteredFunctionData = EntityDataMixed<'registeredFunction'>;

export type SystemFunctionType = AutomationEntity<'systemFunction'>;
export type SystemFunctionDataRequired = EntityData<'systemFunction'>;
export type SystemFunctionDataOptional = EntityDataOptional<'systemFunction'>;
export type SystemFunctionData = EntityDataMixed<'systemFunction'>;

export type ToolType = AutomationEntity<'tool'>;
export type ToolDataRequired = EntityData<'tool'>;
export type ToolDataOptional = EntityDataOptional<'tool'>;
export type ToolData = EntityDataMixed<'tool'>;

export type TransformerType = AutomationEntity<'transformer'>;
export type TransformerDataRequired = EntityData<'transformer'>;
export type TransformerDataOptional = EntityDataOptional<'transformer'>;
export type TransformerData = EntityDataMixed<'transformer'>;

export type UserPreferencesType = AutomationEntity<'userPreferences'>;
export type UserPreferencesDataRequired = EntityData<'userPreferences'>;
export type UserPreferencesDataOptional = EntityDataOptional<'userPreferences'>;
export type UserPreferencesData = EntityDataMixed<'userPreferences'>;

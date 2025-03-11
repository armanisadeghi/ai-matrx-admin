// File: types/AutomationSchemaTypes.ts
import {AutomationEntity, EntityData, EntityKeys, EntityDataMixed, EntityDataOptional, EntityDataWithKey, ProcessedEntityData} from '@/types/entityTypes';
import { EntityState } from '@/lib/redux/entity/types/stateTypes';

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
    | 'admins'
    | 'aiAgent'
    | 'aiEndpoint'
    | 'aiModel'
    | 'aiModelEndpoint'
    | 'aiProvider'
    | 'aiSettings'
    | 'applet'
    | 'arg'
    | 'audioLabel'
    | 'audioRecording'
    | 'audioRecordingUsers'
    | 'automationBoundaryBroker'
    | 'automationMatrix'
    | 'broker'
    | 'brokerValue'
    | 'bucketStructures'
    | 'bucketTreeStructures'
    | 'category'
    | 'compiledRecipe'
    | 'conversation'
    | 'dataBroker'
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
    | 'message'
    | 'messageBroker'
    | 'messageTemplate'
    | 'organizationInvitations'
    | 'organizationMembers'
    | 'organizations'
    | 'permissions'
    | 'processor'
    | 'projectMembers'
    | 'projects'
    | 'recipe'
    | 'recipeBroker'
    | 'recipeDisplay'
    | 'recipeFunction'
    | 'recipeMessage'
    | 'recipeMessageReorderQueue'
    | 'recipeModel'
    | 'recipeProcessor'
    | 'recipeTool'
    | 'registeredFunction'
    | 'subcategory'
    | 'systemFunction'
    | 'taskAssignments'
    | 'taskAttachments'
    | 'taskComments'
    | 'tasks'
    | 'tool'
    | 'transformer'
    | 'userPreferences'
    | 'wcClaim'
    | 'wcImpairmentDefinition'
    | 'wcInjury'
    | 'wcReport';

export type AutomationViewName =
    'viewRegisteredFunction'
    | 'viewRegisteredFunctionAllRels';

export type AutomationEntityName = AutomationTableName | AutomationViewName;

// export type ProcessedSchema = ReturnType<typeof initializeTableSchema>;

// export type UnifiedSchemaCache = ReturnType<typeof initializeSchemaSystem>

// export type SchemaEntityKeys = keyof ProcessedSchema;

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type ExpandRecursively<T> = T extends object ? (T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never) : T;export type ExpandExcept<T, KeysToExclude extends string[] = []> = T extends object
    ? {
   [K in keyof T]: K extends KeysToExclude[number] ? T[K] : ExpandExcept<T[K], KeysToExclude>;
} : T;

export type EntityStateType<TEntity extends EntityKeys> = ExpandExcept<EntityState<TEntity>, ["entityFields", "relationships", "unsavedRecords", "primaryKeyMetadata", "primaryKeyValues", "metadata"]>;

export type ActionType = AutomationEntity<"action">;
export type ActionDataRequired = Expand<EntityData<"action">>;
export type ActionDataOptional = Expand<EntityDataOptional<"action">>;
export type ActionRecordWithKey = Expand<EntityDataWithKey<"action">>;
export type ActionProcessed = Expand<ProcessedEntityData<"action">>;
export type ActionData = Expand<EntityDataMixed<"action">>;
export type ActionState = EntityStateType<"action">;

export type AdminsType = AutomationEntity<"admins">;
export type AdminsDataRequired = Expand<EntityData<"admins">>;
export type AdminsDataOptional = Expand<EntityDataOptional<"admins">>;
export type AdminsRecordWithKey = Expand<EntityDataWithKey<"admins">>;
export type AdminsProcessed = Expand<ProcessedEntityData<"admins">>;
export type AdminsData = Expand<EntityDataMixed<"admins">>;
export type AdminsState = EntityStateType<"admins">;

export type AiAgentType = AutomationEntity<"aiAgent">;
export type AiAgentDataRequired = Expand<EntityData<"aiAgent">>;
export type AiAgentDataOptional = Expand<EntityDataOptional<"aiAgent">>;
export type AiAgentRecordWithKey = Expand<EntityDataWithKey<"aiAgent">>;
export type AiAgentProcessed = Expand<ProcessedEntityData<"aiAgent">>;
export type AiAgentData = Expand<EntityDataMixed<"aiAgent">>;
export type AiAgentState = EntityStateType<"aiAgent">;

export type AiEndpointType = AutomationEntity<"aiEndpoint">;
export type AiEndpointDataRequired = Expand<EntityData<"aiEndpoint">>;
export type AiEndpointDataOptional = Expand<EntityDataOptional<"aiEndpoint">>;
export type AiEndpointRecordWithKey = Expand<EntityDataWithKey<"aiEndpoint">>;
export type AiEndpointProcessed = Expand<ProcessedEntityData<"aiEndpoint">>;
export type AiEndpointData = Expand<EntityDataMixed<"aiEndpoint">>;
export type AiEndpointState = EntityStateType<"aiEndpoint">;

export type AiModelType = AutomationEntity<"aiModel">;
export type AiModelDataRequired = Expand<EntityData<"aiModel">>;
export type AiModelDataOptional = Expand<EntityDataOptional<"aiModel">>;
export type AiModelRecordWithKey = Expand<EntityDataWithKey<"aiModel">>;
export type AiModelProcessed = Expand<ProcessedEntityData<"aiModel">>;
export type AiModelData = Expand<EntityDataMixed<"aiModel">>;
export type AiModelState = EntityStateType<"aiModel">;

export type AiModelEndpointType = AutomationEntity<"aiModelEndpoint">;
export type AiModelEndpointDataRequired = Expand<EntityData<"aiModelEndpoint">>;
export type AiModelEndpointDataOptional = Expand<EntityDataOptional<"aiModelEndpoint">>;
export type AiModelEndpointRecordWithKey = Expand<EntityDataWithKey<"aiModelEndpoint">>;
export type AiModelEndpointProcessed = Expand<ProcessedEntityData<"aiModelEndpoint">>;
export type AiModelEndpointData = Expand<EntityDataMixed<"aiModelEndpoint">>;
export type AiModelEndpointState = EntityStateType<"aiModelEndpoint">;

export type AiProviderType = AutomationEntity<"aiProvider">;
export type AiProviderDataRequired = Expand<EntityData<"aiProvider">>;
export type AiProviderDataOptional = Expand<EntityDataOptional<"aiProvider">>;
export type AiProviderRecordWithKey = Expand<EntityDataWithKey<"aiProvider">>;
export type AiProviderProcessed = Expand<ProcessedEntityData<"aiProvider">>;
export type AiProviderData = Expand<EntityDataMixed<"aiProvider">>;
export type AiProviderState = EntityStateType<"aiProvider">;

export type AiSettingsType = AutomationEntity<"aiSettings">;
export type AiSettingsDataRequired = Expand<EntityData<"aiSettings">>;
export type AiSettingsDataOptional = Expand<EntityDataOptional<"aiSettings">>;
export type AiSettingsRecordWithKey = Expand<EntityDataWithKey<"aiSettings">>;
export type AiSettingsProcessed = Expand<ProcessedEntityData<"aiSettings">>;
export type AiSettingsData = Expand<EntityDataMixed<"aiSettings">>;
export type AiSettingsState = EntityStateType<"aiSettings">;

export type AppletType = AutomationEntity<"applet">;
export type AppletDataRequired = Expand<EntityData<"applet">>;
export type AppletDataOptional = Expand<EntityDataOptional<"applet">>;
export type AppletRecordWithKey = Expand<EntityDataWithKey<"applet">>;
export type AppletProcessed = Expand<ProcessedEntityData<"applet">>;
export type AppletData = Expand<EntityDataMixed<"applet">>;
type AppletState = EntityStateType<"applet">;

export type ArgType = AutomationEntity<"arg">;
export type ArgDataRequired = Expand<EntityData<"arg">>;
export type ArgDataOptional = Expand<EntityDataOptional<"arg">>;
export type ArgRecordWithKey = Expand<EntityDataWithKey<"arg">>;
export type ArgProcessed = Expand<ProcessedEntityData<"arg">>;
export type ArgData = Expand<EntityDataMixed<"arg">>;
export type ArgState = EntityStateType<"arg">;

export type AudioLabelType = AutomationEntity<"audioLabel">;
export type AudioLabelDataRequired = Expand<EntityData<"audioLabel">>;
export type AudioLabelDataOptional = Expand<EntityDataOptional<"audioLabel">>;
export type AudioLabelRecordWithKey = Expand<EntityDataWithKey<"audioLabel">>;
export type AudioLabelProcessed = Expand<ProcessedEntityData<"audioLabel">>;
export type AudioLabelData = Expand<EntityDataMixed<"audioLabel">>;
export type AudioLabelState = EntityStateType<"audioLabel">;

export type AudioRecordingType = AutomationEntity<"audioRecording">;
export type AudioRecordingDataRequired = Expand<EntityData<"audioRecording">>;
export type AudioRecordingDataOptional = Expand<EntityDataOptional<"audioRecording">>;
export type AudioRecordingRecordWithKey = Expand<EntityDataWithKey<"audioRecording">>;
export type AudioRecordingProcessed = Expand<ProcessedEntityData<"audioRecording">>;
export type AudioRecordingData = Expand<EntityDataMixed<"audioRecording">>;
export type AudioRecordingState = EntityStateType<"audioRecording">;

export type AudioRecordingUsersType = AutomationEntity<"audioRecordingUsers">;
export type AudioRecordingUsersDataRequired = Expand<EntityData<"audioRecordingUsers">>;
export type AudioRecordingUsersDataOptional = Expand<EntityDataOptional<"audioRecordingUsers">>;
export type AudioRecordingUsersRecordWithKey = Expand<EntityDataWithKey<"audioRecordingUsers">>;
export type AudioRecordingUsersProcessed = Expand<ProcessedEntityData<"audioRecordingUsers">>;
export type AudioRecordingUsersData = Expand<EntityDataMixed<"audioRecordingUsers">>;
export type AudioRecordingUsersState = EntityStateType<"audioRecordingUsers">;

export type AutomationBoundaryBrokerType = AutomationEntity<"automationBoundaryBroker">;
export type AutomationBoundaryBrokerDataRequired = Expand<EntityData<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerDataOptional = Expand<EntityDataOptional<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerRecordWithKey = Expand<EntityDataWithKey<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerProcessed = Expand<ProcessedEntityData<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerData = Expand<EntityDataMixed<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerState = EntityStateType<"automationBoundaryBroker">;

export type AutomationMatrixType = AutomationEntity<"automationMatrix">;
export type AutomationMatrixDataRequired = Expand<EntityData<"automationMatrix">>;
export type AutomationMatrixDataOptional = Expand<EntityDataOptional<"automationMatrix">>;
export type AutomationMatrixRecordWithKey = Expand<EntityDataWithKey<"automationMatrix">>;
export type AutomationMatrixProcessed = Expand<ProcessedEntityData<"automationMatrix">>;
export type AutomationMatrixData = Expand<EntityDataMixed<"automationMatrix">>;
export type AutomationMatrixState = EntityStateType<"automationMatrix">;

export type BrokerType = AutomationEntity<"broker">;
export type BrokerDataRequired = Expand<EntityData<"broker">>;
export type BrokerDataOptional = Expand<EntityDataOptional<"broker">>;
export type BrokerRecordWithKey = Expand<EntityDataWithKey<"broker">>;
export type BrokerProcessed = Expand<ProcessedEntityData<"broker">>;
export type BrokerData = Expand<EntityDataMixed<"broker">>;
export type BrokerState = EntityStateType<"broker">;

export type BrokerValueType = AutomationEntity<"brokerValue">;
export type BrokerValueDataRequired = Expand<EntityData<"brokerValue">>;
export type BrokerValueDataOptional = Expand<EntityDataOptional<"brokerValue">>;
export type BrokerValueRecordWithKey = Expand<EntityDataWithKey<"brokerValue">>;
export type BrokerValueProcessed = Expand<ProcessedEntityData<"brokerValue">>;
export type BrokerValueData = Expand<EntityDataMixed<"brokerValue">>;
export type BrokerValueState = EntityStateType<"brokerValue">;

export type BucketStructuresType = AutomationEntity<"bucketStructures">;
export type BucketStructuresDataRequired = Expand<EntityData<"bucketStructures">>;
export type BucketStructuresDataOptional = Expand<EntityDataOptional<"bucketStructures">>;
export type BucketStructuresRecordWithKey = Expand<EntityDataWithKey<"bucketStructures">>;
export type BucketStructuresProcessed = Expand<ProcessedEntityData<"bucketStructures">>;
export type BucketStructuresData = Expand<EntityDataMixed<"bucketStructures">>;
export type BucketStructuresState = EntityStateType<"bucketStructures">;

export type BucketTreeStructuresType = AutomationEntity<"bucketTreeStructures">;
export type BucketTreeStructuresDataRequired = Expand<EntityData<"bucketTreeStructures">>;
export type BucketTreeStructuresDataOptional = Expand<EntityDataOptional<"bucketTreeStructures">>;
export type BucketTreeStructuresRecordWithKey = Expand<EntityDataWithKey<"bucketTreeStructures">>;
export type BucketTreeStructuresProcessed = Expand<ProcessedEntityData<"bucketTreeStructures">>;
export type BucketTreeStructuresData = Expand<EntityDataMixed<"bucketTreeStructures">>;
export type BucketTreeStructuresState = EntityStateType<"bucketTreeStructures">;

export type CategoryType = AutomationEntity<"category">;
export type CategoryDataRequired = Expand<EntityData<"category">>;
export type CategoryDataOptional = Expand<EntityDataOptional<"category">>;
export type CategoryRecordWithKey = Expand<EntityDataWithKey<"category">>;
export type CategoryProcessed = Expand<ProcessedEntityData<"category">>;
export type CategoryData = Expand<EntityDataMixed<"category">>;
export type CategoryState = EntityStateType<"category">;

export type CompiledRecipeType = AutomationEntity<"compiledRecipe">;
export type CompiledRecipeDataRequired = Expand<EntityData<"compiledRecipe">>;
export type CompiledRecipeDataOptional = Expand<EntityDataOptional<"compiledRecipe">>;
export type CompiledRecipeRecordWithKey = Expand<EntityDataWithKey<"compiledRecipe">>;
export type CompiledRecipeProcessed = Expand<ProcessedEntityData<"compiledRecipe">>;
export type CompiledRecipeData = Expand<EntityDataMixed<"compiledRecipe">>;
export type CompiledRecipeState = EntityStateType<"compiledRecipe">;

export type ConversationType = AutomationEntity<"conversation">;
export type ConversationDataRequired = Expand<EntityData<"conversation">>;
export type ConversationDataOptional = Expand<EntityDataOptional<"conversation">>;
export type ConversationRecordWithKey = Expand<EntityDataWithKey<"conversation">>;
export type ConversationProcessed = Expand<ProcessedEntityData<"conversation">>;
export type ConversationData = Expand<EntityDataMixed<"conversation">>;
export type ConversationState = EntityStateType<"conversation">;

export type DataBrokerType = AutomationEntity<"dataBroker">;
export type DataBrokerDataRequired = Expand<EntityData<"dataBroker">>;
export type DataBrokerDataOptional = Expand<EntityDataOptional<"dataBroker">>;
export type DataBrokerRecordWithKey = Expand<EntityDataWithKey<"dataBroker">>;
export type DataBrokerProcessed = Expand<ProcessedEntityData<"dataBroker">>;
export type DataBrokerData = Expand<EntityDataMixed<"dataBroker">>;
export type DataBrokerState = EntityStateType<"dataBroker">;

export type DataInputComponentType = AutomationEntity<"dataInputComponent">;
export type DataInputComponentDataRequired = Expand<EntityData<"dataInputComponent">>;
export type DataInputComponentDataOptional = Expand<EntityDataOptional<"dataInputComponent">>;
export type DataInputComponentRecordWithKey = Expand<EntityDataWithKey<"dataInputComponent">>;
export type DataInputComponentProcessed = Expand<ProcessedEntityData<"dataInputComponent">>;
export type DataInputComponentData = Expand<EntityDataMixed<"dataInputComponent">>;
export type DataInputComponentState = EntityStateType<"dataInputComponent">;

export type DataOutputComponentType = AutomationEntity<"dataOutputComponent">;
export type DataOutputComponentDataRequired = Expand<EntityData<"dataOutputComponent">>;
export type DataOutputComponentDataOptional = Expand<EntityDataOptional<"dataOutputComponent">>;
export type DataOutputComponentRecordWithKey = Expand<EntityDataWithKey<"dataOutputComponent">>;
export type DataOutputComponentProcessed = Expand<ProcessedEntityData<"dataOutputComponent">>;
export type DataOutputComponentData = Expand<EntityDataMixed<"dataOutputComponent">>;
export type DataOutputComponentState = EntityStateType<"dataOutputComponent">;

export type DisplayOptionType = AutomationEntity<"displayOption">;
export type DisplayOptionDataRequired = Expand<EntityData<"displayOption">>;
export type DisplayOptionDataOptional = Expand<EntityDataOptional<"displayOption">>;
export type DisplayOptionRecordWithKey = Expand<EntityDataWithKey<"displayOption">>;
export type DisplayOptionProcessed = Expand<ProcessedEntityData<"displayOption">>;
export type DisplayOptionData = Expand<EntityDataMixed<"displayOption">>;
export type DisplayOptionState = EntityStateType<"displayOption">;

export type EmailsType = AutomationEntity<"emails">;
export type EmailsDataRequired = Expand<EntityData<"emails">>;
export type EmailsDataOptional = Expand<EntityDataOptional<"emails">>;
export type EmailsRecordWithKey = Expand<EntityDataWithKey<"emails">>;
export type EmailsProcessed = Expand<ProcessedEntityData<"emails">>;
export type EmailsData = Expand<EntityDataMixed<"emails">>;
export type EmailsState = EntityStateType<"emails">;

export type ExtractorType = AutomationEntity<"extractor">;
export type ExtractorDataRequired = Expand<EntityData<"extractor">>;
export type ExtractorDataOptional = Expand<EntityDataOptional<"extractor">>;
export type ExtractorRecordWithKey = Expand<EntityDataWithKey<"extractor">>;
export type ExtractorProcessed = Expand<ProcessedEntityData<"extractor">>;
export type ExtractorData = Expand<EntityDataMixed<"extractor">>;
export type ExtractorState = EntityStateType<"extractor">;

export type FileStructureType = AutomationEntity<"fileStructure">;
export type FileStructureDataRequired = Expand<EntityData<"fileStructure">>;
export type FileStructureDataOptional = Expand<EntityDataOptional<"fileStructure">>;
export type FileStructureRecordWithKey = Expand<EntityDataWithKey<"fileStructure">>;
export type FileStructureProcessed = Expand<ProcessedEntityData<"fileStructure">>;
export type FileStructureData = Expand<EntityDataMixed<"fileStructure">>;
export type FileStructureState = EntityStateType<"fileStructure">;

export type FlashcardDataType = AutomationEntity<"flashcardData">;
export type FlashcardDataDataRequired = Expand<EntityData<"flashcardData">>;
export type FlashcardDataDataOptional = Expand<EntityDataOptional<"flashcardData">>;
export type FlashcardDataRecordWithKey = Expand<EntityDataWithKey<"flashcardData">>;
export type FlashcardDataProcessed = Expand<ProcessedEntityData<"flashcardData">>;
export type FlashcardDataData = Expand<EntityDataMixed<"flashcardData">>;
export type FlashcardDataState = EntityStateType<"flashcardData">;

export type FlashcardHistoryType = AutomationEntity<"flashcardHistory">;
export type FlashcardHistoryDataRequired = Expand<EntityData<"flashcardHistory">>;
export type FlashcardHistoryDataOptional = Expand<EntityDataOptional<"flashcardHistory">>;
export type FlashcardHistoryRecordWithKey = Expand<EntityDataWithKey<"flashcardHistory">>;
export type FlashcardHistoryProcessed = Expand<ProcessedEntityData<"flashcardHistory">>;
export type FlashcardHistoryData = Expand<EntityDataMixed<"flashcardHistory">>;
export type FlashcardHistoryState = EntityStateType<"flashcardHistory">;

export type FlashcardImagesType = AutomationEntity<"flashcardImages">;
export type FlashcardImagesDataRequired = Expand<EntityData<"flashcardImages">>;
export type FlashcardImagesDataOptional = Expand<EntityDataOptional<"flashcardImages">>;
export type FlashcardImagesRecordWithKey = Expand<EntityDataWithKey<"flashcardImages">>;
export type FlashcardImagesProcessed = Expand<ProcessedEntityData<"flashcardImages">>;
export type FlashcardImagesData = Expand<EntityDataMixed<"flashcardImages">>;
export type FlashcardImagesState = EntityStateType<"flashcardImages">;

export type FlashcardSetRelationsType = AutomationEntity<"flashcardSetRelations">;
export type FlashcardSetRelationsDataRequired = Expand<EntityData<"flashcardSetRelations">>;
export type FlashcardSetRelationsDataOptional = Expand<EntityDataOptional<"flashcardSetRelations">>;
export type FlashcardSetRelationsRecordWithKey = Expand<EntityDataWithKey<"flashcardSetRelations">>;
export type FlashcardSetRelationsProcessed = Expand<ProcessedEntityData<"flashcardSetRelations">>;
export type FlashcardSetRelationsData = Expand<EntityDataMixed<"flashcardSetRelations">>;
export type FlashcardSetRelationsState = EntityStateType<"flashcardSetRelations">;

export type FlashcardSetsType = AutomationEntity<"flashcardSets">;
export type FlashcardSetsDataRequired = Expand<EntityData<"flashcardSets">>;
export type FlashcardSetsDataOptional = Expand<EntityDataOptional<"flashcardSets">>;
export type FlashcardSetsRecordWithKey = Expand<EntityDataWithKey<"flashcardSets">>;
export type FlashcardSetsProcessed = Expand<ProcessedEntityData<"flashcardSets">>;
export type FlashcardSetsData = Expand<EntityDataMixed<"flashcardSets">>;
export type FlashcardSetsState = EntityStateType<"flashcardSets">;

export type MessageType = AutomationEntity<"message">;
export type MessageDataRequired = Expand<EntityData<"message">>;
export type MessageDataOptional = Expand<EntityDataOptional<"message">>;
export type MessageRecordWithKey = Expand<EntityDataWithKey<"message">>;
export type MessageProcessed = Expand<ProcessedEntityData<"message">>;
export type MessageData = Expand<EntityDataMixed<"message">>;
export type MessageState = EntityStateType<"message">;

export type MessageBrokerType = AutomationEntity<"messageBroker">;
export type MessageBrokerDataRequired = Expand<EntityData<"messageBroker">>;
export type MessageBrokerDataOptional = Expand<EntityDataOptional<"messageBroker">>;
export type MessageBrokerRecordWithKey = Expand<EntityDataWithKey<"messageBroker">>;
export type MessageBrokerProcessed = Expand<ProcessedEntityData<"messageBroker">>;
export type MessageBrokerData = Expand<EntityDataMixed<"messageBroker">>;
export type MessageBrokerState = EntityStateType<"messageBroker">;

export type MessageTemplateType = AutomationEntity<"messageTemplate">;
export type MessageTemplateDataRequired = Expand<EntityData<"messageTemplate">>;
export type MessageTemplateDataOptional = Expand<EntityDataOptional<"messageTemplate">>;
export type MessageTemplateRecordWithKey = Expand<EntityDataWithKey<"messageTemplate">>;
export type MessageTemplateProcessed = Expand<ProcessedEntityData<"messageTemplate">>;
export type MessageTemplateData = Expand<EntityDataMixed<"messageTemplate">>;
export type MessageTemplateState = EntityStateType<"messageTemplate">;

export type OrganizationInvitationsType = AutomationEntity<"organizationInvitations">;
export type OrganizationInvitationsDataRequired = Expand<EntityData<"organizationInvitations">>;
export type OrganizationInvitationsDataOptional = Expand<EntityDataOptional<"organizationInvitations">>;
export type OrganizationInvitationsRecordWithKey = Expand<EntityDataWithKey<"organizationInvitations">>;
export type OrganizationInvitationsProcessed = Expand<ProcessedEntityData<"organizationInvitations">>;
export type OrganizationInvitationsData = Expand<EntityDataMixed<"organizationInvitations">>;
export type OrganizationInvitationsState = EntityStateType<"organizationInvitations">;

export type OrganizationMembersType = AutomationEntity<"organizationMembers">;
export type OrganizationMembersDataRequired = Expand<EntityData<"organizationMembers">>;
export type OrganizationMembersDataOptional = Expand<EntityDataOptional<"organizationMembers">>;
export type OrganizationMembersRecordWithKey = Expand<EntityDataWithKey<"organizationMembers">>;
export type OrganizationMembersProcessed = Expand<ProcessedEntityData<"organizationMembers">>;
export type OrganizationMembersData = Expand<EntityDataMixed<"organizationMembers">>;
export type OrganizationMembersState = EntityStateType<"organizationMembers">;

export type OrganizationsType = AutomationEntity<"organizations">;
export type OrganizationsDataRequired = Expand<EntityData<"organizations">>;
export type OrganizationsDataOptional = Expand<EntityDataOptional<"organizations">>;
export type OrganizationsRecordWithKey = Expand<EntityDataWithKey<"organizations">>;
export type OrganizationsProcessed = Expand<ProcessedEntityData<"organizations">>;
export type OrganizationsData = Expand<EntityDataMixed<"organizations">>;
export type OrganizationsState = EntityStateType<"organizations">;

export type PermissionsType = AutomationEntity<"permissions">;
export type PermissionsDataRequired = Expand<EntityData<"permissions">>;
export type PermissionsDataOptional = Expand<EntityDataOptional<"permissions">>;
export type PermissionsRecordWithKey = Expand<EntityDataWithKey<"permissions">>;
export type PermissionsProcessed = Expand<ProcessedEntityData<"permissions">>;
export type PermissionsData = Expand<EntityDataMixed<"permissions">>;
export type PermissionsState = EntityStateType<"permissions">;

export type ProcessorType = AutomationEntity<"processor">;
export type ProcessorDataRequired = Expand<EntityData<"processor">>;
export type ProcessorDataOptional = Expand<EntityDataOptional<"processor">>;
export type ProcessorRecordWithKey = Expand<EntityDataWithKey<"processor">>;
export type ProcessorProcessed = Expand<ProcessedEntityData<"processor">>;
export type ProcessorData = Expand<EntityDataMixed<"processor">>;
export type ProcessorState = EntityStateType<"processor">;

export type ProjectMembersType = AutomationEntity<"projectMembers">;
export type ProjectMembersDataRequired = Expand<EntityData<"projectMembers">>;
export type ProjectMembersDataOptional = Expand<EntityDataOptional<"projectMembers">>;
export type ProjectMembersRecordWithKey = Expand<EntityDataWithKey<"projectMembers">>;
export type ProjectMembersProcessed = Expand<ProcessedEntityData<"projectMembers">>;
export type ProjectMembersData = Expand<EntityDataMixed<"projectMembers">>;
export type ProjectMembersState = EntityStateType<"projectMembers">;

export type ProjectsType = AutomationEntity<"projects">;
export type ProjectsDataRequired = Expand<EntityData<"projects">>;
export type ProjectsDataOptional = Expand<EntityDataOptional<"projects">>;
export type ProjectsRecordWithKey = Expand<EntityDataWithKey<"projects">>;
export type ProjectsProcessed = Expand<ProcessedEntityData<"projects">>;
export type ProjectsData = Expand<EntityDataMixed<"projects">>;
export type ProjectsState = EntityStateType<"projects">;

export type RecipeType = AutomationEntity<"recipe">;
export type RecipeDataRequired = Expand<EntityData<"recipe">>;
export type RecipeDataOptional = Expand<EntityDataOptional<"recipe">>;
export type RecipeRecordWithKey = Expand<EntityDataWithKey<"recipe">>;
export type RecipeProcessed = Expand<ProcessedEntityData<"recipe">>;
export type RecipeData = Expand<EntityDataMixed<"recipe">>;
export type RecipeState = EntityStateType<"recipe">;

export type RecipeBrokerType = AutomationEntity<"recipeBroker">;
export type RecipeBrokerDataRequired = Expand<EntityData<"recipeBroker">>;
export type RecipeBrokerDataOptional = Expand<EntityDataOptional<"recipeBroker">>;
export type RecipeBrokerRecordWithKey = Expand<EntityDataWithKey<"recipeBroker">>;
export type RecipeBrokerProcessed = Expand<ProcessedEntityData<"recipeBroker">>;
export type RecipeBrokerData = Expand<EntityDataMixed<"recipeBroker">>;
export type RecipeBrokerState = EntityStateType<"recipeBroker">;

export type RecipeDisplayType = AutomationEntity<"recipeDisplay">;
export type RecipeDisplayDataRequired = Expand<EntityData<"recipeDisplay">>;
export type RecipeDisplayDataOptional = Expand<EntityDataOptional<"recipeDisplay">>;
export type RecipeDisplayRecordWithKey = Expand<EntityDataWithKey<"recipeDisplay">>;
export type RecipeDisplayProcessed = Expand<ProcessedEntityData<"recipeDisplay">>;
export type RecipeDisplayData = Expand<EntityDataMixed<"recipeDisplay">>;
export type RecipeDisplayState = EntityStateType<"recipeDisplay">;

export type RecipeFunctionType = AutomationEntity<"recipeFunction">;
export type RecipeFunctionDataRequired = Expand<EntityData<"recipeFunction">>;
export type RecipeFunctionDataOptional = Expand<EntityDataOptional<"recipeFunction">>;
export type RecipeFunctionRecordWithKey = Expand<EntityDataWithKey<"recipeFunction">>;
export type RecipeFunctionProcessed = Expand<ProcessedEntityData<"recipeFunction">>;
export type RecipeFunctionData = Expand<EntityDataMixed<"recipeFunction">>;
export type RecipeFunctionState = EntityStateType<"recipeFunction">;

export type RecipeMessageType = AutomationEntity<"recipeMessage">;
export type RecipeMessageDataRequired = Expand<EntityData<"recipeMessage">>;
export type RecipeMessageDataOptional = Expand<EntityDataOptional<"recipeMessage">>;
export type RecipeMessageRecordWithKey = Expand<EntityDataWithKey<"recipeMessage">>;
export type RecipeMessageProcessed = Expand<ProcessedEntityData<"recipeMessage">>;
export type RecipeMessageData = Expand<EntityDataMixed<"recipeMessage">>;
export type RecipeMessageState = EntityStateType<"recipeMessage">;

export type RecipeMessageReorderQueueType = AutomationEntity<"recipeMessageReorderQueue">;
export type RecipeMessageReorderQueueDataRequired = Expand<EntityData<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueDataOptional = Expand<EntityDataOptional<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueRecordWithKey = Expand<EntityDataWithKey<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueProcessed = Expand<ProcessedEntityData<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueData = Expand<EntityDataMixed<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueState = EntityStateType<"recipeMessageReorderQueue">;

export type RecipeModelType = AutomationEntity<"recipeModel">;
export type RecipeModelDataRequired = Expand<EntityData<"recipeModel">>;
export type RecipeModelDataOptional = Expand<EntityDataOptional<"recipeModel">>;
export type RecipeModelRecordWithKey = Expand<EntityDataWithKey<"recipeModel">>;
export type RecipeModelProcessed = Expand<ProcessedEntityData<"recipeModel">>;
export type RecipeModelData = Expand<EntityDataMixed<"recipeModel">>;
export type RecipeModelState = EntityStateType<"recipeModel">;

export type RecipeProcessorType = AutomationEntity<"recipeProcessor">;
export type RecipeProcessorDataRequired = Expand<EntityData<"recipeProcessor">>;
export type RecipeProcessorDataOptional = Expand<EntityDataOptional<"recipeProcessor">>;
export type RecipeProcessorRecordWithKey = Expand<EntityDataWithKey<"recipeProcessor">>;
export type RecipeProcessorProcessed = Expand<ProcessedEntityData<"recipeProcessor">>;
export type RecipeProcessorData = Expand<EntityDataMixed<"recipeProcessor">>;
export type RecipeProcessorState = EntityStateType<"recipeProcessor">;

export type RecipeToolType = AutomationEntity<"recipeTool">;
export type RecipeToolDataRequired = Expand<EntityData<"recipeTool">>;
export type RecipeToolDataOptional = Expand<EntityDataOptional<"recipeTool">>;
export type RecipeToolRecordWithKey = Expand<EntityDataWithKey<"recipeTool">>;
export type RecipeToolProcessed = Expand<ProcessedEntityData<"recipeTool">>;
export type RecipeToolData = Expand<EntityDataMixed<"recipeTool">>;
export type RecipeToolState = EntityStateType<"recipeTool">;

export type RegisteredFunctionType = AutomationEntity<"registeredFunction">;
export type RegisteredFunctionDataRequired = Expand<EntityData<"registeredFunction">>;
export type RegisteredFunctionDataOptional = Expand<EntityDataOptional<"registeredFunction">>;
export type RegisteredFunctionRecordWithKey = Expand<EntityDataWithKey<"registeredFunction">>;
export type RegisteredFunctionProcessed = Expand<ProcessedEntityData<"registeredFunction">>;
export type RegisteredFunctionData = Expand<EntityDataMixed<"registeredFunction">>;
export type RegisteredFunctionState = EntityStateType<"registeredFunction">;

export type SubcategoryType = AutomationEntity<"subcategory">;
export type SubcategoryDataRequired = Expand<EntityData<"subcategory">>;
export type SubcategoryDataOptional = Expand<EntityDataOptional<"subcategory">>;
export type SubcategoryRecordWithKey = Expand<EntityDataWithKey<"subcategory">>;
export type SubcategoryProcessed = Expand<ProcessedEntityData<"subcategory">>;
export type SubcategoryData = Expand<EntityDataMixed<"subcategory">>;
export type SubcategoryState = EntityStateType<"subcategory">;

export type SystemFunctionType = AutomationEntity<"systemFunction">;
export type SystemFunctionDataRequired = Expand<EntityData<"systemFunction">>;
export type SystemFunctionDataOptional = Expand<EntityDataOptional<"systemFunction">>;
export type SystemFunctionRecordWithKey = Expand<EntityDataWithKey<"systemFunction">>;
export type SystemFunctionProcessed = Expand<ProcessedEntityData<"systemFunction">>;
export type SystemFunctionData = Expand<EntityDataMixed<"systemFunction">>;
export type SystemFunctionState = EntityStateType<"systemFunction">;

export type TaskAssignmentsType = AutomationEntity<"taskAssignments">;
export type TaskAssignmentsDataRequired = Expand<EntityData<"taskAssignments">>;
export type TaskAssignmentsDataOptional = Expand<EntityDataOptional<"taskAssignments">>;
export type TaskAssignmentsRecordWithKey = Expand<EntityDataWithKey<"taskAssignments">>;
export type TaskAssignmentsProcessed = Expand<ProcessedEntityData<"taskAssignments">>;
export type TaskAssignmentsData = Expand<EntityDataMixed<"taskAssignments">>;
export type TaskAssignmentsState = EntityStateType<"taskAssignments">;

export type TaskAttachmentsType = AutomationEntity<"taskAttachments">;
export type TaskAttachmentsDataRequired = Expand<EntityData<"taskAttachments">>;
export type TaskAttachmentsDataOptional = Expand<EntityDataOptional<"taskAttachments">>;
export type TaskAttachmentsRecordWithKey = Expand<EntityDataWithKey<"taskAttachments">>;
export type TaskAttachmentsProcessed = Expand<ProcessedEntityData<"taskAttachments">>;
export type TaskAttachmentsData = Expand<EntityDataMixed<"taskAttachments">>;
export type TaskAttachmentsState = EntityStateType<"taskAttachments">;

export type TaskCommentsType = AutomationEntity<"taskComments">;
export type TaskCommentsDataRequired = Expand<EntityData<"taskComments">>;
export type TaskCommentsDataOptional = Expand<EntityDataOptional<"taskComments">>;
export type TaskCommentsRecordWithKey = Expand<EntityDataWithKey<"taskComments">>;
export type TaskCommentsProcessed = Expand<ProcessedEntityData<"taskComments">>;
export type TaskCommentsData = Expand<EntityDataMixed<"taskComments">>;
export type TaskCommentsState = EntityStateType<"taskComments">;

export type TasksType = AutomationEntity<"tasks">;
export type TasksDataRequired = Expand<EntityData<"tasks">>;
export type TasksDataOptional = Expand<EntityDataOptional<"tasks">>;
export type TasksRecordWithKey = Expand<EntityDataWithKey<"tasks">>;
export type TasksProcessed = Expand<ProcessedEntityData<"tasks">>;
export type TasksData = Expand<EntityDataMixed<"tasks">>;
export type TasksState = EntityStateType<"tasks">;

export type ToolType = AutomationEntity<"tool">;
export type ToolDataRequired = Expand<EntityData<"tool">>;
export type ToolDataOptional = Expand<EntityDataOptional<"tool">>;
export type ToolRecordWithKey = Expand<EntityDataWithKey<"tool">>;
export type ToolProcessed = Expand<ProcessedEntityData<"tool">>;
export type ToolData = Expand<EntityDataMixed<"tool">>;
export type ToolState = EntityStateType<"tool">;

export type TransformerType = AutomationEntity<"transformer">;
export type TransformerDataRequired = Expand<EntityData<"transformer">>;
export type TransformerDataOptional = Expand<EntityDataOptional<"transformer">>;
export type TransformerRecordWithKey = Expand<EntityDataWithKey<"transformer">>;
export type TransformerProcessed = Expand<ProcessedEntityData<"transformer">>;
export type TransformerData = Expand<EntityDataMixed<"transformer">>;
export type TransformerState = EntityStateType<"transformer">;

export type UserPreferencesType = AutomationEntity<"userPreferences">;
export type UserPreferencesDataRequired = Expand<EntityData<"userPreferences">>;
export type UserPreferencesDataOptional = Expand<EntityDataOptional<"userPreferences">>;
export type UserPreferencesRecordWithKey = Expand<EntityDataWithKey<"userPreferences">>;
export type UserPreferencesProcessed = Expand<ProcessedEntityData<"userPreferences">>;
export type UserPreferencesData = Expand<EntityDataMixed<"userPreferences">>;
export type UserPreferencesState = EntityStateType<"userPreferences">;

export type WcClaimType = AutomationEntity<"wcClaim">;
export type WcClaimDataRequired = Expand<EntityData<"wcClaim">>;
export type WcClaimDataOptional = Expand<EntityDataOptional<"wcClaim">>;
export type WcClaimRecordWithKey = Expand<EntityDataWithKey<"wcClaim">>;
export type WcClaimProcessed = Expand<ProcessedEntityData<"wcClaim">>;
export type WcClaimData = Expand<EntityDataMixed<"wcClaim">>;
export type WcClaimState = EntityStateType<"wcClaim">;

export type WcImpairmentDefinitionType = AutomationEntity<"wcImpairmentDefinition">;
export type WcImpairmentDefinitionDataRequired = Expand<EntityData<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionDataOptional = Expand<EntityDataOptional<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionRecordWithKey = Expand<EntityDataWithKey<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionProcessed = Expand<ProcessedEntityData<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionData = Expand<EntityDataMixed<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionState = EntityStateType<"wcImpairmentDefinition">;

export type WcInjuryType = AutomationEntity<"wcInjury">;
export type WcInjuryDataRequired = Expand<EntityData<"wcInjury">>;
export type WcInjuryDataOptional = Expand<EntityDataOptional<"wcInjury">>;
export type WcInjuryRecordWithKey = Expand<EntityDataWithKey<"wcInjury">>;
export type WcInjuryProcessed = Expand<ProcessedEntityData<"wcInjury">>;
export type WcInjuryData = Expand<EntityDataMixed<"wcInjury">>;
export type WcInjuryState = EntityStateType<"wcInjury">;

export type WcReportType = AutomationEntity<"wcReport">;
export type WcReportDataRequired = Expand<EntityData<"wcReport">>;
export type WcReportDataOptional = Expand<EntityDataOptional<"wcReport">>;
export type WcReportRecordWithKey = Expand<EntityDataWithKey<"wcReport">>;
export type WcReportProcessed = Expand<ProcessedEntityData<"wcReport">>;
export type WcReportData = Expand<EntityDataMixed<"wcReport">>;
export type WcReportState = EntityStateType<"wcReport">;
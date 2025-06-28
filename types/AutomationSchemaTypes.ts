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
    | 'aiTrainingData'
    | 'applet'
    | 'appletContainers'
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
    | 'componentGroups'
    | 'containerFields'
    | 'conversation'
    | 'customAppConfigs'
    | 'customAppletConfigs'
    | 'dataBroker'
    | 'dataInputComponent'
    | 'dataOutputComponent'
    | 'displayOption'
    | 'emails'
    | 'extractor'
    | 'fieldComponents'
    | 'fileStructure'
    | 'flashcardData'
    | 'flashcardHistory'
    | 'flashcardImages'
    | 'flashcardSetRelations'
    | 'flashcardSets'
    | 'fullSpectrumPositions'
    | 'htmlExtractions'
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
    | 'prompts'
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
    | 'schemaTemplates'
    | 'scrapeBaseConfig'
    | 'scrapeCachePolicy'
    | 'scrapeConfiguration'
    | 'scrapeCycleRun'
    | 'scrapeCycleTracker'
    | 'scrapeDomain'
    | 'scrapeDomainDisallowedNotes'
    | 'scrapeDomainNotes'
    | 'scrapeDomainQuickScrapeSettings'
    | 'scrapeDomainRobotsTxt'
    | 'scrapeDomainSitemap'
    | 'scrapeJob'
    | 'scrapeOverride'
    | 'scrapeOverrideValue'
    | 'scrapeParsedPage'
    | 'scrapePathPattern'
    | 'scrapePathPatternCachePolicy'
    | 'scrapePathPatternOverride'
    | 'scrapeQuickFailureLog'
    | 'scrapeTask'
    | 'scrapeTaskResponse'
    | 'subcategory'
    | 'systemFunction'
    | 'tableData'
    | 'tableFields'
    | 'taskAssignments'
    | 'taskAttachments'
    | 'taskComments'
    | 'tasks'
    | 'tool'
    | 'transformer'
    | 'userListItems'
    | 'userLists'
    | 'userPreferences'
    | 'userTables'
    | 'wcClaim'
    | 'wcImpairmentDefinition'
    | 'wcInjury'
    | 'wcReport'
    | 'workflow'
    | 'workflowData'
    | 'workflowEdge'
    | 'workflowNode'
    | 'workflowNodeData'
    | 'workflowRelay'
    | 'workflowUserInput';

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
export type ActionRecordMap = Record<"actionRecordId", ActionData>;

export type AdminsType = AutomationEntity<"admins">;
export type AdminsDataRequired = Expand<EntityData<"admins">>;
export type AdminsDataOptional = Expand<EntityDataOptional<"admins">>;
export type AdminsRecordWithKey = Expand<EntityDataWithKey<"admins">>;
export type AdminsProcessed = Expand<ProcessedEntityData<"admins">>;
export type AdminsData = Expand<EntityDataMixed<"admins">>;
export type AdminsState = EntityStateType<"admins">;
export type AdminsRecordMap = Record<"adminsRecordId", AdminsData>;

export type AiAgentType = AutomationEntity<"aiAgent">;
export type AiAgentDataRequired = Expand<EntityData<"aiAgent">>;
export type AiAgentDataOptional = Expand<EntityDataOptional<"aiAgent">>;
export type AiAgentRecordWithKey = Expand<EntityDataWithKey<"aiAgent">>;
export type AiAgentProcessed = Expand<ProcessedEntityData<"aiAgent">>;
export type AiAgentData = Expand<EntityDataMixed<"aiAgent">>;
export type AiAgentState = EntityStateType<"aiAgent">;
export type AiAgentRecordMap = Record<"aiAgentRecordId", AiAgentData>;

export type AiEndpointType = AutomationEntity<"aiEndpoint">;
export type AiEndpointDataRequired = Expand<EntityData<"aiEndpoint">>;
export type AiEndpointDataOptional = Expand<EntityDataOptional<"aiEndpoint">>;
export type AiEndpointRecordWithKey = Expand<EntityDataWithKey<"aiEndpoint">>;
export type AiEndpointProcessed = Expand<ProcessedEntityData<"aiEndpoint">>;
export type AiEndpointData = Expand<EntityDataMixed<"aiEndpoint">>;
export type AiEndpointState = EntityStateType<"aiEndpoint">;
export type AiEndpointRecordMap = Record<"aiEndpointRecordId", AiEndpointData>;

export type AiModelType = AutomationEntity<"aiModel">;
export type AiModelDataRequired = Expand<EntityData<"aiModel">>;
export type AiModelDataOptional = Expand<EntityDataOptional<"aiModel">>;
export type AiModelRecordWithKey = Expand<EntityDataWithKey<"aiModel">>;
export type AiModelProcessed = Expand<ProcessedEntityData<"aiModel">>;
export type AiModelData = Expand<EntityDataMixed<"aiModel">>;
export type AiModelState = EntityStateType<"aiModel">;
export type AiModelRecordMap = Record<"aiModelRecordId", AiModelData>;

export type AiModelEndpointType = AutomationEntity<"aiModelEndpoint">;
export type AiModelEndpointDataRequired = Expand<EntityData<"aiModelEndpoint">>;
export type AiModelEndpointDataOptional = Expand<EntityDataOptional<"aiModelEndpoint">>;
export type AiModelEndpointRecordWithKey = Expand<EntityDataWithKey<"aiModelEndpoint">>;
export type AiModelEndpointProcessed = Expand<ProcessedEntityData<"aiModelEndpoint">>;
export type AiModelEndpointData = Expand<EntityDataMixed<"aiModelEndpoint">>;
export type AiModelEndpointState = EntityStateType<"aiModelEndpoint">;
export type AiModelEndpointRecordMap = Record<"aiModelEndpointRecordId", AiModelEndpointData>;

export type AiProviderType = AutomationEntity<"aiProvider">;
export type AiProviderDataRequired = Expand<EntityData<"aiProvider">>;
export type AiProviderDataOptional = Expand<EntityDataOptional<"aiProvider">>;
export type AiProviderRecordWithKey = Expand<EntityDataWithKey<"aiProvider">>;
export type AiProviderProcessed = Expand<ProcessedEntityData<"aiProvider">>;
export type AiProviderData = Expand<EntityDataMixed<"aiProvider">>;
export type AiProviderState = EntityStateType<"aiProvider">;
export type AiProviderRecordMap = Record<"aiProviderRecordId", AiProviderData>;

export type AiSettingsType = AutomationEntity<"aiSettings">;
export type AiSettingsDataRequired = Expand<EntityData<"aiSettings">>;
export type AiSettingsDataOptional = Expand<EntityDataOptional<"aiSettings">>;
export type AiSettingsRecordWithKey = Expand<EntityDataWithKey<"aiSettings">>;
export type AiSettingsProcessed = Expand<ProcessedEntityData<"aiSettings">>;
export type AiSettingsData = Expand<EntityDataMixed<"aiSettings">>;
export type AiSettingsState = EntityStateType<"aiSettings">;
export type AiSettingsRecordMap = Record<"aiSettingsRecordId", AiSettingsData>;

export type AiTrainingDataType = AutomationEntity<"aiTrainingData">;
export type AiTrainingDataDataRequired = Expand<EntityData<"aiTrainingData">>;
export type AiTrainingDataDataOptional = Expand<EntityDataOptional<"aiTrainingData">>;
export type AiTrainingDataRecordWithKey = Expand<EntityDataWithKey<"aiTrainingData">>;
export type AiTrainingDataProcessed = Expand<ProcessedEntityData<"aiTrainingData">>;
export type AiTrainingDataData = Expand<EntityDataMixed<"aiTrainingData">>;
export type AiTrainingDataState = EntityStateType<"aiTrainingData">;
export type AiTrainingDataRecordMap = Record<"aiTrainingDataRecordId", AiTrainingDataData>;

export type AppletType = AutomationEntity<"applet">;
export type AppletDataRequired = Expand<EntityData<"applet">>;
export type AppletDataOptional = Expand<EntityDataOptional<"applet">>;
export type AppletRecordWithKey = Expand<EntityDataWithKey<"applet">>;
export type AppletProcessed = Expand<ProcessedEntityData<"applet">>;
export type AppletData = Expand<EntityDataMixed<"applet">>;
export type AppletState = EntityStateType<"applet">;
export type AppletRecordMap = Record<"appletRecordId", AppletData>;

export type AppletContainersType = AutomationEntity<"appletContainers">;
export type AppletContainersDataRequired = Expand<EntityData<"appletContainers">>;
export type AppletContainersDataOptional = Expand<EntityDataOptional<"appletContainers">>;
export type AppletContainersRecordWithKey = Expand<EntityDataWithKey<"appletContainers">>;
export type AppletContainersProcessed = Expand<ProcessedEntityData<"appletContainers">>;
export type AppletContainersData = Expand<EntityDataMixed<"appletContainers">>;
export type AppletContainersState = EntityStateType<"appletContainers">;
export type AppletContainersRecordMap = Record<"appletContainersRecordId", AppletContainersData>;

export type ArgType = AutomationEntity<"arg">;
export type ArgDataRequired = Expand<EntityData<"arg">>;
export type ArgDataOptional = Expand<EntityDataOptional<"arg">>;
export type ArgRecordWithKey = Expand<EntityDataWithKey<"arg">>;
export type ArgProcessed = Expand<ProcessedEntityData<"arg">>;
export type ArgData = Expand<EntityDataMixed<"arg">>;
export type ArgState = EntityStateType<"arg">;
export type ArgRecordMap = Record<"argRecordId", ArgData>;

export type AudioLabelType = AutomationEntity<"audioLabel">;
export type AudioLabelDataRequired = Expand<EntityData<"audioLabel">>;
export type AudioLabelDataOptional = Expand<EntityDataOptional<"audioLabel">>;
export type AudioLabelRecordWithKey = Expand<EntityDataWithKey<"audioLabel">>;
export type AudioLabelProcessed = Expand<ProcessedEntityData<"audioLabel">>;
export type AudioLabelData = Expand<EntityDataMixed<"audioLabel">>;
export type AudioLabelState = EntityStateType<"audioLabel">;
export type AudioLabelRecordMap = Record<"audioLabelRecordId", AudioLabelData>;

export type AudioRecordingType = AutomationEntity<"audioRecording">;
export type AudioRecordingDataRequired = Expand<EntityData<"audioRecording">>;
export type AudioRecordingDataOptional = Expand<EntityDataOptional<"audioRecording">>;
export type AudioRecordingRecordWithKey = Expand<EntityDataWithKey<"audioRecording">>;
export type AudioRecordingProcessed = Expand<ProcessedEntityData<"audioRecording">>;
export type AudioRecordingData = Expand<EntityDataMixed<"audioRecording">>;
export type AudioRecordingState = EntityStateType<"audioRecording">;
export type AudioRecordingRecordMap = Record<"audioRecordingRecordId", AudioRecordingData>;

export type AudioRecordingUsersType = AutomationEntity<"audioRecordingUsers">;
export type AudioRecordingUsersDataRequired = Expand<EntityData<"audioRecordingUsers">>;
export type AudioRecordingUsersDataOptional = Expand<EntityDataOptional<"audioRecordingUsers">>;
export type AudioRecordingUsersRecordWithKey = Expand<EntityDataWithKey<"audioRecordingUsers">>;
export type AudioRecordingUsersProcessed = Expand<ProcessedEntityData<"audioRecordingUsers">>;
export type AudioRecordingUsersData = Expand<EntityDataMixed<"audioRecordingUsers">>;
export type AudioRecordingUsersState = EntityStateType<"audioRecordingUsers">;
export type AudioRecordingUsersRecordMap = Record<"audioRecordingUsersRecordId", AudioRecordingUsersData>;

export type AutomationBoundaryBrokerType = AutomationEntity<"automationBoundaryBroker">;
export type AutomationBoundaryBrokerDataRequired = Expand<EntityData<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerDataOptional = Expand<EntityDataOptional<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerRecordWithKey = Expand<EntityDataWithKey<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerProcessed = Expand<ProcessedEntityData<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerData = Expand<EntityDataMixed<"automationBoundaryBroker">>;
export type AutomationBoundaryBrokerState = EntityStateType<"automationBoundaryBroker">;
export type AutomationBoundaryBrokerRecordMap = Record<"automationBoundaryBrokerRecordId", AutomationBoundaryBrokerData>;

export type AutomationMatrixType = AutomationEntity<"automationMatrix">;
export type AutomationMatrixDataRequired = Expand<EntityData<"automationMatrix">>;
export type AutomationMatrixDataOptional = Expand<EntityDataOptional<"automationMatrix">>;
export type AutomationMatrixRecordWithKey = Expand<EntityDataWithKey<"automationMatrix">>;
export type AutomationMatrixProcessed = Expand<ProcessedEntityData<"automationMatrix">>;
export type AutomationMatrixData = Expand<EntityDataMixed<"automationMatrix">>;
export type AutomationMatrixState = EntityStateType<"automationMatrix">;
export type AutomationMatrixRecordMap = Record<"automationMatrixRecordId", AutomationMatrixData>;

export type BrokerType = AutomationEntity<"broker">;
export type BrokerDataRequired = Expand<EntityData<"broker">>;
export type BrokerDataOptional = Expand<EntityDataOptional<"broker">>;
export type BrokerRecordWithKey = Expand<EntityDataWithKey<"broker">>;
export type BrokerProcessed = Expand<ProcessedEntityData<"broker">>;
export type BrokerData = Expand<EntityDataMixed<"broker">>;
export type BrokerState = EntityStateType<"broker">;
export type BrokerRecordMap = Record<"brokerRecordId", BrokerData>;

export type BrokerValueType = AutomationEntity<"brokerValue">;
export type BrokerValueDataRequired = Expand<EntityData<"brokerValue">>;
export type BrokerValueDataOptional = Expand<EntityDataOptional<"brokerValue">>;
export type BrokerValueRecordWithKey = Expand<EntityDataWithKey<"brokerValue">>;
export type BrokerValueProcessed = Expand<ProcessedEntityData<"brokerValue">>;
export type BrokerValueData = Expand<EntityDataMixed<"brokerValue">>;
export type BrokerValueState = EntityStateType<"brokerValue">;
export type BrokerValueRecordMap = Record<"brokerValueRecordId", BrokerValueData>;

export type BucketStructuresType = AutomationEntity<"bucketStructures">;
export type BucketStructuresDataRequired = Expand<EntityData<"bucketStructures">>;
export type BucketStructuresDataOptional = Expand<EntityDataOptional<"bucketStructures">>;
export type BucketStructuresRecordWithKey = Expand<EntityDataWithKey<"bucketStructures">>;
export type BucketStructuresProcessed = Expand<ProcessedEntityData<"bucketStructures">>;
export type BucketStructuresData = Expand<EntityDataMixed<"bucketStructures">>;
export type BucketStructuresState = EntityStateType<"bucketStructures">;
export type BucketStructuresRecordMap = Record<"bucketStructuresRecordId", BucketStructuresData>;

export type BucketTreeStructuresType = AutomationEntity<"bucketTreeStructures">;
export type BucketTreeStructuresDataRequired = Expand<EntityData<"bucketTreeStructures">>;
export type BucketTreeStructuresDataOptional = Expand<EntityDataOptional<"bucketTreeStructures">>;
export type BucketTreeStructuresRecordWithKey = Expand<EntityDataWithKey<"bucketTreeStructures">>;
export type BucketTreeStructuresProcessed = Expand<ProcessedEntityData<"bucketTreeStructures">>;
export type BucketTreeStructuresData = Expand<EntityDataMixed<"bucketTreeStructures">>;
export type BucketTreeStructuresState = EntityStateType<"bucketTreeStructures">;
export type BucketTreeStructuresRecordMap = Record<"bucketTreeStructuresRecordId", BucketTreeStructuresData>;

export type CategoryType = AutomationEntity<"category">;
export type CategoryDataRequired = Expand<EntityData<"category">>;
export type CategoryDataOptional = Expand<EntityDataOptional<"category">>;
export type CategoryRecordWithKey = Expand<EntityDataWithKey<"category">>;
export type CategoryProcessed = Expand<ProcessedEntityData<"category">>;
export type CategoryData = Expand<EntityDataMixed<"category">>;
export type CategoryState = EntityStateType<"category">;
export type CategoryRecordMap = Record<"categoryRecordId", CategoryData>;

export type CompiledRecipeType = AutomationEntity<"compiledRecipe">;
export type CompiledRecipeDataRequired = Expand<EntityData<"compiledRecipe">>;
export type CompiledRecipeDataOptional = Expand<EntityDataOptional<"compiledRecipe">>;
export type CompiledRecipeRecordWithKey = Expand<EntityDataWithKey<"compiledRecipe">>;
export type CompiledRecipeProcessed = Expand<ProcessedEntityData<"compiledRecipe">>;
export type CompiledRecipeData = Expand<EntityDataMixed<"compiledRecipe">>;
export type CompiledRecipeState = EntityStateType<"compiledRecipe">;
export type CompiledRecipeRecordMap = Record<"compiledRecipeRecordId", CompiledRecipeData>;

export type ComponentGroupsType = AutomationEntity<"componentGroups">;
export type ComponentGroupsDataRequired = Expand<EntityData<"componentGroups">>;
export type ComponentGroupsDataOptional = Expand<EntityDataOptional<"componentGroups">>;
export type ComponentGroupsRecordWithKey = Expand<EntityDataWithKey<"componentGroups">>;
export type ComponentGroupsProcessed = Expand<ProcessedEntityData<"componentGroups">>;
export type ComponentGroupsData = Expand<EntityDataMixed<"componentGroups">>;
export type ComponentGroupsState = EntityStateType<"componentGroups">;
export type ComponentGroupsRecordMap = Record<"componentGroupsRecordId", ComponentGroupsData>;

export type ContainerFieldsType = AutomationEntity<"containerFields">;
export type ContainerFieldsDataRequired = Expand<EntityData<"containerFields">>;
export type ContainerFieldsDataOptional = Expand<EntityDataOptional<"containerFields">>;
export type ContainerFieldsRecordWithKey = Expand<EntityDataWithKey<"containerFields">>;
export type ContainerFieldsProcessed = Expand<ProcessedEntityData<"containerFields">>;
export type ContainerFieldsData = Expand<EntityDataMixed<"containerFields">>;
export type ContainerFieldsState = EntityStateType<"containerFields">;
export type ContainerFieldsRecordMap = Record<"containerFieldsRecordId", ContainerFieldsData>;

export type ConversationType = AutomationEntity<"conversation">;
export type ConversationDataRequired = Expand<EntityData<"conversation">>;
export type ConversationDataOptional = Expand<EntityDataOptional<"conversation">>;
export type ConversationRecordWithKey = Expand<EntityDataWithKey<"conversation">>;
export type ConversationProcessed = Expand<ProcessedEntityData<"conversation">>;
export type ConversationData = Expand<EntityDataMixed<"conversation">>;
export type ConversationState = EntityStateType<"conversation">;
export type ConversationRecordMap = Record<"conversationRecordId", ConversationData>;

export type CustomAppConfigsType = AutomationEntity<"customAppConfigs">;
export type CustomAppConfigsDataRequired = Expand<EntityData<"customAppConfigs">>;
export type CustomAppConfigsDataOptional = Expand<EntityDataOptional<"customAppConfigs">>;
export type CustomAppConfigsRecordWithKey = Expand<EntityDataWithKey<"customAppConfigs">>;
export type CustomAppConfigsProcessed = Expand<ProcessedEntityData<"customAppConfigs">>;
export type CustomAppConfigsData = Expand<EntityDataMixed<"customAppConfigs">>;
export type CustomAppConfigsState = EntityStateType<"customAppConfigs">;
export type CustomAppConfigsRecordMap = Record<"customAppConfigsRecordId", CustomAppConfigsData>;

export type CustomAppletConfigsType = AutomationEntity<"customAppletConfigs">;
export type CustomAppletConfigsDataRequired = Expand<EntityData<"customAppletConfigs">>;
export type CustomAppletConfigsDataOptional = Expand<EntityDataOptional<"customAppletConfigs">>;
export type CustomAppletConfigsRecordWithKey = Expand<EntityDataWithKey<"customAppletConfigs">>;
export type CustomAppletConfigsProcessed = Expand<ProcessedEntityData<"customAppletConfigs">>;
export type CustomAppletConfigsData = Expand<EntityDataMixed<"customAppletConfigs">>;
export type CustomAppletConfigsState = EntityStateType<"customAppletConfigs">;
export type CustomAppletConfigsRecordMap = Record<"customAppletConfigsRecordId", CustomAppletConfigsData>;

export type DataBrokerType = AutomationEntity<"dataBroker">;
export type DataBrokerDataRequired = Expand<EntityData<"dataBroker">>;
export type DataBrokerDataOptional = Expand<EntityDataOptional<"dataBroker">>;
export type DataBrokerRecordWithKey = Expand<EntityDataWithKey<"dataBroker">>;
export type DataBrokerProcessed = Expand<ProcessedEntityData<"dataBroker">>;
export type DataBrokerData = Expand<EntityDataMixed<"dataBroker">>;
export type DataBrokerState = EntityStateType<"dataBroker">;
export type DataBrokerRecordMap = Record<"dataBrokerRecordId", DataBrokerData>;

export type DataInputComponentType = AutomationEntity<"dataInputComponent">;
export type DataInputComponentDataRequired = Expand<EntityData<"dataInputComponent">>;
export type DataInputComponentDataOptional = Expand<EntityDataOptional<"dataInputComponent">>;
export type DataInputComponentRecordWithKey = Expand<EntityDataWithKey<"dataInputComponent">>;
export type DataInputComponentProcessed = Expand<ProcessedEntityData<"dataInputComponent">>;
export type DataInputComponentData = Expand<EntityDataMixed<"dataInputComponent">>;
export type DataInputComponentState = EntityStateType<"dataInputComponent">;
export type DataInputComponentRecordMap = Record<"dataInputComponentRecordId", DataInputComponentData>;

export type DataOutputComponentType = AutomationEntity<"dataOutputComponent">;
export type DataOutputComponentDataRequired = Expand<EntityData<"dataOutputComponent">>;
export type DataOutputComponentDataOptional = Expand<EntityDataOptional<"dataOutputComponent">>;
export type DataOutputComponentRecordWithKey = Expand<EntityDataWithKey<"dataOutputComponent">>;
export type DataOutputComponentProcessed = Expand<ProcessedEntityData<"dataOutputComponent">>;
export type DataOutputComponentData = Expand<EntityDataMixed<"dataOutputComponent">>;
export type DataOutputComponentState = EntityStateType<"dataOutputComponent">;
export type DataOutputComponentRecordMap = Record<"dataOutputComponentRecordId", DataOutputComponentData>;

export type DisplayOptionType = AutomationEntity<"displayOption">;
export type DisplayOptionDataRequired = Expand<EntityData<"displayOption">>;
export type DisplayOptionDataOptional = Expand<EntityDataOptional<"displayOption">>;
export type DisplayOptionRecordWithKey = Expand<EntityDataWithKey<"displayOption">>;
export type DisplayOptionProcessed = Expand<ProcessedEntityData<"displayOption">>;
export type DisplayOptionData = Expand<EntityDataMixed<"displayOption">>;
export type DisplayOptionState = EntityStateType<"displayOption">;
export type DisplayOptionRecordMap = Record<"displayOptionRecordId", DisplayOptionData>;

export type EmailsType = AutomationEntity<"emails">;
export type EmailsDataRequired = Expand<EntityData<"emails">>;
export type EmailsDataOptional = Expand<EntityDataOptional<"emails">>;
export type EmailsRecordWithKey = Expand<EntityDataWithKey<"emails">>;
export type EmailsProcessed = Expand<ProcessedEntityData<"emails">>;
export type EmailsData = Expand<EntityDataMixed<"emails">>;
export type EmailsState = EntityStateType<"emails">;
export type EmailsRecordMap = Record<"emailsRecordId", EmailsData>;

export type ExtractorType = AutomationEntity<"extractor">;
export type ExtractorDataRequired = Expand<EntityData<"extractor">>;
export type ExtractorDataOptional = Expand<EntityDataOptional<"extractor">>;
export type ExtractorRecordWithKey = Expand<EntityDataWithKey<"extractor">>;
export type ExtractorProcessed = Expand<ProcessedEntityData<"extractor">>;
export type ExtractorData = Expand<EntityDataMixed<"extractor">>;
export type ExtractorState = EntityStateType<"extractor">;
export type ExtractorRecordMap = Record<"extractorRecordId", ExtractorData>;

export type FieldComponentsType = AutomationEntity<"fieldComponents">;
export type FieldComponentsDataRequired = Expand<EntityData<"fieldComponents">>;
export type FieldComponentsDataOptional = Expand<EntityDataOptional<"fieldComponents">>;
export type FieldComponentsRecordWithKey = Expand<EntityDataWithKey<"fieldComponents">>;
export type FieldComponentsProcessed = Expand<ProcessedEntityData<"fieldComponents">>;
export type FieldComponentsData = Expand<EntityDataMixed<"fieldComponents">>;
export type FieldComponentsState = EntityStateType<"fieldComponents">;
export type FieldComponentsRecordMap = Record<"fieldComponentsRecordId", FieldComponentsData>;

export type FileStructureType = AutomationEntity<"fileStructure">;
export type FileStructureDataRequired = Expand<EntityData<"fileStructure">>;
export type FileStructureDataOptional = Expand<EntityDataOptional<"fileStructure">>;
export type FileStructureRecordWithKey = Expand<EntityDataWithKey<"fileStructure">>;
export type FileStructureProcessed = Expand<ProcessedEntityData<"fileStructure">>;
export type FileStructureData = Expand<EntityDataMixed<"fileStructure">>;
export type FileStructureState = EntityStateType<"fileStructure">;
export type FileStructureRecordMap = Record<"fileStructureRecordId", FileStructureData>;

export type FlashcardDataType = AutomationEntity<"flashcardData">;
export type FlashcardDataDataRequired = Expand<EntityData<"flashcardData">>;
export type FlashcardDataDataOptional = Expand<EntityDataOptional<"flashcardData">>;
export type FlashcardDataRecordWithKey = Expand<EntityDataWithKey<"flashcardData">>;
export type FlashcardDataProcessed = Expand<ProcessedEntityData<"flashcardData">>;
export type FlashcardDataData = Expand<EntityDataMixed<"flashcardData">>;
export type FlashcardDataState = EntityStateType<"flashcardData">;
export type FlashcardDataRecordMap = Record<"flashcardDataRecordId", FlashcardDataData>;

export type FlashcardHistoryType = AutomationEntity<"flashcardHistory">;
export type FlashcardHistoryDataRequired = Expand<EntityData<"flashcardHistory">>;
export type FlashcardHistoryDataOptional = Expand<EntityDataOptional<"flashcardHistory">>;
export type FlashcardHistoryRecordWithKey = Expand<EntityDataWithKey<"flashcardHistory">>;
export type FlashcardHistoryProcessed = Expand<ProcessedEntityData<"flashcardHistory">>;
export type FlashcardHistoryData = Expand<EntityDataMixed<"flashcardHistory">>;
export type FlashcardHistoryState = EntityStateType<"flashcardHistory">;
export type FlashcardHistoryRecordMap = Record<"flashcardHistoryRecordId", FlashcardHistoryData>;

export type FlashcardImagesType = AutomationEntity<"flashcardImages">;
export type FlashcardImagesDataRequired = Expand<EntityData<"flashcardImages">>;
export type FlashcardImagesDataOptional = Expand<EntityDataOptional<"flashcardImages">>;
export type FlashcardImagesRecordWithKey = Expand<EntityDataWithKey<"flashcardImages">>;
export type FlashcardImagesProcessed = Expand<ProcessedEntityData<"flashcardImages">>;
export type FlashcardImagesData = Expand<EntityDataMixed<"flashcardImages">>;
export type FlashcardImagesState = EntityStateType<"flashcardImages">;
export type FlashcardImagesRecordMap = Record<"flashcardImagesRecordId", FlashcardImagesData>;

export type FlashcardSetRelationsType = AutomationEntity<"flashcardSetRelations">;
export type FlashcardSetRelationsDataRequired = Expand<EntityData<"flashcardSetRelations">>;
export type FlashcardSetRelationsDataOptional = Expand<EntityDataOptional<"flashcardSetRelations">>;
export type FlashcardSetRelationsRecordWithKey = Expand<EntityDataWithKey<"flashcardSetRelations">>;
export type FlashcardSetRelationsProcessed = Expand<ProcessedEntityData<"flashcardSetRelations">>;
export type FlashcardSetRelationsData = Expand<EntityDataMixed<"flashcardSetRelations">>;
export type FlashcardSetRelationsState = EntityStateType<"flashcardSetRelations">;
export type FlashcardSetRelationsRecordMap = Record<"flashcardSetRelationsRecordId", FlashcardSetRelationsData>;

export type FlashcardSetsType = AutomationEntity<"flashcardSets">;
export type FlashcardSetsDataRequired = Expand<EntityData<"flashcardSets">>;
export type FlashcardSetsDataOptional = Expand<EntityDataOptional<"flashcardSets">>;
export type FlashcardSetsRecordWithKey = Expand<EntityDataWithKey<"flashcardSets">>;
export type FlashcardSetsProcessed = Expand<ProcessedEntityData<"flashcardSets">>;
export type FlashcardSetsData = Expand<EntityDataMixed<"flashcardSets">>;
export type FlashcardSetsState = EntityStateType<"flashcardSets">;
export type FlashcardSetsRecordMap = Record<"flashcardSetsRecordId", FlashcardSetsData>;

export type FullSpectrumPositionsType = AutomationEntity<"fullSpectrumPositions">;
export type FullSpectrumPositionsDataRequired = Expand<EntityData<"fullSpectrumPositions">>;
export type FullSpectrumPositionsDataOptional = Expand<EntityDataOptional<"fullSpectrumPositions">>;
export type FullSpectrumPositionsRecordWithKey = Expand<EntityDataWithKey<"fullSpectrumPositions">>;
export type FullSpectrumPositionsProcessed = Expand<ProcessedEntityData<"fullSpectrumPositions">>;
export type FullSpectrumPositionsData = Expand<EntityDataMixed<"fullSpectrumPositions">>;
export type FullSpectrumPositionsState = EntityStateType<"fullSpectrumPositions">;
export type FullSpectrumPositionsRecordMap = Record<"fullSpectrumPositionsRecordId", FullSpectrumPositionsData>;

export type HtmlExtractionsType = AutomationEntity<"htmlExtractions">;
export type HtmlExtractionsDataRequired = Expand<EntityData<"htmlExtractions">>;
export type HtmlExtractionsDataOptional = Expand<EntityDataOptional<"htmlExtractions">>;
export type HtmlExtractionsRecordWithKey = Expand<EntityDataWithKey<"htmlExtractions">>;
export type HtmlExtractionsProcessed = Expand<ProcessedEntityData<"htmlExtractions">>;
export type HtmlExtractionsData = Expand<EntityDataMixed<"htmlExtractions">>;
export type HtmlExtractionsState = EntityStateType<"htmlExtractions">;
export type HtmlExtractionsRecordMap = Record<"htmlExtractionsRecordId", HtmlExtractionsData>;

export type MessageType = AutomationEntity<"message">;
export type MessageDataRequired = Expand<EntityData<"message">>;
export type MessageDataOptional = Expand<EntityDataOptional<"message">>;
export type MessageRecordWithKey = Expand<EntityDataWithKey<"message">>;
export type MessageProcessed = Expand<ProcessedEntityData<"message">>;
export type MessageData = Expand<EntityDataMixed<"message">>;
export type MessageState = EntityStateType<"message">;
export type MessageRecordMap = Record<"messageRecordId", MessageData>;

export type MessageBrokerType = AutomationEntity<"messageBroker">;
export type MessageBrokerDataRequired = Expand<EntityData<"messageBroker">>;
export type MessageBrokerDataOptional = Expand<EntityDataOptional<"messageBroker">>;
export type MessageBrokerRecordWithKey = Expand<EntityDataWithKey<"messageBroker">>;
export type MessageBrokerProcessed = Expand<ProcessedEntityData<"messageBroker">>;
export type MessageBrokerData = Expand<EntityDataMixed<"messageBroker">>;
export type MessageBrokerState = EntityStateType<"messageBroker">;
export type MessageBrokerRecordMap = Record<"messageBrokerRecordId", MessageBrokerData>;

export type MessageTemplateType = AutomationEntity<"messageTemplate">;
export type MessageTemplateDataRequired = Expand<EntityData<"messageTemplate">>;
export type MessageTemplateDataOptional = Expand<EntityDataOptional<"messageTemplate">>;
export type MessageTemplateRecordWithKey = Expand<EntityDataWithKey<"messageTemplate">>;
export type MessageTemplateProcessed = Expand<ProcessedEntityData<"messageTemplate">>;
export type MessageTemplateData = Expand<EntityDataMixed<"messageTemplate">>;
export type MessageTemplateState = EntityStateType<"messageTemplate">;
export type MessageTemplateRecordMap = Record<"messageTemplateRecordId", MessageTemplateData>;

export type OrganizationInvitationsType = AutomationEntity<"organizationInvitations">;
export type OrganizationInvitationsDataRequired = Expand<EntityData<"organizationInvitations">>;
export type OrganizationInvitationsDataOptional = Expand<EntityDataOptional<"organizationInvitations">>;
export type OrganizationInvitationsRecordWithKey = Expand<EntityDataWithKey<"organizationInvitations">>;
export type OrganizationInvitationsProcessed = Expand<ProcessedEntityData<"organizationInvitations">>;
export type OrganizationInvitationsData = Expand<EntityDataMixed<"organizationInvitations">>;
export type OrganizationInvitationsState = EntityStateType<"organizationInvitations">;
export type OrganizationInvitationsRecordMap = Record<"organizationInvitationsRecordId", OrganizationInvitationsData>;

export type OrganizationMembersType = AutomationEntity<"organizationMembers">;
export type OrganizationMembersDataRequired = Expand<EntityData<"organizationMembers">>;
export type OrganizationMembersDataOptional = Expand<EntityDataOptional<"organizationMembers">>;
export type OrganizationMembersRecordWithKey = Expand<EntityDataWithKey<"organizationMembers">>;
export type OrganizationMembersProcessed = Expand<ProcessedEntityData<"organizationMembers">>;
export type OrganizationMembersData = Expand<EntityDataMixed<"organizationMembers">>;
export type OrganizationMembersState = EntityStateType<"organizationMembers">;
export type OrganizationMembersRecordMap = Record<"organizationMembersRecordId", OrganizationMembersData>;

export type OrganizationsType = AutomationEntity<"organizations">;
export type OrganizationsDataRequired = Expand<EntityData<"organizations">>;
export type OrganizationsDataOptional = Expand<EntityDataOptional<"organizations">>;
export type OrganizationsRecordWithKey = Expand<EntityDataWithKey<"organizations">>;
export type OrganizationsProcessed = Expand<ProcessedEntityData<"organizations">>;
export type OrganizationsData = Expand<EntityDataMixed<"organizations">>;
export type OrganizationsState = EntityStateType<"organizations">;
export type OrganizationsRecordMap = Record<"organizationsRecordId", OrganizationsData>;

export type PermissionsType = AutomationEntity<"permissions">;
export type PermissionsDataRequired = Expand<EntityData<"permissions">>;
export type PermissionsDataOptional = Expand<EntityDataOptional<"permissions">>;
export type PermissionsRecordWithKey = Expand<EntityDataWithKey<"permissions">>;
export type PermissionsProcessed = Expand<ProcessedEntityData<"permissions">>;
export type PermissionsData = Expand<EntityDataMixed<"permissions">>;
export type PermissionsState = EntityStateType<"permissions">;
export type PermissionsRecordMap = Record<"permissionsRecordId", PermissionsData>;

export type ProcessorType = AutomationEntity<"processor">;
export type ProcessorDataRequired = Expand<EntityData<"processor">>;
export type ProcessorDataOptional = Expand<EntityDataOptional<"processor">>;
export type ProcessorRecordWithKey = Expand<EntityDataWithKey<"processor">>;
export type ProcessorProcessed = Expand<ProcessedEntityData<"processor">>;
export type ProcessorData = Expand<EntityDataMixed<"processor">>;
export type ProcessorState = EntityStateType<"processor">;
export type ProcessorRecordMap = Record<"processorRecordId", ProcessorData>;

export type ProjectMembersType = AutomationEntity<"projectMembers">;
export type ProjectMembersDataRequired = Expand<EntityData<"projectMembers">>;
export type ProjectMembersDataOptional = Expand<EntityDataOptional<"projectMembers">>;
export type ProjectMembersRecordWithKey = Expand<EntityDataWithKey<"projectMembers">>;
export type ProjectMembersProcessed = Expand<ProcessedEntityData<"projectMembers">>;
export type ProjectMembersData = Expand<EntityDataMixed<"projectMembers">>;
export type ProjectMembersState = EntityStateType<"projectMembers">;
export type ProjectMembersRecordMap = Record<"projectMembersRecordId", ProjectMembersData>;

export type ProjectsType = AutomationEntity<"projects">;
export type ProjectsDataRequired = Expand<EntityData<"projects">>;
export type ProjectsDataOptional = Expand<EntityDataOptional<"projects">>;
export type ProjectsRecordWithKey = Expand<EntityDataWithKey<"projects">>;
export type ProjectsProcessed = Expand<ProcessedEntityData<"projects">>;
export type ProjectsData = Expand<EntityDataMixed<"projects">>;
export type ProjectsState = EntityStateType<"projects">;
export type ProjectsRecordMap = Record<"projectsRecordId", ProjectsData>;

export type PromptsType = AutomationEntity<"prompts">;
export type PromptsDataRequired = Expand<EntityData<"prompts">>;
export type PromptsDataOptional = Expand<EntityDataOptional<"prompts">>;
export type PromptsRecordWithKey = Expand<EntityDataWithKey<"prompts">>;
export type PromptsProcessed = Expand<ProcessedEntityData<"prompts">>;
export type PromptsData = Expand<EntityDataMixed<"prompts">>;
export type PromptsState = EntityStateType<"prompts">;
export type PromptsRecordMap = Record<"promptsRecordId", PromptsData>;

export type RecipeType = AutomationEntity<"recipe">;
export type RecipeDataRequired = Expand<EntityData<"recipe">>;
export type RecipeDataOptional = Expand<EntityDataOptional<"recipe">>;
export type RecipeRecordWithKey = Expand<EntityDataWithKey<"recipe">>;
export type RecipeProcessed = Expand<ProcessedEntityData<"recipe">>;
export type RecipeData = Expand<EntityDataMixed<"recipe">>;
export type RecipeState = EntityStateType<"recipe">;
export type RecipeRecordMap = Record<"recipeRecordId", RecipeData>;

export type RecipeBrokerType = AutomationEntity<"recipeBroker">;
export type RecipeBrokerDataRequired = Expand<EntityData<"recipeBroker">>;
export type RecipeBrokerDataOptional = Expand<EntityDataOptional<"recipeBroker">>;
export type RecipeBrokerRecordWithKey = Expand<EntityDataWithKey<"recipeBroker">>;
export type RecipeBrokerProcessed = Expand<ProcessedEntityData<"recipeBroker">>;
export type RecipeBrokerData = Expand<EntityDataMixed<"recipeBroker">>;
export type RecipeBrokerState = EntityStateType<"recipeBroker">;
export type RecipeBrokerRecordMap = Record<"recipeBrokerRecordId", RecipeBrokerData>;

export type RecipeDisplayType = AutomationEntity<"recipeDisplay">;
export type RecipeDisplayDataRequired = Expand<EntityData<"recipeDisplay">>;
export type RecipeDisplayDataOptional = Expand<EntityDataOptional<"recipeDisplay">>;
export type RecipeDisplayRecordWithKey = Expand<EntityDataWithKey<"recipeDisplay">>;
export type RecipeDisplayProcessed = Expand<ProcessedEntityData<"recipeDisplay">>;
export type RecipeDisplayData = Expand<EntityDataMixed<"recipeDisplay">>;
export type RecipeDisplayState = EntityStateType<"recipeDisplay">;
export type RecipeDisplayRecordMap = Record<"recipeDisplayRecordId", RecipeDisplayData>;

export type RecipeFunctionType = AutomationEntity<"recipeFunction">;
export type RecipeFunctionDataRequired = Expand<EntityData<"recipeFunction">>;
export type RecipeFunctionDataOptional = Expand<EntityDataOptional<"recipeFunction">>;
export type RecipeFunctionRecordWithKey = Expand<EntityDataWithKey<"recipeFunction">>;
export type RecipeFunctionProcessed = Expand<ProcessedEntityData<"recipeFunction">>;
export type RecipeFunctionData = Expand<EntityDataMixed<"recipeFunction">>;
export type RecipeFunctionState = EntityStateType<"recipeFunction">;
export type RecipeFunctionRecordMap = Record<"recipeFunctionRecordId", RecipeFunctionData>;

export type RecipeMessageType = AutomationEntity<"recipeMessage">;
export type RecipeMessageDataRequired = Expand<EntityData<"recipeMessage">>;
export type RecipeMessageDataOptional = Expand<EntityDataOptional<"recipeMessage">>;
export type RecipeMessageRecordWithKey = Expand<EntityDataWithKey<"recipeMessage">>;
export type RecipeMessageProcessed = Expand<ProcessedEntityData<"recipeMessage">>;
export type RecipeMessageData = Expand<EntityDataMixed<"recipeMessage">>;
export type RecipeMessageState = EntityStateType<"recipeMessage">;
export type RecipeMessageRecordMap = Record<"recipeMessageRecordId", RecipeMessageData>;

export type RecipeMessageReorderQueueType = AutomationEntity<"recipeMessageReorderQueue">;
export type RecipeMessageReorderQueueDataRequired = Expand<EntityData<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueDataOptional = Expand<EntityDataOptional<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueRecordWithKey = Expand<EntityDataWithKey<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueProcessed = Expand<ProcessedEntityData<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueData = Expand<EntityDataMixed<"recipeMessageReorderQueue">>;
export type RecipeMessageReorderQueueState = EntityStateType<"recipeMessageReorderQueue">;
export type RecipeMessageReorderQueueRecordMap = Record<"recipeMessageReorderQueueRecordId", RecipeMessageReorderQueueData>;

export type RecipeModelType = AutomationEntity<"recipeModel">;
export type RecipeModelDataRequired = Expand<EntityData<"recipeModel">>;
export type RecipeModelDataOptional = Expand<EntityDataOptional<"recipeModel">>;
export type RecipeModelRecordWithKey = Expand<EntityDataWithKey<"recipeModel">>;
export type RecipeModelProcessed = Expand<ProcessedEntityData<"recipeModel">>;
export type RecipeModelData = Expand<EntityDataMixed<"recipeModel">>;
export type RecipeModelState = EntityStateType<"recipeModel">;
export type RecipeModelRecordMap = Record<"recipeModelRecordId", RecipeModelData>;

export type RecipeProcessorType = AutomationEntity<"recipeProcessor">;
export type RecipeProcessorDataRequired = Expand<EntityData<"recipeProcessor">>;
export type RecipeProcessorDataOptional = Expand<EntityDataOptional<"recipeProcessor">>;
export type RecipeProcessorRecordWithKey = Expand<EntityDataWithKey<"recipeProcessor">>;
export type RecipeProcessorProcessed = Expand<ProcessedEntityData<"recipeProcessor">>;
export type RecipeProcessorData = Expand<EntityDataMixed<"recipeProcessor">>;
export type RecipeProcessorState = EntityStateType<"recipeProcessor">;
export type RecipeProcessorRecordMap = Record<"recipeProcessorRecordId", RecipeProcessorData>;

export type RecipeToolType = AutomationEntity<"recipeTool">;
export type RecipeToolDataRequired = Expand<EntityData<"recipeTool">>;
export type RecipeToolDataOptional = Expand<EntityDataOptional<"recipeTool">>;
export type RecipeToolRecordWithKey = Expand<EntityDataWithKey<"recipeTool">>;
export type RecipeToolProcessed = Expand<ProcessedEntityData<"recipeTool">>;
export type RecipeToolData = Expand<EntityDataMixed<"recipeTool">>;
export type RecipeToolState = EntityStateType<"recipeTool">;
export type RecipeToolRecordMap = Record<"recipeToolRecordId", RecipeToolData>;

export type RegisteredFunctionType = AutomationEntity<"registeredFunction">;
export type RegisteredFunctionDataRequired = Expand<EntityData<"registeredFunction">>;
export type RegisteredFunctionDataOptional = Expand<EntityDataOptional<"registeredFunction">>;
export type RegisteredFunctionRecordWithKey = Expand<EntityDataWithKey<"registeredFunction">>;
export type RegisteredFunctionProcessed = Expand<ProcessedEntityData<"registeredFunction">>;
export type RegisteredFunctionData = Expand<EntityDataMixed<"registeredFunction">>;
export type RegisteredFunctionState = EntityStateType<"registeredFunction">;
export type RegisteredFunctionRecordMap = Record<"registeredFunctionRecordId", RegisteredFunctionData>;

export type SchemaTemplatesType = AutomationEntity<"schemaTemplates">;
export type SchemaTemplatesDataRequired = Expand<EntityData<"schemaTemplates">>;
export type SchemaTemplatesDataOptional = Expand<EntityDataOptional<"schemaTemplates">>;
export type SchemaTemplatesRecordWithKey = Expand<EntityDataWithKey<"schemaTemplates">>;
export type SchemaTemplatesProcessed = Expand<ProcessedEntityData<"schemaTemplates">>;
export type SchemaTemplatesData = Expand<EntityDataMixed<"schemaTemplates">>;
export type SchemaTemplatesState = EntityStateType<"schemaTemplates">;
export type SchemaTemplatesRecordMap = Record<"schemaTemplatesRecordId", SchemaTemplatesData>;

export type ScrapeBaseConfigType = AutomationEntity<"scrapeBaseConfig">;
export type ScrapeBaseConfigDataRequired = Expand<EntityData<"scrapeBaseConfig">>;
export type ScrapeBaseConfigDataOptional = Expand<EntityDataOptional<"scrapeBaseConfig">>;
export type ScrapeBaseConfigRecordWithKey = Expand<EntityDataWithKey<"scrapeBaseConfig">>;
export type ScrapeBaseConfigProcessed = Expand<ProcessedEntityData<"scrapeBaseConfig">>;
export type ScrapeBaseConfigData = Expand<EntityDataMixed<"scrapeBaseConfig">>;
export type ScrapeBaseConfigState = EntityStateType<"scrapeBaseConfig">;
export type ScrapeBaseConfigRecordMap = Record<"scrapeBaseConfigRecordId", ScrapeBaseConfigData>;

export type ScrapeCachePolicyType = AutomationEntity<"scrapeCachePolicy">;
export type ScrapeCachePolicyDataRequired = Expand<EntityData<"scrapeCachePolicy">>;
export type ScrapeCachePolicyDataOptional = Expand<EntityDataOptional<"scrapeCachePolicy">>;
export type ScrapeCachePolicyRecordWithKey = Expand<EntityDataWithKey<"scrapeCachePolicy">>;
export type ScrapeCachePolicyProcessed = Expand<ProcessedEntityData<"scrapeCachePolicy">>;
export type ScrapeCachePolicyData = Expand<EntityDataMixed<"scrapeCachePolicy">>;
export type ScrapeCachePolicyState = EntityStateType<"scrapeCachePolicy">;
export type ScrapeCachePolicyRecordMap = Record<"scrapeCachePolicyRecordId", ScrapeCachePolicyData>;

export type ScrapeConfigurationType = AutomationEntity<"scrapeConfiguration">;
export type ScrapeConfigurationDataRequired = Expand<EntityData<"scrapeConfiguration">>;
export type ScrapeConfigurationDataOptional = Expand<EntityDataOptional<"scrapeConfiguration">>;
export type ScrapeConfigurationRecordWithKey = Expand<EntityDataWithKey<"scrapeConfiguration">>;
export type ScrapeConfigurationProcessed = Expand<ProcessedEntityData<"scrapeConfiguration">>;
export type ScrapeConfigurationData = Expand<EntityDataMixed<"scrapeConfiguration">>;
export type ScrapeConfigurationState = EntityStateType<"scrapeConfiguration">;
export type ScrapeConfigurationRecordMap = Record<"scrapeConfigurationRecordId", ScrapeConfigurationData>;

export type ScrapeCycleRunType = AutomationEntity<"scrapeCycleRun">;
export type ScrapeCycleRunDataRequired = Expand<EntityData<"scrapeCycleRun">>;
export type ScrapeCycleRunDataOptional = Expand<EntityDataOptional<"scrapeCycleRun">>;
export type ScrapeCycleRunRecordWithKey = Expand<EntityDataWithKey<"scrapeCycleRun">>;
export type ScrapeCycleRunProcessed = Expand<ProcessedEntityData<"scrapeCycleRun">>;
export type ScrapeCycleRunData = Expand<EntityDataMixed<"scrapeCycleRun">>;
export type ScrapeCycleRunState = EntityStateType<"scrapeCycleRun">;
export type ScrapeCycleRunRecordMap = Record<"scrapeCycleRunRecordId", ScrapeCycleRunData>;

export type ScrapeCycleTrackerType = AutomationEntity<"scrapeCycleTracker">;
export type ScrapeCycleTrackerDataRequired = Expand<EntityData<"scrapeCycleTracker">>;
export type ScrapeCycleTrackerDataOptional = Expand<EntityDataOptional<"scrapeCycleTracker">>;
export type ScrapeCycleTrackerRecordWithKey = Expand<EntityDataWithKey<"scrapeCycleTracker">>;
export type ScrapeCycleTrackerProcessed = Expand<ProcessedEntityData<"scrapeCycleTracker">>;
export type ScrapeCycleTrackerData = Expand<EntityDataMixed<"scrapeCycleTracker">>;
export type ScrapeCycleTrackerState = EntityStateType<"scrapeCycleTracker">;
export type ScrapeCycleTrackerRecordMap = Record<"scrapeCycleTrackerRecordId", ScrapeCycleTrackerData>;

export type ScrapeDomainType = AutomationEntity<"scrapeDomain">;
export type ScrapeDomainDataRequired = Expand<EntityData<"scrapeDomain">>;
export type ScrapeDomainDataOptional = Expand<EntityDataOptional<"scrapeDomain">>;
export type ScrapeDomainRecordWithKey = Expand<EntityDataWithKey<"scrapeDomain">>;
export type ScrapeDomainProcessed = Expand<ProcessedEntityData<"scrapeDomain">>;
export type ScrapeDomainData = Expand<EntityDataMixed<"scrapeDomain">>;
export type ScrapeDomainState = EntityStateType<"scrapeDomain">;
export type ScrapeDomainRecordMap = Record<"scrapeDomainRecordId", ScrapeDomainData>;

export type ScrapeDomainDisallowedNotesType = AutomationEntity<"scrapeDomainDisallowedNotes">;
export type ScrapeDomainDisallowedNotesDataRequired = Expand<EntityData<"scrapeDomainDisallowedNotes">>;
export type ScrapeDomainDisallowedNotesDataOptional = Expand<EntityDataOptional<"scrapeDomainDisallowedNotes">>;
export type ScrapeDomainDisallowedNotesRecordWithKey = Expand<EntityDataWithKey<"scrapeDomainDisallowedNotes">>;
export type ScrapeDomainDisallowedNotesProcessed = Expand<ProcessedEntityData<"scrapeDomainDisallowedNotes">>;
export type ScrapeDomainDisallowedNotesData = Expand<EntityDataMixed<"scrapeDomainDisallowedNotes">>;
export type ScrapeDomainDisallowedNotesState = EntityStateType<"scrapeDomainDisallowedNotes">;
export type ScrapeDomainDisallowedNotesRecordMap = Record<"scrapeDomainDisallowedNotesRecordId", ScrapeDomainDisallowedNotesData>;

export type ScrapeDomainNotesType = AutomationEntity<"scrapeDomainNotes">;
export type ScrapeDomainNotesDataRequired = Expand<EntityData<"scrapeDomainNotes">>;
export type ScrapeDomainNotesDataOptional = Expand<EntityDataOptional<"scrapeDomainNotes">>;
export type ScrapeDomainNotesRecordWithKey = Expand<EntityDataWithKey<"scrapeDomainNotes">>;
export type ScrapeDomainNotesProcessed = Expand<ProcessedEntityData<"scrapeDomainNotes">>;
export type ScrapeDomainNotesData = Expand<EntityDataMixed<"scrapeDomainNotes">>;
export type ScrapeDomainNotesState = EntityStateType<"scrapeDomainNotes">;
export type ScrapeDomainNotesRecordMap = Record<"scrapeDomainNotesRecordId", ScrapeDomainNotesData>;

export type ScrapeDomainQuickScrapeSettingsType = AutomationEntity<"scrapeDomainQuickScrapeSettings">;
export type ScrapeDomainQuickScrapeSettingsDataRequired = Expand<EntityData<"scrapeDomainQuickScrapeSettings">>;
export type ScrapeDomainQuickScrapeSettingsDataOptional = Expand<EntityDataOptional<"scrapeDomainQuickScrapeSettings">>;
export type ScrapeDomainQuickScrapeSettingsRecordWithKey = Expand<EntityDataWithKey<"scrapeDomainQuickScrapeSettings">>;
export type ScrapeDomainQuickScrapeSettingsProcessed = Expand<ProcessedEntityData<"scrapeDomainQuickScrapeSettings">>;
export type ScrapeDomainQuickScrapeSettingsData = Expand<EntityDataMixed<"scrapeDomainQuickScrapeSettings">>;
export type ScrapeDomainQuickScrapeSettingsState = EntityStateType<"scrapeDomainQuickScrapeSettings">;
export type ScrapeDomainQuickScrapeSettingsRecordMap = Record<"scrapeDomainQuickScrapeSettingsRecordId", ScrapeDomainQuickScrapeSettingsData>;

export type ScrapeDomainRobotsTxtType = AutomationEntity<"scrapeDomainRobotsTxt">;
export type ScrapeDomainRobotsTxtDataRequired = Expand<EntityData<"scrapeDomainRobotsTxt">>;
export type ScrapeDomainRobotsTxtDataOptional = Expand<EntityDataOptional<"scrapeDomainRobotsTxt">>;
export type ScrapeDomainRobotsTxtRecordWithKey = Expand<EntityDataWithKey<"scrapeDomainRobotsTxt">>;
export type ScrapeDomainRobotsTxtProcessed = Expand<ProcessedEntityData<"scrapeDomainRobotsTxt">>;
export type ScrapeDomainRobotsTxtData = Expand<EntityDataMixed<"scrapeDomainRobotsTxt">>;
export type ScrapeDomainRobotsTxtState = EntityStateType<"scrapeDomainRobotsTxt">;
export type ScrapeDomainRobotsTxtRecordMap = Record<"scrapeDomainRobotsTxtRecordId", ScrapeDomainRobotsTxtData>;

export type ScrapeDomainSitemapType = AutomationEntity<"scrapeDomainSitemap">;
export type ScrapeDomainSitemapDataRequired = Expand<EntityData<"scrapeDomainSitemap">>;
export type ScrapeDomainSitemapDataOptional = Expand<EntityDataOptional<"scrapeDomainSitemap">>;
export type ScrapeDomainSitemapRecordWithKey = Expand<EntityDataWithKey<"scrapeDomainSitemap">>;
export type ScrapeDomainSitemapProcessed = Expand<ProcessedEntityData<"scrapeDomainSitemap">>;
export type ScrapeDomainSitemapData = Expand<EntityDataMixed<"scrapeDomainSitemap">>;
export type ScrapeDomainSitemapState = EntityStateType<"scrapeDomainSitemap">;
export type ScrapeDomainSitemapRecordMap = Record<"scrapeDomainSitemapRecordId", ScrapeDomainSitemapData>;

export type ScrapeJobType = AutomationEntity<"scrapeJob">;
export type ScrapeJobDataRequired = Expand<EntityData<"scrapeJob">>;
export type ScrapeJobDataOptional = Expand<EntityDataOptional<"scrapeJob">>;
export type ScrapeJobRecordWithKey = Expand<EntityDataWithKey<"scrapeJob">>;
export type ScrapeJobProcessed = Expand<ProcessedEntityData<"scrapeJob">>;
export type ScrapeJobData = Expand<EntityDataMixed<"scrapeJob">>;
export type ScrapeJobState = EntityStateType<"scrapeJob">;
export type ScrapeJobRecordMap = Record<"scrapeJobRecordId", ScrapeJobData>;

export type ScrapeOverrideType = AutomationEntity<"scrapeOverride">;
export type ScrapeOverrideDataRequired = Expand<EntityData<"scrapeOverride">>;
export type ScrapeOverrideDataOptional = Expand<EntityDataOptional<"scrapeOverride">>;
export type ScrapeOverrideRecordWithKey = Expand<EntityDataWithKey<"scrapeOverride">>;
export type ScrapeOverrideProcessed = Expand<ProcessedEntityData<"scrapeOverride">>;
export type ScrapeOverrideData = Expand<EntityDataMixed<"scrapeOverride">>;
export type ScrapeOverrideState = EntityStateType<"scrapeOverride">;
export type ScrapeOverrideRecordMap = Record<"scrapeOverrideRecordId", ScrapeOverrideData>;

export type ScrapeOverrideValueType = AutomationEntity<"scrapeOverrideValue">;
export type ScrapeOverrideValueDataRequired = Expand<EntityData<"scrapeOverrideValue">>;
export type ScrapeOverrideValueDataOptional = Expand<EntityDataOptional<"scrapeOverrideValue">>;
export type ScrapeOverrideValueRecordWithKey = Expand<EntityDataWithKey<"scrapeOverrideValue">>;
export type ScrapeOverrideValueProcessed = Expand<ProcessedEntityData<"scrapeOverrideValue">>;
export type ScrapeOverrideValueData = Expand<EntityDataMixed<"scrapeOverrideValue">>;
export type ScrapeOverrideValueState = EntityStateType<"scrapeOverrideValue">;
export type ScrapeOverrideValueRecordMap = Record<"scrapeOverrideValueRecordId", ScrapeOverrideValueData>;

export type ScrapeParsedPageType = AutomationEntity<"scrapeParsedPage">;
export type ScrapeParsedPageDataRequired = Expand<EntityData<"scrapeParsedPage">>;
export type ScrapeParsedPageDataOptional = Expand<EntityDataOptional<"scrapeParsedPage">>;
export type ScrapeParsedPageRecordWithKey = Expand<EntityDataWithKey<"scrapeParsedPage">>;
export type ScrapeParsedPageProcessed = Expand<ProcessedEntityData<"scrapeParsedPage">>;
export type ScrapeParsedPageData = Expand<EntityDataMixed<"scrapeParsedPage">>;
export type ScrapeParsedPageState = EntityStateType<"scrapeParsedPage">;
export type ScrapeParsedPageRecordMap = Record<"scrapeParsedPageRecordId", ScrapeParsedPageData>;

export type ScrapePathPatternType = AutomationEntity<"scrapePathPattern">;
export type ScrapePathPatternDataRequired = Expand<EntityData<"scrapePathPattern">>;
export type ScrapePathPatternDataOptional = Expand<EntityDataOptional<"scrapePathPattern">>;
export type ScrapePathPatternRecordWithKey = Expand<EntityDataWithKey<"scrapePathPattern">>;
export type ScrapePathPatternProcessed = Expand<ProcessedEntityData<"scrapePathPattern">>;
export type ScrapePathPatternData = Expand<EntityDataMixed<"scrapePathPattern">>;
export type ScrapePathPatternState = EntityStateType<"scrapePathPattern">;
export type ScrapePathPatternRecordMap = Record<"scrapePathPatternRecordId", ScrapePathPatternData>;

export type ScrapePathPatternCachePolicyType = AutomationEntity<"scrapePathPatternCachePolicy">;
export type ScrapePathPatternCachePolicyDataRequired = Expand<EntityData<"scrapePathPatternCachePolicy">>;
export type ScrapePathPatternCachePolicyDataOptional = Expand<EntityDataOptional<"scrapePathPatternCachePolicy">>;
export type ScrapePathPatternCachePolicyRecordWithKey = Expand<EntityDataWithKey<"scrapePathPatternCachePolicy">>;
export type ScrapePathPatternCachePolicyProcessed = Expand<ProcessedEntityData<"scrapePathPatternCachePolicy">>;
export type ScrapePathPatternCachePolicyData = Expand<EntityDataMixed<"scrapePathPatternCachePolicy">>;
export type ScrapePathPatternCachePolicyState = EntityStateType<"scrapePathPatternCachePolicy">;
export type ScrapePathPatternCachePolicyRecordMap = Record<"scrapePathPatternCachePolicyRecordId", ScrapePathPatternCachePolicyData>;

export type ScrapePathPatternOverrideType = AutomationEntity<"scrapePathPatternOverride">;
export type ScrapePathPatternOverrideDataRequired = Expand<EntityData<"scrapePathPatternOverride">>;
export type ScrapePathPatternOverrideDataOptional = Expand<EntityDataOptional<"scrapePathPatternOverride">>;
export type ScrapePathPatternOverrideRecordWithKey = Expand<EntityDataWithKey<"scrapePathPatternOverride">>;
export type ScrapePathPatternOverrideProcessed = Expand<ProcessedEntityData<"scrapePathPatternOverride">>;
export type ScrapePathPatternOverrideData = Expand<EntityDataMixed<"scrapePathPatternOverride">>;
export type ScrapePathPatternOverrideState = EntityStateType<"scrapePathPatternOverride">;
export type ScrapePathPatternOverrideRecordMap = Record<"scrapePathPatternOverrideRecordId", ScrapePathPatternOverrideData>;

export type ScrapeQuickFailureLogType = AutomationEntity<"scrapeQuickFailureLog">;
export type ScrapeQuickFailureLogDataRequired = Expand<EntityData<"scrapeQuickFailureLog">>;
export type ScrapeQuickFailureLogDataOptional = Expand<EntityDataOptional<"scrapeQuickFailureLog">>;
export type ScrapeQuickFailureLogRecordWithKey = Expand<EntityDataWithKey<"scrapeQuickFailureLog">>;
export type ScrapeQuickFailureLogProcessed = Expand<ProcessedEntityData<"scrapeQuickFailureLog">>;
export type ScrapeQuickFailureLogData = Expand<EntityDataMixed<"scrapeQuickFailureLog">>;
export type ScrapeQuickFailureLogState = EntityStateType<"scrapeQuickFailureLog">;
export type ScrapeQuickFailureLogRecordMap = Record<"scrapeQuickFailureLogRecordId", ScrapeQuickFailureLogData>;

export type ScrapeTaskType = AutomationEntity<"scrapeTask">;
export type ScrapeTaskDataRequired = Expand<EntityData<"scrapeTask">>;
export type ScrapeTaskDataOptional = Expand<EntityDataOptional<"scrapeTask">>;
export type ScrapeTaskRecordWithKey = Expand<EntityDataWithKey<"scrapeTask">>;
export type ScrapeTaskProcessed = Expand<ProcessedEntityData<"scrapeTask">>;
export type ScrapeTaskData = Expand<EntityDataMixed<"scrapeTask">>;
export type ScrapeTaskState = EntityStateType<"scrapeTask">;
export type ScrapeTaskRecordMap = Record<"scrapeTaskRecordId", ScrapeTaskData>;

export type ScrapeTaskResponseType = AutomationEntity<"scrapeTaskResponse">;
export type ScrapeTaskResponseDataRequired = Expand<EntityData<"scrapeTaskResponse">>;
export type ScrapeTaskResponseDataOptional = Expand<EntityDataOptional<"scrapeTaskResponse">>;
export type ScrapeTaskResponseRecordWithKey = Expand<EntityDataWithKey<"scrapeTaskResponse">>;
export type ScrapeTaskResponseProcessed = Expand<ProcessedEntityData<"scrapeTaskResponse">>;
export type ScrapeTaskResponseData = Expand<EntityDataMixed<"scrapeTaskResponse">>;
export type ScrapeTaskResponseState = EntityStateType<"scrapeTaskResponse">;
export type ScrapeTaskResponseRecordMap = Record<"scrapeTaskResponseRecordId", ScrapeTaskResponseData>;

export type SubcategoryType = AutomationEntity<"subcategory">;
export type SubcategoryDataRequired = Expand<EntityData<"subcategory">>;
export type SubcategoryDataOptional = Expand<EntityDataOptional<"subcategory">>;
export type SubcategoryRecordWithKey = Expand<EntityDataWithKey<"subcategory">>;
export type SubcategoryProcessed = Expand<ProcessedEntityData<"subcategory">>;
export type SubcategoryData = Expand<EntityDataMixed<"subcategory">>;
export type SubcategoryState = EntityStateType<"subcategory">;
export type SubcategoryRecordMap = Record<"subcategoryRecordId", SubcategoryData>;

export type SystemFunctionType = AutomationEntity<"systemFunction">;
export type SystemFunctionDataRequired = Expand<EntityData<"systemFunction">>;
export type SystemFunctionDataOptional = Expand<EntityDataOptional<"systemFunction">>;
export type SystemFunctionRecordWithKey = Expand<EntityDataWithKey<"systemFunction">>;
export type SystemFunctionProcessed = Expand<ProcessedEntityData<"systemFunction">>;
export type SystemFunctionData = Expand<EntityDataMixed<"systemFunction">>;
export type SystemFunctionState = EntityStateType<"systemFunction">;
export type SystemFunctionRecordMap = Record<"systemFunctionRecordId", SystemFunctionData>;

export type TableDataType = AutomationEntity<"tableData">;
export type TableDataDataRequired = Expand<EntityData<"tableData">>;
export type TableDataDataOptional = Expand<EntityDataOptional<"tableData">>;
export type TableDataRecordWithKey = Expand<EntityDataWithKey<"tableData">>;
export type TableDataProcessed = Expand<ProcessedEntityData<"tableData">>;
export type TableDataData = Expand<EntityDataMixed<"tableData">>;
export type TableDataState = EntityStateType<"tableData">;
export type TableDataRecordMap = Record<"tableDataRecordId", TableDataData>;

export type TableFieldsType = AutomationEntity<"tableFields">;
export type TableFieldsDataRequired = Expand<EntityData<"tableFields">>;
export type TableFieldsDataOptional = Expand<EntityDataOptional<"tableFields">>;
export type TableFieldsRecordWithKey = Expand<EntityDataWithKey<"tableFields">>;
export type TableFieldsProcessed = Expand<ProcessedEntityData<"tableFields">>;
export type TableFieldsData = Expand<EntityDataMixed<"tableFields">>;
export type TableFieldsState = EntityStateType<"tableFields">;
export type TableFieldsRecordMap = Record<"tableFieldsRecordId", TableFieldsData>;

export type TaskAssignmentsType = AutomationEntity<"taskAssignments">;
export type TaskAssignmentsDataRequired = Expand<EntityData<"taskAssignments">>;
export type TaskAssignmentsDataOptional = Expand<EntityDataOptional<"taskAssignments">>;
export type TaskAssignmentsRecordWithKey = Expand<EntityDataWithKey<"taskAssignments">>;
export type TaskAssignmentsProcessed = Expand<ProcessedEntityData<"taskAssignments">>;
export type TaskAssignmentsData = Expand<EntityDataMixed<"taskAssignments">>;
export type TaskAssignmentsState = EntityStateType<"taskAssignments">;
export type TaskAssignmentsRecordMap = Record<"taskAssignmentsRecordId", TaskAssignmentsData>;

export type TaskAttachmentsType = AutomationEntity<"taskAttachments">;
export type TaskAttachmentsDataRequired = Expand<EntityData<"taskAttachments">>;
export type TaskAttachmentsDataOptional = Expand<EntityDataOptional<"taskAttachments">>;
export type TaskAttachmentsRecordWithKey = Expand<EntityDataWithKey<"taskAttachments">>;
export type TaskAttachmentsProcessed = Expand<ProcessedEntityData<"taskAttachments">>;
export type TaskAttachmentsData = Expand<EntityDataMixed<"taskAttachments">>;
export type TaskAttachmentsState = EntityStateType<"taskAttachments">;
export type TaskAttachmentsRecordMap = Record<"taskAttachmentsRecordId", TaskAttachmentsData>;

export type TaskCommentsType = AutomationEntity<"taskComments">;
export type TaskCommentsDataRequired = Expand<EntityData<"taskComments">>;
export type TaskCommentsDataOptional = Expand<EntityDataOptional<"taskComments">>;
export type TaskCommentsRecordWithKey = Expand<EntityDataWithKey<"taskComments">>;
export type TaskCommentsProcessed = Expand<ProcessedEntityData<"taskComments">>;
export type TaskCommentsData = Expand<EntityDataMixed<"taskComments">>;
export type TaskCommentsState = EntityStateType<"taskComments">;
export type TaskCommentsRecordMap = Record<"taskCommentsRecordId", TaskCommentsData>;

export type TasksType = AutomationEntity<"tasks">;
export type TasksDataRequired = Expand<EntityData<"tasks">>;
export type TasksDataOptional = Expand<EntityDataOptional<"tasks">>;
export type TasksRecordWithKey = Expand<EntityDataWithKey<"tasks">>;
export type TasksProcessed = Expand<ProcessedEntityData<"tasks">>;
export type TasksData = Expand<EntityDataMixed<"tasks">>;
export type TasksState = EntityStateType<"tasks">;
export type TasksRecordMap = Record<"tasksRecordId", TasksData>;

export type ToolType = AutomationEntity<"tool">;
export type ToolDataRequired = Expand<EntityData<"tool">>;
export type ToolDataOptional = Expand<EntityDataOptional<"tool">>;
export type ToolRecordWithKey = Expand<EntityDataWithKey<"tool">>;
export type ToolProcessed = Expand<ProcessedEntityData<"tool">>;
export type ToolData = Expand<EntityDataMixed<"tool">>;
export type ToolState = EntityStateType<"tool">;
export type ToolRecordMap = Record<"toolRecordId", ToolData>;

export type TransformerType = AutomationEntity<"transformer">;
export type TransformerDataRequired = Expand<EntityData<"transformer">>;
export type TransformerDataOptional = Expand<EntityDataOptional<"transformer">>;
export type TransformerRecordWithKey = Expand<EntityDataWithKey<"transformer">>;
export type TransformerProcessed = Expand<ProcessedEntityData<"transformer">>;
export type TransformerData = Expand<EntityDataMixed<"transformer">>;
export type TransformerState = EntityStateType<"transformer">;
export type TransformerRecordMap = Record<"transformerRecordId", TransformerData>;

export type UserListItemsType = AutomationEntity<"userListItems">;
export type UserListItemsDataRequired = Expand<EntityData<"userListItems">>;
export type UserListItemsDataOptional = Expand<EntityDataOptional<"userListItems">>;
export type UserListItemsRecordWithKey = Expand<EntityDataWithKey<"userListItems">>;
export type UserListItemsProcessed = Expand<ProcessedEntityData<"userListItems">>;
export type UserListItemsData = Expand<EntityDataMixed<"userListItems">>;
export type UserListItemsState = EntityStateType<"userListItems">;
export type UserListItemsRecordMap = Record<"userListItemsRecordId", UserListItemsData>;

export type UserListsType = AutomationEntity<"userLists">;
export type UserListsDataRequired = Expand<EntityData<"userLists">>;
export type UserListsDataOptional = Expand<EntityDataOptional<"userLists">>;
export type UserListsRecordWithKey = Expand<EntityDataWithKey<"userLists">>;
export type UserListsProcessed = Expand<ProcessedEntityData<"userLists">>;
export type UserListsData = Expand<EntityDataMixed<"userLists">>;
export type UserListsState = EntityStateType<"userLists">;
export type UserListsRecordMap = Record<"userListsRecordId", UserListsData>;

export type UserPreferencesType = AutomationEntity<"userPreferences">;
export type UserPreferencesDataRequired = Expand<EntityData<"userPreferences">>;
export type UserPreferencesDataOptional = Expand<EntityDataOptional<"userPreferences">>;
export type UserPreferencesRecordWithKey = Expand<EntityDataWithKey<"userPreferences">>;
export type UserPreferencesProcessed = Expand<ProcessedEntityData<"userPreferences">>;
export type UserPreferencesData = Expand<EntityDataMixed<"userPreferences">>;
export type UserPreferencesState = EntityStateType<"userPreferences">;
export type UserPreferencesRecordMap = Record<"userPreferencesRecordId", UserPreferencesData>;

export type UserTablesType = AutomationEntity<"userTables">;
export type UserTablesDataRequired = Expand<EntityData<"userTables">>;
export type UserTablesDataOptional = Expand<EntityDataOptional<"userTables">>;
export type UserTablesRecordWithKey = Expand<EntityDataWithKey<"userTables">>;
export type UserTablesProcessed = Expand<ProcessedEntityData<"userTables">>;
export type UserTablesData = Expand<EntityDataMixed<"userTables">>;
export type UserTablesState = EntityStateType<"userTables">;
export type UserTablesRecordMap = Record<"userTablesRecordId", UserTablesData>;

export type WcClaimType = AutomationEntity<"wcClaim">;
export type WcClaimDataRequired = Expand<EntityData<"wcClaim">>;
export type WcClaimDataOptional = Expand<EntityDataOptional<"wcClaim">>;
export type WcClaimRecordWithKey = Expand<EntityDataWithKey<"wcClaim">>;
export type WcClaimProcessed = Expand<ProcessedEntityData<"wcClaim">>;
export type WcClaimData = Expand<EntityDataMixed<"wcClaim">>;
export type WcClaimState = EntityStateType<"wcClaim">;
export type WcClaimRecordMap = Record<"wcClaimRecordId", WcClaimData>;

export type WcImpairmentDefinitionType = AutomationEntity<"wcImpairmentDefinition">;
export type WcImpairmentDefinitionDataRequired = Expand<EntityData<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionDataOptional = Expand<EntityDataOptional<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionRecordWithKey = Expand<EntityDataWithKey<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionProcessed = Expand<ProcessedEntityData<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionData = Expand<EntityDataMixed<"wcImpairmentDefinition">>;
export type WcImpairmentDefinitionState = EntityStateType<"wcImpairmentDefinition">;
export type WcImpairmentDefinitionRecordMap = Record<"wcImpairmentDefinitionRecordId", WcImpairmentDefinitionData>;

export type WcInjuryType = AutomationEntity<"wcInjury">;
export type WcInjuryDataRequired = Expand<EntityData<"wcInjury">>;
export type WcInjuryDataOptional = Expand<EntityDataOptional<"wcInjury">>;
export type WcInjuryRecordWithKey = Expand<EntityDataWithKey<"wcInjury">>;
export type WcInjuryProcessed = Expand<ProcessedEntityData<"wcInjury">>;
export type WcInjuryData = Expand<EntityDataMixed<"wcInjury">>;
export type WcInjuryState = EntityStateType<"wcInjury">;
export type WcInjuryRecordMap = Record<"wcInjuryRecordId", WcInjuryData>;

export type WcReportType = AutomationEntity<"wcReport">;
export type WcReportDataRequired = Expand<EntityData<"wcReport">>;
export type WcReportDataOptional = Expand<EntityDataOptional<"wcReport">>;
export type WcReportRecordWithKey = Expand<EntityDataWithKey<"wcReport">>;
export type WcReportProcessed = Expand<ProcessedEntityData<"wcReport">>;
export type WcReportData = Expand<EntityDataMixed<"wcReport">>;
export type WcReportState = EntityStateType<"wcReport">;
export type WcReportRecordMap = Record<"wcReportRecordId", WcReportData>;

export type WorkflowType = AutomationEntity<"workflow">;
export type WorkflowDataRequired = Expand<EntityData<"workflow">>;
export type WorkflowDataOptional = Expand<EntityDataOptional<"workflow">>;
export type WorkflowRecordWithKey = Expand<EntityDataWithKey<"workflow">>;
export type WorkflowProcessed = Expand<ProcessedEntityData<"workflow">>;
export type WorkflowData = Expand<EntityDataMixed<"workflow">>;
export type WorkflowState = EntityStateType<"workflow">;
export type WorkflowRecordMap = Record<"workflowRecordId", WorkflowData>;

export type WorkflowDataType = AutomationEntity<"workflowData">;
export type WorkflowDataDataRequired = Expand<EntityData<"workflowData">>;
export type WorkflowDataDataOptional = Expand<EntityDataOptional<"workflowData">>;
export type WorkflowDataRecordWithKey = Expand<EntityDataWithKey<"workflowData">>;
export type WorkflowDataProcessed = Expand<ProcessedEntityData<"workflowData">>;
export type WorkflowDataData = Expand<EntityDataMixed<"workflowData">>;
export type WorkflowDataState = EntityStateType<"workflowData">;
export type WorkflowDataRecordMap = Record<"workflowDataRecordId", WorkflowDataData>;

export type WorkflowEdgeType = AutomationEntity<"workflowEdge">;
export type WorkflowEdgeDataRequired = Expand<EntityData<"workflowEdge">>;
export type WorkflowEdgeDataOptional = Expand<EntityDataOptional<"workflowEdge">>;
export type WorkflowEdgeRecordWithKey = Expand<EntityDataWithKey<"workflowEdge">>;
export type WorkflowEdgeProcessed = Expand<ProcessedEntityData<"workflowEdge">>;
export type WorkflowEdgeData = Expand<EntityDataMixed<"workflowEdge">>;
export type WorkflowEdgeState = EntityStateType<"workflowEdge">;
export type WorkflowEdgeRecordMap = Record<"workflowEdgeRecordId", WorkflowEdgeData>;

export type WorkflowNodeType = AutomationEntity<"workflowNode">;
export type WorkflowNodeDataRequired = Expand<EntityData<"workflowNode">>;
export type WorkflowNodeDataOptional = Expand<EntityDataOptional<"workflowNode">>;
export type WorkflowNodeRecordWithKey = Expand<EntityDataWithKey<"workflowNode">>;
export type WorkflowNodeProcessed = Expand<ProcessedEntityData<"workflowNode">>;
export type WorkflowNodeData = Expand<EntityDataMixed<"workflowNode">>;
export type WorkflowNodeState = EntityStateType<"workflowNode">;
export type WorkflowNodeRecordMap = Record<"workflowNodeRecordId", WorkflowNodeData>;

export type WorkflowNodeDataType = AutomationEntity<"workflowNodeData">;
export type WorkflowNodeDataDataRequired = Expand<EntityData<"workflowNodeData">>;
export type WorkflowNodeDataDataOptional = Expand<EntityDataOptional<"workflowNodeData">>;
export type WorkflowNodeDataRecordWithKey = Expand<EntityDataWithKey<"workflowNodeData">>;
export type WorkflowNodeDataProcessed = Expand<ProcessedEntityData<"workflowNodeData">>;
export type WorkflowNodeDataData = Expand<EntityDataMixed<"workflowNodeData">>;
export type WorkflowNodeDataState = EntityStateType<"workflowNodeData">;
export type WorkflowNodeDataRecordMap = Record<"workflowNodeDataRecordId", WorkflowNodeDataData>;

export type WorkflowRelayType = AutomationEntity<"workflowRelay">;
export type WorkflowRelayDataRequired = Expand<EntityData<"workflowRelay">>;
export type WorkflowRelayDataOptional = Expand<EntityDataOptional<"workflowRelay">>;
export type WorkflowRelayRecordWithKey = Expand<EntityDataWithKey<"workflowRelay">>;
export type WorkflowRelayProcessed = Expand<ProcessedEntityData<"workflowRelay">>;
export type WorkflowRelayData = Expand<EntityDataMixed<"workflowRelay">>;
export type WorkflowRelayState = EntityStateType<"workflowRelay">;
export type WorkflowRelayRecordMap = Record<"workflowRelayRecordId", WorkflowRelayData>;

export type WorkflowUserInputType = AutomationEntity<"workflowUserInput">;
export type WorkflowUserInputDataRequired = Expand<EntityData<"workflowUserInput">>;
export type WorkflowUserInputDataOptional = Expand<EntityDataOptional<"workflowUserInput">>;
export type WorkflowUserInputRecordWithKey = Expand<EntityDataWithKey<"workflowUserInput">>;
export type WorkflowUserInputProcessed = Expand<ProcessedEntityData<"workflowUserInput">>;
export type WorkflowUserInputData = Expand<EntityDataMixed<"workflowUserInput">>;
export type WorkflowUserInputState = EntityStateType<"workflowUserInput">;
export type WorkflowUserInputRecordMap = Record<"workflowUserInputRecordId", WorkflowUserInputData>;
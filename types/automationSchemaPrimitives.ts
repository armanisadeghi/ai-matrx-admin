// types/automationSchemaPrimitives.ts — leaf module (no type cycles). Split from AutomationSchemaTypes.

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
    | 'canvasCommentLikes'
    | 'canvasComments'
    | 'canvasItems'
    | 'canvasLikes'
    | 'canvasScores'
    | 'canvasViews'
    | 'category'
    | 'categoryConfigs'
    | 'compiledRecipe'
    | 'componentGroups'
    | 'containerFields'
    | 'contentBlocks'
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
    | 'microserviceProject'
    | 'nodeCategory'
    | 'notes'
    | 'organizationInvitations'
    | 'organizationMembers'
    | 'organizations'
    | 'permissions'
    | 'processor'
    | 'projectMembers'
    | 'projects'
    | 'promptTemplates'
    | 'prompts'
    | 'quizSessions'
    | 'recipe'
    | 'recipeBroker'
    | 'recipeDisplay'
    | 'recipeMessage'
    | 'recipeMessageReorderQueue'
    | 'recipeModel'
    | 'recipeProcessor'
    | 'registeredFunction'
    | 'registeredNode'
    | 'registeredNodeResults'
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
    | 'sharedCanvasItems'
    | 'siteMetadata'
    | 'subcategory'
    | 'subcategoryConfigs'
    | 'systemAnnouncements'
    | 'systemFunction'
    | 'tableData'
    | 'tableFields'
    | 'taskAssignments'
    | 'taskAttachments'
    | 'taskComments'
    | 'tasks'
    | 'tools'
    | 'transcripts'
    | 'transformer'
    | 'userAchievements'
    | 'userBookmarks'
    | 'userFeedback'
    | 'userFollows'
    | 'userListItems'
    | 'userLists'
    | 'userPreferences'
    | 'userStats'
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
    'recipeComplete'
    | 'viewRegisteredFunction'
    | 'viewRegisteredFunctionAllRels';

export type AutomationEntityName = AutomationTableName | AutomationViewName;

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;


export type EnumValues<T> = T extends TypeBrand<infer U> ? U : never;
export type ExtractType<T> = T extends TypeBrand<infer U> ? U : never;

export type ExpandRecursively<T> = T extends object ? (T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never) : T;

export type ExpandExcept<T, KeysToExclude extends string[] = []> = T extends object
    ? {
   [K in keyof T]: K extends KeysToExclude[number] ? T[K] : ExpandExcept<T[K], KeysToExclude>;
} : T;

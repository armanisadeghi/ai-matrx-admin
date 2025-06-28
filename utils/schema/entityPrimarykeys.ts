// File: utils/schema/entityPrimaryKeys.ts
export const primaryKeys = {
  action: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  admins: {
    frontendFields: ['user_id'],
    databaseColumns: ['userId'],
  },
  aiAgent: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  aiEndpoint: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  aiModel: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  aiModelEndpoint: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  aiProvider: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  aiSettings: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  aiTrainingData: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  applet: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  appletContainers: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  arg: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  audioLabel: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  audioRecording: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  audioRecordingUsers: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  automationBoundaryBroker: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  automationMatrix: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  broker: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  brokerValue: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  bucketStructures: {
    frontendFields: ['bucket_id'],
    databaseColumns: ['bucketId'],
  },
  bucketTreeStructures: {
    frontendFields: ['bucket_id'],
    databaseColumns: ['bucketId'],
  },
  category: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  compiledRecipe: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  componentGroups: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  containerFields: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  conversation: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  customAppConfigs: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  customAppletConfigs: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  dataBroker: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  dataInputComponent: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  dataOutputComponent: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  displayOption: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  emails: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  extractor: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  fieldComponents: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  fileStructure: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  flashcardData: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  flashcardHistory: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  flashcardImages: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  flashcardSetRelations: {
    frontendFields: ['flashcard_id', 'set_id'],
    databaseColumns: ['flashcardId', 'setId'],
  },
  flashcardSets: {
    frontendFields: ['set_id'],
    databaseColumns: ['setId'],
  },
  fullSpectrumPositions: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  htmlExtractions: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  message: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  messageBroker: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  messageTemplate: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  organizationInvitations: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  organizationMembers: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  organizations: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  permissions: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  processor: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  projectMembers: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  projects: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  prompts: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipe: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeBroker: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeDisplay: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeFunction: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeMessage: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeMessageReorderQueue: {
    frontendFields: ['recipe_id'],
    databaseColumns: ['recipeId'],
  },
  recipeModel: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeProcessor: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  recipeTool: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  registeredFunction: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  schemaTemplates: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeBaseConfig: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeCachePolicy: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeConfiguration: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeCycleRun: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeCycleTracker: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeDomain: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeDomainDisallowedNotes: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeDomainNotes: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeDomainQuickScrapeSettings: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeDomainRobotsTxt: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeDomainSitemap: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeJob: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeOverride: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeOverrideValue: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeParsedPage: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapePathPattern: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapePathPatternCachePolicy: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapePathPatternOverride: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeQuickFailureLog: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeTask: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  scrapeTaskResponse: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  subcategory: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  systemFunction: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  tableData: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  tableFields: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  taskAssignments: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  taskAttachments: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  taskComments: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  tasks: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  tool: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  transformer: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  userListItems: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  userLists: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  userPreferences: {
    frontendFields: ['user_id'],
    databaseColumns: ['userId'],
  },
  userTables: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  wcClaim: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  wcImpairmentDefinition: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  wcInjury: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  wcReport: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflow: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflowData: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflowEdge: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflowNode: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflowNodeData: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflowRelay: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
  workflowUserInput: {
    frontendFields: ['id'],
    databaseColumns: ['id'],
  },
};
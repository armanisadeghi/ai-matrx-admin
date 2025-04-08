// File: utils/schema/entityFieldNameGroups.ts
'use client';
import { EntityAnyFieldKey, EntityKeys } from '@/types';

export type FieldGroups = {
    nativeFields: EntityAnyFieldKey<EntityKeys>[];
    primaryKeyFields: EntityAnyFieldKey<EntityKeys>[];
    nativeFieldsNoPk: EntityAnyFieldKey<EntityKeys>[];
};

export type EntityFieldNameGroupsType = Record<EntityKeys, FieldGroups>;

export const entityFieldNameGroups: EntityFieldNameGroupsType =

{
  action: {
  nativeFields: ["id", "name", "matrix", "transformer", "nodeType", "referenceId"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "matrix", "transformer", "nodeType", "referenceId"]
},
  admins: {
  nativeFields: ["userId", "createdAt"],
  primaryKeyFields: ["userId"],
  nativeFieldsNoPk: ["createdAt"]
},
  aiAgent: {
  nativeFields: ["id", "name", "recipeId", "aiSettingsId", "systemMessageOverride"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "recipeId", "aiSettingsId", "systemMessageOverride"]
},
  aiEndpoint: {
  nativeFields: ["id", "name", "provider", "description", "additionalCost", "costDetails", "params"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "provider", "description", "additionalCost", "costDetails", "params"]
},
  aiModel: {
  nativeFields: ["id", "name", "commonName", "modelClass", "provider", "endpoints", "contextWindow", "maxTokens", "capabilities", "controls", "modelProvider"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "commonName", "modelClass", "provider", "endpoints", "contextWindow", "maxTokens", "capabilities", "controls", "modelProvider"]
},
  aiModelEndpoint: {
  nativeFields: ["id", "aiModelId", "aiEndpointId", "available", "endpointPriority", "configuration", "notes", "createdAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["aiModelId", "aiEndpointId", "available", "endpointPriority", "configuration", "notes", "createdAt"]
},
  aiProvider: {
  nativeFields: ["id", "name", "companyDescription", "documentationLink", "modelsLink"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "companyDescription", "documentationLink", "modelsLink"]
},
  aiSettings: {
  nativeFields: ["id", "aiEndpoint", "aiProvider", "aiModel", "temperature", "maxTokens", "topP", "frequencyPenalty", "presencePenalty", "stream", "responseFormat", "size", "quality", "count", "audioVoice", "audioFormat", "modalities", "tools", "presetName"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["aiEndpoint", "aiProvider", "aiModel", "temperature", "maxTokens", "topP", "frequencyPenalty", "presencePenalty", "stream", "responseFormat", "size", "quality", "count", "audioVoice", "audioFormat", "modalities", "tools", "presetName"]
},
  aiTrainingData: {
  nativeFields: ["id", "createdAt", "updatedAt", "userId", "isPublic", "systemPrompt", "userQuery", "thinkingContent", "responseContent", "reflectionContent", "qualityScore", "source", "metadata", "questionsThinking", "questionsContent", "structuredQuestions", "reflectionThinking"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "updatedAt", "userId", "isPublic", "systemPrompt", "userQuery", "thinkingContent", "responseContent", "reflectionContent", "qualityScore", "source", "metadata", "questionsThinking", "questionsContent", "structuredQuestions", "reflectionThinking"]
},
  applet: {
  nativeFields: ["id", "name", "description", "creator", "type", "compiledRecipeId", "slug", "createdAt", "userId", "isPublic", "dataSourceConfig", "resultComponentConfig", "nextStepConfig", "subcategoryId", "ctaText", "theme"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "description", "creator", "type", "compiledRecipeId", "slug", "createdAt", "userId", "isPublic", "dataSourceConfig", "resultComponentConfig", "nextStepConfig", "subcategoryId", "ctaText", "theme"]
},
  arg: {
  nativeFields: ["id", "name", "required", "default", "dataType", "ready", "registeredFunction"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "required", "default", "dataType", "ready", "registeredFunction"]
},
  audioLabel: {
  nativeFields: ["id", "createdAt", "name", "description"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "name", "description"]
},
  audioRecording: {
  nativeFields: ["id", "createdAt", "userId", "name", "label", "fileUrl", "duration", "localPath", "size", "isPublic"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "userId", "name", "label", "fileUrl", "duration", "localPath", "size", "isPublic"]
},
  audioRecordingUsers: {
  nativeFields: ["id", "createdAt", "firstName", "lastName", "email"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "firstName", "lastName", "email"]
},
  automationBoundaryBroker: {
  nativeFields: ["id", "matrix", "broker", "sparkSource", "beaconDestination"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["matrix", "broker", "sparkSource", "beaconDestination"]
},
  automationMatrix: {
  nativeFields: ["id", "name", "description", "averageSeconds", "isAutomated", "cognitionMatrices"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "description", "averageSeconds", "isAutomated", "cognitionMatrices"]
},
  broker: {
  nativeFields: ["id", "name", "value", "dataType", "ready", "defaultSource", "displayName", "description", "tooltip", "validationRules", "sampleEntries", "customSourceComponent", "additionalParams", "otherSourceParams", "defaultDestination", "outputComponent", "tags", "stringValue"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "value", "dataType", "ready", "defaultSource", "displayName", "description", "tooltip", "validationRules", "sampleEntries", "customSourceComponent", "additionalParams", "otherSourceParams", "defaultDestination", "outputComponent", "tags", "stringValue"]
},
  brokerValue: {
  nativeFields: ["id", "userId", "dataBroker", "data", "category", "subCategory", "tags", "comments", "createdAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["userId", "dataBroker", "data", "category", "subCategory", "tags", "comments", "createdAt"]
},
  bucketStructures: {
  nativeFields: ["bucketId", "structure", "lastUpdated"],
  primaryKeyFields: ["bucketId"],
  nativeFieldsNoPk: ["structure", "lastUpdated"]
},
  bucketTreeStructures: {
  nativeFields: ["bucketId", "treeStructure", "lastUpdated"],
  primaryKeyFields: ["bucketId"],
  nativeFieldsNoPk: ["treeStructure", "lastUpdated"]
},
  category: {
  nativeFields: ["id", "name", "description", "slug", "icon", "createdAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "description", "slug", "icon", "createdAt"]
},
  compiledRecipe: {
  nativeFields: ["id", "recipeId", "version", "compiledRecipe", "createdAt", "updatedAt", "userId", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipeId", "version", "compiledRecipe", "createdAt", "updatedAt", "userId", "isPublic", "authenticatedRead"]
},
  conversation: {
  nativeFields: ["id", "createdAt", "updatedAt", "userId", "metadata", "label", "isPublic", "description", "keywords"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "updatedAt", "userId", "metadata", "label", "isPublic", "description", "keywords"]
},
  dataBroker: {
  nativeFields: ["id", "name", "dataType", "defaultValue", "inputComponent", "color", "outputComponent"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "dataType", "defaultValue", "inputComponent", "color", "outputComponent"]
},
  dataInputComponent: {
  nativeFields: ["id", "options", "includeOther", "min", "max", "step", "acceptableFiletypes", "src", "colorOverrides", "additionalParams", "subComponent", "component", "name", "description", "placeholder", "containerClassName", "collapsibleClassName", "labelClassName", "descriptionClassName", "componentClassName", "size", "height", "width", "minHeight", "maxHeight", "minWidth", "maxWidth", "orientation"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["options", "includeOther", "min", "max", "step", "acceptableFiletypes", "src", "colorOverrides", "additionalParams", "subComponent", "component", "name", "description", "placeholder", "containerClassName", "collapsibleClassName", "labelClassName", "descriptionClassName", "componentClassName", "size", "height", "width", "minHeight", "maxHeight", "minWidth", "maxWidth", "orientation"]
},
  dataOutputComponent: {
  nativeFields: ["id", "componentType", "uiComponent", "props", "additionalParams"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["componentType", "uiComponent", "props", "additionalParams"]
},
  displayOption: {
  nativeFields: ["id", "name", "defaultParams", "customizableParams", "additionalParams"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "defaultParams", "customizableParams", "additionalParams"]
},
  emails: {
  nativeFields: ["id", "sender", "recipient", "subject", "body", "timestamp", "isRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["sender", "recipient", "subject", "body", "timestamp", "isRead"]
},
  extractor: {
  nativeFields: ["id", "name", "outputType", "defaultIdentifier", "defaultIndex"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "outputType", "defaultIdentifier", "defaultIndex"]
},
  fileStructure: {
  nativeFields: ["id", "bucketId", "path", "isFolder", "fileId", "parentPath", "name", "metadata", "createdAt", "updatedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["bucketId", "path", "isFolder", "fileId", "parentPath", "name", "metadata", "createdAt", "updatedAt"]
},
  flashcardData: {
  nativeFields: ["id", "userId", "topic", "lesson", "difficulty", "front", "back", "example", "detailedExplanation", "audioExplanation", "personalNotes", "isDeleted", "public", "sharedWith", "createdAt", "updatedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["userId", "topic", "lesson", "difficulty", "front", "back", "example", "detailedExplanation", "audioExplanation", "personalNotes", "isDeleted", "public", "sharedWith", "createdAt", "updatedAt"]
},
  flashcardHistory: {
  nativeFields: ["id", "flashcardId", "userId", "reviewCount", "correctCount", "incorrectCount", "createdAt", "updatedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["flashcardId", "userId", "reviewCount", "correctCount", "incorrectCount", "createdAt", "updatedAt"]
},
  flashcardImages: {
  nativeFields: ["id", "flashcardId", "filePath", "fileName", "mimeType", "size", "createdAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["flashcardId", "filePath", "fileName", "mimeType", "size", "createdAt"]
},
  flashcardSetRelations: {
  nativeFields: ["flashcardId", "setId", "order"],
  primaryKeyFields: ["flashcardId", "setId"],
  nativeFieldsNoPk: ["order"]
},
  flashcardSets: {
  nativeFields: ["setId", "userId", "name", "createdAt", "updatedAt", "sharedWith", "public", "topic", "lesson", "difficulty", "audioOverview"],
  primaryKeyFields: ["setId"],
  nativeFieldsNoPk: ["userId", "name", "createdAt", "updatedAt", "sharedWith", "public", "topic", "lesson", "difficulty", "audioOverview"]
},
  fullSpectrumPositions: {
  nativeFields: ["id", "createdAt", "updatedAt", "title", "description", "alternateTitles", "qualifications", "sizzleQuestions", "redFlags", "additionalDetails"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "updatedAt", "title", "description", "alternateTitles", "qualifications", "sizzleQuestions", "redFlags", "additionalDetails"]
},
  message: {
  nativeFields: ["id", "conversationId", "role", "content", "type", "displayOrder", "systemOrder", "createdAt", "metadata", "userId", "isPublic"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["conversationId", "role", "content", "type", "displayOrder", "systemOrder", "createdAt", "metadata", "userId", "isPublic"]
},
  messageBroker: {
  nativeFields: ["id", "messageId", "brokerId", "defaultValue", "defaultComponent"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["messageId", "brokerId", "defaultValue", "defaultComponent"]
},
  messageTemplate: {
  nativeFields: ["id", "role", "type", "createdAt", "content"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["role", "type", "createdAt", "content"]
},
  organizationInvitations: {
  nativeFields: ["id", "organizationId", "email", "token", "role", "invitedAt", "invitedBy", "expiresAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["organizationId", "email", "token", "role", "invitedAt", "invitedBy", "expiresAt"]
},
  organizationMembers: {
  nativeFields: ["id", "organizationId", "userId", "role", "joinedAt", "invitedBy"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["organizationId", "userId", "role", "joinedAt", "invitedBy"]
},
  organizations: {
  nativeFields: ["id", "name", "slug", "description", "logoUrl", "website", "createdAt", "updatedAt", "createdBy", "isPersonal", "settings"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "slug", "description", "logoUrl", "website", "createdAt", "updatedAt", "createdBy", "isPersonal", "settings"]
},
  permissions: {
  nativeFields: ["id", "resourceType", "resourceId", "grantedToUserId", "grantedToOrganizationId", "isPublic", "permissionLevel", "createdAt", "createdBy"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["resourceType", "resourceId", "grantedToUserId", "grantedToOrganizationId", "isPublic", "permissionLevel", "createdAt", "createdBy"]
},
  processor: {
  nativeFields: ["id", "name", "dependsDefault", "defaultExtractors", "params"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "dependsDefault", "defaultExtractors", "params"]
},
  projectMembers: {
  nativeFields: ["id", "projectId", "userId", "role", "createdAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["projectId", "userId", "role", "createdAt"]
},
  projects: {
  nativeFields: ["id", "name", "description", "createdAt", "updatedAt", "createdBy"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "description", "createdAt", "updatedAt", "createdBy"]
},
  recipe: {
  nativeFields: ["id", "name", "description", "tags", "sampleOutput", "isPublic", "status", "version", "postResultOptions", "userId"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "description", "tags", "sampleOutput", "isPublic", "status", "version", "postResultOptions", "userId"]
},
  recipeBroker: {
  nativeFields: ["id", "recipe", "broker", "brokerRole", "required"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipe", "broker", "brokerRole", "required"]
},
  recipeDisplay: {
  nativeFields: ["id", "recipe", "display", "priority", "displaySettings"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipe", "display", "priority", "displaySettings"]
},
  recipeFunction: {
  nativeFields: ["id", "recipe", "function", "role", "params"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipe", "function", "role", "params"]
},
  recipeMessage: {
  nativeFields: ["id", "messageId", "recipeId", "order"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["messageId", "recipeId", "order"]
},
  recipeMessageReorderQueue: {
  nativeFields: ["recipeId", "lastModified"],
  primaryKeyFields: ["recipeId"],
  nativeFieldsNoPk: ["lastModified"]
},
  recipeModel: {
  nativeFields: ["id", "recipe", "aiModel", "role", "priority"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipe", "aiModel", "role", "priority"]
},
  recipeProcessor: {
  nativeFields: ["id", "recipe", "processor", "params"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipe", "processor", "params"]
},
  recipeTool: {
  nativeFields: ["id", "recipe", "tool", "params"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["recipe", "tool", "params"]
},
  registeredFunction: {
  nativeFields: ["id", "name", "modulePath", "className", "description", "returnBroker"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "modulePath", "className", "description", "returnBroker"]
},
  scrapeCachePolicy: {
  nativeFields: ["id", "rescrapeAfter", "staleAfter", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["rescrapeAfter", "staleAfter", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeConfiguration: {
  nativeFields: ["id", "scrapeMode", "interactionSettingsId", "scrapePathPatternId", "isActive", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeMode", "interactionSettingsId", "scrapePathPatternId", "isActive", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeCycleRun: {
  nativeFields: ["id", "scrapeCycleTrackerId", "runNumber", "completedAt", "allowPattern", "disallowPatterns", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeCycleTrackerId", "runNumber", "completedAt", "allowPattern", "disallowPatterns", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeCycleTracker: {
  nativeFields: ["id", "targetUrl", "pageName", "scrapePathPatternCachePolicyId", "scrapeJobId", "lastRunAt", "nextRunAt", "isActive", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["targetUrl", "pageName", "scrapePathPatternCachePolicyId", "scrapeJobId", "lastRunAt", "nextRunAt", "isActive", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeDomain: {
  nativeFields: ["id", "url", "commonName", "scrapeAllowed", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["url", "commonName", "scrapeAllowed", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeDomainDisallowedNotes: {
  nativeFields: ["id", "scrapeDomainId", "notes", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "notes", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeDomainNotes: {
  nativeFields: ["id", "scrapeDomainId", "notes", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "notes", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeDomainQuickScrapeSettings: {
  nativeFields: ["id", "scrapeDomainId", "enabled", "proxyType", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "enabled", "proxyType", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeDomainRobotsTxt: {
  nativeFields: ["id", "scrapeDomainId", "robotsTxt", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "robotsTxt", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeDomainSitemap: {
  nativeFields: ["id", "scrapeDomainId", "sitemap", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "sitemap", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeJob: {
  nativeFields: ["id", "scrapeDomainId", "startUrls", "scrapeStatus", "parseStatus", "attemptLimit", "startedAt", "finishedAt", "name", "description", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "startUrls", "scrapeStatus", "parseStatus", "attemptLimit", "startedAt", "finishedAt", "name", "description", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeOverride: {
  nativeFields: ["id", "name", "configType", "selectorType", "matchType", "action", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "configType", "selectorType", "matchType", "action", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeOverrideValue: {
  nativeFields: ["id", "value", "scrapeOverrideId", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["value", "scrapeOverrideId", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeParsedPage: {
  nativeFields: ["id", "pageName", "validity", "remotePath", "localPath", "scrapePathPatternCachePolicyId", "scrapeTaskId", "scrapeTaskResponseId", "scrapeCycleRunId", "scrapeCycleTrackerId", "scrapeConfigurationId", "scrapePathPatternOverrideId", "scrapedAt", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["pageName", "validity", "remotePath", "localPath", "scrapePathPatternCachePolicyId", "scrapeTaskId", "scrapeTaskResponseId", "scrapeCycleRunId", "scrapeCycleTrackerId", "scrapeConfigurationId", "scrapePathPatternOverrideId", "scrapedAt", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapePathPattern: {
  nativeFields: ["id", "scrapeDomainId", "pathPattern", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "pathPattern", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapePathPatternCachePolicy: {
  nativeFields: ["id", "scrapeCachePolicyId", "scrapePathPatternId", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeCachePolicyId", "scrapePathPatternId", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapePathPatternOverride: {
  nativeFields: ["id", "name", "scrapePathPatternId", "scrapeOverrideId", "isActive", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "scrapePathPatternId", "scrapeOverrideId", "isActive", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeQuickFailureLog: {
  nativeFields: ["id", "scrapeDomainId", "domainName", "targetUrl", "failureReason", "errorLog", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeDomainId", "domainName", "targetUrl", "failureReason", "errorLog", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeTask: {
  nativeFields: ["id", "targetUrl", "pageName", "scrapeDomainId", "parentTask", "attemptsLeft", "scrapeMode", "interactionConfig", "scrapeJobId", "priority", "discoveredLinks", "spawnedConcurrentTasks", "scrapeCycleRunId", "failureReason", "scrapeStatus", "parseStatus", "cancelMessage", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["targetUrl", "pageName", "scrapeDomainId", "parentTask", "attemptsLeft", "scrapeMode", "interactionConfig", "scrapeJobId", "priority", "discoveredLinks", "spawnedConcurrentTasks", "scrapeCycleRunId", "failureReason", "scrapeStatus", "parseStatus", "cancelMessage", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  scrapeTaskResponse: {
  nativeFields: ["id", "scrapeTaskId", "failureReason", "statusCode", "contentPath", "contentSize", "contentType", "responseHeaders", "responseUrl", "errorLog", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["scrapeTaskId", "failureReason", "statusCode", "contentPath", "contentSize", "contentType", "responseHeaders", "responseUrl", "errorLog", "userId", "createdAt", "updatedAt", "isPublic", "authenticatedRead"]
},
  subcategory: {
  nativeFields: ["id", "categoryId", "name", "description", "slug", "icon", "features", "createdAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["categoryId", "name", "description", "slug", "icon", "features", "createdAt"]
},
  systemFunction: {
  nativeFields: ["id", "name", "description", "sample", "inputParams", "outputOptions", "rfId"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "description", "sample", "inputParams", "outputOptions", "rfId"]
},
  taskAssignments: {
  nativeFields: ["id", "taskId", "userId", "assignedBy", "assignedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["taskId", "userId", "assignedBy", "assignedAt"]
},
  taskAttachments: {
  nativeFields: ["id", "taskId", "fileName", "fileType", "fileSize", "filePath", "uploadedBy", "uploadedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["taskId", "fileName", "fileType", "fileSize", "filePath", "uploadedBy", "uploadedAt"]
},
  taskComments: {
  nativeFields: ["id", "taskId", "userId", "content", "createdAt", "updatedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["taskId", "userId", "content", "createdAt", "updatedAt"]
},
  tasks: {
  nativeFields: ["id", "title", "description", "projectId", "status", "dueDate", "createdAt", "updatedAt", "createdBy"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["title", "description", "projectId", "status", "dueDate", "createdAt", "updatedAt", "createdBy"]
},
  tool: {
  nativeFields: ["id", "name", "source", "description", "parameters", "requiredArgs", "systemFunction", "additionalParams"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "source", "description", "parameters", "requiredArgs", "systemFunction", "additionalParams"]
},
  transformer: {
  nativeFields: ["id", "name", "inputParams", "outputParams"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["name", "inputParams", "outputParams"]
},
  userPreferences: {
  nativeFields: ["userId", "preferences", "createdAt", "updatedAt"],
  primaryKeyFields: ["userId"],
  nativeFieldsNoPk: ["preferences", "createdAt", "updatedAt"]
},
  wcClaim: {
  nativeFields: ["id", "createdAt", "applicantName", "personId", "dateOfBirth", "dateOfInjury", "ageAtDoi", "occupationalCode", "weeklyEarnings"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "applicantName", "personId", "dateOfBirth", "dateOfInjury", "ageAtDoi", "occupationalCode", "weeklyEarnings"]
},
  wcImpairmentDefinition: {
  nativeFields: ["id", "impairmentNumber", "fecRank", "name", "attributes", "fingerType"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["impairmentNumber", "fecRank", "name", "attributes", "fingerType"]
},
  wcInjury: {
  nativeFields: ["id", "createdAt", "reportId", "impairmentDefinitionId", "digit", "le", "side", "ue", "wpi", "pain", "industrial", "rating", "formula", "updatedAt"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "reportId", "impairmentDefinitionId", "digit", "le", "side", "ue", "wpi", "pain", "industrial", "rating", "formula", "updatedAt"]
},
  wcReport: {
  nativeFields: ["id", "createdAt", "claimId", "finalRating", "leftSideTotal", "rightSideTotal", "defaultSideTotal", "compensationAmount", "compensationWeeks", "compensationDays"],
  primaryKeyFields: ["id"],
  nativeFieldsNoPk: ["createdAt", "claimId", "finalRating", "leftSideTotal", "rightSideTotal", "defaultSideTotal", "compensationAmount", "compensationWeeks", "compensationDays"]
}
}
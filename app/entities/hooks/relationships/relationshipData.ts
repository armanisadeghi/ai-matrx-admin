// @ts-nocheck
import { RelationshipDefinition } from "@/types/relationshipTypes";

export const actionRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "action",
    relationshipCount: 2,
    additionalFields: ["name", "nodeType", "referenceId"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "matrix",
    entityOne: "automationMatrix",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "transformer",
    entityTwo: "transformer",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const aiAgentRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "aiAgent",
    relationshipCount: 2,
    additionalFields: ["name", "systemMessageOverride"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "aiSettingsId",
    entityOne: "aiSettings",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipeId",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const aiModelEndpointRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "aiModelEndpoint",
    relationshipCount: 2,
    additionalFields: ["available", "configuration", "createdAt", "endpointPriority", "notes"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "aiEndpointId",
    entityOne: "aiEndpoint",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "aiModelId",
    entityTwo: "aiModel",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const aiSettingsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "aiSettings",
    relationshipCount: 3,
    additionalFields: ["audioFormat", "audioVoice", "count", "frequencyPenalty", "maxTokens", "modalities", "presencePenalty", "presetName", "quality", "responseFormat", "size", "stream", "temperature", "tools", "topP"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "aiEndpoint",
    entityOne: "aiEndpoint",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "aiModel",
    entityTwo: "aiModel",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "aiProvider",
    entityThree: "aiProvider",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const appletRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "applet",
    relationshipCount: 2,
    additionalFields: ["createdAt", "creator", "ctaText", "dataSourceConfig", "description", "isPublic", "name", "nextStepConfig", "resultComponentConfig", "slug", "theme", "type", "userId"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "compiledRecipeId",
    entityOne: "compiledRecipe",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "subcategoryId",
    entityTwo: "subcategory",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const audioRecordingRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "audioRecording",
    relationshipCount: 2,
    additionalFields: ["createdAt", "duration", "fileUrl", "isPublic", "localPath", "name", "size"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "label",
    entityOne: "audioLabel",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const automationBoundaryBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "automationBoundaryBroker",
    relationshipCount: 2,
    additionalFields: ["beaconDestination", "sparkSource"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "broker",
    entityOne: "broker",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "matrix",
    entityTwo: "automationMatrix",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const brokerValueRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "brokerValue",
    relationshipCount: 2,
    additionalFields: ["category", "comments", "createdAt", "data", "subCategory", "tags"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "dataBroker",
    entityOne: "dataBroker",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const compiledRecipeRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "compiledRecipe",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "compiledRecipe", "createdAt", "isPublic", "updatedAt", "version"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "recipeId",
    entityOne: "recipe",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const customAppletConfigsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "customAppletConfigs",
    relationshipCount: 4,
    additionalFields: ["accentColor", "appletIcon", "appletSubmitText", "authenticatedRead", "containers", "createdAt", "creator", "dataSourceConfig", "description", "imageUrl", "isPublic", "layoutType", "name", "nextStepConfig", "primaryColor", "publicRead", "resultComponentConfig", "slug", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "appId",
    entityOne: "customAppConfigs",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "compiledRecipeId",
    entityTwo: "compiledRecipe",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "subcategoryId",
    entityThree: "subcategory",
    entityThreeField: "id",
    entityThreePks: ["id"],
    ReferenceFieldFour: "userId",
    entityFour: "users",
    entityFourField: "id",
    entityFourPks: ["id"]
};

export const dataBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "dataBroker",
    relationshipCount: 2,
    additionalFields: ["color", "dataType", "defaultValue", "name"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "inputComponent",
    entityOne: "dataInputComponent",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "outputComponent",
    entityTwo: "dataOutputComponent",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const flashcardHistoryRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "flashcardHistory",
    relationshipCount: 2,
    additionalFields: ["correctCount", "createdAt", "incorrectCount", "reviewCount", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "flashcardId",
    entityOne: "flashcardData",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const flashcardSetRelationsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "flashcardSetRelations",
    relationshipCount: 4,
    additionalFields: ["order"],
    joiningTablePks: ["flashcardId", "setId"],
    ReferenceFieldOne: "flashcardId",
    entityOne: "flashcardData",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "flashcardId",
    entityTwo: "flashcardData",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "setId",
    entityThree: "flashcardSets",
    entityThreeField: "setId",
    entityThreePks: ["setId"],
    ReferenceFieldFour: "setId",
    entityFour: "flashcardSets",
    entityFourField: "setId",
    entityFourPks: ["setId"]
};

export const messageRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "message",
    relationshipCount: 2,
    additionalFields: ["content", "createdAt", "displayOrder", "isPublic", "metadata", "role", "systemOrder", "type"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "conversationId",
    entityOne: "conversation",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const messageBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "messageBroker",
    relationshipCount: 3,
    additionalFields: ["defaultValue"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "brokerId",
    entityOne: "dataBroker",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "defaultComponent",
    entityTwo: "dataInputComponent",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "messageId",
    entityThree: "messageTemplate",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const organizationInvitationsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "organizationInvitations",
    relationshipCount: 2,
    additionalFields: ["email", "expiresAt", "invitedAt", "role", "token"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "invitedBy",
    entityOne: "users",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "organizationId",
    entityTwo: "organizations",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const organizationMembersRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "organizationMembers",
    relationshipCount: 3,
    additionalFields: ["joinedAt", "role"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "invitedBy",
    entityOne: "users",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "organizationId",
    entityTwo: "organizations",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "userId",
    entityThree: "users",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const permissionsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "permissions",
    relationshipCount: 3,
    additionalFields: ["createdAt", "isPublic", "permissionLevel", "resourceId", "resourceType"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "createdBy",
    entityOne: "users",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "grantedToOrganizationId",
    entityTwo: "organizations",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "grantedToUserId",
    entityThree: "users",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const projectMembersRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "projectMembers",
    relationshipCount: 2,
    additionalFields: ["createdAt", "role"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "projectId",
    entityOne: "projects",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeBroker",
    relationshipCount: 2,
    additionalFields: ["brokerRole", "required"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "broker",
    entityOne: "broker",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipe",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeDisplayRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeDisplay",
    relationshipCount: 2,
    additionalFields: ["displaySettings", "priority"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "display",
    entityOne: "displayOption",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipe",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeFunctionRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeFunction" as any, // TODO: Add recipeFunction to EntityKeys type
    relationshipCount: 2,
    additionalFields: ["params", "role"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "function" as any, // TODO: Add function field to EntityAnyFieldKey type
    entityOne: "systemFunction",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipe",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeMessageRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeMessage",
    relationshipCount: 2,
    additionalFields: ["order"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "messageId",
    entityOne: "messageTemplate",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipeId",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeModelRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeModel",
    relationshipCount: 2,
    additionalFields: ["priority", "role"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "aiModel",
    entityOne: "aiModel",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipe",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeProcessorRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeProcessor",
    relationshipCount: 2,
    additionalFields: ["params"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "processor",
    entityOne: "processor",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "recipe",
    entityTwo: "recipe",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const recipeToolRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "recipeTool",
    relationshipCount: 2,
    additionalFields: ["params"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "recipe",
    entityOne: "recipe",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "tool",
    entityTwo: "tool",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const scrapeConfigurationRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeConfiguration",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "interactionSettingsId", "isActive", "isPublic", "scrapeMode", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapePathPatternId",
    entityOne: "scrapePathPattern",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const scrapeCycleTrackerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeCycleTracker",
    relationshipCount: 3,
    additionalFields: ["authenticatedRead", "createdAt", "isActive", "isPublic", "lastRunAt", "nextRunAt", "pageName", "targetUrl", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeJobId",
    entityOne: "scrapeJob",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "scrapePathPatternCachePolicyId",
    entityTwo: "scrapePathPatternCachePolicy",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "userId",
    entityThree: "users",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const scrapeJobRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeJob",
    relationshipCount: 2,
    additionalFields: ["attemptLimit", "authenticatedRead", "createdAt", "description", "finishedAt", "isPublic", "name", "parseStatus", "scrapeStatus", "startUrls", "startedAt", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeDomainId",
    entityOne: "scrapeDomain",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const scrapeOverrideValueRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeOverrideValue",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "isPublic", "updatedAt", "value"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeOverrideId",
    entityOne: "scrapeOverride",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const scrapeParsedPageRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeParsedPage",
    relationshipCount: 8,
    additionalFields: ["authenticatedRead", "createdAt", "expiresAt", "isPublic", "localPath", "pageName", "remotePath", "scrapedAt", "updatedAt", "validity"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeConfigurationId",
    entityOne: "scrapeConfiguration",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "scrapeCycleRunId",
    entityTwo: "scrapeCycleRun",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "scrapeCycleTrackerId",
    entityThree: "scrapeCycleTracker",
    entityThreeField: "id",
    entityThreePks: ["id"],
    ReferenceFieldFour: "scrapePathPatternCachePolicyId",
    entityFour: "scrapePathPatternCachePolicy",
    entityFourField: "id",
    entityFourPks: ["id"],
    ReferenceFieldFive: "scrapePathPatternOverrideId",
    entityFive: "scrapePathPatternOverride",
    entityFiveField: "id",
    entityFivePks: ["id"],
    ReferenceField6: "scrapeTaskId",
    entity6: "scrapeTask",
    entity6Field: "id",
    entity6Pks: ["id"],
    ReferenceField7: "scrapeTaskResponseId",
    entity7: "scrapeTaskResponse",
    entity7Field: "id",
    entity7Pks: ["id"],
    ReferenceField8: "userId",
    entity8: "users",
    entity8Field: "id",
    entity8Pks: ["id"]
};

export const scrapePathPatternCachePolicyRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapePathPatternCachePolicy",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "isPublic", "updatedAt", "userId"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeCachePolicyId",
    entityOne: "scrapeCachePolicy",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "scrapePathPatternId",
    entityTwo: "scrapePathPattern",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const scrapePathPatternOverrideRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapePathPatternOverride",
    relationshipCount: 3,
    additionalFields: ["authenticatedRead", "createdAt", "isActive", "isPublic", "name", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeOverrideId",
    entityOne: "scrapeOverride",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "scrapePathPatternId",
    entityTwo: "scrapePathPattern",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "userId",
    entityThree: "users",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const scrapeQuickFailureLogRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeQuickFailureLog",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "domainName", "errorLog", "failureReason", "isPublic", "targetUrl", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeDomainId",
    entityOne: "scrapeDomain",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const scrapeTaskRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeTask",
    relationshipCount: 4,
    additionalFields: ["attemptsLeft", "authenticatedRead", "cancelMessage", "createdAt", "discoveredLinks", "failureReason", "interactionConfig", "isPublic", "pageName", "parentTask", "parseStatus", "priority", "scrapeMode", "scrapeStatus", "spawnedConcurrentTasks", "targetUrl", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeCycleRunId",
    entityOne: "scrapeCycleRun",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "scrapeDomainId",
    entityTwo: "scrapeDomain",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "scrapeJobId",
    entityThree: "scrapeJob",
    entityThreeField: "id",
    entityThreePks: ["id"],
    ReferenceFieldFour: "userId",
    entityFour: "users",
    entityFourField: "id",
    entityFourPks: ["id"]
};

export const scrapeTaskResponseRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "scrapeTaskResponse",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "contentPath", "contentSize", "contentType", "createdAt", "errorLog", "failureReason", "isPublic", "responseHeaders", "responseUrl", "statusCode", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "scrapeTaskId",
    entityOne: "scrapeTask",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const tableDataRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "tableData",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "data", "isPublic", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "tableId",
    entityOne: "userTables",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const tableFieldsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "tableFields",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "dataType", "defaultValue", "displayName", "fieldName", "fieldOrder", "isPublic", "isRequired", "updatedAt", "validationRules"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "tableId",
    entityOne: "userTables",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const taskAssignmentsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "taskAssignments",
    relationshipCount: 3,
    additionalFields: ["assignedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "assignedBy",
    entityOne: "users",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "taskId",
    entityTwo: "tasks",
    entityTwoField: "id",
    entityTwoPks: ["id"],
    ReferenceFieldThree: "userId",
    entityThree: "users",
    entityThreeField: "id",
    entityThreePks: ["id"]
};

export const taskAttachmentsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "taskAttachments",
    relationshipCount: 2,
    additionalFields: ["fileName", "filePath", "fileSize", "fileType", "uploadedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "taskId",
    entityOne: "tasks",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "uploadedBy",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const taskCommentsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "taskComments",
    relationshipCount: 2,
    additionalFields: ["content", "createdAt", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "taskId",
    entityOne: "tasks",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const tasksRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "tasks",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "description", "dueDate", "status", "title", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "projectId",
    entityOne: "projects",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const userListItemsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "userListItems",
    relationshipCount: 2,
    additionalFields: ["authenticatedRead", "createdAt", "description", "groupName", "helpText", "iconName", "isPublic", "label", "publicRead", "updatedAt"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "listId",
    entityOne: "userLists",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "userId",
    entityTwo: "users",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const wcInjuryRelationshipDefinition: RelationshipDefinition = {
    joiningTable: "wcInjury",
    relationshipCount: 2,
    additionalFields: ["createdAt", "digit", "formula", "industrial", "le", "pain", "rating", "side", "ue", "updatedAt", "wpi"],
    joiningTablePks: ["id"],
    ReferenceFieldOne: "impairmentDefinitionId",
    entityOne: "wcImpairmentDefinition",
    entityOneField: "id",
    entityOnePks: ["id"],
    ReferenceFieldTwo: "reportId",
    entityTwo: "wcReport",
    entityTwoField: "id",
    entityTwoPks: ["id"]
};

export const RELATIONSHIP_DEFINITIONS = {
    action: actionRelationshipDefinition,
    aiAgent: aiAgentRelationshipDefinition,
    aiModelEndpoint: aiModelEndpointRelationshipDefinition,
    aiSettings: aiSettingsRelationshipDefinition,
    applet: appletRelationshipDefinition,
    audioRecording: audioRecordingRelationshipDefinition,
    automationBoundaryBroker: automationBoundaryBrokerRelationshipDefinition,
    brokerValue: brokerValueRelationshipDefinition,
    compiledRecipe: compiledRecipeRelationshipDefinition,
    customAppletConfigs: customAppletConfigsRelationshipDefinition,
    dataBroker: dataBrokerRelationshipDefinition,
    flashcardHistory: flashcardHistoryRelationshipDefinition,
    flashcardSetRelations: flashcardSetRelationsRelationshipDefinition,
    message: messageRelationshipDefinition,
    messageBroker: messageBrokerRelationshipDefinition,
    organizationInvitations: organizationInvitationsRelationshipDefinition,
    organizationMembers: organizationMembersRelationshipDefinition,
    permissions: permissionsRelationshipDefinition,
    projectMembers: projectMembersRelationshipDefinition,
    recipeBroker: recipeBrokerRelationshipDefinition,
    recipeDisplay: recipeDisplayRelationshipDefinition,
    recipeFunction: recipeFunctionRelationshipDefinition,
    recipeMessage: recipeMessageRelationshipDefinition,
    recipeModel: recipeModelRelationshipDefinition,
    recipeProcessor: recipeProcessorRelationshipDefinition,
    recipeTool: recipeToolRelationshipDefinition,
    scrapeConfiguration: scrapeConfigurationRelationshipDefinition,
    scrapeCycleTracker: scrapeCycleTrackerRelationshipDefinition,
    scrapeJob: scrapeJobRelationshipDefinition,
    scrapeOverrideValue: scrapeOverrideValueRelationshipDefinition,
    scrapeParsedPage: scrapeParsedPageRelationshipDefinition,
    scrapePathPatternCachePolicy: scrapePathPatternCachePolicyRelationshipDefinition,
    scrapePathPatternOverride: scrapePathPatternOverrideRelationshipDefinition,
    scrapeQuickFailureLog: scrapeQuickFailureLogRelationshipDefinition,
    scrapeTask: scrapeTaskRelationshipDefinition,
    scrapeTaskResponse: scrapeTaskResponseRelationshipDefinition,
    tableData: tableDataRelationshipDefinition,
    tableFields: tableFieldsRelationshipDefinition,
    taskAssignments: taskAssignmentsRelationshipDefinition,
    taskAttachments: taskAttachmentsRelationshipDefinition,
    taskComments: taskCommentsRelationshipDefinition,
    tasks: tasksRelationshipDefinition,
    userListItems: userListItemsRelationshipDefinition,
    wcInjury: wcInjuryRelationshipDefinition
};
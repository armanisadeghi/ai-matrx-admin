// File: utils/schema/schema-processing/fieldOverrides.ts
import { AllEntityFieldOverrides, AllFieldOverrides } from "./overrideTypes";

const actionFieldOverrides: AllFieldOverrides = {};

const adminsFieldOverrides: AllFieldOverrides = {};

const aiAgentFieldOverrides: AllFieldOverrides = {};

const aiEndpointFieldOverrides: AllFieldOverrides = {};

const aiModelFieldOverrides: AllFieldOverrides = {};

const aiModelEndpointFieldOverrides: AllFieldOverrides = {};

const aiProviderFieldOverrides: AllFieldOverrides = {};

const aiSettingsFieldOverrides: AllFieldOverrides = {
    temperature: {
        defaultComponent: "SPECIAL",
        componentProps: {
    subComponent: "SLIDER",
    variant: "default",
    section: "default",
    placeholder: "default",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: "default",
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "w-full",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: 0,
    max: 2,
    step: 0.01,
    numberType: "real",
    options: "default",
    required: false
},
    },
    maxTokens: {
        defaultComponent: "SPECIAL",
        componentProps: {
    subComponent: "SLIDER",
    variant: "default",
    section: "default",
    placeholder: "default",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: "default",
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "w-full",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: 0,
    max: 5000,
    step: 1,
    numberType: "smallint",
    options: "default",
    required: false
},
    },
    stream: {
        defaultComponent: "SPECIAL",
        componentProps: {
    subComponent: "SWITCH",
    variant: "geometric",
    section: "default",
    placeholder: "default",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: "default",
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "default",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: "default",
    max: "default",
    step: "default",
    numberType: "default",
    options: "default",
    width: "w-28",
    height: "h-7",
    labels: {
        on: "Steam",
        off: "Direct"
    },
    required: false
},
    },
    responseFormat: {
        defaultComponent: "SPECIAL",
        componentProps: {
    subComponent: "MULTI_SWITCH",
    variant: "geometric",
    section: "default",
    placeholder: "default",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: 5,
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "default",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: "default",
    max: "default",
    step: "default",
    numberType: "default",
    options: "default",
    preset: "RESPONSE_FORMATS",
    width: "w-24",
    height: "h-7",
    required: false
},
    },
    tools: {
        defaultComponent: "SPECIAL",
        componentProps: {
    subComponent: "TOOL_CONTROL",
    variant: "geometric",
    section: "default",
    placeholder: "Select tools...",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: "default",
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "default",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: "default",
    max: "default",
    step: "default",
    numberType: "default",
    options: "default",
    width: "w-48",
    height: "h-7",
    primaryControlOptions: "toolAssistOptions",
    toolOptions: "aiTools",
    required: false
},
    },
};


const aiTrainingDataFieldOverrides: AllFieldOverrides = {};

const appletFieldOverrides: AllFieldOverrides = {};

const appletContainersFieldOverrides: AllFieldOverrides = {};

const argFieldOverrides: AllFieldOverrides = {};

const audioLabelFieldOverrides: AllFieldOverrides = {};

const audioRecordingFieldOverrides: AllFieldOverrides = {};

const audioRecordingUsersFieldOverrides: AllFieldOverrides = {};

const automationBoundaryBrokerFieldOverrides: AllFieldOverrides = {};

const automationMatrixFieldOverrides: AllFieldOverrides = {};

const brokerFieldOverrides: AllFieldOverrides = {
    name: {
        isDisplayField: false,
        isRequired: null,
        maxLength: null,
        defaultValue: null,
        defaultGeneratorFunction: null,
        validationFunctions: null,
        exclusionRules: null,
        defaultComponent: null,
        componentProps: null,
        foreignKeyReference: null,
        description: null,
        fieldNameFormats: null
    },
    displayName: {
        isDisplayField: true,
        isRequired: null,
        maxLength: null,
        defaultValue: null,
        defaultGeneratorFunction: null,
        validationFunctions: null,
        exclusionRules: null,
        defaultComponent: null,
        componentProps: null,
        foreignKeyReference: null,
        description: null,
        fieldNameFormats: null
    },
};


const brokerValueFieldOverrides: AllFieldOverrides = {};

const bucketStructuresFieldOverrides: AllFieldOverrides = {};

const bucketTreeStructuresFieldOverrides: AllFieldOverrides = {};

const categoryFieldOverrides: AllFieldOverrides = {};

const compiledRecipeFieldOverrides: AllFieldOverrides = {};

const componentGroupsFieldOverrides: AllFieldOverrides = {};

const containerFieldsFieldOverrides: AllFieldOverrides = {};

const conversationFieldOverrides: AllFieldOverrides = {};

const customAppConfigsFieldOverrides: AllFieldOverrides = {};

const customAppletConfigsFieldOverrides: AllFieldOverrides = {};

const dataBrokerFieldOverrides: AllFieldOverrides = {};

const dataInputComponentFieldOverrides: AllFieldOverrides = {
    options: {
        componentProps: {
    subComponent: "optionsManager",
    variant: "default",
    section: "default",
    placeholder: "default",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: "default",
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "default",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: "default",
    max: "default",
    step: "default",
    numberType: "default",
    options: "default",
    required: false
},
    },
};


const dataOutputComponentFieldOverrides: AllFieldOverrides = {};

const displayOptionFieldOverrides: AllFieldOverrides = {};

const emailsFieldOverrides: AllFieldOverrides = {};

const extractorFieldOverrides: AllFieldOverrides = {};

const fieldComponentsFieldOverrides: AllFieldOverrides = {};

const fileStructureFieldOverrides: AllFieldOverrides = {};

const flashcardDataFieldOverrides: AllFieldOverrides = {};

const flashcardHistoryFieldOverrides: AllFieldOverrides = {};

const flashcardImagesFieldOverrides: AllFieldOverrides = {};

const flashcardSetRelationsFieldOverrides: AllFieldOverrides = {};

const flashcardSetsFieldOverrides: AllFieldOverrides = {};

const fullSpectrumPositionsFieldOverrides: AllFieldOverrides = {};

const htmlExtractionsFieldOverrides: AllFieldOverrides = {};

const messageFieldOverrides: AllFieldOverrides = {};

const messageBrokerFieldOverrides: AllFieldOverrides = {};

const messageTemplateFieldOverrides: AllFieldOverrides = {
    role: {
        isDisplayField: true
    },
    type: {
        isDisplayField: false
    },
};


const organizationInvitationsFieldOverrides: AllFieldOverrides = {};

const organizationMembersFieldOverrides: AllFieldOverrides = {};

const organizationsFieldOverrides: AllFieldOverrides = {};

const permissionsFieldOverrides: AllFieldOverrides = {};

const processorFieldOverrides: AllFieldOverrides = {};

const projectMembersFieldOverrides: AllFieldOverrides = {};

const projectsFieldOverrides: AllFieldOverrides = {};

const promptsFieldOverrides: AllFieldOverrides = {};

const recipeFieldOverrides: AllFieldOverrides = {
    tags: {
        componentProps: {
    subComponent: "tagsManager",
    variant: "default",
    section: "default",
    placeholder: "default",
    size: "default",
    textSize: "default",
    textColor: "default",
    rows: "default",
    animation: "default",
    fullWidthValue: "default",
    fullWidth: "default",
    disabled: "default",
    className: "default",
    type: "default",
    onChange: "default",
    onBlur: "default",
    formatString: "default",
    min: "default",
    max: "default",
    step: "default",
    numberType: "default",
    options: "default",
    required: false
},
    },
};


const recipeBrokerFieldOverrides: AllFieldOverrides = {};

const recipeDisplayFieldOverrides: AllFieldOverrides = {};

const recipeFunctionFieldOverrides: AllFieldOverrides = {};

const recipeMessageFieldOverrides: AllFieldOverrides = {};

const recipeMessageReorderQueueFieldOverrides: AllFieldOverrides = {};

const recipeModelFieldOverrides: AllFieldOverrides = {};

const recipeProcessorFieldOverrides: AllFieldOverrides = {};

const recipeToolFieldOverrides: AllFieldOverrides = {};

const registeredFunctionFieldOverrides: AllFieldOverrides = {};

const schemaTemplatesFieldOverrides: AllFieldOverrides = {};

const scrapeBaseConfigFieldOverrides: AllFieldOverrides = {};

const scrapeCachePolicyFieldOverrides: AllFieldOverrides = {};

const scrapeConfigurationFieldOverrides: AllFieldOverrides = {};

const scrapeCycleRunFieldOverrides: AllFieldOverrides = {};

const scrapeCycleTrackerFieldOverrides: AllFieldOverrides = {};

const scrapeDomainFieldOverrides: AllFieldOverrides = {};

const scrapeDomainDisallowedNotesFieldOverrides: AllFieldOverrides = {};

const scrapeDomainNotesFieldOverrides: AllFieldOverrides = {};

const scrapeDomainQuickScrapeSettingsFieldOverrides: AllFieldOverrides = {};

const scrapeDomainRobotsTxtFieldOverrides: AllFieldOverrides = {};

const scrapeDomainSitemapFieldOverrides: AllFieldOverrides = {};

const scrapeJobFieldOverrides: AllFieldOverrides = {};

const scrapeOverrideFieldOverrides: AllFieldOverrides = {};

const scrapeOverrideValueFieldOverrides: AllFieldOverrides = {};

const scrapeParsedPageFieldOverrides: AllFieldOverrides = {};

const scrapePathPatternFieldOverrides: AllFieldOverrides = {};

const scrapePathPatternCachePolicyFieldOverrides: AllFieldOverrides = {};

const scrapePathPatternOverrideFieldOverrides: AllFieldOverrides = {};

const scrapeQuickFailureLogFieldOverrides: AllFieldOverrides = {};

const scrapeTaskFieldOverrides: AllFieldOverrides = {};

const scrapeTaskResponseFieldOverrides: AllFieldOverrides = {};

const subcategoryFieldOverrides: AllFieldOverrides = {};

const systemFunctionFieldOverrides: AllFieldOverrides = {};

const tableDataFieldOverrides: AllFieldOverrides = {};

const tableFieldsFieldOverrides: AllFieldOverrides = {};

const taskAssignmentsFieldOverrides: AllFieldOverrides = {};

const taskAttachmentsFieldOverrides: AllFieldOverrides = {};

const taskCommentsFieldOverrides: AllFieldOverrides = {};

const tasksFieldOverrides: AllFieldOverrides = {};

const toolFieldOverrides: AllFieldOverrides = {};

const transformerFieldOverrides: AllFieldOverrides = {};

const userListItemsFieldOverrides: AllFieldOverrides = {};

const userListsFieldOverrides: AllFieldOverrides = {};

const userPreferencesFieldOverrides: AllFieldOverrides = {};

const userTablesFieldOverrides: AllFieldOverrides = {};

const wcClaimFieldOverrides: AllFieldOverrides = {};

const wcImpairmentDefinitionFieldOverrides: AllFieldOverrides = {};

const wcInjuryFieldOverrides: AllFieldOverrides = {};

const wcReportFieldOverrides: AllFieldOverrides = {};

const workflowFieldOverrides: AllFieldOverrides = {};

const workflowDataFieldOverrides: AllFieldOverrides = {};

const workflowEdgeFieldOverrides: AllFieldOverrides = {};

const workflowNodeFieldOverrides: AllFieldOverrides = {};

const workflowNodeDataFieldOverrides: AllFieldOverrides = {};

const workflowRelayFieldOverrides: AllFieldOverrides = {};

const workflowUserInputFieldOverrides: AllFieldOverrides = {};


export const ENTITY_FIELD_OVERRIDES: AllEntityFieldOverrides = {
    action: actionFieldOverrides,
    admins: adminsFieldOverrides,
    aiAgent: aiAgentFieldOverrides,
    aiEndpoint: aiEndpointFieldOverrides,
    aiModel: aiModelFieldOverrides,
    aiModelEndpoint: aiModelEndpointFieldOverrides,
    aiProvider: aiProviderFieldOverrides,
    aiSettings: aiSettingsFieldOverrides,
    aiTrainingData: aiTrainingDataFieldOverrides,
    applet: appletFieldOverrides,
    appletContainers: appletContainersFieldOverrides,
    arg: argFieldOverrides,
    audioLabel: audioLabelFieldOverrides,
    audioRecording: audioRecordingFieldOverrides,
    audioRecordingUsers: audioRecordingUsersFieldOverrides,
    automationBoundaryBroker: automationBoundaryBrokerFieldOverrides,
    automationMatrix: automationMatrixFieldOverrides,
    broker: brokerFieldOverrides,
    brokerValue: brokerValueFieldOverrides,
    bucketStructures: bucketStructuresFieldOverrides,
    bucketTreeStructures: bucketTreeStructuresFieldOverrides,
    category: categoryFieldOverrides,
    compiledRecipe: compiledRecipeFieldOverrides,
    componentGroups: componentGroupsFieldOverrides,
    containerFields: containerFieldsFieldOverrides,
    conversation: conversationFieldOverrides,
    customAppConfigs: customAppConfigsFieldOverrides,
    customAppletConfigs: customAppletConfigsFieldOverrides,
    dataBroker: dataBrokerFieldOverrides,
    dataInputComponent: dataInputComponentFieldOverrides,
    dataOutputComponent: dataOutputComponentFieldOverrides,
    displayOption: displayOptionFieldOverrides,
    emails: emailsFieldOverrides,
    extractor: extractorFieldOverrides,
    fieldComponents: fieldComponentsFieldOverrides,
    fileStructure: fileStructureFieldOverrides,
    flashcardData: flashcardDataFieldOverrides,
    flashcardHistory: flashcardHistoryFieldOverrides,
    flashcardImages: flashcardImagesFieldOverrides,
    flashcardSetRelations: flashcardSetRelationsFieldOverrides,
    flashcardSets: flashcardSetsFieldOverrides,
    fullSpectrumPositions: fullSpectrumPositionsFieldOverrides,
    htmlExtractions: htmlExtractionsFieldOverrides,
    message: messageFieldOverrides,
    messageBroker: messageBrokerFieldOverrides,
    messageTemplate: messageTemplateFieldOverrides,
    organizationInvitations: organizationInvitationsFieldOverrides,
    organizationMembers: organizationMembersFieldOverrides,
    organizations: organizationsFieldOverrides,
    permissions: permissionsFieldOverrides,
    processor: processorFieldOverrides,
    projectMembers: projectMembersFieldOverrides,
    projects: projectsFieldOverrides,
    prompts: promptsFieldOverrides,
    recipe: recipeFieldOverrides,
    recipeBroker: recipeBrokerFieldOverrides,
    recipeDisplay: recipeDisplayFieldOverrides,
    recipeFunction: recipeFunctionFieldOverrides,
    recipeMessage: recipeMessageFieldOverrides,
    recipeMessageReorderQueue: recipeMessageReorderQueueFieldOverrides,
    recipeModel: recipeModelFieldOverrides,
    recipeProcessor: recipeProcessorFieldOverrides,
    recipeTool: recipeToolFieldOverrides,
    registeredFunction: registeredFunctionFieldOverrides,
    schemaTemplates: schemaTemplatesFieldOverrides,
    scrapeBaseConfig: scrapeBaseConfigFieldOverrides,
    scrapeCachePolicy: scrapeCachePolicyFieldOverrides,
    scrapeConfiguration: scrapeConfigurationFieldOverrides,
    scrapeCycleRun: scrapeCycleRunFieldOverrides,
    scrapeCycleTracker: scrapeCycleTrackerFieldOverrides,
    scrapeDomain: scrapeDomainFieldOverrides,
    scrapeDomainDisallowedNotes: scrapeDomainDisallowedNotesFieldOverrides,
    scrapeDomainNotes: scrapeDomainNotesFieldOverrides,
    scrapeDomainQuickScrapeSettings: scrapeDomainQuickScrapeSettingsFieldOverrides,
    scrapeDomainRobotsTxt: scrapeDomainRobotsTxtFieldOverrides,
    scrapeDomainSitemap: scrapeDomainSitemapFieldOverrides,
    scrapeJob: scrapeJobFieldOverrides,
    scrapeOverride: scrapeOverrideFieldOverrides,
    scrapeOverrideValue: scrapeOverrideValueFieldOverrides,
    scrapeParsedPage: scrapeParsedPageFieldOverrides,
    scrapePathPattern: scrapePathPatternFieldOverrides,
    scrapePathPatternCachePolicy: scrapePathPatternCachePolicyFieldOverrides,
    scrapePathPatternOverride: scrapePathPatternOverrideFieldOverrides,
    scrapeQuickFailureLog: scrapeQuickFailureLogFieldOverrides,
    scrapeTask: scrapeTaskFieldOverrides,
    scrapeTaskResponse: scrapeTaskResponseFieldOverrides,
    subcategory: subcategoryFieldOverrides,
    systemFunction: systemFunctionFieldOverrides,
    tableData: tableDataFieldOverrides,
    tableFields: tableFieldsFieldOverrides,
    taskAssignments: taskAssignmentsFieldOverrides,
    taskAttachments: taskAttachmentsFieldOverrides,
    taskComments: taskCommentsFieldOverrides,
    tasks: tasksFieldOverrides,
    tool: toolFieldOverrides,
    transformer: transformerFieldOverrides,
    userListItems: userListItemsFieldOverrides,
    userLists: userListsFieldOverrides,
    userPreferences: userPreferencesFieldOverrides,
    userTables: userTablesFieldOverrides,
    wcClaim: wcClaimFieldOverrides,
    wcImpairmentDefinition: wcImpairmentDefinitionFieldOverrides,
    wcInjury: wcInjuryFieldOverrides,
    wcReport: wcReportFieldOverrides,
    workflow: workflowFieldOverrides,
    workflowData: workflowDataFieldOverrides,
    workflowEdge: workflowEdgeFieldOverrides,
    workflowNode: workflowNodeFieldOverrides,
    workflowNodeData: workflowNodeDataFieldOverrides,
    workflowRelay: workflowRelayFieldOverrides,
    workflowUserInput: workflowUserInputFieldOverrides,
};
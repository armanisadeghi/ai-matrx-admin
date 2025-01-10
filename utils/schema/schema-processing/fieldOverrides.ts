import { AllEntityFieldOverrides, AllFieldOverrides } from './overrideTypes';

// https://claude.ai/chat/1e5472cc-a4fa-42d6-b7a4-0dce43d400ae

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
        fieldNameFormats: null,
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
        fieldNameFormats: null,
    },
};

const messageTemplateFieldOverrides: AllFieldOverrides = {
    role: {
        isDisplayField: true,
    },
    type: {
        isDisplayField: false,
    },
};

const dataInputComponentFieldOverrides: AllFieldOverrides = {
    options: {
        componentProps: {
            subComponent: 'optionsManager',
            variant: 'default',
            section: 'default',
            placeholder: 'default',
            size: 'default',
            textSize: 'default',
            textColor: 'default',
            rows: 'default',
            animation: 'default',
            fullWidthValue: 'default',
            fullWidth: 'default',
            disabled: 'default',
            className: 'default',
            type: 'default',
            onChange: 'default',
            onBlur: 'default',
            formatString: 'default',
            min: 'default',
            max: 'default',
            step: 'default',
            numberType: 'default',
            options: 'default',
            required: false,
        },
    },
};

const recipeFieldOverrides: AllFieldOverrides = {
    tags: {
        componentProps: {
            subComponent: 'tagsManager',
            variant: 'default',
            section: 'default',
            placeholder: 'default',
            size: 'default',
            textSize: 'default',
            textColor: 'default',
            rows: 'default',
            animation: 'default',
            fullWidthValue: 'default',
            fullWidth: 'default',
            disabled: 'default',
            className: 'default',
            type: 'default',
            onChange: 'default',
            onBlur: 'default',
            formatString: 'default',
            min: 'default',
            max: 'default',
            step: 'default',
            numberType: 'default',
            options: 'default',
            required: false,
        },
    },
};


const actionFieldOverrides: AllFieldOverrides = {};
const aiEndpointFieldOverrides: AllFieldOverrides = {};
const aiModelFieldOverrides: AllFieldOverrides = {};
const aiModelEndpointFieldOverrides: AllFieldOverrides = {};
const aiProviderFieldOverrides: AllFieldOverrides = {};
const aiSettingsFieldOverrides: AllFieldOverrides = {};
const argFieldOverrides: AllFieldOverrides = {};
const automationBoundaryBrokerFieldOverrides: AllFieldOverrides = {};
const automationMatrixFieldOverrides: AllFieldOverrides = {};
const bucketStructuresFieldOverrides: AllFieldOverrides = {};
const bucketTreeStructuresFieldOverrides: AllFieldOverrides = {};
const dataOutputComponentFieldOverrides: AllFieldOverrides = {};
const displayOptionFieldOverrides: AllFieldOverrides = {};
const emailsFieldOverrides: AllFieldOverrides = {};
const extractorFieldOverrides: AllFieldOverrides = {};
const fileStructureFieldOverrides: AllFieldOverrides = {};
const flashcardDataFieldOverrides: AllFieldOverrides = {};
const flashcardHistoryFieldOverrides: AllFieldOverrides = {};
const flashcardImagesFieldOverrides: AllFieldOverrides = {};
const flashcardSetRelationsFieldOverrides: AllFieldOverrides = {};
const flashcardSetsFieldOverrides: AllFieldOverrides = {};
const messageBrokerFieldOverrides: AllFieldOverrides = {};
const processorFieldOverrides: AllFieldOverrides = {};
const recipeBrokerFieldOverrides: AllFieldOverrides = {};
const recipeDisplayFieldOverrides: AllFieldOverrides = {};
const recipeFunctionFieldOverrides: AllFieldOverrides = {};
const recipeModelFieldOverrides: AllFieldOverrides = {};
const recipeProcessorFieldOverrides: AllFieldOverrides = {};
const recipeToolFieldOverrides: AllFieldOverrides = {};
const registeredFunctionFieldOverrides: AllFieldOverrides = {};
const systemFunctionFieldOverrides: AllFieldOverrides = {};
const toolFieldOverrides: AllFieldOverrides = {};
const transformerFieldOverrides: AllFieldOverrides = {};
const userPreferencesFieldOverrides: AllFieldOverrides = {};

export const ENTITY_FIELD_OVERRIDES: AllEntityFieldOverrides = {
    action: actionFieldOverrides,
    aiEndpoint: aiEndpointFieldOverrides,
    aiModel: aiModelFieldOverrides,
    aiModelEndpoint: aiModelEndpointFieldOverrides,
    aiProvider: aiProviderFieldOverrides,
    aiSettings: aiSettingsFieldOverrides,
    arg: argFieldOverrides,
    automationBoundaryBroker: automationBoundaryBrokerFieldOverrides,
    automationMatrix: automationMatrixFieldOverrides,
    broker: brokerFieldOverrides,
    bucketStructures: bucketStructuresFieldOverrides,
    bucketTreeStructures: bucketTreeStructuresFieldOverrides,
    dataInputComponent: dataInputComponentFieldOverrides,
    dataOutputComponent: dataOutputComponentFieldOverrides,
    displayOption: displayOptionFieldOverrides,
    emails: emailsFieldOverrides,
    extractor: extractorFieldOverrides,
    fileStructure: fileStructureFieldOverrides,
    flashcardData: flashcardDataFieldOverrides,
    flashcardHistory: flashcardHistoryFieldOverrides,
    flashcardImages: flashcardImagesFieldOverrides,
    flashcardSetRelations: flashcardSetRelationsFieldOverrides,
    flashcardSets: flashcardSetsFieldOverrides,
    messageBroker: messageBrokerFieldOverrides,
    messageTemplate: messageTemplateFieldOverrides,
    processor: processorFieldOverrides,
    recipe: recipeFieldOverrides,
    recipeBroker: recipeBrokerFieldOverrides,
    recipeDisplay: recipeDisplayFieldOverrides,
    recipeFunction: recipeFunctionFieldOverrides,
    recipeModel: recipeModelFieldOverrides,
    recipeProcessor: recipeProcessorFieldOverrides,
    recipeTool: recipeToolFieldOverrides,
    registeredFunction: registeredFunctionFieldOverrides,
    systemFunction: systemFunctionFieldOverrides,
    tool: toolFieldOverrides,
    transformer: transformerFieldOverrides,
    userPreferences: userPreferencesFieldOverrides,
};

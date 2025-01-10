import { EntityKeys } from "@/types";
import { EntityOverrides } from "./overrideTypes";

// Entity-level overrides (modular approach)
const brokerEntityOverrides: EntityOverrides<'broker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: { fieldName: 'displayName', databaseFieldName: 'display_name' },
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeMessageEntityOverrides: EntityOverrides<'recipe'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};


const actionEntityOverrides: EntityOverrides<'action'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiEndpointEntityOverrides: EntityOverrides<'aiEndpoint'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiModelEntityOverrides: EntityOverrides<'aiModel'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: { fieldName: 'commonName', databaseFieldName: 'common_name' },
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiModelEndpointEntityOverrides: EntityOverrides<'aiModelEndpoint'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiProviderEntityOverrides: EntityOverrides<'aiProvider'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiSettingsEntityOverrides: EntityOverrides<'aiSettings'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const argEntityOverrides: EntityOverrides<'arg'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const automationBoundaryBrokerEntityOverrides: EntityOverrides<'automationBoundaryBroker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const automationMatrixEntityOverrides: EntityOverrides<'automationMatrix'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const bucketStructuresEntityOverrides: EntityOverrides<'bucketStructures'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const bucketTreeStructuresEntityOverrides: EntityOverrides<'bucketTreeStructures'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const dataInputComponentEntityOverrides: EntityOverrides<'dataInputComponent'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const dataOutputComponentEntityOverrides: EntityOverrides<'dataOutputComponent'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const displayOptionEntityOverrides: EntityOverrides<'displayOption'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const emailsEntityOverrides: EntityOverrides<'emails'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const extractorEntityOverrides: EntityOverrides<'extractor'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const fileStructureEntityOverrides: EntityOverrides<'fileStructure'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardDataEntityOverrides: EntityOverrides<'flashcardData'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardHistoryEntityOverrides: EntityOverrides<'flashcardHistory'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardImagesEntityOverrides: EntityOverrides<'flashcardImages'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardSetRelationsEntityOverrides: EntityOverrides<'flashcardSetRelations'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardSetsEntityOverrides: EntityOverrides<'flashcardSets'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const messageBrokerEntityOverrides: EntityOverrides<'messageBroker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const messageTemplateEntityOverrides: EntityOverrides<'messageTemplate'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: { fieldName: 'role', databaseFieldName: 'role' },
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const processorEntityOverrides: EntityOverrides<'processor'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeBrokerEntityOverrides: EntityOverrides<'recipeBroker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeDisplayEntityOverrides: EntityOverrides<'recipeDisplay'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeFunctionEntityOverrides: EntityOverrides<'recipeFunction'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeModelEntityOverrides: EntityOverrides<'recipeModel'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeProcessorEntityOverrides: EntityOverrides<'recipeProcessor'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeToolEntityOverrides: EntityOverrides<'recipeTool'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const registeredFunctionEntityOverrides: EntityOverrides<'registeredFunction'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const systemFunctionEntityOverrides: EntityOverrides<'systemFunction'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const toolEntityOverrides: EntityOverrides<'tool'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const transformerEntityOverrides: EntityOverrides<'transformer'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const userPreferencesEntityOverrides: EntityOverrides<'userPreferences'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};



const recipeEntityOverrides: EntityOverrides<'recipe'> = {
    defaultFetchStrategy: 'fkAndIfk',
};


// Combine dynamically
export const ENTITY_OVERRIDES: Record<EntityKeys, EntityOverrides<EntityKeys>> = {
    action: actionEntityOverrides,
    aiEndpoint: aiEndpointEntityOverrides,
    aiModel: aiModelEntityOverrides,
    aiModelEndpoint: aiModelEndpointEntityOverrides,
    aiProvider: aiProviderEntityOverrides,
    aiSettings: aiSettingsEntityOverrides,
    arg: argEntityOverrides,
    automationBoundaryBroker: automationBoundaryBrokerEntityOverrides,
    automationMatrix: automationMatrixEntityOverrides,
    broker: brokerEntityOverrides,
    bucketStructures: bucketStructuresEntityOverrides,
    bucketTreeStructures: bucketTreeStructuresEntityOverrides,
    dataInputComponent: dataInputComponentEntityOverrides,
    dataOutputComponent: dataOutputComponentEntityOverrides,
    displayOption: displayOptionEntityOverrides,
    emails: emailsEntityOverrides,
    extractor: extractorEntityOverrides,
    fileStructure: fileStructureEntityOverrides,
    flashcardData: flashcardDataEntityOverrides,
    flashcardHistory: flashcardHistoryEntityOverrides,
    flashcardImages: flashcardImagesEntityOverrides,
    flashcardSetRelations: flashcardSetRelationsEntityOverrides,
    flashcardSets: flashcardSetsEntityOverrides,
    messageBroker: messageBrokerEntityOverrides,
    messageTemplate: messageTemplateEntityOverrides,
    processor: processorEntityOverrides,
    recipe: recipeEntityOverrides,
    recipeBroker: recipeBrokerEntityOverrides,
    recipeDisplay: recipeDisplayEntityOverrides,
    recipeFunction: recipeFunctionEntityOverrides,
    recipeModel: recipeModelEntityOverrides,
    recipeProcessor: recipeProcessorEntityOverrides,
    recipeTool: recipeToolEntityOverrides,
    registeredFunction: registeredFunctionEntityOverrides,
    systemFunction: systemFunctionEntityOverrides,
    tool: toolEntityOverrides,
    transformer: transformerEntityOverrides,
    userPreferences: userPreferencesEntityOverrides,
    recipeMessage: recipeMessageEntityOverrides
};

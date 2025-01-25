'use client';

import { EntityAnyFieldKey, EntityKeys } from "@/types";
import { getStandardRelationship, KnownRelDef, SimpleRelDef } from "./definitionConversionUtil";

export type FieldGroups = {
    nativeFields: EntityAnyFieldKey<EntityKeys>[];
    primaryKeyFields: EntityAnyFieldKey<EntityKeys>[];
    nativeFieldsNoPk: EntityAnyFieldKey<EntityKeys>[];
  };
  
  // The main type for the entity field name groups
  export type EntityFieldNameGroupsType = Record<EntityKeys, FieldGroups>;
  
  // Define the entityFieldNameGroups constant
  export const entityFieldNameGroups: EntityFieldNameGroupsType = {
      action: {
        nativeFields: ['id', 'name', 'matrix', 'transformer', 'nodeType', 'referenceId'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'matrix', 'transformer', 'nodeType', 'referenceId'],
    },
    aiAgent: {
        nativeFields: ['id', 'name', 'recipeId', 'aiSettingsId', 'systemMessageOverride'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'recipeId', 'aiSettingsId', 'systemMessageOverride'],
    },
    aiEndpoint: {
        nativeFields: ['id', 'name', 'provider', 'description', 'additionalCost', 'costDetails', 'params'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'provider', 'description', 'additionalCost', 'costDetails', 'params'],
    },
    aiModel: {
        nativeFields: [
            'id',
            'name',
            'commonName',
            'modelClass',
            'provider',
            'endpoints',
            'contextWindow',
            'maxTokens',
            'capabilities',
            'controls',
            'modelProvider',
        ],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: [
            'name',
            'commonName',
            'modelClass',
            'provider',
            'endpoints',
            'contextWindow',
            'maxTokens',
            'capabilities',
            'controls',
            'modelProvider',
        ],
    },
    aiModelEndpoint: {
        nativeFields: ['id', 'aiModelId', 'aiEndpointId', 'available', 'endpointPriority', 'configuration', 'notes', 'createdAt'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['aiModelId', 'aiEndpointId', 'available', 'endpointPriority', 'configuration', 'notes', 'createdAt'],
    },
    aiProvider: {
        nativeFields: ['id', 'name', 'companyDescription', 'documentationLink', 'modelsLink'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'companyDescription', 'documentationLink', 'modelsLink'],
    },
    aiSettings: {
        nativeFields: [
            'id',
            'aiEndpoint',
            'aiProvider',
            'aiModel',
            'temperature',
            'maxTokens',
            'topP',
            'frequencyPenalty',
            'presencePenalty',
            'stream',
            'responseFormat',
            'size',
            'quality',
            'count',
            'audioVoice',
            'audioFormat',
            'modalities',
            'tools',
            'presetName',
        ],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: [
            'aiEndpoint',
            'aiProvider',
            'aiModel',
            'temperature',
            'maxTokens',
            'topP',
            'frequencyPenalty',
            'presencePenalty',
            'stream',
            'responseFormat',
            'size',
            'quality',
            'count',
            'audioVoice',
            'audioFormat',
            'modalities',
            'tools',
            'presetName',
        ],
    },
    arg: {
        nativeFields: ['id', 'name', 'required', 'default', 'dataType', 'ready', 'registeredFunction'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'required', 'default', 'dataType', 'ready', 'registeredFunction'],
    },
    automationBoundaryBroker: {
        nativeFields: ['id', 'matrix', 'broker', 'sparkSource', 'beaconDestination'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['matrix', 'broker', 'sparkSource', 'beaconDestination'],
    },
    automationMatrix: {
        nativeFields: ['id', 'name', 'description', 'averageSeconds', 'isAutomated', 'cognitionMatrices'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'description', 'averageSeconds', 'isAutomated', 'cognitionMatrices'],
    },
    broker: {
        nativeFields: [
            'id',
            'name',
            'value',
            'dataType',
            'ready',
            'defaultSource',
            'displayName',
            'description',
            'tooltip',
            'validationRules',
            'sampleEntries',
            'customSourceComponent',
            'additionalParams',
            'otherSourceParams',
            'defaultDestination',
            'outputComponent',
            'tags',
            'stringValue',
        ],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: [
            'name',
            'value',
            'dataType',
            'ready',
            'defaultSource',
            'displayName',
            'description',
            'tooltip',
            'validationRules',
            'sampleEntries',
            'customSourceComponent',
            'additionalParams',
            'otherSourceParams',
            'defaultDestination',
            'outputComponent',
            'tags',
            'stringValue',
        ],
    },
    bucketStructures: {
        nativeFields: ['bucketId', 'structure', 'lastUpdated'],
        primaryKeyFields: ['bucketId'],
        nativeFieldsNoPk: ['structure', 'lastUpdated'],
    },
    bucketTreeStructures: {
        nativeFields: ['bucketId', 'treeStructure', 'lastUpdated'],
        primaryKeyFields: ['bucketId'],
        nativeFieldsNoPk: ['treeStructure', 'lastUpdated'],
    },
    dataBroker: {
        nativeFields: ['id', 'name', 'dataType', 'defaultValue', 'defaultComponent', 'color'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'dataType', 'defaultValue', 'defaultComponent', 'color'],
    },
    dataInputComponent: {
        nativeFields: [
            'id',
            'options',
            'includeOther',
            'min',
            'max',
            'step',
            'minRows',
            'maxRows',
            'acceptableFiletypes',
            'src',
            'classes',
            'colorOverrides',
            'additionalParams',
            'subComponent',
            'component',
            'name',
        ],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: [
            'options',
            'includeOther',
            'min',
            'max',
            'step',
            'minRows',
            'maxRows',
            'acceptableFiletypes',
            'src',
            'classes',
            'colorOverrides',
            'additionalParams',
            'subComponent',
            'component',
            'name',
        ],
    },
    dataOutputComponent: {
        nativeFields: ['id', 'componentType', 'uiComponent', 'props', 'additionalParams'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['componentType', 'uiComponent', 'props', 'additionalParams'],
    },
    displayOption: {
        nativeFields: ['id', 'name', 'defaultParams', 'customizableParams', 'additionalParams'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'defaultParams', 'customizableParams', 'additionalParams'],
    },
    emails: {
        nativeFields: ['id', 'sender', 'recipient', 'subject', 'body', 'timestamp', 'isRead'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['sender', 'recipient', 'subject', 'body', 'timestamp', 'isRead'],
    },
    extractor: {
        nativeFields: ['id', 'name', 'outputType', 'defaultIdentifier', 'defaultIndex'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'outputType', 'defaultIdentifier', 'defaultIndex'],
    },
    fileStructure: {
        nativeFields: ['id', 'bucketId', 'path', 'isFolder', 'fileId', 'parentPath', 'name', 'metadata', 'createdAt', 'updatedAt'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['bucketId', 'path', 'isFolder', 'fileId', 'parentPath', 'name', 'metadata', 'createdAt', 'updatedAt'],
    },
    flashcardData: {
        nativeFields: [
            'id',
            'userId',
            'topic',
            'lesson',
            'difficulty',
            'front',
            'back',
            'example',
            'detailedExplanation',
            'audioExplanation',
            'personalNotes',
            'isDeleted',
            'public',
            'sharedWith',
            'createdAt',
            'updatedAt',
        ],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: [
            'userId',
            'topic',
            'lesson',
            'difficulty',
            'front',
            'back',
            'example',
            'detailedExplanation',
            'audioExplanation',
            'personalNotes',
            'isDeleted',
            'public',
            'sharedWith',
            'createdAt',
            'updatedAt',
        ],
    },
    flashcardHistory: {
        nativeFields: ['id', 'flashcardId', 'userId', 'reviewCount', 'correctCount', 'incorrectCount', 'createdAt', 'updatedAt'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['flashcardId', 'userId', 'reviewCount', 'correctCount', 'incorrectCount', 'createdAt', 'updatedAt'],
    },
    flashcardImages: {
        nativeFields: ['id', 'flashcardId', 'filePath', 'fileName', 'mimeType', 'size', 'createdAt'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['flashcardId', 'filePath', 'fileName', 'mimeType', 'size', 'createdAt'],
    },
    flashcardSetRelations: {
        nativeFields: ['flashcardId', 'setId', 'order'],
        primaryKeyFields: ['flashcardId', 'setId'],
        nativeFieldsNoPk: ['order'],
    },
    flashcardSets: {
        nativeFields: ['setId', 'userId', 'name', 'createdAt', 'updatedAt', 'sharedWith', 'public', 'topic', 'lesson', 'difficulty', 'audioOverview'],
        primaryKeyFields: ['setId'],
        nativeFieldsNoPk: ['userId', 'name', 'createdAt', 'updatedAt', 'sharedWith', 'public', 'topic', 'lesson', 'difficulty', 'audioOverview'],
    },
    messageBroker: {
        nativeFields: ['id', 'messageId', 'brokerId', 'defaultValue', 'defaultComponent'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['messageId', 'brokerId', 'defaultValue', 'defaultComponent'],
    },
    messageTemplate: {
        nativeFields: ['id', 'role', 'type', 'createdAt', 'content'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['role', 'type', 'createdAt', 'content'],
    },
    processor: {
        nativeFields: ['id', 'name', 'dependsDefault', 'defaultExtractors', 'params'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'dependsDefault', 'defaultExtractors', 'params'],
    },
    recipe: {
        nativeFields: ['id', 'name', 'description', 'tags', 'sampleOutput', 'isPublic', 'status', 'version', 'messages', 'postResultOptions'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'description', 'tags', 'sampleOutput', 'isPublic', 'status', 'version', 'messages', 'postResultOptions'],
    },
    recipeBroker: {
        nativeFields: ['id', 'recipe', 'broker', 'brokerRole', 'required'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['recipe', 'broker', 'brokerRole', 'required'],
    },
    recipeDisplay: {
        nativeFields: ['id', 'recipe', 'display', 'priority', 'displaySettings'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['recipe', 'display', 'priority', 'displaySettings'],
    },
    recipeFunction: {
        nativeFields: ['id', 'recipe', 'function', 'role', 'params'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['recipe', 'function', 'role', 'params'],
    },
    recipeMessage: {
        nativeFields: ['id', 'messageId', 'recipeId', 'order'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['messageId', 'recipeId', 'order'],
    },
    recipeModel: {
        nativeFields: ['id', 'recipe', 'aiModel', 'role', 'priority'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['recipe', 'aiModel', 'role', 'priority'],
    },
    recipeProcessor: {
        nativeFields: ['id', 'recipe', 'processor', 'params'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['recipe', 'processor', 'params'],
    },
    recipeTool: {
        nativeFields: ['id', 'recipe', 'tool', 'params'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['recipe', 'tool', 'params'],
    },
    registeredFunction: {
        nativeFields: ['id', 'name', 'modulePath', 'className', 'description', 'returnBroker'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'modulePath', 'className', 'description', 'returnBroker'],
    },
    systemFunction: {
        nativeFields: ['id', 'name', 'description', 'sample', 'inputParams', 'outputOptions', 'rfId'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'description', 'sample', 'inputParams', 'outputOptions', 'rfId'],
    },
    tool: {
        nativeFields: ['id', 'name', 'source', 'description', 'parameters', 'requiredArgs', 'systemFunction', 'additionalParams'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'source', 'description', 'parameters', 'requiredArgs', 'systemFunction', 'additionalParams'],
    },
    transformer: {
        nativeFields: ['id', 'name', 'inputParams', 'outputParams'],
        primaryKeyFields: ['id'],
        nativeFieldsNoPk: ['name', 'inputParams', 'outputParams'],
    },
    userPreferences: {
        nativeFields: ['userId', 'preferences', 'createdAt', 'updatedAt'],
        primaryKeyFields: ['userId'],
        nativeFieldsNoPk: ['preferences', 'createdAt', 'updatedAt'],
    },
};



interface PreparePayloadParams {
    knownRelDef: KnownRelDef;
    parentId: unknown;
    childData: Record<string, unknown>;
    joiningData: Record<string, unknown>;
}

function filterDataByFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(data).filter(([key]) => fields.includes(key))
    );
}

export function prepareRelatedPayloadWithParentid({
    knownRelDef,
    parentId,
    childData,
    joiningData
}: PreparePayloadParams) {
    const relationshipDef = getStandardRelationship(knownRelDef) as SimpleRelDef;
    const childEntity = relationshipDef.child.name;
    const joiningEntity = relationshipDef.join.name;

    const childFields = entityFieldNameGroups[childEntity].nativeFields;
    const joiningFieldsNoPk = entityFieldNameGroups[joiningEntity].nativeFieldsNoPk;

    const matchedChildData = filterDataByFields(childData, childFields);
    const matchedJoiningData = filterDataByFields(joiningData, joiningFieldsNoPk);

    return {
        parentId,
        child: matchedChildData,
        joining: matchedJoiningData,
    };
}

export function prepareRelatedPayloadNoParentId({
    knownRelDef,
    childData,
    joiningData
}: PreparePayloadParams) {
    const relationshipDef = getStandardRelationship(knownRelDef) as SimpleRelDef;
    const childEntity = relationshipDef.child.name;
    const joiningEntity = relationshipDef.join.name;

    const childFields = entityFieldNameGroups[childEntity].nativeFields;
    const joiningFieldsNoPk = entityFieldNameGroups[joiningEntity].nativeFieldsNoPk;

    const matchedChildData = filterDataByFields(childData, childFields);
    const matchedJoiningData = filterDataByFields(joiningData, joiningFieldsNoPk);

    return {
        child: matchedChildData,
        joining: matchedJoiningData,
    };
}

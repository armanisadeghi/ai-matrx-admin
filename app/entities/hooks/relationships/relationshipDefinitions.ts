import { EntityRecordMap } from '@/lib/redux/entity/types/stateTypes';
import { toMatrxIdFromValueBatch, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EntityAnyFieldKey, EntityKeys, MatrxRecordId } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export type RelationshipDefinition = {
    joiningTable: EntityKeys;
    relationshipCount: number;
    additionalFields: EntityAnyFieldKey<EntityKeys>[];
    joiningTablePks: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldOne: EntityAnyFieldKey<EntityKeys>;
    entityOne: EntityKeys;
    entityOneField: EntityAnyFieldKey<EntityKeys>;
    entityOnePks: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldTwo?: EntityAnyFieldKey<EntityKeys>;
    entityTwo?: EntityKeys;
    entityTwoField?: EntityAnyFieldKey<EntityKeys>;
    entityTwoPks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldThree?: EntityAnyFieldKey<EntityKeys>;
    entityThree?: EntityKeys;
    entityThreeField?: EntityAnyFieldKey<EntityKeys>;
    entityThreePks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldFour?: EntityAnyFieldKey<EntityKeys>;
    entityFour?: EntityKeys;
    entityFourField?: EntityAnyFieldKey<EntityKeys>;
    entityFourPks?: EntityAnyFieldKey<EntityKeys>[];
};

const actionRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'action',
    relationshipCount: 2,
    additionalFields: ['name', 'nodeType', 'referenceId'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'matrix',
    entityOne: 'automationMatrix',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'transformer',
    entityTwo: 'transformer',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const aiAgentRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'aiAgent',
    relationshipCount: 2,
    additionalFields: ['name', 'systemMessageOverride'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'aiSettingsId',
    entityOne: 'aiSettings',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipeId',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const aiModelEndpointRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'aiModelEndpoint',
    relationshipCount: 2,
    additionalFields: ['available', 'configuration', 'createdAt', 'endpointPriority', 'notes'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'aiEndpointId',
    entityOne: 'aiEndpoint',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'aiModelId',
    entityTwo: 'aiModel',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const aiSettingsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'aiSettings',
    relationshipCount: 3,
    additionalFields: [
        'audioFormat',
        'audioVoice',
        'count',
        'frequencyPenalty',
        'maxTokens',
        'modalities',
        'presencePenalty',
        'presetName',
        'quality',
        'responseFormat',
        'size',
        'stream',
        'temperature',
        'tools',
        'topP',
    ],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'aiEndpoint',
    entityOne: 'aiEndpoint',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'aiModel',
    entityTwo: 'aiModel',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
    ReferenceFieldThree: 'aiProvider',
    entityThree: 'aiProvider',
    entityThreeField: 'id',
    entityThreePks: ['id'],
};

const automationBoundaryBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'automationBoundaryBroker',
    relationshipCount: 2,
    additionalFields: ['beaconDestination', 'sparkSource'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'broker',
    entityOne: 'broker',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'matrix',
    entityTwo: 'automationMatrix',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const flashcardHistoryRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'flashcardHistory',
    relationshipCount: 2,
    additionalFields: ['correctCount', 'createdAt', 'incorrectCount', 'reviewCount', 'updatedAt'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'flashcardId',
    entityOne: 'flashcardData',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'userId',
    // entityTwo: "users",
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const flashcardSetRelationsRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'flashcardSetRelations',
    relationshipCount: 4,
    additionalFields: ['order'],
    joiningTablePks: ['flashcardId', 'setId'],
    ReferenceFieldOne: 'flashcardId',
    entityOne: 'flashcardData',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'flashcardId',
    entityTwo: 'flashcardData',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
    ReferenceFieldThree: 'setId',
    entityThree: 'flashcardSets',
    entityThreeField: 'setId',
    entityThreePks: ['setId'],
    ReferenceFieldFour: 'setId',
    entityFour: 'flashcardSets',
    entityFourField: 'setId',
    entityFourPks: ['setId'],
};

const messageBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'messageBroker',
    relationshipCount: 3,
    additionalFields: ['defaultValue'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'brokerId',
    entityOne: 'dataBroker',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'defaultComponent',
    entityTwo: 'dataInputComponent',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
    ReferenceFieldThree: 'messageId',
    entityThree: 'messageTemplate',
    entityThreeField: 'id',
    entityThreePks: ['id'],
};

const recipeBrokerRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeBroker',
    relationshipCount: 2,
    additionalFields: ['brokerRole', 'required'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'broker',
    entityOne: 'broker',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipe',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const recipeDisplayRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeDisplay',
    relationshipCount: 2,
    additionalFields: ['displaySettings', 'priority'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'display',
    entityOne: 'displayOption',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipe',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const recipeFunctionRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeFunction',
    relationshipCount: 2,
    additionalFields: ['params', 'role'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'function',
    entityOne: 'systemFunction',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipe',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const recipeMessageRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeMessage',
    relationshipCount: 2,
    additionalFields: ['order'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'messageId',
    entityOne: 'messageTemplate',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipeId',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const recipeModelRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeModel',
    relationshipCount: 2,
    additionalFields: ['priority', 'role'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'aiModel',
    entityOne: 'aiModel',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipe',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const recipeProcessorRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeProcessor',
    relationshipCount: 2,
    additionalFields: ['params'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'processor',
    entityOne: 'processor',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'recipe',
    entityTwo: 'recipe',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

const recipeToolRelationshipDefinition: RelationshipDefinition = {
    joiningTable: 'recipeTool',
    relationshipCount: 2,
    additionalFields: ['params'],
    joiningTablePks: ['id'],
    ReferenceFieldOne: 'recipe',
    entityOne: 'recipe',
    entityOneField: 'id',
    entityOnePks: ['id'],
    ReferenceFieldTwo: 'tool',
    entityTwo: 'tool',
    entityTwoField: 'id',
    entityTwoPks: ['id'],
};

export const RELATIONSHIP_DEFINITIONS = {
    action: actionRelationshipDefinition,
    aiAgent: aiAgentRelationshipDefinition,
    aiModelEndpoint: aiModelEndpointRelationshipDefinition,
    aiSettings: aiSettingsRelationshipDefinition,
    automationBoundaryBroker: automationBoundaryBrokerRelationshipDefinition,
    flashcardHistory: flashcardHistoryRelationshipDefinition,
    flashcardSetRelations: flashcardSetRelationsRelationshipDefinition,
    messageBroker: messageBrokerRelationshipDefinition,
    recipeBroker: recipeBrokerRelationshipDefinition,
    recipeDisplay: recipeDisplayRelationshipDefinition,
    recipeFunction: recipeFunctionRelationshipDefinition,
    recipeMessage: recipeMessageRelationshipDefinition,
    recipeModel: recipeModelRelationshipDefinition,
    recipeProcessor: recipeProcessorRelationshipDefinition,
    recipeTool: recipeToolRelationshipDefinition,
};

export class RelationshipMapperBasic {
    private data: any[];

    constructor(data: any[]) {
        this.data = data;
    }

    getRelated(entityName: EntityKeys, fromEntity: EntityKeys, id: string): string[] {
        const def = RELATIONSHIP_DEFINITIONS[entityName];
        const isEntityOne = fromEntity === def.entityOne;
        const sourceField = isEntityOne ? def.ReferenceFieldOne : def.ReferenceFieldTwo!;
        const targetField = isEntityOne ? def.ReferenceFieldTwo! : def.ReferenceFieldOne;

        return this.data
            .filter((record) => record[sourceField] === id)
            .map((record) => record[targetField])
            .filter(Boolean);
    }
}

export class RelationshipMapperTwo {
    private definition: RelationshipDefinition;
    private data: any[] | EntityRecordMap<EntityKeys> | null;
    private isRecordMap: boolean;

    constructor(entityName: EntityKeys) {
        this.definition = RELATIONSHIP_DEFINITIONS[entityName];
        this.data = null;
        this.isRecordMap = false;
    }

    setData(data: any[] | EntityRecordMap<EntityKeys>) {
        this.data = data;
        this.isRecordMap = !Array.isArray(data);
    }

    getRelated(fromEntity: EntityKeys, id: string): string[] {
        if (!this.data) {
            throw new Error('Data not loaded. Call setData first.');
        }

        const isEntityOne = fromEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
        const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

        if (this.isRecordMap) {
            return Object.values(this.data)
                .filter((record) => record[sourceField] === id)
                .map((record) => record[targetField])
                .filter(Boolean);
        }

        return (this.data as any[])
            .filter((record) => record[sourceField] === id)
            .map((record) => record[targetField])
            .filter(Boolean);
    }

    getRelatedWithRecordIds(fromEntity: EntityKeys, id: string): Array<{ id: string; targetId: string }> {
        if (!this.data) {
            throw new Error('Data not loaded. Call setData first.');
        }

        if (!this.isRecordMap) {
            throw new Error('getRelatedWithRecordIds is only available when using RecordMap data');
        }

        const isEntityOne = fromEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
        const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

        return Object.entries(this.data)
            .filter(([_, record]) => record[sourceField] === id)
            .map(([recordId, record]) => ({
                id: recordId,
                targetId: record[targetField],
            }))
            .filter((result) => Boolean(result.targetId));
    }
}

export class RelationshipMapperThree {
    private definition: RelationshipDefinition;
    private data: any[];
    private parentEntity: EntityKeys | null = null;
    private parentId: string | null = null;

    constructor(entityName: EntityKeys) {
        this.definition = RELATIONSHIP_DEFINITIONS[entityName];
        this.data = [];
    }

    setParentEntity(entityName: EntityKeys) {
        if (entityName !== this.definition.entityOne && entityName !== this.definition.entityTwo) {
            throw new Error(`Entity ${entityName} is not part of this relationship`);
        }
        this.parentEntity = entityName;
    }

    setParentId(id: string | null) {
        this.parentId = id;
    }

    setParentRecordId(matrxRecordId: string | null) {
        this.parentId = matrxRecordId ? toPkValue(matrxRecordId) : null;
    }

    setData(data: any[] | EntityRecordMap<EntityKeys> | null) {
        this.data = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
    }

    getRelatedIds(): string[] {
        if (!this.parentEntity || !this.parentId) return [];

        const isEntityOne = this.parentEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
        const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

        return this.data
            .filter((record) => record && record[sourceField] === this.parentId)
            .map((record) => record[targetField])
            .filter(Boolean);
    }

    getRelatedRecords(): Array<Record<string, any>> {
        if (!this.parentEntity || !this.parentId) return [];

        const isEntityOne = this.parentEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
        const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

        return this.data
            .filter((record) => record && record[sourceField] === this.parentId)
            .map((record) => {
                const result: Record<string, any> = {
                    [targetField]: record[targetField],
                };

                this.definition.additionalFields.forEach((field) => {
                    if (field in record) {
                        result[field] = record[field];
                    }
                });

                return result;
            })
            .filter((record) => Boolean(record[targetField]));
    }

    private getTargetEntity(): EntityKeys {
        if (!this.parentEntity) throw new Error('Parent entity not set');
        return this.parentEntity === this.definition.entityOne ? this.definition.entityTwo! : this.definition.entityOne;
    }

    getRelatedMatrxIds(): MatrxRecordId[] | null {
        const relatedIds = this.getRelatedIds();
        const targetEntity = this.getTargetEntity();
        return toMatrxIdFromValueBatch(targetEntity, relatedIds);
    }

    getRelatedWithRecordIds(): Array<{ id: string; targetId: string }> {
        if (!this.parentEntity || !this.parentId) return [];

        const isEntityOne = this.parentEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
        const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

        return this.data
            .map((record, index) => ({
                id: record.id || String(index),
                targetId: record[targetField],
            }))
            .filter((result) => Boolean(result.targetId));
    }
}

export class RelationshipMapper {
    private definition: RelationshipDefinition;
    private data: any[];
    private parentEntity: EntityKeys | null = null;
    private parentId: string | null = null;

    constructor(entityName: EntityKeys) {
        this.definition = RELATIONSHIP_DEFINITIONS[entityName];
        this.data = [];
    }

    setParentEntity(entityName: EntityKeys) {
        if (entityName !== this.definition.entityOne && entityName !== this.definition.entityTwo) {
            throw new Error(`Entity ${entityName} is not part of this relationship`);
        }
        this.parentEntity = entityName;
    }

    setParentId(id: string | null) {
        this.parentId = id;
    }

    setParentRecordId(matrxRecordId: string | null) {
        this.parentId = matrxRecordId ? toPkValue(matrxRecordId) : null;
    }

    setData(data: any[] | EntityRecordMap<EntityKeys> | null) {
        this.data = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
    }

    // Join table record operations
    getJoinRecords(): Array<Record<string, any>> {
        if (!this.parentEntity || !this.parentId) return [];

        const isEntityOne = this.parentEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;

        return this.data.filter((record) => record && record[sourceField] === this.parentId);
    }

    getJoinRecordIds(): string[] {
        return this.getJoinRecords()
            .map((record) => record.id)
            .filter(Boolean);
    }

    getJoinMatrxIds(): MatrxRecordId[] {
        return this.getJoinRecords()
            .map((record) => record.matrxRecordId)
            .filter(Boolean);
    }

    // Child entity operations
    getChildIds(): string[] {
        if (!this.parentEntity || !this.parentId) return [];

        const isEntityOne = this.parentEntity === this.definition.entityOne;
        const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
        const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

        return this.data
            .filter((record) => record && record[sourceField] === this.parentId)
            .map((record) => record[targetField])
            .filter(Boolean);
    }

    private getTargetEntity(): EntityKeys {
        if (!this.parentEntity) throw new Error('Parent entity not set');
        return this.parentEntity === this.definition.entityOne ? this.definition.entityTwo! : this.definition.entityOne;
    }

    getChildMatrxIds(): MatrxRecordId[] | null {
        const childIds = this.getChildIds();
        const targetEntity = this.getTargetEntity();
        return toMatrxIdFromValueBatch(targetEntity, childIds);
    }
}

export type EnrichedRelationshipDefinition = {
    definition: RelationshipDefinition;
    parentEntity: EntityKeys;
};

export const ENRICHED_RELATIONSHIP_DEFINITIONS: Record<any, EnrichedRelationshipDefinition> = {
    action: {
        definition: actionRelationshipDefinition,
        parentEntity: 'automationMatrix',
    },
    aiAgent: {
        definition: aiAgentRelationshipDefinition,
        parentEntity: 'aiSettings',
    },
    aiModelEndpoint: {
        definition: aiModelEndpointRelationshipDefinition,
        parentEntity: 'aiEndpoint',
    },
    aiSettings: {
        definition: aiSettingsRelationshipDefinition,
        parentEntity: 'aiModel',
    },
    automationBoundaryBroker: {
        definition: automationBoundaryBrokerRelationshipDefinition,
        parentEntity: 'broker',
    },
    flashcardHistory: {
        definition: flashcardHistoryRelationshipDefinition,
        parentEntity: 'flashcardData',
    },
    flashcardSetRelations: {
        definition: flashcardSetRelationsRelationshipDefinition,
        parentEntity: 'flashcardData',
    },
    messageBroker: {
        definition: messageBrokerRelationshipDefinition,
        parentEntity: 'messageTemplate',
    },
    recipeBroker: {
        definition: recipeBrokerRelationshipDefinition,
        parentEntity: 'recipe',
    },
    recipeDisplay: {
        definition: recipeDisplayRelationshipDefinition,
        parentEntity: 'recipe',
    },
    recipeFunction: {
        definition: recipeFunctionRelationshipDefinition,
        parentEntity: 'recipe',
    },
    recipeMessage: {
        definition: recipeMessageRelationshipDefinition,
        parentEntity: 'recipe',
    },
    recipeModel: {
        definition: recipeModelRelationshipDefinition,
        parentEntity: 'recipe',
    },
    recipeProcessor: {
        definition: recipeProcessorRelationshipDefinition,
        parentEntity: 'recipe',
    },
    recipeTool: {
        definition: recipeToolRelationshipDefinition,
        parentEntity: 'recipe',
    },
};

export type MappedRelationship = {
    // Core properties
    joiningTable: EntityKeys;
    joiningTablePks: EntityAnyFieldKey<EntityKeys>[];
    relationshipCount: number;
    additionalFields: EntityAnyFieldKey<EntityKeys>[];

    // Parent
    parentEntity: EntityKeys;
    parentField: EntityAnyFieldKey<EntityKeys>;
    parentPks: EntityAnyFieldKey<EntityKeys>[];
    parentReference: EntityAnyFieldKey<EntityKeys>;

    // Primary Child
    childEntity: EntityKeys;
    childField: EntityAnyFieldKey<EntityKeys>;
    childPks: EntityAnyFieldKey<EntityKeys>[];
    childReference: EntityAnyFieldKey<EntityKeys>;

    // Second Child (Optional)
    childTwoEntity?: EntityKeys;
    childTwoField?: EntityAnyFieldKey<EntityKeys>;
    childTwoPks?: EntityAnyFieldKey<EntityKeys>[];
    childTwoReference?: EntityAnyFieldKey<EntityKeys>;

    // Third Child (Optional)
    childThreeEntity?: EntityKeys;
    childThreeField?: EntityAnyFieldKey<EntityKeys>;
    childThreePks?: EntityAnyFieldKey<EntityKeys>[];
    childThreeReference?: EntityAnyFieldKey<EntityKeys>;
};

export function mapRelationship(enrichedDefinition: EnrichedRelationshipDefinition): MappedRelationship {
    const { definition, parentEntity } = enrichedDefinition;
    let mapped: MappedRelationship;

    // First, set the core properties that don't need mapping
    const core = {
        joiningTable: definition.joiningTable,
        joiningTablePks: definition.joiningTablePks,
        relationshipCount: definition.relationshipCount,
        additionalFields: definition.additionalFields,
    };

    // Find which entity position contains the parent
    if (definition.entityOne === parentEntity) {
        mapped = {
            ...core,
            parentEntity: definition.entityOne,
            parentField: definition.entityOneField,
            parentPks: definition.entityOnePks,
            parentReference: definition.ReferenceFieldOne,
            childEntity: definition.entityTwo!,
            childField: definition.entityTwoField!,
            childPks: definition.entityTwoPks!,
            childReference: definition.ReferenceFieldTwo!,
            childTwoEntity: definition.entityThree,
            childTwoField: definition.entityThreeField,
            childTwoPks: definition.entityThreePks,
            childTwoReference: definition.ReferenceFieldThree,
            childThreeEntity: definition.entityFour,
            childThreeField: definition.entityFourField,
            childThreePks: definition.entityFourPks,
            childThreeReference: definition.ReferenceFieldFour,
        };
    } else if (definition.entityTwo === parentEntity) {
        mapped = {
            ...core,
            parentEntity: definition.entityTwo!,
            parentField: definition.entityTwoField!,
            parentPks: definition.entityTwoPks!,
            parentReference: definition.ReferenceFieldTwo!,
            childEntity: definition.entityOne,
            childField: definition.entityOneField,
            childPks: definition.entityOnePks,
            childReference: definition.ReferenceFieldOne,
            childTwoEntity: definition.entityThree,
            childTwoField: definition.entityThreeField,
            childTwoPks: definition.entityThreePks,
            childTwoReference: definition.ReferenceFieldThree,
            childThreeEntity: definition.entityFour,
            childThreeField: definition.entityFourField,
            childThreePks: definition.entityFourPks,
            childThreeReference: definition.ReferenceFieldFour,
        };
    } else if (definition.entityThree === parentEntity) {
        mapped = {
            ...core,
            parentEntity: definition.entityThree!,
            parentField: definition.entityThreeField!,
            parentPks: definition.entityThreePks!,
            parentReference: definition.ReferenceFieldThree!,
            childEntity: definition.entityOne,
            childField: definition.entityOneField,
            childPks: definition.entityOnePks,
            childReference: definition.ReferenceFieldOne,
            childTwoEntity: definition.entityTwo!,
            childTwoField: definition.entityTwoField!,
            childTwoPks: definition.entityTwoPks!,
            childTwoReference: definition.ReferenceFieldTwo!,
            childThreeEntity: definition.entityFour,
            childThreeField: definition.entityFourField,
            childThreePks: definition.entityFourPks,
            childThreeReference: definition.ReferenceFieldFour,
        };
    } else {
        mapped = {
            ...core,
            parentEntity: definition.entityFour!,
            parentField: definition.entityFourField!,
            parentPks: definition.entityFourPks!,
            parentReference: definition.ReferenceFieldFour!,
            childEntity: definition.entityOne,
            childField: definition.entityOneField,
            childPks: definition.entityOnePks,
            childReference: definition.ReferenceFieldOne,
            childTwoEntity: definition.entityTwo!,
            childTwoField: definition.entityTwoField!,
            childTwoPks: definition.entityTwoPks!,
            childTwoReference: definition.ReferenceFieldTwo!,
            childThreeEntity: definition.entityThree,
            childThreeField: definition.entityThreeField,
            childThreePks: definition.entityThreePks,
            childThreeReference: definition.ReferenceFieldThree,
        };
    }

    return mapped;
}

export type AutoGenerateOptions = {
    joiningEntity?: boolean;
    child?: boolean;
    childTwo?: boolean;
    childThree?: boolean;
};

export type DefinedRelationship = keyof typeof ENRICHED_RELATIONSHIP_DEFINITIONS;

export class RelatedDataManager {
    private readonly relationship: MappedRelationship;
    private readonly autoGenerateIds: AutoGenerateOptions;

    // Separate storage for each entity context
    private entityValues: {
        parent: Record<string, unknown>;
        child: Record<string, unknown>;
        childTwo: Record<string, unknown>;
        childThree: Record<string, unknown>;
        joining: Record<string, unknown>;
    } = {
        parent: {},
        child: {},
        childTwo: {},
        childThree: {},
        joining: {},
    };

    constructor(joiningEntity: DefinedRelationship, autoGenerateIds: AutoGenerateOptions = {}) {
        const enrichedDefinition = ENRICHED_RELATIONSHIP_DEFINITIONS[joiningEntity];
        this.relationship = mapRelationship(enrichedDefinition);
        this.autoGenerateIds = autoGenerateIds;
        this.initializeAutoGeneratedIds();
    }

    // Getters
    get joiningTable() {
        return this.relationship.joiningTable;
    }
    get joiningTablePks() {
        return this.relationship.joiningTablePks;
    }
    get relationshipCount() {
        return this.relationship.relationshipCount;
    }
    get additionalFields() {
        return this.relationship.additionalFields;
    }

    get parentEntity() {
        return this.relationship.parentEntity;
    }
    get parentPks() {
        return this.relationship.parentPks;
    }
    get parentField() {
        return this.relationship.parentField;
    }
    get parentReference() {
        return this.relationship.parentReference;
    }

    get childEntity() {
        return this.relationship.childEntity;
    }
    get childPks() {
        return this.relationship.childPks;
    }
    get childField() {
        return this.relationship.childField;
    }
    get childReference() {
        return this.relationship.childReference;
    }

    get childTwoEntity() {
        return this.relationship.childTwoEntity;
    }
    get childTwoPks() {
        return this.relationship.childTwoPks;
    }
    get childTwoField() {
        return this.relationship.childTwoField;
    }
    get childTwoReference() {
        return this.relationship.childTwoReference;
    }

    get childThreeEntity() {
        return this.relationship.childThreeEntity;
    }
    get childThreePks() {
        return this.relationship.childThreePks;
    }
    get childThreeField() {
        return this.relationship.childThreeField;
    }
    get childThreeReference() {
        return this.relationship.childThreeReference;
    }

    // ID Generation and Management
    private initializeAutoGeneratedIds(): void {
        if (this.autoGenerateIds.joiningEntity) {
            for (const pk of this.joiningTablePks) {
                this.entityValues.joining[pk] = uuidv4();
            }
        }

        if (this.autoGenerateIds.child) {
            const childId = uuidv4();
            this.entityValues.child[this.childField] = childId;
            this.entityValues.joining[this.childReference] = childId;
        }

        if (this.autoGenerateIds.childTwo && this.childTwoField && this.childTwoReference) {
            const childTwoId = uuidv4();
            this.entityValues.childTwo[this.childTwoField] = childTwoId;
            this.entityValues.joining[this.childTwoReference] = childTwoId;
        }

        if (this.autoGenerateIds.childThree && this.childThreeField && this.childThreeReference) {
            const childThreeId = uuidv4();
            this.entityValues.childThree[this.childThreeField] = childThreeId;
            this.entityValues.joining[this.childThreeReference] = childThreeId;
        }
    }

    // Setters
    setParentId(value: unknown): this {
        this.entityValues.parent[this.parentField] = value;
        this.entityValues.joining[this.parentReference] = value;
        return this;
    }

    setChildId(value: unknown): this {
        this.entityValues.child[this.childField] = value;
        this.entityValues.joining[this.childReference] = value;
        return this;
    }

    setChildTwoId(value: unknown): this {
        if (this.childTwoField && this.childTwoReference) {
            this.entityValues.childTwo[this.childTwoField] = value;
            this.entityValues.joining[this.childTwoReference] = value;
        }
        return this;
    }

    setChildThreeId(value: unknown): this {
        if (this.childThreeField && this.childThreeReference) {
            this.entityValues.childThree[this.childThreeField] = value;
            this.entityValues.joining[this.childThreeReference] = value;
        }
        return this;
    }

    setJoiningData(data: Record<string, unknown>): this {
        const filteredData = Object.fromEntries(Object.entries(data).filter(([key]) => this.additionalFields.includes(key as EntityAnyFieldKey<EntityKeys>)));
        Object.assign(this.entityValues.joining, filteredData);
        return this;
    }
    // Entity Relationship Operations
    createEntityWithRelationship(
        parentId: unknown,
        childData: Record<string, unknown> = {},
        joiningData: Record<string, unknown> = {}
    ): {
        childEntity: Record<string, unknown>;
        joiningEntity: Record<string, unknown>;
    } {
        this.setParentId(parentId);

        const childEntity = {
            ...childData,
            [this.childField]: this.entityValues.child[this.childField],
        };

        const joiningEntity = {
            ...joiningData,
            ...this.getCoreJoiningData(),
            ...Object.fromEntries(this.joiningTablePks.map((pk) => [pk, this.entityValues.joining[pk]])),
        };

        return {
            childEntity,
            joiningEntity,
        };
    }

    getCoreJoiningData(): Record<string, unknown> {
        const data: Record<string, unknown> = {};

        // References are always stored in the joining context
        if (this.entityValues.joining[this.parentReference]) {
            data[this.parentReference] = this.entityValues.joining[this.parentReference];
        }

        if (this.entityValues.joining[this.childReference]) {
            data[this.childReference] = this.entityValues.joining[this.childReference];
        }

        if (this.childTwoReference && this.entityValues.joining[this.childTwoReference]) {
            data[this.childTwoReference] = this.entityValues.joining[this.childTwoReference];
        }

        if (this.childThreeReference && this.entityValues.joining[this.childThreeReference]) {
            data[this.childThreeReference] = this.entityValues.joining[this.childThreeReference];
        }

        return data;
    }

    getJoiningEntityData(data: Record<string, unknown> = {}): Record<string, unknown> {
        const baseData = {
            ...this.getCoreJoiningData(),
            ...Object.fromEntries(this.joiningTablePks.map((pk) => [pk, this.entityValues.joining[pk]])),
            ...data,
        };

        // Add any additional fields from joining context
        for (const field of this.additionalFields) {
            if (field in this.entityValues.joining) {
                baseData[field] = this.entityValues.joining[field];
            }
        }

        return baseData;
    }

    private getAutoGeneratedPks(): Record<string, unknown> {
        const pks: Record<string, unknown> = {};

        if (this.autoGenerateIds.joiningEntity) {
            for (const pk of this.joiningTablePks) {
                pks[pk] = this.entityValues.joining[pk];
            }
        }

        return pks;
    }

    getCoreChildData(): Record<string, unknown> {
        const data: Record<string, unknown> = {};

        if (this.entityValues.child[this.childField]) {
            data[this.childField] = this.entityValues.child[this.childField];
        }

        return data;
    }

    getEnrichedJoinData(data: Record<string, unknown>): Record<string, unknown> {
        return {
            ...this.getCoreJoiningData(),
            ...data,
        };
    }

    getEnrichedJoinDataWithAllFields(data: Record<string, unknown>): Record<string, unknown> {
        const enrichedData = this.getEnrichedJoinData(data);

        // Add additional fields with undefined if not present
        for (const field of this.additionalFields) {
            if (!(field in enrichedData)) {
                enrichedData[field] = this.entityValues.joining[field] ?? undefined;
            }
        }

        // Add PKs with undefined if not present
        for (const pk of this.joiningTablePks) {
            if (!(pk in enrichedData)) {
                enrichedData[pk] = this.entityValues.joining[pk] ?? undefined;
            }
        }

        return enrichedData;
    }

    /**
     * Complete reset of all data
     */
    reset(): this {
        this.entityValues = {
            parent: {},
            child: {},
            childTwo: {},
            childThree: {},
            joining: {},
        };
        return this;
    }

    /**
     * Reset everything except parent relationship
     */
    resetExceptParent(): this {
        const parentData = { ...this.entityValues.parent };
        const parentReference = this.entityValues.joining[this.parentReference];

        this.entityValues = {
            parent: parentData,
            child: {},
            childTwo: {},
            childThree: {},
            joining: {
                [this.parentReference]: parentReference,
            },
        };
        return this;
    }

    /**
     * Reset only auto-generated IDs while keeping all other data
     */
    resetAutoGeneratedIds(): this {
        // Store existing data that we want to keep
        const existingData = {
            parent: { ...this.entityValues.parent },
            child: { ...this.entityValues.child },
            childTwo: { ...this.entityValues.childTwo },
            childThree: { ...this.entityValues.childThree },
            joining: { ...this.entityValues.joining },
        };

        // Remove existing IDs
        if (this.autoGenerateIds.joiningEntity) {
            for (const pk of this.joiningTablePks) {
                delete existingData.joining[pk];
            }
        }

        if (this.autoGenerateIds.child) {
            delete existingData.child[this.childField];
            delete existingData.joining[this.childReference];
        }

        if (this.autoGenerateIds.childTwo && this.childTwoField && this.childTwoReference) {
            delete existingData.childTwo[this.childTwoField];
            delete existingData.joining[this.childTwoReference];
        }

        if (this.autoGenerateIds.childThree && this.childThreeField && this.childThreeReference) {
            delete existingData.childThree[this.childThreeField];
            delete existingData.joining[this.childThreeReference];
        }

        // Reset and restore
        this.entityValues = existingData;
        this.initializeAutoGeneratedIds();
        return this;
    }

    /**
     * Reset child data while maintaining IDs and parent relationship
     */
    resetChildData(): this {
        const storedIds = {
            child: this.entityValues.child[this.childField],
            childTwo: this.childTwoField ? this.entityValues.childTwo[this.childTwoField] : undefined,
            childThree: this.childThreeField ? this.entityValues.childThree[this.childThreeField] : undefined,
        };

        const joiningRefs = {
            [this.parentReference]: this.entityValues.joining[this.parentReference],
            [this.childReference]: this.entityValues.joining[this.childReference],
        };

        if (this.childTwoReference) {
            joiningRefs[this.childTwoReference] = this.entityValues.joining[this.childTwoReference];
        }

        if (this.childThreeReference) {
            joiningRefs[this.childThreeReference] = this.entityValues.joining[this.childThreeReference];
        }

        // Reset child entities but maintain IDs
        this.entityValues = {
            ...this.entityValues,
            child: storedIds.child ? { [this.childField]: storedIds.child } : {},
            childTwo: storedIds.childTwo && this.childTwoField ? { [this.childTwoField]: storedIds.childTwo } : {},
            childThree: storedIds.childThree && this.childThreeField ? { [this.childThreeField]: storedIds.childThree } : {},
            joining: {
                ...joiningRefs,
                ...Object.fromEntries(this.joiningTablePks.map((pk) => [pk, this.entityValues.joining[pk]])),
            },
        };
        return this;
    }

    /**
     * Reset additional fields in joining table while maintaining relationships
     */
    resetJoiningFields(): this {
        const relationships = this.getCoreJoiningData();
        const pks = this.getAutoGeneratedPks();

        this.entityValues.joining = {
            ...relationships,
            ...pks,
        };
        return this;
    }
    getCurrentValues(): Record<string, Record<string, unknown>> {
        return {
            parent: { ...this.entityValues.parent },
            child: { ...this.entityValues.child },
            childTwo: { ...this.entityValues.childTwo },
            childThree: { ...this.entityValues.childThree },
            joining: { ...this.entityValues.joining },
        };
    }

    getGeneratedIds(): Record<string, unknown> {
        const ids: Record<string, unknown> = {};

        // Add joining table PKs
        if (this.autoGenerateIds.joiningEntity) {
            for (const pk of this.joiningTablePks) {
                if (this.entityValues.joining[pk]) {
                    ids[pk] = this.entityValues.joining[pk];
                }
            }
        }

        // Add child IDs
        if (this.autoGenerateIds.child && this.entityValues.child[this.childField]) {
            ids[this.childField] = this.entityValues.child[this.childField];
        }

        if (this.autoGenerateIds.childTwo && this.childTwoField && this.entityValues.childTwo[this.childTwoField]) {
            ids[this.childTwoField] = this.entityValues.childTwo[this.childTwoField];
        }

        if (this.autoGenerateIds.childThree && this.childThreeField && this.entityValues.childThree[this.childThreeField]) {
            ids[this.childThreeField] = this.entityValues.childThree[this.childThreeField];
        }

        return ids;
    }
}

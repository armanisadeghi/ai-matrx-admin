'use client';

import { EntityRecordMap } from '@/lib/redux/entity/types/stateTypes';
import { toPkValue, toMatrxIdFromValueBatch, toMatrxIdFromValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EntityKeys, MatrxRecordId, EntityAnyFieldKey } from '@/types';
import { entityFieldNameGroups } from './fieldsDataUtil';
import { RelationshipDefinition } from '@/types/relationshipTypes';
import { v4 as uuidv4 } from 'uuid';
import {
    actionRelationshipDefinition,
    aiAgentRelationshipDefinition,
    aiModelEndpointRelationshipDefinition,
    aiSettingsRelationshipDefinition,
    automationBoundaryBrokerRelationshipDefinition,
    flashcardHistoryRelationshipDefinition,
    flashcardSetRelationsRelationshipDefinition,
    messageBrokerRelationshipDefinition,
    recipeBrokerRelationshipDefinition,
    recipeDisplayRelationshipDefinition,
    recipeFunctionRelationshipDefinition,
    recipeMessageRelationshipDefinition,
    recipeModelRelationshipDefinition,
    recipeProcessorRelationshipDefinition,
    recipeToolRelationshipDefinition,
    RELATIONSHIP_DEFINITIONS,
} from './relationshipData';

const sampleConfig = {
    definition: 'recipeMessage',
    parentEntity: 'recipe',
    childEntity: 'messageTemplate',
};

const sampleConfig2 = {
    definition: 'recipeMessage',
    entityOne: 'parent',
    entityTwo: 'child',
    entityThree: null,
    entityFour: null,
};

const sampleConfig3 = {
    definition: 'recipeMessage',
    parent: 'entityOne',
    child: 'entityTwo',
    childTwo: null,
    childThree: null,
};

export class RelationshipMapper {
    private definition: RelationshipDefinition;
    private data: any[];
    private parentEntity: EntityKeys | null = null;
    private parentId: string | number | null = null;
    private parentMatrxId: MatrxRecordId | null = null;

    constructor(entityName: EntityKeys) {
        this.definition = RELATIONSHIP_DEFINITIONS[entityName];
        this.data = [];
    }

    getState() {
        return {
            definition: this.definition,
            data: this.data,
            parentEntity: this.parentEntity,
            parentId: this.parentId,
            parentMatrxId: this.parentMatrxId,
        };
    }

    private isEntityPartOfRelationship(entityName: EntityKeys): boolean {
        const entities = [this.definition.entityOne, this.definition.entityTwo, this.definition.entityThree, this.definition.entityFour].filter(Boolean);

        return entities.includes(entityName);
    }

    setParentEntity(entityName: EntityKeys) {
        if (!this.isEntityPartOfRelationship(entityName)) {
            throw new Error(`Entity ${entityName} is not part of this relationship`);
        }
        this.parentEntity = entityName;
    }

    setParentId(internalId: string | null) {
        this.parentId = internalId;
        this.parentMatrxId = internalId ? toMatrxIdFromValue(this.parentEntity!, [internalId]) : null;
    }

    setParentRecordId(matrxRecordId: string | null) {
        this.parentMatrxId = matrxRecordId;
        this.parentId = matrxRecordId ? toPkValue(matrxRecordId) : null;
    }

    setData(data: any[] | EntityRecordMap<EntityKeys> | null) {
        this.data = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
    }

    setUniqueData(data: any[] | EntityRecordMap<EntityKeys> | null) {
        // First convert to array if needed
        const dataArray = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        
        // Check if records have matrxRecordId or id
        const hasMatrxIds = dataArray.length > 0 && 'matrxRecordId' in dataArray[0];
        const hasIds = dataArray.length > 0 && 'id' in dataArray[0];
    
        if (hasMatrxIds) {
            // Deduplicate based on matrxRecordId
            this.data = Array.from(
                new Map(
                    dataArray.map(record => [record.matrxRecordId, record])
                ).values()
            );
        } else if (hasIds) {
            // Fallback to using 'id' field
            this.data = Array.from(
                new Map(
                    dataArray.map(record => [record.id, record])
                ).values()
            );
        } else {
            // No unique identifier available, just set the data as is
            this.data = dataArray;
        }
    }

    private getEntityConfig(entityName: EntityKeys) {
        const configs = [
            {
                entity: this.definition.entityOne,
                referenceField: this.definition.ReferenceFieldOne,
                entityField: this.definition.entityOneField,
                pks: this.definition.entityOnePks,
            },
            {
                entity: this.definition.entityTwo,
                referenceField: this.definition.ReferenceFieldTwo,
                entityField: this.definition.entityTwoField,
                pks: this.definition.entityTwoPks,
            },
            {
                entity: this.definition.entityThree,
                referenceField: this.definition.ReferenceFieldThree,
                entityField: this.definition.entityThreeField,
                pks: this.definition.entityThreePks,
            },
            {
                entity: this.definition.entityFour,
                referenceField: this.definition.ReferenceFieldFour,
                entityField: this.definition.entityFourField,
                pks: this.definition.entityFourPks,
            },
        ].filter((config) => config.entity);

        return configs.find((config) => config.entity === entityName);
    }

    // Join table record operations
    getJoinRecords(): Array<Record<string, any>> {
        if (!this.parentEntity || !this.parentId) return [];

        const parentConfig = this.getEntityConfig(this.parentEntity);
        if (!parentConfig) return [];

        return this.data.filter((record) => record && record[parentConfig.referenceField] === this.parentId);
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

        const parentConfig = this.getEntityConfig(this.parentEntity);
        if (!parentConfig) return [];

        // Get all other entities' reference fields
        const otherConfigs = [
            this.getEntityConfig(this.definition.entityOne),
            this.getEntityConfig(this.definition.entityTwo),
            this.getEntityConfig(this.definition.entityThree),
            this.getEntityConfig(this.definition.entityFour),
        ].filter((config) => config && config.entity !== this.parentEntity);

        // Filter records based on parent entity and map to child IDs
        return this.data
            .filter((record) => record && record[parentConfig.referenceField] === this.parentId)
            .flatMap((record) => otherConfigs.map((config) => config && record[config.referenceField]))
            .filter(Boolean);
    }

    private getTargetEntity(): EntityKeys {
        if (!this.parentEntity) throw new Error('Parent entity not set');

        // Find the first non-parent entity in the relationship
        const otherEntity = [this.definition.entityOne, this.definition.entityTwo, this.definition.entityThree, this.definition.entityFour].find(
            (entity) => entity && entity !== this.parentEntity
        );

        if (!otherEntity) {
            throw new Error('No target entity found');
        }

        return otherEntity;
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
        parentEntity: 'recipe',
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

    // console.log('Mapped Relationship: ', mapped);
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
        joiningData: Record<string, unknown> = {},
        childId?: unknown,
        filter?: boolean
    ): {
        childEntity: Record<string, unknown>;
        joiningEntity: Record<string, unknown>;
    } {
        // Apply filtering to input data before processing if filter flag is true
        const effectiveChildData = filter ? this.filterDataByFields(childData, entityFieldNameGroups[this.childEntity].nativeFields) : childData;

        const effectiveJoiningData = filter ? this.filterDataByFields(joiningData, entityFieldNameGroups[this.joiningTable].nativeFieldsNoPk) : joiningData;

        this.setParentId(parentId);

        if (childId !== undefined) {
            this.setChildId(childId);
        }

        const childEntity = {
            ...effectiveChildData,
            [this.childField]: this.entityValues.child[this.childField],
        };

        const joiningEntity = {
            ...effectiveJoiningData,
            ...this.getCoreJoiningData(),
            ...Object.fromEntries(this.joiningTablePks.map((pk) => [pk, this.entityValues.joining[pk]])),
        };

        return {
            childEntity,
            joiningEntity,
        };
    }

    private filterDataByFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown> {
        return Object.fromEntries(Object.entries(data).filter(([key]) => fields.includes(key)));
    }

    private filterEntityPayloads(
        childPayload: Record<string, unknown>,
        joiningPayload: Record<string, unknown>
    ): {
        filteredChild: Record<string, unknown>;
        filteredJoining: Record<string, unknown>;
    } {
        const childFields = entityFieldNameGroups[this.childEntity].nativeFields;
        const joiningFields = entityFieldNameGroups[this.joiningTable].nativeFieldsNoPk;

        return {
            filteredChild: this.filterDataByFields(childPayload, childFields),
            filteredJoining: this.filterDataByFields(joiningPayload, joiningFields),
        };
    }

    createEntityWithFilteredRelationship(
        parentId: unknown,
        childData: Record<string, unknown> = {},
        joiningData: Record<string, unknown> = {},
        childId?: unknown
    ): {
        childEntity: Record<string, unknown>;
        joiningEntity: Record<string, unknown>;
    } {
        // First, use the original method to handle all the relationship logic
        const { childEntity, joiningEntity } = this.createEntityWithRelationship(parentId, childData, joiningData, childId);

        // Then apply our filtering to both entities
        const { filteredChild, filteredJoining } = this.filterEntityPayloads(childEntity, joiningEntity);

        return {
            childEntity: filteredChild,
            joiningEntity: filteredJoining,
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

export function getRelationshipMapper(entityName: EntityKeys): RelationshipMapper {
    const definitions = RELATIONSHIP_DEFINITIONS;
    return new RelationshipMapper(entityName);
}

const definitions = RELATIONSHIP_DEFINITIONS;

import { EntityRecordMap } from '@/lib/redux/entity/types/stateTypes';
import { toMatrxIdFromValueBatch, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EntityAnyFieldKey, EntityKeys, MatrxRecordId } from '@/types';

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
        .filter(record => record && record[sourceField] === this.parentId)
        .map(record => record[targetField])
        .filter(Boolean);
    }

    getRelatedRecords(): Array<Record<string, any>> {
      if (!this.parentEntity || !this.parentId) return [];

      const isEntityOne = this.parentEntity === this.definition.entityOne;
      const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
      const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;

      return this.data
        .filter(record => record && record[sourceField] === this.parentId)
        .map(record => {
          const result: Record<string, any> = {
            [targetField]: record[targetField]
          };
            
          this.definition.additionalFields.forEach(field => {
            if (field in record) {
              result[field] = record[field];
            }
          });

          return result;
        })
        .filter(record => Boolean(record[targetField]));
    }
  
    private getTargetEntity(): EntityKeys {
      if (!this.parentEntity) throw new Error('Parent entity not set');
      return this.parentEntity === this.definition.entityOne 
        ? this.definition.entityTwo!
        : this.definition.entityOne;
    }

    getRelatedMatrxIds(): MatrxRecordId[] | null {
      const relatedIds = this.getRelatedIds();
      const targetEntity = this.getTargetEntity();
      return toMatrxIdFromValueBatch(targetEntity, relatedIds);
    }

    getRelatedWithRecordIds(): Array<{ id: string, targetId: string }> {
      if (!this.parentEntity || !this.parentId) return [];

      const isEntityOne = this.parentEntity === this.definition.entityOne;
      const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
      const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;
  
      return this.data
        .map((record, index) => ({
          id: record.id || String(index),
          targetId: record[targetField]
        }))
        .filter(result => Boolean(result.targetId));
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

      return this.data
        .filter(record => record && record[sourceField] === this.parentId);
    }

    getJoinRecordIds(): string[] {
      return this.getJoinRecords()
        .map(record => record.id)
        .filter(Boolean);
    }

    getJoinMatrxIds(): MatrxRecordId[] {
      return this.getJoinRecords()
        .map(record => record.matrxRecordId)
        .filter(Boolean);
    }

    // Child entity operations
    getChildIds(): string[] {
      if (!this.parentEntity || !this.parentId) return [];

      const isEntityOne = this.parentEntity === this.definition.entityOne;
      const sourceField = isEntityOne ? this.definition.ReferenceFieldOne : this.definition.ReferenceFieldTwo!;
      const targetField = isEntityOne ? this.definition.ReferenceFieldTwo! : this.definition.ReferenceFieldOne;
      
      return this.data
        .filter(record => record && record[sourceField] === this.parentId)
        .map(record => record[targetField])
        .filter(Boolean);
    }

    private getTargetEntity(): EntityKeys {
      if (!this.parentEntity) throw new Error('Parent entity not set');
      return this.parentEntity === this.definition.entityOne 
        ? this.definition.entityTwo!
        : this.definition.entityOne;
    }

    getChildMatrxIds(): MatrxRecordId[] | null {
      const childIds = this.getChildIds();
      const targetEntity = this.getTargetEntity();
      return toMatrxIdFromValueBatch(targetEntity, childIds);
    }
}
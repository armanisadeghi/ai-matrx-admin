// utils/schema/relationshipUtils.ts
import {AnyEntityDatabaseTable, EntityKeys, UnifiedSchemaCache} from "@/types";
import {
    FullEntityRelationships,
    EntityRelationshipType,
    ForeignKeyDetails,
    ReferencedByDetails,
    RelationshipDetails,
    entityRelationships,
    asEntityRelationships,
} from "@/utils/schema/fullRelationships";
import { getGlobalCache } from "./schema-processing/processSchema";

type DirectRelationship = {
    entity: EntityKeys;
    type: EntityRelationshipType;
    fields: {
        local: string;
        foreign: string;
    };
};

type InverseRelationship = {
    entity: EntityKeys;
    fields: {
        local: string;
        foreign: string;
    };
};

export class EntityRelationshipManager {
    private static instance: EntityRelationshipManager;
    private relationships: Record<EntityKeys, FullEntityRelationships>;

    private constructor(cache: UnifiedSchemaCache) {
        this.relationships = cache.fullEntityRelationships;
    }

    static getInstance(cache?: UnifiedSchemaCache): EntityRelationshipManager {
        if (!EntityRelationshipManager.instance) {
            if (!cache) {
                const globalCache = getGlobalCache(['EntityRelationshipManager.getInstance']);
                if (!globalCache) {
                    throw new Error('Cannot initialize EntityRelationshipManager: global cache not available');
                }
                cache = globalCache;
            }
            EntityRelationshipManager.instance = new EntityRelationshipManager(cache);
        }
        return EntityRelationshipManager.instance;
    }

    getAllEntities(): Record<EntityKeys, FullEntityRelationships> {
        return this.relationships;
    }

    getDirectRelationships(entityName: EntityKeys): DirectRelationship[] {
        const entityRelations = this.relationships[entityName];
        if (!entityRelations) return [];

        const results: DirectRelationship[] = [];

        Object.entries<ForeignKeyDetails>(entityRelations.relationshipDetails.foreignKeys).forEach(([relatedEntity, details]) => {
            results.push({
                entity: relatedEntity as EntityKeys,
                type: details.relationshipType,
                fields: {
                    local: details.fieldName,
                    foreign: details.foreignField
                }
            });
        });

        return results;
    }

    getInverseRelationships(entityName: EntityKeys): InverseRelationship[] {
        const entityRelations = this.relationships[entityName];
        if (!entityRelations) return [];

        return Object.entries<ReferencedByDetails>(entityRelations.relationshipDetails.referencedBy)
            .map(([entity, details]) => ({
                entity: entity as EntityKeys,
                fields: {
                    local: details.foreignField,
                    foreign: details.field
                }
            }));
    }

    getRelationshipType(sourceEntity: EntityKeys, targetEntity: EntityKeys): EntityRelationshipType | undefined {
        const entityRelations = this.relationships[sourceEntity];
        if (!entityRelations) return undefined;

        const directRelation = entityRelations.relationshipDetails.foreignKeys[targetEntity];
        if (directRelation) {
            return directRelation.relationshipType;
        }

        if (entityRelations.selfReferential.includes(targetEntity)) return 'self-referential';
        if (entityRelations.oneToOne.includes(targetEntity)) return 'one-to-one';
        if (entityRelations.oneToMany.includes(targetEntity)) return 'one-to-many';
        if (entityRelations.manyToOne.includes(targetEntity)) return 'many-to-one';
        if (entityRelations.manyToMany.includes(targetEntity)) return 'many-to-many';

        return undefined;
    }

    getRelationshipFields(sourceEntity: EntityKeys, targetEntity: EntityKeys) {
        const entityRelations = this.relationships[sourceEntity];
        if (!entityRelations) return undefined;

        const directRelation = entityRelations.relationshipDetails.foreignKeys[targetEntity];
        if (directRelation) {
            return {
                local: directRelation.fieldName,
                foreign: directRelation.foreignField
            };
        }

        const inverseRelation = entityRelations.relationshipDetails.referencedBy[targetEntity];
        if (inverseRelation) {
            return {
                local: inverseRelation.foreignField,
                foreign: inverseRelation.field
            };
        }

        return undefined;
    }

    getAllRelatedEntities(entityName: EntityKeys): EntityKeys[] {
        const entityRelations = this.relationships[entityName];
        if (!entityRelations) return [];

        const relatedEntities = new Set([
            ...entityRelations.selfReferential,
            ...entityRelations.manyToMany,
            ...entityRelations.oneToOne,
            ...entityRelations.manyToOne,
            ...entityRelations.oneToMany,
            ...entityRelations.inverseReferences
        ]);

        return Array.from(relatedEntities) as EntityKeys[];
    }
}
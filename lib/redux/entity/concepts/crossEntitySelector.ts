import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux/store";
import { EntityKeys, Relationship, AutomationEntities } from "@/types/entityTypes";
import { EntityState } from "@/lib/redux/entity/types";
import { createEntitySelectors } from "@/lib/redux/entity/selectors";
import { selectSchema } from "@/lib/redux/schema/globalCacheSelectors";

/**
 * Creates a cross-entity selector based on relationships defined in the global schema.
 *
 * @param primaryEntityKey - The primary entity key.
 * @returns A selector to derive the combined data with related entities.
 */
export const createCrossEntitySelectorWithRelationships = (primaryEntityKey: EntityKeys) => {
    const { selectEntity: selectPrimaryEntity } = createEntitySelectors(primaryEntityKey);

    return createSelector(
        [
            selectPrimaryEntity, // Primary entity state (records + metadata)
            selectSchema,
            (state: RootState) => state.entities
        ],
        (primaryEntityState: EntityState<any>, globalSchema: AutomationEntities, entities) => {
            if (!primaryEntityState || !globalSchema) {
                console.warn(`No data found for primary entity: ${primaryEntityKey}`);
                return [];
            }

            const { records } = primaryEntityState;
            const relationships = globalSchema[primaryEntityKey]?.relationships || [];

            let combinedData = Object.values(records);

            relationships.forEach((rel: Relationship) => {
                const relatedEntityKey = rel.relatedTable as EntityKeys;

                const { selectEntity: selectRelatedEntity } = createEntitySelectors(relatedEntityKey);

                const relatedEntityState: EntityState<any> = selectRelatedEntity({ entities } as RootState);
                const relatedRecords = Object.values(relatedEntityState?.records || []);

                if (rel.relationshipType === 'foreignKey') {
                    const foreignKeyMap = new Map();
                    relatedRecords.forEach(item => {
                        const key = item[rel.relatedColumn];
                        if (!foreignKeyMap.has(key)) {
                            foreignKeyMap.set(key, []);
                        }
                        foreignKeyMap.get(key).push(item);
                    });

                    combinedData = combinedData.map(primaryItem => ({
                        ...primaryItem,
                        [relatedEntityKey]: foreignKeyMap.get(primaryItem[rel.column]) || [],
                    }));
                } else if (rel.relationshipType === 'inverseForeignKey') {
                    const inverseKeyMap = new Map();
                    relatedRecords.forEach(item => {
                        const key = item[rel.column];
                        if (!inverseKeyMap.has(key)) {
                            inverseKeyMap.set(key, []);
                        }
                        inverseKeyMap.get(key).push(item);
                    });

                    combinedData = combinedData.map(primaryItem => ({
                        ...primaryItem,
                        [relatedEntityKey]: inverseKeyMap.get(primaryItem[rel.relatedColumn]) || [],
                    }));
                } else if (rel.relationshipType === 'manyToMany' && rel.junctionTable) {
                    console.warn('Many-to-Many relationships are not yet supported.');
                } else {
                    console.warn(`Unsupported relationship type: ${rel.relationshipType}`);
                }
            });

            return combinedData;
        }
    );
};

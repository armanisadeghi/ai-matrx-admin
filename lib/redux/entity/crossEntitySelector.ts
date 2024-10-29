import { createSelector } from 'reselect';
import {RootState} from "@/lib/redux/store";

const selectEntityData = (entityName: string) => (state: RootState) =>
    state[entityName]?.data || [];

export const createCrossEntitySelector = (
    entityNames: string[],
    foreignKeys: Record<string, string> // e.g., { orders: 'userId' }
) =>
    createSelector(
        // Dynamically generate selectors for each entity
        entityNames.map(entityName => selectEntityData(entityName)),
        // Combine data based on the entity names and relationships
        (...entityData) => {
            const combinedData = entityData.reduce((acc, currentData, index) => {
                const currentEntity = entityNames[index];
                const relatedKey = foreignKeys[currentEntity];

                if (relatedKey) {
                    // Assume `acc` already has the primary entity data initialized
                    acc = acc.map(primaryItem => ({
                        ...primaryItem,
                        [currentEntity]: currentData.filter(
                            relatedItem => relatedItem[relatedKey] === primaryItem.id
                        ),
                    }));
                } else {
                    // If no relatedKey, simply add data to the accumulator as top-level data
                    acc[currentEntity] = currentData;
                }
                return acc;
            }, entityData[0]); // Start with the first entity's data as the primary dataset

            return combinedData;
        }
    );


// Select users with nested orders and comments (assuming comments also have a userId foreign key)
const selectUsersWithRelatedData = createCrossEntitySelector(
    ['users', 'orders', 'comments'],
    { orders: 'userId', comments: 'userId' }
);

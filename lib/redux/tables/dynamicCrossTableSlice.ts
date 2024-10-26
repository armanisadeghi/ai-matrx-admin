import { createSelector } from 'reselect';
import {RootState} from "@/lib/redux/store";

const selectTableData = (tableName: string) => (state: RootState) =>
    state[tableName]?.data || [];

export const createDynamicCrossSliceSelector = (
    tableNames: string[],
    foreignKeys: Record<string, string> // e.g., { orders: 'userId' }
) =>
    createSelector(
        // Dynamically generate selectors for each table
        tableNames.map(tableName => selectTableData(tableName)),
        // Combine data based on the table names and relationships
        (...tableData) => {
            const combinedData = tableData.reduce((acc, currentData, index) => {
                const currentTable = tableNames[index];
                const relatedKey = foreignKeys[currentTable];

                if (relatedKey) {
                    // Assume `acc` already has the primary table data initialized
                    acc = acc.map(primaryItem => ({
                        ...primaryItem,
                        [currentTable]: currentData.filter(
                            relatedItem => relatedItem[relatedKey] === primaryItem.id
                        ),
                    }));
                } else {
                    // If no relatedKey, simply add data to the accumulator as top-level data
                    acc[currentTable] = currentData;
                }
                return acc;
            }, tableData[0]); // Start with the first table's data as the primary dataset

            return combinedData;
        }
    );


// Select users with nested orders and comments (assuming comments also have a userId foreign key)
const selectUsersWithRelatedData = createDynamicCrossSliceSelector(
    ['users', 'orders', 'comments'],
    { orders: 'userId', comments: 'userId' }
);

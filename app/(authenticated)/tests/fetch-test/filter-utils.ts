// filter-utils.ts
import { FilterCondition, ComparisonOperator } from '@/lib/redux/entity/types/stateTypes'; // Adjust import path

export type ConditionInput = {
    field: string;
    operator: ComparisonOperator;
    value: unknown;
    and?: ConditionInput[];
    or?: ConditionInput[];
};

/**
 * Builds an array of FilterCondition objects from a list of condition inputs
 * @param conditions Array of condition objects or single condition object
 * @returns Array of FilterCondition objects compatible with your query system
 */
export function buildFilterConditions(
    conditions: ConditionInput | ConditionInput[]
): FilterCondition[] {
    // Normalize to array if single condition is passed
    const conditionsArray = Array.isArray(conditions) ? conditions : [conditions];
    
    return conditionsArray.map(condition => {
        const filterCondition: FilterCondition = {
            field: condition.field,
            operator: condition.operator,
            value: condition.value
        };

        // Handle nested AND conditions
        if (condition.and) {
            filterCondition.and = buildFilterConditions(condition.and);
        }

        // Handle nested OR conditions
        if (condition.or) {
            filterCondition.or = buildFilterConditions(condition.or);
        }

        return filterCondition;
    });
}

// // Example usage in a React component/hook:
// export const useConversationFilters = (conversationId: string) => {
//     const filters = useMemo(() => {
//         return buildFilterConditions([
//             {
//                 field: 'display_order',
//                 operator: 'is',
//                 value: null
//             },
//             {
//                 field: 'display_order',
//                 operator: 'neq',
//                 value: 0
//             },
//             {
//                 field: 'conversation_id',
//                 operator: 'eq',
//                 value: conversationId
//             }
//         ]);
//     }, [conversationId]);

//     return filters;
// };

// // More complex example with nesting:
// export const useComplexFilters = (userId: string, minAge: number) => {
//     const filters = useMemo(() => {
//         return buildFilterConditions({
//             field: 'status',
//             operator: 'eq',
//             value: 'active',
//             and: [
//                 {
//                     field: 'user_id',
//                     operator: 'eq',
//                     value: userId
//                 },
//                 {
//                     field: 'age',
//                     operator: 'gte',
//                     value: minAge,
//                     or: [
//                         {
//                             field: 'role',
//                             operator: 'eq',
//                             value: 'admin'
//                         },
//                         {
//                             field: 'role',
//                             operator: 'eq',
//                             value: 'moderator'
//                         }
//                     ]
//                 }
//             ]
//         });
//     }, [userId, minAge]);

//     return filters;
// };
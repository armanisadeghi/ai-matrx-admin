/*
import {
    PartialRegisteredFunctionBase,
    PartialRegisteredFunctionFullSchema,
    RegisteredFunctionBase, RegisteredFunctionBaseSchema, RegisteredFunctionUnion, RegisteredFunctionUnionSchema
} from "@/types/registeredFunctionTypes";
import {NewRootState} from "@/features/combined_test/newRedux/store";
import {PaginatedResponse} from "@/features/combined_test/newRedux/reduxTypes";
import {schema} from "normalizr";
import {createFeatureSlice} from "@/features/combined_test/newRedux/sliceCreator";
import {createSelector} from "@reduxjs/toolkit";
import {BrokerType} from "@/types/brokerTypes";
import {createFeatureSelectors} from "@/features/combined_test/newRedux/featureSelectors";

export interface RegisteredFunctionItem extends RegisteredFunctionBase {
    id: string;
}

// ParsedPaginatedResponse now uses RegisteredFunctionItem
export interface ParsedPaginatedResponse extends Omit<PaginatedResponse<RegisteredFunctionItem>, 'paginatedData'> {
    paginatedData: RegisteredFunctionItem[];
}

const registeredFunctionSchema = new schema.Payload('registeredFunctions');

const parseRegisteredFunctionData = (data: any): RegisteredFunctionItem => {
    return {
        id: data.id,
        name: data.name,
        modulePath: data.modulePath,
        className: data.className,
        description: data.description,
        returnBroker: data.returnBroker,
    };
};

const parsePaginatedResponse = (response: PaginatedResponse<RegisteredFunctionItem>): ParsedPaginatedResponse => {
    return {
        ...response,
        paginatedData: response.paginatedData.map(parseRegisteredFunctionData),
    };
};

const { reducer, actions } = createFeatureSlice<RegisteredFunctionUnion>(
    'registeredFunctions',
    RegisteredFunctionUnionSchema,
    10 * 60 * 1000, // default stale time
    {
        fetchPaginated: (state, action) => {
            const parsedResponse = parsePaginatedResponse(action.payload);
            parsedResponse.paginatedData.forEach((item) => {
                state.items[item.id] = item;
            });
            state.allIds = parsedResponse.allIds;
            state.totalCount = parsedResponse.totalCount;
        },
        fetchOne: (state, action) => {
            const parsedItem = parseRegisteredFunctionData(action.payload);
            state.items[parsedItem.id] = parsedItem;
        },
        create: (state, action) => {
            const parsedItem = parseRegisteredFunctionData(action.payload);
            state.items[parsedItem.id] = parsedItem;
            state.allIds.push({ id: parsedItem.id, name: parsedItem.name });
            state.totalCount += 1;
        },
        update: (state, action) => {
            const parsedItem = parseRegisteredFunctionData(action.payload);
            state.items[parsedItem.id] = parsedItem;
            const index = state.allIds.findIndex((item) => item.id === parsedItem.id);
            if (index !== -1) {
                state.allIds[index].name = parsedItem.name;
            }
        },
    }
);

export const {
    fetchOne: fetchRegisteredFunction,
    fetchPaginated: fetchPaginatedRegisteredFunctions,
    deleteOne: deleteRegisteredFunctionRPC,
    update: saveRegisteredFunction,
    create: createRegisteredFunctionThunk,
} = actions;

export const {
    getItems: getRegisteredFunctionItems,
    getOne: getRegisteredFunction,
    getAllIds: getAllRegisteredFunctionIds,
    getTotalCount: getTotalRegisteredFunctionCount
} = createFeatureSelectors<RegisteredFunctionBase>('registeredFunctions');

export const createRegisteredFunction = (input: FormData) => {
    const validatedInput = RegisteredFunctionBaseSchema.parse(input);
    return createRegisteredFunctionThunk(validatedInput as RegisteredFunctionBase);
};

export const updateRegisteredFunction = (id: string, input: PartialRegisteredFunctionBase) => {
    return (dispatch: any, getState: () => NewRootState) => {
        const validatedInput = PartialRegisteredFunctionFullSchema.parse(input);
        const state = getState();
        const existingItem = getRegisteredFunction(state, id);

        if (!existingItem) {
            throw new Error(`Cannot update non-existent item with id: ${id}`);
        }

        const updatedItem: RegisteredFunctionItem = {
            ...existingItem,
            ...validatedInput,
        };

        return dispatch(saveRegisteredFunction(updatedItem));
    };
};

export const getReturnBroker = createSelector(
    [getRegisteredFunction],
    (func): BrokerType | undefined => {
        return func?.returnBroker ? { id: func.returnBroker } as BrokerType : undefined;
    }
);

export const searchRegisteredFunctionItems = (query: string) => createSelector(
    [getRegisteredFunctionItems],
    (items): RegisteredFunctionItem[] => {
        if (!query) return Object.values(items);

        const lowerCaseQuery = query.toLowerCase();
        return Object.values(items).filter(item =>
            (item.name && item.name.toLowerCase().includes(lowerCaseQuery)) ||
            (item.description && item.description.toLowerCase().includes(lowerCaseQuery))
        );
    }
);

export default reducer;
*/

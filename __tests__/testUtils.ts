/*
// __tests__/testUtils.ts

import { InitialReduxState } from "@/types/reduxTypes";
import { makeStore } from "@/lib/redux/store";

// Define a mock initial state with the necessary structure
export const mockInitialState: InitialReduxState = {
    globalCache: {
        schema: {
            // Add entities expected in your schema
            entityNames: ["registeredFunction"],
            entities: {
                registeredFunction: {
                    id: "1",
                    name: "Sample Entity",
                },
            },
        },
    },
    // Add additional top-level reducers as needed
    user: { /!* mock user data *!/ },
    layout: { /!* mock layout data *!/ },
    // Add any other slices that are required by your selectors
};

// Utility to create a test store
export const createTestStore = (initialState = mockInitialState) => {
    return makeStore(initialState);
};
*/

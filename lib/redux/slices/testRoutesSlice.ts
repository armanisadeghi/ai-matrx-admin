import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: string[] = [];

export const testRoutesSlice = createSlice({
    name: 'testRoutes',
    initialState,
    reducers: {
        setTestRoutes: (state, action: PayloadAction<string[]>) => {
            return action.payload;
        },
        addTestRoute: (state, action: PayloadAction<string>) => {
            state.push(action.payload);
        },
        removeTestRoute: (state, action: PayloadAction<string>) => {
            return state.filter(route => route !== action.payload);
        },
        clearTestRoutes: () => {
            return initialState;
        },
    },
});

export const { setTestRoutes, addTestRoute, removeTestRoute, clearTestRoutes } = testRoutesSlice.actions;

export default testRoutesSlice.reducer;

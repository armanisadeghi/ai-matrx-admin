import {createAsyncThunk} from "@reduxjs/toolkit";
import {AppDispatch, RootState} from "@/lib/redux/store";

export const loadSchemaForContext = createAsyncThunk<
    UISchema,
    string,
    { state: RootState }
>('ui/loadSchemaForContext', async (context, {getState}) => {
    const schemaSlice = getState().globalCache;
    return schemaSlice.entities[context];
});

// Async thunk to load data based on schema
export const loadDataForSchema = createAsyncThunk<
    Record<string, any>[],
    string,
    { state: RootState }
>('ui/loadDataForSchema', async (context, {getState}) => {
    const schemaSlice = getState().globalCache;
    const dataSlice = getState().entities;

    const schema = schemaSlice.entities[context]; // Get schema for context
    const data = dataSlice[context]; // Fetch data for the same context

    // Optionally, handle mismatches or data normalization here
    return data;
});

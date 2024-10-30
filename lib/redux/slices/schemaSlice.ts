// File: lib/redux/slices/schemaSlice.ts

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
    EntityNameFormatMap,
    EntityNameToCanonicalMap,
    FieldNameFormatMap,
    FieldNameToCanonicalMap, UnifiedSchemaCache
} from "@/types/entityTypes";
import {InitialTableSchema} from "@/utils/schema/initialSchemas";

interface SchemaState {
    automationSchema: InitialTableSchema | null;
    entityNameToCanonical: EntityNameToCanonicalMap | null;
    fieldNameToCanonical: FieldNameToCanonicalMap | null;
    entityNameFormats: EntityNameFormatMap | null;
    fieldNameFormats: FieldNameFormatMap | null;
    isInitialized: boolean;
}

const initialState: SchemaState = {
    automationSchema: null,
    entityNameToCanonical: null,
    fieldNameToCanonical: null,
    entityNameFormats: null,
    fieldNameFormats: null,
    isInitialized: false
};

const schemaSlice = createSlice({
    name: 'schema',
    initialState,
    reducers: {
        setAutomationSchema: (state, action: PayloadAction<InitialTableSchema>) => {
            state.automationSchema = action.payload;
        },
        setTableNameMap: (state, action: PayloadAction<EntityNameToCanonicalMap>) => {
            state.entityNameToCanonical = action.payload;
        },
        setFieldNameMap: (state, action: PayloadAction<FieldNameToCanonicalMap>) => {
            state.fieldNameToCanonical = action.payload;
        },
        setReverseTableNameMap: (state, action: PayloadAction<EntityNameFormatMap>) => {
            state.entityNameFormats = action.payload;
        },
        setReverseFieldNameMap: (state, action: PayloadAction<FieldNameFormatMap>) => {
            state.fieldNameFormats = action.payload;
        },
        initializeAllMaps: (state, action: PayloadAction<UnifiedSchemaCache>) => {
            state.automationSchema = action.payload.schema;
            state.entityNameToCanonical = action.payload.entityNameToCanonical;
            state.fieldNameToCanonical = action.payload.fieldNameToCanonical;
            state.entityNameFormats = action.payload.entityNameFormats;
            state.fieldNameFormats = action.payload.fieldNameFormats;
            state.isInitialized = true;
        },
        resetSchema: (state) => {
            return initialState;
        }
    }
});

export const {
    setAutomationSchema,
    setTableNameMap,
    setFieldNameMap,
    setReverseTableNameMap,
    setReverseFieldNameMap,
    initializeAllMaps,
    resetSchema
} = schemaSlice.actions;

export default schemaSlice.reducer;

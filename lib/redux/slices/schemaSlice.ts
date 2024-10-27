// File: lib/redux/slices/schemaSlice.ts

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
    AutomationTableStructure,
    FieldNameMap,
    ReverseFieldNameMap,
    ReverseTableNameMap,
    TableNameMap, UnifiedSchemaCache
} from "@/types/automationTableTypes";

interface SchemaState {
    automationSchema: Readonly<AutomationTableStructure> | null;
    tableNameMap: TableNameMap | null;
    fieldNameMap: FieldNameMap | null;
    reverseTableNameMap: ReverseTableNameMap | null;
    reverseFieldNameMap: ReverseFieldNameMap | null;
    isInitialized: boolean;
}

const initialState: SchemaState = {
    automationSchema: null,
    tableNameMap: null,
    fieldNameMap: null,
    reverseTableNameMap: null,
    reverseFieldNameMap: null,
    isInitialized: false
};

const schemaSlice = createSlice({
    name: 'schema',
    initialState,
    reducers: {
        setAutomationSchema: (state, action: PayloadAction<AutomationTableStructure>) => {
            state.automationSchema = action.payload;
        },
        setTableNameMap: (state, action: PayloadAction<TableNameMap>) => {
            state.tableNameMap = action.payload;
        },
        setFieldNameMap: (state, action: PayloadAction<FieldNameMap>) => {
            state.fieldNameMap = action.payload;
        },
        setReverseTableNameMap: (state, action: PayloadAction<ReverseTableNameMap>) => {
            state.reverseTableNameMap = action.payload;
        },
        setReverseFieldNameMap: (state, action: PayloadAction<ReverseFieldNameMap>) => {
            state.reverseFieldNameMap = action.payload;
        },
        initializeAllMaps: (state, action: PayloadAction<UnifiedSchemaCache>) => {
            state.automationSchema = action.payload.schema;
            state.tableNameMap = action.payload.tableNameMap;
            state.fieldNameMap = action.payload.fieldNameMap;
            state.reverseTableNameMap = action.payload.reverseTableNameMap;
            state.reverseFieldNameMap = action.payload.reverseFieldNameMap;
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

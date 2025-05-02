import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    createFieldComponent,
    updateFieldComponent,
    deleteFieldComponent,
    getAllFieldComponents,
    getFieldComponentById,
    setFieldComponentPublic,
} from "../service/fieldComponentService";
import { FieldBuilder } from "../types";

export const createFieldThunk = createAsyncThunk<FieldBuilder, FieldBuilder>(
    "fieldBuilder/createField",
    async (field, { rejectWithValue }) => {
        try {
            const savedField = await createFieldComponent(field);
            return savedField;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateFieldThunk = createAsyncThunk<FieldBuilder, { id: string; changes: Partial<FieldBuilder> }>(
    "fieldBuilder/updateField",
    async ({ id, changes }, { rejectWithValue }) => {
        try {
            const updatedField = await updateFieldComponent(id, { 
                id, 
                label: changes.label || '', 
                component: changes.component || 'input', 
                componentProps: changes.componentProps || {}, 
                ...changes 
            });
            return updatedField;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteFieldThunk = createAsyncThunk<void, string>(
    "fieldBuilder/deleteField",
    async (id, { rejectWithValue }) => {
        try {
            await deleteFieldComponent(id);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFieldsThunk = createAsyncThunk<FieldBuilder[], void>(
    "fieldBuilder/fetchFields",
    async (_, { rejectWithValue }) => {
        try {
            return await getAllFieldComponents();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const setFieldPublicThunk = createAsyncThunk<void, { id: string; isPublic: boolean }>(
    "fieldBuilder/setFieldPublic",
    async ({ id, isPublic }, { rejectWithValue }) => {
        try {
            await setFieldComponentPublic(id, isPublic);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);
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
import { RootState } from "@/lib/redux";
import { v4 as uuidv4 } from "uuid";
import { selectFieldById } from "../selectors/fieldSelectors";
import { refreshFieldInGroup, refreshAllFieldsInGroup } from "../service/fieldContainerService";

/**
 * Unified thunk for saving a field - handles both create and update
 */
export const saveFieldThunk = createAsyncThunk<
    FieldBuilder,
    string,
    { state: RootState }
>("fieldBuilder/saveField", async (fieldId, { getState, rejectWithValue }) => {
    try {
        const field = selectFieldById(getState(), fieldId);
        
        if (!field) {
            throw new Error(`Field with ID ${fieldId} not found`);
        }
        
        let savedField;
        
        // Determine if this is a new field (isLocal) or an existing one
        if (field.isLocal) {
            // Create new field
            savedField = await createFieldComponent(field);
        } else {
            // Update existing field
            savedField = await updateFieldComponent(fieldId, field);
        }
        
        // Return consistently formatted result
        return {
            ...savedField,
            isDirty: false,
            isLocal: false,
        };
    } catch (error: any) {
        return rejectWithValue(error.message || "Failed to save field");
    }
});

/**
 * Integrated thunk to save a field and update its parent container
 */
export const saveFieldAndUpdateContainerThunk = createAsyncThunk(
    "fieldBuilder/saveAndUpdateContainer",
    async ({ fieldId, containerId }: { fieldId: string, containerId: string }, { dispatch, rejectWithValue }) => {
        try {
            // First save the field
            const saveResult = await dispatch(saveFieldThunk(fieldId)).unwrap();
            
            if (!saveResult) {
                throw new Error("Failed to save field");
            }
            
            // If successful, refresh the field in its container
            if (containerId) {
                // Refresh the specific field in the container
                await refreshFieldInGroup(containerId, saveResult.id);
            }
            
            return {
                field: saveResult,
                containerId
            };
        } catch (error: any) {
            return rejectWithValue(
                error.message || "Failed to save field and update container"
            );
        }
    }
);

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

export const fetchFieldByIdThunk = createAsyncThunk<FieldBuilder, string>(
    "fieldBuilder/fetchFieldById",
    async (id, { rejectWithValue }) => {
        try {
            const field = await getFieldComponentById(id);
            if (!field) {
                throw new Error(`Field with ID ${id} not found`);
            }
            return field as FieldBuilder;
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

/**
 * Thunk to save a field to a container
 */
export const saveFieldToContainerThunk = createAsyncThunk<
    void,
    { containerId: string; fieldId: string },
    { state: RootState }
>("fieldBuilder/saveFieldToContainer", async ({ containerId, fieldId }, { rejectWithValue }) => {
    try {
        // Refresh the field in the container
        const success = await refreshFieldInGroup(containerId, fieldId);
        
        if (!success) {
            throw new Error("Failed to add field to container");
        }
    } catch (error: any) {
        console.error("Error saving field to container:", error);
        return rejectWithValue(error.message || "Failed to save field to container");
    }
});
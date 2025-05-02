import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    createComponentGroup,
    updateComponentGroup,
    deleteComponentGroup,
    addFieldToGroup,
    removeFieldFromGroup,
    refreshAllFieldsInGroup,
    getAllComponentGroups,
    getComponentGroupById,
} from "../service/fieldGroupService";
import { ContainerBuilder, FieldDefinition } from "../types";

export const createContainerThunk = createAsyncThunk<ContainerBuilder, ContainerBuilder>(
    "containerBuilder/createContainer",
    async (container, { rejectWithValue }) => {
        try {
            const savedContainer = await createComponentGroup({
                id: container.id,
                label: container.label,
                shortLabel: container.shortLabel,
                description: container.description,
                hideDescription: container.hideDescription,
                helpText: container.helpText,
                fields: container.fields || [],
                isPublic: container.isPublic,
                authenticatedRead: container.authenticatedRead,
                publicRead: container.publicRead,
            });
            return savedContainer;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateContainerThunk = createAsyncThunk<ContainerBuilder, { id: string; changes: Partial<ContainerBuilder> }>(
    "containerBuilder/updateContainer",
    async ({ id, changes }, { rejectWithValue }) => {
        try {
            const updatedContainer = await updateComponentGroup(id, {
                id,
                label: changes.label || '',
                ...changes,
                fields: changes.fields || [],
            });
            return updatedContainer;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteContainerThunk = createAsyncThunk<void, string>(
    "containerBuilder/deleteContainer",
    async (id, { rejectWithValue }) => {
        try {
            await deleteComponentGroup(id);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addFieldThunk = createAsyncThunk<
    { containerId: string; field: FieldDefinition },
    { containerId: string; fieldId: string }
>(
    "containerBuilder/addField",
    async ({ containerId, fieldId }, { rejectWithValue }) => {
        try {
            await addFieldToGroup(containerId, fieldId);
            const container = await getComponentGroupById(containerId);
            if (!container) {
                throw new Error("Failed to fetch updated container");
            }
            const field = container.fields.find((f) => f.id === fieldId);
            if (!field) {
                throw new Error("Field not found in container");
            }
            return { containerId, field };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const removeFieldThunk = createAsyncThunk<void, { containerId: string; fieldId: string }>(
    "containerBuilder/removeField",
    async ({ containerId, fieldId }, { rejectWithValue }) => {
        try {
            await removeFieldFromGroup(containerId, fieldId);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const recompileContainerThunk = createAsyncThunk<ContainerBuilder, string>(
    "containerBuilder/recompileContainer",
    async (containerId, { rejectWithValue }) => {
        try {
            await refreshAllFieldsInGroup(containerId);
            const updatedContainer = await getComponentGroupById(containerId);
            if (!updatedContainer) {
                throw new Error("Failed to fetch recompiled container");
            }
            return updatedContainer;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchContainersThunk = createAsyncThunk<ContainerBuilder[], void>(
    "containerBuilder/fetchContainers",
    async (_, { rejectWithValue }) => {
        try {
            return await getAllComponentGroups();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    createComponentGroup,
    updateComponentGroup,
    deleteComponentGroup,
    addFieldToGroup,
    removeFieldFromGroup,
    refreshFieldInGroup,
    refreshAllFieldsInGroup,
    getAllComponentGroups,
    getComponentGroupById,
} from "../service/fieldContainerService";
import { ContainerBuilder } from "../types";
import { RootState } from "@/lib/redux";

import { v4 as uuidv4 } from "uuid";
import { selectContainerById } from "../selectors/containerSelectors";
import { addContainersToApplet, recompileContainerInAppletById, recompileAllContainersInApplet } from "../service/customAppletService";
import { FieldDefinition } from "@/features/applet/builder/builder.types";
import { saveFieldAndUpdateContainerThunk } from "./fieldBuilderThunks";
import { setActiveContainer } from "../slices/containerBuilderSlice";

/**
 * Unified thunk for saving a container - handles both create and update
 */
export const saveContainerThunk = createAsyncThunk<
    ContainerBuilder,
    string,
    { state: RootState }
>("containerBuilder/saveContainer", async (containerId, { getState, rejectWithValue }) => {
    try {
        const container = selectContainerById(getState(), containerId);
        
        if (!container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        
        let savedContainer;
        
        // Determine if this is a new container (isLocal) or an existing one
        if (container.isLocal) {
            // Create new container
            savedContainer = await createComponentGroup(container);
        } else {
            // Update existing container
            savedContainer = await updateComponentGroup(containerId, container);
        }
        
        // Return consistently formatted result
        return {
            ...savedContainer,
            fields: savedContainer.fields || [],
            isDirty: false,
            isLocal: false,
        };
    } catch (error: any) {
        return rejectWithValue(error.message || "Failed to save container");
    }
});

/**
 * Integrated thunk to save a container and update its parent applet
 */
export const saveContainerAndUpdateAppletThunk = createAsyncThunk(
    "containerBuilder/saveAndUpdateApplet",
    async ({ containerId, appletId }: { containerId: string, appletId: string }, { dispatch, rejectWithValue }) => {
        try {
            // First save the container
            const saveResult = await dispatch(saveContainerThunk(containerId)).unwrap();
            
            if (!saveResult) {
                throw new Error("Failed to save container");
            }
            
            // If successful, add/update the container in the applet and recompile
            if (appletId) {
                // Add the container to the applet if needed
                await addContainersToApplet(appletId, [saveResult.id]);
                
                // Recompile the specific container in the applet
                await recompileContainerInAppletById(appletId, saveResult.id);
            }
            
            return {
                container: saveResult,
                appletId
            };
        } catch (error: any) {
            return rejectWithValue(
                error.message || "Failed to save container and update applet"
            );
        }
    }
);

// Create a new container
export const createContainerThunk = createAsyncThunk<
    ContainerBuilder,
    Partial<ContainerBuilder>,
    { state: RootState }
>("containerBuilder/createContainer", async (containerData, { rejectWithValue }) => {
    try {
        // If no ID is provided, generate a unique ID using uuid v4
        const container = {
            ...containerData,
            id: containerData.id || uuidv4(),
            fields: containerData.fields || [],
        };
        
        const result = await createComponentGroup(container as ContainerBuilder);
        return {
            ...result,
            fields: result.fields || [],
            isDirty: false,
            isLocal: false,
        };
    } catch (error: any) {
        console.error("Error creating container:", error);
        return rejectWithValue(error.message || "Failed to create container");
    }
});

// Update an existing container
export const updateContainerThunk = createAsyncThunk<
    ContainerBuilder,
    { id: string; changes: Partial<ContainerBuilder> },
    { state: RootState }
>("containerBuilder/updateContainer", async ({ id, changes }, { getState, rejectWithValue }) => {
    try {
        // Get the current container from state
        const currentContainer = selectContainerById(getState(), id);
        
        if (!currentContainer) {
            throw new Error(`Container with ID ${id} not found`);
        }
        
        // Merge changes with current container data
        const updatedContainer = {
            ...currentContainer,
            ...changes,
        };
        
        const result = await updateComponentGroup(id, updatedContainer);
        return {
            ...result,
            fields: result.fields || [],
            isDirty: false,
            isLocal: false,
        };
    } catch (error: any) {
        console.error("Error updating container:", error);
        return rejectWithValue(error.message || "Failed to update container");
    }
});

// Delete a container
export const deleteContainerThunk = createAsyncThunk<
    void,
    string,
    { state: RootState }
>("containerBuilder/deleteContainer", async (containerId, { rejectWithValue }) => {
    try {
        await deleteComponentGroup(containerId);
    } catch (error: any) {
        console.error("Error deleting container:", error);
        return rejectWithValue(error.message || "Failed to delete container");
    }
});

// Add a field to a container
export const addFieldThunk = createAsyncThunk<
    { containerId: string; field: FieldDefinition },
    { containerId: string; field: FieldDefinition },
    { state: RootState }
>("containerBuilder/addField", async ({ containerId, field }, { getState, rejectWithValue }) => {
    try {
        // Add field ID if not provided
        const fieldWithId = {
            ...field,
            id: field.id || uuidv4(),
        };
        
        // Add the field to the container
        await addFieldToGroup(containerId, fieldWithId.id);
        
        // Refresh the field in the group to ensure it's properly added
        await refreshFieldInGroup(containerId, fieldWithId.id);
        
        return { containerId, field: fieldWithId };
    } catch (error: any) {
        console.error("Error adding field to container:", error);
        return rejectWithValue(error.message || "Failed to add field to container");
    }
});

// Remove a field from a container
export const removeFieldThunk = createAsyncThunk<
    void,
    { containerId: string; fieldId: string },
    { state: RootState }
>("containerBuilder/removeField", async ({ containerId, fieldId }, { rejectWithValue }) => {
    try {
        await removeFieldFromGroup(containerId, fieldId);
    } catch (error: any) {
        console.error("Error removing field from container:", error);
        return rejectWithValue(error.message || "Failed to remove field from container");
    }
});

// Update a field within a container
export const updateFieldThunk = createAsyncThunk<
    { containerId: string; fieldId: string; updatedField: FieldDefinition },
    { containerId: string; fieldId: string; changes: Partial<FieldDefinition> },
    { state: RootState }
>("containerBuilder/updateField", async ({ containerId, fieldId, changes }, { getState, rejectWithValue }) => {
    try {
        // Get the current container
        const container = selectContainerById(getState(), containerId);
        
        if (!container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        
        // Find the field to update
        const existingField = container.fields.find(f => f.id === fieldId);
        
        if (!existingField) {
            throw new Error(`Field with ID ${fieldId} not found in container ${containerId}`);
        }
        
        // Create the updated field
        const updatedField = {
            ...existingField,
            ...changes,
        };
        
        // This will need to leverage your existing systems
        // For now we'll just refresh the field to ensure consistency
        await refreshFieldInGroup(containerId, fieldId);
        
        return { containerId, fieldId, updatedField };
    } catch (error: any) {
        console.error("Error updating field:", error);
        return rejectWithValue(error.message || "Failed to update field");
    }
});

// Recompile a container (refresh all its data from source)
export const recompileContainerThunk = createAsyncThunk<
    ContainerBuilder,
    string,
    { state: RootState }
>("containerBuilder/recompileContainer", async (containerId, { rejectWithValue }) => {
    try {
        // Refresh all fields in the group
        await refreshAllFieldsInGroup(containerId);
        
        // Get the updated container
        const result = await getComponentGroupById(containerId);
        
        if (!result) {
            throw new Error("Failed to fetch recompiled container");
        }
        
        return result;
    } catch (error: any) {
        console.error("Error recompiling container:", error);
        return rejectWithValue(error.message || "Failed to recompile container");
    }
});

// Fetch all containers
export const fetchContainersThunk = createAsyncThunk<
    ContainerBuilder[],
    void,
    { state: RootState }
>("containerBuilder/fetchContainers", async (_, { rejectWithValue }) => {
    try {
        const containers = await getAllComponentGroups();
        return containers;
    } catch (error: any) {
        console.error("Error fetching containers:", error);
        return rejectWithValue(error.message || "Failed to fetch containers");
    }
});

// Fetch a single container by ID
export const fetchContainerByIdThunk = createAsyncThunk<
    ContainerBuilder,
    string,
    { state: RootState }
>("containerBuilder/fetchContainerById", async (containerId, { rejectWithValue }) => {
    try {
        const container = await getComponentGroupById(containerId);
        
        if (!container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        
        return container;
    } catch (error: any) {
        console.error("Error fetching container:", error);
        return rejectWithValue(error.message || "Failed to fetch container");
    }
});

// Add a container to an applet
export const saveContainerToAppletThunk = createAsyncThunk<
    void,
    { appletId: string; containerId: string },
    { state: RootState }
>("containerBuilder/saveContainerToApplet", async ({ appletId, containerId }, { getState, rejectWithValue }) => {
    try {
        // Use the proper function from customAppletService
        const success = await addContainersToApplet(appletId, [containerId]);
        
        if (!success) {
            throw new Error("Failed to add container to applet");
        }
        
        // Recompile the container in the applet to ensure it's properly added
        await recompileContainerInAppletById(appletId, containerId);
        
    } catch (error: any) {
        console.error("Error saving container to applet:", error);
        return rejectWithValue(error.message || "Failed to save container to applet");
    }
});

// Move a field up in the container order
export const moveFieldUpThunk = createAsyncThunk<
    { containerId: string; newFieldsOrder: FieldDefinition[] },
    { containerId: string; fieldId: string },
    { state: RootState }
>("containerBuilder/moveFieldUp", async ({ containerId, fieldId }, { getState, rejectWithValue }) => {
    try {
        // Get the current container
        const container = selectContainerById(getState(), containerId);
        
        if (!container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        
        // Find the index of the field to move
        const fieldIndex = container.fields.findIndex(f => f.id === fieldId);
        
        if (fieldIndex === -1) {
            throw new Error(`Field with ID ${fieldId} not found in container ${containerId}`);
        }
        
        // Can't move up if already at the top
        if (fieldIndex === 0) {
            return { containerId, newFieldsOrder: container.fields };
        }
        
        // Create a new array with the field moved up
        const newFieldsOrder = [...container.fields];
        const temp = newFieldsOrder[fieldIndex];
        newFieldsOrder[fieldIndex] = newFieldsOrder[fieldIndex - 1];
        newFieldsOrder[fieldIndex - 1] = temp;
        
        return { containerId, newFieldsOrder };
    } catch (error: any) {
        console.error("Error moving field up:", error);
        return rejectWithValue(error.message || "Failed to move field up");
    }
});

// Move a field down in the container order
export const moveFieldDownThunk = createAsyncThunk<
    { containerId: string; newFieldsOrder: FieldDefinition[] },
    { containerId: string; fieldId: string },
    { state: RootState }
>("containerBuilder/moveFieldDown", async ({ containerId, fieldId }, { getState, rejectWithValue }) => {
    try {
        // Get the current container
        const container = selectContainerById(getState(), containerId);
        
        if (!container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        
        // Find the index of the field to move
        const fieldIndex = container.fields.findIndex(f => f.id === fieldId);
        
        if (fieldIndex === -1) {
            throw new Error(`Field with ID ${fieldId} not found in container ${containerId}`);
        }
        
        // Can't move down if already at the bottom
        if (fieldIndex === container.fields.length - 1) {
            return { containerId, newFieldsOrder: container.fields };
        }
        
        // Create a new array with the field moved down
        const newFieldsOrder = [...container.fields];
        const temp = newFieldsOrder[fieldIndex];
        newFieldsOrder[fieldIndex] = newFieldsOrder[fieldIndex + 1];
        newFieldsOrder[fieldIndex + 1] = temp;
        
        return { containerId, newFieldsOrder };
    } catch (error: any) {
        console.error("Error moving field down:", error);
        return rejectWithValue(error.message || "Failed to move field down");
    }
});

// Define action creator for fetchContainerByIdSuccess
export const fetchContainerByIdSuccess = (container: ContainerBuilder) => ({
    type: "containerBuilder/fetchContainerByIdSuccess" as const,
    payload: container
});

// Use this type for proper typing in the slice
export type FetchContainerByIdSuccessAction = ReturnType<typeof fetchContainerByIdSuccess>;

/**
 * Thunk that sets a container as active, fetching it first if not in state
 */
export const setActiveContainerWithFetchThunk = createAsyncThunk<
    void,
    string,
    { state: RootState }
>(
    "containerBuilder/setActiveContainerWithFetch",
    async (containerId, { getState, dispatch, rejectWithValue }) => {
        try {
            // Check if container already exists in state
            const container = selectContainerById(getState() as RootState, containerId);
            
            if (container) {
                // If it exists, just set it as active
                dispatch(setActiveContainer(containerId));
            } else {
                // Otherwise, fetch it first
                try {
                    const fetchedContainer = await getComponentGroupById(containerId);
                    
                    if (fetchedContainer) {
                        // Add the fetched container to state with required type properties
                        dispatch(fetchContainerByIdSuccess({
                            ...fetchedContainer,
                            isDirty: false,
                            isLocal: false
                        }));
                        
                        // Set it as active
                        dispatch(setActiveContainer(containerId));
                    } else {
                        console.error(`Container with ID ${containerId} not found on server`);
                        dispatch(setActiveContainer(null));
                    }
                } catch (error: any) {
                    console.error(`Failed to fetch container with ID ${containerId}: ${error.message}`);
                    dispatch(setActiveContainer(null));
                    return rejectWithValue(error.message || "Failed to fetch container");
                }
            }
        } catch (error: any) {
            console.error(`Error in setActiveContainerWithFetchThunk: ${error.message}`);
            return rejectWithValue(error.message || "Failed to set active container");
        }
    }
);
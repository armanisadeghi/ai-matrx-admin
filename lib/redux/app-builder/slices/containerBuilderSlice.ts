import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createContainerThunk,
    updateContainerThunk,
    deleteContainerThunk,
    addFieldThunk,
    removeFieldThunk,
    recompileContainerThunk,
    fetchContainersThunk,
    fetchContainerByIdThunk,
    updateFieldThunk,
    saveContainerToAppletThunk,
    moveFieldUpThunk,
    moveFieldDownThunk,
} from "../thunks/containerBuilderThunks";
import { ContainerBuilder, FieldDefinition } from "../types";

// Default container configuration
export const DEFAULT_CONTAINER: Partial<ContainerBuilder> = {
    label: "",
    shortLabel: "",
    description: "",
    hideDescription: false,
    helpText: "",
    fields: [],
    isPublic: true,
    authenticatedRead: true,
    publicRead: false,
    isDirty: true,
    isLocal: true,
};

interface ContainersState {
    containers: Record<string, ContainerBuilder>;
    isLoading: boolean;
    error: string | null;
    activeContainerId: string | null;
    newContainerId: string | null;
}

const initialState: ContainersState = {
    containers: {},
    isLoading: false,
    error: null,
    activeContainerId: null,
    newContainerId: null,
};

export const containerBuilderSlice = createSlice({
    name: "containerBuilder",
    initialState,
    reducers: {
        // Initialize a new container
        startNewContainer: (state, action: PayloadAction<Partial<ContainerBuilder> | undefined>) => {
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            state.containers[tempId] = {
                ...DEFAULT_CONTAINER,
                id: tempId,
                ...action.payload,
            } as ContainerBuilder;
            state.newContainerId = tempId;
            state.activeContainerId = tempId;
        },
        // Cancel creation of a local container
        cancelNewContainer: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (state.containers[id] && state.containers[id].isLocal) {
                delete state.containers[id];
                if (state.newContainerId === id) {
                    state.newContainerId = null;
                }
                if (state.activeContainerId === id) {
                    state.activeContainerId = null;
                }
            }
        },
        // Set the active container for editing
        setActiveContainer: (state, action: PayloadAction<string | null>) => {
            state.activeContainerId = action.payload;
        },
        // Specific actions for ContainerBuilder properties
        setLabel: (state, action: PayloadAction<{ id: string; label: string }>) => {
            const { id, label } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], label, isDirty: true };
            }
        },
        setShortLabel: (state, action: PayloadAction<{ id: string; shortLabel?: string }>) => {
            const { id, shortLabel } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], shortLabel, isDirty: true };
            }
        },
        setDescription: (state, action: PayloadAction<{ id: string; description?: string }>) => {
            const { id, description } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], description, isDirty: true };
            }
        },
        setHideDescription: (state, action: PayloadAction<{ id: string; hideDescription?: boolean }>) => {
            const { id, hideDescription } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], hideDescription, isDirty: true };
            }
        },
        setHelpText: (state, action: PayloadAction<{ id: string; helpText?: string }>) => {
            const { id, helpText } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], helpText, isDirty: true };
            }
        },
        setIsPublic: (state, action: PayloadAction<{ id: string; isPublic?: boolean }>) => {
            const { id, isPublic } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], isPublic, isDirty: true };
            }
        },
        setAuthenticatedRead: (state, action: PayloadAction<{ id: string; authenticatedRead?: boolean }>) => {
            const { id, authenticatedRead } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], authenticatedRead, isDirty: true };
            }
        },
        setPublicRead: (state, action: PayloadAction<{ id: string; publicRead?: boolean }>) => {
            const { id, publicRead } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], publicRead, isDirty: true };
            }
        },
        setIsDirty: (state, action: PayloadAction<{ id: string; isDirty?: boolean }>) => {
            const { id, isDirty } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], isDirty };
            }
        },
        setIsLocal: (state, action: PayloadAction<{ id: string; isLocal?: boolean }>) => {
            const { id, isLocal } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], isLocal };
            }
        },
        // Field management actions
        addField: (state, action: PayloadAction<{ containerId: string; field: FieldDefinition }>) => {
            const { containerId, field } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = [...state.containers[containerId].fields, field];
                state.containers[containerId].isDirty = true;
            }
        },
        updateField: (state, action: PayloadAction<{ containerId: string; fieldId: string; changes: Partial<FieldDefinition> }>) => {
            const { containerId, fieldId, changes } = action.payload;
            if (state.containers[containerId]) {
                const fieldIndex = state.containers[containerId].fields.findIndex(f => f.id === fieldId);
                if (fieldIndex >= 0) {
                    state.containers[containerId].fields[fieldIndex] = {
                        ...state.containers[containerId].fields[fieldIndex],
                        ...changes,
                    };
                    state.containers[containerId].isDirty = true;
                }
            }
        },
        removeField: (state, action: PayloadAction<{ containerId: string; fieldId: string }>) => {
            const { containerId, fieldId } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = state.containers[containerId].fields.filter(f => f.id !== fieldId);
                state.containers[containerId].isDirty = true;
            }
        },
        recompileField: (state, action: PayloadAction<{ containerId: string; fieldId: string; updatedField: FieldDefinition }>) => {
            const { containerId, fieldId, updatedField } = action.payload;
            if (state.containers[containerId]) {
                const fieldIndex = state.containers[containerId].fields.findIndex(f => f.id === fieldId);
                if (fieldIndex >= 0) {
                    state.containers[containerId].fields[fieldIndex] = updatedField;
                    state.containers[containerId].isDirty = true;
                }
            }
        },
        recompileAllFields: (state, action: PayloadAction<{ containerId: string; updatedFields: FieldDefinition[] }>) => {
            const { containerId, updatedFields } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = updatedFields;
                state.containers[containerId].isDirty = true;
            }
        },
        // Other actions
        deleteContainer: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            delete state.containers[id];
            if (state.activeContainerId === id) {
                state.activeContainerId = null;
            }
            if (state.newContainerId === id) {
                state.newContainerId = null;
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Create Container
        builder.addCase(createContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(createContainerThunk.fulfilled, (state, action) => {
            state.containers[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false };
            if (state.newContainerId) {
                delete state.containers[state.newContainerId];
                state.newContainerId = null;
            }
            state.activeContainerId = action.payload.id;
            state.isLoading = false;
        });
        builder.addCase(createContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to create container";
        });

        // Update Container
        builder.addCase(updateContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(updateContainerThunk.fulfilled, (state, action) => {
            state.containers[action.payload.id] = { ...action.payload, isDirty: false };
            state.isLoading = false;
        });
        builder.addCase(updateContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to update container";
        });

        // Delete Container
        builder.addCase(deleteContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(deleteContainerThunk.fulfilled, (state, action) => {
            delete state.containers[action.meta.arg];
            if (state.activeContainerId === action.meta.arg) {
                state.activeContainerId = null;
            }
            state.isLoading = false;
        });
        builder.addCase(deleteContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to delete container";
        });

        // Add Field
        builder.addCase(addFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(addFieldThunk.fulfilled, (state, action) => {
            const { containerId, field } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = [...state.containers[containerId].fields, field];
                state.containers[containerId].isDirty = true;
            }
            state.isLoading = false;
        });
        builder.addCase(addFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to add field";
        });

        // Remove Field
        builder.addCase(removeFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(removeFieldThunk.fulfilled, (state, action) => {
            const { containerId, fieldId } = action.meta.arg;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = state.containers[containerId].fields.filter(f => f.id !== fieldId);
                state.containers[containerId].isDirty = true;
            }
            state.isLoading = false;
        });
        builder.addCase(removeFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to remove field";
        });

        // Recompile Container
        builder.addCase(recompileContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(recompileContainerThunk.fulfilled, (state, action) => {
            state.containers[action.payload.id] = { ...action.payload, isDirty: false };
            state.isLoading = false;
        });
        builder.addCase(recompileContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to recompile container";
        });

        // Fetch Containers
        builder.addCase(fetchContainersThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchContainersThunk.fulfilled, (state, action) => {
            state.containers = action.payload.reduce((acc, container) => {
                acc[container.id] = { ...container, isDirty: false, isLocal: false };
                return acc;
            }, {} as Record<string, ContainerBuilder>);
            state.isLoading = false;
        });
        builder.addCase(fetchContainersThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch containers";
        });

        // Fetch Container By ID
        builder.addCase(fetchContainerByIdThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchContainerByIdThunk.fulfilled, (state, action) => {
            state.containers[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false };
            state.isLoading = false;
        });
        builder.addCase(fetchContainerByIdThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch container";
        });

        // Update Field
        builder.addCase(updateFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(updateFieldThunk.fulfilled, (state, action) => {
            const { containerId, fieldId, updatedField } = action.payload;
            if (state.containers[containerId]) {
                const fieldIndex = state.containers[containerId].fields.findIndex(f => f.id === fieldId);
                if (fieldIndex >= 0) {
                    state.containers[containerId].fields[fieldIndex] = updatedField;
                    state.containers[containerId].isDirty = true;
                }
            }
            state.isLoading = false;
        });
        builder.addCase(updateFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to update field";
        });

        // Save Container To Applet
        builder.addCase(saveContainerToAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(saveContainerToAppletThunk.fulfilled, (state) => {
            state.isLoading = false;
        });
        builder.addCase(saveContainerToAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to save container to applet";
        });

        // Move Field Up
        builder.addCase(moveFieldUpThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(moveFieldUpThunk.fulfilled, (state, action) => {
            const { containerId, newFieldsOrder } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = newFieldsOrder;
                state.containers[containerId].isDirty = true;
            }
            state.isLoading = false;
        });
        builder.addCase(moveFieldUpThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to move field up";
        });

        // Move Field Down
        builder.addCase(moveFieldDownThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(moveFieldDownThunk.fulfilled, (state, action) => {
            const { containerId, newFieldsOrder } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = newFieldsOrder;
                state.containers[containerId].isDirty = true;
            }
            state.isLoading = false;
        });
        builder.addCase(moveFieldDownThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to move field down";
        });
    },
});

export const {
    startNewContainer,
    cancelNewContainer,
    setActiveContainer,
    setLabel,
    setShortLabel,
    setDescription,
    setHideDescription,
    setHelpText,
    setIsPublic,
    setAuthenticatedRead,
    setPublicRead,
    setIsDirty,
    setIsLocal,
    addField,
    updateField,
    removeField,
    recompileField,
    recompileAllFields,
    deleteContainer,
    setLoading,
    setError,
} = containerBuilderSlice.actions;

export default containerBuilderSlice.reducer;
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createContainerThunk,
    updateContainerThunk,
    deleteContainerThunk,
    addFieldThunk,
    removeFieldThunk,
    recompileContainerThunk,
    fetchContainersThunk,
} from "../thunks/containerBuilderThunks";
import { ContainerBuilder, FieldDefinition } from "../types";
import { RootState } from "@react-three/fiber";

interface ContainersState {
    containers: Record<string, ContainerBuilder>;
    isLoading: boolean;
    error: string | null;
}

const initialState: ContainersState = {
    containers: {},
    isLoading: false,
    error: null,
};

export const containerBuilderSlice = createSlice({
    name: "containerBuilder",
    initialState,
    reducers: {
        setContainer: (state, action: PayloadAction<ContainerBuilder>) => {
            state.containers[action.payload.id] = action.payload;
        },
        updateContainer: (state, action: PayloadAction<{ id: string; changes: Partial<ContainerBuilder> }>) => {
            const { id, changes } = action.payload;
            if (state.containers[id]) {
                state.containers[id] = { ...state.containers[id], ...changes };
            }
        },
        deleteContainer: (state, action: PayloadAction<string>) => {
            delete state.containers[action.payload];
        },
        addField: (state, action: PayloadAction<{ containerId: string; field: FieldDefinition }>) => {
            const { containerId, field } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields.push(field);
            }
        },
        removeField: (state, action: PayloadAction<{ containerId: string; fieldId: string }>) => {
            const { containerId, fieldId } = action.payload;
            if (state.containers[containerId]) {
                state.containers[containerId].fields = state.containers[containerId].fields.filter(
                    (f) => f.id !== fieldId
                );
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
            state.containers[action.payload.id] = action.payload;
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
            state.containers[action.payload.id] = action.payload;
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
                state.containers[containerId].fields.push(field);
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
                state.containers[containerId].fields = state.containers[containerId].fields.filter(
                    (f) => f.id !== fieldId
                );
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
            state.containers[action.payload.id] = action.payload;
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
                acc[container.id] = container;
                return acc;
            }, {} as Record<string, ContainerBuilder>);
            state.isLoading = false;
        });
        builder.addCase(fetchContainersThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch containers";
        });
    },
});

export const { setContainer, updateContainer, deleteContainer, addField, removeField, setLoading, setError } =
    containerBuilderSlice.actions;

export default containerBuilderSlice.reducer;


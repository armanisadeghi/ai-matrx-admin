import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ContainerBuilder } from "../types";
import { createAppletThunk, updateAppletThunk, deleteAppletThunk, addContainerThunk, removeContainerThunk, recompileAppletThunk, fetchAppletsThunk } from "../thunks/appletBuilderThunks";
import { RootState } from "@/lib/redux";

interface AppletBuilder {
    id: string;
    name: string;
    description?: string;
    slug: string;
    appletIcon?: string;
    appletSubmitText?: string;
    creator?: string;
    primaryColor?: string;
    accentColor?: string;
    layoutType?: string;
    containers: ContainerBuilder[];
    dataSourceConfig?: any;
    resultComponentConfig?: any;
    nextStepConfig?: any;
    compiledRecipeId?: string;
    subcategoryId?: string;
    imageUrl?: string;
    appId?: string;
}

interface AppletsState {
    applets: Record<string, AppletBuilder>;
    isLoading: boolean;
    error: string | null;
}

const initialState: AppletsState = {
    applets: {},
    isLoading: false,
    error: null,
};

export const appletBuilderSlice = createSlice({
    name: "appletBuilder",
    initialState,
    reducers: {
        setApplet: (state, action: PayloadAction<AppletBuilder>) => {
            state.applets[action.payload.id] = action.payload;
        },
        updateApplet: (state, action: PayloadAction<{ id: string; changes: Partial<AppletBuilder> }>) => {
            const { id, changes } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], ...changes };
            }
        },
        deleteApplet: (state, action: PayloadAction<string>) => {
            delete state.applets[action.payload];
        },
        addContainer: (state, action: PayloadAction<{ appletId: string; container: ContainerBuilder }>) => {
            const { appletId, container } = action.payload;
            if (state.applets[appletId]) {
                state.applets[appletId].containers.push(container);
            }
        },
        removeContainer: (state, action: PayloadAction<{ appletId: string; containerId: string }>) => {
            const { appletId, containerId } = action.payload;
            if (state.applets[appletId]) {
                state.applets[appletId].containers = state.applets[appletId].containers.filter(
                    (c) => c.id !== containerId
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
        // Create Applet
        builder.addCase(createAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(createAppletThunk.fulfilled, (state, action) => {
            state.applets[action.payload.id] = action.payload;
            state.isLoading = false;
        });
        builder.addCase(createAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to create applet";
        });

        // Update Applet
        builder.addCase(updateAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(updateAppletThunk.fulfilled, (state, action) => {
            state.applets[action.payload.id] = action.payload;
            state.isLoading = false;
        });
        builder.addCase(updateAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to update applet";
        });

        // Delete Applet
        builder.addCase(deleteAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(deleteAppletThunk.fulfilled, (state, action) => {
            delete state.applets[action.meta.arg];
            state.isLoading = false;
        });
        builder.addCase(deleteAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to delete applet";
        });

        // Add Container
        builder.addCase(addContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(addContainerThunk.fulfilled, (state, action) => {
            const { appletId, container } = action.payload;
            if (state.applets[appletId]) {
                state.applets[appletId].containers.push(container);
            }
            state.isLoading = false;
        });
        builder.addCase(addContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to add container";
        });

        // Remove Container
        builder.addCase(removeContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(removeContainerThunk.fulfilled, (state, action) => {
            const { appletId, containerId } = action.meta.arg;
            if (state.applets[appletId]) {
                state.applets[appletId].containers = state.applets[appletId].containers.filter(
                    (c) => c.id !== containerId
                );
            }
            state.isLoading = false;
        });
        builder.addCase(removeContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to remove container";
        });

        // Recompile Applet
        builder.addCase(recompileAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(recompileAppletThunk.fulfilled, (state, action) => {
            state.applets[action.payload.id] = action.payload;
            state.isLoading = false;
        });
        builder.addCase(recompileAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to recompile applet";
        });

        // Fetch Applets
        builder.addCase(fetchAppletsThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchAppletsThunk.fulfilled, (state, action) => {
            state.applets = action.payload.reduce((acc, applet) => {
                acc[applet.id] = applet;
                return acc;
            }, {} as Record<string, AppletBuilder>);
            state.isLoading = false;
        });
        builder.addCase(fetchAppletsThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch applets";
        });
    },
});

export const { setApplet, updateApplet, deleteApplet, addContainer, removeContainer, setLoading, setError } =
    appletBuilderSlice.actions;

export default appletBuilderSlice.reducer;

// Selectors
export const selectAppletById = (state: RootState, id: string) => state.appletBuilder.applets[id] || null;
export const selectAllApplets = (state: RootState) => Object.values(state.appletBuilder.applets);
export const selectAvailableApplets = (state: RootState, appId?: string) =>
    Object.values(state.appletBuilder.applets).filter((applet) => !appId || applet.appId === appId || !applet.appId);
export const selectContainersForApplet = (state: RootState, appletId: string) =>
    state.appletBuilder.applets[appletId]?.containers || [];
export const selectAppletLoading = (state: RootState) => state.appletBuilder.isLoading;
export const selectAppletError = (state: RootState) => state.appletBuilder.error;
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CustomActionButton } from "@/features/applet/builder/builder.types";
import { createAppThunk, updateAppThunk, deleteAppThunk, addAppletThunk, removeAppletThunk } from "../thunks/appBuilderThunks";
import { RootState } from "@/lib/redux";

export interface AppBuilder {
    id: string;
    name: string;
    description: string;
    slug: string;
    mainAppIcon?: string;
    mainAppSubmitIcon?: string;
    creator?: string;
    primaryColor?: string;
    accentColor?: string;
    layoutType?: string;
    extraButtons?: CustomActionButton[];
    imageUrl?: string;
    appletIds: string[];
}

export interface AppsState {
    apps: Record<string, AppBuilder>;
    isLoading: boolean;
    error: string | null;
}

const initialState: AppsState = {
    apps: {},
    isLoading: false,
    error: null,
};

export const appBuilderSlice = createSlice({
    name: "appBuilder",
    initialState,
    reducers: {
        setApp: (state, action: PayloadAction<AppBuilder>) => {
            state.apps[action.payload.id] = action.payload;
        },
        updateApp: (state, action: PayloadAction<{ id: string; changes: Partial<AppBuilder> }>) => {
            const { id, changes } = action.payload;
            if (state.apps[id]) {
                state.apps[id] = { ...state.apps[id], ...changes };
            }
        },
        deleteApp: (state, action: PayloadAction<string>) => {
            delete state.apps[action.payload];
        },
        addApplet: (state, action: PayloadAction<{ appId: string; appletId: string }>) => {
            const { appId, appletId } = action.payload;
            if (state.apps[appId] && !state.apps[appId].appletIds.includes(appletId)) {
                state.apps[appId].appletIds.push(appletId);
            }
        },
        removeApplet: (state, action: PayloadAction<{ appId: string; appletId: string }>) => {
            const { appId, appletId } = action.payload;
            if (state.apps[appId]) {
                state.apps[appId].appletIds = state.apps[appId].appletIds.filter((id) => id !== appletId);
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
        // Create App
        builder.addCase(createAppThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(createAppThunk.fulfilled, (state, action) => {
            state.apps[action.payload.id] = action.payload;
            state.isLoading = false;
        });
        builder.addCase(createAppThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to create app";
        });

        // Update App
        builder.addCase(updateAppThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(updateAppThunk.fulfilled, (state, action) => {
            state.apps[action.payload.id] = action.payload;
            state.isLoading = false;
        });
        builder.addCase(updateAppThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to update app";
        });

        // Delete App
        builder.addCase(deleteAppThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(deleteAppThunk.fulfilled, (state, action) => {
            delete state.apps[action.meta.arg];
            state.isLoading = false;
        });
        builder.addCase(deleteAppThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to delete app";
        });

        // Add Applet
        builder.addCase(addAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(addAppletThunk.fulfilled, (state, action) => {
            const { appId, appletId } = action.meta.arg;
            if (state.apps[appId] && !state.apps[appId].appletIds.includes(appletId)) {
                state.apps[appId].appletIds.push(appletId);
            }
            state.isLoading = false;
        });
        builder.addCase(addAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to add applet";
        });

        // Remove Applet
        builder.addCase(removeAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(removeAppletThunk.fulfilled, (state, action) => {
            const { appId, appletId } = action.meta.arg;
            if (state.apps[appId]) {
                state.apps[appId].appletIds = state.apps[appId].appletIds.filter((id) => id !== appletId);
            }
            state.isLoading = false;
        });
        builder.addCase(removeAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to remove applet";
        });
    },
});

export const { setApp, updateApp, deleteApp, addApplet, removeApplet, setLoading, setError } = appBuilderSlice.actions;

export default appBuilderSlice.reducer;

// Selectors
export const selectAppById = (state: RootState, id: string) => state.appBuilder.apps[id] || null;
export const selectAllApps = (state: RootState) => Object.values(state.appBuilder.apps);
export const selectAppletsForApp = (state: RootState, appId: string) =>
    state.appBuilder.apps[appId]?.appletIds || [];
export const selectAppLoading = (state: RootState) => state.appBuilder.isLoading;
export const selectAppError = (state: RootState) => state.appBuilder.error;
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createAppThunk, updateAppThunk, deleteAppThunk, addAppletThunk, removeAppletThunk, fetchAppsThunk, checkAppSlugUniqueness } from "../thunks/appBuilderThunks";
import { AppBuilder } from "../types";

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
            state.apps[action.payload.id] = { ...action.payload, isDirty: action.payload.isDirty || true, isLocal: action.payload.isLocal || true, slugStatus: action.payload.slugStatus || 'unchecked' };
        },
        updateApp: (state, action: PayloadAction<{ id: string; changes: Partial<AppBuilder> }>) => {
            const { id, changes } = action.payload;
            if (state.apps[id]) {
                const isSlugChanged = changes.slug && changes.slug !== state.apps[id].slug;
                state.apps[id] = { ...state.apps[id], ...changes, isDirty: true, slugStatus: isSlugChanged ? 'unchecked' : state.apps[id].slugStatus };
            }
        },
        deleteApp: (state, action: PayloadAction<string>) => {
            delete state.apps[action.payload];
        },
        addApplet: (state, action: PayloadAction<{ appId: string; appletId: string }>) => {
            const { appId, appletId } = action.payload;
            if (state.apps[appId] && !state.apps[appId].appletIds.includes(appletId)) {
                state.apps[appId].appletIds.push(appletId);
                state.apps[appId].isDirty = true;
            }
        },
        removeApplet: (state, action: PayloadAction<{ appId: string; appletId: string }>) => {
            const { appId, appletId } = action.payload;
            if (state.apps[appId]) {
                state.apps[appId].appletIds = state.apps[appId].appletIds.filter((id) => id !== appletId);
                state.apps[appId].isDirty = true;
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
            state.apps[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false, slugStatus: 'unique' };
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
            state.apps[action.payload.id] = { ...action.payload, isDirty: false, slugStatus: 'unique' };
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

        // Check Slug Uniqueness
        builder.addCase(checkAppSlugUniqueness.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(checkAppSlugUniqueness.fulfilled, (state, action) => {
            const { slug, appId } = action.meta.arg;
            if (appId && state.apps[appId]) {
                state.apps[appId].slugStatus = action.payload ? 'unique' : 'notUnique';
            } else {
                Object.values(state.apps).forEach(app => {
                    if (app.slug === slug) {
                        app.slugStatus = action.payload ? 'unique' : 'notUnique';
                    }
                });
            }
            state.isLoading = false;
        });
        builder.addCase(checkAppSlugUniqueness.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to check slug uniqueness";
        });

        // Fetch Apps
        builder.addCase(fetchAppsThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchAppsThunk.fulfilled, (state, action) => {
            
            // Create a new apps object based on the payload
            const newApps = action.payload.reduce((acc, app) => {
                acc[app.id] = {
                    ...app,
                    // Preserve existing state properties if the app already exists
                    ...(state.apps[app.id] ? {
                        isDirty: state.apps[app.id].isDirty,
                        isLocal: state.apps[app.id].isLocal,
                        slugStatus: state.apps[app.id].slugStatus
                    } : {
                        isDirty: false,
                        isLocal: false,
                        slugStatus: 'unchecked'
                    })
                };
                return acc;
            }, {} as Record<string, AppBuilder>);
            
            state.apps = newApps;
            state.isLoading = false;
        });
        builder.addCase(fetchAppsThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch apps";
        });
    },
});

export const { setApp, updateApp, deleteApp, addApplet, removeApplet, setLoading, setError } = appBuilderSlice.actions;

export default appBuilderSlice.reducer;
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createAppletThunk,
    updateAppletThunk,
    deleteAppletThunk,
    addContainerThunk,
    removeContainerThunk,
    recompileAppletThunk,
    fetchAppletsThunk,
    checkAppletSlugUniqueness,
} from "../thunks/appletBuilderThunks";
import { AppletBuilder, ContainerBuilder } from "../types";

// Default applet configuration
export const DEFAULT_APPLET: Partial<AppletBuilder> = {
    name: "",
    slug: "",
    containers: [],
    isPublic: false,
    authenticatedRead: true,
    publicRead: false,
    isDirty: true,
    isLocal: true,
    slugStatus: "unchecked",
};

interface AppletsState {
    applets: Record<string, AppletBuilder>;
    isLoading: boolean;
    error: string | null;
    activeAppletId: string | null;
    newAppletId: string | null;
}

const initialState: AppletsState = {
    applets: {},
    isLoading: false,
    error: null,
    activeAppletId: null,
    newAppletId: null,
};

export const appletBuilderSlice = createSlice({
    name: "appletBuilder",
    initialState,
    reducers: {
        // Initialize a new applet
        startNewApplet: (state, action: PayloadAction<Partial<AppletBuilder> | undefined>) => {
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            state.applets[tempId] = {
                ...DEFAULT_APPLET,
                id: tempId,
                ...action.payload,
            } as AppletBuilder;
            state.newAppletId = tempId;
            state.activeAppletId = tempId;
        },
        // Cancel creation of a local applet
        cancelNewApplet: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (state.applets[id] && state.applets[id].isLocal) {
                delete state.applets[id];
                if (state.newAppletId === id) {
                    state.newAppletId = null;
                }
                if (state.activeAppletId === id) {
                    state.activeAppletId = null;
                }
            }
        },
        // Set the active applet for editing
        setActiveApplet: (state, action: PayloadAction<string | null>) => {
            state.activeAppletId = action.payload;
        },
        // Specific actions for AppletBuilder properties
        setName: (state, action: PayloadAction<{ id: string; name: string }>) => {
            const { id, name } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], name, isDirty: true };
            }
        },
        setDescription: (state, action: PayloadAction<{ id: string; description?: string }>) => {
            const { id, description } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], description, isDirty: true };
            }
        },
        setSlug: (state, action: PayloadAction<{ id: string; slug: string }>) => {
            const { id, slug } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], slug, isDirty: true, slugStatus: "unchecked" };
            }
        },
        setAppletIcon: (state, action: PayloadAction<{ id: string; appletIcon?: string }>) => {
            const { id, appletIcon } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], appletIcon, isDirty: true };
            }
        },
        setAppletSubmitText: (state, action: PayloadAction<{ id: string; appletSubmitText?: string }>) => {
            const { id, appletSubmitText } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], appletSubmitText, isDirty: true };
            }
        },
        setCreator: (state, action: PayloadAction<{ id: string; creator?: string }>) => {
            const { id, creator } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], creator, isDirty: true };
            }
        },
        setPrimaryColor: (state, action: PayloadAction<{ id: string; primaryColor?: string }>) => {
            const { id, primaryColor } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], primaryColor, isDirty: true };
            }
        },
        setAccentColor: (state, action: PayloadAction<{ id: string; accentColor?: string }>) => {
            const { id, accentColor } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], accentColor, isDirty: true };
            }
        },
        setLayoutType: (state, action: PayloadAction<{ id: string; layoutType?: string }>) => {
            const { id, layoutType } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], layoutType, isDirty: true };
            }
        },
        setDataSourceConfig: (state, action: PayloadAction<{ id: string; dataSourceConfig?: any }>) => {
            const { id, dataSourceConfig } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], dataSourceConfig, isDirty: true };
            }
        },
        setResultComponentConfig: (state, action: PayloadAction<{ id: string; resultComponentConfig?: any }>) => {
            const { id, resultComponentConfig } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], resultComponentConfig, isDirty: true };
            }
        },
        setNextStepConfig: (state, action: PayloadAction<{ id: string; nextStepConfig?: any }>) => {
            const { id, nextStepConfig } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], nextStepConfig, isDirty: true };
            }
        },
        setCompiledRecipeId: (state, action: PayloadAction<{ id: string; compiledRecipeId?: string }>) => {
            const { id, compiledRecipeId } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], compiledRecipeId, isDirty: true };
            }
        },
        setSubcategoryId: (state, action: PayloadAction<{ id: string; subcategoryId?: string }>) => {
            const { id, subcategoryId } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], subcategoryId, isDirty: true };
            }
        },
        setImageUrl: (state, action: PayloadAction<{ id: string; imageUrl?: string }>) => {
            const { id, imageUrl } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], imageUrl, isDirty: true };
            }
        },
        setAppId: (state, action: PayloadAction<{ id: string; appId?: string }>) => {
            const { id, appId } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], appId, isDirty: true };
            }
        },
        setBrokerMappings: (state, action: PayloadAction<{ id: string; brokerMappings?: { fieldId: string; brokerId: string }[] }>) => {
            const { id, brokerMappings } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], brokerMappings, isDirty: true };
            }
        },
        setIsPublic: (state, action: PayloadAction<{ id: string; isPublic?: boolean }>) => {
            const { id, isPublic } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], isPublic, isDirty: true };
            }
        },
        setAuthenticatedRead: (state, action: PayloadAction<{ id: string; authenticatedRead?: boolean }>) => {
            const { id, authenticatedRead } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], authenticatedRead, isDirty: true };
            }
        },
        setPublicRead: (state, action: PayloadAction<{ id: string; publicRead?: boolean }>) => {
            const { id, publicRead } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], publicRead, isDirty: true };
            }
        },
        setIsDirty: (state, action: PayloadAction<{ id: string; isDirty?: boolean }>) => {
            const { id, isDirty } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], isDirty };
            }
        },
        setIsLocal: (state, action: PayloadAction<{ id: string; isLocal?: boolean }>) => {
            const { id, isLocal } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], isLocal };
            }
        },
        setSlugStatus: (state, action: PayloadAction<{ id: string; slugStatus: 'unchecked' | 'unique' | 'notUnique' }>) => {
            const { id, slugStatus } = action.payload;
            if (state.applets[id]) {
                state.applets[id] = { ...state.applets[id], slugStatus, isDirty: true };
            }
        },
        // Container management actions
        addContainer: (state, action: PayloadAction<{ appletId: string; container: ContainerBuilder }>) => {
            const { appletId, container } = action.payload;
            if (state.applets[appletId]) {
                state.applets[appletId].containers = [...state.applets[appletId].containers, container];
                state.applets[appletId].isDirty = true;
            }
        },
        removeContainer: (state, action: PayloadAction<{ appletId: string; containerId: string }>) => {
            const { appletId, containerId } = action.payload;
            if (state.applets[appletId]) {
                state.applets[appletId].containers = state.applets[appletId].containers.filter(c => c.id !== containerId);
                state.applets[appletId].isDirty = true;
            }
        },
        recompileContainer: (state, action: PayloadAction<{ appletId: string; containerId: string; updatedContainer: ContainerBuilder }>) => {
            const { appletId, containerId, updatedContainer } = action.payload;
            if (state.applets[appletId]) {
                const containerIndex = state.applets[appletId].containers.findIndex(c => c.id === containerId);
                if (containerIndex >= 0) {
                    state.applets[appletId].containers[containerIndex] = updatedContainer;
                    state.applets[appletId].isDirty = true;
                }
            }
        },
        // Other actions
        deleteApplet: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            delete state.applets[id];
            if (state.activeAppletId === id) {
                state.activeAppletId = null;
            }
            if (state.newAppletId === id) {
                state.newAppletId = null;
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
            state.applets[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false, slugStatus: 'unique' };
            if (state.newAppletId) {
                delete state.applets[state.newAppletId];
                state.newAppletId = null;
            }
            state.activeAppletId = action.payload.id;
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
            state.applets[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false, slugStatus: 'unique' };
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
            if (state.activeAppletId === action.meta.arg) {
                state.activeAppletId = null;
            }
            state.isLoading = false;
        });
        builder.addCase(deleteAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to update applet";
        });

        // Add Container
        builder.addCase(addContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(addContainerThunk.fulfilled, (state, action) => {
            const { appletId, container } = action.payload;
            if (state.applets[appletId]) {
                state.applets[appletId].containers = [...state.applets[appletId].containers, container];
                state.applets[appletId].isDirty = true;
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
                state.applets[appletId].containers = state.applets[appletId].containers.filter(c => c.id !== containerId);
                state.applets[appletId].isDirty = true;
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
            state.applets[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false };
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
                acc[applet.id] = { ...applet, isDirty: false, isLocal: false, slugStatus: 'unique' };
                return acc;
            }, {} as Record<string, AppletBuilder>);
            state.isLoading = false;
        });
        builder.addCase(fetchAppletsThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch applets";
        });

        // Check Slug Uniqueness
        builder.addCase(checkAppletSlugUniqueness.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(checkAppletSlugUniqueness.fulfilled, (state, action) => {
            const { slug, appletId } = action.meta.arg;
            if (appletId && state.applets[appletId]) {
                state.applets[appletId].slugStatus = action.payload ? 'unique' : 'notUnique';
            } else {
                Object.values(state.applets).forEach(applet => {
                    if (applet.slug === slug) {
                        applet.slugStatus = action.payload ? 'unique' : 'notUnique';
                    }
                });
            }
            state.isLoading = false;
        });
        builder.addCase(checkAppletSlugUniqueness.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to check slug uniqueness";
        });
    },
});

export const {
    startNewApplet,
    cancelNewApplet,
    setActiveApplet,
    setName,
    setDescription,
    setSlug,
    setAppletIcon,
    setAppletSubmitText,
    setCreator,
    setPrimaryColor,
    setAccentColor,
    setLayoutType,
    setDataSourceConfig,
    setResultComponentConfig,
    setNextStepConfig,
    setCompiledRecipeId,
    setSubcategoryId,
    setImageUrl,
    setAppId,
    setBrokerMappings,
    setIsPublic,
    setAuthenticatedRead,
    setPublicRead,
    setIsDirty,
    setIsLocal,
    setSlugStatus,
    addContainer,
    removeContainer,
    recompileContainer,
    deleteApplet,
    setLoading,
    setError,
} = appletBuilderSlice.actions;

export default appletBuilderSlice.reducer;
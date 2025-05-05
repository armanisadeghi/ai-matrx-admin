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
    saveAppletThunk,
    addAppletToAppThunk,
    FetchAppletByIdSuccessAction
} from "../thunks/appletBuilderThunks";
import { saveContainerAndUpdateAppletThunk } from "../thunks/containerBuilderThunks";
import { saveFieldAndUpdateContainerThunk } from "../thunks/fieldBuilderThunks";
import { AppletBuilder, ContainerBuilder } from "../types";
import { v4 as uuidv4 } from "uuid";
import { BrokerMapping } from "@/features/applet/builder/builder.types";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

// Helper function to check if an applet exists in state
const checkAppletExists = (state: AppletsState, id: string): boolean => {
    if (!state.applets[id]) {
        console.error(`Applet with ID ${id} not found in state`);
        return false;
    }
    return true;
};
// Default applet configuration
export const DEFAULT_APPLET: Partial<AppletBuilder> = {
    name: "",
    description: "",
    slug: "",
    appletIcon: "",
    appletSubmitText: "",
    creator: "",
    primaryColor: "gray",
    accentColor: "rose",
    layoutType: "open",
    containers: [],
    dataSourceConfig: {},
    resultComponentConfig: {},
    nextStepConfig: {},
    compiledRecipeId: "",
    subcategoryId: "",
    imageUrl: "",
    appId: "",
    brokerMappings: [],
    isPublic: false,
    authenticatedRead: true,
    publicRead: false,
    isDirty: false,
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
        startNewApplet: (state, action: PayloadAction<{ id: string }>) => {
            const id = action.payload.id;
            state.applets[id] = {
                ...DEFAULT_APPLET,
                id,
            } as AppletBuilder;
            state.newAppletId = id;
            state.activeAppletId = id;
        },
        // Cancel creation of a local applet
        cancelNewApplet: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            if (state.applets[id].isLocal) {
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
            const id = action.payload;
            if (id !== null && !state.applets[id]) {
                console.error(`Applet with ID ${id} not found in state`);
            }
            state.activeAppletId = id;
        },
        // Specific actions for AppletBuilder properties
        setName: (state, action: PayloadAction<{ id: string; name: string }>) => {
            const { id, name } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], name, isDirty: true };
        },
        setDescription: (state, action: PayloadAction<{ id: string; description?: string }>) => {
            const { id, description } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], description, isDirty: true };
        },
        setSlug: (state, action: PayloadAction<{ id: string; slug: string }>) => {
            const { id, slug } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], slug, isDirty: true, slugStatus: "unchecked" };
        },
        setAppletIcon: (state, action: PayloadAction<{ id: string; appletIcon?: string }>) => {
            const { id, appletIcon } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], appletIcon, isDirty: true };
        },
        setAppletSubmitText: (state, action: PayloadAction<{ id: string; appletSubmitText?: string }>) => {
            const { id, appletSubmitText } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], appletSubmitText, isDirty: true };
        },
        setCreator: (state, action: PayloadAction<{ id: string; creator?: string }>) => {
            const { id, creator } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], creator, isDirty: true };
        },
        setPrimaryColor: (state, action: PayloadAction<{ id: string; primaryColor?: string }>) => {
            const { id, primaryColor } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], primaryColor, isDirty: true };
        },
        setAccentColor: (state, action: PayloadAction<{ id: string; accentColor?: string }>) => {
            const { id, accentColor } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], accentColor, isDirty: true };
        },
        setLayoutType: (state, action: PayloadAction<{ id: string; layoutType?: AppletLayoutOption }>) => {
            const { id, layoutType } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], layoutType, isDirty: true };
        },
        setDataSourceConfig: (state, action: PayloadAction<{ id: string; dataSourceConfig?: any }>) => {
            const { id, dataSourceConfig } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], dataSourceConfig, isDirty: true };
        },
        setResultComponentConfig: (state, action: PayloadAction<{ id: string; resultComponentConfig?: any }>) => {
            const { id, resultComponentConfig } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], resultComponentConfig, isDirty: true };
        },
        setNextStepConfig: (state, action: PayloadAction<{ id: string; nextStepConfig?: any }>) => {
            const { id, nextStepConfig } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], nextStepConfig, isDirty: true };
        },
        setCompiledRecipeId: (state, action: PayloadAction<{ id: string; compiledRecipeId?: string }>) => {
            const { id, compiledRecipeId } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], compiledRecipeId, isDirty: true };
        },
        setSubcategoryId: (state, action: PayloadAction<{ id: string; subcategoryId?: string }>) => {
            const { id, subcategoryId } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], subcategoryId, isDirty: true };
        },
        setImageUrl: (state, action: PayloadAction<{ id: string; imageUrl?: string }>) => {
            const { id, imageUrl } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], imageUrl, isDirty: true };
        },
        setAppId: (state, action: PayloadAction<{ id: string; appId?: string }>) => {
            const { id, appId } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], appId, isDirty: true };
        },
        setBrokerMappings: (state, action: PayloadAction<{ id: string; brokerMappings?: BrokerMapping[] }>) => {
            const { id, brokerMappings } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], brokerMappings, isDirty: true };
        },
        setIsPublic: (state, action: PayloadAction<{ id: string; isPublic?: boolean }>) => {
            const { id, isPublic } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], isPublic, isDirty: true };
        },
        setAuthenticatedRead: (state, action: PayloadAction<{ id: string; authenticatedRead?: boolean }>) => {
            const { id, authenticatedRead } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], authenticatedRead, isDirty: true };
        },
        setPublicRead: (state, action: PayloadAction<{ id: string; publicRead?: boolean }>) => {
            const { id, publicRead } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], publicRead, isDirty: true };
        },
        setIsDirty: (state, action: PayloadAction<{ id: string; isDirty?: boolean }>) => {
            const { id, isDirty } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], isDirty };
        },
        setIsLocal: (state, action: PayloadAction<{ id: string; isLocal?: boolean }>) => {
            const { id, isLocal } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], isLocal };
        },
        setSlugStatus: (state, action: PayloadAction<{ id: string; slugStatus: 'unchecked' | 'unique' | 'notUnique' }>) => {
            const { id, slugStatus } = action.payload;
            if (!checkAppletExists(state, id)) return;
            
            state.applets[id] = { ...state.applets[id], slugStatus, isDirty: true };
        },
        // Container management actions
        addContainer: (state, action: PayloadAction<{ appletId: string; container: ContainerBuilder }>) => {
            const { appletId, container } = action.payload;
            if (!checkAppletExists(state, appletId)) return;
            
            state.applets[appletId].containers = [...state.applets[appletId].containers, container];
            state.applets[appletId].isDirty = true;
        },
        removeContainer: (state, action: PayloadAction<{ appletId: string; containerId: string }>) => {
            const { appletId, containerId } = action.payload;
            if (!checkAppletExists(state, appletId)) return;
            
            state.applets[appletId].containers = state.applets[appletId].containers.filter(c => c.id !== containerId);
            state.applets[appletId].isDirty = true;
        },
        recompileContainer: (state, action: PayloadAction<{ appletId: string; containerId: string; updatedContainer: ContainerBuilder }>) => {
            const { appletId, containerId, updatedContainer } = action.payload;
            if (!checkAppletExists(state, appletId)) return;
            
            const containerIndex = state.applets[appletId].containers.findIndex(c => c.id === containerId);
            if (containerIndex >= 0) {
                state.applets[appletId].containers[containerIndex] = updatedContainer;
                state.applets[appletId].isDirty = true;
            } else {
                console.error(`Container with ID ${containerId} not found in applet ${appletId}`);
            }
        },
        // Other actions
        deleteApplet: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (!checkAppletExists(state, id)) return;
            
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
        startWithData: (state, action: PayloadAction<AppletBuilder>) => {
            const applet = action.payload;
            state.applets[applet.id] = applet;
            state.newAppletId = applet.id;
            state.activeAppletId = applet.id;
        },
    },
    extraReducers: (builder) => {
        // Add applet to app
        builder.addCase(addAppletToAppThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(addAppletToAppThunk.fulfilled, (state, action) => {
            const appletId = action.payload.id;
            if (state.applets[appletId]) {
                state.applets[appletId] = {
                    ...action.payload,
                    isDirty: false,
                    isLocal: false
                };
            }
            state.isLoading = false;
        });
        builder.addCase(addAppletToAppThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to associate applet with app";
        });

        // Unified Save Applet
        builder.addCase(saveAppletThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(saveAppletThunk.fulfilled, (state, action) => {
            const oldId = state.activeAppletId; 
            const newId = action.payload.id;
            
            // Handle case where local ID is replaced with server ID
            if (oldId && oldId !== newId) {
                // If the saved applet had a temporary ID, we need to remove the temp entry
                delete state.applets[oldId];
                
                // Update active and new applet IDs to the new server-generated ID
                if (state.activeAppletId === oldId) {
                    state.activeAppletId = newId;
                }
                
                if (state.newAppletId === oldId) {
                    state.newAppletId = null; // No longer a "new" applet
                }
            }
            
            // Update the applet with server data
            state.applets[newId] = { 
                ...action.payload, 
                isDirty: false, 
                isLocal: false, 
                slugStatus: 'unique' 
            };
            
            state.isLoading = false;
        });
        builder.addCase(saveAppletThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to save applet";
        });

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

        // Handle saveContainerAndUpdateAppletThunk
        builder.addCase(saveContainerAndUpdateAppletThunk.fulfilled, (state, action) => {
            const { container, appletId } = action.payload;
            
            if (container && appletId && state.applets[appletId]) {
                // Find the container in the applet
                const containerIndex = state.applets[appletId].containers.findIndex(c => c.id === container.id);
                
                if (containerIndex >= 0) {
                    // Update existing container
                    state.applets[appletId].containers[containerIndex] = container;
                } else {
                    // Add new container
                    state.applets[appletId].containers.push(container);
                }
                
                state.applets[appletId].isDirty = true;
            }
        });

        // Handle saveFieldAndUpdateContainerThunk - if needed for containers within applets
        builder.addCase(saveFieldAndUpdateContainerThunk.fulfilled, (state, action) => {
            const { containerId } = action.payload;
            
            // Find which applet contains this container and mark it as dirty
            if (containerId) {
                Object.values(state.applets).forEach(applet => {
                    const containerIndex = applet.containers.findIndex(c => c.id === containerId);
                    if (containerIndex >= 0) {
                        // Mark the applet as dirty since a field in one of its containers changed
                        applet.isDirty = true;
                    }
                });
            }
        });

        // Handling fetchAppletById success (used by setActiveAppletWithFetchThunk)
        builder.addCase("appletBuilder/fetchAppletByIdSuccess", (state, action: FetchAppletByIdSuccessAction) => {
            state.applets[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false, slugStatus: 'unique' };
            state.isLoading = false;
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
    startWithData,
} = appletBuilderSlice.actions;

export default appletBuilderSlice.reducer;
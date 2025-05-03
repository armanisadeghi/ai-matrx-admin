import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    createCustomAppletConfig,
    updateCustomAppletConfig,
    deleteCustomAppletConfig,
    addGroupsToApplet,
    recompileAllGroupsInApplet,
    getAllCustomAppletConfigs,
    getCustomAppletConfigById,
    isAppletSlugAvailable,
} from "../service/customAppletService";
import { AppletBuilder, ContainerBuilder } from "../types";
import { RootState } from "@/lib/redux/store";
import { selectAppletById } from "../selectors/appletSelectors";

export const createAppletThunk = createAsyncThunk<AppletBuilder, AppletBuilder>(
    "appletBuilder/createApplet",
    async (applet, { rejectWithValue }) => {
        try {
            const appletData = {
                ...applet,
                id: applet.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                containers: applet.containers || [],
            };
            const savedApplet = await createCustomAppletConfig(appletData);
            return {
                ...savedApplet,
                containers: savedApplet.containers || [],
                isDirty: false,
                isLocal: false,
                slugStatus: "unique",
            };
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to create applet");
        }
    }
);

export const updateAppletThunk = createAsyncThunk<AppletBuilder, { id: string; changes: Partial<AppletBuilder> }>(
    "appletBuilder/updateApplet",
    async ({ id, changes }, { getState, rejectWithValue }) => {
        try {
            const currentApplet = selectAppletById(getState() as RootState, id);
            if (!currentApplet) {
                throw new Error(`Applet with ID ${id} not found`);
            }
            const updatedApplet = { ...currentApplet, ...changes };
            const result = await updateCustomAppletConfig(id, updatedApplet);
            return {
                ...result,
                containers: result.containers || [],
                isDirty: false,
                isLocal: false,
                slugStatus: "unique",
            };
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to update applet");
        }
    }
);

export const deleteAppletThunk = createAsyncThunk<void, string>(
    "appletBuilder/deleteApplet",
    async (id, { rejectWithValue }) => {
        try {
            await deleteCustomAppletConfig(id);
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to delete applet");
        }
    }
);

export const addContainerThunk = createAsyncThunk<
    { appletId: string; container: ContainerBuilder },
    { appletId: string; containerId: string }
>(
    "appletBuilder/addContainer",
    async ({ appletId, containerId }, { rejectWithValue }) => {
        try {
            await addGroupsToApplet(appletId, [containerId]);
            const applet = await getCustomAppletConfigById(appletId);
            if (!applet) {
                throw new Error("Failed to fetch updated applet");
            }
            const container = applet.containers.find((c: ContainerBuilder) => c.id === containerId);
            if (!container) {
                throw new Error("Container not found in applet");
            }
            return { appletId, container };
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to add container");
        }
    }
);

export const removeContainerThunk = createAsyncThunk<void, { appletId: string; containerId: string }>(
    "appletBuilder/removeContainer",
    async ({ appletId, containerId }, { getState, rejectWithValue }) => {
        try {
            const applet = selectAppletById(getState() as RootState, appletId);
            if (!applet) {
                throw new Error("Applet not found");
            }
            const updatedContainers = applet.containers.filter(c => c.id !== containerId);
            await updateCustomAppletConfig(appletId, { ...applet, containers: updatedContainers });
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to remove container");
        }
    }
);

export const recompileContainerThunk = createAsyncThunk<
    { appletId: string; containerId: string; updatedContainer: ContainerBuilder },
    { appletId: string; containerId: string },
    { state: RootState }
>(
    "appletBuilder/recompileContainer",
    async ({ appletId, containerId }, { getState, rejectWithValue }) => {
        try {
            const applet = selectAppletById(getState() as RootState, appletId);
            if (!applet) {
                throw new Error(`Applet with ID ${appletId} not found`);
            }
            const existingContainer = applet.containers.find(c => c.id === containerId);
            if (!existingContainer) {
                throw new Error(`Container with ID ${containerId} not found in applet ${appletId}`);
            }
            await recompileAllGroupsInApplet(appletId); // Recompile all to ensure consistency
            const updatedApplet = await getCustomAppletConfigById(appletId);
            if (!updatedApplet) {
                throw new Error("Failed to fetch updated applet");
            }
            const updatedContainer = updatedApplet.containers.find(c => c.id === containerId);
            if (!updatedContainer) {
                throw new Error(`Container with ID ${containerId} not found after recompilation`);
            }
            return { appletId, containerId, updatedContainer };
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to recompile container");
        }
    }
);

export const recompileAppletThunk = createAsyncThunk<AppletBuilder, string>(
    "appletBuilder/recompileApplet",
    async (appletId, { rejectWithValue }) => {
        try {
            await recompileAllGroupsInApplet(appletId);
            const updatedApplet = await getCustomAppletConfigById(appletId);
            if (!updatedApplet) {
                throw new Error("Failed to fetch recompiled applet");
            }
            return {
                ...updatedApplet,
                containers: updatedApplet.containers || [],
                isDirty: false,
                isLocal: false,
            };
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to recompile applet");
        }
    }
);

export const fetchAppletsThunk = createAsyncThunk<AppletBuilder[], void>(
    "appletBuilder/fetchApplets",
    async (_, { rejectWithValue }) => {
        try {
            const applets = await getAllCustomAppletConfigs();
            return applets.map((applet) => ({
                ...applet,
                containers: applet.containers || [],
                isDirty: false,
                isLocal: false,
                slugStatus: "unique",
            }));
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch applets");
        }
    }
);

export const checkAppletSlugUniqueness = createAsyncThunk<
    boolean,
    { slug: string; appletId?: string },
    { state: RootState }
>(
    "appletBuilder/checkSlugUniqueness",
    async ({ slug, appletId }, { rejectWithValue }) => {
        try {
            const isAvailable = await isAppletSlugAvailable(slug, appletId);
            return isAvailable;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to check slug uniqueness");
        }
    }
);
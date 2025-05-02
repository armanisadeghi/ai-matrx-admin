import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    createCustomAppletConfig,
    updateCustomAppletConfig,
    deleteCustomAppletConfig,
    addGroupsToApplet,
    recompileAllGroupsInApplet,
    getAllCustomAppletConfigs,
    getCustomAppletConfigById,
} from "../service/customAppletService";
import { AppletBuilder, ContainerBuilder } from "../types";

export const createAppletThunk = createAsyncThunk<AppletBuilder, AppletBuilder>(
    "appletBuilder/createApplet",
    async (applet, { rejectWithValue }) => {
        try {
            const savedApplet = await createCustomAppletConfig({
                id: applet.id,
                name: applet.name,
                description: applet.description,
                slug: applet.slug,
                appletIcon: applet.appletIcon,
                appletSubmitText: applet.appletSubmitText,
                creator: applet.creator,
                primaryColor: applet.primaryColor,
                accentColor: applet.accentColor,
                layoutType: applet.layoutType,
                containers: applet.containers,
                dataSourceConfig: applet.dataSourceConfig,
                resultComponentConfig: applet.resultComponentConfig,
                nextStepConfig: applet.nextStepConfig,
                compiledRecipeId: applet.compiledRecipeId,
                subcategoryId: applet.subcategoryId,
                imageUrl: applet.imageUrl,
                appId: applet.appId,
            });
            return {
                ...savedApplet,
                containers: applet.containers || [],
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateAppletThunk = createAsyncThunk<AppletBuilder, { id: string; changes: Partial<AppletBuilder> }>(
    "appletBuilder/updateApplet",
    async ({ id, changes }, { rejectWithValue }) => {
        try {
            const updatedApplet = await updateCustomAppletConfig(id, {
                id,
                ...changes,
            });
            return {
                ...updatedApplet,
                containers: changes.containers || updatedApplet.containers || [],
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteAppletThunk = createAsyncThunk<void, string>(
    "appletBuilder/deleteApplet",
    async (id, { rejectWithValue }) => {
        try {
            await deleteCustomAppletConfig(id);
        } catch (error: any) {
            return rejectWithValue(error.message);
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
            return rejectWithValue(error.message);
        }
    }
);

export const removeContainerThunk = createAsyncThunk<void, { appletId: string; containerId: string }>(
    "appletBuilder/removeContainer",
    async ({ appletId, containerId }, { rejectWithValue }) => {
        try {
            // Note: Supabase doesn't provide a direct removeGroupFromApplet, so update containers
            const applet = await getCustomAppletConfigById(appletId);
            if (!applet) {
                throw new Error("Applet not found");
            }
            const updatedContainers = applet.containers.filter((c) => c.id !== containerId);
            await updateCustomAppletConfig(appletId, { ...applet, containers: updatedContainers });
        } catch (error: any) {
            return rejectWithValue(error.message);
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
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
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
            }));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);
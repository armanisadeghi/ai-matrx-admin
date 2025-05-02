import { createAsyncThunk } from "@reduxjs/toolkit";
import { createCustomAppConfig, updateCustomAppConfig, deleteCustomAppConfig } from "../service/customAppService";

import { updateCustomAppletConfig, getCustomAppletConfigsByAppId } from "../service/customAppletService";
import { AppBuilder } from "../slices/appBuilderSlice";
import { AppletBuilder } from "../types";

export const createAppThunk = createAsyncThunk<AppBuilder, AppBuilder>(
    "appBuilder/createApp",
    async (app, { rejectWithValue }) => {
        try {
            const savedApp = await createCustomAppConfig(app);
            if (!savedApp.id) {
                throw new Error('No ID returned for the created app');
            }
            return {
                ...savedApp,
                id: savedApp.id,
                appletIds: app.appletIds || [],
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateAppThunk = createAsyncThunk<AppBuilder, { id: string; changes: Partial<AppBuilder> }>(
    "appBuilder/updateApp",
    async ({ id, changes }, { rejectWithValue }) => {
        try {
            const updatedApp = await updateCustomAppConfig(id, { 
                id, 
                name: changes.name || '', 
                description: changes.description || '', 
                slug: changes.slug || '', 
                ...changes 
            });
            if (!updatedApp.id) {
                throw new Error('No ID returned for the updated app');
            }
            return {
                ...updatedApp,
                id: updatedApp.id,
                appletIds: changes.appletIds || [],
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteAppThunk = createAsyncThunk<void, string>(
    "appBuilder/deleteApp",
    async (id, { rejectWithValue }) => {
        try {
            await deleteCustomAppConfig(id);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addAppletThunk = createAsyncThunk<void, { appId: string; appletId: string }>(
    "appBuilder/addApplet",
    async ({ appId, appletId }, { rejectWithValue }) => {
        try {
            // Update applet to set app_id
            await updateCustomAppletConfig(appletId, { id: appletId, appId });
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const removeAppletThunk = createAsyncThunk<void, { appId: string; appletId: string }>(
    "appBuilder/removeApplet",
    async ({ appId, appletId }, { rejectWithValue }) => {
        try {
            // Update applet to clear app_id
            await updateCustomAppletConfig(appletId, { id: appletId, appId: null });
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchAppletsForAppThunk = createAsyncThunk<AppletBuilder[], string>(
    "appBuilder/fetchAppletsForApp",
    async (appId, { rejectWithValue }) => {
        try {
            const applets = await getCustomAppletConfigsByAppId(appId);
            return applets.map(applet => ({
                ...applet,
                containers: applet.containers || [],
            }));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);
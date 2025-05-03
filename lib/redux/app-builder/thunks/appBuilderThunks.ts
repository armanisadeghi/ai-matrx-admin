import { createAsyncThunk } from "@reduxjs/toolkit";
import { createCustomAppConfig, updateCustomAppConfig, deleteCustomAppConfig, getAllCustomAppConfigs, getCustomAppConfigById, getAllCustomAppConfigsWithApplets, isAppSlugAvailable } from "../service/customAppService";

import { updateCustomAppletConfig, getCustomAppletConfigsByAppId, getAllCustomAppletConfigs } from "../service/customAppletService";
import { AppBuilder, AppletBuilder } from "../types";
import { RootState } from "../../store";

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

export const fetchAppsThunk = createAsyncThunk<AppBuilder[], void>(
    "appBuilder/fetchApps",
    async (_, { rejectWithValue }) => {
        try {
            // Use the optimized function to get apps with applets in a single transaction
            const enhancedApps = await getAllCustomAppConfigsWithApplets();
            
            // Map to the expected AppBuilder format
            const result = enhancedApps.map(app => ({
                ...app,
                id: app.id || '',
                name: app.name || '',
                description: app.description || '',
                slug: app.slug || '',
                appletIds: app.appletIds || [],
            }));
            
            return result;
        } catch (error: any) {
            console.error("fetchAppsThunk - error:", error);
            return rejectWithValue(error.message);
        }
    }
);

export const checkAppSlugUniqueness = createAsyncThunk<boolean, { slug: string; appId?: string }, { state: RootState }>(
    'appBuilder/checkSlugUniqueness',
    async ({ slug, appId }, { rejectWithValue }) => {
      try {
        const isAvailable = await isAppSlugAvailable(slug, appId);
        return isAvailable;
      } catch (error: any) {
        return rejectWithValue(error.message || 'Failed to check slug uniqueness');
      }
    }
  );
  
  
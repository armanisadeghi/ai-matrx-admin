import { RootState } from "@/lib/redux";
import { AppBuilder } from "../slices/appBuilderSlice";

// Base selector for the appBuilder state
const getAppBuilderState = (state: RootState) => state.appBuilder;

// Selector for all apps
export const selectAllApps = (state: RootState): AppBuilder[] => Object.values(getAppBuilderState(state).apps);

// Selector for a specific app by ID
export const selectAppById = (state: RootState, id: string): AppBuilder | null => getAppBuilderState(state).apps[id] || null;

// Selector for app loading state
export const selectAppLoading = (state: RootState): boolean => getAppBuilderState(state).isLoading;

// Selector for app error state
export const selectAppError = (state: RootState): string | null => getAppBuilderState(state).error;

// Selector for applet IDs associated with an app
export const selectAppletIdsForApp = (state: RootState, appId: string): string[] => {
  const app = selectAppById(state, appId);
  return app ? app.appletIds : [];
};

// Selector for apps by a list of IDs
export const selectAppsByIds = (state: RootState, appIds: string[]): AppBuilder[] => {
  return appIds
    .map(id => selectAppById(state, id))
    .filter((app): app is AppBuilder => app !== null);
};

// Selector for apps with a specific applet ID
export const selectAppsWithApplet = (state: RootState, appletId: string): AppBuilder[] => {
  return selectAllApps(state).filter(app => app.appletIds.includes(appletId));
}; 
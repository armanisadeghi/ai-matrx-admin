import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux/store";
import { AppBuilder } from "../types";

// Base selector for the appBuilder state
export const getAppBuilderState = (state: RootState) => {
  return state.appBuilder;
};

// Memoized selector for all apps
export const selectAllApps = createSelector(
  [getAppBuilderState],
  (appBuilderState) => {
    return Object.values(appBuilderState.apps);
  }
);

// Memoized selector for a specific app by ID
export const selectAppById = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app || null
);

// Memoized selector for applet IDs associated with an app
export const selectAppletIdsForApp = createSelector(
  [(state: RootState, appId: string) => selectAppById(state, appId)],
  (app) => app ? app.appletIds : []
);

// Memoized selector for apps by a list of IDs
export const selectAppsByIds = createSelector(
  [
    getAppBuilderState,
    (_state: RootState, appIds: string[]) => appIds
  ],
  (appBuilderState, appIds) => {
    // If appIds is empty, return empty array
    if (!appIds || appIds.length === 0) {
      return [];
    }
    
    // Map and filter in one step
    const result = appIds
      .map(id => appBuilderState.apps[id])
      .filter((app): app is AppBuilder => app !== null && app !== undefined);
    
    return result;
  }
);

// Memoized selector for apps with a specific applet ID
export const selectAppsWithApplet = createSelector(
  [
    selectAllApps,
    (_state: RootState, appletId: string) => appletId
  ],
  (apps, appletId) => apps.filter(app => app.appletIds.includes(appletId))
);

// Memoized selector for loading state
export const selectAppLoading = createSelector(
  [getAppBuilderState],
  (appBuilderState) => appBuilderState.isLoading
);

// Memoized selector for error state
export const selectAppError = createSelector(
  [getAppBuilderState],
  (appBuilderState) => appBuilderState.error
);

// Memoized selector for dirty apps
export const selectDirtyApps = createSelector(
  [selectAllApps],
  (apps) => apps.filter(app => app.isDirty === true)
);

// Memoized selector for checking if there are unsaved changes
export const selectHasUnsavedAppChanges = createSelector(
  [selectAllApps],
  (apps) => apps.some(app => app.isDirty === true)
);

// Memoized selector for local apps
export const selectLocalApps = createSelector(
  [selectAllApps],
  (apps) => apps.filter(app => app.isLocal === true)
);

// Memoized selector for app slug status
export const selectAppSlugStatus = createSelector(
  [(state: RootState, appId: string) => state.appBuilder.apps[appId]],
  (app) => app?.slugStatus || 'unchecked'
);

// Memoized selector for app dirty state
export const selectAppIsDirty = createSelector(
  [(state: RootState, appId: string) => state.appBuilder.apps[appId]],
  (app) => app?.isDirty === true
); 
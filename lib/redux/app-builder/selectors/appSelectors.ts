import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux/store";
import { AppBuilder } from "../types";

// ================================ Base Selectors ================================

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

// ================================ Status Selectors ================================

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

// ================================ App Collection Selectors ================================

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

// ================================ Dirty State Management ================================

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

// ================================ Active/New App Selectors ================================

// Memoized selector for new app ID
export const selectNewAppId = createSelector(
  [getAppBuilderState],
  (appBuilderState) => appBuilderState.newAppId
);

// Memoized selector for active app ID
export const selectActiveAppId = createSelector(
  [getAppBuilderState],
  (appBuilderState) => appBuilderState.activeAppId
);

// ================================ App Property Selectors ================================

// Explicit selectors for each AppBuilder property
export const selectAppId = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.id : null
);

export const selectAppName = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.name : null
);

export const selectAppDescription = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.description : null
);

export const selectAppSlug = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.slug : null
);

export const selectAppMainAppIcon = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.mainAppIcon : null
);

export const selectAppMainAppSubmitIcon = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.mainAppSubmitIcon : null
);

export const selectAppCreator = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.creator : null
);

export const selectAppPrimaryColor = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.primaryColor : null
);

export const selectAppAccentColor = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.accentColor : null
);

export const selectAppAppletList = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.appletList : null
);

export const selectAppExtraButtons = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.extraButtons : null
);

export const selectAppLayoutType = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.layoutType : null
);

export const selectAppImageUrl = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.imageUrl : null
);

export const selectAppCreatedAt = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.createdAt : null
);

export const selectAppUpdatedAt = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.updatedAt : null
);

export const selectAppUserId = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.userId : null
);

// ================================ Security and Status Selectors ================================

export const selectAppIsPublic = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.isPublic : null
);

export const selectAppAuthenticatedRead = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.authenticatedRead : null
);

export const selectAppPublicRead = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.publicRead : null
);

export const selectAppIsDirty = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.isDirty : null
);

export const selectAppIsLocal = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.isLocal : null
);

export const selectAppSlugStatus = createSelector(
  [(state: RootState, id: string) => state.appBuilder.apps[id]],
  (app) => app ? app.slugStatus : 'unchecked'
); 
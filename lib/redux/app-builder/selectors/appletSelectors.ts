import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux/store";
import { AppletBuilder } from "../types";

// Base selector for the appletBuilder state
export const getAppletBuilderState = (state: RootState) => state.appletBuilder;

// Memoized selector for all applets
export const selectAllApplets = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => Object.values(appletBuilderState.applets)
);

// Memoized selector for a specific applet by ID
export const selectAppletById = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => applet || null
);

// Memoized selector for applet loading state
export const selectAppletLoading = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.isLoading
);

// Memoized selector for applet error state
export const selectAppletError = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.error
);

// Memoized selector for applets by a list of IDs
export const selectAppletsByIds = createSelector(
  [
    getAppletBuilderState,
    (_state: RootState, appletIds: string[]) => appletIds
  ],
  (appletBuilderState, appletIds) => {
    return appletIds
      .map(id => appletBuilderState.applets[id])
      .filter((applet): applet is AppletBuilder => applet !== null);
  }
);

// Memoized selector for applets associated with a specific app ID
export const selectAppletsByAppId = createSelector(
  [
    selectAllApplets,
    (_state: RootState, appId: string) => appId
  ],
  (applets, appId) => applets.filter(applet => applet.appId === appId)
);

// Memoized selector for applets without an app assignment
export const selectUnassignedApplets = createSelector(
  [selectAllApplets],
  (applets) => applets.filter(applet => !applet.appId)
);

// Memoized selector for dirty applets
export const selectDirtyApplets = createSelector(
  [selectAllApplets],
  (applets) => applets.filter(applet => applet.isDirty === true)
);

// Memoized selector for checking if there are unsaved changes
export const selectHasUnsavedAppletChanges = createSelector(
  [selectAllApplets],
  (applets) => applets.some(applet => applet.isDirty === true)
);

// Memoized selector for local applets
export const selectLocalApplets = createSelector(
  [selectAllApplets],
  (applets) => applets.filter(applet => applet.isLocal === true)
);

// Memoized selector for containers associated with an applet
export const selectContainersForApplet = createSelector(
  [(state: RootState, appletId: string) => selectAppletById(state, appletId)],
  (applet) => (applet ? applet.containers : [])
);

// Memoized selector for new applet ID
export const selectNewAppletId = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.newAppletId
);

// Memoized selector for active applet ID
export const selectActiveAppletId = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.activeAppletId
);

// Explicit selectors for each AppletBuilder property
export const selectAppletId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.id : null)
);

export const selectAppletName = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.name : null)
);

export const selectAppletDescription = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.description : null)
);

export const selectAppletSlug = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.slug : null)
);

export const selectAppletIcon = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.appletIcon : null)
);

export const selectAppletSubmitText = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.appletSubmitText : null)
);

export const selectAppletCreator = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.creator : null)
);

export const selectAppletPrimaryColor = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.primaryColor : null)
);

export const selectAppletAccentColor = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.accentColor : null)
);

export const selectAppletLayoutType = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.layoutType : null)
);

export const selectAppletContainers = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.containers : null)
);

export const selectAppletDataSourceConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.dataSourceConfig : null)
);

export const selectAppletResultComponentConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.resultComponentConfig : null)
);

export const selectAppletNextStepConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.nextStepConfig : null)
);

export const selectAppletCompiledRecipeId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.compiledRecipeId : null)
);

export const selectAppletSubcategoryId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.subcategoryId : null)
);

export const selectAppletImageUrl = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.imageUrl : null)
);

export const selectAppletAppId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.appId : null)
);

export const selectAppletBrokerMappings = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.brokerMappings : null)
);

export const selectAppletIsPublic = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.isPublic : null)
);

export const selectAppletAuthenticatedRead = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.authenticatedRead : null)
);

export const selectAppletPublicRead = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.publicRead : null)
);

export const selectAppletIsDirty = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.isDirty : null)
);

export const selectAppletIsLocal = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.isLocal : null)
);

export const selectAppletSlugStatus = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.slugStatus : 'unchecked')
);
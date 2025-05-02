import { RootState } from "@/lib/redux";
import { AppletBuilder } from "../types";

// Base selector for the appletBuilder state
const getAppletBuilderState = (state: RootState) => state.appletBuilder;

// Selector for all applets
export const selectAllApplets = (state: RootState): AppletBuilder[] => Object.values(getAppletBuilderState(state).applets);

// Selector for a specific applet by ID
export const selectAppletById = (state: RootState, id: string): AppletBuilder | null => getAppletBuilderState(state).applets[id] || null;

// Selector for applet loading state
export const selectAppletLoading = (state: RootState): boolean => getAppletBuilderState(state).isLoading;

// Selector for applet error state
export const selectAppletError = (state: RootState): string | null => getAppletBuilderState(state).error;

// Selector for containers associated with an applet
export const selectContainersForApplet = (state: RootState, appletId: string) => {
  const applet = selectAppletById(state, appletId);
  return applet ? applet.containers : [];
};

// Selector for applets by a list of IDs
export const selectAppletsByIds = (state: RootState, appletIds: string[]): AppletBuilder[] => {
  return appletIds
    .map(id => selectAppletById(state, id))
    .filter((applet): applet is AppletBuilder => applet !== null);
};

// Selector for applets associated with a specific app ID
export const selectAppletsByAppId = (state: RootState, appId: string): AppletBuilder[] => {
  return selectAllApplets(state).filter(applet => applet.appId === appId);
};

// Selector for applets without an app assignment
export const selectUnassignedApplets = (state: RootState): AppletBuilder[] => {
  return selectAllApplets(state).filter(applet => !applet.appId);
}; 
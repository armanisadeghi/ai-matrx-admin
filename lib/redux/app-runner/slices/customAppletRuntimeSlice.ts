import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';
import { 
  AppletLayoutOption, 
  AppletContainer, 
  BrokerMapping,
  CustomAppletConfig 
} from '@/types/customAppTypes';

interface CustomAppletRuntimeState {
  applets: Record<string, CustomAppletConfig>;
  activeAppletId: string | null;
  status: 'uninitialized' | 'loading' | 'initialized';
  isDebug: boolean;
  isDemo: boolean;
}

const initialState: CustomAppletRuntimeState = {
  applets: {},
  activeAppletId: null,
  status: 'uninitialized',
  isDebug: false,
  isDemo: false,
};

const customAppletRuntimeSlice = createSlice({
  name: 'customAppletRuntime',
  initialState,
  reducers: {
    setAppletRuntimeConfig: (state, action: PayloadAction<{ applets: CustomAppletConfig[]; activeAppletId: string | null }>) => {
      state.applets = action.payload.applets.reduce((acc, applet) => {
        acc[applet.id] = applet;
        return acc;
      }, {} as Record<string, CustomAppletConfig>);
      state.activeAppletId = action.payload.activeAppletId;
      state.status = 'initialized';
    },
    setAppletRuntimeLoading: (state) => {
      state.status = 'loading';
    },
    resetAppletRuntimeConfig: (state) => {
      state.applets = {};
      state.activeAppletId = null;
      state.status = 'uninitialized';
    },
    setActiveAppletId: (state, action: PayloadAction<string>) => {
      state.activeAppletId = action.payload;
    },
  },
});

export const { 
  setAppletRuntimeConfig, 
  setAppletRuntimeLoading, 
  resetAppletRuntimeConfig,
  setActiveAppletId
} = customAppletRuntimeSlice.actions;

// Selectors
export const selectAppletRuntimeApplets = (state: RootState) => state.customAppletRuntime.applets;
export const selectAppletRuntimeStatus = (state: RootState) => state.customAppletRuntime.status;
export const selectAppletRuntimeIsInitialized = (state: RootState) => state.customAppletRuntime.status === 'initialized';
export const selectAppletRuntimeIsDebug = (state: RootState) => state.customAppletRuntime.isDebug;
export const selectAppletRuntimeIsDemo = (state: RootState) => state.customAppletRuntime.isDemo;
export const selectAppletRuntimeActiveAppletId = (state: RootState) => state.customAppletRuntime.activeAppletId;
export const selectAppletRuntimeActiveApplet = (state: RootState) => {
  const activeId = state.customAppletRuntime.activeAppletId;
  return activeId ? state.customAppletRuntime.applets[activeId] : null;
};

export const selectAppletRuntimeById = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId];

// Select applet by slug
export const selectAppletRuntimeBySlug = (state: RootState, slug: string) => {
  const applets = state.customAppletRuntime.applets;
  return Object.values(applets).find(applet => applet.slug === slug) || null;
};

export const selectAppletRuntimeName = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.name;
export const selectAppletRuntimeDescription = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.description;
export const selectAppletRuntimeSlug = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.slug;
export const selectAppletRuntimeAppletIcon = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.appletIcon;
export const selectAppletRuntimeAppletSubmitText = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.appletSubmitText;
export const selectAppletRuntimeCreator = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.creator;
export const selectAppletRuntimePrimaryColor = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.primaryColor;
export const selectAppletRuntimeAccentColor = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.accentColor;
export const selectAppletRuntimeLayoutType = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.layoutType;
export const selectAppletRuntimeContainers = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.containers;
export const selectAppletRuntimeDataSourceConfig = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.dataSourceConfig;
export const selectAppletRuntimeBrokerMap = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.brokerMap;
export const selectAppletRuntimeResultComponentConfig = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.resultComponentConfig;
export const selectAppletRuntimeNextStepConfig = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.nextStepConfig;
export const selectAppletRuntimeCompiledRecipeId = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.compiledRecipeId;
export const selectAppletRuntimeSubcategoryId = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.subcategoryId;
export const selectAppletRuntimeImageUrl = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.imageUrl;
export const selectAppletRuntimeAppId = (state: RootState, appletId: string) => state.customAppletRuntime.applets[appletId]?.appId;


export const selectActiveApplet = (state: RootState) => state.customAppletRuntime.activeAppletId 
  ? state.customAppletRuntime.applets[state.customAppletRuntime.activeAppletId] 
  : null;

export const selectActiveAppletName = (state: RootState) => selectActiveApplet(state)?.name;
export const selectActiveAppletDescription = (state: RootState) => selectActiveApplet(state)?.description;
export const selectActiveAppletSlug = (state: RootState) => selectActiveApplet(state)?.slug;
export const selectActiveAppletIcon = (state: RootState) => selectActiveApplet(state)?.appletIcon;
export const selectActiveAppletSubmitText = (state: RootState) => selectActiveApplet(state)?.appletSubmitText;
export const selectActiveAppletCreator = (state: RootState) => selectActiveApplet(state)?.creator;
export const selectActiveAppletPrimaryColor = (state: RootState) => selectActiveApplet(state)?.primaryColor;
export const selectActiveAppletAccentColor = (state: RootState) => selectActiveApplet(state)?.accentColor;
export const selectActiveAppletLayoutType = (state: RootState) => selectActiveApplet(state)?.layoutType;
export const selectActiveAppletContainers = (state: RootState) => selectActiveApplet(state)?.containers;
export const selectActiveAppletDataSourceConfig = (state: RootState) => selectActiveApplet(state)?.dataSourceConfig;
export const selectActiveAppletBrokerMap = (state: RootState) => selectActiveApplet(state)?.brokerMap;
export const selectActiveAppletResultComponentConfig = (state: RootState) => selectActiveApplet(state)?.resultComponentConfig;
export const selectActiveAppletNextStepConfig = (state: RootState) => selectActiveApplet(state)?.nextStepConfig;
export const selectActiveAppletCompiledRecipeId = (state: RootState) => selectActiveApplet(state)?.compiledRecipeId;
export const selectActiveAppletSubcategoryId = (state: RootState) => selectActiveApplet(state)?.subcategoryId;
export const selectActiveAppletImageUrl = (state: RootState) => selectActiveApplet(state)?.imageUrl;
export const selectActiveAppletAppId = (state: RootState) => selectActiveApplet(state)?.appId;

export default customAppletRuntimeSlice.reducer;
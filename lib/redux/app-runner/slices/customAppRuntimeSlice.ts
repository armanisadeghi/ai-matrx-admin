import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';
import { 
  AppLayoutOptions,
  CustomAppConfig
} from '@/types/customAppTypes';

interface CustomAppRuntimeState {
  config: CustomAppConfig | null;
  status: 'uninitialized' | 'loading' | 'initialized';
  isDebug: boolean;
  isDemo: boolean;
}

const initialState: CustomAppRuntimeState = {
  config: null,
  status: 'uninitialized',
  isDebug: false,
  isDemo: false,
};

const customAppRuntimeSlice = createSlice({
  name: 'customAppRuntime',
  initialState,
  reducers: {
    setAppRuntimeConfig: (state, action: PayloadAction<CustomAppConfig>) => {
      state.config = action.payload;
      state.status = 'initialized';
    },
    setAppRuntimeLoading: (state) => {
      state.status = 'loading';
    },
    resetAppRuntimeConfig: (state) => {
      state.config = null;
      state.status = 'uninitialized';
    },
  },
});

export const { setAppRuntimeConfig, setAppRuntimeLoading, resetAppRuntimeConfig } = customAppRuntimeSlice.actions;

// Selectors
export const selectAppRuntimeConfig = (state: RootState) => state.customAppRuntime.config;
export const selectAppRuntimeStatus = (state: RootState) => state.customAppRuntime.status;
export const selectAppRuntimeIsInitialized = (state: RootState) => state.customAppRuntime.status === 'initialized';
export const selectAppRuntimeIsDebug = (state: RootState) => state.customAppRuntime.isDebug;
export const selectAppRuntimeIsDemo = (state: RootState) => state.customAppRuntime.isDemo;

export const selectAppRuntimeId = (state: RootState) => state.customAppRuntime.config?.id;
export const selectAppRuntimeName = (state: RootState) => state.customAppRuntime.config?.name;
export const selectAppRuntimeDescription = (state: RootState) => state.customAppRuntime.config?.description;
export const selectAppRuntimeSlug = (state: RootState) => state.customAppRuntime.config?.slug;
export const selectAppRuntimeMainAppIcon = (state: RootState) => state.customAppRuntime.config?.mainAppIcon;
export const selectAppRuntimeMainAppSubmitIcon = (state: RootState) => state.customAppRuntime.config?.mainAppSubmitIcon;
export const selectAppRuntimeCreator = (state: RootState) => state.customAppRuntime.config?.creator;
export const selectAppRuntimeCoreBackgroundColor = (state: RootState) => state.customAppRuntime.config?.primaryColor;
export const selectAppRuntimePrimaryColor = (state: RootState) => state.customAppRuntime.config?.primaryColor;
export const selectAppRuntimeAccentColor = (state: RootState) => state.customAppRuntime.config?.accentColor;
export const selectAppRuntimeAppletList = (state: RootState) => state.customAppRuntime.config?.appletList;
export const selectAppRuntimeExtraButtons = (state: RootState) => state.customAppRuntime.config?.extraButtons;
export const selectAppRuntimeLayoutType = (state: RootState) => state.customAppRuntime.config?.layoutType;
export const selectAppRuntimeImageUrl = (state: RootState) => state.customAppRuntime.config?.imageUrl;

export default customAppRuntimeSlice.reducer;
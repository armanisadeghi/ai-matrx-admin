import { AppThunk } from "@/lib/redux/store";
import { componentDefinitionsSlice } from "../slices/componentDefinitionsSlice";
import { brokerValuesSlice } from "../slices/brokerValuesSlice";
import { fetchAppConfig } from "@/lib/redux/applets/service/applet-service";
import { CustomAppRuntimeConfig } from "@/features/applet/builder/builder.types";
import { loadApplet } from "./loadApplet";

interface LoadAppResult {
    success: boolean;
    appConfig?: CustomAppRuntimeConfig;
    appletResults?: Array<{ appletId: string; success: boolean; componentInstances?: any[] }>;
    error?: string;
}

export const loadApp =
    ({ slug, id, clearExisting = true }: { slug?: string; id?: string; clearExisting?: boolean }): AppThunk<Promise<LoadAppResult>> =>
    async (dispatch) => {
        try {
            dispatch(componentDefinitionsSlice.actions.setLoading(true));
            dispatch(brokerValuesSlice.actions.setLoading(true));

            // 1. Fetch app configuration
            const { appConfig, applets, compiledRecipes } = await fetchAppConfig({ slug, id });
            const appId = appConfig.id;

            // 2. Clear existing state if requested
            if (clearExisting) {
                dispatch(componentDefinitionsSlice.actions.clearAppConfig(appId));
                dispatch(brokerValuesSlice.actions.clearNeededBrokers(appId));
            }

            // 3. Store app configuration
            dispatch(componentDefinitionsSlice.actions.setAppConfig({ appId, config: appConfig }));

            // 4. Load all applets and add recipe brokers to neededBrokers
            const appletResults = [];
            for (const applet of applets || []) {
                const appletId = applet.id || "";
                // Load applet
                const result = await dispatch(loadApplet({ appId, applet }));

                // Add recipe brokers to neededBrokers
                const recipe = compiledRecipes[appletId];
                if (recipe && recipe.brokers) {
                    const brokerIds = Object.values(recipe.brokers).map((broker) => broker.id);
                    dispatch(brokerValuesSlice.actions.addNeededBrokers({ appId, brokerIds }));
                }

                appletResults.push({
                    appletId,
                    success: result.success,
                    componentInstances: result.componentInstances,
                });
            }

            dispatch(componentDefinitionsSlice.actions.setLoading(false));
            dispatch(brokerValuesSlice.actions.setLoading(false));

            return {
                success: true,
                appConfig,
                appletResults,
            };
        } catch (error: any) {
            console.error("Error loading app:", error);
            dispatch(componentDefinitionsSlice.actions.setError(error.message));
            dispatch(brokerValuesSlice.actions.setError(error.message));
            dispatch(componentDefinitionsSlice.actions.setLoading(false));
            dispatch(brokerValuesSlice.actions.setLoading(false));
            return {
                success: false,
                error: error.message,
            };
        }
    };
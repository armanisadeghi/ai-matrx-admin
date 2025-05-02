import { CustomAppRuntimeConfig, CustomApplet } from "@/features/applet/builder/builder.types"; // Adjust import based on your types file
import { createClient } from "@/utils/supabase/client";
import { RuntimeCompiledRecipe, RuntimeBrokerDefinition } from "../types";


/**
 * Interface for the combined app config and applets output
 */
export interface AppWithApplets {
    appConfig: CustomAppRuntimeConfig;
    applets: CustomApplet[];
    compiledRecipes: Record<string, RuntimeCompiledRecipe>;
}

/**
 * Transforms a raw broker object to a consistent RuntimeBrokerDefinition format
 * Handles both snake_case and camelCase properties
 */
function transformBroker(broker: any): RuntimeBrokerDefinition {
    if (!broker || typeof broker !== "object") {
        return {
            id: "",
            name: "",
            dataType: "",
            defaultValue: null,
        };
    }

    return {
        id: typeof broker.id === "string" ? broker.id : "",
        name: typeof broker.name === "string" ? broker.name : "",
        // Handle dataType in either snake_case or camelCase
        dataType: typeof broker.dataType === "string" ? broker.dataType : typeof broker.data_type === "string" ? broker.data_type : "",
        // Handle defaultValue in either snake_case or camelCase
        defaultValue:
            broker.defaultValue !== undefined ? broker.defaultValue : broker.default_value !== undefined ? broker.default_value : null,
    };
}

/**
 * Transforms a raw compiled recipes object to a structured Record of RuntimeCompiledRecipe objects
 */
function transformCompiledRecipes(rawCompiledRecipes: any): Record<string, RuntimeCompiledRecipe> {
    if (!rawCompiledRecipes || typeof rawCompiledRecipes !== "object") {
        return {};
    }

    const result: Record<string, RuntimeCompiledRecipe> = {};

    // Iterate through each applet ID and its associated recipe
    Object.keys(rawCompiledRecipes).forEach((appletId) => {
        const rawRecipe = rawCompiledRecipes[appletId];

        if (!rawRecipe || typeof rawRecipe !== "object") {
            return;
        }

        // Extract and transform brokers
        const rawBrokers = rawRecipe.brokers;
        const transformedBrokers: Record<string, RuntimeBrokerDefinition> = {};

        // Handle brokers being either an array or an object
        if (Array.isArray(rawBrokers)) {
            // If brokers is an array, transform each broker and use its ID as the key
            rawBrokers.forEach((broker) => {
                if (broker && typeof broker === "object" && broker.id) {
                    transformedBrokers[broker.id] = transformBroker(broker);
                }
            });
        } else if (rawBrokers && typeof rawBrokers === "object") {
            // If brokers is already an object with keys, transform each broker
            Object.keys(rawBrokers).forEach((brokerId) => {
                transformedBrokers[brokerId] = transformBroker(rawBrokers[brokerId]);
            });
        }

        result[appletId] = {
            id: typeof rawRecipe.id === "string" ? rawRecipe.id : "",
            recipe_id: typeof rawRecipe.recipe_id === "string" ? rawRecipe.recipe_id : "",
            version: typeof rawRecipe.version === "number" ? rawRecipe.version : 0,
            brokers: transformedBrokers,
        };
    });

    return result;
}

/**
 * Safely transforms raw app config and applets data into a structure containing CustomAppRuntimeConfig and CustomApplet array.
 * @param rawConfig - The raw configuration object from the API or data source
 * @returns An AppWithApplets object containing transformed app config and applets
 */
export function transformAppWithApplets(rawConfig: any): AppWithApplets {
    // Safely extract app_config, defaulting to empty object if undefined
    const config = rawConfig?.app_config || {};

    // Safely extract applets, defaulting to empty array if undefined
    const rawApplets: any[] = Array.isArray(rawConfig?.applets) ? rawConfig.applets : [];

    // Safely extract compiled_recipes, defaulting to empty object if undefined
    const rawCompiledRecipes = rawConfig?.compiled_recipes || {};

    // Transform applets into CustomApplet structures
    const applets: CustomApplet[] = rawApplets.map((applet) => ({
        id: typeof applet?.id === "string" && applet.id.trim() !== "" ? applet.id : undefined,
        name: typeof applet?.name === "string" && applet.name.trim() !== "" ? applet.name : "Unnamed Applet",
        description: typeof applet?.description === "string" ? applet.description : undefined,
        slug: typeof applet?.slug === "string" && applet.slug.trim() !== "" ? applet.slug : "",
        appletIcon: typeof applet?.applet_icon === "string" ? applet.applet_icon : undefined,
        appletSubmitText: typeof applet?.applet_submit_text === "string" ? applet.applet_submit_text : undefined,
        creator: typeof applet?.creator === "string" ? applet.creator : undefined,
        primaryColor: typeof applet?.primary_color === "string" ? applet.primary_color : undefined,
        accentColor: typeof applet?.accent_color === "string" ? applet.accent_color : undefined,
        layoutType: typeof applet?.layout_type === "string" ? applet.layout_type : undefined,
        containers: Array.isArray(applet?.containers) ? applet.containers : undefined,
        dataSourceConfig: applet?.data_source_config !== undefined ? applet.data_source_config : undefined,
        resultComponentConfig: applet?.result_component_config !== undefined ? applet.result_component_config : undefined,
        nextStepConfig: applet?.next_step_config !== undefined ? applet.next_step_config : undefined,
        compiledRecipeId: typeof applet?.compiled_recipe_id === "string" ? applet.compiled_recipe_id : undefined,
        subcategoryId: typeof applet?.subcategory_id === "string" ? applet.subcategory_id : undefined,
        imageUrl: typeof applet?.image_url === "string" ? applet.image_url : undefined,
    }));

    // Generate appletList from applets array, ensuring valid id and name
    const appletList = applets
        .filter(
            (applet): applet is CustomApplet & { id: string; name: string } =>
                typeof applet?.id === "string" && typeof applet?.name === "string" && applet.id.trim() !== "" && applet.name.trim() !== ""
        )
        .map((applet) => ({
            appletId: applet.id,
            label: applet.name,
        }));

    // Construct the transformed app config
    const appConfig: CustomAppRuntimeConfig = {
        id: typeof config.id === "string" && config.id.trim() !== "" ? config.id : "",
        name: typeof config.name === "string" && config.name.trim() !== "" ? config.name : "Unnamed App",
        description: typeof config.description === "string" ? config.description : "",
        slug: typeof config.slug === "string" && config.slug.trim() !== "" ? config.slug : "",
        mainAppIcon: typeof config.main_app_icon === "string" ? config.main_app_icon : undefined,
        mainAppSubmitIcon: typeof config.main_app_submit_icon === "string" ? config.main_app_submit_icon : undefined,
        creator: typeof config.creator === "string" ? config.creator : undefined,
        primaryColor: typeof config.primary_color === "string" ? config.primary_color : undefined,
        accentColor: typeof config.accent_color === "string" ? config.accent_color : undefined,
        appletList: appletList.length > 0 ? appletList : undefined,
        extraButtons: Array.isArray(config.extra_buttons)
            ? config.extra_buttons
                  .filter(
                      (btn: any) =>
                          typeof btn?.label === "string" &&
                          typeof btn?.actionType === "string" &&
                          typeof btn?.knownMethod === "string" &&
                          btn.label.trim() !== "" &&
                          btn.actionType.trim() !== "" &&
                          btn.knownMethod.trim() !== ""
                  )
                  .map((btn: any) => ({
                      label: btn.label,
                      actionType: btn.actionType,
                      knownMethod: btn.knownMethod,
                  }))
            : undefined,
        layoutType: typeof config.layout_type === "string" ? config.layout_type : undefined,
        imageUrl: typeof config.image_url === "string" ? config.image_url : undefined,
    };

    // Transform compiled recipes
    const compiledRecipes = transformCompiledRecipes(rawCompiledRecipes);

    return {
        appConfig,
        applets,
        compiledRecipes,
    };
}

const supabase = createClient();

/**
 * Fetches and transforms app config and applets by slug.
 * @param slug - The slug of the app (e.g., 'travel-manager')
 * @returns A Promise resolving to the transformed AppWithApplets
 * @throws Error if the fetch or transformation fails
 */
export async function fetchAppConfigBySlug(slug: string): Promise<AppWithApplets> {
    try {
        const { data, error } = await supabase.rpc("get_custom_app_with_applets", { app_id: null, app_slug: slug });

        if (error) {
            throw new Error(`Failed to fetch app config by slug: ${error.message}`);
        }

        if (!data) {
            throw new Error("No app config data returned for the provided slug");
        }

        return transformAppWithApplets(data);
    } catch (err) {
        throw new Error(`Error fetching app config by slug: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
}

/**
 * Fetches and transforms app config and applets by ID.
 * @param id - The ID of the app (e.g., '12b995eb-5baa-4754-87e1-8d27b0a9ff9c')
 * @returns A Promise resolving to the transformed AppWithApplets
 * @throws Error if the fetch or transformation fails
 */
export async function fetchAppConfigById(id: string): Promise<AppWithApplets> {
    try {
        const { data, error } = await supabase.rpc("get_custom_app_with_applets", { app_id: id, app_slug: null });

        if (error) {
            throw new Error(`Failed to fetch app config by ID: ${error.message}`);
        }

        if (!data) {
            throw new Error("No app config data returned for the provided ID");
        }

        return transformAppWithApplets(data);
    } catch (err) {
        throw new Error(`Error fetching app config by ID: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
}

/**
 * Fetches and transforms app config and applets using either a slug or an ID.
 * Prefers slug if both are provided.
 * @param params - Object containing optional slug and/or id
 * @returns A Promise resolving to the transformed AppWithApplets
 * @throws Error if neither slug nor id is provided, or if the fetch fails
 */
export async function fetchAppConfig({ slug, id }: { slug?: string; id?: string }): Promise<AppWithApplets> {
    if (!slug && !id) {
        throw new Error("Either slug or id must be provided to fetch app config");
    }

    // Prefer slug if both are provided, as it's the most common use case
    if (slug) {
        return fetchAppConfigBySlug(slug);
    }

    // Fallback to ID if slug is not provided
    return fetchAppConfigById(id!);
}

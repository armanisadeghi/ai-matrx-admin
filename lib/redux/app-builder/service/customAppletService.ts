import { isSlugInUse } from "@/config/applets/apps/constants";
import { AppletContainer, CustomAppletConfig } from "@/features/applet/builder/builder.types";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";
import { supabase } from "@/utils/supabase/client";
import { RuntimeCompiledRecipe } from "../../applets/types";

export type CustomAppletConfigDB = {
    id: string;
    created_at?: string;
    updated_at?: string;
    name: string;
    description?: string;
    slug: string;
    applet_icon?: string;
    applet_submit_text?: string;
    creator?: string;
    primary_color?: string;
    accent_color?: string;
    layout_type?: AppletLayoutOption;
    containers?: AppletContainer[];
    data_source_config?: any;
    result_component_config?: any;
    next_step_config?: any;
    user_id?: string;
    is_public?: boolean;
    authenticated_read?: boolean;
    public_read?: boolean;
    compiled_recipe_id?: string;
    subcategory_id?: string;
    image_url?: string;
    app_id?: string;
};


/**
 * Normalizes a CustomAppletConfig to ensure it has all required fields
 */
export const normalizeCustomAppletConfig = (config: Partial<CustomAppletConfig>): CustomAppletConfig => {
    return {
        id: config.id || "",
        name: config.name || "",
        description: config.description || "",
        slug: config.slug || "",
        appletIcon: config.appletIcon || "SiCodemagic",
        appletSubmitText: config.appletSubmitText || null,
        creator: config.creator || null,
        primaryColor: config.primaryColor || "gray",
        accentColor: config.accentColor || "rose",
        layoutType: config.layoutType || "flat",
        containers: config.containers || [],
        dataSourceConfig: config.dataSourceConfig || null,
        resultComponentConfig: config.resultComponentConfig || null,
        nextStepConfig: config.nextStepConfig || null,
        compiledRecipeId: config.compiledRecipeId || null,
        subcategoryId: config.subcategoryId || null,
        imageUrl: config.imageUrl || null,
        appId: config.appId || null,
    };
};

/**
 * Converts a CustomAppletConfig to the database format
 */
export const appletConfigToDBFormat = async (
    config: CustomAppletConfig
): Promise<Omit<CustomAppletConfigDB, "created_at" | "updated_at">> => {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    return {
        id: config.id || null,
        name: config.name,
        description: config.description || null,
        slug: config.slug,
        applet_icon: config.appletIcon || null,
        applet_submit_text: config.appletSubmitText || null,
        creator: config.creator || null,
        primary_color: config.primaryColor || null,
        accent_color: config.accentColor || null,
        layout_type: config.layoutType || null,
        containers: config.containers || null,
        data_source_config: config.dataSourceConfig || null,
        result_component_config: config.resultComponentConfig || null,
        next_step_config: config.nextStepConfig || null,
        user_id: userId,
        is_public: false,
        authenticated_read: true,
        public_read: false,
        compiled_recipe_id: config.compiledRecipeId || null,
        subcategory_id: config.subcategoryId || null,
        image_url: config.imageUrl || null,
        app_id: config.appId || null,
    };
};

/**
 * Converts a database record to a CustomAppletConfig
 */
export const dbToAppletConfig = (dbRecord: CustomAppletConfigDB): CustomAppletConfig => {
    return normalizeCustomAppletConfig({
        id: dbRecord.id,
        name: dbRecord.name,
        description: dbRecord.description,
        slug: dbRecord.slug,
        appletIcon: dbRecord.applet_icon,
        appletSubmitText: dbRecord.applet_submit_text,
        creator: dbRecord.creator,
        primaryColor: dbRecord.primary_color,
        accentColor: dbRecord.accent_color,
        layoutType: dbRecord.layout_type,
        containers: dbRecord.containers,
        dataSourceConfig: dbRecord.data_source_config,
        resultComponentConfig: dbRecord.result_component_config,
        nextStepConfig: dbRecord.next_step_config,
        compiledRecipeId: dbRecord.compiled_recipe_id,
        subcategoryId: dbRecord.subcategory_id,
        imageUrl: dbRecord.image_url,
        appId: dbRecord.app_id,
    });
};

/**
 * Fetches all custom applet configs for the current user
 */
export const getAllCustomAppletConfigs = async (): Promise<CustomAppletConfig[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("user_id", userId);
    if (error) {
        console.error("Error fetching custom applet configs:", error);
        throw error;
    }
    return (data || []).map(dbToAppletConfig);
};

/**
 * Fetches a specific custom applet config by ID
 */
export const getCustomAppletConfigById = async (id: string): Promise<CustomAppletConfig | null> => {
    const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("id", id).single();
    if (error) {
        if (error.code === "PGRST116") {
            return null;
        }
        console.error("Error fetching custom applet config:", error);
        throw error;
    }
    return data ? dbToAppletConfig(data) : null;
};

/**
 * Creates a new custom applet config
 */
export const createCustomAppletConfig = async (config: CustomAppletConfig): Promise<CustomAppletConfig> => {
    const dbData = await appletConfigToDBFormat(config);

    console.log("Creating custom applet config with data:", JSON.stringify(dbData, null, 2));

    try {
        const { data, error } = await supabase.from("custom_applet_configs").insert(dbData).select().single();
        if (error) {
            console.error("Error creating custom applet config:", error.message, error.details, error.hint);
            throw error;
        }
        if (!data) {
            throw new Error("No data returned from insert operation");
        }
        return dbToAppletConfig(data);
    } catch (err) {
        console.error("Exception in createCustomAppletConfig:", err);
        throw err;
    }
};

/**
 * Updates an existing custom applet config
 */
export const updateCustomAppletConfig = async (id: string, config: Partial<CustomAppletConfig>): Promise<CustomAppletConfig> => {
    const dbData = await appletConfigToDBFormat(config as CustomAppletConfig);

    try {
        const { data, error } = await supabase.from("custom_applet_configs").update(dbData).eq("id", id).select().single();
        if (error) {
            console.error("Error updating custom applet config:", error.message, error.details, error.hint);
            throw error;
        }
        if (!data) {
            throw new Error("No data returned from update operation");
        }
        return dbToAppletConfig(data);
    } catch (err) {
        console.error("Exception in updateCustomAppletConfig:", err);
        throw err;
    }
};

/**
 * Deletes a custom applet config
 */
export const deleteCustomAppletConfig = async (id: string): Promise<void> => {
    const { error } = await supabase.from("custom_applet_configs").delete().eq("id", id);
    if (error) {
        console.error("Error deleting custom applet config:", error);
        throw error;
    }
};

/**
 * Duplicates a custom applet config
 */
export const duplicateCustomAppletConfig = async (id: string): Promise<CustomAppletConfig> => {
    const config = await getCustomAppletConfigById(id);

    if (!config) {
        throw new Error(`Custom applet config with id ${id} not found`);
    }

    const dbData = await appletConfigToDBFormat(config);
    dbData.name = `${dbData.name} (Copy)`;
    dbData.slug = `${dbData.slug}-copy-${Date.now()}`;

    const { data, error } = await supabase.from("custom_applet_configs").insert(dbData).select().single();
    if (error) {
        console.error("Error duplicating custom applet config:", error);
        throw error;
    }
    return dbToAppletConfig(data);
};

/**
 * Fetches public custom applet configs
 */
export const getPublicCustomAppletConfigs = async (): Promise<CustomAppletConfig[]> => {
    const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("is_public", true);
    if (error) {
        console.error("Error fetching public custom applet configs:", error);
        throw error;
    }
    return (data || []).map(dbToAppletConfig);
};

/**
 * Make a custom applet config public or private
 */
export const setCustomAppletConfigPublic = async (id: string, isPublic: boolean): Promise<void> => {
    const { error } = await supabase.from("custom_applet_configs").update({ is_public: isPublic }).eq("id", id);
    if (error) {
        console.error("Error updating custom applet config visibility:", error);
        throw error;
    }
};

/**
 * Fetches a custom applet config by slug
 */
export const getCustomAppletConfigBySlug = async (slug: string): Promise<CustomAppletConfig | null> => {
    const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("slug", slug).single();
    if (error) {
        if (error.code === "PGRST116") {
            return null;
        }
        console.error("Error fetching custom applet config by slug:", error);
        throw error;
    }
    return data ? dbToAppletConfig(data) : null;
};

/**
 * Fetches custom applet configs by subcategory
 */
export const getCustomAppletConfigsBySubcategory = async (subcategoryId: string): Promise<CustomAppletConfig[]> => {
    const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("subcategory_id", subcategoryId);
    if (error) {
        console.error("Error fetching custom applet configs by subcategory:", error);
        throw error;
    }
    return (data || []).map(dbToAppletConfig);
};

/**
 * Fetches custom applet configs by compiled recipe
 */
export const getCustomAppletConfigsByCompiledRecipe = async (compiledRecipeId: string): Promise<CustomAppletConfig[]> => {
    const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("compiled_recipe_id", compiledRecipeId);
    if (error) {
        console.error("Error fetching custom applet configs by compiled recipe:", error);
        throw error;
    }
    return (data || []).map(dbToAppletConfig);
};

/**
 * Type for recipe information
 */
export type RecipeInfo = {
    id: string;
    name: string;
    description?: string;
    version: number;
    status: string;
    post_result_options?: Record<string, unknown>;
    tags?: {
        tags: string[];
    }
};

/**
 * Fetches all recipes for the current user
 */
export const getUserRecipes = async (): Promise<RecipeInfo[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
        .from("recipe")
        .select("id, name, description, version, status, tags")
        .eq("user_id", userId)
        .order("name");

    if (error) {
        console.error("Error fetching user recipes:", error);
        throw error;
    }

    return data as RecipeInfo[];
};

/**
 * Fetches a specific compiled recipe by recipe ID and version
 */
export const getCompiledRecipeByVersion = async (recipeId: string, version?: number): Promise<string | null> => {
    let query = supabase.from("compiled_recipe").select("id, recipe_id, version").eq("recipe_id", recipeId);

    if (version) {
        query = query.eq("version", version);
    } else {
        query = query.order("version", { ascending: false }).limit(1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching compiled recipe:", error);
        throw error;
    }

    return data && data.length > 0 ? data[0].id : null;
};

/**
 * Checks if a specific version of a compiled recipe exists
 */
export const checkCompiledRecipeVersionExists = async (recipeId: string, version: number): Promise<boolean> => {
    const { data, error } = await supabase
        .from("compiled_recipe")
        .select("id")
        .eq("recipe_id", recipeId)
        .eq("version", version)
        .maybeSingle();

    if (error) {
        console.error("Error checking compiled recipe version:", error);
        throw error;
    }

    return !!data;
};

export const getCompiledRecipeById = async (id: string): Promise<RuntimeCompiledRecipe | null> => {
    const { data, error } = await supabase.from("compiled_recipe").select("*").eq("id", id).single();
    if (error) {
        console.error("Error fetching compiled recipe:", error);
        throw error;
    }
    return data ? data : null;
};



export interface NeededBroker {
    id: string;
    name: string;
    required: boolean;
    dataType: string;
    defaultValue: string;
}

export interface CompiledRecipeWithNeededBrokers {
    id: string;
    compiledId: string;
    version: number;
    neededBrokers: NeededBroker[];
}

export interface WorkflowSourceConfig {
    sourceType: "workflow";
    id: string;
    workflowId: string;
    [key: string]: any;
}

export interface ApiSourceConfig {
    sourceType: "api";
    id: string;
    [key: string]: any;
}

export interface DatabaseSourceConfig {
    sourceType: "database";
    id: string;
    [key: string]: any;
}

export interface OtherSourceConfig {
    sourceType: "other";
    id: string;
    [key: string]: any;
}

export interface AppletSourceConfig {
    sourceType: "recipe" | "workflow" | "api" | "database" | "other" | string;
    config: CompiledRecipeWithNeededBrokers | WorkflowSourceConfig | ApiSourceConfig | DatabaseSourceConfig | OtherSourceConfig;
}

const convertDbResponseForSourceConfigs = (data: any) => {
    const compiled_id = data.id;
    const recipe_id = data.recipe_id;
    const version = data.version;
    const compiled_data = data.compiled_recipe;
    const raw_brokers = compiled_data.brokers || [];

    const needed_brokers = raw_brokers.map((broker: any) => {
        return {
            id: broker.id,
            name: broker.name || "Name Missing",
            required: broker.required || true,
            dataType: broker.data_type || null,
            defaultValue: broker.default_value || null,
            inputComponent: broker.inputComponent || null,
        }
    });

    return {
        sourceType: "recipe",
        config: {
            id: recipe_id,
            compiledId: compiled_id,
            version: version,
            neededBrokers: needed_brokers,
        }
    }
}


/**
 * Fetches a specific compiled recipe by recipe ID and version
 */
export const getCompiledRecipeByVersionWithNeededBrokers = async (recipeId: string, version?: number): Promise<AppletSourceConfig | null> => {
    let query = supabase.from("compiled_recipe").select("*").eq("recipe_id", recipeId);

    if (version) {
        query = query.eq("version", version);
    } else {
        query = query.order("version", { ascending: false }).limit(1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching compiled recipe:", error);
        throw error;
    }
    console.log("data", data);

    return convertDbResponseForSourceConfigs(data[0]);
};




/**
 * Adds Containers to an applet as containers
 */
export const addContainersToApplet = async (appletId: string, groupIds: string[]): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc("add_groups_to_applet", {
            p_applet_id: appletId,
            p_group_ids: groupIds,
        });

        if (error) {
            console.error("Error adding containers to applet:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in addContainersToApplet:", err);
        throw err;
    }
};

/**
 * Recompiles a single group in an applet
 */
export const recompileContainerInAppletById = async (appletId: string, groupId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc("refresh_group_in_applet", {
            p_applet_id: appletId,
            p_group_id: groupId,
        });

        if (error) {
            console.error("Error recompiling group in applet:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in recompileGroupInAppletById:", err);
        throw err;
    }
};

/**
 * Recompiles all groups in an applet
 */
export const recompileAllContainersInApplet = async (appletId: string): Promise<boolean> => {
    try {
        console.log("Recompiling all containers in applet:", appletId);
        const { data, error } = await supabase.rpc("refresh_all_groups_in_applet", {
            p_applet_id: appletId,
        });

        console.log("Recompiled all containers in applet:", data);
        
        if (error) {
            console.error("Error recompiling all groups in applet:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in recompileAllGroupsInApplet:", err);
        throw err;
    }
};

/**
 * Gets an applet by ID with properly formatted containers
 */
export const getAppletById = async (id: string): Promise<CustomAppletConfig | null> => {
    try {
        const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("id", id).single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }
            console.error("Error fetching applet:", error);
            throw error;
        }

        if (!data) return null;

        const camelCaseApplet: CustomAppletConfig = {
            id: data.id,
            name: data.name,
            description: data.description,
            slug: data.slug,
            appletIcon: data.applet_icon,
            appletSubmitText: data.applet_submit_text,
            creator: data.creator,
            primaryColor: data.primary_color,
            accentColor: data.accent_color,
            layoutType: data.layout_type,
            containers: data.containers || [],
            dataSourceConfig: data.data_source_config,
            resultComponentConfig: data.result_component_config,
            nextStepConfig: data.next_step_config,
            compiledRecipeId: data.compiled_recipe_id,
            subcategoryId: data.subcategory_id,
            imageUrl: data.image_url,
            appId: data.app_id,
        };

        return camelCaseApplet;
    } catch (err) {
        console.error("Exception in getAppletById:", err);
        throw err;
    }
};

/**
 * Fetches all applets for the current user
 */
export const getAllApplets = async (): Promise<CustomAppletConfig[]> => {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
            throw new Error("User not authenticated");
        }

        const { data, error } = await supabase.from("custom_applet_configs").select("*").eq("user_id", userId);

        if (error) {
            console.error("Error fetching applets:", error);
            throw error;
        }

        const camelCaseApplets: CustomAppletConfig[] = (data || []).map((applet) => ({
            id: applet.id,
            name: applet.name,
            description: applet.description,
            slug: applet.slug,
            appletIcon: applet.applet_icon,
            appletSubmitText: applet.applet_submit_text,
            creator: applet.creator,
            primaryColor: applet.primary_color,
            accentColor: applet.accent_color,
            layoutType: applet.layout_type,
            containers: applet.containers || [],
            dataSourceConfig: applet.data_source_config,
            resultComponentConfig: applet.result_component_config,
            nextStepConfig: applet.next_step_config,
            compiledRecipeId: applet.compiled_recipe_id,
            subcategoryId: applet.subcategory_id,
            imageUrl: applet.image_url,
            appId: applet.app_id,
        }));

        return camelCaseApplets;
    } catch (err) {
        console.error("Exception in getAllApplets:", err);
        throw err;
    }
};

/**
 * Fetches custom applet configs by app ID
 */
export const getCustomAppletConfigsByAppId = async (appId: string): Promise<CustomAppletConfig[]> => {
    const { data, error } = await supabase
        .from('custom_applet_configs')
        .select('*')
        .eq('app_id', appId);
    if (error) {
        console.error('Error fetching custom applet configs by app ID:', error);
        throw error;
    }
    return (data || []).map(dbToAppletConfig);
};

export const isAppletSlugAvailable = async (slug: string, excludeId?: string): Promise<boolean> => {
    // Check if slug is already used in categories, subcategories, or forbidden list
    if (isSlugInUse(slug)) {
        return false;
    }

    let query = supabase
        .from("custom_applet_configs")
        .select("id")
        .eq("slug", slug);

    if (excludeId) {
        query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error checking applet slug availability:", error);
        throw error;
    }

    return data.length === 0;
};
import { supabase } from "@/utils/supabase/client";

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
  layout_type?: string;
  containers?: any;
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
}

export type CustomAppletConfig = {
  id?: string;
  name: string;
  description?: string;
  slug: string;
  appletIcon?: string;
  appletSubmitText?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  layoutType?: string;
  containers?: any;
  dataSourceConfig?: any;
  resultComponentConfig?: any;
  nextStepConfig?: any;
  compiledRecipeId?: string;
  subcategoryId?: string;
  imageUrl?: string;
}

/**
 * Normalizes a CustomAppletConfig to ensure it has all required fields
 */
export const normalizeCustomAppletConfig = (config: CustomAppletConfig): CustomAppletConfig => {
  return {
    id: config.id,
    name: config.name || '',
    description: config.description || '',
    slug: config.slug || '',
    appletIcon: config.appletIcon || "SiCodemagic",
    appletSubmitText: config.appletSubmitText || null,
    creator: config.creator || null,
    primaryColor: config.primaryColor || 'gray',
    accentColor: config.accentColor || 'rose',
    layoutType: config.layoutType || 'flat',
    containers: config.containers || null,
    dataSourceConfig: config.dataSourceConfig || null,
    resultComponentConfig: config.resultComponentConfig || null,
    nextStepConfig: config.nextStepConfig || null,
    compiledRecipeId: config.compiledRecipeId || null,
    subcategoryId: config.subcategoryId || null,
    imageUrl: config.imageUrl || null
  };
};

/**
 * Converts a CustomAppletConfig to the database format
 */
export const appletConfigToDBFormat = async (config: CustomAppletConfig): Promise<Omit<CustomAppletConfigDB, 'id' | 'created_at' | 'updated_at'>> => {
  // Get the current user ID from the session
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  return {
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
    image_url: config.imageUrl || null
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
    imageUrl: dbRecord.image_url
  });
};

/**
 * Fetches all custom applet configs for the current user
 */
export const getAllCustomAppletConfigs = async (): Promise<CustomAppletConfig[]> => {
  // Get the current user ID
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.error('Error fetching custom applet configs:', error);
    throw error;
  }
  return (data || []).map(dbToAppletConfig);
};

/**
 * Fetches a specific custom applet config by ID
 */
export const getCustomAppletConfigById = async (id: string): Promise<CustomAppletConfig | null> => {
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') { // Record not found
      return null;
    }
    console.error('Error fetching custom applet config:', error);
    throw error;
  }
  return data ? dbToAppletConfig(data) : null;
};

/**
 * Creates a new custom applet config
 */
export const createCustomAppletConfig = async (config: CustomAppletConfig): Promise<CustomAppletConfig> => {
  const dbData = await appletConfigToDBFormat(config);
  
  // Debug: Log the data being sent to the database
  console.log('Creating custom applet config with data:', JSON.stringify(dbData, null, 2));
  
  try {
    const { data, error } = await supabase
      .from('custom_applet_configs')
      .insert(dbData)
      .select()
      .single();
    if (error) {
      console.error('Error creating custom applet config:', error.message, error.details, error.hint);
      throw error;
    }
    if (!data) {
      throw new Error('No data returned from insert operation');
    }
    return dbToAppletConfig(data);
  } catch (err) {
    console.error('Exception in createCustomAppletConfig:', err);
    throw err;
  }
};

/**
 * Updates an existing custom applet config
 */
export const updateCustomAppletConfig = async (id: string, config: CustomAppletConfig): Promise<CustomAppletConfig> => {
  const dbData = await appletConfigToDBFormat(config);
  
  try {
    const { data, error } = await supabase
      .from('custom_applet_configs')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating custom applet config:', error.message, error.details, error.hint);
      throw error;
    }
    if (!data) {
      throw new Error('No data returned from update operation');
    }
    return dbToAppletConfig(data);
  } catch (err) {
    console.error('Exception in updateCustomAppletConfig:', err);
    throw err;
  }
};

/**
 * Deletes a custom applet config
 */
export const deleteCustomAppletConfig = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('custom_applet_configs')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting custom applet config:', error);
    throw error;
  }
};

/**
 * Duplicates a custom applet config
 */
export const duplicateCustomAppletConfig = async (id: string): Promise<CustomAppletConfig> => {
  // First get the config to duplicate
  const config = await getCustomAppletConfigById(id);
  
  if (!config) {
    throw new Error(`Custom applet config with id ${id} not found`);
  }
  
  // Create a copy with a new ID (the database will generate a new ID)
  const dbData = await appletConfigToDBFormat(config);
  dbData.name = `${dbData.name} (Copy)`;
  dbData.slug = `${dbData.slug}-copy-${Date.now()}`;
  
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .insert(dbData)
    .select()
    .single();
  if (error) {
    console.error('Error duplicating custom applet config:', error);
    throw error;
  }
  return dbToAppletConfig(data);
};

/**
 * Fetches public custom applet configs
 */
export const getPublicCustomAppletConfigs = async (): Promise<CustomAppletConfig[]> => {
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .select('*')
    .eq('is_public', true);
  if (error) {
    console.error('Error fetching public custom applet configs:', error);
    throw error;
  }
  return (data || []).map(dbToAppletConfig);
};

/**
 * Make a custom applet config public or private
 */
export const setCustomAppletConfigPublic = async (id: string, isPublic: boolean): Promise<void> => {
  const { error } = await supabase
    .from('custom_applet_configs')
    .update({ is_public: isPublic })
    .eq('id', id);
  if (error) {
    console.error('Error updating custom applet config visibility:', error);
    throw error;
  }
};

/**
 * Fetches a custom applet config by slug
 */
export const getCustomAppletConfigBySlug = async (slug: string): Promise<CustomAppletConfig | null> => {
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) {
    if (error.code === 'PGRST116') { // Record not found
      return null;
    }
    console.error('Error fetching custom applet config by slug:', error);
    throw error;
  }
  return data ? dbToAppletConfig(data) : null;
};

/**
 * Fetches custom applet configs by subcategory
 */
export const getCustomAppletConfigsBySubcategory = async (subcategoryId: string): Promise<CustomAppletConfig[]> => {
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .select('*')
    .eq('subcategory_id', subcategoryId);
  if (error) {
    console.error('Error fetching custom applet configs by subcategory:', error);
    throw error;
  }
  return (data || []).map(dbToAppletConfig);
};

/**
 * Fetches custom applet configs by compiled recipe
 */
export const getCustomAppletConfigsByCompiledRecipe = async (compiledRecipeId: string): Promise<CustomAppletConfig[]> => {
  const { data, error } = await supabase
    .from('custom_applet_configs')
    .select('*')
    .eq('compiled_recipe_id', compiledRecipeId);
  if (error) {
    console.error('Error fetching custom applet configs by compiled recipe:', error);
    throw error;
  }
  return (data || []).map(dbToAppletConfig);
};

export const isSlugAvailable = async (slug: string, excludeId?: string): Promise<boolean> => {
  let query = supabase
    .from('custom_applet_configs')
    .select('id')
    .eq('slug', slug);
    
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error checking slug availability:', error);
    throw error;
  }
  
  return data.length === 0;
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
}

/**
 * Fetches all recipes for the current user
 */
export const getUserRecipes = async (): Promise<RecipeInfo[]> => {
  // Get the current user ID
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('recipe')
    .select('id, name, description, version, status')
    .eq('user_id', userId)
    .order('name');
    
  if (error) {
    console.error('Error fetching user recipes:', error);
    throw error;
  }
  
  return data as RecipeInfo[];
};

/**
 * Fetches a specific compiled recipe by recipe ID and version
 * @param recipeId The ID of the recipe
 * @param version Optional version number. If not provided, fetches the latest version.
 */
export const getCompiledRecipeByVersion = async (recipeId: string, version?: number): Promise<string | null> => {
  let query = supabase
    .from('compiled_recipe')
    .select('id, recipe_id, version')
    .eq('recipe_id', recipeId);
  
  if (version) {
    // If version is provided, get that specific version
    query = query.eq('version', version);
  } else {
    // Otherwise, get the latest version
    query = query.order('version', { ascending: false }).limit(1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching compiled recipe:', error);
    throw error;
  }
  
  return data && data.length > 0 ? data[0].id : null;
};

/**
 * Checks if a specific version of a compiled recipe exists
 */
export const checkCompiledRecipeVersionExists = async (recipeId: string, version: number): Promise<boolean> => {
  const { data, error } = await supabase
    .from('compiled_recipe')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('version', version)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking compiled recipe version:', error);
    throw error;
  }
  
  return !!data;
};
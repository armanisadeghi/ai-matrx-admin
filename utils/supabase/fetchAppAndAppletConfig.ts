// utils/supabase/fetchAppAndAppletConfig.ts

import { createClient } from "@/utils/supabase/server";
import { CustomAppConfig, CustomAppletConfig, AppLayoutOptions } from "@/types/customAppTypes";

export async function fetchAppAndAppletConfig(id: string | null = null, slug: string | null = null) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fetch_app_and_applet_config", {
        p_id: id,
        p_slug: slug,
    });

    if (error) {
        console.error("Error fetching app and applet config:", error);
        throw new Error("Failed to fetch app and applet configuration");
    }

    return data;
}

export async function fetchAppBySlug(slug: string): Promise<CustomAppConfig> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('custom_app_configs')
      .select('*')
      .eq('slug', slug)
      .single();
  
    console.log("============================================");
    console.log('fetchAppBySlug Fetched Data:', data);
    console.log("============================================");
  
    if (error) {
      console.error('Error fetching app by slug:', error);
      throw new Error('Failed to fetch app configuration');
    }
  
    // Transform data to CustomAppRuntimeConfig
    const transformedData: CustomAppConfig = {
      id: data.id,
      name: data.name,
      description: data.description ?? '',
      slug: data.slug,
      mainAppIcon: data.main_app_icon,
      mainAppSubmitIcon: data.main_app_submit_icon,
      creator: data.creator,
      primaryColor: data.primary_color,
      accentColor: data.accent_color,
      appletList: data.applet_list, // Assuming applet_list is already in { appletId: string; label: string }[] format
      extraButtons: data.extra_buttons, // Assuming extra_buttons is already in the correct format
      layoutType: data.layout_type as AppLayoutOptions, // Cast to AppLayoutOptions
      imageUrl: data.image_url,
    };
  
    return transformedData;
  }
  
  // Fetch an applet by slug and transform to CustomApplet
  export async function fetchAppletBySlug(slug: string): Promise<CustomAppletConfig> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('custom_applet_configs')
      .select('*')
      .eq('slug', slug)
      .single();
  
    console.log("============================================");
    console.log('fetchAppletBySlug Fetched Data:', data);
    console.log("============================================");
  
    if (error) {
      console.error('Error fetching applet by slug:', error);
      throw new Error('Failed to fetch applet configuration');
    }
  
    const transformedData: CustomAppletConfig = {
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
      containers: data.containers,
      dataSourceConfig: data.data_source_config,
      brokerMap: data.broker_map,
      resultComponentConfig: data.result_component_config,
      nextStepConfig: data.next_step_config,
      compiledRecipeId: data.compiled_recipe_id,
      subcategoryId: data.subcategory_id,
      imageUrl: data.image_url,
      appId: data.app_id,
    };
  
    return transformedData;
  }
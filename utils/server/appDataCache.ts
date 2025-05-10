import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';

// Define types for app data
interface AppConfig {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  main_app_icon: string | null;
  main_app_submit_icon: string | null;
  creator: string;
  primary_color: string | null;
  accent_color: string | null;
  [key: string]: any;
}

interface AppletConfig {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  [key: string]: any;
}

interface AppData {
  app_config: AppConfig;
  applets: AppletConfig[];
}

// Cache the fetch results using React's built-in cache
export const getAppData = cache(async (slug: string | null = null, id: string | null = null): Promise<AppData | null> => {
  try {
    if (!slug && !id) {
      console.error('getAppData: No slug or ID provided');
      return null;
    }
    
    console.log('Server-side fetching app data:', { slug, id });
    
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fetch_app_and_applet_config", {
      p_id: id,
      p_slug: slug,
    });

    if (error) {
      console.error('Server-side fetch error:', error);
      return null;
    }

    if (!data) {
      console.error('Server-side fetch returned no data');
      return null;
    }

    console.log('Server-side fetch successful');
    return data as AppData;
  } catch (error) {
    console.error('Unexpected error in getAppData:', error);
    return null;
  }
});

// Helper to get applet by slug
export const getAppletBySlug = async (appSlug: string, appletSlug: string): Promise<AppletConfig | null> => {
  const appData = await getAppData(appSlug);
  if (!appData) return null;
  
  return appData.applets.find(applet => applet.slug === appletSlug) || null;
}; 
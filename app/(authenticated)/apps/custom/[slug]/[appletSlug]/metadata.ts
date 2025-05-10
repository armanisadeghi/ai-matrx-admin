import { Metadata } from 'next';
import { getAppData, getAppletBySlug } from '@/utils/server/appDataCache';

// Dynamically generate metadata for each applet
export async function generateMetadata({ 
  params 
}: { 
  params: { slug: string; appletSlug: string } 
}): Promise<Metadata> {
  try {
    const { slug, appletSlug } = params;
    
    // Fetch app data using cached utility
    const data = await getAppData(slug);

    if (!data) {
      return {
        title: 'Applet Not Found',
        description: 'The requested applet could not be found',
      };
    }

    // Find the specific applet
    const applet = data.applets.find((a) => a.slug === appletSlug);
    const app = data.app_config;
    
    if (!applet) {
      return {
        title: app?.name ? `${app.name} | Applet Not Found` : 'Applet Not Found',
        description: 'The requested applet could not be found',
      };
    }
    
    // Construct metadata
    const title = `${app?.name || 'App'} | ${applet.name || 'Applet'}`;
    const description = applet.description || app?.description || 'Interactive applet';
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [`/apps/custom/${slug}/opengraph-image`],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`/apps/custom/${slug}/opengraph-image`],
      },
    };
  } catch (error) {
    console.error('Error generating applet metadata:', error);
    return {
      title: 'Applet',
      description: 'Interactive applet',
    };
  }
} 
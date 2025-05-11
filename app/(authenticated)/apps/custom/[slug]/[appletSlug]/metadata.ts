// app/(authenticated)/apps/custom/[slug]/[appletSlug]/metadata.ts

import { Metadata } from 'next';
import { getAppData, getAppletBySlug } from '@/utils/server/appDataCache';

export async function generateMetadata({ 
  params 
}: { 
  params: { slug: string; appletSlug: string } 
}): Promise<Metadata> {
  try {
    const { slug, appletSlug } = params;
    
    const data = await getAppData(slug);

    if (!data) {
      return {
        title: 'Applet Not Found',
        description: 'The requested applet could not be found',
      };
    }

    const applet = data.applets.find((a) => a.slug === appletSlug);
    const app = data.app_config;
    
    if (!applet) {
      return {
        title: app?.name ? `${app.name} | Applet Not Found` : 'Applet Not Found',
        description: 'The requested applet could not be found',
      };
    }
    
    const title = `${app?.name || 'App'} | ${applet.name || 'Applet'}`;
    const description = applet.description || app?.description || 'Interactive applet';
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        // Remove images
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        // Remove images
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
import { Metadata } from 'next';
import { getAppData } from '@/utils/server/appDataCache';

// Dynamically generate metadata for each custom app
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const { slug } = params;
    
    // Fetch app data using cached utility
    const data = await getAppData(slug);

    if (!data || !data.app_config) {
      return {
        title: 'App Not Found',
        description: 'The requested application could not be found',
      };
    }

    const app = data.app_config;
    
    // Construct metadata
    return {
      title: app.name || 'Custom App',
      description: app.description || 'Interactive application platform',
      openGraph: {
        title: app.name || 'Custom App',
        description: app.description || 'Interactive application platform',
        images: [`/apps/custom/${slug}/opengraph-image`],
      },
      twitter: {
        card: 'summary_large_image',
        title: app.name || 'Custom App',
        description: app.description || 'Interactive application platform',
        images: [`/apps/custom/${slug}/opengraph-image`],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'App',
      description: 'Interactive application platform',
    };
  }
} 
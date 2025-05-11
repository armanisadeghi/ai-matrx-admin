// app/(authenticated)/apps/custom/[slug]/metadata.ts


import { Metadata } from 'next';
import { getAppData } from '@/utils/server/appDataCache';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const { slug } = params;
    
    const data = await getAppData(slug);

    if (!data || !data.app_config) {
      return {
        title: 'App Not Found',
        description: 'The requested application could not be found',
      };
    }

    const app = data.app_config;
    
    return {
      title: app.name || 'Custom App',
      description: app.description || 'Interactive application platform',
      openGraph: {
        title: app.name || 'Custom App',
        description: app.description || 'Interactive application platform',
        // Remove images
      },
      twitter: {
        card: 'summary_large_image',
        title: app.name || 'Custom App',
        description: app.description || 'Interactive application platform',
        // Remove images
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
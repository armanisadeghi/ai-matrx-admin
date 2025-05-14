// app/(authenticated)/apps/custom/[slug]/[appletSlug]/page.tsx
import { fetchAppAndAppletConfig } from '@/utils/supabase/fetchAppAndAppletConfig';
import { Metadata, ResolvingMetadata } from 'next';
import { AppletConfigViewer } from '@/components/admin';

type Params = Promise<{ slug: string; appletSlug: string }>;

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: Params },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug, appletSlug } = resolvedParams;
  
  // Fetch app and applet configuration for metadata
  const config = await fetchAppAndAppletConfig(null, slug);
  
  if (!config || !config.app_config) {
    return {
      title: 'App Not Found',
    };
  }
  
  const appConfig = config.app_config;
  const currentApplet = config.applets?.find((applet: any) => applet.slug === appletSlug);
  
  if (!currentApplet) {
    return {
      title: `Applet Not Found | ${appConfig.name}`,
    };
  }
  
  return {
    title: `${currentApplet.name} | ${appConfig.name}`,
    description: currentApplet.description || 'Custom applet',
    openGraph: {
      images: currentApplet.image_url ? [currentApplet.image_url] : [],
    },
  };
}

export default async function AppletPage({ 
  params, 
  searchParams 
}: { 
  params: Params; 
  searchParams: { tab?: string }
}) {
  const resolvedParams = await params;
  const { slug, appletSlug } = resolvedParams;
    
  // Fetch app and applet configuration
  const config = await fetchAppAndAppletConfig(null, slug);
  
  if (!config || !config.app_config) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600">Application Not Found</h1>
        <p>The requested application could not be found or an error occurred.</p>
      </div>
    );
  }
  
  const appConfig = config.app_config;
  const applets = config.applets || [];
  const currentApplet = applets.find((applet: any) => applet.slug === appletSlug);
  
  if (!currentApplet) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600">Applet Not Found</h1>
        <p>The requested applet could not be found.</p>
        <a 
          href={`/apps/custom/${slug}`}
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Back to {appConfig.name}
        </a>
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="mb-4">
        <a 
          href={`/apps/custom/${slug}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to {appConfig.name}
        </a>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">{currentApplet.name}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">{currentApplet.description}</p>
      
      {/* Pass the searchParams to the AppletConfigViewer */}
      <div 
        id="applet-container"
        className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
        data-applet-id={currentApplet.id}
      >
        <AppletConfigViewer applet={currentApplet} searchParams={searchParams} />
      </div>
    </div>
  );
}
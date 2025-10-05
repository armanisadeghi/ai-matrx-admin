// app/(authenticated)/apps/custom/[slug]/[appletSlug]/page.tsx

import React from "react";
import { Metadata } from "next";
import { getAppData } from "@/utils/server/appDataCache";
import AppletPageClient from "./AppletPageClient";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string; appletSlug: string }> 
}): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const { slug, appletSlug } = resolvedParams;
    
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
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
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

export default async function AppletPage({ 
  params 
}: { 
  params: Promise<{ slug: string; appletSlug: string }> 
}) {
    const resolvedParams = await params;
    const { slug, appletSlug } = resolvedParams;

    return (
        <AppletPageClient 
            slug={slug}
            appletSlug={appletSlug}
        />
    );
}


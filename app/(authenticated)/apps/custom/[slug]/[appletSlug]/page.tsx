// app/(authenticated)/apps/custom/[slug]/[appletSlug]/page.tsx

import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
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
        title: app?.name ? `Applet Not Found | ${app.name} - AI Matrx` : 'Applet Not Found - AI Matrx',
        description: 'The requested applet could not be found',
      };
    }
    
    const title = `${applet.name || 'Applet'} | ${app?.name || 'App'} - AI Matrx`;
    const baseDescription = applet.description || app?.description || 'Interactive applet';
    
    // Append creator name to description if available (prefer applet creator, fall back to app creator)
    const creator = applet.creator || app?.creator;
    const description = creator ? `${baseDescription} | Created by ${creator}` : baseDescription;
    
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

    // Check if applet exists
    const data = await getAppData(slug);
    
    // If app doesn't exist, redirect will happen at the app page level
    // If applet doesn't exist but app does, redirect to app page
    if (data && data.app_config) {
        const applet = data.applets.find((a) => a.slug === appletSlug);
        if (!applet) {
            redirect(`/apps/custom/${slug}`);
        }
    }

    return (
        <AppletPageClient 
            slug={slug}
            appletSlug={appletSlug}
        />
    );
}


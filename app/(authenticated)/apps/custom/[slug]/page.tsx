// app/(authenticated)/apps/custom/[slug]/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { getAppData } from '@/utils/server/appDataCache';
import CustomAppHomePageClient from './CustomAppHomePageClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;
    
    const data = await getAppData(slug);

    if (!data || !data.app_config) {
      return {
        title: 'App Not Found - AI Matrx',
        description: 'The requested application could not be found',
      };
    }

    const app = data.app_config;
    const baseDescription = app.description || 'Interactive application platform';
    
    // Append creator name to description if available
    const description = app.creator ? `${baseDescription} | Created by ${app.creator}` : baseDescription;
    
    return {
      title: `${app.name || 'Custom App'} - AI Matrx`,
      description,
      openGraph: {
        title: app.name || 'Custom App',
        description,
      },
      twitter: {
        card: 'summary_large_image',
        title: app.name || 'Custom App',
        description,
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

export default async function CustomAppHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  return <CustomAppHomePageClient slug={slug} />;
}
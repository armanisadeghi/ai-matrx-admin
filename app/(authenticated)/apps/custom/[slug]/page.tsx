// app/(authenticated)/apps/custom/[slug]/page.tsx
'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HomeApplet } from '@/features/applet/home';


export default function CustomAppHomePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  // Navigate to applet
  const navigateToApplet = (appletSlug: string) => {
    router.push(`/apps/custom/${slug}/${appletSlug}`);
  };
  
  // Render the MainLayout with all necessary props
  return (
    <HomeApplet 
      navigateToApplet={navigateToApplet}
      appDisplayVariant="QuarterThreeQuarters"
      appletCardVariant="default"
      mainLayoutVariant="default"
    />
  );
}
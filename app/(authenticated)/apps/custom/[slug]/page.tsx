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
  
  // app display variant options: "default" | "banner" | "minimal" | "sideBySide" | "modern" | "QuarterThreeQuarters" | "modernGlass"
  // applet card variant options: "default" | "glass" | "modern" | "simple" | "compact"
  // main layout variant options: "default" | "grid" | "sidebar"
  return (
    <HomeApplet 
      navigateToApplet={navigateToApplet}
      appDisplayVariant="modern"
      appletCardVariant="simple"
      mainLayoutVariant="sidebar"
    />
  );
}
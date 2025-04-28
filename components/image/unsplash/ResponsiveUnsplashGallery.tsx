'use client';

import React from 'react';
import { EnhancedUnsplashGallery } from '@/components/image/unsplash/desktop/EnhancedUnsplashGallery';
import { MobileUnsplashGallery } from '@/components/image/unsplash/mobile/MobileUnsplashGallery';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveUnsplashGalleryProps {
  initialSearchTerm?: string;
}

export function ResponsiveUnsplashGallery({ initialSearchTerm }: ResponsiveUnsplashGalleryProps) {
  const isMobile = useIsMobile();

  return isMobile ? 
    <MobileUnsplashGallery initialSearchTerm={initialSearchTerm} /> : 
    <EnhancedUnsplashGallery initialSearchTerm={initialSearchTerm} />;
} 
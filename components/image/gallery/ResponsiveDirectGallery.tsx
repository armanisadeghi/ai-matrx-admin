'use client';

import React from 'react';
import { ImageGallery } from '@/components/image/gallery/desktop/ImageGallery';
import { MobileImageGallery } from '@/components/image/gallery/mobile/MobileImageGallery';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveDirectGalleryProps {
  imageUrls: string[];
}

export function ResponsiveDirectGallery({ imageUrls = [] }: ResponsiveDirectGalleryProps) {
  const isMobile = useIsMobile();

  return isMobile ? <MobileImageGallery imageUrls={imageUrls} /> : <ImageGallery imageUrls={imageUrls} />;
} 
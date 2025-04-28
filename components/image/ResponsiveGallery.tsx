'use client';

import React from 'react';
import { ResponsiveDirectGallery } from '@/components/image/gallery/ResponsiveDirectGallery';
import { ResponsiveUnsplashGallery } from '@/components/image/unsplash/ResponsiveUnsplashGallery';

interface ResponsiveGalleryProps {
  imageUrls?: string[];
  type?: 'direct' | 'unsplash';
  initialSearchTerm?: string;
}

export function ResponsiveGallery({ imageUrls = [], type = 'direct', initialSearchTerm }: ResponsiveGalleryProps) {
  console.log('ResponsiveGallery rendered with', { type, imageUrls, initialSearchTerm });
  
  return type === 'direct' ? (
    <ResponsiveDirectGallery imageUrls={imageUrls} />
  ) : (
    <ResponsiveUnsplashGallery initialSearchTerm={initialSearchTerm} />
  );
}
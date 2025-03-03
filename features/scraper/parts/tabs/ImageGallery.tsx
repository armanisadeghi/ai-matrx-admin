'use client';
import React from 'react';
import { ResponsiveGallery } from '@/components/image/ResponsiveGallery';


interface ImageGalleryProps {
  imageUrls: string[];
}

export default function GalleryPage({ imageUrls }: ImageGalleryProps) {
  // Your array of image URLs

  return (
    <div>
      <ResponsiveGallery imageUrls={imageUrls} type="direct" />
    </div>
  );
}
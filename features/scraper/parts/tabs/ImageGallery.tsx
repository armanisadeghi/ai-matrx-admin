'use client';
import React from 'react';
import { ImageGallery } from '@/components/image/gallery/ImageGallery';


interface ImageGalleryProps {
  imageUrls: string[];
}

export default function GalleryPage({ imageUrls }: ImageGalleryProps) {
  // Your array of image URLs

  return (
    <div>
      <ImageGallery imageUrls={imageUrls} />
    </div>
  );
}
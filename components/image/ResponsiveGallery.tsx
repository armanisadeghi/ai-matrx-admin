'use client';
import React, { useState, useEffect } from 'react';

// Import both desktop and mobile versions
import { ImageGallery } from './gallery/desktop/ImageGallery';
import { MobileImageGallery } from '@/components/image/gallery/mobile/MobileImageGallery';
import { EnhancedUnsplashGallery } from '@/components/image/unsplash/desktop/EnhancedUnsplashGallery';
import { MobileUnsplashGallery } from '@/components/image/unsplash/mobile/MobileUnsplashGallery';

interface ResponsiveGalleryProps {
  imageUrls?: string[];
  type?: 'direct' | 'unsplash';
}

export function ResponsiveGallery({ imageUrls = [], type = 'direct' }: ResponsiveGalleryProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Common breakpoint for tablets/mobile
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for window resize events
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Render appropriate gallery based on device type and gallery type
  if (type === 'direct') {
    return isMobile ? (
      <MobileImageGallery imageUrls={imageUrls} />
    ) : (
      <ImageGallery imageUrls={imageUrls} />
    );
  } else {
    return isMobile ? (
      <MobileUnsplashGallery />
    ) : (
      <EnhancedUnsplashGallery />
    );
  }
}
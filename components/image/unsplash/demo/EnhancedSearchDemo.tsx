'use client';

import React, { useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUnsplashSearch } from '@/hooks/images/useUnsplashSearch';
import { DesktopImageCard } from '../../shared/DesktopImageCard';
import { UnsplashSearch } from '../UnsplashSearch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Grid2X2, LayoutGrid } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EnhancedImageViewer } from '../desktop/EnhancedImageViewer';

export function EnhancedSearchDemo() {
  const [viewMode, setViewMode] = React.useState<'grid' | 'natural'>('grid');
  const { toast } = useToast();
  const [isSharing, setIsSharing] = React.useState(false);
  
  // Use our enhanced search hook with initial query
  const {
    photos,
    loading,
    hasMore,
    selectedPhoto,
    relatedPhotos,
    favorites,
    loadMore,
    handlePhotoClick,
    closePhotoView,
    toggleFavorite,
    downloadImage,
    currentSortOrder,
    currentOrientation,
    currentPremiumFilter,
    sortOrderOptions,
    orientationOptions,
    premiumFilterOptions,
    query,
    handleSearch
  } = useUnsplashSearch({ initialQuery: 'nature' });
  
  // Setup infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastPhotoElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, loadMore]
  );
  
  // Handle sharing
  const handleShare = async (photo: any) => {
    try {
      const imageUrl = photo.urls.full || photo.urls.regular;
      await navigator.clipboard.writeText(imageUrl);
      setIsSharing(true);
      toast({
        title: 'Image link copied',
        description: 'The direct image URL has been copied to your clipboard.',
      });
      setTimeout(() => setIsSharing(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: 'Copy failed',
        description: 'There was an issue copying the link.',
        variant: 'destructive',
      });
    }
  };
  
  // Show image info
  const handleImageInfo = (photo: any) => {
    toast({
      title: 'Image Information',
      description: `Taken with ${photo.exif?.make || 'Unknown make'} ${
        photo.exif?.model || 'Unknown model'
      }, f/${photo.exif?.aperture || 'N/A'}, ${photo.exif?.exposure_time || 'N/A'}s, ISO ${photo.exif?.iso || 'N/A'}`,
    });
  };
  
  // The component rendered on first mount, so we don't need to explicitly fetch
  
  return (
    <div className="w-full p-4 space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="max-w-3xl w-full">
          {/* The UnsplashSearch component takes care of all the search state */}
          <UnsplashSearch
            onSearch={handleSearch}
            loading={loading}
            initialSearchTerm={query}
            className="w-full"
            currentSortOrder={currentSortOrder}
            currentOrientation={currentOrientation}
            currentPremiumFilter={currentPremiumFilter}
            sortOrderOptions={sortOrderOptions}
            orientationOptions={orientationOptions}
            premiumFilterOptions={premiumFilterOptions}
          />
        </div>
        
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'natural')}>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid2X2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Grid</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="natural" aria-label="Natural view">
            <LayoutGrid className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Natural</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${viewMode === 'natural' ? 'items-start' : ''}`}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            ref={index === photos.length - 1 ? lastPhotoElementRef : undefined}
          >
            <DesktopImageCard 
              photo={photo} 
              onClick={() => handlePhotoClick(photo)}
              viewMode={viewMode}
            />
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center items-center h-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <AnimatePresence>
        {selectedPhoto && (
          <EnhancedImageViewer
            photos={photos}
            initialIndex={photos.findIndex((photo) => photo.id === selectedPhoto.id)}
            onClose={closePhotoView}
            onDownload={downloadImage}
            onFavorite={toggleFavorite}
            onShare={handleShare}
            onInfo={handleImageInfo}
            isFavorite={(photo) => favorites.some((fav) => fav.id === photo.id)}
            onRelatedPhotoClick={handlePhotoClick}
            loadMorePhotos={loadMore}
            isSharing={isSharing}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 
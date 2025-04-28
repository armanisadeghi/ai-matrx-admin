import { useState, useCallback } from 'react';
import { useUnsplashGallery, SortOrder, ImageOrientation, PremiumFilter } from './useUnsplashGallery';

export interface UseUnsplashSearchOptions {
  initialQuery?: string;
}

export function useUnsplashSearch(options: UseUnsplashSearchOptions = {}) {
  const { initialQuery = '' } = options;
  
  // Get all the Unsplash gallery utilities
  const unsplashGallery = useUnsplashGallery();
  
  // Maintain local search state for UI components
  const [query, setQuery] = useState(initialQuery);
  
  // Handle search with all options in one function
  const handleSearch = useCallback((newQuery: string, options?: {
    sortOrder?: SortOrder;
    orientation?: ImageOrientation;
    premiumFilter?: PremiumFilter;
  }) => {
    setQuery(newQuery);
    
    if (options) {
      unsplashGallery.handleSearch(newQuery, options);
    } else {
      unsplashGallery.handleSearch(newQuery);
    }
  }, [unsplashGallery]);
  
  // Handle collection search
  const handleCollectionSearch = useCallback((collectionId: string, options?: {
    sortOrder?: SortOrder;
    orientation?: ImageOrientation;
  }) => {
    unsplashGallery.handleCollectionPhotos(collectionId, options);
  }, [unsplashGallery]);
  
  // Handle topic search
  const handleTopicSearch = useCallback((topic: string, options?: {
    sortOrder?: SortOrder;
    orientation?: ImageOrientation;
  }) => {
    unsplashGallery.handleTopicPhotos(topic, options);
  }, [unsplashGallery]);
  
  return {
    // Pass through all the original functionality
    ...unsplashGallery,
    
    // Add our enhanced search functionality
    query,
    handleSearch,
    handleCollectionSearch,
    handleTopicSearch,
    
    // Provide a reset function for convenience
    resetSearch: useCallback(() => {
      setQuery('');
      unsplashGallery.handleRecentPhotos();
    }, [unsplashGallery])
  };
} 
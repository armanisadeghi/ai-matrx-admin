'use client';
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUnsplashGallery } from '@/hooks/images/useUnsplashGallery';
import { DesktopImageCard } from '../../shared/DesktopImageCard';
import { EnhancedImageViewer } from './EnhancedImageViewer';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { UnsplashSearch } from '../UnsplashSearch';

export interface Photo {
    id: string;
    alt_description?: string;
    links: {
        html: string;
    };
    user: {
        name: string;
    };
    urls: {
        regular: string;
        thumb: string;
        full?: string;
        raw?: string;
    };
    exif?: {
        make?: string;
        model?: string;
        aperture?: string;
        exposure_time?: string;
        iso?: number;
    };
}

export interface EnhancedUnsplashGalleryProps {
    initialSearchTerm?: string;
}

export function EnhancedUnsplashGallery({ initialSearchTerm }: EnhancedUnsplashGalleryProps) {
    const {
        photos,
        loading,
        hasMore,
        selectedPhoto,
        relatedPhotos,
        favorites,
        handleSearch,
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
        premiumFilterOptions
    } = useUnsplashGallery();

    const [viewMode, setViewMode] = useState<'grid' | 'natural'>('grid');
    const { toast } = useToast();
    const observer = useRef<IntersectionObserver | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialSearchTerm || 'ai');
    const [isSharing, setIsSharing] = useState(false);

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

    const handleShare = async (photo: Photo) => {
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

    const handleImageInfo = (photo: Photo) => {
        toast({
            title: 'Image Information',
            description: `Taken with ${photo.exif?.make || 'Unknown make'} ${
                photo.exif?.model || 'Unknown model'
            }, 
                    f/${photo.exif?.aperture || 'N/A'}, 
                    ${photo.exif?.exposure_time || 'N/A'}s, 
                    ISO ${photo.exif?.iso || 'N/A'}`,
        });
    };

    const handleSearchChange = (query: string, options: any = {}) => {
        setSearchQuery(query);
        handleSearch(query, options);
    };

    const handleViewModeChange = (mode: 'grid' | 'natural') => {
        setViewMode(mode);
    };

    useEffect(() => {
        handleSearch(searchQuery);
    }, []);

    return (
        <div className="w-full p-4 space-y-8">
            <div className="w-full mb-6">
                <UnsplashSearch
                    onSearch={handleSearchChange}
                    loading={loading}
                    initialSearchTerm={searchQuery}
                    className="w-full"
                    currentSortOrder={currentSortOrder}
                    currentOrientation={currentOrientation}
                    currentPremiumFilter={currentPremiumFilter}
                    sortOrderOptions={sortOrderOptions}
                    orientationOptions={orientationOptions}
                    premiumFilterOptions={premiumFilterOptions}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                />
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${viewMode === 'natural' ? 'items-start' : ''}`}>
                {photos.map((photo, index) => (
                    <div
                        key={`${photo.id}-${index}`}
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
'use client';
import React, { useRef, useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUnsplashGallery } from '@/hooks/images/useUnsplashGallery';
import { ImageCard } from './ImageCard';
import { EnhancedImageViewer } from './EnhancedImageViewer';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Grid, Grid3X3 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchBar } from '@/components/image/gallery/SearchBar';

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

export function EnhancedUnsplashGallery() {
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
    } = useUnsplashGallery();

    const [viewMode, setViewMode] = useState<'grid' | 'natural'>('grid');
    const { toast } = useToast();
    const observer = useRef<IntersectionObserver | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
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
            await navigator.clipboard.writeText(photo.links.html);
            setIsSharing(true);
            toast({
                title: 'Link copied',
                description: 'The image link has been copied to your clipboard.',
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

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        handleSearch(query);
    };

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-4xl font-bold text-foreground mb-6">Unsplash Gallery</h1>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <SearchBar
                    onSearch={handleSearchChange}
                    loading={loading}
                    placeholder="Search Unsplash..."
                    defaultValue={searchQuery}
                    className="max-w-3xl w-full"
                    debounceTime={300}
                    showClearButton={true}
                    autoFocus={false}
                    onFocus={() => console.log("Search focused")}
                    onBlur={() => console.log("Search blurred")}
                />
                
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'natural')}>
                    <ToggleGroupItem value="grid" aria-label="Grid view">
                        <Grid3X3 className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Grid</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="natural" aria-label="Natural view">
                        <Grid className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Natural</span>
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${viewMode === 'natural' ? 'items-start' : ''}`}>
                {photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        ref={index === photos.length - 1 ? lastPhotoElementRef : undefined}
                    >
                        <ImageCard 
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
'use client';
import React, { useRef, useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUnsplashGallery } from '@/hooks/images/useUnsplashGallery';
import { MobileImageCard } from '@/components/image/gallery/mobile/MobileImageCard';
import { SearchBar } from '@/components/image/gallery/SearchBar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { MobileUnsplashViewer } from './MobileUnsplashViewer';

export function MobileUnsplashGallery() {
    const {
        photos,
        loading,
        hasMore,
        selectedPhoto,
        favorites,
        handleSearch,
        loadMore,
        handlePhotoClick,
        closePhotoView,
        toggleFavorite,
        downloadImage,
    } = useUnsplashGallery();

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

    const handleShare = async (photo: any) => {
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

    const handleImageInfo = (photo: any) => {
        toast({
            title: 'Image Information',
            description: `Taken with ${photo.exif?.make || 'Unknown make'} ${
                photo.exif?.model || 'Unknown model'
            }, f/${photo.exif?.aperture || 'N/A'}, ${photo.exif?.exposure_time || 'N/A'}s, ISO ${photo.exif?.iso || 'N/A'}`,
        });
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        handleSearch(query);
    };

    // Convert Unsplash photos to the format our mobile components expect
    const formatPhotoForMobile = (photo: any) => ({
        ...photo,
        description: photo.alt_description || `Photo by ${photo.user.name}`,
    });

    return (
        <div className="container-fluid p-2 space-y-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">Unsplash</h1>
            <SearchBar
                onSearch={handleSearchChange}
                loading={loading}
                placeholder="Search..."
                defaultValue={searchQuery}
                className="w-full"
                debounceTime={300}
                showClearButton={true}
                autoFocus={false}
                buttonClassName="min-w-[70px]"
            />
            
            <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        ref={index === photos.length - 1 ? lastPhotoElementRef : undefined}
                    >
                        <MobileImageCard 
                            photo={{
                                id: photo.id,
                                url: photo.urls.regular,
                                description: photo.alt_description || `Photo by ${photo.user.name}`
                            }}
                            onClick={() => handlePhotoClick(photo)}
                        />
                    </div>
                ))}
            </div>
            
            {loading && (
                <div className="flex justify-center items-center h-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                </div>
            )}
            
            <AnimatePresence>
                {selectedPhoto && (
                    <MobileUnsplashViewer
                        photos={photos}
                        initialIndex={photos.findIndex((photo) => photo.id === selectedPhoto.id)}
                        onClose={closePhotoView}
                        onDownload={downloadImage}
                        onFavorite={toggleFavorite}
                        onShare={handleShare}
                        onInfo={handleImageInfo}
                        isFavorite={(photo) => favorites.some((fav) => fav.id === photo.id)}
                        isSharing={isSharing}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
import React, { useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUnsplashGallery } from '../hooks/useUnsplashGallery';
import { ImageCard } from './ImageCard';
import { ImageViewer } from './ImageViewer';
import { SearchBar } from './SearchBar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Photo } from 'unsplash-js';

export function UnsplashGallery() {
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

    const { toast } = useToast();
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

    const handleShare = (photo: Photo) => {
        if ('share' in navigator) {
            (navigator as any).share({
                title: photo.alt_description || 'Shared image from Unsplash',
                text: `Check out this image by ${photo.user.name} on Unsplash!`,
                url: photo.links.html,
            });
        } else {
            navigator.clipboard.writeText(photo.links.html);
            toast({
                title: 'Link copied',
                description: 'The image link has been copied to your clipboard.',
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

    const handlePreviousPhoto = () => {
        if (!selectedPhoto) return;
        const currentIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
        if (currentIndex > 0) {
            handlePhotoClick(photos[currentIndex - 1]);
        }
    };

    const handleNextPhoto = () => {
        if (!selectedPhoto) return;
        const currentIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
        if (currentIndex < photos.length - 1) {
            handlePhotoClick(photos[currentIndex + 1]);
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-4xl font-bold text-foreground mb-6">Unsplash Gallery</h1>

            <SearchBar onSearch={handleSearch} loading={loading} />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        ref={index === photos.length - 1 ? lastPhotoElementRef : undefined}
                    >
                        <ImageCard photo={photo} onClick={() => handlePhotoClick(photo)} />
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
                    <ImageViewer
                        photo={selectedPhoto}
                        relatedPhotos={relatedPhotos}
                        onClose={closePhotoView}
                        onDownload={() => downloadImage(selectedPhoto)}
                        onFavorite={() => toggleFavorite(selectedPhoto)}
                        onShare={() => handleShare(selectedPhoto)}
                        onInfo={() => handleImageInfo(selectedPhoto)}
                        isFavorite={favorites.some((fav) => fav.id === selectedPhoto.id)}
                        onRelatedPhotoClick={handlePhotoClick}
                        onPrevious={handlePreviousPhoto}
                        onNext={handleNextPhoto}
                        hasPrevious={photos.findIndex((photo) => photo.id === selectedPhoto.id) > 0}
                        hasNext={
                            photos.findIndex((photo) => photo.id === selectedPhoto.id) < photos.length - 1
                        }
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

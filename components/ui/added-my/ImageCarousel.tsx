import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageCarouselProps {
    images: string[];
    onImageChange?: (index: number) => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onImageChange }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handlePrevImage = useCallback(() => {
        setCurrentImageIndex((prevIndex) => {
            const newIndex = prevIndex > 0 ? prevIndex - 1 : images.length - 1;
            onImageChange?.(newIndex);
            return newIndex;
        });
    }, [images.length, onImageChange]);

    const handleNextImage = useCallback(() => {
        setCurrentImageIndex((prevIndex) => {
            const newIndex = prevIndex < images.length - 1 ? prevIndex + 1 : 0;
            onImageChange?.(newIndex);
            return newIndex;
        });
    }, [images.length, onImageChange]);

    const getImageIndex = useCallback((index: number) => {
        if (index < 0) return images.length + index;
        if (index >= images.length) return index - images.length;
        return index;
    }, [images.length]);

    if (images.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="relative flex items-center justify-center">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevImage}
                    className="absolute left-0 z-10 rounded-full bg-black/50 text-white"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="flex items-center justify-center space-x-4">
                    <div className="hidden md:block w-1/4 aspect-square">
                        <Image
                            src={images[getImageIndex(currentImageIndex - 1)]}
                            alt="Previous image"
                            layout="responsive"
                            width={100}
                            height={100}
                            objectFit="cover"
                            className="rounded-lg opacity-50"
                        />
                    </div>
                    <div className="w-full md:w-1/2 aspect-square">
                        <Image
                            src={images[currentImageIndex]}
                            alt={`Current image ${currentImageIndex + 1}`}
                            layout="responsive"
                            width={100}
                            height={100}
                            objectFit="cover"
                            className="rounded-lg"
                        />
                    </div>
                    <div className="hidden md:block w-1/4 aspect-square">
                        <Image
                            src={images[getImageIndex(currentImageIndex + 1)]}
                            alt="Next image"
                            layout="responsive"
                            width={100}
                            height={100}
                            objectFit="cover"
                            className="rounded-lg opacity-50"
                        />
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextImage}
                    className="absolute right-0 z-10 rounded-full bg-black/50 text-white"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">
                Image {currentImageIndex + 1} of {images.length}
            </p>
        </div>
    );
};

export default ImageCarousel;

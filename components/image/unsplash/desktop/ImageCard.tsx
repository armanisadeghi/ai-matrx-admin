import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface EnhancedImageCardProps {
    photo: {
        id: string;
        urls: {
            regular: string;
            thumb: string;
        };
        alt_description?: string;
        user: {
            name: string;
        };
    };
    onClick: () => void;
    viewMode?: 'grid' | 'natural';
}

export function ImageCard({ photo, onClick, viewMode = 'grid' }: EnhancedImageCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [aspectRatio, setAspectRatio] = useState(1);

    // Preload the image to get natural dimensions
    useEffect(() => {
        const img = new Image();
        img.src = photo.urls.regular;
        
        img.onload = () => {
            setDimensions({ width: img.width, height: img.height });
            setAspectRatio(img.width / img.height);
        };
    }, [photo.urls.regular]);

    const handleLoad = () => {
        setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setIsError(true);
    };

    // Determine image height based on view mode
    const getImageHeight = () => {
        if (viewMode === 'grid') {
            return 'h-60'; // Fixed height for grid mode
        } else {
            // Natural mode - limit height based on aspect ratio
            if (aspectRatio > 1.5) {
                return 'h-40'; // Wide image
            } else if (aspectRatio < 0.7) {
                return 'h-72'; // Tall image
            } else {
                return 'h-56'; // Standard image
            }
        }
    };

    return (
        <Card 
            className="overflow-hidden group cursor-pointer transform transition-transform duration-200 hover:scale-[1.02]"
            onClick={onClick}
        >
            <CardContent className="p-0 relative">
                {isLoading && (
                    <Skeleton className={`w-full ${getImageHeight()}`} />
                )}
                
                {isError ? (
                    <div className={`w-full ${getImageHeight()} flex items-center justify-center bg-muted`}>
                        <p className="text-muted-foreground">Image not available</p>
                    </div>
                ) : (
                    <img
                        src={photo.urls.regular}
                        alt={photo.alt_description || "Gallery image"}
                        className={`w-full ${getImageHeight()} ${viewMode === 'grid' ? 'object-cover' : 'object-contain'} transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-4 w-full text-white">
                        <p className="font-medium truncate">{photo.alt_description || "Gallery image"}</p>
                        <p className="text-sm text-white/80 truncate">By {photo.user.name}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
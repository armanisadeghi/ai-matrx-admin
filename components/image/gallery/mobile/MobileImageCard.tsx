import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileImageCardProps {
    photo: {
        id: string;
        url: string;
        description: string;
    };
    onClick: () => void;
}

export function MobileImageCard({ photo, onClick }: MobileImageCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1);

    // Preload the image to get dimensions
    useEffect(() => {
        const img = new Image();
        img.src = photo.url;
        
        img.onload = () => {
            setAspectRatio(img.width / img.height);
        };
    }, [photo.url]);

    const handleLoad = () => {
        setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setIsError(true);
    };

    // Calculate height based on aspect ratio
    const getHeight = () => {
        if (aspectRatio > 1.5) {
            return 'h-28'; // Wide image
        } else if (aspectRatio < 0.7) {
            return 'h-52'; // Tall image
        } else {
            return 'h-40'; // Standard image
        }
    };

    return (
        <div 
            className="overflow-hidden rounded-md cursor-pointer transform transition-transform duration-200 active:scale-[0.98]"
            onClick={onClick}
        >
            <div className="relative">
                {isLoading && (
                    <Skeleton className={`w-full ${getHeight()}`} />
                )}
                
                {isError ? (
                    <div className={`w-full ${getHeight()} flex items-center justify-center bg-muted`}>
                        <p className="text-xs text-muted-foreground">Not available</p>
                    </div>
                ) : (
                    <img
                        src={photo.url}
                        alt={photo.description}
                        className={`w-full ${getHeight()} object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                )}
                
                {/* Mobile-optimized overlay with smaller text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 hover:opacity-100 active:opacity-100 transition-opacity duration-200 flex items-end">
                    <p className="p-2 w-full text-white text-xs font-medium truncate">
                        {photo.description}
                    </p>
                </div>
            </div>
        </div>
    );
}
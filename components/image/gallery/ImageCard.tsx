import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageCardProps {
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
}

export function ImageCard({ photo, onClick }: ImageCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const handleLoad = () => {
        setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setIsError(true);
    };

    return (
        <Card 
            className="overflow-hidden group cursor-pointer transform transition-transform duration-200 hover:scale-[1.02]"
            onClick={onClick}
        >
            <CardContent className="p-0 relative">
                {isLoading && (
                    <Skeleton className="w-full h-60" />
                )}
                
                {isError ? (
                    <div className="w-full h-60 flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">Image not available</p>
                    </div>
                ) : (
                    <img
                        src={photo.urls.regular}
                        alt={photo.alt_description || "Gallery image"}
                        className={`w-full h-60 object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-4 w-full text-white">
                        <p className="font-medium truncate">{photo.alt_description || "Gallery image"}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
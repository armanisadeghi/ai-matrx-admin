import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { wrap } from "popmotion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { X, Download, Heart, Share2, ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
    }),
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

interface SimplePhoto {
    id: string;
    url: string;
    description: string;
}

interface SimpleImageViewerProps {
    photos: SimplePhoto[];
    initialIndex: number;
    onClose: () => void;
    onDownload: (photo: SimplePhoto) => void;
    onFavorite: (photo: SimplePhoto) => void;
    onShare: (photo: SimplePhoto) => void;
    isFavorite: (photo: SimplePhoto) => boolean;
    onRelatedPhotoClick: (photo: SimplePhoto) => void;
    loadMorePhotos: () => void;
}

export function SimpleImageViewer({
    photos,
    initialIndex,
    onClose,
    onDownload,
    onFavorite,
    onShare,
    isFavorite,
    onRelatedPhotoClick,
    loadMorePhotos,
}: SimpleImageViewerProps) {
    const [[page, direction], setPage] = useState([initialIndex, 0]);
    const [buffer, setBuffer] = useState<string[]>([]);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scale, setScale] = useState(1);
    const imageIndex = wrap(0, photos.length, page);

    const preloadImages = useCallback(
        async (currentPage: number) => {
            const imagesToLoad = [-2, -1, 0, 1, 2]
                .map((offset) => photos[wrap(0, photos.length, currentPage + offset)]?.url)
                .filter(Boolean);
            
            const loadedImages = await Promise.all(
                imagesToLoad.map(
                    (src) =>
                        new Promise<string>((resolve) => {
                            const img = new Image();
                            img.src = src;
                            img.onload = () => resolve(src);
                            img.onerror = () => resolve(src); // Resolve even on error to prevent blocking
                        })
                )
            );
            setBuffer(loadedImages);
        },
        [photos]
    );

    useEffect(() => {
        preloadImages(page);
    }, [page, photos, preloadImages]);

    const paginate = (newDirection: number) => {
        setPage([page + newDirection, newDirection]);
        if (page + newDirection >= photos.length - 5) {
            loadMorePhotos();
        }
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
        setScale(1); // Reset zoom when toggling full screen
    };

    const handleZoom = (zoomIn: boolean) => {
        setScale((prevScale) => {
            const newScale = zoomIn ? prevScale * 1.2 : prevScale / 1.2;
            return Math.min(Math.max(newScale, 0.5), 3); // Limit scale between 0.5 and 3
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 ${isFullScreen ? "bg-black" : "bg-black/50 backdrop-blur-md"} flex items-center justify-center z-50`}
            onClick={onClose}
        >
            <motion.div
                className={`relative bg-transparent rounded-lg overflow-hidden shadow-xl ${
                    isFullScreen ? "w-full h-full" : "max-w-4xl w-full max-h-[90vh]"
                } flex flex-col`}
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
            >
                <div className="relative flex-grow overflow-hidden">
                    <AnimatePresence initial={false} custom={direction}>
                        <motion.img
                            key={page}
                            src={buffer[2] || photos[imageIndex]?.url}
                            alt={photos[imageIndex]?.description}
                            className="w-full h-full object-contain"
                            style={{ scale }}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                            }}
                            drag={isFullScreen ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={1}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = swipePower(offset.x, velocity.x);
                                if (swipe < -swipeConfidenceThreshold) {
                                    paginate(1);
                                } else if (swipe > swipeConfidenceThreshold) {
                                    paginate(-1);
                                }
                            }}
                        />
                    </AnimatePresence>
                    <Button className="absolute top-2 right-2 z-10" variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                    <Button className="absolute top-2 right-10 z-10" variant="ghost" size="icon" onClick={toggleFullScreen}>
                        {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    {isFullScreen && (
                        <>
                            <Button
                                className="absolute bottom-2 right-10 z-10"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleZoom(true)}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                className="absolute bottom-2 right-2 z-10"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleZoom(false)}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
                <Button
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 opacity-75 hover:opacity-100 transition-opacity"
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        paginate(-1);
                    }}
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 opacity-75 hover:opacity-100 transition-opacity"
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        paginate(1);
                    }}
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
                {!isFullScreen && (
                    <>
                        <div className="p-4 bg-card/80 backdrop-blur-sm text-card-foreground">
                            <h3 className="text-lg font-semibold">Image {imageIndex + 1}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                {photos[imageIndex]?.description}
                            </p>
                            <div className="flex space-x-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={() => onDownload(photos[imageIndex])}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={() => onFavorite(photos[imageIndex])}>
                                            <Heart
                                                className={`h-4 w-4 ${isFavorite(photos[imageIndex]) ? "fill-current text-red-500" : ""}`}
                                            />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Favorite</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => onShare(photos[imageIndex])}
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Share</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="p-4 bg-card/80 backdrop-blur-sm">
                            <h4 className="text-md font-semibold mb-2">All Images</h4>
                            <div className="flex space-x-2 overflow-x-auto pb-2">
                                {photos.map((photo, index) => (
                                    <img
                                        key={photo.id}
                                        src={photo.url}
                                        alt={photo.description}
                                        className={`w-20 h-20 object-cover rounded cursor-pointer ${
                                            index === imageIndex ? "ring-2 ring-primary" : ""
                                        }`}
                                        onClick={() => {
                                            setPage([index, index > imageIndex ? 1 : -1]);
                                            onRelatedPhotoClick(photo);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
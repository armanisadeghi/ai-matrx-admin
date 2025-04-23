import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, Link, X, MinusCircle, PlusCircle } from 'lucide-react';
import IconButton from "@/components/ui/official/IconButton";
import { cn } from "@/lib/utils";
import {DEFAULT_IMAGE_SIZES, ImageDimensions, useImage} from '@/hooks/images/useImage';

interface EntityImageDisplayProps {
    src: string;
    alt: string;
    className?: string;
    sizeKey?: keyof typeof DEFAULT_IMAGE_SIZES;
    customDimensions?: Partial<ImageDimensions>;
}

const EntityImageDisplay: React.FC<EntityImageDisplayProps> = (
    { src, alt, className = "", sizeKey = 'thumbnail-medium', customDimensions }
) => {
    const {
        isFullscreen,
        setIsFullscreen,
        imageRef,
        handleClickOutside,
        zoom,
        handleZoomIn,
        handleZoomOut,
        handleCopyImage,
        handleCopyLink,
        downloadImage,
        dimensions,
    } = useImage(src, alt, sizeKey, customDimensions);

    const ActionButton = ({ icon, onClick, tooltip }: {
        icon: React.ElementType,
        onClick: (e: React.MouseEvent) => void,
        tooltip: string
    }) => (
        <IconButton
            icon={icon}
            onClick={onClick}
            tooltip={tooltip}
            size={isFullscreen ? 'md' : 'sm'}
            variant={isFullscreen ? 'secondary' : 'ghost'}
            className={cn(
                isFullscreen && "bg-background/80 hover:bg-background/100 dark:bg-background/80 dark:hover:bg-background/100"
            )}
        />
    );

    const ThumbnailActions = () => (
        <motion.div
            className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <ActionButton icon={Copy} onClick={handleCopyImage} tooltip="Copy image" />
            <ActionButton icon={Link} onClick={handleCopyLink} tooltip="Copy link" />
            <ActionButton icon={Download} onClick={downloadImage} tooltip="Download" />
        </motion.div>
    );

    return (
        <>
            <div
                className={`relative group cursor-pointer overflow-hidden ${className}`}
                style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                onClick={() => setIsFullscreen(true)}
            >
                <motion.div
                    className="w-full h-full"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                >
                    <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-cover"
                        style={{ maxWidth: `${dimensions.width}px`, maxHeight: `${dimensions.height}px` }}
                    />
                </motion.div>
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                <ThumbnailActions />
            </div>

            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        // Full-screen overlay: ensure it takes up the entire viewport
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClickOutside}
                    >
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4"
                             onClick={(e) => e.stopPropagation()}>
                            <motion.img
                                ref={imageRef}
                                src={src}
                                alt={alt}
                                // Full-screen image: ensure it scales correctly and maintains aspect ratio
                                className="max-w-full max-h-full object-contain"
                                style={{ transform: `scale(${zoom})` }}
                                drag
                                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                            />
                            <div className="absolute top-4 right-4">
                                <IconButton
                                    icon={X}
                                    onClick={() => setIsFullscreen(false)}
                                    tooltip="Close"
                                    size="md"
                                    variant="secondary"
                                    className="bg-background/80 hover:bg-background/100 dark:bg-background/80 dark:hover:bg-background/100"
                                />
                            </div>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                <ActionButton icon={Copy} onClick={handleCopyImage} tooltip="Copy image" />
                                <ActionButton icon={Link} onClick={handleCopyLink} tooltip="Copy link" />
                                <ActionButton icon={Download} onClick={downloadImage} tooltip="Download" />
                                <ActionButton icon={MinusCircle} onClick={handleZoomOut} tooltip="Zoom out" />
                                <ActionButton icon={PlusCircle} onClick={handleZoomIn} tooltip="Zoom in" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default EntityImageDisplay;

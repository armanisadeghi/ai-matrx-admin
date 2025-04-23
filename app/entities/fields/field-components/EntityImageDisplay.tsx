// app/entities/fields/EntityImageDisplay.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, Link, X, MinusCircle, PlusCircle } from 'lucide-react';
import IconButton from "@/components/ui/official/IconButton";
import { cn } from "@/lib/utils";
import { DEFAULT_IMAGE_SIZES, ImageDimensions, useImage } from '@/hooks/images/useImage';
import { EntityComponentBaseProps } from "../types";

interface EntityImageDisplayProps extends EntityComponentBaseProps {
    className?: string;
    sizeKey?: keyof typeof DEFAULT_IMAGE_SIZES;
    customDimensions?: Partial<ImageDimensions>;
}

const ActionButton = React.memo(({ icon, onClick, tooltip, isFullscreen }: {
    icon: React.ElementType;
    onClick: (e: React.MouseEvent) => void;
    tooltip: string;
    isFullscreen?: boolean;
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
));

ActionButton.displayName = 'ActionButton';

const ThumbnailActions = React.memo(({ handlers }: {
    handlers: {
        handleCopyImage: (e: React.MouseEvent) => void;
        handleCopyLink: (e: React.MouseEvent) => void;
        downloadImage: (e: React.MouseEvent) => void;
    }
}) => (
    <motion.div
        className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
        <ActionButton icon={Copy} onClick={handlers.handleCopyImage} tooltip="Copy image" />
        <ActionButton icon={Link} onClick={handlers.handleCopyLink} tooltip="Copy link" />
        <ActionButton icon={Download} onClick={handlers.downloadImage} tooltip="Download" />
    </motion.div>
));

ThumbnailActions.displayName = 'ThumbnailActions';

const EntityImageDisplay = React.forwardRef<HTMLDivElement, EntityImageDisplayProps>(
    ({
         entityKey,
         dynamicFieldInfo,
         value = '',
         onChange,
         disabled = false,
         className = "",
         sizeKey = 'thumbnail-medium',
         customDimensions,
         variant = 'default',
         floatingLabel = false,
     }, ref) => {
        const imageUrl = typeof value === 'string' ? value : '';
        const alt = dynamicFieldInfo.displayName || 'Image';

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
        } = useImage(imageUrl, alt, sizeKey, customDimensions);

        if (!imageUrl) {
            return null;
        }

        return (
            <div ref={ref}>
                <div
                    className={cn(
                        'relative group cursor-pointer overflow-hidden',
                        disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                    onClick={() => !disabled && setIsFullscreen(true)}
                >
                    <motion.div
                        className="w-full h-full"
                        whileHover={{ scale: disabled ? 1 : 1.1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <img
                            src={imageUrl}
                            alt={alt}
                            className="w-full h-full object-cover"
                            style={{ maxWidth: `${dimensions.width}px`, maxHeight: `${dimensions.height}px` }}
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                    {!disabled && (
                        <ThumbnailActions
                            handlers={{ handleCopyImage, handleCopyLink, downloadImage }}
                        />
                    )}
                </div>

                <AnimatePresence>
                    {isFullscreen && !disabled && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClickOutside}
                        >
                            <div 
                                className="relative w-full h-full flex flex-col items-center justify-center p-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <motion.img
                                    ref={imageRef}
                                    src={imageUrl}
                                    alt={alt}
                                    className="max-w-full max-h-full object-contain"
                                    style={{ transform: `scale(${zoom})` }}
                                    drag
                                    dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                                />
                                <div className="absolute top-4 right-4">
                                    <ActionButton
                                        icon={X}
                                        onClick={() => setIsFullscreen(false)}
                                        tooltip="Close"
                                        isFullscreen
                                    />
                                </div>
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                    <ActionButton icon={Copy} onClick={handleCopyImage} tooltip="Copy image" isFullscreen />
                                    <ActionButton icon={Link} onClick={handleCopyLink} tooltip="Copy link" isFullscreen />
                                    <ActionButton icon={Download} onClick={downloadImage} tooltip="Download" isFullscreen />
                                    <ActionButton icon={MinusCircle} onClick={handleZoomOut} tooltip="Zoom out" isFullscreen />
                                    <ActionButton icon={PlusCircle} onClick={handleZoomIn} tooltip="Zoom in" isFullscreen />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);

EntityImageDisplay.displayName = "EntityImageDisplay";

export default React.memo(EntityImageDisplay);
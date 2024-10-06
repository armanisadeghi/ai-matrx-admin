import React from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { X, Download, Heart, Share2, Info, ChevronLeft, ChevronRight } from "lucide-react"

interface ImageViewerProps {
    photo: any
    relatedPhotos: any[]
    onClose: () => void
    onDownload: () => void
    onFavorite: () => void
    onShare: () => void
    onInfo: () => void
    isFavorite: boolean
    onRelatedPhotoClick: (photo: any) => void
    onPrevious: () => void
    onNext: () => void
    hasPrevious: boolean
    hasNext: boolean
}

export function ImageViewer({
                                photo,
                                relatedPhotos,
                                onClose,
                                onDownload,
                                onFavorite,
                                onShare,
                                onInfo,
                                isFavorite,
                                onRelatedPhotoClick,
                                onPrevious,
                                onNext,
                                hasPrevious,
                                hasNext
                            }: ImageViewerProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-background bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                className="relative bg-card rounded-lg overflow-hidden shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
            >
                <div className="relative flex-grow overflow-hidden">
                    <img
                        src={photo.urls.regular}
                        alt={photo.alt_description}
                        className="w-full h-full object-contain"
                    />
                    <Button
                        className="absolute top-2 right-2 z-10"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {hasPrevious && (
                    <Button
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 opacity-75 hover:opacity-100 transition-opacity"
                        variant="secondary"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                )}
                {hasNext && (
                    <Button
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 opacity-75 hover:opacity-100 transition-opacity"
                        variant="secondary"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                )}

                <div className="p-4 bg-card text-card-foreground">
                    <h3 className="text-lg font-semibold">{photo.user.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{photo.description || photo.alt_description}</p>
                    <div className="flex space-x-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onDownload}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Download
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onFavorite}>
                                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Favorite
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onShare}>
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Share
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onInfo}>
                                    <Info className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Image Info
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {relatedPhotos.length > 0 && (
                    <div className="p-4 bg-card">
                        <h4 className="text-md font-semibold mb-2">Related Images</h4>
                        <div className="flex space-x-2 overflow-x-auto">
                            {relatedPhotos.slice(0, 5).map((relatedPhoto) => (
                                <img
                                    key={relatedPhoto.id}
                                    src={relatedPhoto.urls.thumb}
                                    alt={relatedPhoto.alt_description}
                                    className="w-20 h-20 object-cover rounded cursor-pointer"
                                    onClick={() => onRelatedPhotoClick(relatedPhoto)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}

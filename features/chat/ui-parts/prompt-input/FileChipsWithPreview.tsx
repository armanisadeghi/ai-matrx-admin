import React, { useCallback, useState, useRef, useEffect } from "react";
import { X, FileImage } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import FilePreviewSheet from "@/components/ui/file-preview/FilePreviewSheet";

interface FileChipsProps {
    files: { url: string; type: string; details?: EnhancedFileDetails }[];
    onRemoveFile: (index: number) => void;
}

const FileChipsWithPreview: React.FC<FileChipsProps> = ({ files, onRemoveFile }) => {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [sheetPreviewIndex, setSheetPreviewIndex] = useState<number | null>(null);
    
    const truncateFileName = useCallback((name: string, maxLength: number = 16) => {
        if (name.length <= maxLength) return name;
        const lastDotIndex = name.lastIndexOf(".");
        const extension = lastDotIndex !== -1 ? name.slice(lastDotIndex) : "";
        const nameWithoutExt = lastDotIndex !== -1 ? name.slice(0, lastDotIndex) : name;
        const availableChars = maxLength - extension.length - 3;
        if (availableChars <= 0) {
            return `${nameWithoutExt.charAt(0)}..${extension}`;
        }
        return `${nameWithoutExt.slice(0, availableChars)}...${extension}`;
    }, []);
    
    const isPreviewable = useCallback((file: { type: string; details?: EnhancedFileDetails }) => {
        const typeIsImage = file.type === 'image' || file.type.startsWith('image/');
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        const extension = file.details?.extension?.toLowerCase() || '';
        const extensionIsImage = imageExtensions.includes(extension);
        const isMarkedPreviewable = file.details?.canPreview === true;
        
        return typeIsImage || extensionIsImage || isMarkedPreviewable;
    }, []);
    
    const getIconComponent = useCallback((file: { details?: EnhancedFileDetails }) => {
        if (file.details?.icon && typeof file.details.icon === 'function') {
            return file.details.icon;
        }
        return FileImage;
    }, []);
    
    useEffect(() => {
        if (previewIndex !== null && chipRefs.current[previewIndex]) {
            const chipElement = chipRefs.current[previewIndex];
            const rect = chipElement?.getBoundingClientRect();
            
            if (rect) {
                // Offset the preview to the left by 30px to avoid covering the X button
                setPreviewPosition({
                    x: rect.left + (rect.width / 2) - 30,
                    y: rect.top + 20
                });
            }
        }
    }, [previewIndex]);
    
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (previewIndex !== null) {
            // Apply the offset here as well to maintain consistency
            setPreviewPosition({
                x: e.clientX - 30,
                y: e.clientY + 20
            });
        }
    }, [previewIndex]);
    
    const handleChipClick = useCallback((index: number) => {
        setSheetPreviewIndex(index);
    }, []);
    
    const handleClosePreview = useCallback(() => {
        setSheetPreviewIndex(null);
    }, []);
    
    if (files.length === 0) {
        return null;
    }
    
    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600"
            >
                {files.map((file, index) => {
                    const details = file.details || { filename: 'Unknown', extension: '', color: '', iconName: '' };
                    const { filename, color } = details;
                    const IconComponent = getIconComponent(file);
                    return (
                        <div key={`${file.url}-${index}`} className="relative">
                            <motion.div
                                ref={(el) => {
                                    chipRefs.current[index] = el;
                                }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-300/80 dark:bg-zinc-700/80 text-xs text-gray-800 dark:text-gray-200 shadow-md hover:bg-zinc-400/70 dark:hover:bg-zinc-600/70 cursor-pointer transition-colors select-none"
                                onMouseEnter={() => setPreviewIndex(index)}
                                onMouseLeave={() => setPreviewIndex(null)}
                                onMouseMove={handleMouseMove}
                                onClick={() => handleChipClick(index)}
                            >
                                <IconComponent className={`text-xs mr-1 ${color}`} />
                                <span className="select-none">
                                    {truncateFileName(filename)}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent triggering chip click
                                        onRemoveFile(index);
                                    }}
                                    className="ml-1 p-0.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors"
                                    aria-label={`Remove ${filename}`}
                                >
                                    <X size={14} className="text-gray-600 dark:text-gray-400" />
                                </button>
                            </motion.div>
                        </div>
                    );
                })}
            </motion.div>
            
            {/* Hover Preview */}
            <div id="preview-portal" className="fixed top-0 left-0 w-full h-0 overflow-visible pointer-events-none z-[9999]">
                <AnimatePresence>
                    {previewIndex !== null && files[previewIndex] && (
                        <motion.div
                            key={`preview-${previewIndex}`}
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute shadow-lg rounded-lg overflow-hidden"
                            style={{
                                width: isPreviewable(files[previewIndex]) ? "200px" : "240px",
                                left: `${previewPosition.x}px`,
                                top: `${previewPosition.y}px`,
                                transform: 'translate(-50%, -100%)'
                            }}
                        >
                            <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                {files[previewIndex] && isPreviewable(files[previewIndex]) ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-full h-32 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded overflow-hidden">
                                            <img
                                                src={files[previewIndex].url}
                                                alt={files[previewIndex].details?.filename || 'Preview'}
                                                className="max-w-full max-h-full object-contain"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                                                    target.className = "w-12 h-12 text-gray-400";
                                                }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400 break-words max-w-full px-2">
                                            {files[previewIndex].details?.filename || 'Image preview'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-start p-1">
                                        <div className="flex-shrink-0 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg mr-3">
                                            {React.createElement(
                                                getIconComponent(files[previewIndex]),
                                                { className: files[previewIndex].details?.color || '' }
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1 break-words">
                                                {files[previewIndex].details?.filename || 'Unknown file'}
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                Type: {(files[previewIndex].details?.extension || '').toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="absolute left-1/2 bottom-0 w-4 h-4 bg-white dark:bg-zinc-800 border-b border-r border-zinc-200 dark:border-zinc-700 transform rotate-45 translate-y-2 -translate-x-1/2"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Full Sheet Preview */}
            {sheetPreviewIndex !== null && files[sheetPreviewIndex] && (
                <FilePreviewSheet
                    isOpen={sheetPreviewIndex !== null}
                    onClose={handleClosePreview}
                    file={files[sheetPreviewIndex]}
                />
            )}
        </>
    );
};

export default FileChipsWithPreview;
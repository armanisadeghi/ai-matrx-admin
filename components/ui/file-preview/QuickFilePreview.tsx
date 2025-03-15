import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

interface FilePreviewProps {
    files: { url: string; type: string; details?: EnhancedFileDetails }[];
    previewIndex: number | null;
    previewPosition: { x: number; y: number };
    getIconComponent: (file: { details?: EnhancedFileDetails }) => React.ComponentType<{ className?: string }>;
    isPreviewable: (file: { type: string; details?: EnhancedFileDetails }) => boolean;
}

const QuickFilePreview: React.FC<FilePreviewProps> = ({ files, previewIndex, previewPosition, getIconComponent, isPreviewable }) => {
    return (
        <div id="preview-portal" className="fixed top-0 left-0 w-full h-0 overflow-visible pointer-events-none z-[9999]">
            <AnimatePresence>
                {previewIndex !== null && files[previewIndex] && (
                    <motion.div
                        key={`preview-${previewIndex}`}
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute shadow-lg rounded-lg overflow-hidden"
                        style={{
                            width: isPreviewable(files[previewIndex]) ? "200px" : "240px",
                            left: `${previewPosition.x}px`,
                            top: `${previewPosition.y}px`,
                            transform: "translate(-50%, -100%)",
                        }}
                    >
                        <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            {files[previewIndex] && isPreviewable(files[previewIndex]) ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-full h-32 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded overflow-hidden">
                                        <img
                                            src={files[previewIndex].url}
                                            alt={files[previewIndex].details?.filename || "Preview"}
                                            className="max-w-full max-h-full object-contain"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src =
                                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                                                target.className = "w-12 h-12 text-gray-400";
                                            }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400 break-words max-w-full px-2">
                                        {files[previewIndex].details?.filename || "Image preview"}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-start p-1">
                                    <div className="flex-shrink-0 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg mr-3">
                                        {React.createElement(getIconComponent(files[previewIndex]), {
                                            className: files[previewIndex].details?.color || "",
                                        })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1 break-words">
                                            {files[previewIndex].details?.filename || "Unknown file"}
                                        </h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Type: {(files[previewIndex].details?.extension || "").toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute left-1/2 top-full w-4 h-4 bg-white dark:bg-zinc-800 border-b border-r border-zinc-200 dark:border-zinc-700 transform rotate-45 -translate-y-2 -translate-x-1/2"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuickFilePreview;
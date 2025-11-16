import React, { useCallback, useState, useRef, useEffect } from "react";
import { X, FileImage } from "lucide-react";
import { motion } from "motion/react";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import FilePreviewSheet from "@/components/ui/file-preview/FilePreviewSheet";
import QuickFilePreview from "@/components/ui/file-preview/QuickFilePreview";
import { twMerge } from "tailwind-merge";

// Size configurations
const sizeConfigs = {
    xs: {
        chipPadding: "px-2 py-0.5",
        fontSize: "text-xs",
        iconSize: 12,
        iconMargin: "mr-0.5",
        closeButtonSize: 12,
        closeButtonPadding: "p-0.5",
        maxLength: 12,
    },
    sm: {
        chipPadding: "px-2.5 py-0.75",
        fontSize: "text-xs",
        iconSize: 13,
        iconMargin: "mr-0.75",
        closeButtonSize: 13,
        closeButtonPadding: "p-0.5",
        maxLength: 14,
    },
    md: {
        chipPadding: "px-3 py-1",
        fontSize: "text-xs",
        iconSize: 14,
        iconMargin: "mr-1",
        closeButtonSize: 14,
        closeButtonPadding: "p-0.5",
        maxLength: 16,
    },
    lg: {
        chipPadding: "px-3.5 py-1.5",
        fontSize: "text-sm",
        iconSize: 16,
        iconMargin: "mr-1.5",
        closeButtonSize: 15,
        closeButtonPadding: "p-0.5",
        maxLength: 18,
    },
    xl: {
        chipPadding: "px-4 py-2",
        fontSize: "text-sm",
        iconSize: 18,
        iconMargin: "mr-2",
        closeButtonSize: 16,
        closeButtonPadding: "p-1",
        maxLength: 20,
    },
};

type SizeType = keyof typeof sizeConfigs;

interface FileChipsProps {
    files: { url: string; type: string; details?: EnhancedFileDetails }[];
    onRemoveFile: (index: number) => void;
    size?: SizeType;
    showQuickPreview?: boolean;
    showSheetPreview?: boolean;
    className?: string;
    chipClassName?: string;
}

const FileChipsWithPreview: React.FC<FileChipsProps> = ({
    files,
    onRemoveFile,
    size = "md",
    showQuickPreview = true,
    showSheetPreview = true,
    className = "",
    chipClassName = "",
}) => {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [sheetPreviewIndex, setSheetPreviewIndex] = useState<number | null>(null);

    const sizeConfig = sizeConfigs[size];

    const truncateFileName = useCallback(
        (name: string, maxLength: number = sizeConfig.maxLength) => {
            if (name.length <= maxLength) return name;
            const lastDotIndex = name.lastIndexOf(".");
            const extension = lastDotIndex !== -1 ? name.slice(lastDotIndex) : "";
            const nameWithoutExt = lastDotIndex !== -1 ? name.slice(0, lastDotIndex) : name;
            const availableChars = maxLength - extension.length - 3;
            if (availableChars <= 0) {
                return `${nameWithoutExt.charAt(0)}..${extension}`;
            }
            return `${nameWithoutExt.slice(0, availableChars)}..${extension}`;
        },
        [sizeConfig.maxLength]
    );

    const isPreviewable = useCallback((file: { type: string; details?: EnhancedFileDetails }) => {
        const typeIsImage = file.type === "image" || file.type.startsWith("image/");
        const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
        const extension = file.details?.extension?.toLowerCase() || "";
        const extensionIsImage = imageExtensions.includes(extension);
        const isMarkedPreviewable = file.details?.canPreview === true;

        return typeIsImage || extensionIsImage || isMarkedPreviewable;
    }, []);

    const getIconComponent = useCallback((file: { details?: EnhancedFileDetails }) => {
        if (file.details?.icon && typeof file.details.icon === "function") {
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
                    x: rect.left + rect.width / 2 - 30,
                    y: rect.top + 20,
                });
            }
        }
    }, [previewIndex]);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (previewIndex !== null) {
                // Apply the offset here as well to maintain consistency
                setPreviewPosition({
                    x: e.clientX - 30,
                    y: e.clientY + 20,
                });
            }
        },
        [previewIndex]
    );

    const handleChipClick = useCallback(
        (index: number) => {
            if (showSheetPreview) {
                setSheetPreviewIndex(index);
            }
        },
        [showSheetPreview]
    );

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
                className={twMerge(
                    "mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600",
                    className
                )}
            >
                {files.map((file, index) => {
                    const details = file.details || { filename: "Unknown", extension: "", color: "", iconName: "" };
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
                                className={twMerge(
                                    `inline-flex items-center ${sizeConfig.chipPadding} rounded-full bg-zinc-300/80 dark:bg-zinc-700/80 ${sizeConfig.fontSize} text-gray-800 dark:text-gray-200 shadow-md hover:bg-zinc-400/70 dark:hover:bg-zinc-600/70 cursor-pointer transition-colors select-none`,
                                    chipClassName
                                )}
                                onMouseEnter={() => showQuickPreview && setPreviewIndex(index)}
                                onMouseLeave={() => showQuickPreview && setPreviewIndex(null)}
                                onMouseMove={showQuickPreview ? handleMouseMove : undefined}
                                onClick={() => handleChipClick(index)}
                            >
                                {React.createElement(IconComponent, {
                                    ...(typeof IconComponent !== "string" ? { size: sizeConfig.iconSize } : {}),
                                    className: `${sizeConfig.iconMargin} ${color}`,
                                })}
                                <span className="select-none">{truncateFileName(filename)}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFile(index);
                                    }}
                                    className={`ml-1 ${sizeConfig.closeButtonPadding} rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors`}
                                    aria-label={`Remove ${filename}`}
                                >
                                    <X size={sizeConfig.closeButtonSize} className="text-gray-600 dark:text-gray-400" />
                                </button>
                            </motion.div>
                        </div>
                    );
                })}
            </motion.div>

            {/* Use the separated FilePreview component */}
            {showQuickPreview && (
                <QuickFilePreview
                    files={files}
                    previewIndex={previewIndex}
                    previewPosition={previewPosition}
                    getIconComponent={getIconComponent}
                    isPreviewable={isPreviewable}
                />
            )}

            {/* Full Sheet Preview */}
            {showSheetPreview && sheetPreviewIndex !== null && files[sheetPreviewIndex] && (
                <FilePreviewSheet isOpen={sheetPreviewIndex !== null} onClose={handleClosePreview} file={files[sheetPreviewIndex]} />
            )}
        </>
    );
};

export default FileChipsWithPreview;

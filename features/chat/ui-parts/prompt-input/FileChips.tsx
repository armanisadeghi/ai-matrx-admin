import React, { useCallback } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { getFileDetails } from "@/utils/file-operations/constants";


interface FileChipsProps {
    files: { url: string; type: string }[];
    onRemoveFile: (index: number) => void;
}

const FileChips: React.FC<FileChipsProps> = ({ files, onRemoveFile }) => {
    // Utility functions
    const truncateFileName = useCallback((name: string, maxLength: number = 16) => {
        if (name.length <= maxLength) return name;
        
        // Extract the extension
        const lastDotIndex = name.lastIndexOf(".");
        const extension = lastDotIndex !== -1 ? name.slice(lastDotIndex) : "";
        const nameWithoutExt = lastDotIndex !== -1 ? name.slice(0, lastDotIndex) : name;
        
        // Calculate how much of the name we can show
        const availableChars = maxLength - extension.length - 3; // 3 for "..."
        
        if (availableChars <= 0) {
            // If extension is very long, show at least 1 character of the name
            return `${nameWithoutExt.charAt(0)}...${extension}`;
        }
        
        return `${nameWithoutExt.slice(0, availableChars)}...${extension}`;
    }, []);

    const getFilename = useCallback((url: string) => {
        return url.split("/").pop() || "";
    }, []);

    // Get the icon component for a file based on its URL
    const getFileIcon = useCallback(
        (url: string) => {
            const filename = getFilename(url);
            const extension = filename.split(".").pop() || "";
            const fileDetails = getFileDetails(extension);
            const Icon = fileDetails.icon;
            const color = fileDetails.color;
            return <Icon className={`mr-1.5 ${color}`} />;
        },
        [getFilename]
    );

    if (files.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600"
        >
            {files.map((file, index) => (
                <motion.div
                    key={`${file.url}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-300/80 dark:bg-zinc-700/80 text-sm text-gray-800 dark:text-gray-200 shadow-md hover:bg-zinc-400/70 dark:hover:bg-zinc-600/70 cursor-default transition-colors select-none"
                >
                    {getFileIcon(file.url)}
                    <span className="truncate max-w-[120px] select-none" title={getFilename(file.url)}>
                        {truncateFileName(getFilename(file.url))}
                    </span>
                    <button
                        onClick={() => onRemoveFile(index)}
                        className="p-0.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors"
                        aria-label={`Remove ${getFilename(file.url)}`}
                    >
                        <X size={14} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default FileChips;
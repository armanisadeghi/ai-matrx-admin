"use client";

import React, { useState, useCallback } from "react";
import { X, StickyNote, CheckSquare, Table2, Globe, File, FolderKanban, FileText, Youtube } from "lucide-react";
import { motion } from "framer-motion";

// Resource types
export type Resource = 
    | { type: "note"; data: any }
    | { type: "task"; data: any }
    | { type: "project"; data: any }
    | { type: "file"; data: any }
    | { type: "table"; data: any }
    | { type: "webpage"; data: any }
    | { type: "youtube"; data: any };

interface ResourceChipsProps {
    resources: Resource[];
    onRemove: (index: number) => void;
    onPreview?: (resource: Resource, index: number) => void;
}

export function ResourceChips({ resources, onRemove, onPreview }: ResourceChipsProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const getResourceDisplay = useCallback((resource: Resource) => {
        switch (resource.type) {
            case "note":
                return {
                    icon: StickyNote,
                    label: resource.data.label || "Note",
                    color: "text-orange-600 dark:text-orange-500",
                    bgColor: "bg-orange-100 dark:bg-orange-950/30",
                };
            case "task":
                return {
                    icon: CheckSquare,
                    label: resource.data.title || "Task",
                    color: "text-blue-600 dark:text-blue-500",
                    bgColor: "bg-blue-100 dark:bg-blue-950/30",
                };
            case "project":
                return {
                    icon: FolderKanban,
                    label: resource.data.name || "Project",
                    color: "text-purple-600 dark:text-purple-500",
                    bgColor: "bg-purple-100 dark:bg-purple-950/30",
                };
            case "file":
                const fileIcon = resource.data.details?.icon || File;
                return {
                    icon: fileIcon,
                    label: resource.data.details?.filename || "File",
                    color: resource.data.details?.color || "text-gray-600 dark:text-gray-400",
                    bgColor: "bg-gray-100 dark:bg-gray-800",
                };
            case "table":
                return {
                    icon: Table2,
                    label: resource.data.table_name || "Table",
                    color: "text-green-600 dark:text-green-500",
                    bgColor: "bg-green-100 dark:bg-green-950/30",
                };
            case "webpage":
                return {
                    icon: Globe,
                    label: resource.data.title || "Webpage",
                    color: "text-teal-600 dark:text-teal-500",
                    bgColor: "bg-teal-100 dark:bg-teal-950/30",
                };
            case "youtube":
                return {
                    icon: Youtube,
                    label: resource.data.title || "YouTube Video",
                    color: "text-red-600 dark:text-red-500",
                    bgColor: "bg-red-100 dark:bg-red-950/30",
                };
            default:
                return {
                    icon: FileText,
                    label: "Resource",
                    color: "text-gray-600 dark:text-gray-400",
                    bgColor: "bg-gray-100 dark:bg-gray-800",
                };
        }
    }, []);

    const truncateLabel = useCallback((label: string, maxLength: number = 20) => {
        if (label.length <= maxLength) return label;
        return `${label.slice(0, maxLength)}...`;
    }, []);

    if (resources.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-1.5 mb-2 px-2"
        >
            {resources.map((resource, index) => {
                const display = getResourceDisplay(resource);
                const Icon = display.icon;
                
                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all ${display.bgColor} hover:shadow-sm`}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => onPreview?.(resource, index)}
                    >
                        <Icon className={`w-3 h-3 mr-1 ${display.color}`} />
                        <span className="text-gray-900 dark:text-gray-100 select-none">
                            {truncateLabel(display.label)}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(index);
                            }}
                            className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            aria-label={`Remove ${display.label}`}
                        >
                            <X className="w-2.5 h-2.5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}


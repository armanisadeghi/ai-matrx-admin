"use client";

import React, { useState } from "react";
import { FileText, StickyNote, CheckSquare, Table2, Globe, Workflow, ChevronLeft, Upload, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotesResourcePicker } from "./NotesResourcePicker";
import { TasksResourcePicker } from "./TasksResourcePicker";
import { FilesResourcePicker } from "./FilesResourcePicker";
import { TablesResourcePicker } from "./TablesResourcePicker";
import { WebpageResourcePicker } from "./WebpageResourcePicker";
import { UploadResourcePicker } from "./UploadResourcePicker";
import { YouTubeResourcePicker } from "./YouTubeResourcePicker";

type ResourceType = "upload" | "storage" | "notes" | "tasks" | "tables" | "webpage" | "youtube" | "brokers" | null;

interface ResourcePickerMenuProps {
    onResourceSelected: (resource: any) => void;
    onClose: () => void;
    attachmentCapabilities?: {
        supportsImageUrls?: boolean;
        supportsFileUrls?: boolean;
        supportsYoutubeVideos?: boolean;
    };
}

export function ResourcePickerMenu({ onResourceSelected, onClose, attachmentCapabilities }: ResourcePickerMenuProps) {
    const [activeView, setActiveView] = useState<ResourceType>(null);

    const allResources = [
        { id: "upload", label: "Upload Files", icon: Upload, description: "Upload images & files", requiresCapability: null },
        { id: "storage", label: "Storage Files", icon: FileText, description: "Browse Supabase storage", requiresCapability: null },
        { id: "notes", label: "Notes", icon: StickyNote, description: "Reference your notes", requiresCapability: null },
        { id: "tasks", label: "Tasks", icon: CheckSquare, description: "Include task data", requiresCapability: null },
        { id: "tables", label: "Tables", icon: Table2, description: "Add table data", requiresCapability: null },
        { id: "webpage", label: "Webpage", icon: Globe, description: "Fetch webpage content", requiresCapability: null },
        { id: "youtube", label: "YouTube", icon: Youtube, description: "Add YouTube video", requiresCapability: 'supportsYoutubeVideos' as const },
        { id: "brokers", label: "Brokers", icon: Workflow, description: "Connect to brokers", requiresCapability: null },
    ];

    // Filter resources based on capabilities
    const resources = allResources.filter(resource => {
        if (!resource.requiresCapability) return true;
        return attachmentCapabilities?.[resource.requiresCapability] === true;
    });

    // Show specific resource picker based on selection
    if (activeView) {
        if (activeView === "upload") {
            return (
                <UploadResourcePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(files) => {
                        // Handle multiple files
                        files.forEach(file => {
                            onResourceSelected({ type: "file", data: file });
                        });
                    }}
                />
            );
        }

        if (activeView === "storage") {
            return (
                <FilesResourcePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(selection) => {
                        onResourceSelected({ type: "file", data: selection });
                    }}
                />
            );
        }

        if (activeView === "notes") {
            return (
                <NotesResourcePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(note) => {
                        onResourceSelected({ type: "note", data: note });
                    }}
                />
            );
        }

        if (activeView === "tasks") {
            return (
                <TasksResourcePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(selection) => {
                        onResourceSelected(selection);
                    }}
                />
            );
        }

        if (activeView === "tables") {
            return (
                <TablesResourcePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(reference) => {
                        onResourceSelected({ type: "table", data: reference });
                    }}
                />
            );
        }

            if (activeView === "webpage") {
                return (
                    <WebpageResourcePicker 
                        onBack={() => setActiveView(null)}
                        onSelect={(content) => {
                            onResourceSelected({ type: "webpage", data: content });
                        }}
                    />
                );
            }

            if (activeView === "youtube") {
                return (
                    <YouTubeResourcePicker 
                        onBack={() => setActiveView(null)}
                        onSelect={(video) => {
                            onResourceSelected({ type: "youtube", data: video });
                        }}
                    />
                );
            }

            // Add other resource pickers here as they're implemented
            return (
            <div className="p-3">
                <div className="flex items-center gap-2 mb-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setActiveView(null)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {resources.find(r => r.id === activeView)?.label}
                    </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                    Coming soon...
                </div>
            </div>
        );
    }

    // Main menu view
    return (
        <div className="p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1.5 mb-1">
                Add Resource
            </div>
            <div className="space-y-0.5">
                {resources.map((resource) => {
                    const Icon = resource.icon;
                    return (
                        <Button
                            key={resource.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-9 text-xs px-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            onClick={() => setActiveView(resource.id as ResourceType)}
                        >
                            <Icon className="w-4 h-4 mr-2 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                            <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {resource.label}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                                    {resource.description}
                                </div>
                            </div>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}


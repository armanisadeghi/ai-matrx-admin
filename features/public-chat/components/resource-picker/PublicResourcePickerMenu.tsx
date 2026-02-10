"use client";

import React, { useState } from "react";
import { 
    FileText, 
    StickyNote, 
    CheckSquare, 
    Table2, 
    Globe, 
    Workflow, 
    ChevronLeft, 
    ChevronRight, 
    Upload, 
    Youtube, 
    Image, 
    File, 
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicResource } from "../../types/content";
import { PublicUploadResourcePicker } from "./PublicUploadResourcePicker";
import { PublicImageUrlPicker } from "./PublicImageUrlPicker";
import { PublicFileUrlPicker } from "./PublicFileUrlPicker";
import { PublicYouTubePicker } from "./PublicYouTubePicker";
import { PublicWebpagePicker } from "./PublicWebpagePicker";

type ResourceType = 
    | "upload" 
    | "storage" 
    | "notes" 
    | "tasks" 
    | "tables" 
    | "webpage" 
    | "youtube" 
    | "image_link" 
    | "file_link" 
    | "brokers" 
    | null;

interface PublicResourcePickerMenuProps {
    onResourceSelected: (resource: PublicResource) => void;
    onClose: () => void;
    isAuthenticated?: boolean;
}

interface ResourceItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresAuth: boolean;
    comingSoon?: boolean;
    todoNote?: string;
}

interface ResourceCategory {
    category: string;
    items: ResourceItem[];
}

export function PublicResourcePickerMenu({ 
    onResourceSelected, 
    onClose,
    isAuthenticated = false,
}: PublicResourcePickerMenuProps) {
    const [activeView, setActiveView] = useState<ResourceType>(null);
    const [currentUrl, setCurrentUrl] = useState<string>("");

    // Helper to switch views and carry over the URL
    const switchToView = (view: ResourceType, url: string) => {
        setCurrentUrl(url);
        setActiveView(view);
    };

    const resourceCategories: ResourceCategory[] = [
        {
            category: "Files",
            items: [
                { id: "upload", label: "Upload Files", icon: Upload, requiresAuth: false },
            ]
        },
        {
            category: "Web",
            items: [
                { id: "webpage", label: "Webpage", icon: Globe, requiresAuth: false },
                { id: "image_link", label: "Image URL", icon: Image, requiresAuth: false },
                { id: "file_link", label: "File URL", icon: File, requiresAuth: false },
                { id: "youtube", label: "YouTube", icon: Youtube, requiresAuth: false },
            ]
        },
        {
            category: "Matrx",
            items: [
                { 
                    id: "storage", 
                    label: "Stored Files", 
                    icon: FileText, 
                    requiresAuth: true,
                    todoNote: "TODO: Implement file browser for authenticated users"
                },
                { 
                    id: "tables", 
                    label: "Tables", 
                    icon: Table2, 
                    requiresAuth: true,
                    todoNote: "TODO: Implement table picker for authenticated users"
                },
                { 
                    id: "notes", 
                    label: "Notes", 
                    icon: StickyNote, 
                    requiresAuth: true,
                    todoNote: "TODO: Implement notes picker for authenticated users"
                },
                { 
                    id: "tasks", 
                    label: "Tasks", 
                    icon: CheckSquare, 
                    requiresAuth: true,
                    todoNote: "TODO: Implement tasks picker for authenticated users"
                },
                { 
                    id: "brokers", 
                    label: "Brokers", 
                    icon: Workflow, 
                    requiresAuth: true,
                    comingSoon: true,
                    todoNote: "TODO: Implement broker picker"
                },
            ]
        },
    ];

    // Check if a resource is enabled
    const isResourceEnabled = (resource: ResourceItem) => {
        if (resource.comingSoon) return false;
        if (resource.requiresAuth && !isAuthenticated) return false;
        return true;
    };

    // Get disable reason
    const getDisableReason = (resource: ResourceItem) => {
        if (resource.comingSoon) return "Coming soon";
        if (resource.requiresAuth && !isAuthenticated) return "Sign in required";
        return undefined;
    };

    // Handle resource selection from sub-pickers
    const handleResourceSelected = (resource: PublicResource) => {
        onResourceSelected(resource);
        onClose();
    };

    // Show specific resource picker based on selection
    if (activeView) {
        if (activeView === "upload") {
            return (
                <PublicUploadResourcePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(files) => {
                        files.forEach(file => handleResourceSelected(file));
                    }}
                />
            );
        }

        if (activeView === "image_link") {
            return (
                <PublicImageUrlPicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(imageData) => handleResourceSelected(imageData)}
                    onSwitchTo={(type, url) => switchToView(type, url)}
                    initialUrl={currentUrl}
                />
            );
        }

        if (activeView === "file_link") {
            return (
                <PublicFileUrlPicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(fileData) => handleResourceSelected(fileData)}
                    onSwitchTo={(type, url) => switchToView(type, url)}
                    initialUrl={currentUrl}
                />
            );
        }

        if (activeView === "youtube") {
            return (
                <PublicYouTubePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(videoData) => handleResourceSelected(videoData)}
                    initialUrl={currentUrl}
                />
            );
        }

        if (activeView === "webpage") {
            return (
                <PublicWebpagePicker 
                    onBack={() => setActiveView(null)}
                    onSelect={(webpageData) => handleResourceSelected(webpageData)}
                    onSwitchTo={(type, url) => switchToView(type, url)}
                    initialUrl={currentUrl}
                />
            );
        }

        // For auth-required features, show placeholder with sign-in prompt
        const currentResource = resourceCategories
            .flatMap(cat => cat.items)
            .find(r => r.id === activeView);

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
                        {currentResource?.label}
                    </span>
                </div>
                <div className="text-center py-8">
                    <Lock className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {currentResource?.requiresAuth 
                            ? "Sign in to access this feature"
                            : "Coming soon..."}
                    </p>
                    {currentResource?.requiresAuth && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                // TODO: Implement sign-in flow
                                window.location.href = '/auth/sign-in';
                            }}
                        >
                            Sign In
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Main menu view
    return (
        <div className="py-1">
            {resourceCategories.map((category) => (
                <div key={category.category}>
                    <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2 py-0.5 mt-1">
                        {category.category}
                    </div>
                    {category.items.map((resource) => {
                        const Icon = resource.icon;
                        const isEnabled = isResourceEnabled(resource);
                        const disableReason = getDisableReason(resource);

                        return (
                            <Button
                                key={resource.id}
                                variant="ghost"
                                size="sm"
                                disabled={!isEnabled}
                                className="group w-full justify-start h-6 text-xs px-2 py-0 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                                onClick={() => setActiveView(resource.id as ResourceType)}
                                title={disableReason}
                            >
                                <Icon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-900 dark:text-gray-100 font-normal">
                                    {resource.label}
                                </span>
                                {!isEnabled && (
                                    <span className="ml-2 text-[8px] px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 flex items-center gap-0.5">
                                        {resource.requiresAuth && <Lock className="w-2 h-2" />}
                                        {disableReason}
                                    </span>
                                )}
                                <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
                            </Button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

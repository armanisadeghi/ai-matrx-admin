"use client";

import React, { useState } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResourcePickerMenu } from "./ResourcePickerMenu";

interface ResourcePickerButtonProps {
    onResourceSelected?: (resource: any) => void;
    attachmentCapabilities?: {
        supportsImageUrls?: boolean;
        supportsFileUrls?: boolean;
        supportsYoutubeVideos?: boolean;
    };
}

export function ResourcePickerButton({ onResourceSelected, attachmentCapabilities }: ResourcePickerButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" 
                    tabIndex={-1}
                    title="Add resource"
                >
                    <Database className="w-3.5 h-3.5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-80 p-0 border-gray-300 dark:border-gray-700" 
                align="start" 
                side="top"
                sideOffset={8}
            >
                <ResourcePickerMenu 
                    onResourceSelected={(resource) => {
                        onResourceSelected?.(resource);
                        setIsOpen(false);
                    }}
                    onClose={() => setIsOpen(false)}
                    attachmentCapabilities={attachmentCapabilities}
                />
            </PopoverContent>
        </Popover>
    );
}


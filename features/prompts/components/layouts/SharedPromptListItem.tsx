"use client";

import { useState } from "react";
import { Loader2, Users, MoreVertical, Play, Pencil, Eye, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PermissionLevel } from "@/utils/permissions/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SharedPromptListItemProps {
    id: string;
    name: string;
    description?: string | null;
    permissionLevel: PermissionLevel;
    ownerEmail: string;
    onDuplicate?: (id: string) => void;
    onNavigate?: (id: string, path: string) => void;
    isDuplicating?: boolean;
    isNavigating?: boolean;
    isAnyNavigating?: boolean;
}

const permissionConfig: Record<PermissionLevel, { label: string; color: string; bgColor: string }> = {
    viewer: {
        label: "View",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    editor: {
        label: "Edit",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    admin: {
        label: "Admin",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
    },
};

export function SharedPromptListItem({
    id,
    name,
    description,
    permissionLevel,
    ownerEmail,
    onDuplicate,
    onNavigate,
    isDuplicating,
    isNavigating,
    isAnyNavigating
}: SharedPromptListItemProps) {
    const [lastModalCloseTime, setLastModalCloseTime] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleItemClick = () => {
        const timeSinceClose = Date.now() - lastModalCloseTime;
        if (!isDisabled && timeSinceClose > 300) {
            // Default action: Run for viewer, Edit for editor/admin
            if (permissionLevel === 'viewer') {
                handleRun();
            } else {
                handleEdit();
            }
        }
    };

    const handleRun = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onNavigate && !isDisabled) {
            onNavigate(id, `/ai/prompts/run/${id}`);
        }
    };

    const handleEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onNavigate && !isDisabled) {
            onNavigate(id, `/ai/prompts/edit/${id}`);
        }
    };

    const handleView = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onNavigate && !isDisabled) {
            onNavigate(id, `/ai/prompts/view/${id}`);
        }
    };

    const handleDuplicate = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onDuplicate) {
            onDuplicate(id);
        }
    };

    const isDisabled = isNavigating || isAnyNavigating;
    const canEdit = permissionLevel === 'editor' || permissionLevel === 'admin';
    const { label: permLabel, color: permColor, bgColor: permBgColor } = permissionConfig[permissionLevel];

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-2 border border-border rounded-lg relative bg-card",
                "transition-all",
                !isDisabled && "hover:bg-accent/50 hover:border-secondary/30 cursor-pointer hover:shadow-sm",
                isDisabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleItemClick}
            title={isDisabled ? (isNavigating ? "Navigating..." : "Please wait...") : `Click to ${permissionLevel === 'viewer' ? 'run' : 'edit'}`}
        >
            {/* Loading Overlay */}
            {isNavigating && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-4 h-4 text-secondary animate-spin" />
                </div>
            )}

            {/* Icon - Secondary color */}
            <div className="flex-shrink-0">
                <div className="w-7 h-7 bg-secondary/10 rounded-md flex items-center justify-center">
                    <Users className="w-3 h-3 text-secondary" />
                </div>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">
                    {name || "Untitled Prompt"}
                </h4>
            </div>

            {/* Permission Badge */}
            <Badge 
                variant="outline" 
                className={cn(
                    permBgColor,
                    permColor,
                    "border-0 text-xs font-medium px-1.5 py-0.5 h-5 flex-shrink-0"
                )}
            >
                {permLabel}
            </Badge>

            {/* Actions Menu */}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            disabled={isDisabled}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleRun} disabled={isDisabled}>
                            <Play className="mr-2 h-4 w-4" />
                            Run
                        </DropdownMenuItem>
                        {canEdit && (
                            <DropdownMenuItem onClick={handleEdit} disabled={isDisabled}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleView} disabled={isDisabled}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating || isDisabled}>
                            {isDuplicating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Copy className="mr-2 h-4 w-4" />
                            )}
                            {isDuplicating ? "Copying..." : "Copy to My Prompts"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

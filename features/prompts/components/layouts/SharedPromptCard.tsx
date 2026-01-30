"use client";

import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import { Eye, Pencil, Play, Copy, Loader2, Users, User, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { FaBars } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { PermissionLevel } from "@/utils/permissions/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SharedPromptCardProps {
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

const permissionConfig: Record<PermissionLevel, { label: string; icon: typeof Shield; color: string; bgColor: string }> = {
    viewer: {
        label: "View Only",
        icon: Eye,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    editor: {
        label: "Can Edit",
        icon: Pencil,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    admin: {
        label: "Full Access",
        icon: ShieldCheck,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
    },
};

export function SharedPromptCard({
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
}: SharedPromptCardProps) {
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);

    const handleView = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(id, `/ai/prompts/view/${id}`);
        }
    };

    const handleEdit = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(id, `/ai/prompts/edit/${id}`);
        }
    };

    const handleRun = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(id, `/ai/prompts/run/${id}`);
        }
    };

    const handleDuplicate = () => {
        if (onDuplicate) {
            onDuplicate(id);
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (!isDisabled) {
            // Default action: Run for viewer, Edit for editor/admin
            if (permissionLevel === 'viewer') {
                handleRun();
            } else {
                handleEdit();
            }
        }
    };

    // Disable interactions when navigating
    const isDisabled = isNavigating || isAnyNavigating;

    // Get permission display config
    const { label: permLabel, icon: PermIcon, color: permColor, bgColor: permBgColor } = permissionConfig[permissionLevel];

    // Extract owner name from email (part before @)
    const ownerDisplayName = ownerEmail?.split('@')[0] || 'Unknown';

    // Can edit if permission is editor or admin
    const canEdit = permissionLevel === 'editor' || permissionLevel === 'admin';

    return (
        <Card 
            className={`flex flex-col h-full bg-card border border-border transition-all duration-200 overflow-hidden relative ${
                isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-lg hover:shadow-secondary/10 hover:border-secondary/30 cursor-pointer hover:scale-[1.02] group'
            }`}
            onClick={handleCardClick}
            title={isDisabled ? (isNavigating ? "Navigating..." : "Please wait...") : `Click to ${canEdit ? 'edit' : 'run'}`}
        >
            {/* Loading Overlay */}
            {isNavigating && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                        <span className="text-sm font-medium text-foreground">Loading...</span>
                    </div>
                </div>
            )}
            
            {/* Shared Icon Badge - different color to distinguish from owned prompts */}
            <div className="absolute top-3 left-3 z-10">
                <div className={`w-8 h-8 bg-secondary rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${
                    !isDisabled && 'group-hover:bg-secondary/90 group-hover:shadow-md group-hover:scale-105'
                }`}>
                    <Users className={`w-4 h-4 text-secondary-foreground transition-transform duration-200 ${
                        !isDisabled && 'group-hover:scale-110'
                    }`} />
                </div>
            </div>

            {/* Permission & Owner badges - top right */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
                {/* Permission Badge */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge 
                                variant="outline" 
                                className={`${permBgColor} ${permColor} border-0 text-xs font-medium px-2 py-0.5 flex items-center gap-1`}
                            >
                                <PermIcon className="w-3 h-3" />
                                <span className="hidden sm:inline">{permLabel}</span>
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>You have <strong>{permLabel.toLowerCase()}</strong> access</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Owner Badge */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge 
                                variant="outline" 
                                className="bg-muted/50 text-muted-foreground border-0 text-xs font-medium px-2 py-0.5 flex items-center gap-1 max-w-[120px]"
                            >
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{ownerDisplayName}</span>
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Shared by {ownerEmail}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Card Content */}
            <div className="p-4 pl-12 pr-4 pt-14 flex-1 flex items-center justify-center">
                <h3 className={`text-lg font-semibold text-foreground text-center line-clamp-3 break-words transition-colors duration-200 ${
                    !isDisabled && 'group-hover:text-secondary'
                }`}>
                    {name || "Untitled Prompt"}
                </h3>
            </div>

            {/* Action Bar */}
            <div className="border-t border-border p-1 bg-card rounded-b-lg">
                <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                        icon={Play}
                        tooltip={isDisabled ? "Please wait..." : "Run"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleRun}
                        disabled={isDisabled}
                    />
                    {canEdit && (
                        <IconButton
                            icon={Pencil}
                            tooltip={isDisabled ? "Please wait..." : "Edit"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleEdit}
                            disabled={isDisabled}
                        />
                    )}
                    <IconButton
                        icon={Eye}
                        tooltip={isDisabled ? "Please wait..." : "View"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleView}
                        disabled={isDisabled}
                    />
                    <IconButton
                        icon={isDuplicating ? Loader2 : Copy}
                        tooltip={isDuplicating ? "Copying..." : isDisabled ? "Please wait..." : "Copy to My Prompts"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDuplicate}
                        disabled={isDuplicating || isDisabled}
                        iconClassName={isDuplicating ? "animate-spin" : ""}
                    />
                </div>
            </div>
        </Card>
    );
}

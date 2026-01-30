"use client";

import { useState } from "react";
import { 
    Loader2, MoreVertical, Play, Pencil, Eye, Copy, 
    Trash2, Share2, AppWindow, Settings, LayoutPanelTop, Globe 
} from "lucide-react";
import { FaBars } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { RootState, useAppSelector } from "@/lib/redux";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { ShareModal } from "@/features/sharing";
import { CreatePromptAppModal } from "@/features/prompt-apps/components";
import { ConvertToBuiltinModal } from "@/features/prompts/components/layouts/ConvertToBuiltinModal";
import { PromptActionModal } from "./PromptActionModal";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast-service";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface PromptListItemProps {
    id: string;
    name: string;
    description?: string;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onNavigate?: (id: string, path: string) => void;
    isDeleting?: boolean;
    isDuplicating?: boolean;
    isNavigating?: boolean;
    isAnyNavigating?: boolean;
}

export function PromptListItem({
    id,
    name,
    description,
    onDelete,
    onDuplicate,
    onNavigate,
    isDeleting,
    isDuplicating,
    isNavigating,
    isAnyNavigating
}: PromptListItemProps) {
    const isSystemAdmin = useAppSelector((state: RootState) => selectIsAdmin(state));
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isCreateAppModalOpen, setIsCreateAppModalOpen] = useState(false);
    const [isConvertToBuiltinModalOpen, setIsConvertToBuiltinModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [isConvertingToTemplate, setIsConvertingToTemplate] = useState(false);
    const [lastModalCloseTime, setLastModalCloseTime] = useState(0);
    const supabase = createClient();

    const handleItemClick = () => {
        const timeSinceClose = Date.now() - lastModalCloseTime;
        if (!isDisabled && !isActionModalOpen && timeSinceClose > 300) {
            setIsActionModalOpen(true);
        }
    };

    const handleActionModalClose = () => {
        setIsActionModalOpen(false);
        setLastModalCloseTime(Date.now());
    };

    const handleShareClick = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsMenuOpen(false);
        setIsShareModalOpen(true);
    };

    const handleCreateApp = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsMenuOpen(false);
        setIsCreateAppModalOpen(true);
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

    const handleDelete = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onDelete) {
            onDelete(id);
        }
    };

    const handleConvertToTemplate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isSystemAdmin || isConvertingToTemplate) return;
        
        setIsConvertingToTemplate(true);
        setIsMenuOpen(false);
        try {
            const response = await fetch(`/api/prompts/${id}/convert-to-template`, {
                method: "POST",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                const errorMessage = errorData.details 
                    ? `${errorData.error}: ${errorData.details}`
                    : errorData.error || `Failed to convert prompt to template (${response.status})`;
                throw new Error(errorMessage);
            }

            toast.success(`Successfully converted "${name}" to a template!`);
        } catch (error) {
            console.error("Error converting prompt to template:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to convert prompt to template. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsConvertingToTemplate(false);
        }
    };

    const handleMakeGlobalBuiltin = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isSystemAdmin) return;
        
        setIsMenuOpen(false);
        setIsAdminMenuOpen(false);
        setIsConvertToBuiltinModalOpen(true);
    };

    const isDisabled = isNavigating || isAnyNavigating || isConvertingToTemplate;

    return (
        <>
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-2 border border-border rounded-lg",
                    "transition-all relative bg-card",
                    !isDisabled && "hover:bg-accent/50 hover:border-primary/30 cursor-pointer hover:shadow-sm",
                    isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleItemClick}
                title={isDisabled ? (isNavigating ? "Navigating..." : "Please wait...") : "Click to choose action"}
            >
                {/* Loading Overlay */}
                {isNavigating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                )}

                {/* Icon */}
                <div className="flex-shrink-0">
                    <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center">
                        <FaBars className="w-3 h-3 text-primary" />
                    </div>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                        {name || "Untitled Prompt"}
                    </h4>
                </div>

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
                            <DropdownMenuItem onClick={handleEdit} disabled={isDisabled}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
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
                                {isDuplicating ? "Duplicating..." : "Duplicate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleShareClick} disabled={isDisabled}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCreateApp} disabled={isDisabled}>
                                <AppWindow className="mr-2 h-4 w-4" />
                                Create App
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                                onClick={handleDelete} 
                                disabled={isDeleting || isDisabled}
                                className="text-destructive focus:text-destructive"
                            >
                                {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                {isDeleting ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>

                            {isSystemAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenu open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
                                        <DropdownMenuTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <Settings className="mr-2 h-4 w-4" />
                                                Admin Actions
                                            </DropdownMenuItem>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="left" align="start" className="w-48">
                                            <DropdownMenuItem onClick={handleConvertToTemplate} disabled={isConvertingToTemplate}>
                                                {isConvertingToTemplate ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <LayoutPanelTop className="mr-2 h-4 w-4" />
                                                )}
                                                {isConvertingToTemplate ? "Converting..." : "Convert to Template"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleMakeGlobalBuiltin}>
                                                <Globe className="mr-2 h-4 w-4" />
                                                Make Global Built-in
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Action Modal */}
            <PromptActionModal
                isOpen={isActionModalOpen}
                onClose={handleActionModalClose}
                promptId={id}
                promptName={name}
                onRun={handleRun}
                onEdit={(e) => handleEdit(e)}
                onView={handleView}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onShare={handleShareClick}
                onCreateApp={handleCreateApp}
                isDuplicating={isDuplicating}
                isDeleting={isDeleting}
            />

            {/* Modals - Opened from PromptActionModal */}
            {isShareModalOpen && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    resourceType="prompt"
                    resourceId={id}
                    resourceName={name}
                />
            )}
            {isCreateAppModalOpen && (
                <CreatePromptAppModal
                    isOpen={isCreateAppModalOpen}
                    onClose={() => setIsCreateAppModalOpen(false)}
                    promptId={id}
                    promptName={name}
                />
            )}
            {isConvertToBuiltinModalOpen && (
                <ConvertToBuiltinModal
                    isOpen={isConvertToBuiltinModalOpen}
                    onClose={() => setIsConvertToBuiltinModalOpen(false)}
                    promptId={id}
                    promptName={name}
                />
            )}
        </>
    );
}

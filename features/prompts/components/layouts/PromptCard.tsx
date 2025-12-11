"use client";

import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import { Eye, Pencil, Play, Copy, Trash2, Loader2, MessageSquare, Share2, LayoutPanelTop, Settings, Globe, AppWindow } from "lucide-react";
import { FaBars } from "react-icons/fa";
import { RootState, useAppSelector } from "@/lib/redux";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { ShareModal } from "@/features/sharing";
import { PromptActionModal } from "./PromptActionModal";
import { CreatePromptAppModal } from "@/features/prompt-apps/components";
import { ConvertToBuiltinModal } from "@/features/prompts/components/layouts/ConvertToBuiltinModal";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/lib/toast-service";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface PromptCardProps {
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

export function PromptCard({
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
}: PromptCardProps) {
    const isSystemAdmin = useAppSelector((state: RootState) => selectIsAdmin(state));
    const [isOwner, setIsOwner] = useState(true);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isCreateAppModalOpen, setIsCreateAppModalOpen] = useState(false);
    const [isConvertToBuiltinModalOpen, setIsConvertToBuiltinModalOpen] = useState(false);
    const [isConvertingToTemplate, setIsConvertingToTemplate] = useState(false);
    const [lastModalCloseTime, setLastModalCloseTime] = useState(0);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkOwnership = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsOwner(false);
                    return;
                }

                // Fetch the prompt to check ownership
                const { data: prompt } = await supabase
                    .from('prompts')
                    .select('user_id')
                    .eq('id', id)
                    .single();

                setIsOwner(prompt?.user_id === user.id);
            } catch (error) {
                console.error('Error checking prompt ownership:', error);
                setIsOwner(false);
            }
        };

        checkOwnership();
    }, [id, supabase]);

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

    const handleDelete = () => {
        if (onDelete) {
            onDelete(id);
        }
    };

    const handleShareClick = () => {
        // Close action modal first to prevent both modals being open
        setIsActionModalOpen(false);
        setIsShareModalOpen(true);
    };

    const handleCreateApp = () => {
        // Close action modal and open create app modal
        setIsActionModalOpen(false);
        setIsCreateAppModalOpen(true);
    };

    const handleShareClickInline = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDisabled) {
            setIsShareModalOpen(true);
        }
    };

    const handleShareModalClose = () => {
        setIsShareModalOpen(false);
        // Prevent action modal from reopening by not calling anything else
    };

    const handleConvertToTemplate = async () => {
        if (!isSystemAdmin || isConvertingToTemplate) return;
        
        setIsConvertingToTemplate(true);
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

            const data = await response.json();
            toast.success(`Successfully converted "${name}" to a template!`);
        } catch (error) {
            console.error("Error converting prompt to template:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to convert prompt to template. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsConvertingToTemplate(false);
        }
    };

    const handleMakeGlobalBuiltin = async () => {
        if (!isSystemAdmin) return;
        
        setIsAdminMenuOpen(false);
        setIsConvertToBuiltinModalOpen(true);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Only open modal if clicking the card itself, not if a modal is already open
        // Also prevent reopening if modal was just closed (within 300ms) to avoid click-through from overlay
        const timeSinceClose = Date.now() - lastModalCloseTime;
        if (!isDisabled && !isShareModalOpen && !isActionModalOpen && !isCreateAppModalOpen && !isConvertToBuiltinModalOpen && timeSinceClose > 300) {
            setIsActionModalOpen(true);
        }
    };

    // Disable all interactions when navigating or when any card is navigating
    const isDisabled = isNavigating || isAnyNavigating || isConvertingToTemplate;

    return (
        <Card 
            className={`flex flex-col h-full bg-card border border-border transition-all duration-200 overflow-hidden relative ${
                isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 cursor-pointer hover:scale-[1.02] group'
            }`}
            onClick={handleCardClick}
            title={isDisabled ? (isNavigating ? "Navigating..." : "Please wait...") : "Click to choose action"}
        >
            {/* Loading Overlay */}
            {isNavigating && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-sm font-medium text-foreground">Loading...</span>
                    </div>
                </div>
            )}
            
            {/* Chat Icon */}
            <div className="absolute top-3 left-3 z-10">
                <div className={`w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${
                    !isDisabled && 'group-hover:bg-primary/90 group-hover:shadow-md group-hover:scale-105'
                }`}>
                    <FaBars className={`w-4 h-4 text-primary-foreground transition-transform duration-200 ${
                        !isDisabled && 'group-hover:scale-110'
                    }`} />
                </div>
            </div>
            <div className="p-4 pl-12 flex-1 flex items-center justify-center">
                <h3 className={`text-lg font-semibold text-foreground text-center line-clamp-3 break-words transition-colors duration-200 ${
                    !isDisabled && 'group-hover:text-primary'
                }`}>
                    {name || "Untitled Prompt"}
                </h3>
            </div>
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
                        tooltip={isDuplicating ? "Duplicating..." : isDisabled ? "Please wait..." : "Duplicate"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDuplicate}
                        disabled={isDuplicating || isDisabled}
                        iconClassName={isDuplicating ? "animate-spin" : ""}
                    />
                    <IconButton
                        icon={Share2}
                        tooltip="Share"
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleShareClickInline}
                        disabled={isDisabled}
                    />
                    <IconButton
                        icon={AppWindow}
                        tooltip={isDisabled ? "Please wait..." : "Create App"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleCreateApp}
                        disabled={isDisabled}
                    />
                    {isSystemAdmin && (
                        <DropdownMenu open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <div>
                                    <IconButton
                                        icon={Settings}
                                        tooltip="Admin Actions"
                                        size="sm"
                                        variant="ghost"
                                        tooltipSide="top"
                                        tooltipAlign="center"
                                        disabled={isDisabled}
                                    />
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAdminMenuOpen(false);
                                        handleConvertToTemplate();
                                    }}
                                    disabled={isConvertingToTemplate || isDisabled}
                                    className="cursor-pointer"
                                >
                                    {isConvertingToTemplate ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <LayoutPanelTop className="mr-2 h-4 w-4" />
                                    )}
                                    <span>Convert to Template</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAdminMenuOpen(false);
                                        handleMakeGlobalBuiltin();
                                    }}
                                    disabled={isDisabled}
                                    className="cursor-pointer"
                                >
                                    <Globe className="mr-2 h-4 w-4" />
                                    <span>Convert to Prompt Builtin</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <IconButton
                        icon={isDeleting ? Loader2 : Trash2}
                        tooltip={isDeleting ? "Deleting..." : isDisabled ? "Please wait..." : "Delete"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDelete}
                        disabled={isDeleting || isDisabled}
                        iconClassName={isDeleting ? "animate-spin" : ""}
                    />
                </div>
            </div>

            <PromptActionModal
                isOpen={isActionModalOpen}
                onClose={() => {
                    setIsActionModalOpen(false);
                    setLastModalCloseTime(Date.now());
                }}
                promptName={name}
                promptDescription={description}
                onRun={handleRun}
                onEdit={handleEdit}
                onView={handleView}
                onDuplicate={handleDuplicate}
                onShare={handleShareClick}
                onDelete={handleDelete}
                onCreateApp={handleCreateApp}
                isDeleting={isDeleting}
                isDuplicating={isDuplicating}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={handleShareModalClose}
                resourceType="prompt"
                resourceId={id}
                resourceName={name}
                isOwner={isOwner}
            />

            <CreatePromptAppModal
                isOpen={isCreateAppModalOpen}
                onClose={() => {
                    setIsCreateAppModalOpen(false);
                    setLastModalCloseTime(Date.now());
                }}
                promptId={id}
            />

            <ConvertToBuiltinModal
                isOpen={isConvertToBuiltinModalOpen}
                onClose={() => {
                    setIsConvertToBuiltinModalOpen(false);
                    setLastModalCloseTime(Date.now());
                }}
                promptId={id}
                promptName={name}
            />
        </Card>
    );
}


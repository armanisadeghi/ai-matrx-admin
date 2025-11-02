"use client";

import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import { Eye, Pencil, Play, Copy, Trash2, Loader2, MessageSquare, Share2, Sparkles } from "lucide-react";
import { FaBars } from "react-icons/fa";
import { RootState, useAppSelector } from "@/lib/redux";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { ShareModal } from "@/features/sharing";
import { PromptActionModal } from "./PromptActionModal";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/lib/toast-service";

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
    const [isConvertingToTemplate, setIsConvertingToTemplate] = useState(false);
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
        setIsShareModalOpen(true);
    };

    const handleShareClickInline = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDisabled) {
            setIsShareModalOpen(true);
        }
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

    const handleCardClick = () => {
        if (!isDisabled) {
            setIsActionModalOpen(true);
        }
    };

    // Disable all interactions when navigating or when any card is navigating
    const isDisabled = isNavigating || isAnyNavigating || isConvertingToTemplate;

    return (
        <Card 
            className={`flex flex-col h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all duration-200 overflow-hidden relative ${
                isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer hover:scale-[1.02] group'
            }`}
            onClick={isDisabled ? undefined : handleCardClick}
            title={isDisabled ? (isNavigating ? "Navigating..." : "Please wait...") : "Click to choose action"}
        >
            {/* Loading Overlay */}
            {isNavigating && (
                <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading...</span>
                    </div>
                </div>
            )}
            
            {/* Chat Icon */}
            <div className="absolute top-3 left-3 z-10">
                <div className={`w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${
                    !isDisabled && 'group-hover:bg-blue-600 dark:group-hover:bg-blue-700 group-hover:shadow-md group-hover:scale-105'
                }`}>
                    <FaBars className={`w-4 h-4 text-white transition-transform duration-200 ${
                        !isDisabled && 'group-hover:scale-110'
                    }`} />
                </div>
            </div>
            <div className="p-6 pl-12 flex-1 flex items-center justify-center">
                <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 text-center line-clamp-3 break-words transition-colors duration-200 ${
                    !isDisabled && 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}>
                    {name || "Untitled Prompt"}
                </h3>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-900 rounded-b-lg">
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
                    {isSystemAdmin && (
                        <IconButton
                            icon={isConvertingToTemplate ? Loader2 : Sparkles}
                            tooltip={isConvertingToTemplate ? "Converting..." : isDisabled ? "Please wait..." : "Convert to Template"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleConvertToTemplate}
                            disabled={isConvertingToTemplate || isDisabled}
                            iconClassName={isConvertingToTemplate ? "animate-spin" : ""}
                        />
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
                onClose={() => setIsActionModalOpen(false)}
                promptName={name}
                promptDescription={description}
                onRun={handleRun}
                onEdit={handleEdit}
                onView={handleView}
                onDuplicate={handleDuplicate}
                onShare={handleShareClick}
                onDelete={handleDelete}
                isDeleting={isDeleting}
                isDuplicating={isDuplicating}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                resourceType="prompt"
                resourceId={id}
                resourceName={name}
                isOwner={isOwner}
            />
        </Card>
    );
}


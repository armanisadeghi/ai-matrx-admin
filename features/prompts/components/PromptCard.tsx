"use client";

import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import { Eye, Pencil, Play, Copy, Trash2, Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { RootState, useAppSelector } from "@/lib/redux";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";

interface PromptCardProps {
    id: string;
    name: string;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    isDeleting?: boolean;
    isDuplicating?: boolean;
}

export function PromptCard({ id, name, onDelete, onDuplicate, isDeleting, isDuplicating }: PromptCardProps) {
    const router = useRouter();
    const isSystemAdmin = useAppSelector((state: RootState) => selectIsAdmin(state));

    const handleView = () => {
        router.push(`/ai/prompts/view/${id}`);
    };

    const handleEdit = () => {
        router.push(`/ai/prompts/edit/${id}`);
    };

    const handleRun = () => {
        router.push(`/ai/prompts/run/${id}`);
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

    return (
        <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden relative cursor-pointer hover:scale-[1.02] group"
              onClick={handleEdit}
              title="Click to edit prompt">
            {/* Chat Icon */}
            <div className="absolute top-3 left-3 z-10">
                <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-700 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
                    <MessageSquare className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-200" />
                </div>
            </div>
            <div className="p-6 flex-1 flex items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-center line-clamp-3 transition-colors duration-200">
                    {name || "Untitled Prompt"}
                </h3>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-900 rounded-b-lg">
                <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                        icon={Eye}
                        tooltip="View"
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleView}
                    />
                    <IconButton
                        icon={Pencil}
                        tooltip="Edit"
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleEdit}
                    />
                    <IconButton
                        icon={Play}
                        tooltip="Run"
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleRun}
                    />
                    <IconButton
                        icon={isDuplicating ? Loader2 : Copy}
                        tooltip={isDuplicating ? "Duplicating..." : "Duplicate"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDuplicate}
                        disabled={isDuplicating}
                        iconClassName={isDuplicating ? "animate-spin" : ""}
                    />
                    <IconButton
                        icon={isDeleting ? Loader2 : Trash2}
                        tooltip={isDeleting ? "Deleting..." : "Delete"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        iconClassName={isDeleting ? "animate-spin" : ""}
                    />
                </div>
            </div>
        </Card>
    );
}


"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Play, Copy, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
        <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6 flex-1 flex items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center line-clamp-3">
                    {name || "Untitled Prompt"}
                </h3>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-900 rounded-b-lg">
                <div className="flex gap-2 justify-center">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleView}
                        className="hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400"
                        title="View"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleEdit}
                        className="hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400"
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleRun}
                        className="hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-600 dark:hover:text-purple-400"
                        title="Run"
                    >
                        <Play className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleDuplicate}
                        disabled={isDuplicating}
                        className="hover:bg-orange-100 dark:hover:bg-orange-900 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-50"
                        title={isDuplicating ? "Duplicating..." : "Duplicate"}
                    >
                        {isDuplicating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                        title={isDeleting ? "Deleting..." : "Delete"}
                    >
                        {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    );
}


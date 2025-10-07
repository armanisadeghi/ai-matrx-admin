"use client";

import { useState } from "react";
import { PromptCard } from "./PromptCard";
import { useRouter } from "next/navigation";

interface Prompt {
    id: string;
    name: string;
}

interface PromptsGridProps {
    prompts: Prompt[];
}

export function PromptsGrid({ prompts }: PromptsGridProps) {
    const router = useRouter();
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this prompt?")) {
            return;
        }

        setDeletingIds(prev => new Set(prev).add(id));
        
        try {
            const response = await fetch(`/api/prompts/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete prompt");
            }

            router.refresh();
        } catch (error) {
            console.error("Error deleting prompt:", error);
            alert("Failed to delete prompt");
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            const response = await fetch(`/api/prompts/${id}/duplicate`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to duplicate prompt");
            }

            router.refresh();
        } catch (error) {
            console.error("Error duplicating prompt:", error);
            alert("Failed to duplicate prompt");
        }
    };

    if (prompts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No prompts found. Create your first prompt to get started!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {prompts.map((prompt) => (
                <PromptCard
                    key={prompt.id}
                    id={prompt.id}
                    name={prompt.name}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                />
            ))}
        </div>
    );
}


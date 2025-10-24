"use client";

import { useState, useTransition } from "react";
import { TemplateCard } from "./TemplateCard";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/toast-service";

interface Template {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    is_featured: boolean;
    use_count: number;
    created_at: string;
    updated_at: string;
}

interface TemplatesGridProps {
    templates: Template[];
}

export function TemplatesGrid({ templates }: TemplatesGridProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("all");

    const handleNavigate = (id: string, path: string) => {
        // Prevent navigation if already navigating or using a template
        if (navigatingId || usingTemplateId) return;
        
        setNavigatingId(id);
        startTransition(() => {
            router.push(path);
        });
    };

    const handleUseTemplate = async (id: string) => {
        // Prevent action if already processing
        if (usingTemplateId || navigatingId) return;
        
        setUsingTemplateId(id);
        
        try {
            const response = await fetch(`/api/prompts/templates/${id}/use`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to use template");
            }

            const { prompt } = await response.json();
            
            // Redirect to edit the newly created prompt
            startTransition(() => {
                router.push(`/ai/prompts/edit/${prompt.id}`);
            });
        } catch (error) {
            console.error("Error using template:", error);
            toast.error("Failed to create prompt from template. Please try again.");
            setUsingTemplateId(null);
        }
    };

    const filteredTemplates = templates.filter((template) => {
        if (activeTab === "all") return true;
        if (activeTab === "featured") return template.is_featured;
        return template.category?.toLowerCase() === activeTab.toLowerCase();
    });

    // Get unique categories
    const categories = Array.from(
        new Set(templates.map((t) => t.category).filter(Boolean))
    );

    if (templates.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                    No templates available yet. Check back soon!
                </p>
            </div>
        );
    }

    return (
        <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="bg-slate-200 dark:bg-slate-800">
                    <TabsTrigger value="all">All Templates</TabsTrigger>
                    <TabsTrigger value="featured">Featured</TabsTrigger>
                    {categories.map((category) => (
                        <TabsTrigger key={category} value={category?.toLowerCase() || ""}>
                            {category}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        id={template.id}
                        name={template.name}
                        description={template.description}
                        category={template.category}
                        isFeatured={template.is_featured}
                        useCount={template.use_count}
                        onUseTemplate={handleUseTemplate}
                        onNavigate={handleNavigate}
                        isNavigating={navigatingId === template.id}
                        isUsingTemplate={usingTemplateId === template.id}
                        isAnyProcessing={navigatingId !== null || usingTemplateId !== null}
                    />
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                        No templates found in this category.
                    </p>
                </div>
            )}
        </div>
    );
}


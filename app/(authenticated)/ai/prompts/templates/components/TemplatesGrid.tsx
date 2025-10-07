"use client";

import { useState } from "react";
import { TemplateCard } from "./TemplateCard";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const [activeTab, setActiveTab] = useState("all");

    const handleUseTemplate = async (id: string) => {
        try {
            const response = await fetch(`/api/prompts/templates/${id}/use`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to use template");
            }

            const { prompt } = await response.json();
            
            // Redirect to edit the newly created prompt
            router.push(`/ai/prompts/edit/${prompt.id}`);
        } catch (error) {
            console.error("Error using template:", error);
            alert("Failed to create prompt from template");
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


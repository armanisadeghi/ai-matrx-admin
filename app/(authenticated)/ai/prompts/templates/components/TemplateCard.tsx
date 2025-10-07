"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Copy, Star } from "lucide-react";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    isFeatured: boolean;
    useCount: number;
    onUseTemplate?: (id: string) => void;
}

export function TemplateCard({
    id,
    name,
    description,
    category,
    isFeatured,
    useCount,
    onUseTemplate,
}: TemplateCardProps) {
    const router = useRouter();

    const handleView = () => {
        router.push(`/ai/prompts/templates/${id}`);
    };

    const handleUseTemplate = () => {
        if (onUseTemplate) {
            onUseTemplate(id);
        }
    };

    return (
        <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
                        {name || "Untitled Template"}
                    </h3>
                    {isFeatured && (
                        <Star className="h-5 w-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0 ml-2" />
                    )}
                </div>
                
                {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                        {description}
                    </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    {category && (
                        <Badge
                            variant="secondary"
                            className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        >
                            {category}
                        </Badge>
                    )}
                    {useCount > 0 && (
                        <Badge
                            variant="outline"
                            className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                        >
                            {useCount} uses
                        </Badge>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-900 rounded-b-lg">
                <div className="flex gap-2 justify-center">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleView}
                        className="flex-1 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleUseTemplate}
                        className="flex-1 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Use Template
                    </Button>
                </div>
            </div>
        </Card>
    );
}


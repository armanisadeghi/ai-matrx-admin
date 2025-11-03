"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Copy, Star, Loader2 } from "lucide-react";

interface TemplateCardProps {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    isFeatured: boolean;
    useCount: number;
    onUseTemplate?: (id: string) => void;
    onNavigate?: (id: string, path: string) => void;
    isNavigating?: boolean;
    isUsingTemplate?: boolean;
    isAnyProcessing?: boolean;
}

export function TemplateCard({
    id,
    name,
    description,
    category,
    isFeatured,
    useCount,
    onUseTemplate,
    onNavigate,
    isNavigating,
    isUsingTemplate,
    isAnyProcessing,
}: TemplateCardProps) {
    const handleView = () => {
        if (onNavigate && !isAnyProcessing) {
            onNavigate(id, `/ai/prompts/templates/${id}`);
        }
    };

    const handleUseTemplate = () => {
        if (onUseTemplate && !isAnyProcessing) {
            onUseTemplate(id);
        }
    };

    const isDisabled = isAnyProcessing || false;
    const showLoadingOverlay = isNavigating || isUsingTemplate;

    return (
        <Card className={`flex flex-col h-full bg-card border border-border transition-all duration-200 overflow-hidden relative ${
            isDisabled ? 'opacity-60' : 'hover:shadow-md'
        }`}>
            {/* Loading Overlay */}
            {showLoadingOverlay && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-sm font-medium text-foreground">
                            {isNavigating ? "Loading..." : "Creating prompt..."}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2 flex-1">
                        {name || "Untitled Template"}
                    </h3>
                    {isFeatured && (
                        <Star className="h-5 w-5 text-warning flex-shrink-0 ml-2" />
                    )}
                </div>
                
                {description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {description}
                    </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    {category && (
                        <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                        >
                            {category}
                        </Badge>
                    )}
                    {useCount > 0 && (
                        <Badge
                            variant="outline"
                            className="text-muted-foreground border-border"
                        >
                            {useCount} uses
                        </Badge>
                    )}
                </div>
            </div>

            <div className="border-t border-border p-4 bg-muted rounded-b-lg">
                <div className="flex gap-2 justify-center">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleView}
                        disabled={isDisabled}
                        className="flex-1"
                    >
                        {isNavigating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Eye className="h-4 w-4 mr-2" />
                        )}
                        View
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleUseTemplate}
                        disabled={isDisabled}
                        className="flex-1"
                    >
                        {isUsingTemplate ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Copy className="h-4 w-4 mr-2" />
                        )}
                        Use Template
                    </Button>
                </div>
            </div>
        </Card>
    );
}


"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentEditorStack } from "@/components/content-editor/ContentEditorStack";
import { RecipeViewHeader } from "@/components/layout/new-layout/PageSpecificHeader";

interface CompiledVersion {
    id: string;
    recipe_id: string;
    version: number | null;
    compiled_recipe: any;
    created_at: string;
    updated_at: string;
}

interface RecipeViewContentProps {
    recipeId: string;
    recipeName: string;
    compiledVersions: CompiledVersion[];
}

export function RecipeViewContent({ recipeId, recipeName, compiledVersions }: RecipeViewContentProps) {
    const [selectedVersionId, setSelectedVersionId] = useState<string>(
        compiledVersions.length > 0 ? compiledVersions[0].id : ""
    );

    const selectedVersion = compiledVersions.find((v) => v.id === selectedVersionId);

    if (!selectedVersion) {
        return <div className="p-4">Loading...</div>;
    }

    const compiledRecipe = selectedVersion.compiled_recipe;
    const brokers = compiledRecipe?.brokers || [];
    const messages = compiledRecipe?.messages || [];
    const settings = compiledRecipe?.settings || [];

    // Prepare message contents for ContentEditorStack
    const messageContents = messages.map((msg: any) => msg.content);
    const messageRoles = messages.map((msg: any) => msg.role);

    return (
        <>
            {/* Compact header in portal */}
            <RecipeViewHeader recipeId={recipeId} />
            
            <div className="flex h-full overflow-hidden">
                {/* Version Selector - Top of sidebar */}
                <div className="w-60 border-r flex flex-col flex-shrink-0 overflow-hidden">
                    <div className="p-2 border-b">
                        <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {compiledVersions.map((v) => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs">
                                        v{v.version || "N/A"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Brokers */}
                    <div className="p-2 border-b">
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-1.5">
                            Brokers ({brokers.length})
                        </div>
                        <ScrollArea className="h-32">
                            <div className="space-y-1">
                                {brokers.map((broker: any, i: number) => (
                                    <div key={i} className="text-xs px-1.5 py-1 bg-muted rounded truncate">
                                        {broker.name}
                                    </div>
                                ))}
                                {brokers.length === 0 && (
                                    <div className="text-xs text-muted-foreground italic">No brokers</div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Settings */}
                    <div className="p-2 flex-1 min-h-0 flex flex-col">
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-1.5">
                            Settings
                        </div>
                        <ScrollArea className="flex-1">
                            <pre className="text-[9px] leading-tight whitespace-pre-wrap break-words">
                                {JSON.stringify(settings, null, 1)}
                            </pre>
                        </ScrollArea>
                    </div>
                </div>

                {/* Main Content - Messages */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-3">
                            <ContentEditorStack
                                contents={messageContents}
                                onContentsChange={() => {}} // Read-only
                                availableModes={['preview']}
                                initialMode="preview"
                                collapsible={true}
                                defaultCollapsed={false}
                                generateTitle={(index) => `${messageRoles[index] || 'Message'} ${index + 1}`}
                                showModeSelector={false}
                                spacing="sm"
                            />
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </>
    );
}

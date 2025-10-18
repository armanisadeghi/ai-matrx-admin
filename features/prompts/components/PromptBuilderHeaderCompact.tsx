import React from "react";
import { GitCompare, Sparkles, BarChart, Save, Maximize2, ArrowLeft, Settings, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface PromptBuilderHeaderCompactProps {
    promptName: string;
    onPromptNameChange: (value: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    onOpenFullScreenEditor?: () => void;
    onOpenSettings?: () => void;
}

export function PromptBuilderHeaderCompact({
    promptName,
    onPromptNameChange,
    isDirty,
    isSaving,
    onSave,
    onOpenFullScreenEditor,
    onOpenSettings,
}: PromptBuilderHeaderCompactProps) {
    return (
        <div className="flex items-center gap-2 h-full">
            {/* Mobile - Always dropdown */}
            <div className="md:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/ai/prompts" className="flex items-center w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Prompts
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {onOpenSettings && (
                            <DropdownMenuItem onClick={onOpenSettings}>
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                        )}
                        {onOpenFullScreenEditor && (
                            <DropdownMenuItem onClick={onOpenFullScreenEditor}>
                                <Maximize2 className="h-4 w-4 mr-2" />
                                Full Editor
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <GitCompare className="h-4 w-4 mr-2" />
                            Compare
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Optimize
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <BarChart className="h-4 w-4 mr-2" />
                            Evaluate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onSave} disabled={isSaving || !isDirty}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Prompt
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile status indicator */}
                {isDirty && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full ml-1" title="Unsaved changes" />
                )}
            </div>

            {/* Desktop - Inline controls with tighter spacing */}
            <div className="hidden md:flex items-center gap-1">
                {/* Back button */}
                <Link href="/ai/prompts">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Back to Prompts"
                    >
                        <ArrowLeft className="h-3 w-3" />
                    </Button>
                </Link>

                {/* Prompt name input - compact */}
                <input
                    type="text"
                    value={promptName}
                    onChange={(e) => onPromptNameChange(e.target.value)}
                    className="text-sm font-medium bg-transparent border-none outline-none min-w-0 text-gray-900 dark:text-gray-100 px-2 py-1 max-w-[120px] lg:max-w-[180px] xl:max-w-[240px]"
                    placeholder="Untitled prompt"
                />

                {/* Status indicators - compact */}
                <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 text-[10px] border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Draft
                    </span>
                    {isDirty && (
                        <span className="px-1.5 py-0.5 text-[10px] border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded">
                            Unsaved
                        </span>
                    )}
                </div>

                {/* Action buttons - compact */}
                <div className="flex items-center gap-0.5 ml-2">
                    {onOpenSettings && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={onOpenSettings}
                            title="Settings"
                        >
                            <Settings className="h-3 w-3" />
                        </Button>
                    )}
                    {onOpenFullScreenEditor && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={onOpenFullScreenEditor}
                            title="Full Editor"
                        >
                            <Maximize2 className="h-3 w-3" />
                        </Button>
                    )}

                    {/* Secondary actions - only show on larger screens */}
                    <div className="hidden lg:flex items-center gap-0.5">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Compare"
                        >
                            <GitCompare className="h-3 w-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Optimize"
                        >
                            <Sparkles className="h-3 w-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Evaluate"
                        >
                            <BarChart className="h-3 w-3" />
                        </Button>
                    </div>

                    {/* Save button - always visible */}
                    <Button
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2 ml-1 text-xs"
                    >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

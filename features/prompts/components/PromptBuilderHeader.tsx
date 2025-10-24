import React, { useState } from "react";
import { GitCompare, Sparkles, BarChart, Save, Maximize2, ArrowLeft, Settings, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface PromptBuilderHeaderProps {
    promptName: string;
    onPromptNameChange: (value: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    onOpenFullScreenEditor?: () => void;
    onOpenSettings?: () => void;
}

export function PromptBuilderHeader({
    promptName,
    onPromptNameChange,
    isDirty,
    isSaving,
    onSave,
    onOpenFullScreenEditor,
    onOpenSettings,
}: PromptBuilderHeaderProps) {
    return (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-textured px-4 py-1">
            <div className="flex items-center justify-between">
                {/* Left side - Back button and title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Link href="/ai/prompts">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 flex-shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <input
                        type="text"
                        value={promptName}
                        onChange={(e) => onPromptNameChange(e.target.value)}
                        className="text-lg font-semibold bg-transparent border-none outline-none min-w-0 flex-1 text-gray-900 dark:text-gray-100 px-0 py-1 max-w-xs sm:max-w-sm md:max-w-md"
                        placeholder="Untitled prompt"
                    />
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            Draft
                        </span>
                        {isDirty && (
                            <span className="px-2 py-0.5 text-xs border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Mobile status indicators */}
                    <div className="sm:hidden flex items-center gap-1 mr-2">
                        {isDirty && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                        )}
                    </div>

                    {/* Desktop buttons - hidden on mobile */}
                    <div className="hidden lg:flex items-center gap-2">
                        {onOpenSettings && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-600 dark:text-gray-400"
                                onClick={onOpenSettings}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                        )}
                        {onOpenFullScreenEditor && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-600 dark:text-gray-400"
                                onClick={onOpenFullScreenEditor}
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Full Editor
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                            <GitCompare className="w-4 h-4 mr-2" />
                            Compare
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Optimize
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                            <BarChart className="w-4 h-4 mr-2" />
                            Evaluate
                        </Button>
                    </div>

                    {/* Mobile dropdown menu - shown on tablet and mobile */}
                    <div className="lg:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-gray-600 dark:text-gray-400 p-2"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {onOpenSettings && (
                                    <DropdownMenuItem onClick={onOpenSettings}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Settings
                                    </DropdownMenuItem>
                                )}
                                {onOpenFullScreenEditor && (
                                    <DropdownMenuItem onClick={onOpenFullScreenEditor}>
                                        <Maximize2 className="w-4 h-4 mr-2" />
                                        Full Editor
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                    <GitCompare className="w-4 h-4 mr-2" />
                                    Compare
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Optimize
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <BarChart className="w-4 h-4 mr-2" />
                                    Evaluate
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Save button - always visible */}
                    <Button
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 ml-2"
                    >
                        <Save className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Save</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}


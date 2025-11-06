import React, { useState } from "react";
import { GitCompare, Sparkles, BarChart, Save, Maximize2, ArrowLeft, Settings, MoreHorizontal, Edit3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAppSelector } from "@/lib/redux";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { SystemPromptOptimizer } from "@/features/prompts/components/actions/SystemPromptOptimizer";

interface PromptBuilderHeaderCompactProps {
    promptName: string;
    onPromptNameChange: (value: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    onOpenFullScreenEditor?: () => void;
    onOpenSettings?: () => void;
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    fullPromptObject?: any;
    onAcceptFullPrompt?: (optimizedObject: any) => void;
    onAcceptAsCopy?: (optimizedObject: any) => void;
    // Mobile tab support
    mobileActiveTab?: 'edit' | 'test';
    onMobileTabChange?: (tab: 'edit' | 'test') => void;
}

export function PromptBuilderHeaderCompact({
    promptName,
    onPromptNameChange,
    isDirty,
    isSaving,
    onSave,
    onOpenFullScreenEditor,
    onOpenSettings,
    developerMessage,
    onDeveloperMessageChange,
    fullPromptObject,
    onAcceptFullPrompt,
    onAcceptAsCopy,
    mobileActiveTab = 'edit',
    onMobileTabChange,
}: PromptBuilderHeaderCompactProps) {
    const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
    const isAdminMode = useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator"));

    return (
        <>
        <div className="flex items-center justify-between gap-2 h-full bg-textured w-full overflow-hidden">
            {/* Mobile - Left: Menu + Status */}
            <div className="md:hidden flex items-center gap-1 flex-shrink-0">
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
                        <DropdownMenuItem onClick={() => setIsOptimizerOpen(true)}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Optimize
                        </DropdownMenuItem>
                        {isAdminMode && (
                            <>
                                <DropdownMenuItem>
                                    <GitCompare className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                                    <span className="text-amber-600 dark:text-amber-400">Compare</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <BarChart className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                                    <span className="text-amber-600 dark:text-amber-400">Evaluate</span>
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onSave} disabled={isSaving || !isDirty}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Prompt
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile status indicator */}
                {isDirty && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                )}
            </div>

            {/* Mobile - Center: Tab Toggle */}
            {onMobileTabChange && (
                <div className="md:hidden flex items-center gap-1 bg-muted rounded-md p-0.5 flex-shrink-0">
                    <button
                        onClick={() => onMobileTabChange('edit')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            mobileActiveTab === 'edit'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Edit3 className="h-3 w-3 inline mr-1" />
                        Edit
                    </button>
                    <button
                        onClick={() => onMobileTabChange('test')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            mobileActiveTab === 'test'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Play className="h-3 w-3 inline mr-1" />
                        Test
                    </button>
                </div>
            )}

            {/* Mobile - Right: Save button (placeholder for layout balance) */}
            <div className="md:hidden flex-shrink-0">
                {/* Intentionally minimal - keeps layout balanced */}
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
                    className="text-sm font-medium bg-transparent border border-gray-300 dark:border-gray-700 min-w-0 text-gray-900 dark:text-gray-100 px-2 py-1 max-w-[120px] lg:max-w-[180px] xl:max-w-[240px]"
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
                            onClick={() => setIsOptimizerOpen(true)}
                            title="Optimize System Message"
                        >
                            <Sparkles className="h-3 w-3" />
                        </Button>
                        {isAdminMode && (
                            <>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 hover:bg-amber-50 dark:hover:bg-amber-950"
                                    title="Compare (Admin Only)"
                                >
                                    <GitCompare className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 hover:bg-amber-50 dark:hover:bg-amber-950"
                                    title="Evaluate (Admin Only)"
                                >
                                    <BarChart className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </Button>
                            </>
                        )}
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

        <SystemPromptOptimizer
            isOpen={isOptimizerOpen}
            onClose={() => setIsOptimizerOpen(false)}
            currentSystemMessage={developerMessage}
            onAccept={(optimizedText) => {
                onDeveloperMessageChange(optimizedText);
            }}
            fullPromptObject={fullPromptObject}
            onAcceptFullPrompt={onAcceptFullPrompt}
            onAcceptAsCopy={onAcceptAsCopy}
        />
        </>
    );
}

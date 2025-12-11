import React, { useState } from "react";
import { GitCompare, Sparkles, BarChart, Save, Maximize2, Settings, MoreHorizontal, Edit3, Play, Route, AppWindow, LayoutTemplate, Code2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/redux";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { SystemPromptOptimizer } from "@/features/prompts/components/actions/prompt-optimizers/SystemPromptOptimizer";
import { PromptActionsMenu } from "@/features/prompts/components/layouts/PromptActionsMenu";
import { usePromptRunner } from "@/features/prompts/hooks/usePromptRunner";
import { PromptModeNavigation } from "@/features/prompts/components/PromptModeNavigation";

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
    promptId?: string; // For mode switcher
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
    promptId,
}: PromptBuilderHeaderCompactProps) {
    const router = useRouter();
    const { openPrompt } = usePromptRunner();
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
                        <DropdownMenuItem onClick={() => router.push('/ai/prompts')}>
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Back to Prompts
                        </DropdownMenuItem>
                        {promptId && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/ai/prompts/run/${promptId}`)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Switch to Run Mode
                                </DropdownMenuItem>
                            </>
                        )}
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
                        {/* Prompt Actions Group */}
                        {fullPromptObject?.id && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    openPrompt({
                                        promptId: fullPromptObject.id,
                                        executionConfig: {
                                            auto_run: false,
                                            allow_chat: true,
                                            show_variables: true,
                                            apply_variables: false,
                                        },
                                    });
                                }}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Open Run Modal
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    router.push(`/ai/prompts/run/${fullPromptObject.id}`);
                                }}>
                                    <Route className="h-4 w-4 mr-2" />
                                    Go To Run Page
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    router.push(`/prompt-apps/new?promptId=${fullPromptObject.id}`);
                                }}>
                                    <AppWindow className="h-4 w-4 mr-2" />
                                    Create App
                                </DropdownMenuItem>
                                {isAdminMode && (
                                    <>
                                        <DropdownMenuItem>
                                            <LayoutTemplate className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                                            <span className="text-amber-600 dark:text-amber-400">Convert to Template</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Code2 className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                                            <span className="text-amber-600 dark:text-amber-400">Convert to Builtin</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
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
            <div className="hidden md:flex items-center gap-1 flex-1 min-w-0">
                {/* Left: Unified navigation (only if we have promptId) */}
                {promptId ? (
                    <div className="flex-1 min-w-0">
                        <PromptModeNavigation
                            promptId={promptId}
                            promptName={promptName}
                            currentMode="edit"
                            onPromptNameChange={onPromptNameChange}
                        />
                    </div>
                ) : (
                    /* Fallback for new prompts without ID */
                    <>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 w-9 p-0 hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0"
                            title="Back to Prompts"
                            onClick={() => router.push('/ai/prompts')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <div className="h-6 w-px bg-border flex-shrink-0 mx-1" />
                        {/* Prompt name input - compact */}
                        <input
                            type="text"
                            value={promptName}
                            onChange={(e) => onPromptNameChange(e.target.value)}
                            className="text-sm font-medium bg-transparent border border-border min-w-0 text-gray-900 dark:text-gray-100 px-2 py-1 rounded max-w-[180px] xl:max-w-[240px]"
                            placeholder="Untitled prompt"
                        />
                    </>
                )}

                {/* Status indicators - compact */}
                <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 text-[10px] border border-border text-gray-600 dark:text-gray-400 rounded">
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

                    {/* Actions Menu - visible on all screens */}
                    {fullPromptObject?.id && (
                        <PromptActionsMenu
                            promptId={fullPromptObject.id}
                            promptData={{
                                name: fullPromptObject.name,
                                messages: fullPromptObject.messages,
                                variableDefaults: fullPromptObject.variableDefaults,
                                settings: fullPromptObject.settings,
                            }}
                            triggerClassName=""
                        />
                    )}

                    {/* Save button - always visible */}
                    <Button
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2 ml-1 text-xs"
                    >
                        <Save className="h-3 w-3" />
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

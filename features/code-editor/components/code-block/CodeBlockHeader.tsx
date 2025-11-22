'use client';

import React, { useState }  from "react";
import { Copy, Check, Download, Expand, Eye, Minimize, Edit2, ChevronDown, ChevronUp, Globe, Loader2, Wand2, RotateCcw, WrapText, Maximize2, ListOrdered, FileText, Sparkles } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import LanguageDisplay from "@/features/code-editor/components/code-block/LanguageDisplay";
import IconButton from "@/components/official/IconButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type AIModalConfig = {
    version: 'v1' | 'v2' | 'v3';
    builtinId: string;
    title: string;
};

interface CodeBlockHeaderProps {
    language: string;
    linesCount: number;
    isEditing: boolean;
    isFullScreen: boolean;
    isCollapsed: boolean;
    code: string;
    handleCopy: (e: React.MouseEvent, withLineNumbers?: boolean) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit?: (e: React.MouseEvent) => void;
    toggleFullScreen?: (e: React.MouseEvent) => void;
    toggleCollapse?: (e?: React.MouseEvent) => void;
    toggleLineNumbers?: (e: React.MouseEvent) => void;
    toggleWrapLines?: (e: React.MouseEvent) => void;
    isCopied: boolean;
    isMobile: boolean;
    isCompleteHTML?: boolean;
    handleViewHTML?: () => void;
    isCreatingPage?: boolean;
    showWrapLines?: boolean;
    handleFormat?: (e: React.MouseEvent) => void;
    handleReset?: (e: React.MouseEvent) => void;
    minimapEnabled?: boolean;
    toggleMinimap?: (e: React.MouseEvent) => void;
    showLineNumbers?: boolean;
    onAIEdit?: (config: AIModalConfig) => void;
}

export const CodeBlockHeader: React.FC<CodeBlockHeaderProps> = ({
    language,
    linesCount,
    isEditing,
    isFullScreen,
    isCollapsed,
    code,
    handleCopy,
    handleDownload,
    toggleEdit,
    toggleFullScreen,
    toggleCollapse,
    toggleLineNumbers,
    toggleWrapLines,
    isCopied,
    isMobile,
    isCompleteHTML = false,
    handleViewHTML,
    isCreatingPage = false,
    showWrapLines = true,
    handleFormat,
    handleReset,
    minimapEnabled = false,
    toggleMinimap,
    showLineNumbers = false,
    onAIEdit,
}) => {
    // Determine if collapse functionality should be available
    const canCollapse = linesCount > 5;



    return (
        <div
            className={cn(
                "flex items-center justify-between",
                "pl-5 py-0 rounded-t-xl",
                "bg-zinc-300 dark:bg-zinc-700",
                "text-xs text-gray-700 dark:text-gray-300",
                "transition-all duration-200",
                !isEditing && canCollapse && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
            )}
            onClick={isEditing || !canCollapse ? undefined : toggleCollapse}
        >
            <div className="flex items-center space-x-4">
                {!language && (
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                )}
                <div className="flex items-center space-x-2">
                    <LanguageDisplay language={language} isMobile={isMobile} />
                    {!isMobile && (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {linesCount} {linesCount === 1 ? "line" : "lines"}
                        </span>
                    )}
                </div>
                {/* View HTML Button */}
                {isCompleteHTML && handleViewHTML && !isMobile && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewHTML();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300"
                        title="Open HTML Preview in Side Panel"
                        disabled={isCreatingPage}
                    >
                        {isCreatingPage ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <Globe size={14} />
                                <span>Preview</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            <CodeBlockButtons
                isEditing={isEditing}
                isFullScreen={isFullScreen}
                isCopied={isCopied}
                canCollapse={canCollapse}
                isCollapsed={isCollapsed}
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                toggleEdit={toggleEdit}
                toggleFullScreen={toggleFullScreen}
                toggleLineNumbers={toggleLineNumbers}
                toggleWrapLines={toggleWrapLines}
                toggleCollapse={toggleCollapse}
                isMobile={isMobile}
                showWrapLines={showWrapLines}
                handleFormat={handleFormat}
                handleReset={handleReset}
                minimapEnabled={minimapEnabled}
                toggleMinimap={toggleMinimap}
                showLineNumbers={showLineNumbers}
                onAIEdit={onAIEdit}
            />
        </div>
    );
};



interface CodeBlockButtonsProps {
    isEditing: boolean;
    isFullScreen: boolean;
    isCopied: boolean;
    canCollapse: boolean;
    isCollapsed: boolean;
    handleCopy: (e: React.MouseEvent, withLineNumbers?: boolean) => void;
    handleDownload: (e: React.MouseEvent) => void;
    toggleEdit?: (e: React.MouseEvent) => void;
    toggleFullScreen?: (e: React.MouseEvent) => void;
    toggleLineNumbers?: (e: React.MouseEvent) => void;
    toggleWrapLines?: (e: React.MouseEvent) => void;
    toggleCollapse?: (e?: React.MouseEvent) => void;
    isMobile: boolean;
    showWrapLines?: boolean;
    handleFormat?: (e: React.MouseEvent) => void;
    handleReset?: (e: React.MouseEvent) => void;
    minimapEnabled?: boolean;
    toggleMinimap?: (e: React.MouseEvent) => void;
    showLineNumbers?: boolean;
    onAIEdit?: (config: AIModalConfig) => void;
}

const CodeBlockButtons: React.FC<CodeBlockButtonsProps> = ({
    isEditing,
    isFullScreen,
    isCopied,
    canCollapse,
    isCollapsed,
    handleCopy,
    handleDownload,
    toggleLineNumbers,
    toggleWrapLines,
    toggleEdit,
    toggleFullScreen,
    toggleCollapse,
    isMobile,
    showWrapLines = true,
    handleFormat,
    handleReset,
    minimapEnabled = false,
    toggleMinimap,
    showLineNumbers = false,
    onAIEdit,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    return (
        <div className="flex items-center gap-0.5 pr-5">
            {/* Fullscreen - Always visible on desktop */}
            {toggleFullScreen && !isMobile && (
                <IconButton
                    icon={isFullScreen ? Minimize : Expand}
                    tooltip={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                    size="sm"
                    variant="ghost"
                    onClick={toggleFullScreen}
                    tooltipSide="bottom"
                />
            )}

            {/* Collapse - Always rendered to prevent shifting, disabled when not applicable */}
            {toggleCollapse && !isMobile && (
                <IconButton
                    icon={isCollapsed ? ChevronDown : ChevronUp}
                    tooltip={
                        !canCollapse 
                            ? "Too few lines to collapse" 
                            : isEditing 
                                ? "Cannot collapse in edit mode" 
                                : isCollapsed 
                                    ? "Expand code" 
                                    : "Collapse code"
                    }
                    size="sm"
                    variant="ghost"
                    onClick={toggleCollapse}
                    tooltipSide="bottom"
                    disabled={isEditing || !canCollapse}
                    className={cn(isEditing || !canCollapse ? "opacity-40 cursor-not-allowed" : "")}
                />
            )}

            {/* Word Wrap Toggle - Available in both modes */}
            {toggleWrapLines && !isMobile && (
                <IconButton
                    icon={WrapText}
                    tooltip={showWrapLines ? "Disable word wrap" : "Enable word wrap"}
                    size="sm"
                    variant={showWrapLines ? "default" : "ghost"}
                    onClick={toggleWrapLines}
                    tooltipSide="bottom"
                />
            )}

            {/* Minimap Toggle - Only works in edit mode (Monaco Editor feature) */}
            {toggleMinimap && !isMobile && (
                <IconButton
                    icon={Maximize2}
                    tooltip={
                        !isEditing 
                            ? "Minimap only available in edit mode" 
                            : minimapEnabled 
                                ? "Hide minimap" 
                                : "Show minimap"
                    }
                    size="sm"
                    variant={minimapEnabled && isEditing ? "default" : "ghost"}
                    onClick={toggleMinimap}
                    tooltipSide="bottom"
                    disabled={!isEditing}
                    className={cn(!isEditing ? "opacity-40 cursor-not-allowed" : "")}
                />
            )}

            {/* Format - Always rendered, disabled in view mode */}
            {handleFormat && !isMobile && (
                <IconButton
                    icon={Wand2}
                    tooltip={isEditing ? "Format code (Shift+Alt+F)" : "Format only available in edit mode"}
                    size="sm"
                    variant="ghost"
                    onClick={handleFormat}
                    tooltipSide="bottom"
                    disabled={!isEditing}
                    className={cn(!isEditing ? "opacity-40 cursor-not-allowed" : "")}
                />
            )}

            {/* Reset - Always rendered, disabled in view mode */}
            {handleReset && !isMobile && (
                <IconButton
                    icon={RotateCcw}
                    tooltip={isEditing ? "Reset to original code" : "Reset only available in edit mode"}
                    size="sm"
                    variant="ghost"
                    onClick={handleReset}
                    tooltipSide="bottom"
                    disabled={!isEditing}
                    className={cn(!isEditing ? "opacity-40 cursor-not-allowed" : "")}
                />
            )}

            {/* Download - Always visible on desktop */}
            {!isMobile && (
                <IconButton
                    icon={Download}
                    tooltip="Download code"
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    tooltipSide="bottom"
                />
            )}

            {/* Copy - Always visible with dropdown for line numbers option */}
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <div>
                        <IconButton
                            icon={isCopied ? Check : Copy}
                            tooltip={isCopied ? "Copied!" : "Copy code (right-click for options)"}
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (e.button === 0) { // Left click - default copy
                                    handleCopy(e);
                                }
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDropdownOpen(true);
                            }}
                            tooltipSide="bottom"
                        />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[9999]">
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(e as any, false);
                            setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <FileText className="h-4 w-4" />
                        <span>Copy code only</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(e as any, true);
                            setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <ListOrdered className="h-4 w-4" />
                        <span>Copy with line numbers</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Edit - Available in both modes with dropdown for V1/V2 */}
            {onAIEdit && !isMobile && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div>
                            <IconButton
                                icon={Sparkles}
                                tooltip="AI Code Editor (click for options)"
                                size="sm"
                                variant="ghost"
                                tooltipSide="bottom"
                                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                            />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[9999] w-56">
                        <DropdownMenuLabel className="text-xs font-semibold">Master Code Editor</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAIEdit({
                                    version: 'v1',
                                    builtinId: '87efa869-9c11-43cf-b3a8-5b7c775ee415',
                                    title: 'Master Code Editor (V1)',
                                });
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>V1 - Classic Editor</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAIEdit({
                                    version: 'v2',
                                    builtinId: '87efa869-9c11-43cf-b3a8-5b7c775ee415',
                                    title: 'Master Code Editor (V2)',
                                });
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>V2 - Conversational</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAIEdit({
                                    version: 'v3',
                                    builtinId: '87efa869-9c11-43cf-b3a8-5b7c775ee415',
                                    title: 'Master Code Editor (V3 - Context-Aware)',
                                });
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>V3 - Context-Aware 🚀</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuLabel className="text-xs font-semibold">Prompt App Editor</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAIEdit({
                                    version: 'v1',
                                    builtinId: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
                                    title: 'Prompt App Editor (V1)',
                                });
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>V1 - Classic Editor</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAIEdit({
                                    version: 'v2',
                                    builtinId: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
                                    title: 'Prompt App Editor (V2)',
                                });
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>V2 - Conversational</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAIEdit({
                                    version: 'v3',
                                    builtinId: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
                                    title: 'Prompt App Editor (V3 - Context-Aware)',
                                });
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>V3 - Context-Aware 🚀</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Edit/View Toggle - Always visible on desktop, icon switches based on mode */}
            {toggleEdit && !isMobile && (
                <IconButton
                    icon={isEditing ? Eye : Edit2}
                    tooltip={isEditing ? "Exit edit mode" : "Edit code"}
                    size="sm"
                    variant="ghost"
                    onClick={toggleEdit}
                    tooltipSide="bottom"
                />
            )}
        </div>
    );
};

export const EditButton = ({ isEditing, toggleEdit }) => {
    if (isEditing || !toggleEdit) return null;

    return (
        <div className="absolute top-4 right-2 z-10 backdrop-blur-sm rounded-md">
            <IconButton
                icon={Edit2}
                tooltip="Edit code"
                size="sm"
                variant="ghost"
                onClick={toggleEdit}
                tooltipSide="bottom"
                className="shadow-sm hover:bg-neutral-200 dark:hover:bg-neutral-700"
            />
        </div>
    );
};

export default CodeBlockHeader;

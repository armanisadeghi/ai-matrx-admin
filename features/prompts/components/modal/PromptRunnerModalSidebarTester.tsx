"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePromptRunner } from '../../hooks/usePromptRunner';
import PromptExecutionTestModal from './PromptExecutionTestModal';
import type { PromptData } from '../../types/modal';
import type { ResultDisplay, PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import { 
  ChevronDown, Zap, Eye, Settings, TestTube2, Play, TestTube,
  Square, RectangleVertical, FileEdit, PanelRight, BellRing, ArrowRight, Loader
} from 'lucide-react';

interface PromptRunnerModalSidebarTesterProps {
    promptData: PromptData;
}

/**
 * Comprehensive testing component for ALL 7 ResultDisplay types
 * Mix-and-match execution config with display types to test robustness
 */
export function PromptRunnerModalSidebarTester({ promptData }: PromptRunnerModalSidebarTesterProps) {
    const { openPrompt } = usePromptRunner();
    const [isOpen, setIsOpen] = useState(false);
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testModalType, setTestModalType] = useState<'direct' | 'inline' | 'background'>('direct');
    
    // Execution config toggles (user controls)
    const [autoRun, setAutoRun] = useState(true);
    const [allowChat, setAllowChat] = useState(true);
    const [showVariables, setShowVariables] = useState(false);
    const [applyVariables, setApplyVariables] = useState(true);
    
    // Generate test variables with defaults
    const getTestVariables = () => {
        const vars: Record<string, string> = {};
        promptData.variableDefaults?.forEach(v => {
            vars[v.name] = v.defaultValue || 'Test value';
        });
        return vars;
    };
    
    const openWithDisplayType = (resultDisplay: ResultDisplay) => {
        // For direct, inline, background - open test modal
        if (resultDisplay === 'direct' || resultDisplay === 'inline' || resultDisplay === 'background') {
            setTestModalType(resultDisplay);
            setTestModalOpen(true);
            return;
        }
        
        const executionConfig: Omit<PromptExecutionConfig, 'result_display'> = {
            auto_run: autoRun,
            allow_chat: allowChat,
            show_variables: showVariables,
            apply_variables: applyVariables,
        };
        
        const variables = applyVariables ? getTestVariables() : {};
        
        openPrompt({
            promptData,
            result_display: resultDisplay,
            executionConfig,
            variables,
        });
    };
    
    // ResultDisplay types with their characteristics
    const displayTypes = [
        {
            name: 'Modal Full',
            icon: Square,
            color: 'text-purple-600 dark:text-purple-400',
            resultDisplay: 'modal-full' as ResultDisplay,
            disabled: false,
            ignores: [],
            note: 'Full modal with all features'
        },
        {
            name: 'Modal Compact',
            icon: RectangleVertical,
            color: 'text-blue-600 dark:text-blue-400',
            resultDisplay: 'modal-compact' as ResultDisplay,
            disabled: false,
            ignores: ['show_variables'],
            note: 'Minimal UI, ignores show_variables'
        },
        {
            name: 'Inline',
            icon: FileEdit,
            color: 'text-amber-600 dark:text-amber-400',
            resultDisplay: 'inline' as ResultDisplay,
            disabled: false,
            ignores: ['allow_chat', 'show_variables'],
            note: 'Opens test editor with inline overlay',
            testMode: true
        },
        {
            name: 'Sidebar',
            icon: PanelRight,
            color: 'text-teal-600 dark:text-teal-400',
            resultDisplay: 'sidebar' as ResultDisplay,
            disabled: false,
            ignores: [],
            note: 'Side panel with full features'
        },
        {
            name: 'Toast',
            icon: BellRing,
            color: 'text-orange-600 dark:text-orange-400',
            resultDisplay: 'toast' as ResultDisplay,
            disabled: false,
            ignores: ['allow_chat', 'show_variables'],
            note: 'Quick notification, ignores chat/vars'
        },
        {
            name: 'Direct',
            icon: ArrowRight,
            color: 'text-cyan-600 dark:text-cyan-400',
            resultDisplay: 'direct' as ResultDisplay,
            disabled: false,
            ignores: ['allow_chat', 'show_variables'],
            note: 'Test programmatic result retrieval',
            testMode: true
        },
        {
            name: 'Background',
            icon: Loader,
            color: 'text-slate-600 dark:text-slate-400',
            resultDisplay: 'background' as ResultDisplay,
            disabled: false,
            ignores: ['allow_chat', 'show_variables'],
            note: 'Test silent execution & storage',
            testMode: true
        },
    ];
    
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="p-2 space-y-2">
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-7 px-2 text-xs"
                    >
                        <div className="flex items-center gap-1.5">
                            <TestTube2 className="w-3.5 h-3.5" />
                            <span>Test Display Types</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-2 max-h-[450px] overflow-y-auto">
                    {/* Execution Config Toggles */}
                    <div className="space-y-1.5">
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Execution Config
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 px-1">
                            <Button
                                variant={autoRun ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAutoRun(!autoRun)}
                                className="h-7 text-[10px] px-2"
                            >
                                <Play className="w-3 h-3 mr-1" />
                                Auto Run
                            </Button>
                            
                            <Button
                                variant={allowChat ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAllowChat(!allowChat)}
                                className="h-7 text-[10px] px-2"
                            >
                                <Zap className="w-3 h-3 mr-1" />
                                Chat
                            </Button>
                            
                            <Button
                                variant={showVariables ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowVariables(!showVariables)}
                                className="h-7 text-[10px] px-2"
                            >
                                <Eye className="w-3 h-3 mr-1" />
                                Show Vars
                            </Button>
                            
                            <Button
                                variant={applyVariables ? "default" : "outline"}
                                size="sm"
                                onClick={() => setApplyVariables(!applyVariables)}
                                className="h-7 text-[10px] px-2"
                            >
                                <Settings className="w-3 h-3 mr-1" />
                                Apply Vars
                            </Button>
                        </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Display Type Buttons */}
                    <div className="space-y-1.5">
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Result Display
                        </div>
                        
                        <div className="space-y-0.5 px-1">
                            {displayTypes.map((display, idx) => (
                                <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => !display.disabled && openWithDisplayType(display.resultDisplay)}
                                    disabled={display.disabled}
                                    className="w-full justify-start h-8 px-2 text-xs hover:bg-accent disabled:opacity-40"
                                    title={display.note}
                                >
                                    <display.icon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${display.disabled ? 'text-muted-foreground' : display.color}`} />
                                    <div className="flex-1 text-left flex flex-col">
                                        <span className="font-medium">{display.name}</span>
                                        {display.ignores.length > 0 && (
                                            <span className="text-[9px] text-muted-foreground">
                                                Ignores: {display.ignores.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    {(display as any).testMode && (
                                        <Badge variant="outline" className="text-[8px] h-4 px-1">
                                            <TestTube className="w-2.5 h-2.5" />
                                        </Badge>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-tight">
                        Toggle config, then select display type. System handles invalid combos gracefully. <TestTube className="w-2.5 h-2.5 inline" /> = Test mode with simulated context.
                    </div>
                </CollapsibleContent>
            </div>
            
            {/* Test Modal for Direct/Inline/Background */}
            <PromptExecutionTestModal
                isOpen={testModalOpen}
                onClose={() => setTestModalOpen(false)}
                testType={testModalType}
                promptData={promptData}
                executionConfig={{
                    auto_run: autoRun,
                    allow_chat: allowChat,
                    show_variables: showVariables,
                    apply_variables: applyVariables,
                }}
                variables={getTestVariables()}
            />
        </Collapsible>
    );
}


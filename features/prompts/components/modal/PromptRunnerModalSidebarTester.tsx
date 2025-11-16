"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Square, RectangleVertical, FileEdit, PanelRight, BellRing, ArrowRight, Loader,
  Maximize2
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
            name: 'Flexible Panel',
            icon: Maximize2,
            color: 'text-emerald-600 dark:text-emerald-400',
            resultDisplay: 'flexible-panel' as ResultDisplay,
            disabled: false,
            ignores: [],
            note: 'Advanced resizable panel with position controls'
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
                    <div className="space-y-2 px-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="auto-run" className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <Play className="w-3.5 h-3.5" />
                                Auto Run
                            </Label>
                            <Switch
                                id="auto-run"
                                checked={autoRun}
                                onCheckedChange={setAutoRun}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <Label htmlFor="allow-chat" className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <Zap className="w-3.5 h-3.5" />
                                Allow Chat
                            </Label>
                            <Switch
                                id="allow-chat"
                                checked={allowChat}
                                onCheckedChange={setAllowChat}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-variables" className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <Eye className="w-3.5 h-3.5" />
                                Show Variables
                            </Label>
                            <Switch
                                id="show-variables"
                                checked={showVariables}
                                onCheckedChange={setShowVariables}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <Label htmlFor="apply-variables" className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <Settings className="w-3.5 h-3.5" />
                                Apply Variables
                            </Label>
                            <Switch
                                id="apply-variables"
                                checked={applyVariables}
                                onCheckedChange={setApplyVariables}
                            />
                        </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Display Type Buttons */}
                    <div className="space-y-1.5">                        
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


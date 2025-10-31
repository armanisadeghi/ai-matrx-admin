"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePromptRunnerModal } from '../../hooks/usePromptRunnerModal';
import { PromptRunnerModal } from './PromptRunnerModal';
import { PromptData, PromptExecutionMode } from '../../types/modal';
import { ChevronDown, Zap, Eye, EyeOff, Settings, TestTube2 } from 'lucide-react';

interface PromptRunnerModalSidebarTesterProps {
    promptData: PromptData;
}

/**
 * Compact sidebar testing component for PromptRunnerModal
 * Fits in the PromptRunsSidebar footer
 */
export function PromptRunnerModalSidebarTester({ promptData }: PromptRunnerModalSidebarTesterProps) {
    const promptModal = usePromptRunnerModal();
    const [isOpen, setIsOpen] = useState(false);
    
    // Generate test variables with defaults
    const getTestVariables = () => {
        const vars: Record<string, string> = {};
        promptData.variableDefaults?.forEach(v => {
            vars[v.name] = v.defaultValue || 'Test value';
        });
        return vars;
    };
    
    const openModalWithMode = (mode: PromptExecutionMode) => {
        const config: any = {
            promptData: promptData,
            mode: mode,
        };
        
        // Add test variables for auto-run and hidden variables modes
        if (mode === 'auto-run' || mode === 'manual-with-hidden-variables') {
            config.variables = getTestVariables();
        }
        
        promptModal.open(config);
    };
    
    const modes = [
        {
            id: 'auto-run' as PromptExecutionMode,
            name: 'Auto-Run',
            icon: Zap,
            color: 'text-purple-600 dark:text-purple-400',
        },
        {
            id: 'manual-with-hidden-variables' as PromptExecutionMode,
            name: 'Hidden Vars',
            icon: EyeOff,
            color: 'text-blue-600 dark:text-blue-400',
        },
        {
            id: 'manual-with-visible-variables' as PromptExecutionMode,
            name: 'Visible Vars',
            icon: Eye,
            color: 'text-green-600 dark:text-green-400',
        },
        {
            id: 'manual' as PromptExecutionMode,
            name: 'Manual',
            icon: Settings,
            color: 'text-orange-600 dark:text-orange-400',
        },
    ];
    
    return (
        <>
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
                                <span>Test Modal</span>
                            </div>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-1.5">
                        <Separator className="my-1" />
                        <div className="space-y-1">
                            {modes.map(mode => (
                                <Button
                                    key={mode.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openModalWithMode(mode.id)}
                                    className="w-full justify-start h-7 px-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800"
                                >
                                    <mode.icon className={`w-3.5 h-3.5 mr-2 ${mode.color}`} />
                                    <span className="flex-1 text-left">{mode.name}</span>
                                </Button>
                            ))}
                        </div>
                        <div className="px-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-600 leading-tight">
                            Test prompt in modal with different execution modes
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>
            
            {/* The Modal */}
            {promptModal.config && (
                <PromptRunnerModal
                    isOpen={promptModal.isOpen}
                    onClose={promptModal.close}
                    {...promptModal.config}
                />
            )}
        </>
    );
}


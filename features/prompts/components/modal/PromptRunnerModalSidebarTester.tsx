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
import { PromptData, PromptRunnerModalConfig, type NewExecutionConfig } from '../../types/modal';
import { ChevronDown, Zap, Eye, EyeOff, Settings, TestTube2, MessageSquare, Ban } from 'lucide-react';

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
    
    const openModalWithConfig = (executionConfig: Omit<NewExecutionConfig, 'result_display'>) => {
        const config: PromptRunnerModalConfig = {
            promptData: promptData,
            executionConfig: executionConfig,
        };
        
        // Add test variables if apply_variables is true
        if (executionConfig.apply_variables) {
            config.variables = getTestVariables();
        }
        
        promptModal.open(config);
    };
    
    // New config-based test options
    const testConfigs = [
        {
            name: 'Auto + Chat',
            icon: Zap,
            color: 'text-purple-600 dark:text-purple-400',
            config: { auto_run: true, allow_chat: true, show_variables: false, apply_variables: true }
        },
        {
            name: 'Auto One-Shot',
            icon: Ban,
            color: 'text-pink-600 dark:text-pink-400',
            config: { auto_run: true, allow_chat: false, show_variables: false, apply_variables: true }
        },
        {
            name: 'Manual + Hidden',
            icon: EyeOff,
            color: 'text-blue-600 dark:text-blue-400',
            config: { auto_run: false, allow_chat: true, show_variables: false, apply_variables: true }
        },
        {
            name: 'Manual + Visible',
            icon: Eye,
            color: 'text-green-600 dark:text-green-400',
            config: { auto_run: false, allow_chat: true, show_variables: true, apply_variables: true }
        },
        {
            name: 'Manual (No Vars)',
            icon: Settings,
            color: 'text-orange-600 dark:text-orange-400',
            config: { auto_run: false, allow_chat: true, show_variables: false, apply_variables: false }
        },
        {
            name: 'Chat Only',
            icon: MessageSquare,
            color: 'text-cyan-600 dark:text-cyan-400',
            config: { auto_run: false, allow_chat: true, show_variables: true, apply_variables: false }
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
                            {testConfigs.map((testConfig, idx) => (
                                <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openModalWithConfig(testConfig.config)}
                                    className="w-full justify-start h-7 px-2 text-xs hover:bg-accent"
                                >
                                    <testConfig.icon className={`w-3.5 h-3.5 mr-2 ${testConfig.color}`} />
                                    <span className="flex-1 text-left">{testConfig.name}</span>
                                </Button>
                            ))}
                        </div>
                        <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-tight">
                            Test with different execution configurations (new system)
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


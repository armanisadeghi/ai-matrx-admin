"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePromptRunnerModal } from '../../hooks/usePromptRunnerModal';
import { PromptRunnerModal } from './PromptRunnerModal';
import { PromptData, PromptExecutionMode } from '../../types/modal';
import { Play, Settings, Eye, EyeOff, Zap } from 'lucide-react';

interface PromptRunnerModalTesterProps {
    promptData: PromptData;
}

/**
 * Testing component for PromptRunnerModal
 * Allows testing all execution modes with different configurations
 */
export function PromptRunnerModalTester({ promptData }: PromptRunnerModalTesterProps) {
    const promptModal = usePromptRunnerModal();
    const [selectedMode, setSelectedMode] = useState<PromptExecutionMode>('manual');
    
    // Test variables
    const [testVariables, setTestVariables] = useState<Record<string, string>>(() => {
        const vars: Record<string, string> = {};
        promptData.variableDefaults?.forEach(v => {
            vars[v.name] = v.defaultValue || '';
        });
        return vars;
    });
    
    const [testMessage, setTestMessage] = useState('');
    
    const handleVariableChange = (name: string, value: string) => {
        setTestVariables(prev => ({ ...prev, [name]: value }));
    };
    
    const openModalWithMode = (mode: PromptExecutionMode) => {
        const config: any = {
            promptData: promptData,
            mode: mode,
        };
        
        // Add variables if they're filled
        const hasVariables = Object.values(testVariables).some(v => v.trim() !== '');
        if (hasVariables) {
            config.variables = testVariables;
        }
        
        // Add message if provided
        if (testMessage.trim()) {
            config.initialMessage = testMessage;
        }
        
        promptModal.open(config);
    };
    
    const modes = [
        {
            id: 'auto-run' as PromptExecutionMode,
            name: 'Auto-Run',
            icon: Zap,
            description: 'Automatically executes with pre-filled variables',
            color: 'from-purple-500 to-pink-500',
        },
        {
            id: 'manual-with-hidden-variables' as PromptExecutionMode,
            name: 'Hidden Variables',
            icon: EyeOff,
            description: 'User adds instructions, variables are hidden',
            color: 'from-blue-500 to-cyan-500',
        },
        {
            id: 'manual-with-visible-variables' as PromptExecutionMode,
            name: 'Visible Variables',
            icon: Eye,
            description: 'User can edit variables and add instructions',
            color: 'from-green-500 to-emerald-500',
        },
        {
            id: 'manual' as PromptExecutionMode,
            name: 'Manual',
            icon: Settings,
            description: 'Standard prompt runner behavior',
            color: 'from-orange-500 to-red-500',
        },
    ];
    
    return (
        <>
            <Card className="p-6 bg-card border-2 border-dashed border-secondary/30">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                        <Play className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            Modal Testing Controls
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Test different execution modes for the PromptRunnerModal
                        </p>
                    </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Test Configuration */}
                <div className="space-y-4 mb-6">
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            Test Variables
                        </Label>
                        <div className="space-y-2">
                            {promptData.variableDefaults && promptData.variableDefaults.length > 0 ? (
                                promptData.variableDefaults.map(variable => (
                                    <div key={variable.name} className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            {variable.name}
                                        </Label>
                                        <Input
                                            value={testVariables[variable.name] || ''}
                                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                                            placeholder={`Enter ${variable.name}...`}
                                            className="text-sm"
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    No variables defined for this prompt
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            Optional Initial Message
                        </Label>
                        <Textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Enter an optional message to include..."
                            className="text-sm min-h-[80px]"
                        />
                    </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Execution Mode Buttons */}
                <div>
                    <Label className="text-sm font-medium mb-3 block">
                        Select Execution Mode
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modes.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => openModalWithMode(mode.id)}
                                className={`
                                    group relative overflow-hidden
                                    p-4 rounded-lg border-2 
                                    bg-card
                                    border-border
                                    hover:border-transparent
                                    transition-all duration-200
                                    text-left
                                `}
                            >
                                {/* Gradient border on hover */}
                                <div className={`
                                    absolute inset-0 bg-gradient-to-br ${mode.color}
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                    -z-10
                                `} />
                                <div className="absolute inset-[2px] bg-card rounded-md -z-10" />
                                
                                {/* Content */}
                                <div className="relative flex items-start gap-3">
                                    <div className={`
                                        p-2 rounded-lg 
                                        bg-gradient-to-br ${mode.color}
                                        group-hover:scale-110 transition-transform
                                    `}>
                                        <mode.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-foreground mb-1">
                                            {mode.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-tight">
                                            {mode.description}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-primary">
                        <strong>Tip:</strong> Fill in the test variables and message above, then click any mode button 
                        to open the modal with that configuration. Auto-run mode will immediately start execution if 
                        all variables are filled.
                    </p>
                </div>
            </Card>
            
            {/* The Modal */}
            {promptModal.config && (
                <PromptRunnerModal
                    isOpen={promptModal.isOpen}
                    onClose={promptModal.close}
                    {...promptModal.config}
                    onExecutionComplete={(result) => {
                        console.log('✅ Execution completed:', result);
                        // Keep modal open to see results
                    }}
                />
            )}
        </>
    );
}


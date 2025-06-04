"use client";
import React, { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
import { Play, Zap, X, CheckCircle, AlertCircle } from "lucide-react";
import { ButtonProps } from "@/components/ui/button";

interface SocketExecuteButtonProps extends Omit<ButtonProps, 'onClick'> {
    // Core required props
    presetName: string;
    sourceData: any;
    
    // Optional customization
    AdditionalDataComponent?: React.ComponentType<{
        sourceData: any;
        onDataChange: (newData: any) => void;
        onExecute: () => void;
    }>;
    ResponseComponent?: React.ComponentType<{
        taskId: string | null;
        isExecuting: boolean;
        error: string | null;
    }>;
    
    // UI customization
    buttonText?: string;
    overlayTitle?: string;
    overlayDescription?: string;
    executeButtonText?: string;
    
    // Callbacks
    onExecuteStart?: (data: any) => void;
    onExecuteComplete?: (taskId: string) => void;
    onExecuteError?: (error: string) => void;
    
    // Behavior
    autoExecute?: boolean;  // If true and no AdditionalDataComponent, executes immediately
    showOverlay?: boolean;  // If false, executes without overlay (only for simple cases)
}

export const SocketExecuteButton: React.FC<SocketExecuteButtonProps> = ({
    presetName,
    sourceData,
    AdditionalDataComponent,
    ResponseComponent,
    buttonText = "Execute",
    overlayTitle = "Execute Task",
    overlayDescription,
    executeButtonText = "Execute",
    onExecuteStart,
    onExecuteComplete,
    onExecuteError,
    autoExecute = true,
    showOverlay = true,
    ...buttonProps
}) => {
    const dispatch = useAppDispatch();
    
    // State management
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentData, setCurrentData] = useState(sourceData);

    // Determine if we need inputs
    const needsInputs = !!AdditionalDataComponent;
    const needsOverlay = showOverlay || needsInputs || !!ResponseComponent;

    // Core execution logic
    const executeTask = async (dataToExecute: any = currentData) => {
        setIsExecuting(true);
        setError(null);
        setTaskId(null);

        try {
            onExecuteStart?.(dataToExecute);
            
            console.log(`🚀 Executing preset "${presetName}" with data:`, dataToExecute);
            
            const createdTaskId = await dispatch(createTaskFromPresetQuick({
                presetName,
                sourceData: dataToExecute
            })).unwrap();
            
            setTaskId(createdTaskId);
            onExecuteComplete?.(createdTaskId);
            
            console.log(`✅ Task executed successfully: ${createdTaskId}`);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            onExecuteError?.(errorMessage);
            console.error(`❌ Execution failed:`, err);
        } finally {
            setIsExecuting(false);
        }
    };

    // Handle button click
    const handleButtonClick = async () => {
        if (!needsOverlay && autoExecute) {
            // Simple case: execute immediately without overlay
            await executeTask(sourceData);
        } else {
            // Complex case: open overlay
            setIsOverlayOpen(true);
            setCurrentData(sourceData); // Reset data
            
            // Auto-execute if no inputs needed and autoExecute is true
            if (!needsInputs && autoExecute) {
                await executeTask(sourceData);
            }
        }
    };

    // Handle data changes from AdditionalDataComponent
    const handleDataChange = (newData: any) => {
        setCurrentData(newData);
    };

    // Handle execute from AdditionalDataComponent
    const handleExecuteFromInput = async () => {
        await executeTask(currentData);
    };

    // Reset state when overlay closes
    const handleOverlayClose = () => {
        setIsOverlayOpen(false);
        setTaskId(null);
        setError(null);
        setIsExecuting(false);
    };

    return (
        <>
            {/* The Surface Button */}
            <Button 
                onClick={handleButtonClick}
                disabled={isExecuting}
                {...buttonProps}
            >
                {isExecuting ? (
                    <>
                        <Zap className="w-4 h-4 mr-2 animate-spin" />
                        Executing...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4 mr-2" />
                        {buttonText}
                    </>
                )}
            </Button>

            {/* The Overlay (if needed) */}
            {needsOverlay && (
                <Dialog open={isOverlayOpen} onOpenChange={handleOverlayClose}>
                    <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden p-0 flex flex-col">
                        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl text-gray-800 dark:text-gray-200">
                                            {overlayTitle}
                                        </DialogTitle>
                                        {overlayDescription && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {overlayDescription}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            Preset: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{presetName}</code>
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleOverlayClose}
                                    className="hover:bg-white/60 dark:hover:bg-slate-600/60"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="flex flex-1 min-h-0">
                            {/* Left Side - Additional Data (if provided) */}
                            {needsInputs && AdditionalDataComponent && (
                                <div className="w-1/2 flex flex-col border-r bg-gray-50 dark:bg-slate-800/50">
                                    <div className="p-6 overflow-y-auto flex-1">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
                                                    Configuration
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <AdditionalDataComponent
                                                    sourceData={currentData}
                                                    onDataChange={handleDataChange}
                                                    onExecute={handleExecuteFromInput}
                                                />
                                                
                                                {/* Execute Button for Input Cases */}
                                                <div className="mt-6 pt-4 border-t">
                                                    <Button
                                                        onClick={handleExecuteFromInput}
                                                        disabled={isExecuting}
                                                        className="w-full"
                                                    >
                                                        <Play className="w-4 h-4 mr-2" />
                                                        {isExecuting ? "Executing..." : executeButtonText}
                                                    </Button>
                                                    
                                                    {/* Status Messages */}
                                                    {error && (
                                                        <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                                            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                                                                <AlertCircle className="w-4 h-4" />
                                                                <span><strong>Error:</strong> {error}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {taskId && (
                                                        <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span><strong>Task Executed:</strong> {taskId}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* Right Side - Response */}
                            <div className={`${needsInputs ? 'w-1/2' : 'w-full'} flex flex-col bg-white dark:bg-slate-900`}>
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <Card className="h-full">
                                        <CardHeader className="flex-shrink-0">
                                            <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
                                                Results
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-y-auto">
                                            {ResponseComponent ? (
                                                <ResponseComponent
                                                    taskId={taskId}
                                                    isExecuting={isExecuting}
                                                    error={error}
                                                />
                                            ) : (
                                                // Default Response using SocketAccordionResponse
                                                <>
                                                    {taskId ? (
                                                        <div className="overflow-y-auto max-h-full">
                                                            <SocketAccordionResponse taskId={taskId} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                                            <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                                            <p>
                                                                {isExecuting 
                                                                    ? "Executing task..." 
                                                                    : needsInputs 
                                                                        ? "Configure and execute to see results"
                                                                        : "Execute to see results"
                                                                }
                                                            </p>
                                                            {error && (
                                                                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                                                    <p className="text-red-700 dark:text-red-300 text-sm">
                                                                        <strong>Error:</strong> {error}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default SocketExecuteButton; 
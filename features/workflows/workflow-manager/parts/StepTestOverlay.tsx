"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
import { Play, Zap, AlertCircle, CheckCircle, X } from "lucide-react";
import { WorkflowStep } from "@/types/customWorkflowTypes";

interface StepTestOverlayProps {
    step: WorkflowStep;
    isOpen: boolean;
    onClose: () => void;
}

interface DirectInput {
    argName: string;
    brokerId: string;
    value: string;
}

const StepTestOverlay: React.FC<StepTestOverlayProps> = ({ step, isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const [directInputs, setDirectInputs] = useState<DirectInput[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Parse arg_mapping to create direct inputs
    useEffect(() => {
        if (!step.override_data?.arg_mapping) {
            setDirectInputs([]);
            return;
        }

        const inputs: DirectInput[] = [];
        const argMapping = step.override_data.arg_mapping;

        // Convert arg_mapping object to array of direct inputs
        Object.entries(argMapping).forEach(([argName, brokerId]) => {
            if (typeof brokerId === 'string') {
                inputs.push({
                    argName,
                    brokerId,
                    value: '' // Default empty value
                });
            }
        });

        setDirectInputs(inputs);
    }, [step]);

    const handleInputChange = (index: number, value: string) => {
        setDirectInputs(prev => 
            prev.map((input, i) => 
                i === index ? { ...input, value } : input
            )
        );
    };

    const handleExecuteStep = async () => {
        setIsExecuting(true);
        setError(null);
        setTaskId(null);

        try {
            // Convert direct inputs to user_inputs format for socket task
            const userInputs = directInputs.map(input => ({
                broker_id: input.brokerId,
                value: input.value || "" // Use empty string if no value provided
            }));

            // Create the step data with user inputs
            const stepDataForSocket = {
                ...step,
                user_inputs: userInputs
            };

            console.log("🚀 Executing step with data:", stepDataForSocket);

            // Use our revolutionary preset system!
            const createdTaskId = await dispatch(createTaskFromPresetQuick({
                presetName: "workflow_step_to_execute_single_step",
                sourceData: stepDataForSocket
            })).unwrap();

            setTaskId(createdTaskId);
            console.log("✅ Task created and submitted successfully:", createdTaskId);

        } catch (err) {
            console.error("❌ Failed to execute step:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsExecuting(false);
        }
    };

    const handleQuickExecute = async () => {
        setIsExecuting(true);
        setError(null);
        setTaskId(null);

        try {
            // Quick execute with user inputs
            const stepDataForSocket = {
                ...step,
                user_inputs: directInputs.map(input => ({
                    broker_id: input.brokerId,
                    value: input.value || ""
                }))
            };

            const createdTaskId = await dispatch(createTaskFromPresetQuick({
                presetName: "workflow_step_to_execute_step_quick",
                sourceData: stepDataForSocket
            })).unwrap();

            setTaskId(createdTaskId);
            console.log("⚡ Quick task created and submitted successfully:", createdTaskId);

        } catch (err) {
            console.error("❌ Quick execute failed:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsExecuting(false);
        }
    };

    const formatStepName = (stepName?: string) => {
        if (!stepName) return 'Unnamed Step';
        return stepName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
                <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                                <Play className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl text-gray-800 dark:text-gray-200">
                                    Test Workflow Step
                                </DialogTitle>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {formatStepName(step.step_name)} • {step.function_id}
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={onClose}
                            className="hover:bg-white/60 dark:hover:bg-slate-600/60"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex h-[calc(90vh-120px)]">
                    {/* Left Side - Direct Inputs */}
                    <div className="w-1/2 p-6 border-r bg-gray-50 dark:bg-slate-800/50 overflow-y-auto">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                        <Zap className="w-5 h-5" />
                                        Direct Inputs
                                    </CardTitle>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {directInputs.length > 0 
                                            ? `Configure ${directInputs.length} mapped argument${directInputs.length !== 1 ? 's' : ''}`
                                            : 'No direct inputs required - this step has no arg mapping'
                                        }
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {directInputs.length > 0 ? (
                                        directInputs.map((input, index) => (
                                            <div key={`${input.argName}-${input.brokerId}`} className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {input.argName}
                                                </Label>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    Broker ID: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{input.brokerId}</code>
                                                </div>
                                                <Input
                                                    value={input.value}
                                                    onChange={(e) => handleInputChange(index, e.target.value)}
                                                    placeholder={`Enter value for ${input.argName}`}
                                                    className="w-full"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No arg mapping found</p>
                                            <p className="text-xs">This step will execute with default parameters</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Step Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Step Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-xs">
                                        <div><strong>Function Type:</strong> {step.function_type}</div>
                                        <div><strong>Function ID:</strong> {step.function_id}</div>
                                        <div><strong>Status:</strong> {step.status || 'pending'}</div>
                                        {step.additional_dependencies && step.additional_dependencies.length > 0 && (
                                            <div>
                                                <strong>Dependencies:</strong> 
                                                <ul className="mt-1 ml-2">
                                                    {step.additional_dependencies.map((dep, i) => (
                                                        <li key={i}>• {dep}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Execution Controls */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Execute Step</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        onClick={handleExecuteStep}
                                        disabled={isExecuting}
                                        className="w-full"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        {isExecuting ? "Executing..." : "Execute Single Step"}
                                    </Button>
                                    
                                    <Button
                                        onClick={handleQuickExecute}
                                        disabled={isExecuting}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Zap className="w-4 h-4 mr-2" />
                                        {isExecuting ? "Executing..." : "Quick Execute"}
                                    </Button>

                                    {error && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                            <p className="text-red-700 dark:text-red-300 text-sm">
                                                <strong>Error:</strong> {error}
                                            </p>
                                        </div>
                                    )}

                                    {taskId && (
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                                                <CheckCircle className="w-4 h-4" />
                                                <span><strong>Task Created & Submitted:</strong> {taskId}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Side - Response */}
                    <div className="w-1/2 p-6 bg-white dark:bg-slate-900 overflow-y-auto">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
                                        Execution Results
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {taskId ? (
                                        <SocketAccordionResponse taskId={taskId} />
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                            <p>Execute a step to see results here</p>
                                            <p className="text-xs mt-2">
                                                Results will appear in real-time as the step executes
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StepTestOverlay; 
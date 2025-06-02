"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch } from "@/lib/redux";
import { 
    createTaskFromPreset, 
    createTaskFromPresetQuick 
} from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { getAvailablePresets } from "@/constants/socket-task-presets";

const PresetDemo: React.FC = () => {
    const dispatch = useAppDispatch();
    const [lastTaskId, setLastTaskId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Sample workflow step data
    const sampleWorkflowStep = {
        id: "sample-step-123",
        function_id: "data_processor_v2",
        function_type: "workflow_recipe_executor",
        step_name: "Process User Data",
        status: "pending",
        override_data: {
            timeout: 30000,
            retry_count: 3
        },
        additional_dependencies: ["auth_service", "data_validation"],
        user_inputs: [
            {
                broker_id: "user_id_input",
                value: "12345"
            },
            {
                broker_id: "processing_mode",
                value: "batch"
            }
        ]
    };

    // Sample recipe data
    const sampleRecipeData = {
        recipe_id: "user-data-pipeline",
        brokers: [
            {
                name: "input_source",
                id: "source_broker",
                value: "database",
                ready: true
            },
            {
                name: "output_format",
                id: "format_broker", 
                value: "json",
                ready: true
            }
        ],
        overrides: {
            batch_size: 100,
            parallel_processing: true
        },
        stream: true
    };

    const handleCreateTaskFromWorkflowStep = async () => {
        setIsLoading(true);
        try {
            const result = await dispatch(createTaskFromPreset({
                presetName: "workflow_step_to_execute_single_step",
                sourceData: sampleWorkflowStep,
                options: {
                    validateSource: true
                }
            })).unwrap();
            
            setLastTaskId(result.taskId);
            setResult(result);
            console.log("🚀 Revolutionary! Created task:", result);
        } catch (error) {
            console.error("Failed to create task:", error);
            setResult({ error });
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickTaskCreation = async () => {
        setIsLoading(true);
        try {
            // The quick version - just give me a task ID!
            const taskId = await dispatch(createTaskFromPresetQuick({
                presetName: "recipe_data_to_run_recipe",
                sourceData: sampleRecipeData
            })).unwrap();
            
            setLastTaskId(taskId);
            setResult({ taskId, method: "quick" });
            console.log("⚡ Super quick! Task ID:", taskId);
        } catch (error) {
            console.error("Quick creation failed:", error);
            setResult({ error });
        } finally {
            setIsLoading(false);
        }
    };

    const availablePresets = getAvailablePresets();

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-gray-800 dark:text-gray-200">
                        🚀 Revolutionary Socket Task Preset System
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            Transform any application data into socket tasks with just one line of code!
                        </p>
                        
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Available Presets:</p>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                {availablePresets.map(preset => (
                                    <li key={preset} className="font-mono">• {preset}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button 
                            onClick={handleCreateTaskFromWorkflowStep}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? "Creating..." : "📋 Workflow Step → Execute Step"}
                        </Button>

                        <Button 
                            onClick={handleQuickTaskCreation}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full"
                        >
                            {isLoading ? "Creating..." : "⚡ Recipe Data → Run Recipe (Quick)"}
                        </Button>
                    </div>

                    {lastTaskId && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
                            <p className="text-green-800 dark:text-green-300 font-medium">
                                ✅ Success! Created Task ID: 
                                <span className="font-mono ml-2">{lastTaskId}</span>
                            </p>
                        </div>
                    )}

                    {result && (
                        <Card className="bg-gray-50 dark:bg-gray-800/50">
                            <CardHeader>
                                <CardTitle className="text-sm">Result Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs overflow-auto bg-gray-100 dark:bg-gray-700 p-3 rounded">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Sample Source Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Workflow Step Object:</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                            {JSON.stringify(sampleWorkflowStep, null, 2)}
                        </pre>
                    </div>
                    
                    <div>
                        <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Recipe Data Object:</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                            {JSON.stringify(sampleRecipeData, null, 2)}
                        </pre>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="text-lg text-blue-800 dark:text-blue-300">💡 How Revolutionary Is This?</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-blue-700 dark:text-blue-300 space-y-2 text-sm">
                        <p><strong>Before:</strong> Complex manual field mapping, validation, type conversion...</p>
                        <p><strong>Now:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">dispatch(createTaskFromPresetQuick({"{"}presetName, sourceData{"}"})).unwrap()</code></p>
                        <p><strong>Result:</strong> Instant task ID, automatic validation, perfect type conversion! 🎉</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PresetDemo; 
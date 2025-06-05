"use client";

import { useState } from "react";
import { WorkflowStep } from "@/types/customWorkflowTypes";
import WorkflowStepCreatorOverlay from "@/features/old-deprecated-workflow-system-do-not-use/workflows/workflow-manager/nodes/registered-function-node/creator-overlay/WorkflowStepCreatorOverlay";

export default function OverlayDemoPage() {
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [createdSteps, setCreatedSteps] = useState<WorkflowStep[]>([]);

    const handleStepCreated = (step: WorkflowStep) => {
        setCreatedSteps(prev => [...prev, step]);
        console.log("Step created via callback:", step);
    };

    const handleClearSteps = () => {
        setCreatedSteps([]);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        🎉 Workflow Step Creator Overlay Demo
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Production-ready overlay component for adding workflow steps to any workflow editor.
                    </p>

                    {/* Demo Controls */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsOverlayOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            ✨ Open Step Creator
                        </button>
                        
                        {createdSteps.length > 0 && (
                            <button
                                onClick={handleClearSteps}
                                className="px-4 py-3 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Clear Steps ({createdSteps.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Features Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        ✨ Key Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Full-Screen Overlay</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Nearly full-page modal with plenty of space</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Parent Callback</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Optional callback to return step data</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Rich Function Details</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Description with line breaks preserved</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Table-Based Configuration</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Clean table layout for input management</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Type-Specific Inputs</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Smart inputs for int, float, bool, dict, list</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Streamlined Mapping</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Integrated broker mapping controls</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage Example */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        💻 Usage Example
                    </h2>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-800 dark:text-gray-200">
                            {`import WorkflowStepCreatorOverlay from './components/WorkflowStepCreatorOverlay';

                            function MyWorkflowEditor() {
                            const [isOverlayOpen, setIsOverlayOpen] = useState(false);
                            
                            const handleStepCreated = (step: WorkflowStep) => {
                                // Add step to your workflow
                                addStepToWorkflow(step);
                            };

                            return (
                                <>
                                <button onClick={() => setIsOverlayOpen(true)}>
                                    Add Step
                                </button>
                                
                                <WorkflowStepCreatorOverlay
                                    isOpen={isOverlayOpen}
                                    onClose={() => setIsOverlayOpen(false)}
                                    onStepCreated={handleStepCreated}
                                    initialFunctionId="optional-pre-selected-function"
                                />
                                </>
                            );
                            }`}
                        </pre>
                    </div>
                </div>

                {/* Created Steps Display */}
                {createdSteps.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            📋 Created Steps ({createdSteps.length})
                        </h2>
                        <div className="space-y-4">
                            {createdSteps.map((step, index) => (
                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {step.step_name || `Step ${index + 1}`}
                                        </h3>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {step.override_data?.arg_overrides?.length || 0} inputs • 
                                            {Object.keys(step.override_data?.arg_mapping || {}).length} mappings
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Function ID:</span>
                                            <div className="font-mono text-xs">{step.function_id.slice(0, 8)}...</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Execution:</span>
                                            <div>{step.execution_required ? "Required" : "Optional"}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                            <div className="capitalize">{step.status}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* The Overlay Component */}
            <WorkflowStepCreatorOverlay
                isOpen={isOverlayOpen}
                onClose={() => setIsOverlayOpen(false)}
                onStepCreated={handleStepCreated}
            />
        </div>
    );
} 
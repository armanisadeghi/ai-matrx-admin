import React from "react";
import { useState } from "react";
import { FunctionSquare, Edit, ArrowRight, ArrowLeft, Settings, Link, ToggleLeft, ToggleRight } from "lucide-react";
import { NodeWrapper } from "../NodeWrapper";
import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { WorkflowStep } from "@/types/customWorkflowTypes";
import WorkflowStepCreatorOverlay from "./WorkflowStepCreatorOverlay";
import { ClickableBroker } from "../../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../../WorkflowStepsSection";

export function UnifiedRegisteredNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Initialize selectors
    const workflowSelectors = createWorkflowSelectors();
    
    // Get basic function data (name only for display)
    const registeredFunction = useAppSelector((state) => 
        workflowSelectors.registeredFunctions(state)[`id:${step.function_id}`]
    );

    // Extract core step data
    const stepName = step.step_name || "Unnamed Step";
    const functionName = registeredFunction?.name || "Unknown Function";
    const argMapping = step.override_data?.arg_mapping || {};
    const returnBroker = step.override_data?.return_broker_override;
    const argOverrides = step.override_data?.arg_overrides || [];

    // Overlay state for editing
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

    // Handle step update from overlay
    const handleStepUpdate = (updatedStep: WorkflowStep) => {
        if (onUpdate) {
            onUpdate(index, updatedStep);
            console.log("Updated step from overlay:", updatedStep);
        }
        setIsOverlayOpen(false);
    };

    return (
        <>
            <NodeWrapper
                step={step}
                index={index}
                isExpanded={isExpanded}
                onToggle={onToggle}
                title={functionName}
                icon={FunctionSquare}
                colorTheme="teal"
                onEdit={() => setIsOverlayOpen(true)}
                showReturnBroker={false}
            >
                {() => (
                    <div className="space-y-4">
                        {/* Argument Mappings */}
                        {Object.keys(argMapping).length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
                                        Input Mappings ({Object.keys(argMapping).length})
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(argMapping).map(([argName, brokerId]) => (
                                        <div key={argName} className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                                                    {argName}
                                                </span>
                                                <ClickableBroker
                                                    brokerId={String(brokerId)}
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-700 px-3 py-1.5 rounded-lg break-all"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Argument Overrides */}
                        {argOverrides.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
                                        Parameter Overrides ({argOverrides.length})
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {argOverrides.map((override: any, idx: number) => (
                                        <div key={idx} className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                                                            {override.name}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {override.ready ? (
                                                                <ToggleRight className="w-4 h-4 text-emerald-500" />
                                                            ) : (
                                                                <ToggleLeft className="w-4 h-4 text-amber-500" />
                                                            )}
                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                                override.ready 
                                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                                {override.ready ? 'Ready' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-mono bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-700 px-3 py-2 rounded-lg break-all max-h-32 overflow-y-auto">
                                                        {typeof override.value === 'object' 
                                                            ? (
                                                                <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                                                                    {JSON.stringify(override.value, null, 2)}
                                                                </pre>
                                                            )
                                                            : String(override.value || 'undefined')
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Return Broker */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span className="text-sm font-medium text-teal-900 dark:text-teal-100">Return Broker</span>
                            </div>
                            <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3">
                                {returnBroker ? (
                                    <ClickableBroker
                                        brokerId={Array.isArray(returnBroker) ? returnBroker[0] || "" : String(returnBroker)}
                                        className="text-sm font-mono bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-700 px-3 py-2 rounded-lg break-all block"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-teal-700 dark:text-teal-300 italic text-center py-2">
                                        No return broker configured
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step Status */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FunctionSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span className="text-sm font-medium text-teal-900 dark:text-teal-100">Step Configuration</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsOverlayOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    Configure
                                </button>
                            </div>
                            <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-teal-800 dark:text-teal-200">Execution Required</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        step.execution_required
                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {step.execution_required ? 'Required' : 'Optional'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-teal-800 dark:text-teal-200">Status</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        step.status === 'completed' 
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : step.status === 'pending'
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {step.status || 'pending'}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-teal-200/50 dark:border-teal-700/50">
                                    <span className="text-xs text-teal-600 dark:text-teal-400">Step Name:</span>
                                    <div className="text-sm font-mono bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-700 px-2 py-1 rounded mt-1">
                                        {stepName}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </NodeWrapper>

            {/* Edit Overlay */}
            <WorkflowStepCreatorOverlay
                isOpen={isOverlayOpen}
                onClose={() => setIsOverlayOpen(false)}
                onStepCreated={handleStepUpdate}
                initialStepData={step}
                mode="edit"
            />
        </>
    );
}

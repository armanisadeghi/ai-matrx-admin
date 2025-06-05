import React from "react";
import { useState } from "react";
import { FunctionSquare, Edit, ArrowRight, ArrowLeft, Settings, Link, ToggleLeft, ToggleRight } from "lucide-react";
import { NodeWrapper } from "../NodeWrapper";
import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { WorkflowStep } from "@/types/customWorkflowTypes";
import WorkflowStepCreatorOverlay from "./creator-overlay/WorkflowStepCreatorOverlay";
import { ClickableBroker } from "../../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../../WorkflowStepsSection";

export function UnifiedRegisteredNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Initialize selectors
    const workflowSelectors = createWorkflowSelectors();
    
    // Get complete function data with args using the enriched selector
    const registeredFunctionWithArgs = useAppSelector((state) => 
        workflowSelectors.registeredFunctionWithArgs(state, step.function_id)
    );

    // Extract core step data
    const stepName = step.step_name || "Unnamed Step";
    const functionName = registeredFunctionWithArgs?.name || "Unknown Function";
    const argMapping = step.override_data?.arg_mapping || {};
    const returnBroker = step.override_data?.return_broker_override;
    const argOverrides = step.override_data?.arg_overrides || [];

    // Create a map of overrides for easy lookup
    const overrideMap = new Map(argOverrides.map(override => [override.name, override]));

    // Merge function default args with overrides
    const allArgs = registeredFunctionWithArgs?.args?.map(defaultArg => {
        const override = overrideMap.get(defaultArg.name);
        const hasMapping = argMapping[defaultArg.name];
        
        // Simple value resolution: check override.value, then override.default_value, then function default
        let resolvedValue;
        if (override && 'value' in override) {
            resolvedValue = override.value;
        } else if (override && 'default_value' in override) {
            resolvedValue = override.default_value;
        } else {
            resolvedValue = defaultArg.defaultValue && typeof defaultArg.defaultValue === "object" && "value" in defaultArg.defaultValue
                ? defaultArg.defaultValue.value
                : defaultArg.defaultValue;
        }
        
        return {
            ...defaultArg,
            resolvedValue: resolvedValue,
            isOverridden: !!override,
            isMapped: !!hasMapping,
            mappedToBroker: hasMapping,
            ready: override?.ready ?? defaultArg.ready
        };
    }) || [];

    // Overlay state for editing
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

    // Handle step update from overlay
    const handleStepUpdate = (updatedStep: WorkflowStep) => {
        console.log("🔄 UnifiedRegisteredNode.handleStepUpdate called:", {
            stepIndex: index,
            oldStep: step,
            newStep: updatedStep,
            hasOnUpdate: !!onUpdate
        });
        
        if (onUpdate) {
            onUpdate(index, updatedStep);
            console.log("✅ UnifiedRegisteredNode.handleStepUpdate - called onUpdate callback");
        } else {
            console.warn("❌ UnifiedRegisteredNode.handleStepUpdate - no onUpdate callback provided");
        }
        
        setIsOverlayOpen(false);
    };

    // Handle edit initiation - called from NodeWrapper
    const handleEdit = () => {
        setIsOverlayOpen(true);
    };

    // Handle save completion - called from NodeWrapper when save button is clicked
    const handleSave = () => {
        // In this case, save is handled by the overlay, so this is just for state management
        // The overlay will call handleStepUpdate when actually saving
        console.log("NodeWrapper save clicked - overlay should handle actual save");
    };

    // Handle cancel - called from NodeWrapper when cancel button is clicked
    const handleCancel = () => {
        setIsOverlayOpen(false);
    };

    // Handle overlay close (including backdrop clicks, escape key, etc.)
    const handleOverlayClose = () => {
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
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                showReturnBroker={false}
                // Pass overlay state to NodeWrapper so it knows when we're editing
                isEditing={isOverlayOpen}
            >
                {() => (
                    <div className="space-y-4">
                        {/* Debug Section - Full Step Object */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Settings className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                    Debug: Full Step Object
                                </span>
                            </div>
                            <div className="bg-red-50/50 dark:bg-red-950/20 rounded-lg p-3">
                                <pre className="text-xs font-mono bg-white dark:bg-slate-800 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-700 px-3 py-2 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap break-all">
                                    {JSON.stringify(step, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Function Arguments */}
                        {allArgs.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
                                        Function Arguments ({allArgs.length})
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {allArgs.map((arg) => (
                                        <div key={arg.name} className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                                                            {arg.name}
                                                        </span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                            arg.dataType === 'str' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                            arg.dataType === 'int' || arg.dataType === 'float' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                                            arg.dataType === 'bool' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                                            arg.dataType === 'dict' || arg.dataType === 'list' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                                            'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {arg.dataType}
                                                        </span>
                                                        {arg.required && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                                                Required
                                                            </span>
                                                        )}
                                                        {arg.isOverridden && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                                Override
                                                            </span>
                                                        )}
                                                        {arg.isMapped && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                                                Mapped
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-1">
                                                            {arg.ready ? (
                                                                <ToggleRight className="w-4 h-4 text-emerald-500" />
                                                            ) : (
                                                                <ToggleLeft className="w-4 h-4 text-amber-500" />
                                                            )}
                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                                arg.ready 
                                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                                {arg.ready ? 'Ready' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Show broker mapping if exists */}
                                                    {arg.isMapped && (
                                                        <div className="mb-2">
                                                            <span className="text-xs text-indigo-600 dark:text-indigo-400">Mapped to Broker:</span>
                                                            <ClickableBroker
                                                                brokerId={arg.mappedToBroker}
                                                                className="text-sm font-mono bg-indigo-50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-700 px-3 py-2 rounded-lg break-all block mt-1"
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Show resolved value */}
                                                    <div>
                                                        <span className="text-xs text-teal-600 dark:text-teal-400">Value:</span>
                                                        <div className="text-sm font-mono bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-700 px-3 py-2 rounded-lg break-all max-h-32 overflow-y-auto mt-1">
                                                            {typeof arg.resolvedValue === 'object' 
                                                                ? (
                                                                    <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                                                                        {JSON.stringify(arg.resolvedValue, null, 2)}
                                                                    </pre>
                                                                )
                                                                : String(arg.resolvedValue ?? 'null')
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Return Brokers */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
                                    Return Brokers {returnBroker ? '(Default + Override)' : '(Default)'}
                                </span>
                            </div>
                            <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3 space-y-3">
                                {/* Default Return Broker */}
                                {registeredFunctionWithArgs?.returnBroker && (
                                    <div>
                                        <span className="text-xs text-teal-600 dark:text-teal-400 mb-2 block">Default Return Broker:</span>
                                        <ClickableBroker
                                            brokerId={registeredFunctionWithArgs.returnBroker}
                                            className="text-sm font-mono bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-700 px-3 py-2 rounded-lg break-all block"
                                        />
                                    </div>
                                )}
                                
                                {/* Override Return Brokers */}
                                {returnBroker && (
                                    <div>
                                        <span className="text-xs text-teal-600 dark:text-teal-400 mb-2 block">Override Return Broker(s):</span>
                                        <div className="space-y-2">
                                            {Array.isArray(returnBroker) ? (
                                                returnBroker.map((brokerId, index) => (
                                                    <ClickableBroker
                                                        key={index}
                                                        brokerId={brokerId}
                                                        className="text-sm font-mono bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700 px-3 py-2 rounded-lg break-all block"
                                                    />
                                                ))
                                            ) : (
                                                <ClickableBroker
                                                    brokerId={returnBroker}
                                                    className="text-sm font-mono bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700 px-3 py-2 rounded-lg break-all block"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Fallback if no default broker found */}
                                {!registeredFunctionWithArgs?.returnBroker && !returnBroker && (
                                    <div className="text-sm font-mono text-red-700 dark:text-red-300 italic text-center py-2">
                                        No return broker found (this should not happen)
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step Status */}
                        <div>
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
                            </div>
                        </div>
                    </div>
                )}
            </NodeWrapper>

            {/* Edit Overlay */}
            <WorkflowStepCreatorOverlay
                isOpen={isOverlayOpen}
                onClose={handleOverlayClose}
                onStepCreated={handleStepUpdate}
                initialStepData={step}
                mode="edit"
            />
        </>
    );
}

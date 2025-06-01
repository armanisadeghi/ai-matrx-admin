import React from "react";
import { useState } from "react";
import { Settings, Edit } from "lucide-react";
import { BrokerDisplay, ClickableBroker, WorkflowStepCardProps } from "../../WorkflowStepsSection";
import { NodeWrapper } from "../NodeWrapper";
import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { WorkflowStep } from "@/types/customWorkflowTypes";

// Import the enhanced overlay system
import WorkflowStepCreatorOverlay from "@/features/workflows/workflow-manager/nodes/registered-function-node/WorkflowStepCreatorOverlay";

// Resizable container component for JSON displays
function ResizableJsonContainer({
    children,
    initialHeight = 200,
    minHeight = 120,
}: {
    children: React.ReactNode;
    initialHeight?: number;
    minHeight?: number;
}) {
    const [height, setHeight] = useState(initialHeight);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const newHeight = Math.max(minHeight, height + e.movementY);
        setHeight(newHeight);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add event listeners when dragging
    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [isDragging, height]);

    return (
        <div className="relative">
            <div className="overflow-y-auto" style={{ height: `${height}px` }}>
                {children}
            </div>
            {/* Resize handle */}
            <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 cursor-ns-resize flex items-center justify-center transition-colors"
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-1 bg-gray-400 dark:bg-gray-300 rounded-full"></div>
            </div>
        </div>
    );
}

// Specialized card for registered nodes
export function UnifiedRegisteredNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Initialize selectors
    const workflowSelectors = createWorkflowSelectors();

    // Get enriched step data for this specific step index
    const enrichedStepData = useAppSelector((state) => workflowSelectors.enrichedFunctionStep(state, index));

    // Get registered function with args by function ID
    const registeredFunctionWithArgs = useAppSelector((state) => workflowSelectors.registeredFunctionWithArgs(state, step.function_id));

    // Extract data from override_data with proper typing
    const stepName = step.step_name || "Unnamed Node";
    const argOverrides = step.override_data?.arg_overrides || [];
    const argMapping = step.override_data?.arg_mapping || {};
    const returnBroker = step.override_data?.return_broker_override;

    // Overlay state (replaces old edit state)
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

    // Handle step update from overlay
    const handleStepUpdate = (updatedStep: WorkflowStep) => {
        if (onUpdate) {
            onUpdate(index, updatedStep);
            console.log("Updated step from overlay:", updatedStep);
        }
        setIsOverlayOpen(false);
    };

    // Legacy edit state (keep for non-overlay editing if needed)
    const [editValues, setEditValues] = useState({
        stepName: stepName,
        returnBrokerId: Array.isArray(returnBroker) ? returnBroker[0] || "None" : returnBroker || "None",
        argMappings: { ...argMapping },
    });

    const handleSave = () => {
        if (!onUpdate) {
            console.log("No onUpdate handler provided");
            return;
        }

        // Create updated step with new values
        const updatedStep = { ...step };

        // Update step name
        updatedStep.step_name = editValues.stepName;

        // Ensure override_data exists
        if (!updatedStep.override_data) {
            updatedStep.override_data = {};
        }

        // Update arg mappings
        updatedStep.override_data.arg_mapping = { ...editValues.argMappings };

        // Update return broker - maintain original format if it was an array
        if (editValues.returnBrokerId !== "None") {
            if (Array.isArray(returnBroker)) {
                // If original was array, keep as array
                updatedStep.override_data.return_broker_override = [editValues.returnBrokerId];
            } else {
                // If original was string, keep as string
                updatedStep.override_data.return_broker_override = editValues.returnBrokerId;
            }
        } else {
            delete updatedStep.override_data.return_broker_override;
        }

        onUpdate(index, updatedStep);
        console.log("Saving unified registered node changes:", editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            stepName: stepName,
            returnBrokerId: Array.isArray(returnBroker) ? returnBroker[0] || "None" : returnBroker || "None",
            argMappings: { ...argMapping },
        });
    };

    const handleArgMappingChange = (paramName: string, brokerId: string) => {
        setEditValues((prev) => ({
            ...prev,
            argMappings: {
                ...prev.argMappings,
                [paramName]: brokerId,
            },
        }));
    };

    const addArgMapping = () => {
        const newParamName = `param_${Object.keys(editValues.argMappings).length + 1}`;
        handleArgMappingChange(newParamName, "");
    };

    const removeArgMapping = (paramName: string) => {
        setEditValues((prev) => {
            const newMappings = { ...prev.argMappings };
            delete newMappings[paramName];
            return {
                ...prev,
                argMappings: newMappings,
            };
        });
    };

    return (
        <>
            <NodeWrapper
                step={step}
                index={index}
                isExpanded={isExpanded}
                onToggle={onToggle}
                title={editValues.stepName}
                icon={Settings}
                colorTheme="teal"
                onSave={handleSave}
                onCancel={handleCancel}
                showReturnBroker={false}
            >
                {({ isEditing }) => (
                    <div className="space-y-4">
                        {/* Function ID */}
                        <div className="p-3 bg-teal-100 dark:bg-teal-800 rounded-lg">
                            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">Function ID:</span>
                            <div className="text-xs font-mono text-teal-900 dark:text-teal-100 mt-1 bg-white dark:bg-gray-800 rounded p-2 border border-teal-200 dark:border-teal-600 break-all">
                                {step.function_id}
                            </div>
                        </div>

                        {/* NEW: Enhanced Function Data from Redux */}
                        {registeredFunctionWithArgs && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Enhanced Function Data:</span>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                                        Redux Enhanced
                                    </div>
                                </div>
                                <ResizableJsonContainer initialHeight={180} minHeight={120}>
                                    <div className="text-xs font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-600 h-full overflow-y-auto">
                                        <div className="space-y-2">
                                            <div>
                                                <strong>Name:</strong> {registeredFunctionWithArgs.name}
                                            </div>
                                            <div>
                                                <strong>Description:</strong> {registeredFunctionWithArgs.description}
                                            </div>
                                            <div>
                                                <strong>Module:</strong> {registeredFunctionWithArgs.modulePath}
                                            </div>
                                            <div>
                                                <strong>Class:</strong> {registeredFunctionWithArgs.className}
                                            </div>
                                            <div>
                                                <strong>Function:</strong> {registeredFunctionWithArgs.funcName}
                                            </div>
                                            <div>
                                                <strong>Return Broker:</strong> {registeredFunctionWithArgs.returnBroker}
                                            </div>
                                            <div>
                                                <strong>Args Count:</strong> {registeredFunctionWithArgs.args?.length || 0}
                                            </div>
                                        </div>
                                    </div>
                                </ResizableJsonContainer>
                            </div>
                        )}

                        {/* NEW: Args Data JSON Display */}
                        {registeredFunctionWithArgs?.args && registeredFunctionWithArgs.args.length > 0 && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                        Function Arguments ({registeredFunctionWithArgs.args.length}):
                                    </span>
                                    <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">
                                        Redux Enhanced
                                    </div>
                                </div>
                                <ResizableJsonContainer initialHeight={250} minHeight={150}>
                                    <div className="text-xs font-mono text-purple-900 dark:text-purple-100 bg-white dark:bg-gray-800 rounded p-3 border border-purple-200 dark:border-purple-600 h-full overflow-y-auto">
                                        {registeredFunctionWithArgs.args.map((arg, idx) => (
                                            <div
                                                key={idx}
                                                className="mb-3 p-2 bg-purple-25 dark:bg-purple-900/20 rounded border-l-2 border-purple-300 dark:border-purple-600"
                                            >
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <strong>Name:</strong> {arg.name}
                                                    </div>
                                                    <div>
                                                        <strong>Type:</strong> {arg.dataType}
                                                    </div>
                                                    <div>
                                                        <strong>Required:</strong> {arg.required ? "Yes" : "No"}
                                                    </div>
                                                    <div>
                                                        <strong>Ready:</strong> {arg.ready ? "Yes" : "No"}
                                                    </div>
                                                </div>
                                                {arg.defaultValue && Object.keys(arg.defaultValue).length > 0 && (
                                                    <div className="mt-1">
                                                        <strong>Default:</strong> {JSON.stringify(arg.defaultValue)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ResizableJsonContainer>
                            </div>
                        )}

                        {/* NEW: Enriched Step Data JSON Display */}
                        {enrichedStepData && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-green-800 dark:text-green-200">Enriched Step Data:</span>
                                    <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                                        Step Index {index}
                                    </div>
                                </div>
                                <ResizableJsonContainer initialHeight={200} minHeight={120}>
                                    <div className="text-xs font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 rounded p-3 border border-green-200 dark:border-green-600 h-full overflow-y-auto">
                                        <pre>{JSON.stringify(enrichedStepData, null, 2)}</pre>
                                    </div>
                                </ResizableJsonContainer>
                            </div>
                        )}

                        {/* Step Name */}
                        <div className="py-2 border-b border-teal-200 dark:border-teal-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">Step Name:</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValues.stepName}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, stepName: e.target.value }))}
                                    className="w-full text-sm font-mono text-teal-900 dark:text-teal-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Step Name"
                                />
                            ) : (
                                <div className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                    {editValues.stepName}
                                </div>
                            )}
                        </div>

                        {/* Argument Overrides - Read Only */}
                        {argOverrides.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-teal-800 dark:text-teal-200 mb-2">
                                    Argument Overrides ({argOverrides.length})
                                </h4>
                                <div className="space-y-2">
                                    {argOverrides.map((override: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-teal-200 dark:border-teal-600"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-sm font-medium text-teal-900 dark:text-teal-100">
                                                    {override.name || "Unknown"}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {override.ready ? (
                                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                                                            ✓ Ready
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">
                                                            ⏳ Not Ready
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Default Value:</div>
                                            <ResizableJsonContainer initialHeight={120} minHeight={80}>
                                                <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded p-2 font-mono h-full overflow-y-auto">
                                                    {typeof override.default_value === "string"
                                                        ? override.default_value
                                                        : JSON.stringify(override.default_value, null, 2)}
                                                </div>
                                            </ResizableJsonContainer>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Argument Mapping - Now Editable */}
                        <div className="py-2 border-b border-teal-200 dark:border-teal-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                                    Argument Mapping ({Object.keys(editValues.argMappings).length})
                                </span>
                                {isEditing && (
                                    <button
                                        onClick={addArgMapping}
                                        className="px-2 py-1 text-xs bg-teal-500 dark:bg-teal-600 text-white rounded hover:bg-teal-600 dark:hover:bg-teal-700"
                                    >
                                        Add Mapping
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {Object.entries(editValues.argMappings).map(([argName, brokerId]) => (
                                    <div
                                        key={argName}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-teal-200 dark:border-teal-600"
                                    >
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={argName}
                                                        onChange={(e) => {
                                                            const newArgName = e.target.value;
                                                            const currentBrokerId = editValues.argMappings[argName];
                                                            removeArgMapping(argName);
                                                            handleArgMappingChange(newArgName, currentBrokerId);
                                                        }}
                                                        className="flex-1 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900 px-2 py-1 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                        placeholder="Argument name"
                                                    />
                                                    <button
                                                        onClick={() => removeArgMapping(argName)}
                                                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={String(brokerId || "")}
                                                    onChange={(e) => handleArgMappingChange(argName, e.target.value)}
                                                    className="w-full text-sm font-mono text-teal-900 dark:text-teal-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                    placeholder="Broker ID"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-sm font-medium text-teal-900 dark:text-teal-100">
                                                    {argName}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-teal-600 dark:text-teal-400">🔗</span>
                                                    <ClickableBroker
                                                        brokerId={String(brokerId || "Unknown")}
                                                        className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-teal-50 dark:bg-teal-900 px-2 py-1 rounded border border-teal-200 dark:border-teal-600"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {Object.keys(editValues.argMappings).length === 0 && (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                        No argument mappings configured
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Return Broker */}
                        <div className="py-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">Return Broker:</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValues.returnBrokerId}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, returnBrokerId: e.target.value }))}
                                    className="w-full text-sm font-mono text-teal-900 dark:text-teal-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Return Broker ID"
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-teal-600 dark:text-teal-400">🔗</span>
                                    {editValues.returnBrokerId !== "None" ? (
                                        <ClickableBroker
                                            brokerId={editValues.returnBrokerId}
                                            className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-teal-200 dark:border-teal-600 break-all"
                                        />
                                    ) : (
                                        <div className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                            None
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Enhanced Edit Button */}
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Enhanced Editing</h3>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        Use the advanced overlay for comprehensive step editing with validation
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsOverlayOpen(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit with Overlay
                                </button>
                            </div>
                        </div>

                        {/* Empty State */}
                        {argOverrides.length === 0 &&
                            Object.keys(editValues.argMappings).length === 0 &&
                            editValues.returnBrokerId === "None" &&
                            !registeredFunctionWithArgs && (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <div className="text-2xl mb-2">📝</div>
                                    <p className="text-sm">No configuration available</p>
                                </div>
                            )}
                    </div>
                )}
            </NodeWrapper>

            {/* Enhanced Overlay for Step Editing */}
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

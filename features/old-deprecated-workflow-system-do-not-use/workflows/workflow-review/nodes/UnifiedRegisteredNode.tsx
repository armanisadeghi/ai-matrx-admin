import { useState } from "react";
import { Settings } from "lucide-react";
import { BrokerDisplay, ClickableBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";

// Specialized card for registered nodes
export function UnifiedRegisteredNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract data from override_data with proper typing
    const stepName = step.step_name || 'Unnamed Node';
    const argOverrides = step.override_data?.arg_overrides || [];
    const argMapping = step.override_data?.arg_mapping || {};
    const returnBroker = step.override_data?.return_broker_override;

    // Edit state
    const [editValues, setEditValues] = useState({
        stepName: stepName,
        returnBrokerId: Array.isArray(returnBroker) ? returnBroker[0] || 'None' : returnBroker || 'None',
        argMappings: { ...argMapping }
    });

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
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
        if (editValues.returnBrokerId !== 'None') {
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
        console.log('Saving unified registered node changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            stepName: stepName,
            returnBrokerId: Array.isArray(returnBroker) ? returnBroker[0] || 'None' : returnBroker || 'None',
            argMappings: { ...argMapping }
        });
    };

    const handleArgMappingChange = (paramName: string, brokerId: string) => {
        setEditValues(prev => ({
            ...prev,
            argMappings: {
                ...prev.argMappings,
                [paramName]: brokerId
            }
        }));
    };

    const addArgMapping = () => {
        const newParamName = `param_${Object.keys(editValues.argMappings).length + 1}`;
        handleArgMappingChange(newParamName, '');
    };

    const removeArgMapping = (paramName: string) => {
        setEditValues(prev => {
            const newMappings = { ...prev.argMappings };
            delete newMappings[paramName];
            return {
                ...prev,
                argMappings: newMappings
            };
        });
    };

    return (
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
                        <div className="text-xs font-mono text-teal-900 dark:text-teal-100 mt-1 bg-textured rounded p-2 border border-teal-200 dark:border-teal-600 break-all">
                            {step.function_id}
                        </div>
                    </div>

                    {/* Step Name */}
                    <div className="py-2 border-b border-teal-200 dark:border-teal-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">Step Name:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.stepName}
                                onChange={(e) => setEditValues(prev => ({ ...prev, stepName: e.target.value }))}
                                className="w-full text-sm font-mono text-teal-900 dark:text-teal-100 bg-textured px-3 py-2 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Step Name"
                            />
                        ) : (
                            <div className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-textured px-3 py-2 rounded border">
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
                                    <div key={idx} className="bg-textured rounded-lg p-3 border border-teal-200 dark:border-teal-600">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-sm font-medium text-teal-900 dark:text-teal-100">
                                                {override.name || 'Unknown'}
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
                                        <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded p-2 font-mono">
                                            {typeof override.default_value === 'string' 
                                                ? override.default_value 
                                                : JSON.stringify(override.default_value, null, 2)
                                            }
                                        </div>
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
                                <div key={argName} className="bg-textured rounded-lg p-3 border border-teal-200 dark:border-teal-600">
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
                                                value={String(brokerId || '')}
                                                onChange={(e) => handleArgMappingChange(argName, e.target.value)}
                                                className="w-full text-sm font-mono text-teal-900 dark:text-teal-100 bg-textured px-2 py-1 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                                                    brokerId={String(brokerId || 'Unknown')}
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
                                onChange={(e) => setEditValues(prev => ({ ...prev, returnBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono text-teal-900 dark:text-teal-100 bg-textured px-3 py-2 rounded border border-teal-300 dark:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Return Broker ID"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-teal-600 dark:text-teal-400">🔗</span>
                                {editValues.returnBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.returnBrokerId}
                                        className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-textured px-3 py-2 rounded border border-teal-200 dark:border-teal-600 break-all"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-teal-900 dark:text-teal-100 bg-textured px-3 py-2 rounded border">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Empty State */}
                    {argOverrides.length === 0 && Object.keys(editValues.argMappings).length === 0 && editValues.returnBrokerId === 'None' && (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <div className="text-2xl mb-2">📝</div>
                            <p className="text-sm">No configuration available</p>
                        </div>
                    )}
                </div>
            )}
        </NodeWrapper>
    );
}


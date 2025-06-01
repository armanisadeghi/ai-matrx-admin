// DefaultWorkflowStepCard.tsx
import { useState, useContext } from "react";
import { Puzzle } from "lucide-react";
import { ClickableBroker, WorkflowStepCardProps, stepContainsBroker } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";
import { BrokerHighlightContext } from "../WorkflowDetailContent";
import { FUNCTION_TYPES } from "../../../../types/customWorkflowTypes";

// Default card for unregistered function types
export function DefaultNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    const stepName = step.step_name || 'Unknown Function';
    const functionType = step.function_type || 'Unknown Type';
    const functionId = step.function_id || 'No ID';
    
    // Handle both string and array return brokers
    const originalReturnBroker = step.override_data?.return_broker_override;
    const returnBrokerArray = Array.isArray(originalReturnBroker) 
        ? originalReturnBroker 
        : originalReturnBroker ? [originalReturnBroker] : [];

    // Edit state
    const [editValues, setEditValues] = useState({
        stepName: stepName,
        functionType: functionType,
        functionId: functionId,
        returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : [''],
        argMappings: step.override_data?.arg_mapping ? { ...step.override_data.arg_mapping } : {}
    });

    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const containsHighlightedBroker = highlightedBroker && stepContainsBroker(step, highlightedBroker);

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
            return;
        }

        // Create updated step with new values
        const updatedStep = { ...step };
        
        // Update step properties
        updatedStep.step_name = editValues.stepName;
        updatedStep.function_type = editValues.functionType as typeof FUNCTION_TYPES.REGISTERED_FUNCTION | typeof FUNCTION_TYPES.WORKFLOW_RECIPE_EXECUTOR;
        updatedStep.function_id = editValues.functionId;

        // Ensure override_data exists
        if (!updatedStep.override_data) {
            updatedStep.override_data = {};
        }

        // Update arg mappings
        updatedStep.override_data.arg_mapping = { ...editValues.argMappings };

        // Update return broker - preserve original format (string vs array)
        const validReturnBrokers = editValues.returnBrokerIds.filter(id => id && id.trim() !== '' && id !== 'None');
        
        if (validReturnBrokers.length > 0) {
            // If original was array or we have multiple values, save as array
            if (Array.isArray(originalReturnBroker) || validReturnBrokers.length > 1) {
                updatedStep.override_data.return_broker_override = validReturnBrokers;
            } else {
                // If original was string and we have one value, save as string
                updatedStep.override_data.return_broker_override = validReturnBrokers[0];
            }
        } else {
            delete updatedStep.override_data.return_broker_override;
        }

        onUpdate(index, updatedStep);
        console.log('Saving default node changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            stepName: stepName,
            functionType: functionType,
            functionId: functionId,
            returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : [''],
            argMappings: step.override_data?.arg_mapping ? { ...step.override_data.arg_mapping } : {}
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

    const handleReturnBrokerChange = (index: number, value: string) => {
        setEditValues(prev => ({
            ...prev,
            returnBrokerIds: prev.returnBrokerIds.map((id, i) => i === index ? value : id)
        }));
    };

    const addReturnBroker = () => {
        setEditValues(prev => ({
            ...prev,
            returnBrokerIds: [...prev.returnBrokerIds, '']
        }));
    };

    const removeReturnBroker = (index: number) => {
        if (editValues.returnBrokerIds.length > 1) {
            setEditValues(prev => ({
                ...prev,
                returnBrokerIds: prev.returnBrokerIds.filter((_, i) => i !== index)
            }));
        }
    };

    return (
        <NodeWrapper
            step={step}
            index={index}
            isExpanded={isExpanded}
            onToggle={onToggle}
            title={editValues.stepName}
            icon={Puzzle}
            colorTheme="blue"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-4">
                    {/* Function Type */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Function Type:</span>
                        </div>
                        {isEditing ? (
                            <select
                                value={editValues.functionType}
                                onChange={(e) => setEditValues(prev => ({ ...prev, functionType: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="registered_function">Registered Function</option>
                                <option value="workflow_recipe_executor">Workflow Recipe Executor</option>
                            </select>
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                {editValues.functionType}
                            </div>
                        )}
                    </div>

                    {/* Function ID */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Function ID:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.functionId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, functionId: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Function ID"
                            />
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border break-all">
                                {editValues.functionId}
                            </div>
                        )}
                    </div>

                    {/* Step Name */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Step Name:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.stepName}
                                onChange={(e) => setEditValues(prev => ({ ...prev, stepName: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Step Name"
                            />
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                {editValues.stepName}
                            </div>
                        )}
                    </div>

                    {/* Argument Mapping */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                Argument Mapping ({Object.keys(editValues.argMappings).length})
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addArgMapping}
                                    className="px-2 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    Add Mapping
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {Object.entries(editValues.argMappings).map(([argName, brokerId]) => (
                                <div key={argName} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-600">
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
                                                        handleArgMappingChange(newArgName, String(currentBrokerId));
                                                    }}
                                                    className="flex-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Broker ID"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-sm font-medium text-blue-900 dark:text-blue-100">
                                                {argName}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-blue-600 dark:text-blue-400">🔗</span>
                                                <ClickableBroker
                                                    brokerId={String(brokerId || 'Unknown')}
                                                    className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-200 dark:border-blue-600"
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

                    {/* Return Brokers */}
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                Return Broker{editValues.returnBrokerIds.length > 1 ? 's' : ''} ({editValues.returnBrokerIds.filter(id => id && id !== 'None').length}):
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="px-2 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-blue-600 dark:text-blue-400">🔗</span>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Return Broker ID"
                                            />
                                            {editValues.returnBrokerIds.length > 1 && (
                                                <button
                                                    onClick={() => removeReturnBroker(idx)}
                                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1">
                                            {brokerId && brokerId !== 'None' ? (
                                                <ClickableBroker
                                                    brokerId={brokerId}
                                                    className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-200 dark:border-blue-600 break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                                    None
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {editValues.returnBrokerIds.every(id => !id || id === 'None') && (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                    No return brokers configured
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warning for unregistered */}
                    <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                            <span className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                Unregistered Function Type
                            </span>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            This function type may not be properly handled by the workflow engine.
                        </p>
                    </div>
                </div>
            )}
        </NodeWrapper>
    );
}


// DefaultWorkflowStepCard.tsx
import { useState, useContext } from "react";
import { Puzzle, Type, Hash, Settings, ArrowRight, ArrowLeft } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps, stepContainsBroker } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";
import { FUNCTION_TYPES } from "@/types/customWorkflowTypes";
import { BrokerHighlightContext } from "../brokers/BrokerHighlightContext";

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

    const argMappingEntries = Object.entries(editValues.argMappings);
    const validReturnBrokers = editValues.returnBrokerIds.filter(id => id && id !== 'None');

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
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Function Type</span>
                        </div>
                        {isEditing ? (
                            <select
                                value={editValues.functionType}
                                onChange={(e) => setEditValues(prev => ({ ...prev, functionType: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            >
                                <option value="registered_function">Registered Function</option>
                                <option value="workflow_recipe_executor">Workflow Recipe Executor</option>
                            </select>
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {editValues.functionType}
                            </div>
                        )}
                    </div>

                    {/* Function ID */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Function ID</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.functionId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, functionId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Function ID"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg break-all">
                                {editValues.functionId}
                            </div>
                        )}
                    </div>

                    {/* Step Name */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Step Name</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.stepName}
                                onChange={(e) => setEditValues(prev => ({ ...prev, stepName: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Step Name"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg break-all">
                                {editValues.stepName}
                            </div>
                        )}
                    </div>

                    {/* Argument Mappings */}
                    {argMappingEntries.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        Argument Mappings ({argMappingEntries.length})
                                    </span>
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={addArgMapping}
                                        className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                                    >
                                        Add Mapping
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {argMappingEntries.map(([paramName, brokerId], idx) => (
                                    <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={paramName}
                                                        onChange={(e) => {
                                                            const newParamName = e.target.value;
                                                            const currentBrokerId = editValues.argMappings[paramName];
                                                            removeArgMapping(paramName);
                                                            handleArgMappingChange(newParamName, currentBrokerId);
                                                        }}
                                                        className="flex-1 text-xs font-medium bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Parameter name"
                                                    />
                                                    <button
                                                        onClick={() => removeArgMapping(paramName)}
                                                        className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={String(brokerId)}
                                                    onChange={(e) => handleArgMappingChange(paramName, e.target.value)}
                                                    className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Broker ID"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    {paramName}
                                                </span>
                                                <ClickableBroker 
                                                    brokerId={String(brokerId)} 
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Return Brokers */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Return Broker{validReturnBrokers.length !== 1 ? 's' : ''} ({validReturnBrokers.length})
                                </span>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                placeholder="Return Broker ID"
                                            />
                                            {editValues.returnBrokerIds.length > 1 && (
                                                <button
                                                    onClick={() => removeReturnBroker(idx)}
                                                    className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            {brokerId && brokerId !== 'None' ? (
                                                <ClickableBroker
                                                    brokerId={brokerId}
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-blue-700 dark:text-blue-300 italic">
                                                    Not configured
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!isEditing && validReturnBrokers.length === 0 && (
                                <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                                    No return brokers configured
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </NodeWrapper>
    );
}


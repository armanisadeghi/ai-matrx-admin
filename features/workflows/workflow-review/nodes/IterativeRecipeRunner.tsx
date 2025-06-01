import { useState } from "react";
import { IterationCcw } from "lucide-react";
import { BrokerDisplay, ClickableBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";

// Specialized card for iterative recipe runner function type
export function IterativeRecipeRunnerNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract broker IDs from arg_mapping
    const inputBrokerId = step.override_data?.arg_mapping?.batch_configs_broker_id || 'None';
    
    // Handle both string and array return brokers
    const originalReturnBroker = step.override_data?.return_broker_override;
    const returnBrokerArray = Array.isArray(originalReturnBroker) 
        ? originalReturnBroker 
        : originalReturnBroker ? [originalReturnBroker] : [];

    // Edit state
    const [editValues, setEditValues] = useState({
        inputBrokerId: inputBrokerId,
        returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : ['']
    });

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
            return;
        }

        // Create updated step with new values
        const updatedStep = { ...step };
        
        // Ensure override_data exists
        if (!updatedStep.override_data) {
            updatedStep.override_data = {};
        }

        // Update arg_mapping
        if (!updatedStep.override_data.arg_mapping) {
            updatedStep.override_data.arg_mapping = {};
        }

        updatedStep.override_data.arg_mapping.batch_configs_broker_id = editValues.inputBrokerId !== 'None' ? editValues.inputBrokerId : undefined;

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
        console.log('Saving iterative recipe runner changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            inputBrokerId: inputBrokerId,
            returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : ['']
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
            title="Run Iterative Recipe"
            icon={IterationCcw}
            colorTheme="orange"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-3">
                    {/* Input Broker */}
                    <div className="py-2 border-b border-orange-200 dark:border-orange-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">Input Broker:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.inputBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, inputBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono text-orange-900 dark:text-orange-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-orange-300 dark:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Batch Configs Broker ID"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-orange-600 dark:text-orange-400">🔗</span>
                                {editValues.inputBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.inputBrokerId}
                                        className="text-sm font-mono text-orange-900 dark:text-orange-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-orange-200 dark:border-orange-600 break-all"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-orange-900 dark:text-orange-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                                Return Broker{editValues.returnBrokerIds.length > 1 ? 's' : ''} ({editValues.returnBrokerIds.filter(id => id && id !== 'None').length}):
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="px-2 py-1 text-xs bg-orange-500 dark:bg-orange-600 text-white rounded hover:bg-orange-600 dark:hover:bg-orange-700"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-orange-600 dark:text-orange-400">🔗</span>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono text-orange-900 dark:text-orange-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-orange-300 dark:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                                                    className="text-sm font-mono text-orange-900 dark:text-orange-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-orange-200 dark:border-orange-600 break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-orange-900 dark:text-orange-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
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
                </div>
            )}
        </NodeWrapper>
    );
} 
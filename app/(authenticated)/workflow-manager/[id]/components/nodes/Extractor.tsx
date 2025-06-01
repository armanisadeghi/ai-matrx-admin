import { useState } from "react";
import { Target } from "lucide-react";
import { BrokerDisplay, ClickableBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";

// Specialized card for extractor function type
export function ExtractorNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    const inputBrokerId = step.override_data?.arg_mapping?.input_broker_id || 'None';
    const configBrokerId = step.override_data?.arg_mapping?.config_broker_id || 'None';
    
    // Handle both string and array return brokers
    const originalReturnBroker = step.override_data?.return_broker_override;
    const returnBrokerArray = Array.isArray(originalReturnBroker) 
        ? originalReturnBroker 
        : originalReturnBroker ? [originalReturnBroker] : [];

    // Edit state
    const [editValues, setEditValues] = useState({
        inputBrokerId: inputBrokerId,
        configBrokerId: configBrokerId,
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

        updatedStep.override_data.arg_mapping.input_broker_id = editValues.inputBrokerId !== 'None' ? editValues.inputBrokerId : undefined;
        updatedStep.override_data.arg_mapping.config_broker_id = editValues.configBrokerId !== 'None' ? editValues.configBrokerId : undefined;

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
        console.log('Saving extractor changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            inputBrokerId: inputBrokerId,
            configBrokerId: configBrokerId,
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
            title="Extract Data"
            icon={Target}
            colorTheme="green"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-3">
                    {/* Input Broker */}
                    <div className="py-2 border-b border-green-200 dark:border-green-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-800 dark:text-green-200">Input Broker:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.inputBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, inputBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-300 dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Input Broker ID"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 dark:text-green-400">🔗</span>
                                {editValues.inputBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.inputBrokerId}
                                        className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-200 dark:border-green-600 break-all"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Config Broker */}
                    <div className="py-2 border-b border-green-200 dark:border-green-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-800 dark:text-green-200">Config Broker:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.configBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, configBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-300 dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Config Broker ID"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 dark:text-green-400">🔗</span>
                                {editValues.configBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.configBrokerId}
                                        className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-200 dark:border-green-600 break-all"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                                Return Broker{editValues.returnBrokerIds.length > 1 ? 's' : ''} ({editValues.returnBrokerIds.filter(id => id && id !== 'None').length}):
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="px-2 py-1 text-xs bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-green-600 dark:text-green-400">🔗</span>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-300 dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                                    className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-200 dark:border-green-600 break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
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

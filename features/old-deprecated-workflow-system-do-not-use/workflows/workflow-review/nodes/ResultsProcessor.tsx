import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { BrokerDisplay, ClickableBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";

// Specialized card for results processor function type
export function ResultsProcessorNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract input broker from arg_mapping
    const inputBrokerId = step.override_data?.arg_mapping?.input_broker_id || 'None';
    
    // Extract config from overrides if present
    const configOverride = step.override_data?.arg_overrides?.find(override => override.name === 'config');
    
    // Handle both string and array return brokers
    const originalReturnBroker = step.override_data?.return_broker_override;
    const returnBrokerArray = Array.isArray(originalReturnBroker) 
        ? originalReturnBroker 
        : originalReturnBroker ? [originalReturnBroker] : [];

    // Edit state
    const [editValues, setEditValues] = useState({
        inputBrokerId: inputBrokerId,
        returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : [''],
        config: configOverride?.value || ''
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

        // Update config override
        if (!updatedStep.override_data.arg_overrides) {
            updatedStep.override_data.arg_overrides = [];
        }

        const existingConfigIndex = updatedStep.override_data.arg_overrides.findIndex(override => override.name === 'config');
        if (editValues.config && editValues.config.trim() !== '') {
            const configValue = {
                name: 'config',
                value: editValues.config,
                ready: true,
                default_value: editValues.config
            };

            if (existingConfigIndex >= 0) {
                updatedStep.override_data.arg_overrides[existingConfigIndex] = configValue;
            } else {
                updatedStep.override_data.arg_overrides.push(configValue);
            }
        } else if (existingConfigIndex >= 0) {
            updatedStep.override_data.arg_overrides.splice(existingConfigIndex, 1);
        }

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
        console.log('Saving results processor changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            inputBrokerId: inputBrokerId,
            returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : [''],
            config: configOverride?.value || ''
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
            title="Recipe Results Processor"
            icon={BarChart3}
            colorTheme="amber"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-3">
                    {/* Input Broker */}
                    <div className="py-2 border-b border-amber-200 dark:border-amber-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Input Broker:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.inputBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, inputBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border border-amber-300 dark:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="Input Broker ID"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-600 dark:text-amber-400">🔗</span>
                                {editValues.inputBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.inputBrokerId}
                                        className="text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border border-amber-200 dark:border-amber-600 break-all"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Config */}
                    <div className="py-2 border-b border-amber-200 dark:border-amber-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Config:</span>
                        </div>
                        {isEditing ? (
                            <textarea
                                value={editValues.config}
                                onChange={(e) => setEditValues(prev => ({ ...prev, config: e.target.value }))}
                                className="w-full text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border border-amber-300 dark:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                                placeholder="Configuration (JSON or text)"
                            />
                        ) : (
                            <div className="text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured rounded p-3 border border-amber-200 dark:border-amber-600 max-h-32 overflow-y-auto">
                                {editValues.config ? (
                                    <pre className="whitespace-pre-wrap break-words">
                                        {typeof editValues.config === 'string' 
                                            ? editValues.config 
                                            : JSON.stringify(editValues.config, null, 2)
                                        }
                                    </pre>
                                ) : (
                                    <span className="text-gray-500 dark:text-gray-400">No configuration</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                Return Broker{editValues.returnBrokerIds.length > 1 ? 's' : ''} ({editValues.returnBrokerIds.filter(id => id && id !== 'None').length}):
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="px-2 py-1 text-xs bg-amber-500 dark:bg-amber-600 text-white rounded hover:bg-amber-600 dark:hover:bg-amber-700"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-amber-600 dark:text-amber-400">🔗</span>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border border-amber-300 dark:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                                                    className="text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border border-amber-200 dark:border-amber-600 break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-amber-900 dark:text-amber-100 bg-textured px-3 py-2 rounded border">
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

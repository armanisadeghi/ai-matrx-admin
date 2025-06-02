import { useState } from "react";
import { Target, ArrowRight, Settings, ArrowLeft } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
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

    const validReturnBrokers = editValues.returnBrokerIds.filter(id => id && id !== 'None');

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
                <div className="space-y-4">
                    {/* Input Broker */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-900 dark:text-green-100">Input Broker</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.inputBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, inputBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                                placeholder="Input Broker ID"
                            />
                        ) : (
                            <div>
                                {editValues.inputBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.inputBrokerId}
                                        className="text-sm font-mono bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 px-3 py-2 rounded-lg break-all block"
                                    />
                                ) : (
                                    <div className="text-sm font-mono bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 px-3 py-2 rounded-lg">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Config Broker */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-900 dark:text-green-100">Config Broker</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.configBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, configBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                                placeholder="Config Broker ID"
                            />
                        ) : (
                            <div>
                                {editValues.configBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.configBrokerId}
                                        className="text-sm font-mono bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 px-3 py-2 rounded-lg break-all block"
                                    />
                                ) : (
                                    <div className="text-sm font-mono bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 px-3 py-2 rounded-lg">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Return Broker{validReturnBrokers.length !== 1 ? 's' : ''} ({validReturnBrokers.length})
                                </span>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-900/70 text-green-700 dark:text-green-300 px-2 py-1 rounded-md transition-colors"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-3">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
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
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-700 px-2 py-1 rounded break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-green-700 dark:text-green-300 italic">
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

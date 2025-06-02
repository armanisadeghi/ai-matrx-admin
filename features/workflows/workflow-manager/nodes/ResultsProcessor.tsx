import { useState } from "react";
import { BarChart3, ArrowRight, Settings, ArrowLeft } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
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

    const validReturnBrokers = editValues.returnBrokerIds.filter(id => id && id !== 'None');

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
                <div className="space-y-4">
                    {/* Input Broker */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Input Broker</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.inputBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, inputBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                                placeholder="Input Broker ID"
                            />
                        ) : (
                            <div>
                                {editValues.inputBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.inputBrokerId}
                                        className="text-sm font-mono bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 px-3 py-2 rounded-lg break-all block"
                                    />
                                ) : (
                                    <div className="text-sm font-mono bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 px-3 py-2 rounded-lg">
                                        None
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Config */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Configuration</span>
                        </div>
                        {isEditing ? (
                            <textarea
                                value={editValues.config}
                                onChange={(e) => setEditValues(prev => ({ ...prev, config: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors min-h-[100px] resize-y"
                                placeholder="Configuration (JSON or text)"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 rounded-lg p-3 max-h-32 overflow-y-auto">
                                {editValues.config ? (
                                    <pre className="whitespace-pre-wrap break-words">
                                        {typeof editValues.config === 'string' 
                                            ? editValues.config 
                                            : JSON.stringify(editValues.config, null, 2)
                                        }
                                    </pre>
                                ) : (
                                    <span className="text-amber-600 dark:text-amber-400 italic">No configuration</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                    Return Broker{validReturnBrokers.length !== 1 ? 's' : ''} ({validReturnBrokers.length})
                                </span>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md transition-colors"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
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
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700 px-2 py-1 rounded break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-amber-700 dark:text-amber-300 italic">
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

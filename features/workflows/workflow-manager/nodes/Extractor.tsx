import { useState } from "react";
import { Target, ArrowRight, Settings, ArrowLeft } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";
import { WorkflowStep } from "@/types/customWorkflowTypes";

// Specialized card for extractor function type
export function ExtractorNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    const inputBrokerId = step.override_data?.arg_mapping?.input_broker_id || 'None';
    const configBrokerId = step.override_data?.arg_mapping?.config_broker_id || 'None';
    const originalReturnBroker = step.override_data?.return_broker_override;

    // State for editing
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        inputBrokerId: inputBrokerId,
        configBrokerId: configBrokerId,
        returnBrokerIds: Array.isArray(originalReturnBroker) 
            ? originalReturnBroker 
            : originalReturnBroker ? [originalReturnBroker] : ['None']
    });

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
            return;
        }

        // ✅ SAFE: Create completely new step structure instead of mutating original
        const updatedStep: WorkflowStep = {
            function_type: "workflow_recipe_executor",
            function_id: step.function_id,
            step_name: step.step_name,
            status: step.status || "pending",
            execution_required: step.execution_required ?? true,
            override_data: {
                arg_overrides: step.override_data?.arg_overrides || [],
                arg_mapping: {
                    ...step.override_data?.arg_mapping,
                    input_broker_id: editValues.inputBrokerId !== 'None' ? editValues.inputBrokerId : undefined,
                    config_broker_id: editValues.configBrokerId !== 'None' ? editValues.configBrokerId : undefined
                },
                return_broker_override: (() => {
                    const validReturnBrokers = editValues.returnBrokerIds.filter(id => id && id.trim() !== '' && id !== 'None');
                    
                    if (validReturnBrokers.length > 0) {
                        // If original was array or we have multiple values, save as array
                        if (Array.isArray(originalReturnBroker) || validReturnBrokers.length > 1) {
                            return validReturnBrokers;
                        } else {
                            // If original was string and we have one value, save as string
                            return validReturnBrokers[0];
                        }
                    }
                    return undefined;
                })()
            },
            additional_dependencies: step.additional_dependencies || [],
            broker_relays: step.broker_relays || {
                simple_relays: [],
                bidirectional_relays: [],
                relay_chains: []
            }
        };

        console.log('🔄 ExtractorNodeDisplay.handleSave - created updated step:', updatedStep);
        onUpdate(index, updatedStep);
        setIsEditing(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            inputBrokerId: inputBrokerId,
            configBrokerId: configBrokerId,
            returnBrokerIds: Array.isArray(originalReturnBroker) 
                ? originalReturnBroker 
                : originalReturnBroker ? [originalReturnBroker] : ['None']
        });
        setIsEditing(false);
    };

    const addReturnBroker = () => {
        setEditValues(prev => ({
            ...prev,
            returnBrokerIds: [...prev.returnBrokerIds, '']
        }));
    };

    const updateReturnBroker = (index: number, value: string) => {
        setEditValues(prev => ({
            ...prev,
            returnBrokerIds: prev.returnBrokerIds.map((id, i) => i === index ? value : id)
        }));
    };

    const removeReturnBroker = (index: number) => {
        setEditValues(prev => ({
            ...prev,
            returnBrokerIds: prev.returnBrokerIds.filter((_, i) => i !== index)
        }));
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
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={isEditing}
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
                                                onChange={(e) => updateReturnBroker(idx, e.target.value)}
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

import { useState } from "react";
import { BarChart3, ArrowRight, ArrowLeft } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";
import { WorkflowStep } from "@/types/customWorkflowTypes";

const DEFAULT_RETURN_BROKERS = [
    "FINAL_WORKFLOW_RESULTS",
    "FINAL_WORKFLOW_RESULTS_CLASSIFIED"
];

/**
 * ResultsProcessor utilities - all business logic lives here
 */
const ResultsProcessorUtils = {
    /**
     * Validate and extract display data from a ResultsProcessor step
     */
    extractDisplayData(step: WorkflowStep) {
        if (step.function_id !== "results_processor") {
            throw new Error(`Expected function_id 'results_processor', got '${step.function_id}'`);
        }
        
        const argMapping = step.override_data?.arg_mapping;
        if (!argMapping) {
            throw new Error("ResultsProcessor step missing required arg_mapping");
        }
        
        const inputBrokerId = argMapping.input_broker_id;
        if (!inputBrokerId) {
            throw new Error("ResultsProcessor step missing required input_broker_id in arg_mapping");
        }
        
        // Check for unexpected arg_mapping properties
        const argMappingKeys = Object.keys(argMapping);
        if (argMappingKeys.length !== 1 || argMappingKeys[0] !== "input_broker_id") {
            throw new Error(`ResultsProcessor step has unexpected arg_mapping properties. Expected only 'input_broker_id', got: ${argMappingKeys.join(', ')}`);
        }
        
        // Check for unexpected arg_overrides
        if (step.override_data?.arg_overrides && step.override_data.arg_overrides.length > 0) {
            throw new Error("ResultsProcessor step should not have any arg_overrides");
        }
        
        // Extract return brokers and filter out defaults
        const returnBrokers = step.override_data?.return_broker_override || [];
        const returnBrokersArray = Array.isArray(returnBrokers) ? returnBrokers : [returnBrokers];
        
        // Remove default brokers from the override data - they shouldn't be stored
        const additionalReturnBrokers = returnBrokersArray.filter(
            broker => broker && !DEFAULT_RETURN_BROKERS.includes(broker)
        );
        
        return {
            inputBrokerId,
            defaultReturnBrokers: [...DEFAULT_RETURN_BROKERS],
            additionalReturnBrokers,
            totalReturnBrokers: DEFAULT_RETURN_BROKERS.length + additionalReturnBrokers.length
        };
    },

    /**
     * Create a properly structured ResultsProcessor step for saving
     */
    createStep(baseStep: WorkflowStep, inputBrokerId: string, additionalReturnBrokers: string[]): WorkflowStep {
        // Filter out empty values and default brokers (in case they were accidentally added)
        const validAdditionalBrokers = additionalReturnBrokers
            .filter(id => id && id.trim() !== '')
            .filter(id => !DEFAULT_RETURN_BROKERS.includes(id));

        const stepData: WorkflowStep = {
            function_type: "workflow_recipe_executor",
            function_id: "results_processor",
            step_name: baseStep.step_name,
            status: baseStep.status || "pending",
            execution_required: baseStep.execution_required ?? true,
            override_data: {
                arg_mapping: {
                    input_broker_id: inputBrokerId
                }
            },
            additional_dependencies: baseStep.additional_dependencies || [],
            broker_relays: baseStep.broker_relays || {
                simple_relays: [],
                bidirectional_relays: [],
                relay_chains: []
            }
        };

        // Only include return_broker_override if there are additional brokers beyond the defaults
        if (validAdditionalBrokers.length > 0) {
            stepData.override_data!.return_broker_override = validAdditionalBrokers.length === 1 
                ? validAdditionalBrokers[0] 
                : validAdditionalBrokers;
        }

        return stepData;
    },

    /**
     * Filter additional brokers to remove empty values and defaults
     */
    filterAdditionalBrokers(brokers: string[]): string[] {
        return brokers
            .filter(id => id && id.trim() !== '')
            .filter(id => !DEFAULT_RETURN_BROKERS.includes(id));
    }
};

export function ResultsProcessorNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract display data using utility
    const displayData = ResultsProcessorUtils.extractDisplayData(step);

    // State for editing
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        inputBrokerId: displayData.inputBrokerId,
        additionalReturnBrokers: [...displayData.additionalReturnBrokers]
    });

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
            return;
        }

        const updatedStep = ResultsProcessorUtils.createStep(
            step,
            editValues.inputBrokerId,
            editValues.additionalReturnBrokers
        );

        console.log('🔄 ResultsProcessorNodeDisplay.handleSave - created updated step:', updatedStep);
        onUpdate(index, updatedStep);
        setIsEditing(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            inputBrokerId: displayData.inputBrokerId,
            additionalReturnBrokers: [...displayData.additionalReturnBrokers]
        });
        setIsEditing(false);
    };

    const handleAdditionalBrokerChange = (index: number, value: string) => {
        setEditValues(prev => ({
            ...prev,
            additionalReturnBrokers: prev.additionalReturnBrokers.map((id, i) => i === index ? value : id)
        }));
    };

    const addAdditionalBroker = () => {
        setEditValues(prev => ({
            ...prev,
            additionalReturnBrokers: [...prev.additionalReturnBrokers, '']
        }));
    };

    const removeAdditionalBroker = (index: number) => {
        setEditValues(prev => ({
            ...prev,
            additionalReturnBrokers: prev.additionalReturnBrokers.filter((_, i) => i !== index)
        }));
    };

    // Calculate display values using utility
    const filteredAdditionalBrokers = ResultsProcessorUtils.filterAdditionalBrokers(editValues.additionalReturnBrokers);
    const totalReturnBrokers = displayData.defaultReturnBrokers.length + filteredAdditionalBrokers.length;

    return (
        <NodeWrapper
            step={step}
            index={index}
            isExpanded={isExpanded}
            onToggle={onToggle}
            title="Recipe Results Processor"
            icon={BarChart3}
            colorTheme="amber"
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
                                required
                            />
                        ) : (
                            <ClickableBroker
                                brokerId={editValues.inputBrokerId}
                                className="text-sm font-mono bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 px-3 py-2 rounded-lg break-all block"
                            />
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                    Return Brokers ({totalReturnBrokers})
                                </span>
                            </div>
                        </div>

                        {/* Default Return Brokers (Always shown, read-only) */}
                        <div className="space-y-2 mb-4">
                            <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">
                                Default Return Brokers (Built-in)
                            </div>
                            {displayData.defaultReturnBrokers.map((brokerId, idx) => (
                                <div key={idx} className="bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-300/50 dark:border-amber-700/50">
                                    <ClickableBroker
                                        brokerId={brokerId}
                                        className="text-sm font-mono bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700 px-2 py-1 rounded break-all"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Additional Return Brokers (User-configurable) */}
                        {(editValues.additionalReturnBrokers.length > 0 || isEditing) && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                        Additional Return Brokers ({filteredAdditionalBrokers.length})
                                    </div>
                                    {isEditing && (
                                        <button
                                            onClick={addAdditionalBroker}
                                            className="text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md transition-colors"
                                        >
                                            Add Broker
                                        </button>
                                    )}
                                </div>
                                
                                {editValues.additionalReturnBrokers.map((brokerId, idx) => (
                                    <div key={idx} className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={brokerId}
                                                    onChange={(e) => handleAdditionalBrokerChange(idx, e.target.value)}
                                                    className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                                                    placeholder="Additional Return Broker ID"
                                                />
                                                <button
                                                    onClick={() => removeAdditionalBroker(idx)}
                                                    className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                {brokerId && brokerId.trim() !== '' ? (
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
                                
                                {!isEditing && filteredAdditionalBrokers.length === 0 && (
                                    <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                                        No additional return brokers configured
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </NodeWrapper>
    );
}

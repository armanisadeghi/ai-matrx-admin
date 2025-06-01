import { WorkflowStep } from "../../../types/customWorkflowTypes";
import { useState, useContext, useEffect } from "react";
import { BrokerHighlightContext } from "./WorkflowDetailContent";
import { RecipeRunnerNodeDisplay } from "./nodes/RecipeRunner";
import { ExtractorNodeDisplay } from "./nodes/Extractor";
import { IterativeRecipePreparerNodeDisplay } from "./nodes/IterativeRecipePrepare";
import { IterativeRecipeRunnerNodeDisplay } from "./nodes/IterativeRecipeRunner";
import { ResultsProcessorNodeDisplay } from "./nodes/ResultsProcessor";
import { UnifiedRegisteredNodeDisplay } from "./nodes/registered-function-node/UnifiedRegisteredNode";
import { DefaultNodeDisplay } from "./nodes/DefaultNode";



export interface WorkflowStepsSectionProps {
    steps: WorkflowStep[];
    onUpdate: (steps: WorkflowStep[]) => void;
}

// Utility function to check if a step contains a specific broker
export function stepContainsBroker(step: WorkflowStep, brokerId: string): boolean {
    if (!brokerId) return false;
    
    // Check override_data (new structure)
    if (step.override_data) {
        // Check arg_mapping in override_data
        if (step.override_data.arg_mapping) {
            const argValues = Object.values(step.override_data.arg_mapping);
            if (argValues.some(value => String(value) === brokerId)) {
                return true;
            }
        }
        
        // Check return_broker_override in override_data
        if (step.override_data.return_broker_override) {
            if (Array.isArray(step.override_data.return_broker_override)) {
                if (step.override_data.return_broker_override.includes(brokerId)) {
                    return true;
                }
            } else if (String(step.override_data.return_broker_override) === brokerId) {
                return true;
            }
        }
    }
    
    return false;
}

// Component for broker highlight badge
export function BrokerHighlightBadge() {
    return (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-full text-xs font-medium border border-yellow-300 dark:border-yellow-600">
            <span className="text-xs">🔗</span>
            <span>Contains Broker</span>
        </div>
    );
}

export function WorkflowStepsSection({ steps, onUpdate }: WorkflowStepsSectionProps) {
    const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});


    const handleStepUpdate = (index: number, updatedStep: WorkflowStep) => {
        const newSteps = [...steps];
        newSteps[index] = updatedStep;
        onUpdate(newSteps);
    };

    // Initialize all steps as collapsed
    useEffect(() => {
        const initialState: Record<number, boolean> = {};
        steps.forEach((_, index) => {
            initialState[index] = false;
        });
        setExpandedSteps(initialState);
    }, [steps.length]);

    const handleExpandAll = () => {
        const newState: Record<number, boolean> = {};
        steps.forEach((_, index) => {
            newState[index] = true;
        });
        setExpandedSteps(newState);
        setGlobalExpanded(true);
    };

    const handleCollapseAll = () => {
        const newState: Record<number, boolean> = {};
        steps.forEach((_, index) => {
            newState[index] = false;
        });
        setExpandedSteps(newState);
        setGlobalExpanded(false);
    };

    const handleStepToggle = (index: number) => {
        setExpandedSteps(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
        setGlobalExpanded(null); // Reset global state when individual steps are toggled
    };

    if (steps.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="font-medium">No workflow steps defined</p>
                    <p className="text-sm">This workflow doesn't contain any steps yet.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Workflow Steps ({steps.length})
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExpandAll}
                            className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md border border-blue-200 dark:border-blue-700 transition-colors duration-200"
                        >
                            📖 Expand All
                        </button>
                        <button
                            onClick={handleCollapseAll}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-600 transition-colors duration-200"
                        >
                            📋 Collapse All
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <WorkflowStepCard 
                            key={index} 
                            step={step} 
                            index={index}
                            isExpanded={expandedSteps[index] || false}
                            onToggle={() => handleStepToggle(index)}
                            onUpdate={handleStepUpdate}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

export interface WorkflowStepCardProps {
    step: WorkflowStep;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate?: (index: number, updatedStep: WorkflowStep) => void;
}

export function WorkflowStepCard({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Check if this is a workflow recipe executor
    if (step.function_type === 'workflow_recipe_executor') {
        if (step.function_id === 'recipe_runner') {
            return <RecipeRunnerNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
        }
        
        if (step.function_id === 'extractor') {
            return <ExtractorNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
        }
        
        if (step.function_id === 'iterative_recipe_preparer') {
            return <IterativeRecipePreparerNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
        }
        
        if (step.function_id === 'iterative_recipe_runner') {
            return <IterativeRecipeRunnerNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
        }
        
        if (step.function_id === 'results_processor') {
            return <ResultsProcessorNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
        }
    }
    
    // Check if this is a registered function
    if (step.function_type === 'registered_function') {
        return <UnifiedRegisteredNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
    }
    
    // Default card for other step types
    return <DefaultNodeDisplay step={step} index={index} isExpanded={isExpanded} onToggle={onToggle} onUpdate={onUpdate} />;
}


// Clickable broker component that handles highlighting
export function ClickableBroker({ brokerId, className = "" }: { brokerId: string; className?: string }) {
    const { highlightedBroker, setHighlightedBroker } = useContext(BrokerHighlightContext);
    const isHighlighted = highlightedBroker === brokerId;
    
    return (
        <span
            className={`cursor-pointer transition-all duration-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 px-1 rounded ${
                isHighlighted ? 'bg-yellow-300 dark:bg-yellow-600 ring-2 ring-yellow-400 dark:ring-yellow-500' : ''
            } ${className}`}
            onClick={() => setHighlightedBroker(isHighlighted ? null : brokerId)}
            title={`Click to highlight all occurrences of broker: ${brokerId}`}
        >
            {brokerId}
        </span>
    );
}

// Unified broker display component
export function BrokerDisplay({ label, brokerId }: { label: string; brokerId: string | string[] }) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const formattedBrokerId = Array.isArray(brokerId) ? brokerId.join(', ') : brokerId || 'None';
    const brokerIds = Array.isArray(brokerId) ? brokerId : [brokerId].filter(Boolean);
    const isAnyHighlighted = brokerIds.some(id => highlightedBroker === id);
    
    return (
        <div className={`flex items-center justify-between py-2 border-b border-green-200 dark:border-green-700/50 ${
            isAnyHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''
        }`}>
            <span className="text-sm font-semibold text-green-800 dark:text-green-200">{label}:</span>
            <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 dark:text-green-400">🔗</span>
                {brokerIds.length > 0 && brokerIds[0] !== 'None' ? (
                    <div className="flex flex-wrap gap-1">
                        {brokerIds.map((id, index) => (
                            <ClickableBroker
                                key={index}
                                brokerId={id}
                                className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-200 dark:border-green-600"
                            />
                        ))}
                    </div>
                ) : (
                    <span className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-200 dark:border-green-600">
                        None
                    </span>
                )}
            </div>
        </div>
    );
}






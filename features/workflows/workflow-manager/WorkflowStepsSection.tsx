import { WorkflowStep } from "@/types/customWorkflowTypes";
import { useState, useContext, useEffect } from "react";
import { 
    Plus, 
    Layers, 
    ChevronDown, 
    ChevronUp, 
    Eye, 
    EyeOff, 
    Hash,
    Zap,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { RecipeRunnerNodeDisplay } from "./nodes/RecipeRunner";
import { ExtractorNodeDisplay } from "./nodes/Extractor";
import { IterativeRecipePreparerNodeDisplay } from "./nodes/IterativeRecipePrepare";
import { IterativeRecipeRunnerNodeDisplay } from "./nodes/IterativeRecipeRunner";
import { ResultsProcessorNodeDisplay } from "./nodes/ResultsProcessor";
import { UnifiedRegisteredNodeDisplay } from "./nodes/registered-function-node/UnifiedRegisteredNode";
import { DefaultNodeDisplay } from "./nodes/DefaultNode";
import WorkflowStepCreatorOverlay from "./nodes/registered-function-node/creator-overlay/WorkflowStepCreatorOverlay";

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
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100/80 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-lg text-xs font-medium border border-yellow-200 dark:border-yellow-700">
            <Zap className="w-3 h-3" />
            <span>Contains Broker</span>
        </div>
    );
}

export function WorkflowStepsSection({ steps, onUpdate }: WorkflowStepsSectionProps) {
    const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
    
    // State for creating new steps
    const [isCreateOverlayOpen, setIsCreateOverlayOpen] = useState(false);

    const handleStepUpdate = (index: number, updatedStep: WorkflowStep) => {
        console.log("🔄 WorkflowStepsSection.handleStepUpdate called:", {
            stepIndex: index,
            updatedStep,
            totalSteps: steps.length,
            hasOnUpdate: !!onUpdate
        });
        
        const newSteps = [...steps];
        newSteps[index] = updatedStep;
        
        console.log("🔄 WorkflowStepsSection.handleStepUpdate - calling parent onUpdate with new steps:", newSteps);
        onUpdate(newSteps);
    };

    // Handler for creating new steps
    const handleCreateNewStep = (newStep: WorkflowStep) => {
        const newSteps = [...steps, newStep];
        onUpdate(newSteps);
        setIsCreateOverlayOpen(false);
        console.log('Created new step:', newStep);
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
            <>
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-sm">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 rounded-xl flex items-center justify-center shadow-lg mx-auto">
                                <Layers className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Workflow Steps</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                This workflow doesn't contain any steps yet. Create your first step to get started.
                            </p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsCreateOverlayOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                            >
                                <Plus className="w-4 h-4" />
                                Create First Step
                            </button>
                        </div>
                    </div>
                </div>

                {/* Create New Step Overlay */}
                <WorkflowStepCreatorOverlay
                    isOpen={isCreateOverlayOpen}
                    onClose={() => setIsCreateOverlayOpen(false)}
                    onStepCreated={handleCreateNewStep}
                    mode="create"
                />
            </>
        );
    }

    return (
        <>
            {/* Compact Header */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                                <Layers className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Workflow Steps
                                </h2>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    <Hash className="w-3 h-3" />
                                    {steps.length}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsCreateOverlayOpen(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-md transition-all duration-200 hover:scale-105 shadow-sm"
                            >
                                <Plus className="w-3 h-3" />
                                New Step
                            </button>
                            <button
                                type="button"
                                onClick={handleExpandAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors border border-blue-200 dark:border-blue-700"
                            >
                                <Eye className="w-3 h-3" />
                                Expand
                            </button>
                            <button
                                type="button"
                                onClick={handleCollapseAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors border border-slate-200 dark:border-slate-600"
                            >
                                <EyeOff className="w-3 h-3" />
                                Collapse
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps List - Optimized for space */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30">
                <div className="p-4 space-y-3">
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

            {/* Create New Step Overlay */}
            <WorkflowStepCreatorOverlay
                isOpen={isCreateOverlayOpen}
                onClose={() => setIsCreateOverlayOpen(false)}
                onStepCreated={handleCreateNewStep}
                mode="create"
            />
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




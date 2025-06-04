import { useState } from "react";
import { ChefHat, Hash, Tag, Cpu, Wrench, ArrowRight, ToggleLeft, ToggleRight } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";
import { WorkflowStep, ArgOverride } from "@/types/customWorkflowTypes";

/**
 * RecipeRunner utilities - all business logic lives here
 */
const RecipeRunnerUtils = {
    /**
     * Validate and extract display data from a RecipeRunner step
     */
    extractDisplayData(step: WorkflowStep) {
        if (step.function_id !== "recipe_runner") {
            throw new Error(`Expected function_id 'recipe_runner', got '${step.function_id}'`);
        }

        const overrideData = step.override_data;
        const argOverrides = overrideData?.arg_overrides || [];
        
        // Find required and optional arg overrides
        const recipeIdOverride = argOverrides.find(override => override.name === 'recipe_id');
        const versionOverride = argOverrides.find(override => override.name === 'version');
        const modelOverride = argOverrides.find(override => override.name === 'model_override');
        const toolsOverride = argOverrides.find(override => override.name === 'tools_override');

        // Extract values with defaults
        const recipeId = recipeIdOverride?.value || '';
        const version = versionOverride?.value || 'latest';
        const modelOverrideValue = modelOverride?.value || '';
        const toolsOverrideValue = toolsOverride?.value || [];

        // Handle return broker override
        const returnBrokerOverride = overrideData?.return_broker_override;
        const returnBrokers = Array.isArray(returnBrokerOverride) 
            ? returnBrokerOverride 
            : returnBrokerOverride ? [returnBrokerOverride] : [];

        // Additional dependencies are the input mappings
        const additionalDependencies = step.additional_dependencies || [];

        return {
            recipeId,
            version,
            isLatestVersion: version === 'latest',
            modelOverride: modelOverrideValue,
            toolsOverride: toolsOverrideValue,
            returnBrokers,
            additionalDependencies
        };
    },

    /**
     * Create a properly structured RecipeRunner step for saving
     */
    createStep(
        baseStep: WorkflowStep, 
        recipeId: string, 
        version: string | number,
        modelOverride: string,
        toolsOverride: string[],
        returnBrokers: string[],
        additionalDependencies: string[]
    ): WorkflowStep {
        // Validation
        if (!recipeId || recipeId.trim() === '') {
            throw new Error('Recipe ID is required for RecipeRunner');
        }

        if (!returnBrokers || returnBrokers.length === 0 || returnBrokers.every(id => !id || id.trim() === '')) {
            throw new Error('At least one return broker is required for RecipeRunner');
        }

        // Clean return brokers
        const validReturnBrokers = returnBrokers.filter(id => id && id.trim() !== '');
        
        // Clean additional dependencies
        const validAdditionalDeps = additionalDependencies.filter(id => id && id.trim() !== '');

        // Build arg overrides
        const argOverrides: ArgOverride[] = [
            {
                name: 'recipe_id',
                value: recipeId.trim(),
                ready: true,
                default_value: recipeId.trim()
            },
            {
                name: 'version',
                value: version,
                ready: true,
                default_value: version
            }
        ];

        // Add optional overrides if provided
        if (modelOverride && modelOverride.trim() !== '') {
            argOverrides.push({
                name: 'model_override',
                value: modelOverride.trim(),
                ready: true,
                default_value: modelOverride.trim()
            });
        }

        if (toolsOverride && toolsOverride.length > 0) {
            const validTools = toolsOverride.filter(tool => tool && tool.trim() !== '');
            if (validTools.length > 0) {
                argOverrides.push({
                    name: 'tools_override',
                    value: validTools,
                    ready: true,
                    default_value: validTools
                });
            }
        }

        const stepData: WorkflowStep = {
            function_type: "workflow_recipe_executor",
            function_id: "recipe_runner",
            step_name: baseStep.step_name,
            status: baseStep.status || "pending",
            execution_required: baseStep.execution_required ?? true,
            override_data: {
                arg_overrides: argOverrides,
                return_broker_override: validReturnBrokers.length === 1 
                    ? validReturnBrokers[0] 
                    : validReturnBrokers
            },
            additional_dependencies: validAdditionalDeps,
            broker_relays: baseStep.broker_relays || {
                simple_relays: [],
                bidirectional_relays: [],
                relay_chains: []
            }
        };

        return stepData;
    },

    /**
     * Format tools override for display
     */
    formatToolsOverride(tools: any): string {
        if (!tools || tools === 'None') return 'None';
        if (Array.isArray(tools)) return tools.join(', ');
        return String(tools);
    },

    /**
     * Parse tools override from string input
     */
    parseToolsOverride(toolsString: string): string[] {
        if (!toolsString || toolsString.trim() === '' || toolsString === 'None') {
            return [];
        }
        return toolsString.split(',').map(s => s.trim()).filter(s => s);
    },

    /**
     * Validate save requirements
     */
    canSave(recipeId: string, returnBrokers: string[]): { canSave: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!recipeId || recipeId.trim() === '') {
            errors.push('Recipe ID is required');
        }

        const validReturnBrokers = returnBrokers.filter(id => id && id.trim() !== '');
        if (validReturnBrokers.length === 0) {
            errors.push('At least one return broker is required');
        }

        return {
            canSave: errors.length === 0,
            errors
        };
    }
};

// Specialized card for recipe_runner function type
export function RecipeRunnerNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract display data using utility
    const displayData = RecipeRunnerUtils.extractDisplayData(step);

    // State for editing
    const [isEditing, setIsEditing] = useState(false);
    
    // Edit state
    const [editValues, setEditValues] = useState({
        recipeId: displayData.recipeId,
        version: displayData.version,
        isLatestVersion: displayData.isLatestVersion,
        modelOverride: displayData.modelOverride,
        toolsOverride: RecipeRunnerUtils.formatToolsOverride(displayData.toolsOverride),
        returnBrokers: [...displayData.returnBrokers],
        additionalDependencies: [...displayData.additionalDependencies]
    });

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
            return;
        }

        // Parse tools override
        const parsedTools = RecipeRunnerUtils.parseToolsOverride(editValues.toolsOverride);

        // Validate before saving
        const validation = RecipeRunnerUtils.canSave(editValues.recipeId, editValues.returnBrokers);
        if (!validation.canSave) {
            alert(`Cannot save: ${validation.errors.join(', ')}`);
            return;
        }

        try {
            const updatedStep = RecipeRunnerUtils.createStep(
                step,
                editValues.recipeId,
                editValues.isLatestVersion ? 'latest' : editValues.version,
                editValues.modelOverride,
                parsedTools,
                editValues.returnBrokers,
                editValues.additionalDependencies
            );

            console.log('🔄 RecipeRunnerNodeDisplay.handleSave - created updated step:', updatedStep);
            onUpdate(index, updatedStep);
            setIsEditing(false);
        } catch (error) {
            alert(`Error saving step: ${error.message}`);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            recipeId: displayData.recipeId,
            version: displayData.version,
            isLatestVersion: displayData.isLatestVersion,
            modelOverride: displayData.modelOverride,
            toolsOverride: RecipeRunnerUtils.formatToolsOverride(displayData.toolsOverride),
            returnBrokers: [...displayData.returnBrokers],
            additionalDependencies: [...displayData.additionalDependencies]
        });
        setIsEditing(false);
    };

    // Return broker management
    const addReturnBroker = () => {
        setEditValues(prev => ({
            ...prev,
            returnBrokers: [...prev.returnBrokers, '']
        }));
    };

    const updateReturnBroker = (index: number, value: string) => {
        setEditValues(prev => ({
            ...prev,
            returnBrokers: prev.returnBrokers.map((broker, i) => i === index ? value : broker)
        }));
    };

    const removeReturnBroker = (index: number) => {
        setEditValues(prev => ({
            ...prev,
            returnBrokers: prev.returnBrokers.filter((_, i) => i !== index)
        }));
    };

    // Additional dependencies management
    const addAdditionalDependency = () => {
        setEditValues(prev => ({
            ...prev,
            additionalDependencies: [...prev.additionalDependencies, '']
        }));
    };

    const updateAdditionalDependency = (index: number, value: string) => {
        setEditValues(prev => ({
            ...prev,
            additionalDependencies: prev.additionalDependencies.map((dep, i) => i === index ? value : dep)
        }));
    };

    const removeAdditionalDependency = (index: number) => {
        setEditValues(prev => ({
            ...prev,
            additionalDependencies: prev.additionalDependencies.filter((_, i) => i !== index)
        }));
    };

    // Version handling
    const handleVersionToggle = (useLatest: boolean) => {
        setEditValues(prev => ({
            ...prev,
            isLatestVersion: useLatest,
            version: useLatest ? 'latest' : '1'
        }));
    };

    // Calculate validation for UI feedback
    const validation = RecipeRunnerUtils.canSave(editValues.recipeId, editValues.returnBrokers);

    return (
        <NodeWrapper
            step={step}
            index={index}
            isExpanded={isExpanded}
            onToggle={onToggle}
            title="Run Recipe"
            icon={ChefHat}
            colorTheme="blue"
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={isEditing}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-4">
                    {/* Recipe ID - Required */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Recipe ID
                                <span className="text-red-500 ml-1">*</span>
                            </span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.recipeId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, recipeId: e.target.value }))}
                                className={`w-full text-sm font-mono bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                    !editValues.recipeId.trim() ? 'border-red-300 dark:border-red-700' : 'border-blue-200 dark:border-blue-700'
                                }`}
                                placeholder="Recipe ID (required)"
                                required
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg break-all">
                                {editValues.recipeId || 'Not set'}
                            </div>
                        )}
                    </div>

                    {/* Version */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Version</span>
                        </div>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleVersionToggle(!editValues.isLatestVersion)}
                                        className="flex items-center gap-2"
                                    >
                                        {editValues.isLatestVersion ? (
                                            <ToggleRight className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                                        )}
                                        <span className="text-sm text-blue-900 dark:text-blue-100">
                                            Use Latest Version
                                        </span>
                                    </button>
                                </div>
                                {!editValues.isLatestVersion && (
                                    <input
                                        type="number"
                                        min="1"
                                        value={editValues.version === 'latest' ? '1' : editValues.version}
                                        onChange={(e) => setEditValues(prev => ({ ...prev, version: e.target.value }))}
                                        className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        placeholder="Version number"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {editValues.version}
                            </div>
                        )}
                    </div>

                    {/* Input Dependencies (Additional Dependencies) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Input Dependencies ({editValues.additionalDependencies.filter(dep => dep && dep.trim() !== '').length})
                                </span>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={addAdditionalDependency}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                                >
                                    Add Dependency
                                </button>
                            )}
                        </div>
                        
                        {editValues.additionalDependencies.length > 0 ? (
                            <div className="space-y-2">
                                {editValues.additionalDependencies.map((dep, idx) => (
                                    <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={dep}
                                                    onChange={(e) => updateAdditionalDependency(idx, e.target.value)}
                                                    className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    placeholder="Broker ID"
                                                />
                                                <button
                                                    onClick={() => removeAdditionalDependency(idx)}
                                                    className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                {dep && dep.trim() !== '' ? (
                                                    <ClickableBroker
                                                        brokerId={dep}
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
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                                No input dependencies configured
                            </div>
                        )}
                    </div>

                    {/* Model Override - Optional */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Model Override</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.modelOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, modelOverride: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Model Override UUID (optional)"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {editValues.modelOverride || 'None'}
                            </div>
                        )}
                    </div>

                    {/* Tools Override - Optional */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Tools Override</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.toolsOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, toolsOverride: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Tool names (comma-separated, optional)"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {editValues.toolsOverride || 'None'}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers - Required */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 rotate-180" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Return Brokers ({editValues.returnBrokers.filter(broker => broker && broker.trim() !== '').length})
                                    <span className="text-red-500 ml-1">*</span>
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
                        
                        {editValues.returnBrokers.length > 0 ? (
                            <div className="space-y-2">
                                {editValues.returnBrokers.map((broker, idx) => (
                                    <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={broker}
                                                    onChange={(e) => updateReturnBroker(idx, e.target.value)}
                                                    className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    placeholder="Return Broker ID"
                                                />
                                                <button
                                                    onClick={() => removeReturnBroker(idx)}
                                                    className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                {broker && broker.trim() !== '' ? (
                                                    <ClickableBroker
                                                        brokerId={broker}
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
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                                No return brokers configured
                                {isEditing && <span className="block text-red-500 text-xs mt-1">At least one is required</span>}
                            </div>
                        )}
                    </div>

                    {/* Validation Errors */}
                    {isEditing && !validation.canSave && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
                            <div className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                                Cannot save step:
                            </div>
                            <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                                {validation.errors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </NodeWrapper>
    );
}

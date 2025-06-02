import { useState } from "react";
import { ChefHat, Hash, Tag, Cpu, Wrench, ArrowRight } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";

// Specialized card for recipe_runner function type
export function RecipeRunnerNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract data from overrides
    const overrideData = step.override_data;
    const recipeId = overrideData?.arg_overrides?.find(override => override.name === 'recipe_id')?.value || 'None';
    const version = overrideData?.arg_overrides?.find(override => override.name === 'version')?.value || 'Latest';
    const modelOverride = overrideData?.arg_overrides?.find(override => override.name === 'model_override')?.value || 'None';
    const toolsOverride = overrideData?.arg_overrides?.find(override => override.name === 'tools_override')?.value || 'None';
    const returnBrokerId = Array.isArray(overrideData?.return_broker_override) 
        ? overrideData?.return_broker_override[0] || 'None'
        : overrideData?.return_broker_override || 'None';
    
    // Edit state
    const [editValues, setEditValues] = useState({
        recipeId: recipeId,
        version: version,
        modelOverride: modelOverride,
        toolsOverride: Array.isArray(toolsOverride) ? toolsOverride.join(', ') : toolsOverride,
        returnBrokerId: returnBrokerId,
        argMappings: overrideData?.arg_mapping ? { ...overrideData.arg_mapping } : {}
    });

    // Format tools override
    const formatToolsOverride = (tools: any) => {
        if (tools === 'None' || !tools) return 'None';
        if (Array.isArray(tools)) return tools.join(', ');
        return String(tools);
    };

    // Get arg mapping entries
    const argMappingEntries = Object.entries(editValues.argMappings);

    const handleSave = () => {
        if (!onUpdate) {
            console.log('No onUpdate handler provided');
            return;
        }

        // Create updated step with new values
        const updatedStep = { ...step };
        
        // Update arg_overrides
        if (!overrideData?.arg_overrides) {
            overrideData.arg_overrides = [];
        }

        // Helper function to update or add arg override
        const updateArgOverride = (name: string, value: any) => {
            const existingIndex = overrideData.arg_overrides!.findIndex(override => override.name === name);
            if (existingIndex >= 0) {
                overrideData.arg_overrides![existingIndex].value = value;
            } else {
                overrideData.arg_overrides!.push({
                    name,
                    value,
                    ready: true,
                    default_value: value
                });
            }
        };

        // Update values
        updateArgOverride('recipe_id', editValues.recipeId);
        updateArgOverride('version', editValues.version);
        updateArgOverride('model_override', editValues.modelOverride);
        
        // Handle tools override (convert back to array if needed)
        const toolsValue = editValues.toolsOverride.includes(',') 
            ? editValues.toolsOverride.split(',').map(s => s.trim()).filter(s => s)
            : editValues.toolsOverride === 'None' ? 'None' : editValues.toolsOverride;
        updateArgOverride('tools_override', toolsValue);

        // Update arg mappings
        overrideData.arg_mapping = { ...editValues.argMappings };

        // Update return broker
        if (editValues.returnBrokerId !== 'None') {
            overrideData.return_broker_override = editValues.returnBrokerId;
        } else {
            delete overrideData.return_broker_override;
        }

        onUpdate(index, updatedStep);
        console.log('Saving recipe runner changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            recipeId: recipeId,
            version: version,
            modelOverride: modelOverride,
            toolsOverride: Array.isArray(toolsOverride) ? toolsOverride.join(', ') : toolsOverride,
            returnBrokerId: returnBrokerId,
            argMappings: overrideData?.arg_mapping ? { ...overrideData.arg_mapping } : {}
        });
    };

    const handleArgMappingChange = (paramName: string, brokerId: string) => {
        setEditValues(prev => ({
            ...prev,
            argMappings: {
                ...prev.argMappings,
                [paramName]: brokerId
            }
        }));
    };

    const addArgMapping = () => {
        const newParamName = `param_${Object.keys(editValues.argMappings).length + 1}`;
        handleArgMappingChange(newParamName, '');
    };

    const removeArgMapping = (paramName: string) => {
        setEditValues(prev => {
            const newMappings = { ...prev.argMappings };
            delete newMappings[paramName];
            return {
                ...prev,
                argMappings: newMappings
            };
        });
    };

    return (
        <NodeWrapper
            step={step}
            index={index}
            isExpanded={isExpanded}
            onToggle={onToggle}
            title="Run Recipe"
            icon={ChefHat}
            colorTheme="blue"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false} // We'll handle it manually with editing capability
        >
            {({ isEditing }) => (
                <div className="space-y-4">
                    {/* Recipe ID */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Recipe ID</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.recipeId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, recipeId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Recipe ID"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg break-all">
                                {editValues.recipeId}
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
                            <input
                                type="text"
                                value={editValues.version}
                                onChange={(e) => setEditValues(prev => ({ ...prev, version: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Version"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {editValues.version}
                            </div>
                        )}
                    </div>

                    {/* Input Broker Mappings */}
                    {argMappingEntries.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        Input Mappings ({argMappingEntries.length})
                                    </span>
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={addArgMapping}
                                        className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                                    >
                                        Add Mapping
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {argMappingEntries.map(([paramName, brokerId], idx) => (
                                    <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={paramName}
                                                        onChange={(e) => {
                                                            const newParamName = e.target.value;
                                                            const currentBrokerId = editValues.argMappings[paramName];
                                                            removeArgMapping(paramName);
                                                            handleArgMappingChange(newParamName, currentBrokerId);
                                                        }}
                                                        className="flex-1 text-xs font-medium bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Parameter name"
                                                    />
                                                    <button
                                                        onClick={() => removeArgMapping(paramName)}
                                                        className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={String(brokerId)}
                                                    onChange={(e) => handleArgMappingChange(paramName, e.target.value)}
                                                    className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Broker ID"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    {paramName}
                                                </span>
                                                <ClickableBroker 
                                                    brokerId={String(brokerId)} 
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isEditing && argMappingEntries.length === 0 && (
                                    <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                                        No input broker mappings configured
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Model Override */}
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
                                placeholder="Model Override"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {editValues.modelOverride}
                            </div>
                        )}
                    </div>

                    {/* Tools Override */}
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
                                placeholder="Tools Override (comma-separated)"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                {formatToolsOverride(editValues.toolsOverride)}
                            </div>
                        )}
                    </div>

                    {/* Return Broker */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 rotate-180" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Return Broker</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.returnBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, returnBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="Return Broker ID"
                            />
                        ) : (
                            <div>
                                {editValues.returnBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.returnBrokerId}
                                        className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg break-all block"
                                    />
                                ) : (
                                    <div className="text-sm font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg">
                                        None
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

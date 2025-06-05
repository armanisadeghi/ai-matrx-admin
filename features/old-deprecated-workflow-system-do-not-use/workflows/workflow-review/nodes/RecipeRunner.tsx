import { useState } from "react";
import { ChefHat } from "lucide-react";
import { BrokerDisplay, ClickableBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
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
                <div className="space-y-3">
                    {/* Recipe ID */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Recipe ID:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.recipeId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, recipeId: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Recipe ID"
                            />
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border break-all">
                                {editValues.recipeId}
                            </div>
                        )}
                    </div>

                    {/* Version */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Version:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.version}
                                onChange={(e) => setEditValues(prev => ({ ...prev, version: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Version"
                            />
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                {editValues.version}
                            </div>
                        )}
                    </div>

                    {/* Input Broker Mappings - Now Editable */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                Input Broker Mappings ({argMappingEntries.length}):
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addArgMapping}
                                    className="px-2 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    Add Mapping
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {argMappingEntries.map(([paramName, brokerId], idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-600">
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
                                                    className="flex-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    placeholder="Parameter name"
                                                />
                                                <button
                                                    onClick={() => removeArgMapping(paramName)}
                                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={String(brokerId)}
                                                onChange={(e) => handleArgMappingChange(paramName, e.target.value)}
                                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Broker ID"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                {paramName}:
                                            </span>
                                            <ClickableBroker 
                                                brokerId={String(brokerId)} 
                                                className="font-mono text-sm text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-200 dark:border-blue-600" 
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {argMappingEntries.length === 0 && (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                    No input broker mappings configured
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Model Override */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Model Override:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.modelOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, modelOverride: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Model Override"
                            />
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                {editValues.modelOverride}
                            </div>
                        )}
                    </div>

                    {/* Tools Override */}
                    <div className="py-2 border-b border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Tools Override:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.toolsOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, toolsOverride: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Tools Override (comma-separated)"
                            />
                        ) : (
                            <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                {formatToolsOverride(editValues.toolsOverride)}
                            </div>
                        )}
                    </div>

                    {/* Return Broker - Now Editable */}
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Return Broker:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.returnBrokerId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, returnBrokerId: e.target.value }))}
                                className="w-full text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-300 dark:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Return Broker ID"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-600 dark:text-blue-400">🔗</span>
                                {editValues.returnBrokerId !== 'None' ? (
                                    <ClickableBroker
                                        brokerId={editValues.returnBrokerId}
                                        className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-200 dark:border-blue-600 break-all"
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 px-3 py-2 rounded border">
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

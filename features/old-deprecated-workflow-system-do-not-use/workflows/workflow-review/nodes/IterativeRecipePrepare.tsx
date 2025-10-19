import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ClickableBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { NodeWrapper } from "./NodeWrapper";

// Specialized card for iterative recipe preparer function type
export function IterativeRecipePreparerNodeDisplay({ step, index, isExpanded, onToggle, onUpdate }: WorkflowStepCardProps) {
    // Extract data from overrides
    const recipeId = step.override_data?.arg_overrides?.find(override => override.name === 'recipe_id')?.value || 'None';
    const version = step.override_data?.arg_overrides?.find(override => override.name === 'version')?.value || 'Latest';
    const modelOverride = step.override_data?.arg_overrides?.find(override => override.name === 'model_override')?.value || 'None';
    const toolsOverride = step.override_data?.arg_overrides?.find(override => override.name === 'tools_override')?.value || 'None';
    const maxCount = step.override_data?.arg_overrides?.find(override => override.name === 'max_count')?.value || 'Unlimited';
    
    // Extract arg_mapping data
    const argMapping = step.override_data?.arg_mapping || {};
    
    // Handle both string and array return brokers
    const originalReturnBroker = step.override_data?.return_broker_override;
    const returnBrokerArray = Array.isArray(originalReturnBroker) 
        ? originalReturnBroker 
        : originalReturnBroker ? [originalReturnBroker] : [];
    
    // Edit state
    const [editValues, setEditValues] = useState({
        recipeId: recipeId,
        version: version,
        modelOverride: modelOverride,
        toolsOverride: Array.isArray(toolsOverride) ? toolsOverride.join(', ') : toolsOverride,
        maxCount: maxCount,
        argMappings: { ...argMapping },
        returnBrokerIds: returnBrokerArray.length > 0 ? [...returnBrokerArray] : ['']
    });

    // Format tools override
    const formatToolsOverride = (tools: any) => {
        if (tools === 'None' || !tools) return 'None';
        if (Array.isArray(tools)) return tools.join(', ');
        return String(tools);
    };

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

        // Update arg_overrides
        if (!updatedStep.override_data.arg_overrides) {
            updatedStep.override_data.arg_overrides = [];
        }

        // Helper function to update or add arg override
        const updateArgOverride = (name: string, value: any) => {
            const existingIndex = updatedStep.override_data!.arg_overrides!.findIndex(override => override.name === name);
            if (existingIndex >= 0) {
                updatedStep.override_data!.arg_overrides![existingIndex].value = value;
            } else {
                updatedStep.override_data!.arg_overrides!.push({
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
        updateArgOverride('max_count', editValues.maxCount);
        
        // Handle tools override (convert back to array if needed)
        const toolsValue = editValues.toolsOverride.includes(',') 
            ? editValues.toolsOverride.split(',').map(s => s.trim()).filter(s => s)
            : editValues.toolsOverride === 'None' ? 'None' : editValues.toolsOverride;
        updateArgOverride('tools_override', toolsValue);

        // Update arg mappings
        updatedStep.override_data.arg_mapping = { ...editValues.argMappings };

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
        console.log('Saving iterative recipe preparer changes:', editValues);
    };

    const handleCancel = () => {
        // Reset edit values to original
        setEditValues({
            recipeId: recipeId,
            version: version,
            modelOverride: modelOverride,
            toolsOverride: Array.isArray(toolsOverride) ? toolsOverride.join(', ') : toolsOverride,
            maxCount: maxCount,
            argMappings: { ...argMapping },
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
            title="Iterative Recipe"
            icon={RotateCcw}
            colorTheme="purple"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-3">
                    {/* Recipe ID */}
                    <div className="py-2 border-b border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Recipe ID:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.recipeId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, recipeId: e.target.value }))}
                                className="w-full text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Recipe ID"
                            />
                        ) : (
                            <div className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border break-all">
                                {editValues.recipeId}
                            </div>
                        )}
                    </div>

                    {/* Version */}
                    <div className="py-2 border-b border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Version:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.version}
                                onChange={(e) => setEditValues(prev => ({ ...prev, version: e.target.value }))}
                                className="w-full text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Version"
                            />
                        ) : (
                            <div className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border">
                                {editValues.version}
                            </div>
                        )}
                    </div>

                    {/* Max Count */}
                    <div className="py-2 border-b border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Max Count:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.maxCount}
                                onChange={(e) => setEditValues(prev => ({ ...prev, maxCount: e.target.value }))}
                                className="w-full text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Max Count"
                            />
                        ) : (
                            <div className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border">
                                {editValues.maxCount}
                            </div>
                        )}
                    </div>

                    {/* Model Override */}
                    <div className="py-2 border-b border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Model Override:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.modelOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, modelOverride: e.target.value }))}
                                className="w-full text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Model Override"
                            />
                        ) : (
                            <div className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border">
                                {editValues.modelOverride}
                            </div>
                        )}
                    </div>

                    {/* Tools Override */}
                    <div className="py-2 border-b border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Tools Override:</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.toolsOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, toolsOverride: e.target.value }))}
                                className="w-full text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Tools Override (comma-separated)"
                            />
                        ) : (
                            <div className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border">
                                {formatToolsOverride(editValues.toolsOverride)}
                            </div>
                        )}
                    </div>

                    {/* Argument Mapping - Input Brokers */}
                    <div className="py-2 border-b border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                Input Brokers ({Object.keys(editValues.argMappings).length})
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addArgMapping}
                                    className="px-2 py-1 text-xs bg-purple-500 dark:bg-purple-600 text-white rounded hover:bg-purple-600 dark:hover:bg-purple-700"
                                >
                                    Add Mapping
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {Object.entries(editValues.argMappings).map(([argName, brokerId]) => (
                                <div key={argName} className="bg-textured rounded-lg p-3 border border-purple-200 dark:border-purple-600">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={argName}
                                                    onChange={(e) => {
                                                        const newArgName = e.target.value;
                                                        const currentBrokerId = editValues.argMappings[argName];
                                                        removeArgMapping(argName);
                                                        handleArgMappingChange(newArgName, currentBrokerId);
                                                    }}
                                                    className="flex-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900 px-2 py-1 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                    placeholder="Argument name"
                                                />
                                                <button
                                                    onClick={() => removeArgMapping(argName)}
                                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={String(brokerId || '')}
                                                onChange={(e) => handleArgMappingChange(argName, e.target.value)}
                                                className="w-full text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-2 py-1 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                placeholder="Broker ID"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-sm font-medium text-purple-900 dark:text-purple-100">
                                                {argName}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-purple-600 dark:text-purple-400">🔗</span>
                                                <ClickableBroker
                                                    brokerId={String(brokerId || 'Unknown')}
                                                    className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-purple-50 dark:bg-purple-900 px-2 py-1 rounded border border-purple-200 dark:border-purple-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {Object.keys(editValues.argMappings).length === 0 && (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                    No input broker mappings configured
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Return Brokers */}
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                Return Broker{editValues.returnBrokerIds.length > 1 ? 's' : ''} ({editValues.returnBrokerIds.filter(id => id && id !== 'None').length}):
                            </span>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="px-2 py-1 text-xs bg-purple-500 dark:bg-purple-600 text-white rounded hover:bg-purple-600 dark:hover:bg-purple-700"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-purple-600 dark:text-purple-400">🔗</span>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                                    className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border border-purple-200 dark:border-purple-600 break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-textured px-3 py-2 rounded border">
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

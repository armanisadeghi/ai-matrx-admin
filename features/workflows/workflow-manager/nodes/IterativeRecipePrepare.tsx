import { useState } from "react";
import { RotateCcw, Hash, Tag, Cpu, Wrench, Calculator, ArrowRight, ArrowLeft } from "lucide-react";
import { ClickableBroker } from "../brokers/ClickableBroker";
import { WorkflowStepCardProps } from "../WorkflowStepsSection";
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

    const argMappingEntries = Object.entries(editValues.argMappings);
    const validReturnBrokers = editValues.returnBrokerIds.filter(id => id && id !== 'None');

    return (
        <NodeWrapper
            step={step}
            index={index}
            isExpanded={isExpanded}
            onToggle={onToggle}
            title="Prepare Iterative Recipe"
            icon={RotateCcw}
            colorTheme="purple"
            onSave={handleSave}
            onCancel={handleCancel}
            showReturnBroker={false}
        >
            {({ isEditing }) => (
                <div className="space-y-4">
                    {/* Recipe ID */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Recipe ID</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.recipeId}
                                onChange={(e) => setEditValues(prev => ({ ...prev, recipeId: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                placeholder="Recipe ID"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 px-3 py-2 rounded-lg break-all">
                                {editValues.recipeId}
                            </div>
                        )}
                    </div>

                    {/* Version */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Version</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.version}
                                onChange={(e) => setEditValues(prev => ({ ...prev, version: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                placeholder="Version"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 px-3 py-2 rounded-lg">
                                {editValues.version}
                            </div>
                        )}
                    </div>

                    {/* Max Count */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Max Count</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.maxCount}
                                onChange={(e) => setEditValues(prev => ({ ...prev, maxCount: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                placeholder="Max Count"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 px-3 py-2 rounded-lg">
                                {editValues.maxCount}
                            </div>
                        )}
                    </div>

                    {/* Input Broker Mappings */}
                    {argMappingEntries.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                        Input Mappings ({argMappingEntries.length})
                                    </span>
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={addArgMapping}
                                        className="text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-900/70 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md transition-colors"
                                    >
                                        Add Mapping
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {argMappingEntries.map(([paramName, brokerId], idx) => (
                                    <div key={idx} className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-3">
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
                                                        className="flex-1 text-xs font-medium bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
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
                                                    className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                                                    placeholder="Broker ID"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                                    {paramName}
                                                </span>
                                                <ClickableBroker 
                                                    brokerId={String(brokerId)} 
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-700 px-2 py-1 rounded" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Model Override */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Model Override</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.modelOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, modelOverride: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                placeholder="Model Override"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 px-3 py-2 rounded-lg">
                                {editValues.modelOverride}
                            </div>
                        )}
                    </div>

                    {/* Tools Override */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Tools Override</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.toolsOverride}
                                onChange={(e) => setEditValues(prev => ({ ...prev, toolsOverride: e.target.value }))}
                                className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                placeholder="Tools Override (comma-separated)"
                            />
                        ) : (
                            <div className="text-sm font-mono bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 px-3 py-2 rounded-lg">
                                {formatToolsOverride(editValues.toolsOverride)}
                            </div>
                        )}
                    </div>

                    {/* Return Brokers */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                    Return Broker{validReturnBrokers.length !== 1 ? 's' : ''} ({validReturnBrokers.length})
                                </span>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={addReturnBroker}
                                    className="text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-900/70 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md transition-colors"
                                >
                                    Add Broker
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {editValues.returnBrokerIds.map((brokerId, idx) => (
                                <div key={idx} className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-3">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={brokerId}
                                                onChange={(e) => handleReturnBrokerChange(idx, e.target.value)}
                                                className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
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
                                                    className="text-sm font-mono bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-700 px-2 py-1 rounded break-all"
                                                />
                                            ) : (
                                                <div className="text-sm font-mono text-purple-700 dark:text-purple-300 italic">
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

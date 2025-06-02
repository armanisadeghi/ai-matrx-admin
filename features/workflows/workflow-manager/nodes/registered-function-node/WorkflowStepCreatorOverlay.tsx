"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { getWorkflowActionsWithThunks } from "@/lib/redux/entity/custom-actions/custom-workflow-actions";
import { WorkflowStep } from "@/types/customWorkflowTypes";
import { X, ChevronLeft, ChevronRight, Check, FunctionSquare, Settings, Code2, Eye } from "lucide-react";

// Import refined components
import FunctionSelectorOverlay from "./FunctionSelectorOverlay";
import FunctionDetailsDisplay from "./FunctionDetailsDisplay";
import InputConfigurationTable from "./InputConfigurationTable";
import InputMappingControls from "./InputMappingControls";

interface WorkflowStepCreatorOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onStepCreated?: (step: WorkflowStep) => void; // Optional parent callback
    initialFunctionId?: string; // Optional pre-selected function
    initialStepData?: Partial<WorkflowStep>; // Optional existing step data for editing
    mode?: 'create' | 'edit'; // Mode indication for UI
}

type StepperStep = 1 | 2 | 3;

export default function WorkflowStepCreatorOverlay({
    isOpen,
    onClose,
    onStepCreated,
    initialFunctionId,
    initialStepData,
    mode,
}: WorkflowStepCreatorOverlayProps) {
    const dispatch = useAppDispatch();
    const workflowSelectors = createWorkflowSelectors();
    const workflowActions = getWorkflowActionsWithThunks();

    // Stepper state
    const [currentStep, setCurrentStep] = useState<StepperStep>(1);

    // Local state for step creation
    const [selectedFunctionId, setSelectedFunctionId] = useState<string>(initialFunctionId || "");
    const [stepName, setStepName] = useState<string>("");
    const [executionRequired, setExecutionRequired] = useState<boolean>(false);
    const [returnBroker, setReturnBroker] = useState<string>("");
    const [argOverrides, setArgOverrides] = useState<Record<string, { value: any; ready: boolean }>>({});
    const [argMappings, setArgMappings] = useState<Record<string, string>>({});

    // Redux selectors
    const selectedFunctionFromStore = useAppSelector((state) => 
        selectedFunctionId ? workflowSelectors.registeredFunctionWithArgs(state, selectedFunctionId) : null
    );

    // Reset to step 1 when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            setHasInitialized(false); // Reset initialization flag for new session
            
            // Initialize from existing step data if in edit mode
            if (mode === 'edit' && initialStepData) {
                // If we have step data with a function ID, start there
                if (initialStepData.function_id) {
                    setSelectedFunctionId(initialStepData.function_id);
                }
                
                // Set other basic properties immediately
                if (initialStepData.step_name) setStepName(initialStepData.step_name);
                if (initialStepData.execution_required !== undefined) setExecutionRequired(initialStepData.execution_required);
                
                // Handle override data that doesn't depend on function metadata
                if (initialStepData.override_data?.arg_mapping) {
                    setArgMappings(initialStepData.override_data.arg_mapping);
                }
            }
        }
    }, [isOpen, mode, initialStepData]);

    // Handle function change
    const handleFunctionChange = useCallback((functionId: string) => {
        setSelectedFunctionId(functionId);
        // Note: Form state will be reset when selectedFunctionFromStore updates
        // This prevents circular dependency issues
    }, []);

    // Reset form state when function changes (only in create mode)
    useEffect(() => {
        // Only run if we have a function ID, the function data exists, and we're in create mode
        if (selectedFunctionId && selectedFunctionFromStore && mode === 'create') {
            console.log('Initializing form for function:', selectedFunctionId);
            
            // Reset form state
            setStepName("");
            setExecutionRequired(false);
            setReturnBroker(selectedFunctionFromStore.returnBroker || "");

            // Initialize arg overrides with defaults
            const initialOverrides: Record<string, { value: any; ready: boolean }> = {};
            selectedFunctionFromStore.args?.forEach((arg) => {
                const defaultValue =
                    arg.defaultValue && typeof arg.defaultValue === "object" && "value" in arg.defaultValue
                        ? arg.defaultValue.value
                        : arg.defaultValue;

                initialOverrides[arg.name] = {
                    value: defaultValue,
                    ready: arg.ready,
                };
            });
            setArgOverrides(initialOverrides);
            setArgMappings({});
        }
    }, [selectedFunctionId, mode]);

    // NEW: Initialize from existing step data (for editing mode)
    const initializeFromStepData = useCallback((stepData: Partial<WorkflowStep>, functionFromStore: any) => {
        if (!stepData || !functionFromStore) return;

        // Set basic step properties
        if (stepData.step_name) setStepName(stepData.step_name);
        if (stepData.execution_required !== undefined) setExecutionRequired(stepData.execution_required);
        
        // Only set function ID if it's different (prevent infinite loop)
        if (stepData.function_id && stepData.function_id !== selectedFunctionId) {
            setSelectedFunctionId(stepData.function_id);
        }

        // Handle override data
        if (stepData.override_data) {
            if (stepData.override_data.return_broker_override) {
                // Handle both string and array formats
                const brokerOverride = stepData.override_data.return_broker_override;
                setReturnBroker((Array.isArray(brokerOverride) ? brokerOverride[0] || "" : brokerOverride) as string);
            }

            // Handle arg mappings
            if (stepData.override_data.arg_mapping) {
                setArgMappings(stepData.override_data.arg_mapping);
            }

            // Handle arg overrides - merge with function defaults for complete coverage
            if (functionFromStore && functionFromStore.args) {
                const existingOverrides = stepData.override_data.arg_overrides || [];
                const overrideMap = new Map(existingOverrides.map(o => [o.name, o]));

                const mergedOverrides: Record<string, { value: any; ready: boolean }> = {};
                
                // Process all function args to ensure complete coverage
                functionFromStore.args.forEach((arg) => {
                    const existingOverride = overrideMap.get(arg.name);
                    const defaultValue =
                        arg.defaultValue && typeof arg.defaultValue === "object" && "value" in arg.defaultValue
                            ? arg.defaultValue.value
                            : arg.defaultValue;

                    mergedOverrides[arg.name] = {
                        value: existingOverride?.value ?? existingOverride?.default_value ?? defaultValue,
                        ready: existingOverride?.ready ?? arg.ready,
                    };
                });

                setArgOverrides(mergedOverrides);
            }
        }
    }, []);

    // State to track if we've already initialized from step data
    const [hasInitialized, setHasInitialized] = useState(false);

    // Initialize from step data when function data becomes available
    useEffect(() => {
        if (initialStepData && selectedFunctionFromStore && mode === 'edit' && !hasInitialized && selectedFunctionId === initialStepData.function_id) {
            initializeFromStepData(initialStepData, selectedFunctionFromStore);
            setHasInitialized(true);
        }
        
        // Reset initialization flag when overlay closes
        if (!isOpen) {
            setHasInitialized(false);
        }
    }, [selectedFunctionId, mode, initializeFromStepData, hasInitialized, isOpen]);

    // Reset all state
    const handleReset = useCallback(() => {
        setSelectedFunctionId("");
        setStepName("");
        setExecutionRequired(false);
        setReturnBroker("");
        setArgOverrides({});
        setArgMappings({});
        setCurrentStep(1);
    }, []);

    // Create step object (used for both save and preview)
    const createStepObject = useCallback((): WorkflowStep | null => {
        if (!selectedFunctionFromStore) return null;

        return {
            function_type: "registered_function",
            function_id: selectedFunctionFromStore.id,
            step_name: stepName || "",
            execution_required: executionRequired,
            status: "pending",

            override_data: {
                return_broker_override: returnBroker || selectedFunctionFromStore.returnBroker,
                arg_mapping: { ...argMappings },
                arg_overrides: Object.entries(argOverrides).map(([name, override]) => ({
                    name,
                    value: override.value,
                    ready: override.ready,
                })),
            },

            additional_dependencies: [],
            broker_relays: {
                simple_relays: [],
                bidirectional_relays: [],
                relay_chains: [],
            },
        };
    }, [selectedFunctionFromStore, stepName, executionRequired, returnBroker, argMappings, argOverrides]);

    // Save and close
    const handleSaveStep = useCallback(() => {
        const step = createStepObject();
        if (!step) return;

        // Notify parent if callback provided
        if (onStepCreated) {
            onStepCreated(step);
        }

        console.log("Created step:", step);
        
        // Close overlay after creation
        onClose();
    }, [createStepObject, onStepCreated, onClose]);

    // Update arg override
    const handleUpdateArgOverride = useCallback((argName: string, field: "value" | "ready", newValue: any) => {
        setArgOverrides((prev) => ({
            ...prev,
            [argName]: {
                ...prev[argName],
                [field]: newValue,
            },
        }));
    }, []);

    // Manage arg mappings
    const handleAddArgMapping = useCallback((argName: string, brokerId: string) => {
        setArgMappings((prev) => ({
            ...prev,
            [argName]: brokerId,
        }));
    }, []);

    const handleRemoveArgMapping = useCallback((argName: string) => {
        setArgMappings((prev) => {
            const newMappings = { ...prev };
            delete newMappings[argName];
            return newMappings;
        });
    }, []);

    // Step navigation
    const canGoNext = () => {
        if (currentStep === 1) return !!selectedFunctionId;
        if (currentStep === 2) return true; // Can always proceed to review
        return false;
    };

    const canSave = () => {
        return !!selectedFunctionId; // Can save as long as function is selected
    };

    const handleNext = () => {
        if (canGoNext() && currentStep < 3) {
            setCurrentStep((prev) => (prev + 1) as StepperStep);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as StepperStep);
        }
    };

    const goToStep = (step: StepperStep) => {
        if (step === 1 || (step === 2 && selectedFunctionId) || (step === 3 && selectedFunctionId)) {
            setCurrentStep(step);
        }
    };

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Step content renderers
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <FunctionSelectorOverlay 
                            selectedFunctionId={selectedFunctionId}
                            onFunctionChange={handleFunctionChange}
                            onReset={handleReset}
                        />
                        {selectedFunctionFromStore && (
                            <FunctionDetailsDisplay selectedFunction={selectedFunctionFromStore} />
                        )}
                    </div>
                );

            case 2:
                return selectedFunctionFromStore ? (
                    <div className="space-y-6">
                        {/* Basic Configuration Card */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                    <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                    Step Configuration
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Step Name
                                    </label>
                                    <input
                                        type="text"
                                        value={stepName}
                                        onChange={(e) => setStepName(e.target.value)}
                                        placeholder="Enter descriptive step name..."
                                        className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 transition-all duration-200"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Execution Required
                                    </label>
                                    <div className="flex items-center h-10">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={executionRequired}
                                                onChange={(e) => setExecutionRequired(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            <span className="ml-3 text-sm text-blue-700 dark:text-blue-300">
                                                {executionRequired ? "Required" : "Optional"}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Return Broker Override
                                    </label>
                                    <input
                                        type="text"
                                        value={returnBroker}
                                        onChange={(e) => setReturnBroker(e.target.value)}
                                        placeholder="Override return broker..."
                                        className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 transition-all duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Input Configuration Table */}
                        <InputConfigurationTable 
                            selectedFunction={selectedFunctionFromStore}
                            argOverrides={argOverrides}
                            argMappings={argMappings}
                            onUpdateArgOverride={handleUpdateArgOverride}
                            onRemoveArgMapping={handleRemoveArgMapping}
                        />

                        {/* Input Mapping Controls */}
                        <InputMappingControls 
                            selectedFunction={selectedFunctionFromStore}
                            argMappings={argMappings}
                            onAddMapping={handleAddArgMapping}
                        />
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <FunctionSquare className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Please select a function first</p>
                    </div>
                );

            case 3:
                const stepPreview = createStepObject();
                return (
                    <div className="space-y-6">
                        {/* Step Summary Card */}
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 backdrop-blur-sm rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-700/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                                    Step Ready for {mode === 'edit' ? 'Update' : 'Creation'}
                                </h3>
                            </div>
                            
                            {stepPreview && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Step Name</span>
                                        <div className="text-emerald-900 dark:text-emerald-100 font-mono text-sm bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                                            {stepPreview.step_name || "(No name provided)"}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Function</span>
                                        <div className="text-emerald-900 dark:text-emerald-100 font-mono text-sm bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                                            {selectedFunctionFromStore?.name}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Arguments</span>
                                        <div className="text-emerald-900 dark:text-emerald-100 font-mono text-sm bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                                            {stepPreview.override_data?.arg_overrides?.length || 0} configured
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* JSON Preview Card */}
                        <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                    <Code2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Step Configuration Preview
                                </h3>
                            </div>
                            
                            <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-600 max-h-96 overflow-y-auto">
                                <pre className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap p-4 font-mono leading-relaxed">
                                    {stepPreview ? JSON.stringify(stepPreview, null, 2) : "No step data available"}
                                </pre>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Modern Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            />
            
            {/* Overlay Content */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div 
                    className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 w-full max-w-7xl max-h-[95vh] overflow-y-auto"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {/* Modern Header with Stepper */}
                    <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-8 py-6 rounded-t-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {mode === 'edit' ? 'Edit Workflow Step' : 'Create Workflow Step'}
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 mt-2">
                                    {mode === 'edit' 
                                        ? 'Modify the configuration of this workflow step'
                                        : 'Configure a registered function as a workflow step'
                                    }
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Modern Stepper */}
                        <div className="flex items-center justify-center">
                            <div className="flex items-center space-x-12">
                                {/* Step 1 */}
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            goToStep(1);
                                        }}
                                        className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                                            currentStep === 1
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105'
                                                : selectedFunctionId
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white cursor-pointer hover:scale-105 shadow-md'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        {selectedFunctionId && currentStep !== 1 ? (
                                            <Check className="w-6 h-6" />
                                        ) : (
                                            <FunctionSquare className="w-6 h-6" />
                                        )}
                                    </button>
                                    <div className="ml-4">
                                        <div className={`text-sm font-semibold ${
                                            currentStep === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                                        }`}>
                                            Choose Function
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-500">
                                            Select a registered function
                                        </div>
                                    </div>
                                </div>

                                {/* Connector */}
                                <div className={`w-20 h-1 rounded-full transition-all duration-300 ${
                                    selectedFunctionId 
                                        ? 'bg-gradient-to-r from-emerald-400 to-green-400' 
                                        : 'bg-slate-200 dark:bg-slate-600'
                                }`} />

                                {/* Step 2 */}
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            goToStep(2);
                                        }}
                                        disabled={!selectedFunctionId}
                                        className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                                            currentStep === 2
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105'
                                                : selectedFunctionId
                                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 cursor-pointer hover:scale-105 hover:bg-slate-400 dark:hover:bg-slate-500'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Settings className="w-6 h-6" />
                                    </button>
                                    <div className="ml-4">
                                        <div className={`text-sm font-semibold ${
                                            currentStep === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                                        }`}>
                                            Configure
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-500">
                                            Set parameters and mappings
                                        </div>
                                    </div>
                                </div>

                                {/* Connector */}
                                <div className={`w-20 h-1 rounded-full transition-all duration-300 ${
                                    selectedFunctionId 
                                        ? 'bg-slate-300 dark:bg-slate-600' 
                                        : 'bg-slate-200 dark:bg-slate-600'
                                }`} />

                                {/* Step 3 */}
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            goToStep(3);
                                        }}
                                        disabled={!selectedFunctionId}
                                        className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                                            currentStep === 3
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105'
                                                : selectedFunctionId
                                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 cursor-pointer hover:scale-105 hover:bg-slate-400 dark:hover:bg-slate-500'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Eye className="w-6 h-6" />
                                    </button>
                                    <div className="ml-4">
                                        <div className={`text-sm font-semibold ${
                                            currentStep === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                                        }`}>
                                            Review
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-500">
                                            Preview and finalize
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {renderStepContent()}
                    </div>

                    {/* Modern Footer with Navigation */}
                    <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 px-8 py-6 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                {/* Step Info */}
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                    <span className="font-medium">Step {currentStep} of 3</span>
                                    {selectedFunctionFromStore && (
                                        <span className="ml-4 text-slate-500">
                                            {selectedFunctionFromStore.args?.length || 0} inputs • 
                                            {Object.keys(argMappings).length} mappings
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {/* Previous Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handlePrevious();
                                    }}
                                    disabled={currentStep === 1}
                                    className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                {/* Save Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSaveStep();
                                    }}
                                    disabled={!canSave()}
                                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    {mode === 'edit' 
                                        ? (currentStep === 3 ? "Update Step" : "Save Changes")
                                        : (currentStep === 3 ? "Create Step" : "Save Step")
                                    }
                                </button>

                                {/* Next Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleNext();
                                    }}
                                    disabled={!canGoNext() || currentStep === 3}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
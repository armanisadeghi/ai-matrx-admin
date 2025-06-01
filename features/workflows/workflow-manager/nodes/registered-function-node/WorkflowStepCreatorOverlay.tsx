"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { getWorkflowActionsWithThunks } from "@/lib/redux/entity/custom-actions/custom-workflow-actions";
import { WorkflowStep } from "@/types/customWorkflowTypes";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

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

    // Initialize Redux data on mount
    useEffect(() => {
        if (isOpen) {
            dispatch(workflowActions.initialize());
        }
    }, [dispatch, isOpen]);

    // Reset to step 1 when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            
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
        
        if (functionId && selectedFunctionFromStore) {
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
    }, [selectedFunctionFromStore]);

    // NEW: Initialize from existing step data (for editing mode)
    const initializeFromStepData = useCallback((stepData: Partial<WorkflowStep>) => {
        if (!stepData) return;

        // Set basic step properties
        if (stepData.step_name) setStepName(stepData.step_name);
        if (stepData.execution_required !== undefined) setExecutionRequired(stepData.execution_required);
        if (stepData.function_id) setSelectedFunctionId(stepData.function_id);

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
            if (selectedFunctionFromStore && selectedFunctionFromStore.args) {
                const existingOverrides = stepData.override_data.arg_overrides || [];
                const overrideMap = new Map(existingOverrides.map(o => [o.name, o]));

                const mergedOverrides: Record<string, { value: any; ready: boolean }> = {};
                
                // Process all function args to ensure complete coverage
                selectedFunctionFromStore.args.forEach((arg) => {
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
    }, [selectedFunctionFromStore]);

    // Initialize from step data when function data becomes available
    useEffect(() => {
        if (initialStepData && selectedFunctionFromStore && mode === 'edit') {
            initializeFromStepData(initialStepData);
        }
    }, [initialStepData, selectedFunctionFromStore, mode, initializeFromStepData]);

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
                        {/* Basic Configuration */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Step Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Step Name
                                    </label>
                                    <input
                                        type="text"
                                        value={stepName}
                                        onChange={(e) => setStepName(e.target.value)}
                                        placeholder="Enter step name..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Execution Required
                                    </label>
                                    <div className="flex items-center h-10">
                                        <input
                                            type="checkbox"
                                            checked={executionRequired}
                                            onChange={(e) => setExecutionRequired(e.target.checked)}
                                            className="rounded border-gray-300 dark:border-gray-600"
                                        />
                                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                            {executionRequired ? "Required" : "Optional"}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Return Broker Override
                                    </label>
                                    <input
                                        type="text"
                                        value={returnBroker}
                                        onChange={(e) => setReturnBroker(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">Please select a function first</p>
                    </div>
                );

            case 3:
                const stepPreview = createStepObject();
                return (
                    <div className="space-y-6">
                        {/* Step Summary */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
                                ✅ Step Ready for Creation
                            </h3>
                            {stepPreview && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-green-700 dark:text-green-300 font-medium">Step Name:</span>
                                        <div className="text-green-800 dark:text-green-200">
                                            {stepPreview.step_name || "(No name provided)"}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-green-700 dark:text-green-300 font-medium">Function:</span>
                                        <div className="text-green-800 dark:text-green-200">
                                            {selectedFunctionFromStore?.name}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-green-700 dark:text-green-300 font-medium">Inputs:</span>
                                        <div className="text-green-800 dark:text-green-200">
                                            {stepPreview.override_data?.arg_overrides?.length || 0} configured
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* JSON Preview */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                📄 Step JSON Preview
                            </h3>
                            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-4 max-h-96 overflow-y-auto">
                                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
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
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />
            
            {/* Overlay Content */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                    {/* Header with Stepper */}
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {mode === 'edit' ? 'Edit Workflow Step' : 'Add Workflow Step'}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {mode === 'edit' 
                                        ? 'Modify the configuration of this workflow step'
                                        : 'Configure a registered function as a workflow step'
                                    }
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center justify-center">
                            <div className="flex items-center space-x-8">
                                {/* Step 1 */}
                                <div className="flex items-center">
                                    <button
                                        onClick={() => goToStep(1)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                                            currentStep === 1
                                                ? 'bg-blue-600 text-white'
                                                : selectedFunctionId
                                                ? 'bg-green-600 text-white cursor-pointer'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {selectedFunctionId && currentStep !== 1 ? <Check className="w-5 h-5" /> : '1'}
                                    </button>
                                    <span className={`ml-3 text-sm font-medium ${
                                        currentStep === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                        Choose Function
                                    </span>
                                </div>

                                {/* Connector */}
                                <div className={`w-16 h-0.5 ${
                                    selectedFunctionId ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                                }`} />

                                {/* Step 2 */}
                                <div className="flex items-center">
                                    <button
                                        onClick={() => goToStep(2)}
                                        disabled={!selectedFunctionId}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                                            currentStep === 2
                                                ? 'bg-blue-600 text-white'
                                                : selectedFunctionId
                                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        2
                                    </button>
                                    <span className={`ml-3 text-sm font-medium ${
                                        currentStep === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                        Configure
                                    </span>
                                </div>

                                {/* Connector */}
                                <div className={`w-16 h-0.5 ${
                                    selectedFunctionId ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-600'
                                }`} />

                                {/* Step 3 */}
                                <div className="flex items-center">
                                    <button
                                        onClick={() => goToStep(3)}
                                        disabled={!selectedFunctionId}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                                            currentStep === 3
                                                ? 'bg-blue-600 text-white'
                                                : selectedFunctionId
                                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        3
                                    </button>
                                    <span className={`ml-3 text-sm font-medium ${
                                        currentStep === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                        Review
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {renderStepContent()}
                    </div>

                    {/* Footer with Navigation */}
                    <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Step Info */}
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Step {currentStep} of 3
                                    {selectedFunctionFromStore && (
                                        <>
                                            {" • "}
                                            {selectedFunctionFromStore.args?.length || 0} inputs • 
                                            {Object.keys(argMappings).length} mappings
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Previous Button */}
                                <button
                                    onClick={handlePrevious}
                                    disabled={currentStep === 1}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                {/* Save Button - Available on all steps */}
                                <button
                                    onClick={handleSaveStep}
                                    disabled={!canSave()}
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    {mode === 'edit' 
                                        ? (currentStep === 3 ? "Update Step" : "Save Changes")
                                        : (currentStep === 3 ? "Create Step" : "Save Step")
                                    }
                                </button>

                                {/* Next Button */}
                                <button
                                    onClick={handleNext}
                                    disabled={!canGoNext() || currentStep === 3}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { getWorkflowActionsWithThunks } from "@/lib/redux/entity/custom-actions/custom-workflow-actions";
import { WorkflowStep } from "@/types/customWorkflowTypes";

// Import our new components
import FunctionSelector from "./components/FunctionSelector";
import FunctionPreview from "./components/FunctionPreview";
import BasicStepConfiguration from "./components/BasicStepConfiguration";
import ArgumentOverrides from "./components/ArgumentOverrides";
import ArgumentMapping from "./components/ArgumentMapping";
import CreatedStepDisplay from "./components/CreatedStepDisplay";

export default function WorkflowStepCreationTestPage() {
    const dispatch = useAppDispatch();
    const workflowSelectors = createWorkflowSelectors();
    const workflowActions = getWorkflowActionsWithThunks();

    // Local state for step creation
    const [selectedFunctionId, setSelectedFunctionId] = useState<string>("");
    const [createdStep, setCreatedStep] = useState<WorkflowStep | null>(null);

    // Editable step properties
    const [stepName, setStepName] = useState<string>("");
    const [executionRequired, setExecutionRequired] = useState<boolean>(false);
    const [returnBroker, setReturnBroker] = useState<string>("");
    const [argOverrides, setArgOverrides] = useState<Record<string, { value: any; ready: boolean }>>({});
    const [argMappings, setArgMappings] = useState<Record<string, string>>({});
    const [newMappingArg, setNewMappingArg] = useState<string>("");
    const [newMappingBroker, setNewMappingBroker] = useState<string>("");

    // Get registered function options
    const registeredFunctionOptions = useAppSelector(workflowSelectors.registeredFunctionOptions);

    // Get the selected function via selector (more stable)
    const selectedFunctionFromStore = useAppSelector((state) => 
        selectedFunctionId ? workflowSelectors.registeredFunctionWithArgs(state, selectedFunctionId) : null
    );

    // Initialize data on mount
    useEffect(() => {
        dispatch(workflowActions.initialize());
    }, [dispatch]);

    // Handle function change with useCallback to prevent re-renders
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

    // Reset everything
    const handleReset = useCallback(() => {
        setSelectedFunctionId("");
        setCreatedStep(null);
        setStepName("");
        setExecutionRequired(false);
        setReturnBroker("");
        setArgOverrides({});
        setArgMappings({});
        setNewMappingArg("");
        setNewMappingBroker("");
    }, []);

    const handleCreateStep = useCallback(() => {
        if (!selectedFunctionFromStore) return;

        // Build the step manually with our editable values
        const step: WorkflowStep = {
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

        setCreatedStep(step);
        console.log("Created step:", step);
    }, [selectedFunctionFromStore, stepName, executionRequired, returnBroker, argMappings, argOverrides]);

    const handleUpdateArgOverride = useCallback((argName: string, field: "value" | "ready", newValue: any) => {
        setArgOverrides((prev) => ({
            ...prev,
            [argName]: {
                ...prev[argName],
                [field]: newValue,
            },
        }));
    }, []);

    const handleAddArgMapping = useCallback(() => {
        if (newMappingArg && newMappingBroker) {
            setArgMappings((prev) => ({
                ...prev,
                [newMappingArg]: newMappingBroker,
            }));
            setNewMappingArg("");
            setNewMappingBroker("");
        }
    }, [newMappingArg, newMappingBroker]);

    const handleRemoveArgMapping = useCallback((argName: string) => {
        setArgMappings((prev) => {
            const newMappings = { ...prev };
            delete newMappings[argName];
            return newMappings;
        });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-textured rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Interactive Step Creation System</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Complete workflow step creation with full editing capabilities.</p>

                    {/* Function Selection */}
                    <FunctionSelector 
                        selectedFunctionId={selectedFunctionId}
                        onFunctionChange={handleFunctionChange}
                        onReset={handleReset}
                    />

                    {/* Function Preview */}
                    <FunctionPreview selectedFunction={selectedFunctionFromStore} />

                    {/* Step Configuration */}
                    {selectedFunctionFromStore && (
                        <div className="space-y-6 mb-6">
                            {/* Basic Step Properties */}
                            <BasicStepConfiguration 
                                stepName={stepName}
                                onStepNameChange={setStepName}
                                executionRequired={executionRequired}
                                onExecutionRequiredChange={setExecutionRequired}
                                returnBroker={returnBroker}
                                onReturnBrokerChange={setReturnBroker}
                            />

                            {/* Argument Overrides */}
                            <ArgumentOverrides 
                                selectedFunction={selectedFunctionFromStore}
                                argOverrides={argOverrides}
                                argMappings={argMappings}
                                onUpdateArgOverride={handleUpdateArgOverride}
                                onRemoveArgMapping={handleRemoveArgMapping}
                            />

                            {/* Argument Mapping Creation */}
                            <ArgumentMapping 
                                selectedFunction={selectedFunctionFromStore}
                                argMappings={argMappings}
                                newMappingArg={newMappingArg}
                                newMappingBroker={newMappingBroker}
                                onNewMappingArgChange={setNewMappingArg}
                                onNewMappingBrokerChange={setNewMappingBroker}
                                onAddMapping={handleAddArgMapping}
                                onRemoveMapping={handleRemoveArgMapping}
                            />

                            {/* Create Step Button */}
                            <div className="text-center">
                                <button
                                    onClick={handleCreateStep}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-medium"
                                >
                                    Create Interactive Step
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Created Step Display */}
                {createdStep && <CreatedStepDisplay createdStep={createdStep} />}

                {/* Debug Info */}
                <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Debug Info</h3>
                    <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <div>
                            <strong>Functions Loaded:</strong> {registeredFunctionOptions.length}
                        </div>
                        <div>
                            <strong>Function Selected:</strong> {selectedFunctionFromStore ? "Yes" : "No"}
                        </div>
                        <div>
                            <strong>Args Count:</strong> {selectedFunctionFromStore?.args?.length || 0}
                        </div>
                        <div>
                            <strong>Step Created:</strong> {createdStep ? "Yes" : "No"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

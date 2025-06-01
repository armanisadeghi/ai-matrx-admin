import { EntityFieldKeys, MatrxRecordId } from "@/types/entityTypes";
import { AppDispatch, RootState } from "@/lib/redux";
import { getEntitySlice } from "../entitySlice";
import { fetchRelatedRecordsThunk } from "../thunks/fetchRelatedRecordsThunk";
import { WorkflowStep, ArgOverride } from "@/types/customWorkflowTypes";

export type RuntimeFilter = {
    field: string;
    operator: "eq" | "neq";
    value: unknown;
};

export type RuntimeSort = {
    field: string;
    direction: "asc" | "desc";
};

// Default filters and sorts for args (since they're related to registeredFunctions)
const DEFAULT_ARG_RUNTIME_FILTERS: RuntimeFilter[] = [];
const DEFAULT_ARG_RUNTIME_SORT: RuntimeSort = { field: "name", direction: "asc" };

// ====== UTILITY FUNCTIONS FOR STEP CREATION ======

/**
 * Extract the actual default value from the nested defaultValue structure
 * Critical: defaultValue.value contains the actual value
 */
function extractDefaultValue(defaultValue: any): any {
    if (defaultValue && typeof defaultValue === 'object' && 'value' in defaultValue) {
        return defaultValue.value;
    }
    return defaultValue;
}

/**
 * Convert value to proper Python type
 */
function convertPythonType(value: any, dataType: string): any {
    if (value === null || value === undefined) {
        return null;
    }
    
    switch(dataType) {
        case 'int': 
            const intVal = parseInt(value);
            return isNaN(intVal) ? 0 : intVal;
        case 'float': 
            const floatVal = parseFloat(value);
            return isNaN(floatVal) ? 0.0 : floatVal;
        case 'bool': 
            return Boolean(value);
        case 'str': 
            return String(value || '');
        case 'list': 
            return Array.isArray(value) ? value : [];
        case 'dict': 
            return typeof value === 'object' ? value : {};
        case 'url':
            return String(value || '');
        default: 
            return value;
    }
}

/**
 * Check if a string is a valid UUID (indicates real broker vs consumable)
 */
function isValidUUID(str: string): boolean {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Merge function args with existing overrides, preserving user customizations
 */
function mergeArgsWithOverrides(functionArgs: any[], existingOverrides: ArgOverride[] = []): ArgOverride[] {
    const overrideMap = new Map(existingOverrides.map(o => [o.name, o]));
    
    return functionArgs.map(arg => {
        const existing = overrideMap.get(arg.name) as any;
        const defaultValue = extractDefaultValue(arg.defaultValue);
        
        return {
            name: arg.name,
            ready: existing?.ready ?? arg.ready,
            value: existing?.value ?? existing?.default_value ?? convertPythonType(defaultValue, arg.dataType),
            // Note: 'required' is NOT stored in the step data - it's only used for validation
        };
    });
}

/**
 * Create a complete, valid WorkflowStep from a registered function and its args
 */
function createStepFromFunctionData(registeredFunction: any, functionArgs: any[]): WorkflowStep {
    const argOverrides = mergeArgsWithOverrides(functionArgs, []);
    
    return {
        function_type: "registered_function",
        function_id: registeredFunction.id,
        step_name: "", // User will provide
        execution_required: false, // Conservative default
        status: "pending",
        
        override_data: {
            return_broker_override: registeredFunction.returnBroker,
            arg_mapping: {}, // Empty initially - user will configure
            arg_overrides: argOverrides
        },
        
        additional_dependencies: [],
        
        broker_relays: {
            simple_relays: [],
            bidirectional_relays: [],
            relay_chains: []
        }
    };
}

/**
 * Update existing step with latest function metadata, preserving user overrides
 */
function updateStepWithFunctionData(existingStep: WorkflowStep, registeredFunction: any, functionArgs: any[]): WorkflowStep {
    const existingOverrides = existingStep.override_data?.arg_overrides || [];
    const mergedOverrides = mergeArgsWithOverrides(functionArgs, existingOverrides);
    
    return {
        ...existingStep,
        override_data: {
            ...existingStep.override_data,
            return_broker_override: existingStep.override_data?.return_broker_override || registeredFunction.returnBroker,
            arg_overrides: mergedOverrides
        }
    };
}

export const getWorkflowActionsWithThunks = () => {
    const workflowState = getEntitySlice("workflow");
    const registeredFunctionState = getEntitySlice("registeredFunction");
    const argState = getEntitySlice("arg");
    const dataBrokerState = getEntitySlice("dataBroker");
    
    const workflowActions = workflowState.actions;
    const registeredFunctionActions = registeredFunctionState.actions;
    const argActions = argState.actions;
    const dataBrokerActions = dataBrokerState.actions;

    const parentEntityField = "registeredFunction";

    /**
     * Fetch a data broker by ID if it's a valid UUID and not already loaded
     */
    const fetchBrokerIfNeeded = (brokerId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
        if (!brokerId || !isValidUUID(brokerId)) {
            // Not a UUID, treat as consumable broker
            return;
        }

        const currentBroker = getState().entities["dataBroker"].records[`id:${brokerId}`];
        if (!currentBroker) {
            // Real broker ID but not loaded, fetch it
            dispatch(dataBrokerActions.fetchOne({ matrxRecordId: `id:${brokerId}` }));
        }
    };

    return {
        // Initialize all workflow-related data
        initialize: () => (dispatch: AppDispatch) => {
            // Fetch workflows (limited to first 100 due to pagination)
            dispatch(workflowActions.fetchAll({ limit: 100 }));
            
            // Fetch all registered functions (only ~50 total)
            dispatch(registeredFunctionActions.fetchAll({}));
            
            // Fetch all args and set up their relationship to registeredFunctions
            dispatch(argActions.fetchAll({}));
            dispatch(argActions.setParentEntityField(parentEntityField));
            dispatch(argActions.setRuntimeFilters(DEFAULT_ARG_RUNTIME_FILTERS));
            dispatch(argActions.setRuntimeSort(DEFAULT_ARG_RUNTIME_SORT));
            
            // NOTE: We don't fetch all data brokers here due to potential volume
            // Instead, we fetch them on-demand when broker IDs are encountered
            
            console.log("WORKFLOW ACTIONS: Dispatched initialization actions (brokers fetched on-demand).");
        },

        // ====== NEW: ENHANCED STEP CREATION ACTIONS ======

        // Create a step from a registered function ID
        createStepFromRegisteredFunction: (params: { functionId: string; stepName?: string }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const state = getState();
                
                // Get function data
                const registeredFunction = state.entities["registeredFunction"].records[`id:${params.functionId}`];
                if (!registeredFunction) {
                    console.error('Function not found:', params.functionId);
                    return null;
                }
                
                // Get args for this function
                const functionArgs = Object.values(state.entities["arg"].records).filter(
                    (arg: any) => arg.registeredFunction === params.functionId
                );
                
                // Create the step
                const newStep = createStepFromFunctionData(registeredFunction, functionArgs);
                
                // Set step name if provided
                if (params.stepName) {
                    newStep.step_name = params.stepName;
                }
                
                console.log('Created step from function:', newStep);
                return newStep;
            },

        // Add a step created from a registered function to the active workflow
        addStepFromRegisteredFunction: (params: { 
            functionId: string; 
            stepName?: string; 
            stepIndex?: number;
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const state = getState();
            const keyOrId = state.entities["workflow"].selection.activeRecord;
            if (!keyOrId) {
                console.error('No active workflow found');
                return;
            }

            // Get function data
            const registeredFunction = state.entities["registeredFunction"].records[`id:${params.functionId}`];
            if (!registeredFunction) {
                console.error('Function not found:', params.functionId);
                return;
            }
            
            // Get args for this function
            const functionArgs = Object.values(state.entities["arg"].records).filter(
                (arg: any) => arg.registeredFunction === params.functionId
            );
            
            // Create the step
            const newStep = createStepFromFunctionData(registeredFunction, functionArgs);
            
            // Set step name if provided
            if (params.stepName) {
                newStep.step_name = params.stepName;
            }
            
            // Add to workflow
            const currentWorkflow = state.entities["workflow"].records[keyOrId] as any;
            if (!currentWorkflow) return;

            const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
            const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

            // Add step at specified index or at the end
            if (params.stepIndex !== undefined && params.stepIndex >= 0 && params.stepIndex <= currentSteps.length) {
                currentSteps.splice(params.stepIndex, 0, newStep);
            } else {
                currentSteps.push(newStep);
            }

            const updatedBackendData = {
                ...currentBackendData,
                steps: currentSteps
            };

            dispatch(workflowActions.updateFieldSmart({ 
                keyOrId, 
                field: "backendWorkflow", 
                value: updatedBackendData 
            }));
            
            console.log('Added step from registered function:', newStep);
        },

        // Update a step's arg override
        updateStepArgOverride: (params: { 
            stepIndex: number; 
            argName: string; 
            override: Partial<ArgOverride>;
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const keyOrId = getState().entities["workflow"].selection.activeRecord;
            if (!keyOrId) return;

            const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
            if (!currentWorkflow) return;

            const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
            const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

            if (params.stepIndex >= 0 && params.stepIndex < currentSteps.length) {
                const step = { ...currentSteps[params.stepIndex] };
                
                if (!step.override_data) {
                    step.override_data = {};
                }
                if (!step.override_data.arg_overrides) {
                    step.override_data.arg_overrides = [];
                }
                
                const overrideIndex = step.override_data.arg_overrides.findIndex(
                    (override: ArgOverride) => override.name === params.argName
                );
                
                if (overrideIndex >= 0) {
                    // Update existing override
                    step.override_data.arg_overrides[overrideIndex] = {
                        ...step.override_data.arg_overrides[overrideIndex],
                        ...params.override
                    };
                } else {
                    // Add new override
                    step.override_data.arg_overrides.push({
                        name: params.argName,
                        ...params.override
                    } as ArgOverride);
                }
                
                currentSteps[params.stepIndex] = step;

                const updatedBackendData = {
                    ...currentBackendData,
                    steps: currentSteps
                };

                dispatch(workflowActions.updateFieldSmart({ 
                    keyOrId, 
                    field: "backendWorkflow", 
                    value: updatedBackendData 
                }));
            }
        },

        // Refresh a step with latest function metadata (preserves user overrides)
        refreshStepWithFunctionData: (params: { stepIndex: number }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const state = getState();
                const keyOrId = state.entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                const currentWorkflow = state.entities["workflow"].records[keyOrId] as any;
                if (!currentWorkflow) return;

                const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
                const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

                if (params.stepIndex >= 0 && params.stepIndex < currentSteps.length) {
                    const existingStep = currentSteps[params.stepIndex];
                    
                    if (existingStep.function_type === "registered_function") {
                        // Get fresh function data
                        const registeredFunction = state.entities["registeredFunction"].records[`id:${existingStep.function_id}`];
                        const functionArgs = Object.values(state.entities["arg"].records).filter(
                            (arg: any) => arg.registeredFunction === existingStep.function_id
                        );
                        
                        if (registeredFunction) {
                            // Update step with fresh data while preserving overrides
                            const updatedStep = updateStepWithFunctionData(existingStep, registeredFunction, functionArgs);
                            currentSteps[params.stepIndex] = updatedStep;

                            const updatedBackendData = {
                                ...currentBackendData,
                                steps: currentSteps
                            };

                            dispatch(workflowActions.updateFieldSmart({ 
                                keyOrId, 
                                field: "backendWorkflow", 
                                value: updatedBackendData 
                            }));
                            
                            console.log('Refreshed step with function data:', updatedStep);
                        }
                    }
                }
            },

        // Fetch args for a specific registered function
        fetchArgsForRegisteredFunction: (params: { registeredFunctionId: string }) => (dispatch: AppDispatch) => {
            dispatch(
                fetchRelatedRecordsThunk({
                    childEntity: "arg",
                    parentId: params.registeredFunctionId,
                    childReferenceField: "registered_function",
                    sort: { field: "name", direction: "asc" },
                    maxCount: 50, // More than enough for any function
                })
            );
        },

        // Set active workflow
        setActiveWorkflow: (workflowId: string) => (dispatch: AppDispatch) => {
            const matrxRecordId = `id:${workflowId}`;
            dispatch(workflowActions.fetchOne({ matrxRecordId }));
            dispatch(workflowActions.setActiveRecord(matrxRecordId));
        },

        // Set active registered function
        setActiveRegisteredFunction: (registeredFunctionId: string) => (dispatch: AppDispatch) => {
            const matrxRecordId = `id:${registeredFunctionId}`;
            dispatch(registeredFunctionActions.setActiveRecord(matrxRecordId));
            // Also fetch related args
            dispatch(argActions.setActiveParentId(matrxRecordId));
        },

        // Update entity-level custom data (applies to entire workflow entity state)
        updateWorkflowEntityCustomData: (params: { customData: Record<string, unknown> }) => 
            (dispatch: AppDispatch) => {
                dispatch(workflowActions.updateCustomDataSmart({ customData: params.customData }));
            },

        // Update workflow field (with optional keyOrId fallback to active)
        updateWorkflowFieldSmart: (params: { keyOrId?: string; field: string; value: any }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(workflowActions.updateFieldSmart({ keyOrId, ...params }));
            },

        // Update workflow nested field (with optional keyOrId fallback to active)
        updateWorkflowNestedFieldSmart: (params: { 
            keyOrId?: string; 
            field: EntityFieldKeys<"workflow">; 
            nestedKey: string; 
            value: any 
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const keyOrId = params.keyOrId ?? getState().entities["workflow"].selection.activeRecord;
            if (!keyOrId) return;
            dispatch(workflowActions.updateNestedFieldSmart({ keyOrId, ...params }));
        },

        // Update active workflow visual workflow data
        updateActiveWorkflowVisualWorkflow: (params: { visualWorkflowData: Record<string, unknown> }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(workflowActions.updateFieldSmart({ 
                    keyOrId, 
                    field: "visualWorkflow", 
                    value: params.visualWorkflowData 
                }));
            },

        // Update active workflow backend workflow data
        updateActiveWorkflowBackendWorkflow: (params: { backendWorkflowData: Record<string, unknown> }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(workflowActions.updateFieldSmart({ 
                    keyOrId, 
                    field: "backendWorkflow", 
                    value: params.backendWorkflowData 
                }));
            },

        // Direct update workflow (for server updates) - with optional keyOrId
        directUpdateWorkflow: (params: { 
            matrxRecordId?: MatrxRecordId; 
            data: Record<string, any>; 
            callbackId?: string 
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const matrxRecordId = params.matrxRecordId ?? getState().entities["workflow"].selection.activeRecord;
            if (!matrxRecordId) return;
            dispatch(workflowActions.directUpdateRecord({ matrxRecordId, data: params.data, callbackId: params.callbackId }));
        },

        // Update workflow (with validation) - with optional keyOrId
        updateWorkflow: (params: { 
            matrxRecordId?: MatrxRecordId; 
            data: Record<string, any>; 
            callbackId?: string 
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const matrxRecordId = params.matrxRecordId ?? getState().entities["workflow"].selection.activeRecord;
            if (!matrxRecordId) return;
            dispatch(workflowActions.updateRecord({ matrxRecordId, data: params.data, callbackId: params.callbackId }));
        },

        // Delete workflow - with optional keyOrId
        deleteWorkflow: (params: { matrxRecordId?: MatrxRecordId }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["workflow"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(workflowActions.deleteRecord({ matrxRecordId }));
            },

        // Delete active workflow
        deleteActiveWorkflow: () => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = getState().entities["workflow"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(workflowActions.deleteRecord({ matrxRecordId }));
            },

        // Fetch all workflows (with pagination)
        fetchAllWorkflows: (params?: { limit?: number; offset?: number }) => (dispatch: AppDispatch) => {
            dispatch(workflowActions.fetchAll({ 
                limit: params?.limit ?? 100, 
                offset: params?.offset ?? 0 
            }));
        },

        // Fetch all registered functions
        fetchAllRegisteredFunctions: () => (dispatch: AppDispatch) => {
            dispatch(registeredFunctionActions.fetchAll({}));
        },

        // Fetch all args
        fetchAllArgs: () => (dispatch: AppDispatch) => {
            dispatch(argActions.fetchAll({}));
        },

        // ====== WORKFLOW STEP ACTIONS ======

        // Add a workflow step to active workflow
        addWorkflowStep: (params: { step: any; stepIndex?: number }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
                if (!currentWorkflow) return;

                const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
                const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

                // Add step at specified index or at the end
                if (params.stepIndex !== undefined && params.stepIndex >= 0 && params.stepIndex <= currentSteps.length) {
                    currentSteps.splice(params.stepIndex, 0, params.step);
                } else {
                    currentSteps.push(params.step);
                }

                const updatedBackendData = {
                    ...currentBackendData,
                    steps: currentSteps
                };

                dispatch(workflowActions.updateFieldSmart({ 
                    keyOrId, 
                    field: "backendWorkflow", 
                    value: updatedBackendData 
                }));
            },

        // Remove a workflow step from active workflow
        removeWorkflowStep: (params: { stepIndex: number }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
                if (!currentWorkflow) return;

                const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
                const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

                if (params.stepIndex >= 0 && params.stepIndex < currentSteps.length) {
                    currentSteps.splice(params.stepIndex, 1);

                    const updatedBackendData = {
                        ...currentBackendData,
                        steps: currentSteps
                    };

                    dispatch(workflowActions.updateFieldSmart({ 
                        keyOrId, 
                        field: "backendWorkflow", 
                        value: updatedBackendData 
                    }));
                }
            },

        // Update a workflow step in active workflow
        updateWorkflowStep: (params: { stepIndex: number; step: any }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
                if (!currentWorkflow) return;

                const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
                const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

                if (params.stepIndex >= 0 && params.stepIndex < currentSteps.length) {
                    currentSteps[params.stepIndex] = params.step;

                    const updatedBackendData = {
                        ...currentBackendData,
                        steps: currentSteps
                    };

                    dispatch(workflowActions.updateFieldSmart({ 
                        keyOrId, 
                        field: "backendWorkflow", 
                        value: updatedBackendData 
                    }));
                }
            },

        // Move a workflow step (reorder)
        moveWorkflowStep: (params: { fromIndex: number; toIndex: number }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
                if (!currentWorkflow) return;

                const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
                const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

                if (params.fromIndex >= 0 && params.fromIndex < currentSteps.length &&
                    params.toIndex >= 0 && params.toIndex < currentSteps.length) {
                    
                    const [movedStep] = currentSteps.splice(params.fromIndex, 1);
                    currentSteps.splice(params.toIndex, 0, movedStep);

                    const updatedBackendData = {
                        ...currentBackendData,
                        steps: currentSteps
                    };

                    dispatch(workflowActions.updateFieldSmart({ 
                        keyOrId, 
                        field: "backendWorkflow", 
                        value: updatedBackendData 
                    }));
                }
            },

        // Create and add a registered function step (LEGACY - use addStepFromRegisteredFunction instead)
        addRegisteredFunctionStep: (params: { 
            function_id: string; 
            step_name?: string; 
            override_data?: any;
            stepIndex?: number;
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const step = {
                function_type: "registered_function" as const,
                function_id: params.function_id,
                step_name: params.step_name,
                override_data: params.override_data,
                execution_required: true,
                status: "pending"
            };

            // Call addWorkflowStep logic directly
            const keyOrId = getState().entities["workflow"].selection.activeRecord;
            if (!keyOrId) return;

            const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
            if (!currentWorkflow) return;

            const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
            const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

            // Add step at specified index or at the end
            if (params.stepIndex !== undefined && params.stepIndex >= 0 && params.stepIndex <= currentSteps.length) {
                currentSteps.splice(params.stepIndex, 0, step);
            } else {
                currentSteps.push(step);
            }

            const updatedBackendData = {
                ...currentBackendData,
                steps: currentSteps
            };

            dispatch(workflowActions.updateFieldSmart({ 
                keyOrId, 
                field: "backendWorkflow", 
                value: updatedBackendData 
            }));
        },

        // Create and add a recipe executor step
        addRecipeExecutorStep: (params: { 
            function_id: string; 
            step_name?: string; 
            override_data?: any;
            stepIndex?: number;
        }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const step = {
                function_type: "workflow_recipe_executor" as const,
                function_id: params.function_id,
                step_name: params.step_name,
                override_data: params.override_data,
                execution_required: true,
                status: "pending"
            };

            // Call addWorkflowStep logic directly
            const keyOrId = getState().entities["workflow"].selection.activeRecord;
            if (!keyOrId) return;

            const currentWorkflow = getState().entities["workflow"].records[keyOrId] as any;
            if (!currentWorkflow) return;

            const currentBackendData = currentWorkflow.backendWorkflow || { steps: [] };
            const currentSteps = Array.isArray(currentBackendData.steps) ? [...currentBackendData.steps] : [];

            // Add step at specified index or at the end
            if (params.stepIndex !== undefined && params.stepIndex >= 0 && params.stepIndex <= currentSteps.length) {
                currentSteps.splice(params.stepIndex, 0, step);
            } else {
                currentSteps.push(step);
            }

            const updatedBackendData = {
                ...currentBackendData,
                steps: currentSteps
            };

            dispatch(workflowActions.updateFieldSmart({ 
                keyOrId, 
                field: "backendWorkflow", 
                value: updatedBackendData 
            }));
        },

        // Update workflow metadata
        updateWorkflowMetadata: (params: { metadata: any }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                dispatch(workflowActions.updateNestedFieldSmart({ 
                    keyOrId, 
                    field: "backendWorkflow", 
                    nestedKey: "workflow_metadata", 
                    value: params.metadata 
                }));
            },

        // Update workflow relays
        updateWorkflowRelays: (params: { relays: any }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                dispatch(workflowActions.updateNestedFieldSmart({ 
                    keyOrId, 
                    field: "backendWorkflow", 
                    nestedKey: "workflow_relays", 
                    value: params.relays 
                }));
            },

        // Update workflow user inputs
        updateWorkflowUserInputs: (params: { userInputs: any[] }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = getState().entities["workflow"].selection.activeRecord;
                if (!keyOrId) return;

                dispatch(workflowActions.updateNestedFieldSmart({ 
                    keyOrId, 
                    field: "backendWorkflow", 
                    nestedKey: "user_inputs", 
                    value: params.userInputs 
                }));
            },

        // ====== ENRICHED DATA THUNKS ======

        // Get enriched step data (includes function and args data for registered_function steps)
        getEnrichedStepData: (params: { stepIndex: number }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                // This is a read-only operation, so we don't dispatch anything
                // Instead, we use the selector to get the enriched data
                // This action serves as a way to trigger data fetching if needed
                const state = getState();
                const workflow = state.entities["workflow"].records[state.entities["workflow"].selection.activeRecord] as any;
                
                if (!workflow?.backendWorkflow?.steps) return null;
                
                const step = workflow.backendWorkflow.steps[params.stepIndex];
                if (!step) return null;

                if (step.function_type === "registered_function") {
                    // Ensure we have the function data
                    const func = state.entities["registeredFunction"].records[`id:${step.function_id}`];
                    if (!func) {
                        dispatch(registeredFunctionActions.fetchOne({ matrxRecordId: `id:${step.function_id}` }));
                    }

                    // Ensure we have the args data for this function
                    const existingArgs = Object.values(state.entities["arg"].records).filter(
                        (arg: any) => arg.registeredFunction === step.function_id
                    );
                    
                    if (existingArgs.length === 0) {
                        dispatch(
                            fetchRelatedRecordsThunk({
                                childEntity: "arg",
                                parentId: step.function_id,
                                childReferenceField: "registered_function",
                                sort: { field: "name", direction: "asc" },
                                maxCount: 50,
                            })
                        );
                    }
                }

                return step;
            },

        // Bulk fetch enriched data for all function steps
        fetchAllFunctionStepData: () => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const state = getState();
                const workflow = state.entities["workflow"].records[state.entities["workflow"].selection.activeRecord] as any;
                
                if (!workflow?.backendWorkflow?.steps) return;

                const functionSteps = workflow.backendWorkflow.steps.filter(
                    (step: any) => step.function_type === "registered_function"
                );

                functionSteps.forEach((step: any) => {
                    // Fetch function data if not already loaded
                    const func = state.entities["registeredFunction"].records[`id:${step.function_id}`];
                    if (!func) {
                        dispatch(registeredFunctionActions.fetchOne({ matrxRecordId: `id:${step.function_id}` }));
                    }

                    // Fetch args data if not already loaded
                    const existingArgs = Object.values(state.entities["arg"].records).filter(
                        (arg: any) => arg.registeredFunction === step.function_id
                    );
                    
                    if (existingArgs.length === 0) {
                        dispatch(
                            fetchRelatedRecordsThunk({
                                childEntity: "arg",
                                parentId: step.function_id,
                                childReferenceField: "registered_function",
                                sort: { field: "name", direction: "asc" },
                                maxCount: 50,
                            })
                        );
                    }
                });
            },

        // ====== NEW: BROKER ENRICHMENT ACTIONS ======

        // Fetch a data broker by ID if it's a valid UUID and not already loaded
        fetchBrokerIfNeeded,

        // Fetch brokers for all mappings in a workflow step
        fetchBrokersForStep: (params: { stepIndex: number }) => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const state = getState();
                const workflow = state.entities["workflow"].records[state.entities["workflow"].selection.activeRecord] as any;
                
                if (!workflow?.backendWorkflow?.steps) return;
                
                const step = workflow.backendWorkflow.steps[params.stepIndex];
                if (!step) return;

                // Fetch brokers for arg mappings
                const argMappings = step.override_data?.arg_mapping || {};
                Object.values(argMappings).forEach((brokerId: any) => {
                    if (typeof brokerId === 'string') {
                        dispatch(fetchBrokerIfNeeded(brokerId));
                    }
                });

                // Fetch broker for return broker override
                if (step.override_data?.return_broker_override) {
                    dispatch(fetchBrokerIfNeeded(step.override_data.return_broker_override));
                }
            },

        // Fetch brokers for all workflow steps
        fetchBrokersForAllSteps: () => 
            (dispatch: AppDispatch, getState: () => RootState) => {
                const state = getState();
                const workflow = state.entities["workflow"].records[state.entities["workflow"].selection.activeRecord] as any;
                
                if (!workflow?.backendWorkflow?.steps) return;

                workflow.backendWorkflow.steps.forEach((_: any, index: number) => {
                    // Inline the same logic as fetchBrokersForStep to avoid circular reference
                    const step = workflow.backendWorkflow.steps[index];
                    if (!step) return;

                    // Fetch brokers for arg mappings
                    const argMappings = step.override_data?.arg_mapping || {};
                    Object.values(argMappings).forEach((brokerId: any) => {
                        if (typeof brokerId === 'string') {
                            dispatch(fetchBrokerIfNeeded(brokerId));
                        }
                    });

                    // Fetch broker for return broker override
                    if (step.override_data?.return_broker_override) {
                        dispatch(fetchBrokerIfNeeded(step.override_data.return_broker_override));
                    }
                });
            },

        // Check if a broker ID is a real broker (UUID) or consumable (string)
        isRealBroker: (brokerId: string) => {
            return isValidUUID(brokerId);
        },
    };
};

export default getWorkflowActionsWithThunks;

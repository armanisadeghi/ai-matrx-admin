"use client";

import { createSelector } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { RootState } from "@/lib/redux/store";
import { createEntitySelectors } from "../selectors";
import { MatrxRecordId } from "@/types/entityTypes";

// Types for reference - these would normally be auto-generated
type WorkflowRecordWithKey = {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    name: string;
    userId: string;
    description: string;
    isPublic: boolean;
    version: number;
    authenticatedRead: boolean;
    publicRead: boolean;
    isDeleted: boolean;
    isActive: boolean;
    visualWorkflow: Record<string, unknown>;
    backendWorkflow: Record<string, unknown>;
    matrxRecordId: MatrxRecordId;
}

type WorkflowDataOptional = {
    id?: string;
    name?: string;
    userId?: string;
    createdAt?: Date;
    description?: string;
    updatedAt?: Date;
    isPublic?: boolean;
    version?: number;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDeleted?: boolean;
    isActive?: boolean;
    visualWorkflow?: Record<string, unknown>;
    backendWorkflow?: Record<string, unknown>;
}

type RegisteredFunctionRecordWithKey = {
    id: string;
    name: string;
    description: string;
    tags: Record<string, unknown>;
    funcName: string;
    modulePath: string;
    className: string;
    returnBroker: string;
    matrxRecordId: MatrxRecordId;
}

type ArgRecordWithKey = {
    id: string;
    name: string;
    registeredFunction: string;
    required: boolean;
    defaultJunk: string;
    dataType: "str" | "bool" | "dict" | "float" | "int" | "list" | "url";
    ready: boolean;
    defaultValue: Record<string, unknown>;
    matrxRecordId: MatrxRecordId;
}

type DataBrokerRecordWithKey = {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    dataType: "str" | "bool" | "dict" | "float" | "int" | "list" | "url";
    defaultValue: string;
    outputComponent: string;
    authenticatedRead: boolean;
    publicRead: boolean;
    inputComponent: string;
    color: "gray" | "rose" | "blue" | "amber" | "cyan" | "emerald" | "fuchsia" | "green" | "indigo" | "lime" | "neutral" | "orange" | "pink" | "purple" | "red" | "sky" | "slate" | "stone" | "teal" | "violet" | "yellow" | "zinc";
    fieldComponentId: string;
    matrxRecordId: MatrxRecordId;
}

// Enriched broker type for UI display
type EnrichedBrokerReference = {
    id: string;
    isRealBroker: boolean;
    broker?: DataBrokerRecordWithKey;
    displayName: string;
    color?: string;
    dataType?: string;
}

export const createWorkflowSelectors = () => {
    const workflowEntity = "workflow" as EntityKeys;
    const registeredFunctionEntity = "registeredFunction" as EntityKeys;
    const argEntity = "arg" as EntityKeys;
    const dataBrokerEntity = "dataBroker" as EntityKeys;

    const workflowSelectors = createEntitySelectors("workflow");
    const registeredFunctionSelectors = createEntitySelectors("registeredFunction");
    const argSelectors = createEntitySelectors("arg");
    const dataBrokerSelectors = createEntitySelectors("dataBroker");

    if (!workflowSelectors || !registeredFunctionSelectors || !argSelectors || !dataBrokerSelectors) {
        throw new Error("Failed to create selectors for workflow entities");
    }

    // ====== ENTITY STATE ACCESSORS ======
    const selectWorkflowEntity = (state: RootState) => {
        const workflowState = state.entities[workflowEntity];
        if (!workflowState) return {} as any;
        return workflowState;
    };

    const selectRegisteredFunctionEntity = (state: RootState) => {
        const registeredFunctionState = state.entities[registeredFunctionEntity];
        if (!registeredFunctionState) return {} as any;
        return registeredFunctionState;
    };

    const selectArgEntity = (state: RootState) => {
        const argState = state.entities[argEntity];
        if (!argState) return {} as any;
        return argState;
    };

    const selectDataBrokerEntity = (state: RootState) => {
        const dataBrokerState = state.entities[dataBrokerEntity];
        if (!dataBrokerState) return {} as any;
        return dataBrokerState;
    };

    // ====== CORE DATA SELECTORS ======
    const workflows = (state: RootState) => workflowSelectors.selectAllRecords(state) || {};
    const workflowsArray = (state: RootState) => workflowSelectors.selectRecordsArray(state) || [];
    const activeWorkflow = (state: RootState) => workflowSelectors.selectActiveRecord(state);

    const registeredFunctions = (state: RootState) => registeredFunctionSelectors.selectAllRecords(state) || {};
    const registeredFunctionsArray = (state: RootState) => registeredFunctionSelectors.selectRecordsArray(state) || [];
    const activeRegisteredFunction = (state: RootState) => registeredFunctionSelectors.selectActiveRecord(state);

    const args = (state: RootState) => argSelectors.selectAllRecords(state) || {};
    const argsArray = (state: RootState) => argSelectors.selectRecordsArray(state) || [];
    const activeArg = (state: RootState) => argSelectors.selectActiveRecord(state);

    const dataBrokers = (state: RootState) => dataBrokerSelectors.selectAllRecords(state) || {};
    const dataBrokersArray = (state: RootState) => dataBrokerSelectors.selectRecordsArray(state) || [];
    const activeDataBroker = (state: RootState) => dataBrokerSelectors.selectActiveRecord(state);

    // ====== ACTIVE RECORD KEYS ======
    const activeWorkflowKey = createSelector(
        [selectWorkflowEntity],
        (entity): MatrxRecordId | undefined => {
            if (!entity?.selection.activeRecord) return undefined;
            return entity.selection.activeRecord as MatrxRecordId;
        }
    );

    const activeRegisteredFunctionKey = createSelector(
        [selectRegisteredFunctionEntity],
        (entity): MatrxRecordId | undefined => {
            if (!entity?.selection.activeRecord) return undefined;
            return entity.selection.activeRecord as MatrxRecordId;
        }
    );

    const activeArgKey = createSelector(
        [selectArgEntity],
        (entity): MatrxRecordId | undefined => {
            if (!entity?.selection.activeRecord) return undefined;
            return entity.selection.activeRecord as MatrxRecordId;
        }
    );

    // ====== BUSINESS LOGIC SELECTORS ======

    // Get args for a specific registered function
    const argsByRegisteredFunctionId = createSelector(
        [argsArray, (_: RootState, registeredFunctionId: string) => registeredFunctionId],
        (argsArray: ArgRecordWithKey[], registeredFunctionId: string): ArgRecordWithKey[] => {
            if (!argsArray || !registeredFunctionId) return [];
            return argsArray.filter((arg) => arg.registeredFunction === registeredFunctionId);
        }
    );

    // Get registered function with its nested args
    const registeredFunctionWithArgs = createSelector(
        [registeredFunctions, argsArray, (_: RootState, registeredFunctionId: string) => registeredFunctionId],
        (functions, argsArray, registeredFunctionId) => {
            if (!functions || !registeredFunctionId) return null;
            
            const func = Object.values(functions).find(
                (f: any) => f.id === registeredFunctionId
            ) as RegisteredFunctionRecordWithKey | undefined;
            
            if (!func) return null;

            const functionArgs = argsArray.filter((arg: ArgRecordWithKey) => arg.registeredFunction === registeredFunctionId);

            return {
                ...func,
                args: functionArgs
            };
        }
    );

    // Get all registered functions with their nested args
    const allRegisteredFunctionsWithArgs = createSelector(
        [registeredFunctionsArray, argsArray],
        (functionsArray: RegisteredFunctionRecordWithKey[], argsArray: ArgRecordWithKey[]) => {
            return functionsArray.map((func) => {
                const functionArgs = argsArray.filter((arg) => arg.registeredFunction === func.id);
                return {
                    ...func,
                    args: functionArgs
                };
            });
        }
    );

    // Get active registered function with its args
    const activeRegisteredFunctionWithArgs = createSelector(
        [activeRegisteredFunction, argsArray],
        (activeFunction, argsArray) => {
            if (!activeFunction) return null;
            
            const functionArgs = argsArray.filter((arg: ArgRecordWithKey) => arg.registeredFunction === activeFunction.id);
            
            return {
                ...activeFunction,
                args: functionArgs
            };
        }
    );

    // ====== WORKFLOW STEP SELECTORS ======

    // Get backend workflow data from active workflow
    const activeWorkflowBackendData = createSelector(
        [activeWorkflow],
        (workflow): any => {
            if (!workflow) return null;
            return workflow.backendWorkflow;
        }
    );

    // Get workflow steps from active workflow
    const activeWorkflowSteps = createSelector(
        [activeWorkflowBackendData],
        (backendData): any[] => {
            if (!backendData || !backendData.steps) return [];
            return backendData.steps;
        }
    );

    // Get registered function steps only
    const activeWorkflowFunctionSteps = createSelector(
        [activeWorkflowSteps],
        (steps: any[]) => {
            return steps.filter((step) => step.function_type === "registered_function");
        }
    );

    // Get recipe executor steps only
    const activeWorkflowRecipeSteps = createSelector(
        [activeWorkflowSteps],
        (steps: any[]) => {
            return steps.filter((step) => step.function_type === "workflow_recipe_executor");
        }
    );

    // Get enriched function step (step + function + args data)
    const enrichedFunctionStep = createSelector(
        [
            activeWorkflowSteps,
            registeredFunctionsArray,
            argsArray,
            (_: RootState, stepIndex: number) => stepIndex
        ],
        (steps, functionsArray, argsArray, stepIndex) => {
            if (!steps || !steps[stepIndex]) return null;
            
            const step = steps[stepIndex];
            if (step.function_type !== "registered_function") return null;

            const func = functionsArray.find((f) => f.id === step.function_id);
            if (!func) return { step, function: null, args: [] };

            const functionArgs = argsArray.filter((arg) => arg.registeredFunction === func.id);

            return {
                step,
                function: func,
                args: functionArgs
            };
        }
    );

    // Get all enriched function steps
    const allEnrichedFunctionSteps = createSelector(
        [activeWorkflowFunctionSteps, registeredFunctionsArray, argsArray],
        (functionSteps, functionsArray, argsArray) => {
            return functionSteps.map((step: any) => {
                const func = functionsArray.find((f) => f.id === step.function_id);
                if (!func) return { step, function: null, args: [] };

                const functionArgs = argsArray.filter((arg) => arg.registeredFunction === func.id);

                return {
                    step,
                    function: func,
                    args: functionArgs
                };
            });
        }
    );

    // Get function step by function ID
    const functionStepByFunctionId = createSelector(
        [activeWorkflowFunctionSteps, (_: RootState, functionId: string) => functionId],
        (functionSteps, functionId) => {
            return functionSteps.find((step: any) => step.function_id === functionId);
        }
    );

    // Get workflow step validation status
    const workflowStepValidation = createSelector(
        [activeWorkflowSteps, registeredFunctionsArray],
        (steps, functionsArray) => {
            return steps.map((step: any, index: number) => {
                const isValid = step.function_id && step.function_type;
                let hasValidFunction = false;
                let functionExists = false;

                if (step.function_type === "registered_function") {
                    functionExists = functionsArray.some((f) => f.id === step.function_id);
                    hasValidFunction = functionExists;
                } else if (step.function_type === "workflow_recipe_executor") {
                    // For recipe steps, just check if function_id is one of the valid recipe methods
                    const validMethods = ["recipe_runner", "extractor", "iterative_recipe_preparer", "iterative_recipe_runner", "results_processor"];
                    hasValidFunction = validMethods.includes(step.function_id);
                }

                return {
                    stepIndex: index,
                    step,
                    isValid: isValid && hasValidFunction,
                    functionExists,
                    errors: {
                        missingFunctionId: !step.function_id,
                        missingFunctionType: !step.function_type,
                        functionNotFound: step.function_type === "registered_function" && !functionExists,
                        invalidRecipeMethod: step.function_type === "workflow_recipe_executor" && !hasValidFunction
                    }
                };
            });
        }
    );

    // Get workflow metadata
    const activeWorkflowMetadata = createSelector(
        [activeWorkflowBackendData],
        (backendData) => {
            if (!backendData) return null;
            return backendData.workflow_metadata || null;
        }
    );

    // Get workflow relays
    const activeWorkflowRelays = createSelector(
        [activeWorkflowBackendData],
        (backendData) => {
            if (!backendData) return null;
            return backendData.workflow_relays || null;
        }
    );

    // Get workflow user inputs
    const activeWorkflowUserInputs = createSelector(
        [activeWorkflowBackendData],
        (backendData) => {
            if (!backendData) return [];
            return backendData.user_inputs || [];
        }
    );

    // ====== NEW: STEP CREATION SELECTORS ======

    // Get registered function options for dropdown (id, name pairs)
    const registeredFunctionOptions = createSelector(
        [registeredFunctionsArray],
        (functionsArray: RegisteredFunctionRecordWithKey[]) => {
            return functionsArray.map((func) => ({
                id: func.id,
                name: func.name,
                description: func.description
            })).sort((a, b) => a.name.localeCompare(b.name));
        }
    );

    // Get complete step data with function and args merged
    const completeStepData = createSelector(
        [
            activeWorkflowSteps,
            registeredFunctionsArray,
            argsArray,
            (_: RootState, stepIndex: number) => stepIndex
        ],
        (steps, functionsArray, argsArray, stepIndex) => {
            if (!steps || !steps[stepIndex]) return null;
            
            const step = steps[stepIndex];
            
            if (step.function_type !== "registered_function") {
                return { step, function: null, args: [], allArgsAsOverrides: [] };
            }

            const func = functionsArray.find((f) => f.id === step.function_id);
            if (!func) {
                return { step, function: null, args: [], allArgsAsOverrides: [] };
            }

            const functionArgs = argsArray.filter((arg) => arg.registeredFunction === func.id);
            
            // Create merged overrides that include ALL args from function
            const existingOverrides = step.override_data?.arg_overrides || [];
            const overrideMap = new Map(existingOverrides.map((o: any) => [o.name, o]));
            
            const allArgsAsOverrides = functionArgs.map((arg) => {
                const existing = overrideMap.get(arg.name) as any;
                const defaultValue = arg.defaultValue && typeof arg.defaultValue === 'object' && 'value' in arg.defaultValue 
                    ? arg.defaultValue.value 
                    : arg.defaultValue;
                
                return {
                    name: arg.name,
                    ready: existing?.ready ?? arg.ready,
                    value: existing?.value ?? existing?.default_value ?? defaultValue, // Support both old and new format
                    dataType: arg.dataType,
                    isOverridden: !!existing,
                    // For validation purposes only (not stored in step)
                    required: arg.required,
                    // Original arg data for reference
                    originalArg: arg
                };
            });

            return {
                step,
                function: func,
                args: functionArgs,
                allArgsAsOverrides
            };
        }
    );

    // Get validation errors for a step
    const stepValidationErrors = createSelector(
        [
            activeWorkflowSteps,
            registeredFunctionsArray,
            argsArray,
            (_: RootState, stepIndex: number) => stepIndex
        ],
        (steps, functionsArray, argsArray, stepIndex) => {
            if (!steps || !steps[stepIndex]) return [];
            
            const step = steps[stepIndex];
            const errors: string[] = [];
            
            // Basic step validation
            if (!step.function_id) {
                errors.push("Missing function ID");
            }
            
            if (!step.function_type) {
                errors.push("Missing function type");
            }
            
            if (step.function_type === "registered_function") {
                const func = functionsArray.find((f) => f.id === step.function_id);
                if (!func) {
                    errors.push("Function not found in database");
                    return errors;
                }
                
                const functionArgs = argsArray.filter((arg) => arg.registeredFunction === func.id);
                const overrides = step.override_data?.arg_overrides || [];
                const overrideMap = new Map(overrides.map((o: any) => [o.name, o]));
                
                // Check required args
                functionArgs.forEach((arg) => {
                    if (arg.required) {
                        const override = overrideMap.get(arg.name) as any;
                        const hasValue = override?.value !== null && override?.value !== undefined;
                        const hasOldValue = override?.default_value !== null && override?.default_value !== undefined;
                        const isReady = override?.ready ?? arg.ready;
                        
                        if (!isReady && !hasValue && !hasOldValue) {
                            errors.push(`Required argument '${arg.name}' is not ready and has no value`);
                        }
                    }
                });
                
                // Type validation for overrides
                overrides.forEach((override: any) => {
                    const arg = functionArgs.find((a) => a.name === override.name);
                    if (arg) {
                        const value = override.value ?? override.default_value; // Support both formats
                        if (value !== null && value !== undefined) {
                            const isValidType = validatePythonType(value, arg.dataType);
                            if (!isValidType) {
                                errors.push(`Invalid type for '${override.name}': expected ${arg.dataType}`);
                            }
                        }
                    }
                });
            }
            
            return errors;
        }
    );

    // Helper function for type validation
    const validatePythonType = (value: any, dataType: string): boolean => {
        switch(dataType) {
            case 'int':
                return Number.isInteger(Number(value));
            case 'float':
                return !isNaN(Number(value));
            case 'bool':
                return typeof value === 'boolean' || value === 'true' || value === 'false' || value === 0 || value === 1;
            case 'str':
            case 'url':
                return typeof value === 'string';
            case 'list':
                return Array.isArray(value);
            case 'dict':
                return typeof value === 'object' && !Array.isArray(value);
            default:
                return true; // Allow unknown types
        }
    };

    // ====== BROKER ENRICHMENT SELECTORS ======

    // Helper function to check if a string is a valid UUID
    const isValidUUID = (str: string): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    };

    // Get enriched broker reference (either real broker or consumable string)
    const enrichBrokerReference = createSelector(
        [dataBrokersArray, (_: RootState, brokerId: string) => brokerId],
        (brokersArray: DataBrokerRecordWithKey[], brokerId: string): EnrichedBrokerReference => {
            if (!brokerId) {
                return {
                    id: '',
                    isRealBroker: false,
                    displayName: '(No broker)',
                    color: 'gray'
                };
            }

            // Check if it's a potential real broker (UUID format)
            const isPotentialRealBroker = isValidUUID(brokerId);

            if (isPotentialRealBroker) {
                // Try to find real broker in loaded data
                const realBroker = brokersArray.find((broker) => broker.id === brokerId);
                
                if (realBroker) {
                    return {
                        id: brokerId,
                        isRealBroker: true,
                        broker: realBroker,
                        displayName: realBroker.name,
                        color: realBroker.color,
                        dataType: realBroker.dataType
                    };
                } else {
                    // UUID format but not loaded yet - show as loading state
                    return {
                        id: brokerId,
                        isRealBroker: true,
                        displayName: `Loading broker...`,
                        color: 'gray'
                    };
                }
            }

            // Not UUID format - definitely consumable broker
            return {
                id: brokerId,
                isRealBroker: false,
                displayName: brokerId,
                color: 'gray'
            };
        }
    );

    // Get available data brokers for dropdown (only loaded ones)
    const availableDataBrokers = createSelector(
        [dataBrokersArray],
        (brokersArray: DataBrokerRecordWithKey[]) => {
            return brokersArray.map((broker) => ({
                id: broker.id,
                name: broker.name,
                color: broker.color,
                dataType: broker.dataType,
                displayName: `${broker.name} (${broker.dataType})`
            })).sort((a, b) => a.name.localeCompare(b.name));
        }
    );

    // Get data brokers that match a specific data type (for validation)
    const dataBrokersByType = createSelector(
        [dataBrokersArray, (_: RootState, dataType: string) => dataType],
        (brokersArray: DataBrokerRecordWithKey[], dataType: string) => {
            if (!dataType) return brokersArray;
            return brokersArray.filter((broker) => broker.dataType === dataType);
        }
    );

    // Validate broker type compatibility with argument type (informational only)
    const validateBrokerArgCompatibility = createSelector(
        [dataBrokersArray, (_: RootState, brokerId: string, argType: string) => ({ brokerId, argType })],
        (brokersArray: DataBrokerRecordWithKey[], { brokerId, argType }) => {
            if (!brokerId || !argType) return { isValid: true, reason: '', isInformational: true };
            
            if (!isValidUUID(brokerId)) {
                // Consumable broker - assume valid (user responsibility)
                return { isValid: true, reason: 'Consumable broker (type not validated)', isInformational: true };
            }

            const broker = brokersArray.find((b) => b.id === brokerId);
            if (!broker) {
                // Real broker but not loaded yet
                return { isValid: true, reason: 'Broker not loaded yet', isInformational: true };
            }
            
            if (broker.dataType === argType) {
                return { isValid: true, reason: 'Types match perfectly', isInformational: true };
            }
            
            // Check for compatible types
            const compatibleTypes: Record<string, string[]> = {
                'str': ['url'],
                'url': ['str'],
                'int': ['float'],
                'float': ['int']
            };
            
            if (compatibleTypes[broker.dataType]?.includes(argType) || 
                compatibleTypes[argType]?.includes(broker.dataType)) {
                return { isValid: true, reason: 'Compatible types (Python will handle conversion)', isInformational: true };
            }
            
            return { 
                isValid: true, // Still valid since Python handles conversions
                reason: `Type difference: broker is ${broker.dataType}, argument expects ${argType} (Python will convert)`, 
                isInformational: true 
            };
        }
    );

    return {
        // Entity state accessors
        selectWorkflowEntity,
        selectRegisteredFunctionEntity,
        selectArgEntity,
        selectDataBrokerEntity,

        // Core data selectors
        workflows,
        workflowsArray,
        activeWorkflow,
        activeWorkflowKey,

        registeredFunctions,
        registeredFunctionsArray,
        activeRegisteredFunction,
        activeRegisteredFunctionKey,

        args,
        argsArray,
        activeArg,
        activeArgKey,

        dataBrokers,
        dataBrokersArray,
        activeDataBroker,

        // Business logic selectors
        argsByRegisteredFunctionId,
        registeredFunctionWithArgs,
        allRegisteredFunctionsWithArgs,
        activeRegisteredFunctionWithArgs,

        // Workflow step selectors
        activeWorkflowBackendData,
        activeWorkflowSteps,
        activeWorkflowFunctionSteps,
        activeWorkflowRecipeSteps,
        enrichedFunctionStep,
        allEnrichedFunctionSteps,
        functionStepByFunctionId,
        workflowStepValidation,
        activeWorkflowMetadata,
        activeWorkflowRelays,
        activeWorkflowUserInputs,

        // Step creation selectors
        registeredFunctionOptions,
        completeStepData,
        stepValidationErrors,

        // NEW: Broker enrichment selectors
        enrichBrokerReference,
        availableDataBrokers,
        dataBrokersByType,
        validateBrokerArgCompatibility,
    };
};

export default createWorkflowSelectors;
export type WorkflowSelectors = ReturnType<typeof createWorkflowSelectors>;
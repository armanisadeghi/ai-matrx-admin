"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { getWorkflowActionsWithThunks } from "@/lib/redux/entity/custom-actions/custom-workflow-actions";
import { WorkflowData, WorkflowStep } from "@/types/customWorkflowTypes";
import { MatrxRecordId } from "@/types/entityTypes";

export const useWorkflowManager = (workflowId?: string) => {
    const dispatch = useAppDispatch();
    const workflowSelectors = createWorkflowSelectors();
    const workflowActions = getWorkflowActionsWithThunks();

    // Get current workflow data using our selectors
    const activeWorkflow = useAppSelector(workflowSelectors.activeWorkflow);
    const activeWorkflowKey = useAppSelector(workflowSelectors.activeWorkflowKey);
    const allWorkflows = useAppSelector(workflowSelectors.workflowsArray);
    
    // Get workflow steps and enriched data
    const workflowSteps = useAppSelector(workflowSelectors.activeWorkflowSteps);
    const functionSteps = useAppSelector(workflowSelectors.activeWorkflowFunctionSteps);
    const recipeSteps = useAppSelector(workflowSelectors.activeWorkflowRecipeSteps);
    const allEnrichedFunctionSteps = useAppSelector(workflowSelectors.allEnrichedFunctionSteps);
    const workflowStepValidation = useAppSelector(workflowSelectors.workflowStepValidation);
    
    // Get workflow metadata sections
    const workflowMetadata = useAppSelector(workflowSelectors.activeWorkflowMetadata);
    const workflowRelays = useAppSelector(workflowSelectors.activeWorkflowRelays);
    const workflowUserInputs = useAppSelector(workflowSelectors.activeWorkflowUserInputs);
    
    // Get registered functions and args data
    const allRegisteredFunctionsWithArgs = useAppSelector(workflowSelectors.allRegisteredFunctionsWithArgs);
    const registeredFunctionsArray = useAppSelector(workflowSelectors.registeredFunctionsArray);
    const argsArray = useAppSelector(workflowSelectors.argsArray);

    // Check if data has already been initialized (prevent duplicate initialization)
    const workflowEntityState = useAppSelector(workflowSelectors.selectWorkflowEntity);
    const registeredFunctionEntityState = useAppSelector(workflowSelectors.selectRegisteredFunctionEntity);
    const argEntityState = useAppSelector(workflowSelectors.selectArgEntity);
    
    const hasWorkflowData = allWorkflows.length > 0;
    const hasRegisteredFunctionData = registeredFunctionsArray.length > 0;
    const hasArgData = argsArray.length > 0;
    const isAlreadyInitialized = hasWorkflowData || hasRegisteredFunctionData || hasArgData;

    // Only initialize if not already done (prevent conflicts with layout initialization)
    useEffect(() => {
        if (!isAlreadyInitialized) {
            console.log('useWorkflowManager: Data not initialized, initializing...');
            dispatch(workflowActions.initialize());
        } else {
            console.log('useWorkflowManager: Data already initialized, skipping...');
        }
    }, [dispatch, isAlreadyInitialized]);

    // Set active workflow when workflowId changes
    useEffect(() => {
        if (workflowId && workflowId !== activeWorkflowKey?.split(':')[1]) {
            console.log('useWorkflowManager: Setting active workflow:', workflowId);
            dispatch(workflowActions.setActiveWorkflow(workflowId));
        }
    }, [workflowId, activeWorkflowKey, dispatch]);

    // Workflow step management actions
    const stepActions = {
        addStep: useCallback((step: WorkflowStep, stepIndex?: number) => {
            dispatch(workflowActions.addWorkflowStep({ step, stepIndex }));
        }, [dispatch]),

        removeStep: useCallback((stepIndex: number) => {
            dispatch(workflowActions.removeWorkflowStep({ stepIndex }));
        }, [dispatch]),

        updateStep: useCallback((stepIndex: number, step: WorkflowStep) => {
            dispatch(workflowActions.updateWorkflowStep({ stepIndex, step }));
        }, [dispatch]),

        moveStep: useCallback((fromIndex: number, toIndex: number) => {
            dispatch(workflowActions.moveWorkflowStep({ fromIndex, toIndex }));
        }, [dispatch]),

        addRegisteredFunctionStep: useCallback((params: {
            function_id: string;
            step_name?: string;
            override_data?: any;
            stepIndex?: number;
        }) => {
            dispatch(workflowActions.addRegisteredFunctionStep(params));
        }, [dispatch]),

        addRecipeExecutorStep: useCallback((params: {
            function_id: string;
            step_name?: string;
            override_data?: any;
            stepIndex?: number;
        }) => {
            dispatch(workflowActions.addRecipeExecutorStep(params));
        }, [dispatch]),
    };

    // Workflow metadata management actions
    const metadataActions = {
        updateMetadata: useCallback((metadata: any) => {
            dispatch(workflowActions.updateWorkflowMetadata({ metadata }));
        }, [dispatch]),

        updateRelays: useCallback((relays: any) => {
            dispatch(workflowActions.updateWorkflowRelays({ relays }));
        }, [dispatch]),

        updateUserInputs: useCallback((userInputs: any[]) => {
            dispatch(workflowActions.updateWorkflowUserInputs({ userInputs }));
        }, [dispatch]),

        updateVisualWorkflow: useCallback((visualWorkflowData: Record<string, unknown>) => {
            dispatch(workflowActions.updateActiveWorkflowVisualWorkflow({ visualWorkflowData }));
        }, [dispatch]),

        updateBackendWorkflow: useCallback((backendWorkflowData: Record<string, unknown>) => {
            dispatch(workflowActions.updateActiveWorkflowBackendWorkflow({ backendWorkflowData }));
        }, [dispatch]),
    };

    // Workflow management actions
    const workflowManagementActions = {
        setActiveWorkflow: useCallback((workflowId: string) => {
            dispatch(workflowActions.setActiveWorkflow(workflowId));
        }, [dispatch]),

        updateWorkflowField: useCallback((field: string, value: any, keyOrId?: string) => {
            dispatch(workflowActions.updateWorkflowFieldSmart({ keyOrId, field, value }));
        }, [dispatch]),

        updateWorkflow: useCallback((params: { data: any; matrxRecordId?: string }) => {
            dispatch(workflowActions.updateWorkflow(params));
        }, [dispatch]),

        deleteActiveWorkflow: useCallback(() => {
            dispatch(workflowActions.deleteActiveWorkflow());
        }, [dispatch]),

        fetchAllFunctionStepData: useCallback(() => {
            dispatch(workflowActions.fetchAllFunctionStepData());
        }, [dispatch]),

        getEnrichedStepData: useCallback((stepIndex: number) => {
            dispatch(workflowActions.getEnrichedStepData({ stepIndex }));
        }, [dispatch]),
    };

    // NEW: Enhanced step creation actions
    const stepCreationActions = {
        createStepFromRegisteredFunction: useCallback((functionId: string, stepName?: string) => {
            return dispatch(workflowActions.createStepFromRegisteredFunction({ functionId, stepName }));
        }, [dispatch]),

        addStepFromRegisteredFunction: useCallback((params: {
            functionId: string;
            stepName?: string;
            stepIndex?: number;
        }) => {
            dispatch(workflowActions.addStepFromRegisteredFunction(params));
        }, [dispatch]),

        updateStepArgOverride: useCallback((stepIndex: number, argName: string, override: any) => {
            dispatch(workflowActions.updateStepArgOverride({ stepIndex, argName, override }));
        }, [dispatch]),

        refreshStepWithFunctionData: useCallback((stepIndex: number) => {
            dispatch(workflowActions.refreshStepWithFunctionData({ stepIndex }));
        }, [dispatch]),
    };

    // Enhanced selectors for step creation
    const registeredFunctionOptions = useAppSelector(workflowSelectors.registeredFunctionOptions);
    
    // Helper to get complete step data
    const getCompleteStepData = useCallback((stepIndex: number) => {
        return workflowSelectors.completeStepData(useAppSelector(state => state), stepIndex);
    }, [workflowSelectors]);

    // Helper to get step validation errors
    const getStepValidationErrors = useCallback((stepIndex: number) => {
        return workflowSelectors.stepValidationErrors(useAppSelector(state => state), stepIndex);
    }, [workflowSelectors]);

    // Loading and error states
    const isLoading = workflowEntityState?.fetchState?.isLoading || 
                     registeredFunctionEntityState?.fetchState?.isLoading || 
                     argEntityState?.fetchState?.isLoading;

    const hasError = workflowEntityState?.fetchState?.isError || 
                    registeredFunctionEntityState?.fetchState?.isError || 
                    argEntityState?.fetchState?.isError;

    return {
        // Current workflow data
        activeWorkflow,
        activeWorkflowKey,
        allWorkflows,
        
        // Workflow steps and enriched data
        workflowSteps,
        functionSteps,
        recipeSteps,
        allEnrichedFunctionSteps,
        workflowStepValidation,
        
        // Workflow metadata
        workflowMetadata,
        workflowRelays,
        workflowUserInputs,
        
        // Function and arg data
        allRegisteredFunctionsWithArgs,
        registeredFunctionsArray,
        argsArray,
        
        // NEW: Enhanced step creation data
        registeredFunctionOptions,
        getCompleteStepData,
        getStepValidationErrors,
        
        // Action groups
        stepActions,
        metadataActions,
        workflowManagementActions,
        stepCreationActions,
        
        // State flags
        isLoading,
        hasError,
        
        // Raw selectors and actions for advanced usage
        workflowSelectors,
        workflowActions,
    };
}; 
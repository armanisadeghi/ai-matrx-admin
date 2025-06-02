"use client";

import { useEffect, useMemo, useState, createContext } from "react";
import { useWorkflowWithFetch } from "@/features/workflows/hooks/useWorkflowData";
import { useWorkflowManager } from "@/features/workflows/hooks/useWorkflowManager";
import { WorkflowData, BackendWorkflowData, WorkflowStep } from "@/types/customWorkflowTypes";
import { WorkflowStepsSection } from "./WorkflowStepsSection";
import { UserInputsSection } from "./UserInputsSection";
import { WorkflowRelaysSection } from "./WorkflowRelaysSection";
import { RawDataSection } from "./RawDataSection";
import { BrokerHighlightContext } from "./brokers/BrokerHighlightContext";
import { SocketExecuteButton } from "@/components/socket-io/universal/SocketExecuteButton";
import { 
    Workflow, 
    Play, 
    Pause, 
    Globe, 
    Lock, 
    CheckCircle2, 
    AlertTriangle, 
    Loader2, 
    Save, 
    Zap, 
    Hash, 
    Sparkles,
    Eye,
    AlertCircle
} from "lucide-react";

interface WorkflowDetailContentProps {
    workflowId: string;
}

export function WorkflowDetailContent({ workflowId }: WorkflowDetailContentProps) {
    const [highlightedBroker, setHighlightedBroker] = useState<string | null>(null);
    
    // Legacy hook for backward compatibility
    const { workflowRecords, workflowIsLoading, workflowIsError, fetchWorkflowOneWithFkIfk } = useWorkflowWithFetch();
    
    // NEW: Enhanced workflow manager with custom actions and selectors
    const {
        activeWorkflow: enhancedActiveWorkflow,
        workflowSteps: enhancedWorkflowSteps,
        workflowUserInputs: enhancedUserInputs,
        workflowRelays: enhancedRelays,
        stepActions,
        metadataActions,
        workflowManagementActions,
        allEnrichedFunctionSteps,
        workflowStepValidation,
        isLoading: enhancedIsLoading,
        hasError: enhancedHasError,
    } = useWorkflowManager(workflowId);

    // Convert plain ID to recordId format
    const recordId = `id:${workflowId}`;
    const legacyWorkflow = workflowRecords[recordId] as WorkflowData | undefined;

    // Use enhanced workflow data if available, fallback to legacy
    const workflow = enhancedActiveWorkflow || legacyWorkflow;
    const isLoading = enhancedIsLoading || workflowIsLoading;
    const isError = enhancedHasError || workflowIsError;

    useEffect(() => {
        if (!workflow && !isLoading) {
            fetchWorkflowOneWithFkIfk(recordId);
        }
    }, [recordId, workflow, isLoading, fetchWorkflowOneWithFkIfk]);

    // Parse backend workflow data with proper typing - enhanced version first
    const backendData = useMemo((): BackendWorkflowData | null => {
        // Try to use enhanced data first
        if (enhancedWorkflowSteps && enhancedWorkflowSteps.length > 0) {
            return {
                steps: enhancedWorkflowSteps,
                user_inputs: enhancedUserInputs || [],
                workflow_relays: enhancedRelays,
                workflow_metadata: null,
            } as BackendWorkflowData;
        }
        
        // Fallback to legacy data
        if (!workflow?.backendWorkflow || typeof workflow.backendWorkflow !== "object") {
            return null;
        }
        return workflow.backendWorkflow as BackendWorkflowData;
    }, [workflow?.backendWorkflow, enhancedWorkflowSteps, enhancedUserInputs, enhancedRelays]);

    // Enhanced step update handler using our new actions
    const handleUpdatedSteps = (steps: WorkflowStep[]) => {
        console.log('Updated steps:', steps);
        
        // Use enhanced workflow management if available
        if (enhancedActiveWorkflow && metadataActions.updateBackendWorkflow) {
            const updatedBackendData = {
                ...backendData,
                steps,
            };
            
            // Update local state first
            metadataActions.updateBackendWorkflow(updatedBackendData);
            
            // Then save to backend using the workflow management actions
            if (workflowManagementActions?.updateWorkflowField && workflowId) {
                workflowManagementActions.updateWorkflowField('backendWorkflow', updatedBackendData, workflowId);
                console.log('✅ Auto-saving workflow changes to database...', { workflowId, steps: steps.length });
            }
        }
        
        // Log validation results if available
        if (workflowStepValidation) {
            console.log('Step validation results:', workflowStepValidation);
        }
        
        // Log enriched function steps if available
        if (allEnrichedFunctionSteps) {
            console.log('Enriched function steps:', allEnrichedFunctionSteps);
        }
    };

    // Enhanced user inputs update handler
    const handleUserInputsUpdate = (userInputs: any[]) => {
        console.log('Updated user inputs:', userInputs);
        
        // Use enhanced workflow management if available
        if (enhancedActiveWorkflow && metadataActions.updateBackendWorkflow) {
            const updatedBackendData = {
                ...backendData,
                user_inputs: userInputs,
            };
            
            // Update local state first
            metadataActions.updateBackendWorkflow(updatedBackendData);
            
            // Then save to backend using the workflow management actions
            if (workflowManagementActions?.updateWorkflowField && workflowId) {
                workflowManagementActions.updateWorkflowField('backendWorkflow', updatedBackendData, workflowId);
                console.log('✅ Auto-saving user input changes to database...', { workflowId, userInputs: userInputs.length });
            }
        }
    };

    // Manual save function (backup - auto-save should handle most cases)
    const handleManualSave = () => {
        if (enhancedActiveWorkflow && backendData && workflowId) {
            // Use the workflow management action to save to backend
            if (workflowManagementActions?.updateWorkflowField) {
                workflowManagementActions.updateWorkflowField('backendWorkflow', backendData, workflowId);
                console.log('💾 Manual save triggered', { workflowId });
            } else {
                // Fallback to local state update only
                metadataActions.updateBackendWorkflow(backendData);
                console.log('💾 Manual save triggered (local only)');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto">
                            <Workflow className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl animate-ping opacity-20"></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Loading Workflow</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md">
                            Fetching workflow data and initializing components...
                        </p>
                        <div className="flex items-center justify-center gap-1 text-sm text-slate-500 dark:text-slate-500">
                            <span>ID:</span>
                            <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs font-mono">
                                {workflowId}
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !workflow) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:via-red-950/20 dark:to-orange-950/20 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="relative mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto">
                            <AlertCircle className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workflow Not Found</h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            The requested workflow could not be loaded. It may have been deleted or you might not have permission to access it.
                        </p>
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                                <Hash className="w-4 h-4" />
                                <span>Workflow ID: {workflowId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate validation stats
    const validSteps = workflowStepValidation?.filter(v => v.isValid).length || 0;
    const totalSteps = workflowStepValidation?.length || 0;
    const hasValidationIssues = workflowStepValidation?.some(v => !v.isValid) || false;

    return (
        <BrokerHighlightContext.Provider value={{ highlightedBroker, setHighlightedBroker }}>
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
                {/* Enhanced Header */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm flex-shrink-0">
                    <div className="p-6">
                        {/* Main Header Row */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white rounded-xl flex items-center justify-center shadow-lg">
                                        <Workflow className="w-8 h-8" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                        {workflow.isActive ? (
                                            <Play className="w-2.5 h-2.5 text-white" />
                                        ) : (
                                            <Pause className="w-2.5 h-2.5 text-white" />
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                        {workflow.name || "Untitled Workflow"}
                                    </h1>
                                    {workflow.description && (
                                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                                            {workflow.description}
                                        </p>
                                    )}
                                    
                                    {/* Status Badges */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                            workflow.isActive
                                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"
                                                : "bg-gray-100 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600"
                                        }`}>
                                            {workflow.isActive ? (
                                                <Play className="w-4 h-4" />
                                            ) : (
                                                <Pause className="w-4 h-4" />
                                            )}
                                            {workflow.isActive ? "Active" : "Inactive"}
                                        </div>
                                        
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                            workflow.isPublic
                                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700"
                                        }`}>
                                            {workflow.isPublic ? (
                                                <Globe className="w-4 h-4" />
                                            ) : (
                                                <Lock className="w-4 h-4" />
                                            )}
                                            {workflow.isPublic ? "Public" : "Private"}
                                        </div>

                                        {/* Enhanced step validation indicator */}
                                        {workflowStepValidation && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                                hasValidationIssues
                                                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700"
                                                    : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"
                                            }`}>
                                                {hasValidationIssues ? (
                                                    <AlertTriangle className="w-4 h-4" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                {validSteps}/{totalSteps} valid steps
                                            </div>
                                        )}

                                        {/* Enhanced enriched functions indicator */}
                                        {allEnrichedFunctionSteps && allEnrichedFunctionSteps.length > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
                                                <Sparkles className="w-4 h-4" />
                                                {allEnrichedFunctionSteps.length} enriched functions
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Meta Info & Actions */}
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        <span>v{workflow.version || 1}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Hash className="w-4 h-4" />
                                        <span>{workflow.id}</span>
                                    </div>
                                </div>
                                
                                {/* Save Status & Manual Save Button */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <Zap className="w-3 h-3" />
                                        Auto-Save Active
                                    </div>
                                    
                                    {/* Execute Entire Workflow Button */}
                                    {backendData && backendData.steps && backendData.steps.length > 0 && (
                                        <SocketExecuteButton
                                            presetName="workflow_backend_data_to_start_workflow"
                                            sourceData={backendData}
                                            buttonText="🚀 Execute Workflow"
                                            overlayTitle="Execute Entire Workflow"
                                            overlayDescription="This will execute all steps in the workflow sequentially"
                                            variant="default"
                                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                                            onExecuteStart={(data) => {
                                                console.log('🚀 Starting workflow execution with data:', data);
                                            }}
                                            onExecuteComplete={(taskId) => {
                                                console.log('✅ Workflow execution started:', taskId);
                                            }}
                                            onExecuteError={(error) => {
                                                console.error('❌ Workflow execution failed:', error);
                                            }}
                                        />
                                    )}
                                    
                                    <button
                                        onClick={handleManualSave}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                        title="Force save workflow"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Main Content - Clean 60/40 split */}
                <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-0 min-h-0">
                    {/* Left Column - Steps (60% of space) */}
                    <div className="xl:col-span-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col min-h-0">
                        <WorkflowStepsSection 
                            steps={backendData?.steps || []} 
                            onUpdate={handleUpdatedSteps}
                        />
                    </div>

                    {/* Right Column - Sidebar (40% of space) */}
                    <div className="xl:col-span-2 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col min-h-0">
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            <UserInputsSection 
                                userInputs={backendData?.user_inputs || []}
                                onUpdate={handleUserInputsUpdate}
                            />
                            <WorkflowRelaysSection 
                                workflowRelays={backendData?.workflow_relays}
                            />
                            {workflow && workflow.id && (
                                <RawDataSection 
                                    workflow={workflow as WorkflowData}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BrokerHighlightContext.Provider>
    );
}

"use client";

import { WorkflowStep } from "@/types/customWorkflowTypes";

interface CreatedStepDisplayProps {
    createdStep: WorkflowStep;
}

export default function CreatedStepDisplay({ createdStep }: CreatedStepDisplayProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">✅ Step Created Successfully!</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {createdStep.override_data?.arg_overrides?.length || 0} arg overrides •
                    {Object.keys(createdStep.override_data?.arg_mapping || {}).length} mappings
                </div>
            </div>

            {/* Step Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 text-sm mb-1">Basic Info</h3>
                    <div className="text-xs space-y-1">
                        <div>
                            <strong>Name:</strong> {createdStep.step_name || "Unnamed"}
                        </div>
                        <div>
                            <strong>Required:</strong> {createdStep.execution_required ? "Yes" : "No"}
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Function</h3>
                    <div className="text-xs space-y-1">
                        <div>
                            <strong>Type:</strong> {createdStep.function_type}
                        </div>
                        <div>
                            <strong>ID:</strong> {createdStep.function_id.slice(0, 8)}...
                        </div>
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200 text-sm mb-1">Overrides</h3>
                    <div className="text-xs space-y-1">
                        <div>
                            <strong>Args:</strong> {createdStep.override_data?.arg_overrides?.length || 0}
                        </div>
                        <div>
                            <strong>Mappings:</strong> {Object.keys(createdStep.override_data?.arg_mapping || {}).length}
                        </div>
                    </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200 text-sm mb-1">Structure</h3>
                    <div className="text-xs space-y-1">
                        <div>
                            <strong>Broker:</strong> {createdStep.override_data?.return_broker_override ? "Set" : "None"}
                        </div>
                        <div>
                            <strong>Status:</strong> {createdStep.status}
                        </div>
                    </div>
                </div>
            </div>

            {/* Full JSON Display */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Complete Step JSON</h3>
                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-xs">{JSON.stringify(createdStep, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
} 
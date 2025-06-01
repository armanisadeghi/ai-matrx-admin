"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";

interface FunctionSelectorProps {
    selectedFunctionId: string;
    onFunctionChange: (functionId: string) => void;
    onReset: () => void;
}

export default function FunctionSelector({ selectedFunctionId, onFunctionChange, onReset }: FunctionSelectorProps) {
    const workflowSelectors = createWorkflowSelectors();
    const registeredFunctionOptions = useAppSelector(workflowSelectors.registeredFunctionOptions);

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Registered Function
            </label>
            <div className="flex gap-4">
                <select
                    value={selectedFunctionId}
                    onChange={(e) => onFunctionChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                    <option value="">-- Select Function --</option>
                    {registeredFunctionOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.name}
                        </option>
                    ))}
                </select>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                    Reset
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {registeredFunctionOptions.length} functions available
            </p>
        </div>
    );
} 
"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";

interface FunctionSelectorOverlayProps {
    selectedFunctionId: string;
    onFunctionChange: (functionId: string) => void;
    onReset: () => void;
}

export default function FunctionSelectorOverlay({ selectedFunctionId, onFunctionChange, onReset }: FunctionSelectorOverlayProps) {
    const workflowSelectors = createWorkflowSelectors();
    const registeredFunctionOptions = useAppSelector(workflowSelectors.registeredFunctionOptions);

    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Select Function
            </h3>
            <div className="flex gap-4">
                <div className="flex-1">
                    <select
                        value={selectedFunctionId}
                        onChange={(e) => onFunctionChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">-- Choose a registered function --</option>
                        {registeredFunctionOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={onReset}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                    Clear
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {registeredFunctionOptions.length} registered functions available
            </p>
        </div>
    );
} 
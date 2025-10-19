"use client";

interface BasicStepConfigurationProps {
    stepName: string;
    onStepNameChange: (name: string) => void;
    executionRequired: boolean;
    onExecutionRequiredChange: (required: boolean) => void;
    returnBroker: string;
    onReturnBrokerChange: (broker: string) => void;
}

export default function BasicStepConfiguration({
    stepName,
    onStepNameChange,
    executionRequired,
    onExecutionRequiredChange,
    returnBroker,
    onReturnBrokerChange,
}: BasicStepConfigurationProps) {
    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Step Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Step Name</label>
                    <input
                        type="text"
                        value={stepName}
                        onChange={(e) => onStepNameChange(e.target.value)}
                        placeholder="Enter step name..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-textured text-gray-900 dark:text-gray-100"
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
                            onChange={(e) => onExecutionRequiredChange(e.target.checked)}
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
                        onChange={(e) => onReturnBrokerChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-textured text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>
        </div>
    );
} 
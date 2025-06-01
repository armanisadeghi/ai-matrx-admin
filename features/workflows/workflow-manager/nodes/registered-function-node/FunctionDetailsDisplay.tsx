"use client";

interface FunctionDetailsDisplayProps {
    selectedFunction: any;
}

export default function FunctionDetailsDisplay({ selectedFunction }: FunctionDetailsDisplayProps) {
    if (!selectedFunction) return null;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {selectedFunction.name}
                </h3>
                <div className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    <div className="whitespace-pre-wrap">
                        {selectedFunction.description || "No description available"}
                    </div>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Return Broker:</strong> {selectedFunction.returnBroker}
                </div>
            </div>

            {/* Inputs Table */}
            {selectedFunction.args && selectedFunction.args.length > 0 && (
                <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                        Function Inputs ({selectedFunction.args.length})
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-blue-200 dark:border-blue-700">
                                    <th className="text-left py-2 px-3 font-medium text-blue-800 dark:text-blue-200">
                                        Input Name
                                    </th>
                                    <th className="text-left py-2 px-3 font-medium text-blue-800 dark:text-blue-200">
                                        Data Type
                                    </th>
                                    <th className="text-left py-2 px-3 font-medium text-blue-800 dark:text-blue-200">
                                        Required
                                    </th>
                                    <th className="text-left py-2 px-3 font-medium text-blue-800 dark:text-blue-200">
                                        Default Ready
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedFunction.args.map((arg: any, idx: number) => (
                                    <tr key={idx} className="border-b border-blue-100 dark:border-blue-800">
                                        <td className="py-2 px-3 font-medium text-blue-900 dark:text-blue-100">
                                            {arg.name}
                                        </td>
                                        <td className="py-2 px-3 text-blue-700 dark:text-blue-300">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                                {arg.dataType}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-blue-700 dark:text-blue-300">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                arg.required 
                                                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                            }`}>
                                                {arg.required ? "Required" : "Optional"}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-blue-700 dark:text-blue-300">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                arg.ready 
                                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                            }`}>
                                                {arg.ready ? "Ready" : "Not Ready"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
} 
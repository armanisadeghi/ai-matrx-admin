"use client";

interface FunctionPreviewProps {
    selectedFunction: any;
}

export default function FunctionPreview({ selectedFunction }: FunctionPreviewProps) {
    if (!selectedFunction) return null;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Selected Function: {selectedFunction.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Function Details</h4>
                    <div className="space-y-1 text-sm">
                        <div>
                            <strong>Description:</strong> {selectedFunction.description || "No description"}
                        </div>
                        <div>
                            <strong>Return Broker:</strong> {selectedFunction.returnBroker}
                        </div>
                        <div>
                            <strong>Tags:</strong>{" "}
                            {Array.isArray(selectedFunction.tags) ? selectedFunction.tags.join(", ") : "None"}
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Arguments ({selectedFunction.args?.length || 0})
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedFunction.args?.map((arg: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border">
                                <div className="font-medium">
                                    {arg.name} ({arg.dataType})
                                </div>
                                <div className="text-gray-600 dark:text-gray-400">
                                    {arg.required ? "Required" : "Optional"} •{arg.ready ? " Ready" : " Not Ready"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 
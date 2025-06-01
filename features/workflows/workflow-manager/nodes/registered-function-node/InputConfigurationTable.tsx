"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";

interface InputConfigurationTableProps {
    selectedFunction: any;
    argOverrides: Record<string, { value: any; ready: boolean }>;
    argMappings: Record<string, string>;
    onUpdateArgOverride: (argName: string, field: "value" | "ready", newValue: any) => void;
    onRemoveArgMapping: (argName: string) => void;
}

export default function InputConfigurationTable({
    selectedFunction,
    argOverrides,
    argMappings,
    onUpdateArgOverride,
    onRemoveArgMapping,
}: InputConfigurationTableProps) {
    const workflowSelectors = createWorkflowSelectors();
    
    // Helper to get enriched broker display
    const getEnrichedBroker = (brokerId: string) => {
        return useAppSelector((state) => workflowSelectors.enrichBrokerReference(state, brokerId));
    };

    const getTypeInput = (argName: string, dataType: string, value: any) => {
        const baseClasses = "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
        
        switch (dataType) {
            case "bool":
                return (
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onUpdateArgOverride(argName, "value", e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                    />
                );
            case "int":
                return (
                    <input
                        type="number"
                        step="1"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", parseInt(e.target.value) || null)}
                        className={baseClasses}
                    />
                );
            case "float":
                return (
                    <input
                        type="number"
                        step="any"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", parseFloat(e.target.value) || null)}
                        className={baseClasses}
                    />
                );
            case "list":
            case "dict":
                return (
                    <textarea
                        value={value ? JSON.stringify(value, null, 2) : ""}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                onUpdateArgOverride(argName, "value", parsed);
                            } catch {
                                // Invalid JSON, don't update
                            }
                        }}
                        className={`${baseClasses} font-mono resize-none`}
                        rows={3}
                        placeholder={dataType === "list" ? "[]" : "{}"}
                    />
                );
            default: // str, url, etc.
                return (
                    <input
                        type="text"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", e.target.value || null)}
                        className={baseClasses}
                        placeholder={`Enter ${dataType} value...`}
                    />
                );
        }
    };

    // Component to render enriched broker display
    const BrokerDisplay = ({ brokerId, argName }: { brokerId: string; argName: string }) => {
        const enrichedBroker = getEnrichedBroker(brokerId);
        
        if (!enrichedBroker || !brokerId) {
            return <span className="text-xs text-gray-400 dark:text-gray-500">No mapping</span>;
        }

        if (enrichedBroker.isRealBroker) {
            return (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div 
                            className={`w-3 h-3 rounded-full bg-${enrichedBroker.color}-500`}
                            title={`${enrichedBroker.color} broker`}
                        />
                        <span className="text-xs font-medium text-purple-800 dark:text-purple-200">
                            {enrichedBroker.displayName}
                        </span>
                    </div>
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                        ({enrichedBroker.dataType})
                    </span>
                    <button
                        onClick={() => onRemoveArgMapping(argName)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        title="Remove mapping"
                    >
                        ✕
                    </button>
                </div>
            );
        } else {
            // Consumable broker (string-only)
            return (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded border-dashed border border-gray-300 dark:border-gray-600">
                        {enrichedBroker.displayName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        (consumable)
                    </span>
                    <button
                        onClick={() => onRemoveArgMapping(argName)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        title="Remove mapping"
                    >
                        ✕
                    </button>
                </div>
            );
        }
    };

    if (!selectedFunction?.args || selectedFunction.args.length === 0) {
        return (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Input Configuration
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                    This function has no configurable inputs.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
                Input Configuration ({selectedFunction.args.length} inputs)
            </h3>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-purple-200 dark:border-purple-700">
                            <th className="text-left py-3 px-3 font-medium text-purple-800 dark:text-purple-200 min-w-[120px]">
                                Input Name
                            </th>
                            <th className="text-left py-3 px-3 font-medium text-purple-800 dark:text-purple-200 min-w-[100px]">
                                Data Type
                            </th>
                            <th className="text-left py-3 px-3 font-medium text-purple-800 dark:text-purple-200 min-w-[80px]">
                                Required
                            </th>
                            <th className="text-left py-3 px-3 font-medium text-purple-800 dark:text-purple-200 min-w-[200px]">
                                Value
                            </th>
                            <th className="text-left py-3 px-3 font-medium text-purple-800 dark:text-purple-200 min-w-[100px]">
                                Ready State
                            </th>
                            <th className="text-left py-3 px-3 font-medium text-purple-800 dark:text-purple-200 min-w-[180px]">
                                Broker Map
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedFunction.args.map((arg: any, idx: number) => (
                            <tr key={arg.name} className="border-b border-purple-100 dark:border-purple-800 hover:bg-purple-25 dark:hover:bg-purple-900/10">
                                {/* Input Name */}
                                <td className="py-3 px-3">
                                    <div className="font-medium text-purple-900 dark:text-purple-100">
                                        {arg.name}
                                    </div>
                                </td>
                                
                                {/* Data Type */}
                                <td className="py-3 px-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                                        {arg.dataType}
                                    </span>
                                </td>
                                
                                {/* Required */}
                                <td className="py-3 px-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        arg.required 
                                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                    }`}>
                                        {arg.required ? "Yes" : "No"}
                                    </span>
                                </td>
                                
                                {/* Value */}
                                <td className="py-3 px-3">
                                    {getTypeInput(arg.name, arg.dataType, argOverrides[arg.name]?.value)}
                                </td>
                                
                                {/* Ready State */}
                                <td className="py-3 px-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={argOverrides[arg.name]?.ready ?? false}
                                            onChange={(e) => onUpdateArgOverride(arg.name, "ready", e.target.checked)}
                                            className="rounded border-gray-300 dark:border-gray-600"
                                        />
                                        <span className={`text-xs font-medium ${
                                            argOverrides[arg.name]?.ready ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
                                        }`}>
                                            {argOverrides[arg.name]?.ready ? "Ready" : "Not Ready"}
                                        </span>
                                    </div>
                                </td>
                                
                                {/* Broker Map - Enhanced Display */}
                                <td className="py-3 px-3">
                                    <BrokerDisplay brokerId={argMappings[arg.name]} argName={arg.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
} 
"use client";

import { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";

interface InputMappingControlsProps {
    selectedFunction: any;
    argMappings: Record<string, string>;
    onAddMapping: (argName: string, brokerId: string) => void;
}

export default function InputMappingControls({
    selectedFunction,
    argMappings,
    onAddMapping,
}: InputMappingControlsProps) {
    const [newMappingArg, setNewMappingArg] = useState<string>("");
    const [newMappingBroker, setNewMappingBroker] = useState<string>("");
    const [useExistingBroker, setUseExistingBroker] = useState<boolean>(true);

    const workflowSelectors = createWorkflowSelectors();
    const availableDataBrokers = useAppSelector(workflowSelectors.availableDataBrokers);

    const handleAddMapping = () => {
        if (newMappingArg && newMappingBroker) {
            onAddMapping(newMappingArg, newMappingBroker);
            setNewMappingArg("");
            setNewMappingBroker("");
        }
    };

    // Get unmapped arguments
    const unmappedArgs = selectedFunction.args?.filter((arg: any) => !argMappings[arg.name]) || [];

    // Get suggested brokers for the selected argument type
    const selectedArg = selectedFunction.args?.find((arg: any) => arg.name === newMappingArg);
    const suggestedBrokers = selectedArg 
        ? availableDataBrokers.filter((broker) => broker.dataType === selectedArg.dataType)
        : availableDataBrokers;

    if (unmappedArgs.length === 0) {
        return (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Input Mapping
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                    All inputs have been mapped to brokers.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4">
                Add Input Mapping
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                Map inputs to broker IDs to connect workflow data flows. You can select from existing data brokers or create consumable broker IDs.
            </p>
            
            <div className="space-y-4">
                {/* Argument Selection */}
                <div>
                    <label className="block text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                        Select Input
                    </label>
                    <select
                        value={newMappingArg}
                        onChange={(e) => setNewMappingArg(e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="">-- Choose input to map --</option>
                        {unmappedArgs.map((arg: any) => (
                            <option key={arg.name} value={arg.name}>
                                {arg.name} ({arg.dataType})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Broker Selection Mode */}
                <div>
                    <label className="block text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                        Broker Source
                    </label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setUseExistingBroker(true)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                useExistingBroker
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-700'
                            }`}
                        >
                            Existing Broker
                        </button>
                        <button
                            onClick={() => setUseExistingBroker(false)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                !useExistingBroker
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-700'
                            }`}
                        >
                            Consumable ID
                        </button>
                    </div>
                </div>

                {/* Broker Input */}
                <div>
                    <label className="block text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                        {useExistingBroker ? 'Data Broker' : 'Consumable Broker ID'}
                    </label>
                    {useExistingBroker ? (
                        <select
                            value={newMappingBroker}
                            onChange={(e) => setNewMappingBroker(e.target.value)}
                            className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="">-- Choose data broker --</option>
                            {suggestedBrokers.length > 0 && (
                                <optgroup label={`Recommended (${selectedArg?.dataType || 'any'} type)`}>
                                    {suggestedBrokers.map((broker) => (
                                        <option key={broker.id} value={broker.id}>
                                            {broker.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {availableDataBrokers.length > suggestedBrokers.length && (
                                <optgroup label="All Brokers">
                                    {availableDataBrokers.map((broker) => (
                                        <option key={broker.id} value={broker.id}>
                                            {broker.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={newMappingBroker}
                            onChange={(e) => setNewMappingBroker(e.target.value)}
                            placeholder="Enter consumable broker ID (e.g., 'user_input_result', 'processed_data')..."
                            className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                    )}
                </div>

                {/* Type Compatibility Warning */}
                {newMappingArg && newMappingBroker && useExistingBroker && selectedArg && (
                    <div className="text-xs">
                        {(() => {
                            const selectedBroker = availableDataBrokers.find(b => b.id === newMappingBroker);
                            if (!selectedBroker) return null;
                            
                            if (selectedBroker.dataType === selectedArg.dataType) {
                                return (
                                    <div className="text-green-700 dark:text-green-300 flex items-center gap-1">
                                        <span>✓</span>
                                        <span>Perfect type match: {selectedBroker.dataType}</span>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                                        <span>⚠</span>
                                        <span>Type mismatch: broker is {selectedBroker.dataType}, argument expects {selectedArg.dataType}</span>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )}

                {/* Add Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleAddMapping}
                        disabled={!newMappingArg || !newMappingBroker}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        Add Mapping
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-700">
                <div className="flex items-center justify-between text-xs text-orange-600 dark:text-orange-400">
                    <span>{unmappedArgs.length} input{unmappedArgs.length !== 1 ? 's' : ''} available for mapping</span>
                    <span>{availableDataBrokers.length} data broker{availableDataBrokers.length !== 1 ? 's' : ''} available</span>
                </div>
            </div>
        </div>
    );
} 
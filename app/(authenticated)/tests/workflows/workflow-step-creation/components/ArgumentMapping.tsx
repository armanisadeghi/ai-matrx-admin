"use client";

interface ArgumentMappingProps {
    selectedFunction: any;
    argMappings: Record<string, string>;
    newMappingArg: string;
    newMappingBroker: string;
    onNewMappingArgChange: (arg: string) => void;
    onNewMappingBrokerChange: (broker: string) => void;
    onAddMapping: () => void;
    onRemoveMapping: (argName: string) => void;
}

export default function ArgumentMapping({
    selectedFunction,
    argMappings,
    newMappingArg,
    newMappingBroker,
    onNewMappingArgChange,
    onNewMappingBrokerChange,
    onAddMapping,
    onRemoveMapping,
}: ArgumentMappingProps) {
    return (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4">Add Argument Mapping</h3>
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Argument Name
                    </label>
                    <select
                        value={newMappingArg}
                        onChange={(e) => onNewMappingArgChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">Select argument...</option>
                        {selectedFunction.args
                            ?.filter((arg: any) => !argMappings[arg.name])
                            .map((arg: any) => (
                                <option key={arg.name} value={arg.name}>
                                    {arg.name}
                                </option>
                            ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Broker ID</label>
                    <input
                        type="text"
                        value={newMappingBroker}
                        onChange={(e) => onNewMappingBrokerChange(e.target.value)}
                        placeholder="Enter broker ID..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>
                <button
                    onClick={onAddMapping}
                    disabled={!newMappingArg || !newMappingBroker}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Add Mapping
                </button>
            </div>

            {/* Current Mappings */}
            {Object.keys(argMappings).length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Mappings ({Object.keys(argMappings).length})
                    </h4>
                    <div className="space-y-2">
                        {Object.entries(argMappings).map(([argName, brokerId]) => (
                            <div
                                key={argName}
                                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 border"
                            >
                                <span className="text-sm">
                                    <span className="font-medium">{argName}</span> →
                                    <span className="font-mono ml-1">{brokerId}</span>
                                </span>
                                <button
                                    onClick={() => onRemoveMapping(argName)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 
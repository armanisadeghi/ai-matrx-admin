"use client";

interface ArgumentOverridesProps {
    selectedFunction: any;
    argOverrides: Record<string, { value: any; ready: boolean }>;
    argMappings: Record<string, string>;
    onUpdateArgOverride: (argName: string, field: "value" | "ready", newValue: any) => void;
    onRemoveArgMapping: (argName: string) => void;
}

export default function ArgumentOverrides({
    selectedFunction,
    argOverrides,
    argMappings,
    onUpdateArgOverride,
    onRemoveArgMapping,
}: ArgumentOverridesProps) {
    const getTypeInput = (argName: string, dataType: string, value: any) => {
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
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                );
            case "float":
                return (
                    <input
                        type="number"
                        step="any"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", parseFloat(e.target.value) || null)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                        rows={8}
                    />
                );
            default: // str, url, etc.
                return (
                    <input
                        type="text"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", e.target.value || null)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                );
        }
    };

    if (!selectedFunction?.args || selectedFunction.args.length === 0) {
        return null;
    }

    return (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
                Argument Overrides ({selectedFunction.args.length})
            </h3>
            <div className="space-y-4">
                {selectedFunction.args.map((arg: any) => (
                    <div key={arg.name} className="bg-textured rounded-lg p-4 border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{arg.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {arg.dataType} • {arg.required ? "Required" : "Optional"}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Value
                                </label>
                                {getTypeInput(arg.name, arg.dataType, argOverrides[arg.name]?.value)}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ready State
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={argOverrides[arg.name]?.ready ?? false}
                                        onChange={(e) => onUpdateArgOverride(arg.name, "ready", e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-600"
                                    />
                                    <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                        {argOverrides[arg.name]?.ready ? "Ready" : "Not Ready"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Broker Mapping
                                </label>
                                {argMappings[arg.name] ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            {argMappings[arg.name]}
                                        </span>
                                        <button
                                            onClick={() => onRemoveArgMapping(arg.name)}
                                            className="text-xs text-red-600 hover:text-red-800"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400">No mapping</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 